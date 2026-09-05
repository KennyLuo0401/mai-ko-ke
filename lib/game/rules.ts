/**
 * Gameplay rules and validation / 遊戲規則與驗證 (BUILD_PLAN §20)
 *
 * Pure functions. Question counts, option limits, card assignment, vote
 * aggregation and final map placement are decided here by code — the model
 * only ever proposes (§9, §20.3).
 */

import type {
  ConsensusDecision,
  ConsensusStatement,
  GamePackage,
  Language,
  MapSection,
  MappedStatement,
  ResponsePayload,
  ThinkingCard,
} from "@/lib/contracts";
import {
  CHANGE_CHOICES,
  LANGUAGES,
  MAX_COMMENT_LENGTH,
  MAX_HOST_QUESTION_LENGTH,
  MAX_NICKNAME_LENGTH,
  MAX_REASONS,
  MAX_SOURCE_TEXT_LENGTH,
  MIN_REASONS,
  REACTION_CHOICES,
  YES_NO_UNCERTAIN,
} from "@/lib/contracts";

export class RuleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RuleError";
  }
}

/* -------------------------------------------------------------------------- */
/* Room codes / 房號                                                          */
/* -------------------------------------------------------------------------- */

/** Six digits. Collisions are resolved by generating a new code, never fuzzily. */
export function generateRoomCode(random: () => number = Math.random): string {
  return String(Math.floor(random() * 900000) + 100000);
}

export function isValidRoomCode(code: unknown): code is string {
  return typeof code === "string" && /^[0-9]{6}$/.test(code);
}

/* -------------------------------------------------------------------------- */
/* Input validation / 輸入驗證                                                */
/* -------------------------------------------------------------------------- */

export function parseLanguage(value: unknown): Language {
  if (typeof value === "string" && (LANGUAGES as string[]).includes(value)) {
    return value as Language;
  }
  throw new RuleError("language must be zh-TW or en");
}

export function parseNickname(value: unknown): string {
  if (typeof value !== "string") throw new RuleError("nickname is required");
  const trimmed = value.trim();
  if (!trimmed) throw new RuleError("nickname is required");
  if (trimmed.length > MAX_NICKNAME_LENGTH) {
    throw new RuleError(`nickname must be at most ${MAX_NICKNAME_LENGTH} characters`);
  }
  return trimmed;
}

export function parseSourceText(value: unknown): string {
  if (typeof value !== "string") throw new RuleError("sourceText is required");
  const trimmed = value.trim();
  if (!trimmed) throw new RuleError("sourceText is required");
  if (trimmed.length > MAX_SOURCE_TEXT_LENGTH) {
    throw new RuleError(
      `sourceText must be at most ${MAX_SOURCE_TEXT_LENGTH} characters`,
    );
  }
  return trimmed;
}

export function parseHostQuestion(value: unknown): string {
  if (value === undefined || value === null) return "";
  if (typeof value !== "string") throw new RuleError("hostQuestion must be text");
  const trimmed = value.trim();
  if (trimmed.length > MAX_HOST_QUESTION_LENGTH) {
    throw new RuleError(
      `hostQuestion must be at most ${MAX_HOST_QUESTION_LENGTH} characters`,
    );
  }
  return trimmed;
}

/**
 * Validate a stage-tagged answer against the 3-1-1 rules (§20.1).
 * `validReasonIds` comes from the room's GamePackage, so translated display
 * text can never be used as an identifier.
 */
export function parseResponsePayload(
  raw: unknown,
  validReasonIds: string[],
): ResponsePayload {
  if (typeof raw !== "object" || raw === null) {
    throw new RuleError("response body must be an object");
  }
  const body = raw as Record<string, unknown>;

  switch (body.stage) {
    case "initial": {
      const choice = body.initialChoice;
      if (!YES_NO_UNCERTAIN.includes(choice as never)) {
        throw new RuleError("initialChoice must be yes, no or uncertain");
      }
      return { stage: "initial", initialChoice: choice as never };
    }

    case "card": {
      const reaction = body.reactionChoice;
      if (!REACTION_CHOICES.includes(reaction as never)) {
        throw new RuleError(
          `reactionChoice must be one of ${REACTION_CHOICES.join(", ")}`,
        );
      }
      const reasonIds = body.reasonIds;
      if (!Array.isArray(reasonIds)) {
        throw new RuleError("reasonIds must be an array");
      }
      const unique = Array.from(new Set(reasonIds.map(String)));
      if (unique.length !== reasonIds.length) {
        throw new RuleError("reasonIds must not repeat");
      }
      if (unique.length < MIN_REASONS || unique.length > MAX_REASONS) {
        throw new RuleError(
          `select between ${MIN_REASONS} and ${MAX_REASONS} reasons`,
        );
      }
      for (const id of unique) {
        if (!validReasonIds.includes(id)) {
          throw new RuleError(`unknown reason id "${id}"`);
        }
      }
      return { stage: "card", reactionChoice: reaction as never, reasonIds: unique };
    }

    case "final": {
      const change = body.changeChoice;
      if (!CHANGE_CHOICES.includes(change as never)) {
        throw new RuleError(
          `changeChoice must be one of ${CHANGE_CHOICES.join(", ")}`,
        );
      }
      const finalChoice = body.finalChoice;
      if (!YES_NO_UNCERTAIN.includes(finalChoice as never)) {
        throw new RuleError("finalChoice must be yes, no or uncertain");
      }
      let comment: string | undefined;
      if (body.comment !== undefined && body.comment !== null && body.comment !== "") {
        if (typeof body.comment !== "string") {
          throw new RuleError("comment must be text");
        }
        const trimmed = body.comment.trim();
        if (trimmed.length > MAX_COMMENT_LENGTH) {
          throw new RuleError(
            `comment must be at most ${MAX_COMMENT_LENGTH} characters`,
          );
        }
        if (trimmed) comment = trimmed;
      }
      return {
        stage: "final",
        changeChoice: change as never,
        finalChoice: finalChoice as never,
        ...(comment ? { comment } : {}),
      };
    }

    default:
      throw new RuleError("stage must be initial, card or final");
  }
}

/* -------------------------------------------------------------------------- */
/* Card assignment / 卡片分派                                                 */
/* -------------------------------------------------------------------------- */

/**
 * One card per player, deterministic in join order, maximising distinct
 * perspectives. Same roster + same package → same assignment.
 */
export function assignCards(
  playerIds: string[],
  cards: ThinkingCard[],
): Record<string, string> {
  if (cards.length === 0) throw new RuleError("game package has no cards");
  const assignment: Record<string, string> = {};
  playerIds.forEach((playerId, index) => {
    assignment[playerId] = cards[index % cards.length].id;
  });
  return assignment;
}

export function findCard(
  pkg: GamePackage,
  cardId: string | undefined,
): ThinkingCard | undefined {
  if (!cardId) return undefined;
  return pkg.cards.find((c) => c.id === cardId);
}

/* -------------------------------------------------------------------------- */
/* Consensus aggregation / 共識統計 (§20.3)                                   */
/* -------------------------------------------------------------------------- */

/**
 * How many statements a table is asked to vote on.
 *
 * Every statement is a question each player must answer, so this is the real
 * length of the closing round — eight statements is twenty-four taps across
 * three people, at the exact moment attention is lowest. Four keeps the map
 * broad (one per section) while ending the game while people still care.
 *
 * 每一則敘述都是每位玩家要回答的一題；上限設為 4，讓地圖仍有廣度但不拖長。
 */
export const MAX_CONSENSUS_STATEMENTS = 4;

/**
 * Trim to the cap while preserving breadth: take one statement per category in
 * map order first, so a table never loses a whole section of the map just
 * because the model front-loaded one category.
 */
export function limitStatements(
  statements: ConsensusStatement[],
  max: number = MAX_CONSENSUS_STATEMENTS,
): ConsensusStatement[] {
  const order: ConsensusStatement["category"][] = [
    "candidate_agreement",
    "disagreement",
    "missing_evidence",
    "uncertainty",
  ];
  const picked: ConsensusStatement[] = [];

  for (const category of order) {
    if (picked.length >= max) break;
    const first = statements.find(
      (statement) => statement.category === category && !picked.includes(statement),
    );
    if (first) picked.push(first);
  }
  for (const statement of statements) {
    if (picked.length >= max) break;
    if (!picked.includes(statement)) picked.push(statement);
  }

  // Keep the model's original ordering among whatever survived.
  return statements.filter((statement) => picked.includes(statement));
}

export type VoteTable = Record<string, Record<string, ConsensusDecision>>;

export function tallyStatement(
  votes: VoteTable,
  statementId: string,
  requiredPlayerIds: string[],
): Record<ConsensusDecision, number> {
  const tally: Record<ConsensusDecision, number> = {
    agree: 0,
    needs_revision: 0,
    disagree: 0,
  };
  const perStatement = votes[statementId] ?? {};
  for (const playerId of requiredPlayerIds) {
    const decision = perStatement[playerId];
    if (decision) tally[decision] += 1;
  }
  return tally;
}

/** Every required player must have voted on every statement before publishing. */
export function missingVoteCount(
  votes: VoteTable,
  statements: ConsensusStatement[],
  requiredPlayerIds: string[],
): number {
  let missing = 0;
  for (const statement of statements) {
    const perStatement = votes[statement.id] ?? {};
    for (const playerId of requiredPlayerIds) {
      if (!perStatement[playerId]) missing += 1;
    }
  }
  return missing;
}

export function canPublish(
  votes: VoteTable,
  statements: ConsensusStatement[],
  requiredPlayerIds: string[],
): boolean {
  return missingVoteCount(votes, statements, requiredPlayerIds) === 0;
}

/**
 * Final placement. Only statements every required player explicitly agreed to
 * may enter "We agree"; anything short of that stays visible as disagreement.
 * The model's category is a proposal, not the decision.
 */
export function computeMap(
  statements: ConsensusStatement[],
  votes: VoteTable,
  requiredPlayerIds: string[],
): MappedStatement[] {
  return statements.map((statement) => {
    const tally = tallyStatement(votes, statement.id, requiredPlayerIds);
    const unanimous =
      requiredPlayerIds.length > 0 && tally.agree === requiredPlayerIds.length;

    let section: MapSection;
    if (!unanimous) {
      section = "we_differ";
    } else if (statement.category === "missing_evidence") {
      section = "missing_evidence";
    } else if (statement.category === "uncertainty") {
      section = "uncertainty";
    } else if (statement.category === "disagreement") {
      section = "we_differ";
    } else {
      section = "we_agree";
    }

    return { id: statement.id, text: statement.text, section, tally };
  });
}

/** Stable pseudonyms for the analysis adapter — real IDs never leave the server. */
export function pseudonymFor(index: number): string {
  return `P${index + 1}`;
}

/**
 * Order-independent serialization for comparing stored values.
 *
 * Postgres `jsonb` does not preserve object key order, so a value read back
 * from the database is not textually identical to the one written even when it
 * is the same value. Comparing raw `JSON.stringify` output would make an
 * idempotent retry look like a conflicting edit. Array order is meaningful and
 * is preserved.
 *
 * jsonb 不保留鍵的順序，因此比較前先正規化，避免把冪等重試誤判為衝突修改。
 */
export function canonicalJson(value: unknown): string {
  return JSON.stringify(value, (_key, entry) =>
    entry && typeof entry === "object" && !Array.isArray(entry)
      ? Object.fromEntries(
          Object.entries(entry as Record<string, unknown>).sort(([a], [b]) =>
            a < b ? -1 : a > b ? 1 : 0,
          ),
        )
      : entry,
  );
}
