import { describe, expect, it } from "vitest";
import {
  changes,
  choices,
  decisions,
  errorMessage,
  looksLikeBareLink,
  phaseTitles,
  reactions,
  sectionLabels,
  stepIndex,
  steps,
  toggleReason,
  validCard,
  validateJoin,
} from "@/lib/client/game-ui";
import { GAME_STATES } from "@/lib/contracts";
import { DEMO_GAME_PACKAGE } from "@/lib/ai/fixtures/demo";

/** Reason ids come from the room's package, never from translated labels. */
const REASONS = DEMO_GAME_PACKAGE.reasons.map((reason) => reason.id);

describe("join input", () => {
  it("requires a nickname and six digits before spending a request", () => {
    expect(validateJoin("482916", "  ")).toBe("nickname");
    expect(validateJoin("482916", "x".repeat(21))).toBe("nickname");
    expect(validateJoin("48291", "Kenny")).toBe("format");
    expect(validateJoin("abcdef", "Kenny")).toBe("format");
    expect(validateJoin("482916", " Kenny ")).toBeNull();
  });

  it("leaves whether the room exists to the server", () => {
    // Any well-formed code passes locally; the API answers room_code_not_found.
    expect(validateJoin("123456", "Kenny")).toBeNull();
  });
});

describe("material input", () => {
  it("catches material that is only a link", () => {
    // Nothing fetches URLs, so a bare link leaves the group nothing to read.
    expect(looksLikeBareLink("https://x.com/someone/status/123456")).toBe(true);
    expect(looksLikeBareLink("  https://example.com/a/b?c=d  ")).toBe(true);
    expect(looksLikeBareLink("看這個 https://x.com/i/status/1")).toBe(true);
  });

  it("accepts a link that comes with the actual text", () => {
    expect(
      looksLikeBareLink(
        "朋友傳來這則：「早上空腹喝檸檬水可以排毒、燃脂，還能治百病。」出處 https://example.com/post",
      ),
    ).toBe(false);
  });

  it("leaves link-free material alone", () => {
    expect(looksLikeBareLink("某公司試行每週工作四天後，員工說自己更專注。")).toBe(false);
    expect(looksLikeBareLink("")).toBe(false);
  });
});

describe("card answer constraints", () => {
  it("caps reasons at two and permits deselection and reselection", () => {
    const two = toggleReason(toggleReason([], "sample", REASONS), "context", REASONS);
    expect(two).toEqual(["sample", "context"]);
    expect(toggleReason(two, "wellbeing", REASONS)).toEqual(two);
    expect(toggleReason(toggleReason(two, "sample", REASONS), "wellbeing", REASONS)).toEqual([
      "context",
      "wellbeing",
    ]);
    expect(toggleReason([], "unknown", REASONS)).toEqual([]);
  });

  it("requires a known reaction and one or two distinct known reasons", () => {
    expect(validCard("", ["sample"], REASONS)).toBe(false);
    expect(validCard("invented", ["sample"], REASONS)).toBe(false);
    expect(validCard("uncertain", [], REASONS)).toBe(false);
    expect(validCard("uncertain", ["unknown"], REASONS)).toBe(false);
    expect(validCard("uncertain", ["sample", "sample"], REASONS)).toBe(false);
    expect(validCard("uncertain", ["sample", "context", "wellbeing"], REASONS)).toBe(false);
    expect(validCard("uncertain", ["uncertain"], REASONS)).toBe(true);
    expect(validCard("weakens", ["sample", "context"], REASONS)).toBe(true);
  });
});

describe("bilingual copy", () => {
  it("always offers an uncertainty option", () => {
    expect(reactions.some((option) => option.id === "uncertain")).toBe(true);
    expect(choices.some((option) => option.id === "uncertain")).toBe(true);
    expect(changes.some((option) => option.id === "uncertain")).toBe(true);
    expect(DEMO_GAME_PACKAGE.reasons.some((option) => option.id === "uncertain")).toBe(true);
  });

  it("gives every option and label both languages", () => {
    const labels = [
      ...reactions.map((o) => o.label),
      ...choices.map((o) => o.label),
      ...choices.map((o) => o.detail),
      ...changes.map((o) => o.label),
      ...decisions.map((o) => o.label),
      ...steps.map((s) => s.label),
      ...Object.values(sectionLabels),
      ...Object.values(phaseTitles),
    ];
    for (const label of labels) {
      expect(label["zh-TW"].length).toBeGreaterThan(0);
      expect(label.en.length).toBeGreaterThan(0);
    }
  });

  it("localizes every error code in both languages", () => {
    for (const code of ["room_code_not_found", "late_join_rejected", "duplicate_answer"] as const) {
      expect(errorMessage("zh-TW", code)).not.toBe(errorMessage("en", code));
      expect(errorMessage("en", code).length).toBeGreaterThan(0);
    }
  });
});

describe("progress rail", () => {
  it("gives every server state a step, collapsing the two transient ones", () => {
    for (const state of GAME_STATES) {
      const index = stepIndex(state);
      expect(index).toBeGreaterThanOrEqual(0);
      expect(index).toBeLessThan(steps.length);
    }
    expect(stepIndex("MATERIAL_SUBMITTED")).toBe(stepIndex("BRIEFING_READY"));
    expect(stepIndex("READY_TO_REVEAL")).toBe(stepIndex("REVEALED"));
  });

  it("moves forward as the game advances", () => {
    expect(stepIndex("LOBBY")).toBeLessThan(stepIndex("INITIAL_VOTE"));
    expect(stepIndex("INITIAL_VOTE")).toBeLessThan(stepIndex("REVEALED"));
    expect(stepIndex("REVEALED")).toBeLessThan(stepIndex("COMPLETED"));
  });
});
