import { describe, expect, it } from "vitest";
import { LANGUAGES } from "@/lib/contracts";
import { findSample, SAMPLES } from "@/lib/game/samples";
import { looksLikeBareLink } from "@/lib/client/game-ui";

/**
 * Sample material is the demo path: a host with only a link in their clipboard
 * still has something to play. These assert the properties that make a sample
 * usable, not the wording.
 */

describe("sample material", () => {
  it("offers enough variety for a table to replay", () => {
    expect(SAMPLES.length).toBeGreaterThanOrEqual(4);
    expect(new Set(SAMPLES.map((sample) => sample.id)).size).toBe(SAMPLES.length);
  });

  it("is fully bilingual", () => {
    for (const sample of SAMPLES) {
      for (const language of LANGUAGES) {
        expect(sample.label[language].length, `${sample.id} label`).toBeGreaterThan(0);
        expect(sample.text[language].length, `${sample.id} text`).toBeGreaterThan(20);
        expect(sample.question[language].length, `${sample.id} question`).toBeGreaterThan(0);
      }
    }
  });

  it("would never be rejected by the bare-link guard", () => {
    // A sample that tripped our own validation could not be submitted.
    for (const sample of SAMPLES) {
      for (const language of LANGUAGES) {
        expect(looksLikeBareLink(sample.text[language]), sample.id).toBe(false);
      }
    }
  });

  it("gives each sample something different to go wrong", () => {
    // Distinct material, so the six thinking cards aren't asking the same
    // question of the same flaw every round.
    const texts = SAMPLES.map((sample) => sample.text["zh-TW"]);
    expect(new Set(texts).size).toBe(texts.length);
  });

  it("looks up a sample by id", () => {
    expect(findSample(SAMPLES[0].id)?.id).toBe(SAMPLES[0].id);
    expect(findSample("no_such_sample")).toBeUndefined();
  });
});
