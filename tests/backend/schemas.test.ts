import { describe, expect, it } from "vitest";
import { MAX_PLAYERS, SCHEMA_VERSION } from "@/lib/contracts";
import {
  DEMO_CONSENSUS_PACKAGE,
  DEMO_GAME_PACKAGE,
} from "@/lib/ai/fixtures/demo";
import {
  parseConsensusPackage,
  parseGamePackage,
  SchemaError,
} from "@/lib/ai/schemas";

/** The fixture must pass exactly the schema live model output passes. */
describe("fixture conformance", () => {
  it("accepts the demo game package", () => {
    const parsed = parseGamePackage(DEMO_GAME_PACKAGE, SCHEMA_VERSION, {
      minCards: 6,
    });
    expect(parsed.cards).toHaveLength(6);
    expect(parsed.reasons).toHaveLength(5);
    expect(parsed.schemaVersion).toBe(SCHEMA_VERSION);
  });

  it("accepts the demo consensus package", () => {
    const parsed = parseConsensusPackage(DEMO_CONSENSUS_PACKAGE, SCHEMA_VERSION);
    expect(parsed.statements.length).toBeGreaterThan(0);
  });

  it("gives every claim an evidence boundary in both languages", () => {
    for (const claim of DEMO_GAME_PACKAGE.claims) {
      expect(claim.evidenceBoundary["zh-TW"].length).toBeGreaterThan(0);
      expect(claim.evidenceBoundary.en.length).toBeGreaterThan(0);
    }
  });

  it("offers a reason for not knowing the subject", () => {
    expect(DEMO_GAME_PACKAGE.reasons.some((r) => r.id === "uncertain")).toBe(true);
  });

  it("supplies one distinct card per supported player", () => {
    expect(DEMO_GAME_PACKAGE.cards.length).toBeGreaterThanOrEqual(MAX_PLAYERS);
  });
});

describe("strict rejection of malformed output", () => {
  it("rejects a missing language", () => {
    expect(() =>
      parseGamePackage(
        { ...DEMO_GAME_PACKAGE, briefing: { en: "only english" } },
        SCHEMA_VERSION,
      ),
    ).toThrow(SchemaError);
  });

  it("rejects unexpected fields rather than passing them through", () => {
    expect(() =>
      parseGamePackage(
        { ...DEMO_GAME_PACKAGE, verdict: "false" },
        SCHEMA_VERSION,
      ),
    ).toThrow(/unexpected field/);
  });

  it("rejects an unknown consensus category", () => {
    expect(() =>
      parseConsensusPackage(
        {
          statements: [
            {
              id: "x",
              text: { "zh-TW": "一", en: "one" },
              category: "the_truth",
            },
          ],
        },
        SCHEMA_VERSION,
      ),
    ).toThrow(SchemaError);
  });

  it("rejects duplicate ids", () => {
    expect(() =>
      parseGamePackage(
        {
          ...DEMO_GAME_PACKAGE,
          claims: [DEMO_GAME_PACKAGE.claims[0], DEMO_GAME_PACKAGE.claims[0]],
        },
        SCHEMA_VERSION,
      ),
    ).toThrow(/duplicate ids/);
  });

  it("rejects an empty string as display text", () => {
    expect(() =>
      parseGamePackage(
        { ...DEMO_GAME_PACKAGE, briefing: { "zh-TW": "  ", en: "x" } },
        SCHEMA_VERSION,
      ),
    ).toThrow(SchemaError);
  });
});
