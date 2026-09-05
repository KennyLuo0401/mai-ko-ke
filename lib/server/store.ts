/**
 * Room operations and transitions / 房間操作與狀態轉換
 *
 * All game logic lives here and runs identically on either backend. Every
 * mutation is: load the room, change it in memory, commit with a
 * compare-and-swap on `version`; a lost race reloads and reapplies. That is
 * what guarantees reveal happens exactly once and that two simultaneous final
 * answers cannot both trigger consensus drafting.
 *
 * Authorization is enforced here on every operation, never by the caller and
 * never left to the database alone.
 * 每個操作都在此授權；轉換以 version CAS 提交。
 */

import type {
  ConsensusDecision,
  GameState,
  HostAction,
  Language,
  ProcessingStatus,
  PseudonymousAnswer,
  PublicPlayer,
  ResponsePayload,
  RevealedAnswer,
  Role,
  RoomView,
} from "@/lib/contracts";
import {
  CARD_COUNT,
  CONSENSUS_DECISIONS,
  LANGUAGES,
  MAX_PLAYERS,
  MIN_PLAYERS,
} from "@/lib/contracts";
import { getAnalysisAdapter, selectedAdapterName, withRetry } from "@/lib/ai";
import { SchemaError } from "@/lib/ai/schemas";
import {
  acceptsNewPlayers,
  autoTransitionOnComplete,
  hostTransition,
  isConsensusPhase,
  isRevealed,
  revealTransition,
  stageForState,
} from "@/lib/game/machine";
import {
  assignCards,
  canonicalJson,
  canPublish,
  computeMap,
  findCard,
  generateRoomCode,
  limitStatements,
  pseudonymFor,
} from "@/lib/game/rules";
import {
  getBackend,
  selectedBackendName,
  type RoomRecord,
  type StoredPlayer,
} from "@/lib/server/backend";
import { ApiFault } from "@/lib/server/fault";

export { selectedBackendName };

/* -------------------------------------------------------------------------- */
/* Compare-and-swap plumbing                                                  */
/* -------------------------------------------------------------------------- */

const MAX_COMMIT_ATTEMPTS = 6;

function touch(room: RoomRecord): void {
  room.version += 1;
}

/**
 * Move to `next`, restarting the shared countdown whenever the new phase is one
 * that waits on players. Stamped on the server so every client shows the same
 * clock regardless of when it rendered.
 */
function enterState(room: RoomRecord, next: GameState): void {
  room.state = next;
  if (stageForState(next)) room.phaseStartedAt = Date.now();
  touch(room);
}

/**
 * Apply a synchronous change and commit it. `apply` must not perform slow work:
 * analysis and consensus drafting happen between mutations, not inside one.
 */
async function mutate<T>(roomId: string, apply: (room: RoomRecord) => T): Promise<T> {
  const backend = await getBackend();
  for (let attempt = 0; attempt < MAX_COMMIT_ATTEMPTS; attempt++) {
    const room = await backend.loadById(roomId);
    if (!room) throw new ApiFault("room_not_found", "Room not found");

    const expected = room.version;
    const snapshot = structuredClone(room);
    const result = apply(room);

    // Nothing changed (an idempotent repeat): no write needed.
    if (room.version === expected) return result;
    if (await backend.save(room, expected, snapshot)) return result;
  }
  throw new ApiFault("service_unavailable", "The room is busy right now. Try again.");
}

async function load(roomId: string): Promise<RoomRecord> {
  const room = await (await getBackend()).loadById(roomId);
  if (!room) throw new ApiFault("room_not_found", "Room not found");
  return room;
}

/* -------------------------------------------------------------------------- */
/* Record helpers                                                             */
/* -------------------------------------------------------------------------- */

function roleOf(room: RoomRecord, userId: string): Role | null {
  if (room.hostUserId === userId) return "host";
  return room.players.some((p) => p.userId === userId) ? "player" : null;
}

function requireRole(room: RoomRecord, userId: string): Role {
  const role = roleOf(room, userId);
  // A URL alone grants nothing: non-members cannot learn the room exists.
  if (!role) throw new ApiFault("room_not_found", "Room not found");
  return role;
}

function requireHost(room: RoomRecord, userId: string): void {
  if (requireRole(room, userId) !== "host") {
    throw new ApiFault("forbidden", "Only the host may perform this action");
  }
}

function playerOf(room: RoomRecord, userId: string): StoredPlayer {
  const player = room.players.find((p) => p.userId === userId);
  if (!player) throw new ApiFault("forbidden", "You are not a player in this room");
  return player;
}

/** Players who must finish each stage: the frozen roster, or everyone active. */
function requiredIds(room: RoomRecord): string[] {
  const frozen = room.players.filter((p) => p.required).map((p) => p.playerId);
  if (frozen.length > 0) return frozen;
  return room.players.filter((p) => p.active).map((p) => p.playerId);
}

function hasFinishedStage(room: RoomRecord, playerId: string): boolean {
  const stage = stageForState(room.state);
  if (!stage) return false;
  return Boolean(room.responses[playerId]?.[stage]);
}

function completionCount(room: RoomRecord): { done: number; required: number } {
  const required = requiredIds(room);
  return {
    done: required.filter((id) => hasFinishedStage(room, id)).length,
    required: required.length,
  };
}

function allStageAnswersIn(room: RoomRecord): boolean {
  const stage = stageForState(room.state);
  if (!stage) return false;
  const required = requiredIds(room);
  if (required.length === 0) return false;
  return required.every((id) => Boolean(room.responses[id]?.[stage]));
}

function cardIdFor(room: RoomRecord, playerId: string): string | undefined {
  return room.players.find((p) => p.playerId === playerId)?.cardId;
}

function pseudonymousAnswers(room: RoomRecord): PseudonymousAnswer[] {
  const pkg = room.gamePackage;
  return requiredIds(room).map((playerId, index) => {
    const responses = room.responses[playerId] ?? {};
    const card = pkg ? findCard(pkg, cardIdFor(room, playerId)) : undefined;
    return {
      pseudonym: pseudonymFor(index),
      initialChoice: responses.initial?.initialChoice,
      cardPerspective: card?.perspective,
      reactionChoice: responses.card?.reactionChoice,
      reasonIds: responses.card?.reasonIds,
      changeChoice: responses.final?.changeChoice,
      finalChoice: responses.final?.finalChoice,
      comment: responses.final?.comment,
    };
  });
}

/** Auto transitions that completion unlocks. Returns true if anything moved. */
function applyAutoTransitions(room: RoomRecord): boolean {
  if (!allStageAnswersIn(room)) return false;

  const next = autoTransitionOnComplete(room.state);
  if (!next) return false;

  enterState(room, next);

  // READY_TO_REVEAL immediately becomes REVEALED, exactly once.
  const revealed = revealTransition(room.state);
  if (revealed) enterState(room, revealed);
  return true;
}

/* -------------------------------------------------------------------------- */
/* Slow work: analysis and consensus drafting                                 */
/* -------------------------------------------------------------------------- */

function setProcessing(room: RoomRecord, processing: ProcessingStatus | undefined): void {
  room.processing = processing;
  touch(room);
}

async function runAnalysis(roomId: string): Promise<void> {
  const material = await mutate(roomId, (room) => {
    if (!room.material) throw new ApiFault("phase_conflict", "No material submitted");
    setProcessing(room, { kind: "analysis", status: "pending" });
    return room.material;
  });

  try {
    const pkg = await withRetry(() =>
      getAnalysisAdapter().analyzeMaterial({
        sourceText: material.sourceText,
        hostQuestion: material.hostQuestion,
        cardCount: CARD_COUNT,
        languages: [...LANGUAGES],
      }),
    );
    await mutate(roomId, (room) => {
      room.gamePackage = pkg;
      room.state = "BRIEFING_READY";
      setProcessing(room, undefined);
    });
  } catch (err) {
    const code = err instanceof SchemaError ? "ai_invalid_output" : "analysis_failed";
    await mutate(roomId, (room) => {
      setProcessing(room, { kind: "analysis", status: "failed", code });
    });
    throw new ApiFault(code, "Analysis failed. The host can retry.");
  }
}

async function runConsensusDraft(roomId: string): Promise<void> {
  const input = await mutate(roomId, (room) => {
    if (!room.material || !room.gamePackage) {
      throw new ApiFault("phase_conflict", "Room is not ready");
    }
    setProcessing(room, { kind: "consensus", status: "pending" });
    return {
      sourceText: room.material.sourceText,
      hostQuestion: room.material.hostQuestion,
      claims: room.gamePackage.claims,
      answers: pseudonymousAnswers(room),
      languages: [...LANGUAGES],
    };
  });

  try {
    const result = await withRetry(() => getAnalysisAdapter().draftConsensus(input));
    await mutate(roomId, (room) => {
      // Another writer may have drafted already; do not overwrite.
      if (room.consensusStatements?.length) return;
      // Enforced here, not just asked for in the prompt: the number of
      // statements is the number of questions every player has to answer.
      room.consensusStatements = limitStatements(result.statements);
      room.state = "CONSENSUS_REVIEW";
      setProcessing(room, undefined);
    });
  } catch (err) {
    const code = err instanceof SchemaError ? "ai_invalid_output" : "consensus_failed";
    // Answers are preserved; the host retries from FINAL_VOTE.
    await mutate(roomId, (room) => {
      setProcessing(room, { kind: "consensus", status: "failed", code });
    });
    throw new ApiFault(code, "Consensus drafting failed. The host can retry.");
  }
}

/* -------------------------------------------------------------------------- */
/* Public operations                                                          */
/* -------------------------------------------------------------------------- */

export async function createRoom(
  hostUserId: string,
  language: Language,
): Promise<{ roomId: string; roomCode: string }> {
  const backend = await getBackend();

  for (let attempt = 0; attempt < 50; attempt++) {
    const room: RoomRecord = {
      id: crypto.randomUUID(),
      code: generateRoomCode(),
      hostUserId,
      language,
      state: "LOBBY",
      version: 1,
      createdAt: Date.now(),
      players: [],
      responses: {},
      consensusVotes: {},
    };
    try {
      await backend.create(room);
      return { roomId: room.id, roomCode: room.code };
    } catch (err) {
      // A code collision regenerates rather than matching fuzzily (§8).
      if (err instanceof ApiFault && err.message.includes("collision")) continue;
      throw err;
    }
  }
  throw new ApiFault("internal_error", "Could not allocate a room code");
}

export async function joinRoom(
  userId: string,
  roomCode: string,
  nickname: string,
  language: Language,
): Promise<{ roomId: string; playerId: string }> {
  const backend = await getBackend();
  const existing = await backend.loadByCode(roomCode);
  if (!existing) throw new ApiFault("room_code_not_found", "No room with that code");

  // Generated once so a retried commit reuses the same seat.
  const newPlayerId = crypto.randomUUID();

  return mutate(existing.id, (room) => {
    const seat = room.players.find((p) => p.userId === userId);
    if (seat) {
      // Idempotent rejoin: reconnecting is not a new seat.
      if (seat.nickname !== nickname || seat.language !== language || !seat.active) {
        seat.nickname = nickname;
        seat.language = language;
        seat.active = true;
        touch(room);
      }
      return { roomId: room.id, playerId: seat.playerId };
    }

    if (room.hostUserId === userId) {
      throw new ApiFault("forbidden", "The host is a separate role and does not vote");
    }
    if (!acceptsNewPlayers(room.state)) {
      throw new ApiFault("late_join_rejected", "This room has already started");
    }
    if (room.players.length >= MAX_PLAYERS) {
      throw new ApiFault("roster_full", `A room holds at most ${MAX_PLAYERS} players`);
    }

    room.players.push({
      playerId: newPlayerId,
      userId,
      nickname,
      language,
      active: true,
      required: false,
      joinedAt: Date.now(),
    });
    touch(room);
    return { roomId: room.id, playerId: newPlayerId };
  });
}

export async function submitMaterial(
  roomId: string,
  userId: string,
  sourceText: string,
  hostQuestion: string,
): Promise<void> {
  await mutate(roomId, (room) => {
    requireHost(room, userId);
    if (room.state !== "LOBBY" && room.state !== "MATERIAL_SUBMITTED") {
      throw new ApiFault(
        "phase_conflict",
        "Material can only be submitted before the vote starts",
      );
    }
    room.material = { sourceText, hostQuestion };
    room.state = "MATERIAL_SUBMITTED";
    touch(room);
  });

  await runAnalysis(roomId);
}

export async function advance(
  roomId: string,
  userId: string,
  expectedState: GameState,
  action: HostAction,
): Promise<void> {
  await mutate(roomId, (room) => {
    requireHost(room, userId);

    const transition = hostTransition(action);
    if (!transition) throw new ApiFault("invalid_input", "Unknown action");

    // Idempotent: a duplicate request that already landed is not an error.
    if (room.state === transition.to) return;

    if (room.state !== expectedState || room.state !== transition.from) {
      throw new ApiFault("phase_conflict", `Cannot ${action} from ${room.state}`);
    }

    if (action === "start_initial_vote") {
      const active = room.players.filter((p) => p.active);
      if (active.length < MIN_PLAYERS) {
        throw new ApiFault(
          "phase_conflict",
          `At least ${MIN_PLAYERS} players must join before starting`,
        );
      }
      if (!room.gamePackage) {
        throw new ApiFault("phase_conflict", "The briefing is not ready");
      }
      // Freeze the roster and deal one card per player, in join order.
      const ordered = [...active].sort((a, b) => a.joinedAt - b.joinedAt);
      const assignment = assignCards(
        ordered.map((p) => p.playerId),
        room.gamePackage.cards,
      );
      for (const player of room.players) {
        player.required = assignment[player.playerId] !== undefined;
        if (assignment[player.playerId]) player.cardId = assignment[player.playerId];
      }
    }

    if (action === "publish") {
      const statements = room.consensusStatements ?? [];
      if (!canPublish(room.consensusVotes, statements, requiredIds(room))) {
        throw new ApiFault(
          "phase_conflict",
          "Every player must vote on every statement before publishing",
        );
      }
      room.map = computeMap(statements, room.consensusVotes, requiredIds(room));
    }

    enterState(room, transition.to);
  });

  // The closing summary needs the final votes, so it runs after publication —
  // and best-effort, because the map is the record and the summary is only a
  // reading of it. A failed call must never block the round from finishing.
  if (action === "publish") await summariseOutcome(roomId);
}

async function summariseOutcome(roomId: string): Promise<void> {
  try {
    const room = await load(roomId);
    if (!room.material || !room.map?.length || room.mapSummary) return;

    const result = await withRetry(() =>
      getAnalysisAdapter().summariseOutcome({
        sourceText: room.material!.sourceText,
        hostQuestion: room.material!.hostQuestion,
        statements: room.map!.map((entry) => ({
          text: entry.text,
          section: entry.section,
          tally: entry.tally,
        })),
        answers: pseudonymousAnswers(room),
        languages: [...LANGUAGES],
      }),
    );

    await mutate(roomId, (current) => {
      if (current.mapSummary) return;
      current.mapSummary = result.summary;
      touch(current);
    });
  } catch (err) {
    // Deliberately swallowed: the map is already published and complete.
    console.error("[mkk] outcome summary failed:", err);
  }
}

/**
 * Drop a player who has stopped answering / 移除沒有作答的玩家
 *
 * BUILD_PLAN §20.2 leaves host removal out of its draft and says to open a new
 * room instead. That is fine on paper and fatal in front of an audience: one
 * person closing a tab freezes the round permanently, because the reveal waits
 * for everyone. This is the escape hatch.
 *
 * Deliberately narrow: only the host, only while a phase is waiting on answers,
 * and never a player who has already answered — so it can free a stuck room but
 * cannot be used to drop someone whose view the host dislikes.
 */
export async function removePlayer(
  roomId: string,
  hostUserId: string,
  playerId: string,
): Promise<void> {
  const needsConsensus = await mutate(roomId, (room) => {
    requireHost(room, hostUserId);

    const stage = stageForState(room.state);
    if (!stage) {
      throw new ApiFault(
        "phase_conflict",
        "Players can only be removed while the table is waiting on answers",
      );
    }

    const player = room.players.find((p) => p.playerId === playerId);
    if (!player) throw new ApiFault("invalid_input", "Unknown player");

    // Idempotent: removing someone already out is not an error.
    if (!player.required && !player.active) return false;

    if (room.responses[playerId]?.[stage]) {
      throw new ApiFault(
        "phase_conflict",
        "That player has already answered and cannot be removed",
      );
    }

    const remaining = requiredIds(room).filter((id) => id !== playerId);
    if (remaining.length < 1) {
      throw new ApiFault(
        "phase_conflict",
        "At least one player must remain in the round",
      );
    }

    player.required = false;
    player.active = false;
    touch(room);

    // Their absence may be the only thing the phase was waiting for.
    applyAutoTransitions(room);
    return room.state === "FINAL_VOTE" && allStageAnswersIn(room) && !room.consensusStatements;
  });

  if (needsConsensus) await runConsensusDraft(roomId);
}

/** Retry a failed consensus draft without discarding any answers. */
export async function retryConsensus(roomId: string, userId: string): Promise<void> {
  const room = await load(roomId);
  requireHost(room, userId);
  if (room.state !== "FINAL_VOTE") {
    throw new ApiFault("phase_conflict", "Nothing to retry in this phase");
  }
  if (!allStageAnswersIn(room)) {
    throw new ApiFault("phase_conflict", "Players are still answering");
  }
  await runConsensusDraft(roomId);
}

export async function saveResponse(
  roomId: string,
  userId: string,
  payload: ResponsePayload,
): Promise<void> {
  const needsConsensus = await mutate(roomId, (room) => {
    requireRole(room, userId);
    const player = playerOf(room, userId);

    const stage = stageForState(room.state);
    if (!stage) throw new ApiFault("phase_conflict", "This phase does not take answers");
    if (payload.stage !== stage) {
      throw new ApiFault("phase_conflict", `This phase expects the "${stage}" answer`);
    }
    if (!requiredIds(room).includes(player.playerId)) {
      throw new ApiFault("forbidden", "You are not on this round's roster");
    }

    const bucket = (room.responses[player.playerId] ??= {});
    const existing = bucket[stage];
    if (existing) {
      // Answers freeze once submitted: identical retries succeed, edits conflict.
      if (canonicalJson(existing) !== canonicalJson(payload)) {
        throw new ApiFault("duplicate_answer", "Your answer for this phase is already saved");
      }
      // Deliberately fall through rather than returning early. A commit that
      // lost the version race has already written its response row, so on the
      // retry the answer is "already saved" — but the phase it completes may
      // still need to advance. Returning here would strand the round.
    } else {
      // Assigned per branch so each stage keeps its own payload type.
      switch (payload.stage) {
        case "initial":
          bucket.initial = payload;
          break;
        case "card":
          bucket.card = payload;
          break;
        case "final":
          bucket.final = payload;
          break;
      }
      touch(room);
    }

    applyAutoTransitions(room);

    // Completing FINAL_VOTE starts drafting, which is not a state change (§20.2).
    return room.state === "FINAL_VOTE" && allStageAnswersIn(room) && !room.consensusStatements;
  });

  if (needsConsensus) await runConsensusDraft(roomId);
}

export async function voteConsensus(
  roomId: string,
  userId: string,
  statementId: string,
  decision: ConsensusDecision,
): Promise<void> {
  await mutate(roomId, (room) => {
    requireRole(room, userId);
    const player = playerOf(room, userId);

    if (room.state !== "CONSENSUS_REVIEW") {
      throw new ApiFault("phase_conflict", "Consensus review is not open");
    }
    if (!CONSENSUS_DECISIONS.includes(decision)) {
      throw new ApiFault("invalid_input", "Unknown decision");
    }
    if (!(room.consensusStatements ?? []).some((s) => s.id === statementId)) {
      throw new ApiFault("invalid_input", "Unknown statement");
    }
    if (!requiredIds(room).includes(player.playerId)) {
      throw new ApiFault("forbidden", "You are not on this round's roster");
    }

    // One vote per player per statement; changeable while review is open.
    const perStatement = (room.consensusVotes[statementId] ??= {});
    if (perStatement[player.playerId] === decision) return;
    perStatement[player.playerId] = decision;
    touch(room);
  });
}

/* -------------------------------------------------------------------------- */
/* Read model / 讀取模型                                                      */
/* -------------------------------------------------------------------------- */

export async function getRoomView(roomId: string, userId: string): Promise<RoomView> {
  const room = await load(roomId);
  const role = requireRole(room, userId);
  const me = role === "player" ? playerOf(room, userId) : undefined;
  const required = requiredIds(room);
  const pkg = room.gamePackage;

  const players: PublicPlayer[] = room.players.map((p) => ({
    playerId: p.playerId,
    nickname: p.nickname,
    language: p.language,
    active: p.active,
    done: hasFinishedStage(room, p.playerId),
  }));

  const view: RoomView = {
    roomId: room.id,
    roomCode: room.code,
    state: room.state,
    analysis: selectedAdapterName() === "openai" ? "live" : "fixture",
    version: room.version,
    role,
    language: me?.language ?? room.language,
    players,
    requiredPlayerIds: required,
    completion: completionCount(room),
  };

  if (me) view.playerId = me.playerId;
  // Only meaningful while a phase is actually waiting on answers.
  if (room.phaseStartedAt && stageForState(room.state)) {
    view.phaseStartedAt = room.phaseStartedAt;
  }
  if (room.material) view.material = { ...room.material };
  if (room.processing) view.processing = { ...room.processing };

  // Briefing content is public once analysis has succeeded.
  if (pkg && room.state !== "LOBBY" && room.state !== "MATERIAL_SUBMITTED") {
    view.briefing = pkg.briefing;
    view.claims = pkg.claims;
    view.reasons = pkg.reasons;
  }

  // The caller's own card, only from the phase that reveals it onward.
  if (me && pkg && room.state !== "INITIAL_VOTE") {
    const card = findCard(pkg, me.cardId);
    if (card) view.myCard = card;
  }

  // The caller's own answers. No route ever exposes another player's.
  if (me) {
    const mine = room.responses[me.playerId];
    if (mine) view.myResponses = { ...mine };
  }

  // Reveal data is absent until the server has revealed.
  if (isRevealed(room.state) && pkg) {
    const reveal: RevealedAnswer[] = [];
    for (const playerId of required) {
      const responses = room.responses[playerId];
      const player = room.players.find((p) => p.playerId === playerId);
      const card = findCard(pkg, cardIdFor(room, playerId));
      if (!responses?.initial || !responses.card || !player || !card) continue;
      reveal.push({
        playerId,
        nickname: player.nickname,
        cardPerspective: card.perspective,
        initialChoice: responses.initial.initialChoice,
        reactionChoice: responses.card.reactionChoice,
        reasonIds: responses.card.reasonIds,
      });
    }
    view.reveal = reveal;
  }

  if (isConsensusPhase(room.state) && room.consensusStatements) {
    view.consensusStatements = room.consensusStatements;

    const progress: Record<string, number> = {};
    for (const statement of room.consensusStatements) {
      const votes = room.consensusVotes[statement.id] ?? {};
      progress[statement.id] = required.filter((id) => votes[id]).length;
    }
    view.consensusProgress = progress;

    if (me) {
      const mine: Record<string, ConsensusDecision> = {};
      for (const statement of room.consensusStatements) {
        const decision = room.consensusVotes[statement.id]?.[me.playerId];
        if (decision) mine[statement.id] = decision;
      }
      view.myConsensusVotes = mine;
    }
  }

  if (room.state === "COMPLETED" && room.map) {
    view.map = room.map;
    if (room.mapSummary) view.mapSummary = room.mapSummary;
  }

  return view;
}

/** Resolve a room id from a code without exposing the room itself. */
export async function roomIdForCode(code: string): Promise<string | null> {
  const room = await (await getBackend()).loadByCode(code);
  return room?.id ?? null;
}

/** Test-only reset of whichever backend is selected. */
export async function __resetStore(): Promise<void> {
  await (await getBackend()).reset();
}
