import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

/**
 * The critical scenario against the real Supabase backend / 對真實 Supabase 驗證
 *
 * The same guarantees the in-memory suite asserts must hold when persistence is
 * Postgres and commits are compare-and-swap: answers stay private until the
 * reveal, the reveal happens once, publication is gated, and dissent survives.
 *
 * Skipped when credentials are absent. Point these at a development project —
 * the suite deletes every room in it.
 */

const configured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SECRET_KEY,
);

const HOST = "sb-host";
const U1 = "sb-one";
const U2 = "sb-two";

describe.skipIf(!configured)("supabase backend", () => {
  // Imported dynamically so the backend selection sees the env change.
  let store: typeof import("@/lib/server/store");
  let reasons: string[] = [];

  beforeAll(async () => {
    process.env.MKK_STORE = "supabase";
    const backend = await import("@/lib/server/backend");
    backend.__clearBackendCache();
    store = await import("@/lib/server/store");
    expect(store.selectedBackendName()).toBe("supabase");

    const { DEMO_GAME_PACKAGE } = await import("@/lib/ai/fixtures/demo");
    reasons = DEMO_GAME_PACKAGE.reasons.map((reason) => reason.id);
  });

  afterAll(async () => {
    await store.__resetStore();
    process.env.MKK_STORE = "memory";
    const backend = await import("@/lib/server/backend");
    backend.__clearBackendCache();
  });

  beforeEach(async () => {
    await store.__resetStore();
  });

  async function seedToInitialVote() {
    const { roomId, roomCode } = await store.createRoom(HOST, "zh-TW");
    await store.joinRoom(U1, roomCode, "Kenny", "zh-TW");
    await store.joinRoom(U2, roomCode, "Alan", "en");
    await store.submitMaterial(roomId, HOST, "四天工作制的討論素材。", "值得相信嗎？");
    await store.advance(roomId, HOST, "BRIEFING_READY", "start_initial_vote");
    return { roomId, roomCode };
  }

  it("round-trips a room through Postgres", async () => {
    const { roomId, roomCode } = await store.createRoom(HOST, "zh-TW");
    expect(roomCode).toMatch(/^\d{6}$/);

    const view = await store.getRoomView(roomId, HOST);
    expect(view.state).toBe("LOBBY");
    expect(view.role).toBe("host");
    expect(await store.roomIdForCode(roomCode)).toBe(roomId);
  });

  it("hides a room from anyone who is not a member", async () => {
    const { roomId } = await store.createRoom(HOST, "zh-TW");
    await expect(store.getRoomView(roomId, "stranger")).rejects.toMatchObject({
      code: "room_not_found",
    });
  });

  it("persists players, material and the briefing", async () => {
    const { roomId, roomCode } = await store.createRoom(HOST, "zh-TW");
    await store.joinRoom(U1, roomCode, "Kenny", "zh-TW");
    await store.submitMaterial(roomId, HOST, "素材原文。", "問題？");

    const view = await store.getRoomView(roomId, HOST);
    expect(view.state).toBe("BRIEFING_READY");
    expect(view.players).toHaveLength(1);
    expect(view.material?.sourceText).toBe("素材原文。");
    expect(view.briefing?.["zh-TW"]).toBeTruthy();
    expect(view.briefing?.en).toBeTruthy();
  });

  it("treats a rejoin as the same seat", async () => {
    const { roomId, roomCode } = await store.createRoom(HOST, "zh-TW");
    const first = await store.joinRoom(U1, roomCode, "Kenny", "zh-TW");
    const again = await store.joinRoom(U1, roomCode, "Kenny", "zh-TW");
    expect(again.playerId).toBe(first.playerId);
    expect((await store.getRoomView(roomId, HOST)).players).toHaveLength(1);
  });

  it("rejects a late join once the roster freezes", async () => {
    const { roomCode } = await seedToInitialVote();
    await expect(store.joinRoom("sb-late", roomCode, "Late", "en")).rejects.toMatchObject({
      code: "late_join_rejected",
    });
  });

  it("never leaks another player's answer before the reveal", async () => {
    const { roomId } = await seedToInitialVote();
    await store.saveResponse(roomId, U1, { stage: "initial", initialChoice: "yes" });

    const other = await store.getRoomView(roomId, U2);
    expect(other.reveal).toBeUndefined();
    expect(other.myResponses).toBeUndefined();
    expect(JSON.stringify(other)).not.toContain('"initialChoice":"yes"');

    const host = await store.getRoomView(roomId, HOST);
    expect(host.reveal).toBeUndefined();
    expect(JSON.stringify(host)).not.toContain('"initialChoice"');

    const author = await store.getRoomView(roomId, U1);
    expect(author.myResponses?.initial?.initialChoice).toBe("yes");
    expect(author.completion).toEqual({ done: 1, required: 2 });
  });

  it("deals a different card to each player and reveals exactly once", async () => {
    const { roomId } = await seedToInitialVote();
    await store.saveResponse(roomId, U1, { stage: "initial", initialChoice: "yes" });
    await store.saveResponse(roomId, U2, { stage: "initial", initialChoice: "no" });

    const a = await store.getRoomView(roomId, U1);
    const b = await store.getRoomView(roomId, U2);
    expect(a.state).toBe("PRIVATE_CARD");
    expect(a.myCard!.id).not.toBe(b.myCard!.id);

    await store.saveResponse(roomId, U1, {
      stage: "card",
      reactionChoice: "weakens",
      reasonIds: [reasons[0]],
    });
    expect((await store.getRoomView(roomId, U2)).reveal).toBeUndefined();

    await store.saveResponse(roomId, U2, {
      stage: "card",
      reactionChoice: "unchanged",
      reasonIds: [reasons[1], reasons[2]],
    });

    const revealed = await store.getRoomView(roomId, U2);
    expect(revealed.state).toBe("REVEALED");
    expect(revealed.reveal).toHaveLength(2);
  });

  it("freezes a submitted answer across the connection", async () => {
    const { roomId } = await seedToInitialVote();
    const payload = { stage: "initial", initialChoice: "yes" } as const;
    await store.saveResponse(roomId, U1, payload);
    await expect(store.saveResponse(roomId, U1, payload)).resolves.toBeUndefined();
    await expect(
      store.saveResponse(roomId, U1, { stage: "initial", initialChoice: "no" }),
    ).rejects.toMatchObject({ code: "duplicate_answer" });
  });

  it("completes a whole round and keeps a dissenting view visible", async () => {
    const { roomId } = await seedToInitialVote();
    await store.saveResponse(roomId, U1, { stage: "initial", initialChoice: "yes" });
    await store.saveResponse(roomId, U2, { stage: "initial", initialChoice: "no" });
    await store.saveResponse(roomId, U1, {
      stage: "card",
      reactionChoice: "weakens",
      reasonIds: [reasons[0]],
    });
    await store.saveResponse(roomId, U2, {
      stage: "card",
      reactionChoice: "unchanged",
      reasonIds: [reasons[1]],
    });
    await store.advance(roomId, HOST, "REVEALED", "start_discussion");
    await store.advance(roomId, HOST, "IN_PERSON_DISCUSSION", "start_final_vote");
    await store.saveResponse(roomId, U1, {
      stage: "final",
      changeChoice: "less_supportive",
      finalChoice: "uncertain",
    });
    await store.saveResponse(roomId, U2, {
      stage: "final",
      changeChoice: "unchanged",
      finalChoice: "no",
      comment: "still thin",
    });

    const review = await store.getRoomView(roomId, U1);
    expect(review.state).toBe("CONSENSUS_REVIEW");
    const statements = review.consensusStatements!;
    expect(statements.length).toBeGreaterThan(0);
    expect(statements.length).toBeLessThanOrEqual(4);

    // Publication is blocked while any required vote is missing.
    await store.voteConsensus(roomId, U1, statements[0].id, "agree");
    await expect(
      store.advance(roomId, HOST, "CONSENSUS_REVIEW", "publish"),
    ).rejects.toMatchObject({ code: "phase_conflict" });

    // Chosen deliberately: the statement cap can leave a single candidate
    // agreement, and dissenting on that one would empty "we agree".
    const agreed = statements.find((s) => s.category === "candidate_agreement")!;
    const contested = statements.find((s) => s.id !== agreed.id)!;

    for (const statement of statements) {
      await store.voteConsensus(roomId, U1, statement.id, "agree");
      await store.voteConsensus(
        roomId,
        U2,
        statement.id,
        statement.id === contested.id ? "disagree" : "agree",
      );
    }

    await store.advance(roomId, HOST, "CONSENSUS_REVIEW", "publish");
    const done = await store.getRoomView(roomId, U1);

    expect(done.state).toBe("COMPLETED");
    expect(done.map).toHaveLength(statements.length);
    const disputed = done.map!.find((entry) => entry.id === contested.id)!;
    expect(disputed.section).toBe("we_differ");
    expect(disputed.tally.disagree).toBe(1);
    expect(done.map!.find((entry) => entry.id === agreed.id)!.section).toBe("we_agree");
  });

  it("survives two players answering at the same moment", async () => {
    const { roomId } = await seedToInitialVote();
    // Concurrent commits: the compare-and-swap must serialize them, and the
    // phase must advance exactly once.
    await Promise.all([
      store.saveResponse(roomId, U1, { stage: "initial", initialChoice: "yes" }),
      store.saveResponse(roomId, U2, { stage: "initial", initialChoice: "no" }),
    ]);
    const view = await store.getRoomView(roomId, HOST);
    expect(view.state).toBe("PRIVATE_CARD");
    expect(view.completion.required).toBe(2);
  });

  it("reveals when both card answers land at the same moment", async () => {
    // Regression: the loser of the version race has already written its
    // response row, so on retry it re-reads its own answer out of jsonb — where
    // key order is not preserved. Comparing it as raw text made an idempotent
    // retry look like a conflicting edit, which raised duplicate_answer and
    // left the round stuck in PRIVATE_CARD.
    const { roomId } = await seedToInitialVote();
    await Promise.all([
      store.saveResponse(roomId, U1, { stage: "initial", initialChoice: "yes" }),
      store.saveResponse(roomId, U2, { stage: "initial", initialChoice: "no" }),
    ]);

    await Promise.all([
      store.saveResponse(roomId, U1, {
        stage: "card",
        reactionChoice: "weakens",
        reasonIds: [reasons[0]],
      }),
      store.saveResponse(roomId, U2, {
        stage: "card",
        reactionChoice: "unchanged",
        reasonIds: [reasons[1]],
      }),
    ]);

    const view = await store.getRoomView(roomId, HOST);
    expect(view.state).toBe("REVEALED");
    expect(view.reveal).toHaveLength(2);
  });

  it("accepts an identical resubmission after a round trip through jsonb", async () => {
    const { roomId } = await seedToInitialVote();
    const payload = { stage: "initial", initialChoice: "yes" } as const;
    await store.saveResponse(roomId, U1, payload);
    // Reloaded from Postgres, so key order differs from the original object.
    await expect(store.saveResponse(roomId, U1, payload)).resolves.toBeUndefined();
  });
});

describe.skipIf(configured)("supabase backend (skipped)", () => {
  it("needs Supabase credentials in .env.local", () => {
    expect(configured).toBe(false);
  });
});
