/**
 * Deterministic fixture adapter / 固定資料 adapter (S1)
 *
 * Same input → same output, no credentials, no network. This is the adapter the
 * game runs on until the S1 deterministic end-to-end flow passes (BUILD_PLAN
 * S1 stop point). Its output is validated by the same schemas as live output.
 */

import type {
  AnalysisAdapter,
  AnalyzeMaterialInput,
  ConsensusPackage,
  GamePackage,
  OutcomeSummary,
} from "@/lib/contracts";
import { SCHEMA_VERSION } from "@/lib/contracts";
import {
  DEMO_CONSENSUS_PACKAGE,
  DEMO_GAME_PACKAGE,
} from "@/lib/ai/fixtures/demo";
import {
  parseConsensusPackage,
  parseGamePackage,
  parseOutcomeSummary,
} from "@/lib/ai/schemas";

export const fixtureAdapter: AnalysisAdapter = {
  async analyzeMaterial(input: AnalyzeMaterialInput): Promise<GamePackage> {
    // Validated on the way out so the fixture can never drift from the schema.
    const pkg = parseGamePackage(
      { ...DEMO_GAME_PACKAGE, schemaVersion: undefined },
      SCHEMA_VERSION,
      { minCards: Math.min(input.cardCount, DEMO_GAME_PACKAGE.cards.length) },
    );
    return pkg;
  },

  async summariseOutcome(): Promise<OutcomeSummary> {
    return parseOutcomeSummary({
      summary: {
        "zh-TW":
          "這一局大家都同意：素材本身沒有交代樣本、時間與衡量方式，因此不足以支撐「所有公司都該立刻改」這個結論。仍然分歧的是，員工的感受該不該算進成效裡——這比較像價值取捨，不是資料能解決的問題。要再往前一步，需要的是不同產業、不同規模公司的比較資料。",
        en: "This table agreed that the material never gives its sample, trial length or measurement, so it cannot carry the conclusion that every company should switch. What you still differ on is whether employees' own experience counts as a result — which reads as a values question rather than one more data could settle. To move further you would need comparable figures from other industries and company sizes.",
      },
    });
  },

  // The fixture ignores the players' answers by design: same input, same output.
  async draftConsensus(): Promise<ConsensusPackage> {
    return parseConsensusPackage(
      { ...DEMO_CONSENSUS_PACKAGE, schemaVersion: undefined },
      SCHEMA_VERSION,
    );
  },
};
