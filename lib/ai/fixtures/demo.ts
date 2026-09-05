/**
 * Deterministic bilingual fixture / 雙語固定資料 (BUILD_PLAN S0, S1)
 *
 * Returns the same package for any input so the frontend can be built and
 * tested with no AI credentials. The material, voice and reason IDs match the
 * frontend preview fixture (`lib/client/preview.ts`) so screen copy stays
 * coherent when the UI is wired to the real API.
 *
 * 素材、語氣與理由 ID 與前端預覽一致，接上真實 API 後畫面文案仍然連貫。
 */

import type { ConsensusPackage, GamePackage } from "@/lib/contracts";
import { SCHEMA_VERSION } from "@/lib/contracts";

/**
 * The host pastes one original text, and the product preserves it verbatim
 * (§21), so the demo material is a single language — not a bilingual pair.
 */
export const DEMO_SOURCE_TEXT =
  "「某公司試行每週工作四天後，員工說自己更專注，公司也說產出沒有下降。這證明所有公司都應該立刻改成四天工作制。」";

export const DEMO_HOST_QUESTION = "四天工作制，真的會讓工作更有效率嗎？";

export const DEMO_GAME_PACKAGE: GamePackage = {
  schemaVersion: SCHEMA_VERSION,
  briefing: {
    "zh-TW":
      "這段文字從一家公司的經驗，推論所有公司都適合縮短工時。它提到了專注與產出，卻沒有交代樣本、試行時間，或如何衡量成效。這是虛構的討論素材，不是真實研究。以下的問題都不需要專業知識也能回答。",
    en:
      "The post takes one company's experience and applies it to every company. It mentions focus and output, but does not describe the sample, trial length, or how results were measured. This is a fictional discussion prompt, not a real study. None of the questions below need expertise to answer.",
  },
  claims: [
    {
      id: "claim_output",
      text: {
        "zh-TW": "這家公司縮短工時後，產出沒有下降。",
        en: "Output did not fall at this company after it shortened hours.",
      },
      evidenceBoundary: {
        "zh-TW":
          "這是公司自己的說法。訊息沒有交代衡量方式、試行多久，或比較的對象是誰。",
        en:
          "This is the company's own statement. No measurement method, trial length, or comparison group is given.",
      },
    },
    {
      id: "claim_focus",
      text: {
        "zh-TW": "員工覺得自己更專注。",
        en: "Employees said they felt more focused.",
      },
      evidenceBoundary: {
        "zh-TW": "屬於員工自述的感受，訊息未搭配任何獨立量測。",
        en: "A self-reported feeling, with no independent measurement alongside it.",
      },
    },
    {
      id: "claim_generalise",
      text: {
        "zh-TW": "因此所有公司都應該立刻改成四天工作制。",
        en: "Therefore every company should switch to a four-day week immediately.",
      },
      evidenceBoundary: {
        "zh-TW":
          "這是從單一案例推到全體的結論。訊息沒有提供其他產業或不同規模公司的資料。",
        en:
          "This generalises from a single case. No data from other industries or company sizes is offered.",
      },
    },
  ],
  // One card per player, six distinct angles, each answerable without expertise.
  cards: [
    {
      id: "card_missing",
      perspective: {
        "zh-TW": "找找看，沒被說出來的事。",
        en: "Look for what was left unsaid.",
      },
      prompt: {
        "zh-TW":
          "如果這家公司本來就能彈性排班，結果還能套用在醫院或餐廳嗎？你還想知道什麼？",
        en: "If this company already offered flexible schedules, would its results apply to a hospital or restaurant? What else would you want to know?",
      },
    },
    {
      id: "card_source",
      perspective: { "zh-TW": "這是誰說的？", en: "Who is telling us this?" },
      prompt: {
        "zh-TW": "哪些部分是公司自己說的，哪些是別人查證過的？這個差別重要嗎？",
        en: "Which parts are the company's own words, and which were checked by someone else? Does that difference matter?",
      },
    },
    {
      id: "card_numbers",
      perspective: { "zh-TW": "數字是怎麼來的？", en: "Where do the numbers come from?" },
      prompt: {
        "zh-TW": "「產出沒有下降」是怎麼量出來的？換一種算法，結論會不會不一樣？",
        en: "How was “output didn't fall” actually measured? Would a different measure change the conclusion?",
      },
    },
    {
      id: "card_leap",
      perspective: { "zh-TW": "中間跳過了什麼？", en: "What got skipped in between?" },
      prompt: {
        "zh-TW":
          "從「一家公司做得不錯」到「所有公司都該立刻改」，中間少了哪幾步？",
        en: "Between “one company did fine” and “every company should switch now,” which steps are missing?",
      },
    },
    {
      id: "card_counter",
      perspective: { "zh-TW": "什麼情況會不成立？", en: "When would this fall apart?" },
      prompt: {
        "zh-TW": "你能想到一種工作，少上一天班反而會出問題嗎？那代表什麼？",
        en: "Can you think of a job where losing a day would cause problems? What would that tell you?",
      },
    },
    {
      id: "card_people",
      perspective: { "zh-TW": "別忘了人的感受。", en: "Don't forget how it feels." },
      prompt: {
        "zh-TW": "就算效率沒有變，員工更喜歡這樣上班，這件事該不該算進來？",
        en: "Even if productivity is unchanged, employees preferring it — should that count?",
      },
    },
  ],
  // Reason IDs are shared with the frontend preview and never translated.
  reasons: [
    { id: "sample", label: { "zh-TW": "樣本太少", en: "Sample is too small" } },
    {
      id: "measurement",
      label: { "zh-TW": "成效怎麼算？", en: "How was output measured?" },
    },
    { id: "context", label: { "zh-TW": "產業情境不同", en: "Industries differ" } },
    {
      id: "wellbeing",
      label: { "zh-TW": "員工感受也重要", en: "Wellbeing matters too" },
    },
    {
      id: "uncertain",
      label: { "zh-TW": "資訊不足／不熟悉", en: "Not enough information" },
    },
  ],
};

export const DEMO_CONSENSUS_PACKAGE: ConsensusPackage = {
  schemaVersion: SCHEMA_VERSION,
  statements: [
    {
      id: "stmt_no_method",
      text: {
        "zh-TW": "這則素材沒有交代樣本大小、試行時間，或成效是怎麼衡量的。",
        en: "The material doesn't give the sample size, the trial length, or how results were measured.",
      },
      category: "candidate_agreement",
    },
    {
      id: "stmt_one_case",
      text: {
        "zh-TW": "一家公司的經驗，還不足以直接推論到所有產業。",
        en: "One company's experience isn't enough to generalise to every industry.",
      },
      category: "candidate_agreement",
    },
    {
      id: "stmt_wellbeing",
      text: {
        "zh-TW": "「員工的感受」該不該算成效的一部分，我們的看法並不相同。",
        en: "We don't agree on whether how employees feel should count as a result.",
      },
      category: "disagreement",
    },
    {
      id: "stmt_missing_data",
      text: {
        "zh-TW": "我們還缺少不同產業、不同規模公司的比較資料。",
        en: "We're still missing comparable data from other industries and company sizes.",
      },
      category: "missing_evidence",
    },
    {
      id: "stmt_long_term",
      text: {
        "zh-TW": "縮短工時長期會不會影響產出，我們仍然不確定。",
        en: "We remain uncertain whether shorter hours affect output over the long run.",
      },
      category: "uncertainty",
    },
  ],
};
