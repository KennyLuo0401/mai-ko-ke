import { beforeEach, describe, expect, it } from "vitest";
import { ApiFault } from "@/lib/server/fault";
import {
  __resetStore,
  advance,
  createRoom,
  getRoomView,
  joinRoom,
  removePlayer,
  saveResponse,
  submitMaterial,
  voteConsensus,
} from "@/lib/server/store";
import { DEMO_GAME_PACKAGE, DEMO_SOURCE_TEXT } from "@/lib/ai/fixtures/demo";

const HOST = "user-host";
const U1 = "user-one";
const U2 = "user-two";
const R = DEMO_GAME_PACKAGE.reasons.map((r) => r.id);

async function seedToInitialVote() {
  const { roomId, roomCode } = await createRoom(HOST, "zh-TW");
  const p1 = await joinRoom(U1, roomCode, "Kenny", "zh-TW");
  const p2 = await joinRoom(U2, roomCode, "Alan", "en");
  await submitMaterial(roomId, HOST, DEMO_SOURCE_TEXT, "值得相信嗎？");
  await advance(roomId, HOST, "BRIEFING_READY", "start_initial_vote");
  return { roomId, roomCode, p1, p2 };
}

async function bothAnswerInitial(roomId: string) {
  await saveResponse(roomId, U1, { stage: "initial", initialChoice: "yes" });
  await saveResponse(roomId, U2, { stage: "initial", initialChoice: "no" });
}

async function bothAnswerCard(roomId: string) {
  await saveResponse(roomId, U1, {
    stage: "card",
    reactionChoice: "weakens",
    reasonIds: [R[2]],
  });
  await saveResponse(roomId, U2, {
    stage: "card",
    reactionChoice: "unchanged",
    reasonIds: [R[3], R[4]],
  });
}

async function bothAnswerFinal(roomId: string) {
  await saveResponse(roomId, U1, {
    stage: "final",
    changeChoice: "less_supportive",
    finalChoice: "uncertain",
  });
  await saveResponse(roomId, U2, {
    stage: "final",
    changeChoice: "unchanged",
    finalChoice: "no",
  });
}

beforeEach(() => __resetStore());

describe("lobby and joining", () => {
  it("creates a room with a six-digit code in LOBBY", async () => {
    const { roomId, roomCode } = await createRoom(HOST, "zh-TW");
    expect(roomCode).toMatch(/^[0-9]{6}$/);
    const view = await getRoomView(roomId, HOST);
    expect(view.state).toBe("LOBBY");
    expect(view.role).toBe("host");
  });

  it("reports which analysis source the room is running on", async () => {
    // The UI renders a fallback warning from this, so it must reflect the
    // server's actual adapter rather than a hardcoded label.
    const { roomId } = await createRoom(HOST, "zh-TW");
    expect((await getRoomView(roomId, HOST)).analysis).toBe("fixture");
  });

  it("hides a room from anyone who is not a member", async () => {
    const { roomId } = await createRoom(HOST, "zh-TW");
    await expect(getRoomView(roomId, "stranger")).rejects.toMatchObject({
      code: "room_not_found",
    });
  });

  it("rejects a room code that does not exist", async () => {
    await expect(joinRoom(U1, "000000", "X", "en")).rejects.toMatchObject({
      code: "room_code_not_found",
    });
  });

  it("treats a rejoin as the same seat, not a new player", async () => {
    const { roomId, roomCode } = await createRoom(HOST, "zh-TW");
    const first = await joinRoom(U1, roomCode, "Kenny", "zh-TW");
    const again = await joinRoom(U1, roomCode, "Kenny", "zh-TW");
    expect(again.playerId).toBe(first.playerId);
    expect((await getRoomView(roomId, HOST)).players).toHaveLength(1);
  });

  it("refuses to start without the minimum roster", async () => {
    const { roomId, roomCode } = await createRoom(HOST, "zh-TW");
    await joinRoom(U1, roomCode, "Kenny", "zh-TW");
    await submitMaterial(roomId, HOST, DEMO_SOURCE_TEXT, "");
    await expect(
      advance(roomId, HOST, "BRIEFING_READY", "start_initial_vote"),
    ).rejects.toMatchObject({ code: "phase_conflict" });
  });
});

describe("material and briefing", () => {
  it("reaches BRIEFING_READY through the fixture adapter", async () => {
    const { roomId, roomCode } = await createRoom(HOST, "zh-TW");
    await joinRoom(U1, roomCode, "Kenny", "zh-TW");
    await submitMaterial(roomId, HOST, DEMO_SOURCE_TEXT, "值得相信嗎？");

    const view = await getRoomView(roomId, HOST);
    expect(view.state).toBe("BRIEFING_READY");
    expect(view.briefing?.["zh-TW"]).toBeTruthy();
    expect(view.briefing?.en).toBeTruthy();
    // The original stays beside the briefing so framing stays visible (§14).
    expect(view.material?.sourceText).toBe(DEMO_SOURCE_TEXT);
  });

  it("only lets the host submit material", async () => {
    const { roomId, roomCode } = await createRoom(HOST, "zh-TW");
    await joinRoom(U1, roomCode, "Kenny", "zh-TW");
    await expect(
      submitMaterial(roomId, U1, DEMO_SOURCE_TEXT, ""),
    ).rejects.toMatchObject({ code: "forbidden" });
  });
});

describe("private answering and the reveal", () => {
  it("freezes the roster and rejects late joins", async () => {
    const { roomId, roomCode } = await seedToInitialVote();
    expect((await getRoomView(roomId, HOST)).state).toBe("INITIAL_VOTE");
    await expect(joinRoom("user-late", roomCode, "Late", "en")).rejects.toMatchObject(
      { code: "late_join_rejected" },
    );
  });

  it("never leaks another player's answer before the reveal", async () => {
    const { roomId } = await seedToInitialVote();
    await saveResponse(roomId, U1, { stage: "initial", initialChoice: "yes" });

    const otherPlayer = await getRoomView(roomId, U2);
    expect(otherPlayer.reveal).toBeUndefined();
    expect(otherPlayer.myResponses).toBeUndefined();
    expect(JSON.stringify(otherPlayer)).not.toContain('"initialChoice":"yes"');

    // The host is not a back door either.
    const host = await getRoomView(roomId, HOST);
    expect(host.reveal).toBeUndefined();
    expect(JSON.stringify(host)).not.toContain('"initialChoice"');

    // The author still sees their own answer, and progress is public.
    const author = await getRoomView(roomId, U1);
    expect(author.myResponses?.initial?.initialChoice).toBe("yes");
    expect(author.completion).toEqual({ done: 1, required: 2 });
  });

  it("moves to PRIVATE_CARD only once every required player answered", async () => {
    const { roomId } = await seedToInitialVote();
    await saveResponse(roomId, U1, { stage: "initial", initialChoice: "yes" });
    expect((await getRoomView(roomId, HOST)).state).toBe("INITIAL_VOTE");

    await saveResponse(roomId, U2, { stage: "initial", initialChoice: "no" });
    expect((await getRoomView(roomId, HOST)).state).toBe("PRIVATE_CARD");
  });

  it("deals each player a different perspective, and only their own", async () => {
    const { roomId } = await seedToInitialVote();
    await bothAnswerInitial(roomId);

    const a = await getRoomView(roomId, U1);
    const b = await getRoomView(roomId, U2);
    expect(a.myCard).toBeTruthy();
    expect(b.myCard).toBeTruthy();
    expect(a.myCard!.id).not.toBe(b.myCard!.id);
  });

  it("hides the card during the initial vote", async () => {
    const { roomId } = await seedToInitialVote();
    expect((await getRoomView(roomId, U1)).myCard).toBeUndefined();
  });

  it("reveals exactly once, after the last card answer", async () => {
    const { roomId } = await seedToInitialVote();
    await bothAnswerInitial(roomId);
    await saveResponse(roomId, U1, {
      stage: "card",
      reactionChoice: "weakens",
      reasonIds: [R[2]],
    });
    expect((await getRoomView(roomId, U2)).reveal).toBeUndefined();

    await saveResponse(roomId, U2, {
      stage: "card",
      reactionChoice: "unchanged",
      reasonIds: [R[4]],
    });

    const view = await getRoomView(roomId, U2);
    expect(view.state).toBe("REVEALED");
    expect(view.reveal).toHaveLength(2);
    // Never parks in the intermediate state.
    expect(view.state).not.toBe("READY_TO_REVEAL");
  });

  it("freezes a submitted answer: identical retry is fine, an edit conflicts", async () => {
    const { roomId } = await seedToInitialVote();
    const payload = { stage: "initial", initialChoice: "yes" } as const;

    await saveResponse(roomId, U1, payload);
    await expect(saveResponse(roomId, U1, payload)).resolves.toBeUndefined();
    await expect(
      saveResponse(roomId, U1, { stage: "initial", initialChoice: "no" }),
    ).rejects.toMatchObject({ code: "duplicate_answer" });
  });

  it("rejects an answer meant for another phase", async () => {
    const { roomId } = await seedToInitialVote();
    await expect(
      saveResponse(roomId, U1, {
        stage: "card",
        reactionChoice: "weakens",
        reasonIds: [R[0]],
      }),
    ).rejects.toMatchObject({ code: "phase_conflict" });
  });

  it("is idempotent when the host advances twice", async () => {
    const { roomId } = await seedToInitialVote();
    await bothAnswerInitial(roomId);
    await bothAnswerCard(roomId);
    await advance(roomId, HOST, "REVEALED", "start_discussion");
    await expect(
      advance(roomId, HOST, "REVEALED", "start_discussion"),
    ).resolves.toBeUndefined();
    expect((await getRoomView(roomId, HOST)).state).toBe("IN_PERSON_DISCUSSION");
  });

  it("rejects a stale expectedState", async () => {
    const { roomId } = await seedToInitialVote();
    await expect(
      advance(roomId, HOST, "BRIEFING_READY", "start_discussion"),
    ).rejects.toMatchObject({ code: "phase_conflict" });
  });
});

describe("the phase clock and removing a stalled player", () => {
  it("stamps a shared start time on every answering phase", async () => {
    const { roomId } = await seedToInitialVote();
    const view = await getRoomView(roomId, U1);
    expect(view.phaseStartedAt).toBeGreaterThan(0);

    // Not meaningful outside an answering phase.
    await bothAnswerInitial(roomId);
    await bothAnswerCard(roomId);
    expect((await getRoomView(roomId, HOST)).phaseStartedAt).toBeUndefined();
  });

  it("restarts the clock when the next question opens", async () => {
    const { roomId } = await seedToInitialVote();
    const first = (await getRoomView(roomId, U1)).phaseStartedAt!;
    await new Promise((resolve) => setTimeout(resolve, 5));
    await bothAnswerInitial(roomId);
    const second = (await getRoomView(roomId, U1)).phaseStartedAt!;
    expect(second).toBeGreaterThan(first);
  });

  it("shows the host who has finished, but never what they answered", async () => {
    const { roomId } = await seedToInitialVote();
    await saveResponse(roomId, U1, { stage: "initial", initialChoice: "yes" });

    const host = await getRoomView(roomId, HOST);
    const [one, two] = host.players;
    expect(one.done).toBe(true);
    expect(two.done).toBe(false);
    expect(JSON.stringify(host)).not.toContain('"initialChoice"');
  });

  it("lets the host remove someone who stopped answering, unblocking the round", async () => {
    const { roomId } = await seedToInitialVote();
    await saveResponse(roomId, U1, { stage: "initial", initialChoice: "yes" });

    const stalled = (await getRoomView(roomId, HOST)).players.find((p) => !p.done)!;
    await removePlayer(roomId, HOST, stalled.playerId);

    // Their absence was the only thing the phase was waiting for.
    const view = await getRoomView(roomId, HOST);
    expect(view.state).toBe("PRIVATE_CARD");
    expect(view.requiredPlayerIds).toHaveLength(1);
    expect(view.completion.required).toBe(1);
  });

  it("refuses to remove a player who has already answered", async () => {
    const { roomId, p1 } = await seedToInitialVote();
    await saveResponse(roomId, U1, { stage: "initial", initialChoice: "yes" });
    await expect(removePlayer(roomId, HOST, p1.playerId)).rejects.toMatchObject({
      code: "phase_conflict",
    });
  });

  it("only the host may remove anyone", async () => {
    const { roomId, p2 } = await seedToInitialVote();
    await expect(removePlayer(roomId, U1, p2.playerId)).rejects.toMatchObject({
      code: "forbidden",
    });
  });

  it("refuses outside an answering phase", async () => {
    const { roomId, p1 } = await createRoom(HOST, "zh-TW").then(async (room) => {
      const a = await joinRoom(U1, room.roomCode, "Kenny", "zh-TW");
      await joinRoom(U2, room.roomCode, "Alan", "en");
      return { roomId: room.roomId, p1: a };
    });
    await expect(removePlayer(roomId, HOST, p1.playerId)).rejects.toMatchObject({
      code: "phase_conflict",
    });
  });

  it("never empties the round", async () => {
    const { roomId, p1, p2 } = await seedToInitialVote();
    await removePlayer(roomId, HOST, p1.playerId);
    // Removing the last remaining player would leave nobody to reveal.
    await expect(removePlayer(roomId, HOST, p2.playerId)).rejects.toMatchObject({
      code: "phase_conflict",
    });
  });

  it("is idempotent", async () => {
    const { roomId, p1 } = await seedToInitialVote();
    await removePlayer(roomId, HOST, p1.playerId);
    await expect(removePlayer(roomId, HOST, p1.playerId)).resolves.toBeUndefined();
  });
});

describe("final positions, consensus and publication", () => {
  async function seedToConsensus() {
    const { roomId } = await seedToInitialVote();
    await bothAnswerInitial(roomId);
    await bothAnswerCard(roomId);
    await advance(roomId, HOST, "REVEALED", "start_discussion");
    await advance(roomId, HOST, "IN_PERSON_DISCUSSION", "start_final_vote");
    await bothAnswerFinal(roomId);
    return roomId;
  }

  it("drafts consensus once every final answer is in", async () => {
    const roomId = await seedToConsensus();
    const view = await getRoomView(roomId, U1);
    expect(view.state).toBe("CONSENSUS_REVIEW");
    expect(view.consensusStatements?.length).toBeGreaterThan(0);
  });

  it("blocks publication while any required vote is missing", async () => {
    const roomId = await seedToConsensus();
    const statements = (await getRoomView(roomId, HOST)).consensusStatements!;
    await voteConsensus(roomId, U1, statements[0].id, "agree");

    await expect(
      advance(roomId, HOST, "CONSENSUS_REVIEW", "publish"),
    ).rejects.toMatchObject({ code: "phase_conflict" });
  });

  it("publishes a map that keeps a minority view visible", async () => {
    const roomId = await seedToConsensus();
    const statements = (await getRoomView(roomId, HOST)).consensusStatements!;

    // Choose deliberately, not positionally: with the statement cap there is
    // often exactly one candidate agreement, so dissenting on "the first"
    // would leave nothing able to reach "we agree".
    const agreed = statements.find((s) => s.category === "candidate_agreement")!;
    const contested = statements.find((s) => s.id !== agreed.id)!;

    for (const statement of statements) {
      await voteConsensus(roomId, U1, statement.id, "agree");
      await voteConsensus(
        roomId,
        U2,
        statement.id,
        statement.id === contested.id ? "disagree" : "agree",
      );
    }

    await advance(roomId, HOST, "CONSENSUS_REVIEW", "publish");
    const view = await getRoomView(roomId, U1);

    expect(view.state).toBe("COMPLETED");
    // The round ends on prose, not a pile of voted bullets.
    expect(view.mapSummary?.["zh-TW"].length).toBeGreaterThan(30);
    expect(view.mapSummary?.en.length).toBeGreaterThan(30);
    const disputed = view.map!.find((m) => m.id === contested.id)!;
    expect(disputed.section).toBe("we_differ");
    expect(disputed.tally.disagree).toBe(1);
    // The dissent did not delete the statement.
    expect(view.map).toHaveLength(statements.length);
    // And what everyone did sign reached "We agree".
    expect(view.map!.find((m) => m.id === agreed.id)!.section).toBe("we_agree");
  });

  it("refuses a consensus vote from outside the room", async () => {
    const roomId = await seedToConsensus();
    const statements = (await getRoomView(roomId, HOST)).consensusStatements!;
    await expect(
      voteConsensus(roomId, "stranger", statements[0].id, "agree"),
    ).rejects.toBeInstanceOf(ApiFault);
  });

  it("does not let the host vote on consensus", async () => {
    const roomId = await seedToConsensus();
    const statements = (await getRoomView(roomId, HOST)).consensusStatements!;
    await expect(
      voteConsensus(roomId, HOST, statements[0].id, "agree"),
    ).rejects.toMatchObject({ code: "forbidden" });
  });
});
