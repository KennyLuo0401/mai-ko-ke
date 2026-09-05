import { describe, expect, it } from "vitest";
import { openAiAdapter } from "@/lib/ai/openaiAdapter";
import { LANGUAGES } from "@/lib/contracts";

/**
 * Live OpenAI adapter / 真實 AI 介面 (S2)
 *
 * Exercises the adapter directly rather than through the store, so the rest of
 * the suite stays deterministic and free. Skipped without a key.
 *
 * What matters here is not prose quality but the contract: strict-schema output,
 * six distinct angles, bilingual everywhere, an evidence boundary on every
 * claim — and that the result is about the submitted text rather than the
 * fixture. 重點是介面契約，不是文采。
 */

const configured = Boolean(process.env.OPENAI_API_KEY);

// Deliberately not the fixture topic, so fixture output could never pass.
const POST =
  "有人說：「台北捷運票價十年沒漲，代表營運一定很賺錢，應該立刻全面免費。」";
const QUESTION = "這個推論站得住腳嗎？";

describe.skipIf(!configured)("openai adapter", () => {
  it("briefs arbitrary material into a schema-valid package", async () => {
    const pkg = await openAiAdapter.analyzeMaterial({
      sourceText: POST,
      hostQuestion: QUESTION,
      cardCount: 6,
      languages: [...LANGUAGES],
    });

    // Bilingual throughout.
    expect(pkg.briefing["zh-TW"].length).toBeGreaterThan(10);
    expect(pkg.briefing.en.length).toBeGreaterThan(10);

    // It is about THIS post, not the fixture's four-day workweek.
    const zh = pkg.briefing["zh-TW"];
    expect(zh).toMatch(/捷運|票價|免費/);
    expect(zh).not.toMatch(/四天|工作制/);

    // Claims each carry how far the evidence actually reaches.
    expect(pkg.claims.length).toBeGreaterThanOrEqual(2);
    for (const claim of pkg.claims) {
      expect(claim.evidenceBoundary["zh-TW"].length).toBeGreaterThan(0);
      expect(claim.evidenceBoundary.en.length).toBeGreaterThan(0);
    }

    // One distinct angle per player.
    expect(pkg.cards).toHaveLength(6);
    expect(new Set(pkg.cards.map((card) => card.id)).size).toBe(6);
    for (const card of pkg.cards) {
      expect(card.perspective["zh-TW"].length).toBeGreaterThan(0);
      expect(card.prompt.en.length).toBeGreaterThan(0);
    }

    // Reasons are pickable option labels, and ids stay language-neutral.
    expect(pkg.reasons.length).toBeGreaterThanOrEqual(4);
    for (const reason of pkg.reasons) {
      expect(reason.id).toMatch(/^[a-z0-9_-]+$/);
    }
  });

  it("drafts a consensus package across all four categories", async () => {
    const result = await openAiAdapter.draftConsensus({
      sourceText: POST,
      hostQuestion: QUESTION,
      claims: [
        {
          id: "claim_profit",
          text: { "zh-TW": "捷運營運一定很賺錢。", en: "The metro must be very profitable." },
          evidenceBoundary: {
            "zh-TW": "訊息只提到票價未調整，沒有提供財報。",
            en: "The message only notes fares haven't risen; no financials are given.",
          },
        },
      ],
      answers: [
        {
          pseudonym: "P1",
          initialChoice: "no",
          reactionChoice: "weakens",
          reasonIds: ["no_data"],
          finalChoice: "no",
        },
        {
          pseudonym: "P2",
          initialChoice: "uncertain",
          reactionChoice: "unchanged",
          reasonIds: ["unfamiliar"],
          finalChoice: "uncertain",
          comment: "想看實際財報",
        },
      ],
      languages: [...LANGUAGES],
    });

    expect(result.statements.length).toBeGreaterThan(0);
    for (const statement of result.statements) {
      expect(statement.text["zh-TW"].length).toBeGreaterThan(0);
      expect(statement.text.en.length).toBeGreaterThan(0);
      expect([
        "candidate_agreement",
        "disagreement",
        "missing_evidence",
        "uncertainty",
      ]).toContain(statement.category);
    }
    // Ids stay unique so votes can be keyed on them.
    expect(new Set(result.statements.map((s) => s.id)).size).toBe(result.statements.length);
  });

  it("closes the round with prose, not a list", async () => {
    const result = await openAiAdapter.summariseOutcome({
      sourceText: POST,
      hostQuestion: QUESTION,
      statements: [
        {
          text: {
            "zh-TW": "素材沒有提供任何財報或營運數據。",
            en: "The material provides no financial or operating data.",
          },
          section: "we_agree",
          tally: { agree: 2, needs_revision: 0, disagree: 0 },
        },
        {
          text: {
            "zh-TW": "票價是否該調整，我們的看法不同。",
            en: "We differ on whether fares should change.",
          },
          section: "we_differ",
          tally: { agree: 1, needs_revision: 0, disagree: 1 },
        },
      ],
      answers: [
        { pseudonym: "P1", initialChoice: "no", finalChoice: "no", changeChoice: "unchanged" },
        { pseudonym: "P2", initialChoice: "uncertain", finalChoice: "uncertain", changeChoice: "uncertain" },
      ],
      languages: [...LANGUAGES],
    });

    for (const language of LANGUAGES) {
      const prose = result.summary[language];
      expect(prose.length).toBeGreaterThan(60);
      // Prose, not a rendered list: no bullets, no numbered lines, no headings.
      expect(prose).not.toMatch(/^\s*[-*•]\s/m);
      expect(prose).not.toMatch(/^\s*\d+[.)]\s/m);
      expect(prose).not.toMatch(/^#{1,6}\s/m);
    }
  });

  it("fails loudly on an unusable model rather than inventing data", async () => {
    const original = process.env.OPENAI_MODEL;
    process.env.OPENAI_MODEL = "model-that-does-not-exist";
    try {
      await expect(
        openAiAdapter.analyzeMaterial({
          sourceText: POST,
          hostQuestion: QUESTION,
          cardCount: 6,
          languages: [...LANGUAGES],
        }),
      ).rejects.toThrow();
    } finally {
      process.env.OPENAI_MODEL = original;
    }
  });
});

describe.skipIf(configured)("openai adapter (skipped)", () => {
  it("needs OPENAI_API_KEY in .env.local", () => {
    expect(configured).toBe(false);
  });
});
