/**
 * Versioned JSON Schemas + strict validators / 具版本的 JSON Schema 與嚴格驗證
 *
 * BUILD_PLAN §9 and §21: both adapter outputs must pass strict, versioned
 * schemas. Malformed model output is an explicit failure, never data we carry
 * forward. The fixture packages must pass the same validators.
 *
 * 模型輸出不符 schema 時必須明確失敗；固定資料也必須通過同一套驗證。
 */

import type {
  ConsensusPackage,
  GamePackage,
  Language,
  LocalizedText,
} from "@/lib/contracts";
import { CONSENSUS_CATEGORIES, LANGUAGES } from "@/lib/contracts";

export class SchemaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SchemaError";
  }
}

/* -------------------------------------------------------------------------- */
/* JSON Schema documents (also sent to OpenAI Structured Outputs)             */
/* -------------------------------------------------------------------------- */

const localizedTextSchema = {
  type: "object",
  properties: {
    "zh-TW": { type: "string", minLength: 1 },
    en: { type: "string", minLength: 1 },
  },
  required: ["zh-TW", "en"],
  additionalProperties: false,
} as const;

export const GAME_PACKAGE_JSON_SCHEMA = {
  type: "object",
  properties: {
    briefing: localizedTextSchema,
    claims: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string", minLength: 1 },
          text: localizedTextSchema,
          evidenceBoundary: localizedTextSchema,
        },
        required: ["id", "text", "evidenceBoundary"],
        additionalProperties: false,
      },
    },
    cards: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string", minLength: 1 },
          perspective: localizedTextSchema,
          prompt: localizedTextSchema,
        },
        required: ["id", "perspective", "prompt"],
        additionalProperties: false,
      },
    },
    reasons: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string", minLength: 1 },
          label: localizedTextSchema,
        },
        required: ["id", "label"],
        additionalProperties: false,
      },
    },
  },
  required: ["briefing", "claims", "cards", "reasons"],
  additionalProperties: false,
} as const;

export const CONSENSUS_PACKAGE_JSON_SCHEMA = {
  type: "object",
  properties: {
    statements: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string", minLength: 1 },
          text: localizedTextSchema,
          category: { type: "string", enum: [...CONSENSUS_CATEGORIES] },
        },
        required: ["id", "text", "category"],
        additionalProperties: false,
      },
    },
  },
  required: ["statements"],
  additionalProperties: false,
} as const;

export const OUTCOME_SUMMARY_JSON_SCHEMA = {
  type: "object",
  properties: { summary: localizedTextSchema },
  required: ["summary"],
  additionalProperties: false,
} as const;

/* -------------------------------------------------------------------------- */
/* Runtime validators / 執行期驗證                                            */
/* -------------------------------------------------------------------------- */

function assertObject(value: unknown, path: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new SchemaError(`${path} must be an object`);
  }
  return value as Record<string, unknown>;
}

function assertNoExtraKeys(
  value: Record<string, unknown>,
  allowed: string[],
  path: string,
): void {
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key)) {
      throw new SchemaError(`${path} has unexpected field "${key}"`);
    }
  }
}

function assertLocalizedText(value: unknown, path: string): LocalizedText {
  const obj = assertObject(value, path);
  assertNoExtraKeys(obj, [...LANGUAGES], path);
  for (const lang of LANGUAGES as Language[]) {
    const text = obj[lang];
    if (typeof text !== "string" || text.trim().length === 0) {
      throw new SchemaError(`${path}.${lang} must be a non-empty string`);
    }
  }
  return { "zh-TW": String(obj["zh-TW"]), en: String(obj.en) };
}

function assertIdString(value: unknown, path: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new SchemaError(`${path} must be a non-empty string`);
  }
  return value;
}

function assertArray(value: unknown, path: string, min: number): unknown[] {
  if (!Array.isArray(value)) throw new SchemaError(`${path} must be an array`);
  if (value.length < min) {
    throw new SchemaError(`${path} must contain at least ${min} item(s)`);
  }
  return value;
}

function assertUniqueIds(ids: string[], path: string): void {
  if (new Set(ids).size !== ids.length) {
    throw new SchemaError(`${path} contains duplicate ids`);
  }
}

/**
 * Validate an untrusted GamePackage body (model output or fixture).
 * `schemaVersion` is stamped by us, not by the model.
 */
export function parseGamePackage(
  raw: unknown,
  schemaVersion: string,
  opts: { minCards: number } = { minCards: 1 },
): GamePackage {
  const obj = assertObject(raw, "GamePackage");
  assertNoExtraKeys(
    obj,
    ["schemaVersion", "briefing", "claims", "cards", "reasons"],
    "GamePackage",
  );

  const briefing = assertLocalizedText(obj.briefing, "GamePackage.briefing");

  const claims = assertArray(obj.claims, "GamePackage.claims", 1).map(
    (item, i) => {
      const c = assertObject(item, `claims[${i}]`);
      assertNoExtraKeys(c, ["id", "text", "evidenceBoundary"], `claims[${i}]`);
      return {
        id: assertIdString(c.id, `claims[${i}].id`),
        text: assertLocalizedText(c.text, `claims[${i}].text`),
        evidenceBoundary: assertLocalizedText(
          c.evidenceBoundary,
          `claims[${i}].evidenceBoundary`,
        ),
      };
    },
  );
  assertUniqueIds(
    claims.map((c) => c.id),
    "GamePackage.claims",
  );

  const cards = assertArray(
    obj.cards,
    "GamePackage.cards",
    opts.minCards,
  ).map((item, i) => {
    const c = assertObject(item, `cards[${i}]`);
    assertNoExtraKeys(c, ["id", "perspective", "prompt"], `cards[${i}]`);
    return {
      id: assertIdString(c.id, `cards[${i}].id`),
      perspective: assertLocalizedText(c.perspective, `cards[${i}].perspective`),
      prompt: assertLocalizedText(c.prompt, `cards[${i}].prompt`),
    };
  });
  assertUniqueIds(
    cards.map((c) => c.id),
    "GamePackage.cards",
  );

  const reasons = assertArray(obj.reasons, "GamePackage.reasons", 2).map(
    (item, i) => {
      const r = assertObject(item, `reasons[${i}]`);
      assertNoExtraKeys(r, ["id", "label"], `reasons[${i}]`);
      return {
        id: assertIdString(r.id, `reasons[${i}].id`),
        label: assertLocalizedText(r.label, `reasons[${i}].label`),
      };
    },
  );
  assertUniqueIds(
    reasons.map((r) => r.id),
    "GamePackage.reasons",
  );

  return { schemaVersion, briefing, claims, cards, reasons };
}

/** Validate an untrusted outcome summary (model output or fixture). */
export function parseOutcomeSummary(raw: unknown): { summary: LocalizedText } {
  const obj = assertObject(raw, "OutcomeSummary");
  assertNoExtraKeys(obj, ["summary"], "OutcomeSummary");
  return { summary: assertLocalizedText(obj.summary, "OutcomeSummary.summary") };
}

/** Validate an untrusted ConsensusPackage body (model output or fixture). */
export function parseConsensusPackage(
  raw: unknown,
  schemaVersion: string,
): ConsensusPackage {
  const obj = assertObject(raw, "ConsensusPackage");
  assertNoExtraKeys(obj, ["schemaVersion", "statements"], "ConsensusPackage");

  const statements = assertArray(
    obj.statements,
    "ConsensusPackage.statements",
    1,
  ).map((item, i) => {
    const s = assertObject(item, `statements[${i}]`);
    assertNoExtraKeys(s, ["id", "text", "category"], `statements[${i}]`);
    const category = s.category;
    if (
      typeof category !== "string" ||
      !CONSENSUS_CATEGORIES.includes(category as never)
    ) {
      throw new SchemaError(
        `statements[${i}].category must be one of ${CONSENSUS_CATEGORIES.join(", ")}`,
      );
    }
    return {
      id: assertIdString(s.id, `statements[${i}].id`),
      text: assertLocalizedText(s.text, `statements[${i}].text`),
      category: category as ConsensusPackage["statements"][number]["category"],
    };
  });
  assertUniqueIds(
    statements.map((s) => s.id),
    "ConsensusPackage.statements",
  );

  return { schemaVersion, statements };
}
