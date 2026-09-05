import { describe, expect, it } from "vitest";
import { demoCode, fixture, reactions, toggleReason, validCard, validateJoin } from "../../lib/client/preview";

describe("preview room input", () => {
  it("requires a nickname and six digits before accepting the fixture room", () => {
    expect(validateJoin(demoCode, "  ")).toBe("nickname");
    expect(validateJoin("48291", "Kenny")).toBe("format");
    expect(validateJoin("abcdef", "Kenny")).toBe("format");
    expect(validateJoin("123456", "Kenny")).toBe("room");
    expect(validateJoin(demoCode, " Kenny ")).toBeNull();
  });
});

describe("card answer constraints", () => {
  it("caps reasons at two and permits deselection and reselection", () => {
    const two = toggleReason(toggleReason([], "sample"), "context");
    expect(two).toEqual(["sample", "context"]);
    expect(toggleReason(two, "wellbeing")).toEqual(two);
    expect(toggleReason(toggleReason(two, "sample"), "wellbeing")).toEqual(["context", "wellbeing"]);
    expect(toggleReason([], "unknown")).toEqual([]);
  });
  it("requires a known reaction and one or two distinct known reasons", () => {
    expect(validCard("", ["sample"])).toBe(false);
    expect(validCard("invented", ["sample"])).toBe(false);
    expect(validCard("uncertain", [])).toBe(false);
    expect(validCard("uncertain", ["unknown"])).toBe(false);
    expect(validCard("uncertain", ["sample", "sample"])).toBe(false);
    expect(validCard("uncertain", ["sample", "context", "wellbeing"])).toBe(false);
    expect(validCard("uncertain", ["uncertain"])).toBe(true);
    expect(validCard("weakens", ["sample", "context"])).toBe(true);
  });
  it("provides uncertainty and bilingual content for all fixture options", () => {
    expect(reactions.some((option) => option.id === "uncertain")).toBe(true);
    expect(fixture.reasons.some((option) => option.id === "uncertain")).toBe(true);
    for (const option of [...reactions, ...fixture.reasons]) {
      expect(option.label["zh-TW"].length).toBeGreaterThan(0);
      expect(option.label.en.length).toBeGreaterThan(0);
    }
  });
});
