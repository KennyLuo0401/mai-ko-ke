import { describe, expect, it } from "vitest";
import type { ConsensusStatement } from "@/lib/contracts";
import {
  assignCards,
  canPublish,
  computeMap,
  generateRoomCode,
  isValidRoomCode,
  limitStatements,
  MAX_CONSENSUS_STATEMENTS,
  parseResponsePayload,
  RuleError,
  type VoteTable,
} from "@/lib/game/rules";
import { DEMO_GAME_PACKAGE } from "@/lib/ai/fixtures/demo";

const REASONS = DEMO_GAME_PACKAGE.reasons.map((r) => r.id);

describe("room codes", () => {
  it("always produces six digits", () => {
    for (let i = 0; i < 200; i++) {
      expect(isValidRoomCode(generateRoomCode())).toBe(true);
    }
  });

  it("rejects anything that is not six digits", () => {
    expect(isValidRoomCode("12345")).toBe(false);
    expect(isValidRoomCode("1234567")).toBe(false);
    expect(isValidRoomCode("abcdef")).toBe(false);
  });
});

describe("3-1-1 answer validation", () => {
  it("accepts a valid initial answer", () => {
    expect(
      parseResponsePayload({ stage: "initial", initialChoice: "uncertain" }, REASONS),
    ).toEqual({ stage: "initial", initialChoice: "uncertain" });
  });

  it("always allows an uncertain option", () => {
    expect(() =>
      parseResponsePayload({ stage: "initial", initialChoice: "uncertain" }, REASONS),
    ).not.toThrow();
  });

  it("rejects an unknown initial choice", () => {
    expect(() =>
      parseResponsePayload({ stage: "initial", initialChoice: "maybe" }, REASONS),
    ).toThrow(RuleError);
  });

  it("enforces the 1-2 reason limit", () => {
    const base = { stage: "card", reactionChoice: "weakens" };
    expect(() =>
      parseResponsePayload({ ...base, reasonIds: [] }, REASONS),
    ).toThrow(/between 1 and 2/);
    expect(() =>
      parseResponsePayload({ ...base, reasonIds: REASONS.slice(0, 3) }, REASONS),
    ).toThrow(/between 1 and 2/);
    expect(
      parseResponsePayload({ ...base, reasonIds: REASONS.slice(0, 2) }, REASONS),
    ).toMatchObject({ reasonIds: REASONS.slice(0, 2) });
  });

  it("rejects reason ids that are not in the package", () => {
    expect(() =>
      parseResponsePayload(
        { stage: "card", reactionChoice: "weakens", reasonIds: ["有具體資料"] },
        REASONS,
      ),
    ).toThrow(/unknown reason id/);
  });

  it("rejects duplicated reasons", () => {
    expect(() =>
      parseResponsePayload(
        { stage: "card", reactionChoice: "weakens", reasonIds: [REASONS[0], REASONS[0]] },
        REASONS,
      ),
    ).toThrow(/must not repeat/);
  });

  it("accepts a final answer with an optional comment", () => {
    expect(
      parseResponsePayload(
        {
          stage: "final",
          changeChoice: "unchanged",
          finalChoice: "no",
          comment: "  still thin  ",
        },
        REASONS,
      ),
    ).toEqual({
      stage: "final",
      changeChoice: "unchanged",
      finalChoice: "no",
      comment: "still thin",
    });
  });

  it("rejects an unknown stage", () => {
    expect(() => parseResponsePayload({ stage: "bonus" }, REASONS)).toThrow(RuleError);
  });
});

describe("card assignment", () => {
  it("deals a different perspective to each player while cards last", () => {
    const players = ["p1", "p2", "p3"];
    const assignment = assignCards(players, DEMO_GAME_PACKAGE.cards);
    const dealt = players.map((p) => assignment[p]);
    expect(new Set(dealt).size).toBe(3);
  });

  it("is deterministic for the same roster", () => {
    const players = ["p1", "p2"];
    expect(assignCards(players, DEMO_GAME_PACKAGE.cards)).toEqual(
      assignCards(players, DEMO_GAME_PACKAGE.cards),
    );
  });
});

describe("limiting how many statements a table must vote on", () => {
  const make = (id: string, category: ConsensusStatement["category"]) => ({
    id,
    text: { "zh-TW": id, en: id },
    category,
  });

  it("never asks for more than the cap", () => {
    const many = [
      make("a1", "candidate_agreement"),
      make("a2", "candidate_agreement"),
      make("d1", "disagreement"),
      make("d2", "disagreement"),
      make("m1", "missing_evidence"),
      make("m2", "missing_evidence"),
      make("u1", "uncertainty"),
      make("u2", "uncertainty"),
    ];
    expect(limitStatements(many)).toHaveLength(MAX_CONSENSUS_STATEMENTS);
    expect(MAX_CONSENSUS_STATEMENTS).toBe(4);
  });

  it("keeps the map broad rather than taking the first four", () => {
    // A model that front-loads agreements must not cost the table its
    // disagreement, missing-evidence and uncertainty sections.
    const frontLoaded = [
      make("a1", "candidate_agreement"),
      make("a2", "candidate_agreement"),
      make("a3", "candidate_agreement"),
      make("a4", "candidate_agreement"),
      make("d1", "disagreement"),
      make("m1", "missing_evidence"),
      make("u1", "uncertainty"),
    ];
    const kept = limitStatements(frontLoaded);
    expect(kept.map((s) => s.category).sort()).toEqual([
      "candidate_agreement",
      "disagreement",
      "missing_evidence",
      "uncertainty",
    ]);
  });

  it("leaves a short list untouched, in its original order", () => {
    const few = [make("a1", "candidate_agreement"), make("d1", "disagreement")];
    expect(limitStatements(few)).toEqual(few);
  });

  it("preserves the model's ordering among survivors", () => {
    const list = [
      make("d1", "disagreement"),
      make("a1", "candidate_agreement"),
      make("u1", "uncertainty"),
    ];
    expect(limitStatements(list).map((s) => s.id)).toEqual(["d1", "a1", "u1"]);
  });
});

describe("consensus aggregation", () => {
  const statements: ConsensusStatement[] = [
    {
      id: "s1",
      text: { "zh-TW": "一", en: "one" },
      category: "candidate_agreement",
    },
    {
      id: "s2",
      text: { "zh-TW": "二", en: "two" },
      category: "candidate_agreement",
    },
  ];
  const required = ["p1", "p2"];

  it("blocks publishing while any vote is missing", () => {
    const votes: VoteTable = { s1: { p1: "agree", p2: "agree" }, s2: { p1: "agree" } };
    expect(canPublish(votes, statements, required)).toBe(false);
  });

  it("allows publishing once every required vote is in", () => {
    const votes: VoteTable = {
      s1: { p1: "agree", p2: "agree" },
      s2: { p1: "agree", p2: "disagree" },
    };
    expect(canPublish(votes, statements, required)).toBe(true);
  });

  it("only lets unanimously agreed statements enter We agree", () => {
    const votes: VoteTable = {
      s1: { p1: "agree", p2: "agree" },
      s2: { p1: "agree", p2: "disagree" },
    };
    const map = computeMap(statements, votes, required);
    expect(map.find((m) => m.id === "s1")?.section).toBe("we_agree");
    expect(map.find((m) => m.id === "s2")?.section).toBe("we_differ");
  });

  it("keeps a minority view visible rather than dropping it", () => {
    const votes: VoteTable = {
      s1: { p1: "agree", p2: "needs_revision" },
      s2: { p1: "agree", p2: "agree" },
    };
    const map = computeMap(statements, votes, required);
    const minority = map.find((m) => m.id === "s1");
    expect(minority?.section).toBe("we_differ");
    expect(minority?.tally.needs_revision).toBe(1);
  });

  it("routes approved missing-evidence and uncertainty to their own sections", () => {
    const mixed: ConsensusStatement[] = [
      { id: "m1", text: { "zh-TW": "缺", en: "missing" }, category: "missing_evidence" },
      { id: "u1", text: { "zh-TW": "不確定", en: "unsure" }, category: "uncertainty" },
    ];
    const votes: VoteTable = {
      m1: { p1: "agree", p2: "agree" },
      u1: { p1: "agree", p2: "agree" },
    };
    const map = computeMap(mixed, votes, required);
    expect(map[0].section).toBe("missing_evidence");
    expect(map[1].section).toBe("uncertainty");
  });
});
