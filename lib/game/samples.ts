/**
 * Sample material / 示範素材
 *
 * Nothing in this app fetches URLs (BUILD_PLAN §3, §14), so a host arriving
 * with a link has nothing to play with. These are ready-made posts they can
 * load in one click — the demo path that does not depend on someone typing out
 * a paragraph in front of an audience.
 *
 * Each one is written to fail in a *different* way, so the six thinking cards
 * have something to bite on: a missing source, a causal leap, a number with no
 * base rate, one case generalised, conspiracy framing, a misread poll. None
 * name a real person or organisation, and none take a political side.
 *
 * 每則素材各自有不同的推論問題，讓六張思考卡都有著力點；不指涉真實人物或政治立場。
 */

import type { LocalizedText } from "@/lib/contracts";

export type Sample = {
  id: string;
  /** Short chip label. */
  label: LocalizedText;
  /** The post itself. Whichever language the host picks is stored verbatim. */
  text: LocalizedText;
  /** What the host is asking the table. */
  question: LocalizedText;
};

export const SAMPLES: Sample[] = [
  {
    id: "lemon_water",
    label: { "zh-TW": "🍋 排毒偏方", en: "🍋 Detox cure" },
    text: {
      "zh-TW":
        "朋友傳來：「早上空腹喝檸檬水可以排毒、燃脂，還能治百病，醫生都不敢講。」",
      en: "A friend forwarded this: “Drinking lemon water on an empty stomach detoxes you, burns fat, and cures almost anything — doctors just won't say it.”",
    },
    question: {
      "zh-TW": "這個說法可信嗎？",
      en: "Is this worth believing?",
    },
  },
  {
    id: "night_market",
    label: { "zh-TW": "🏮 夜市變差", en: "🏮 Night markets" },
    text: {
      "zh-TW":
        "網友說：「夜市生意變差，一定是因為年輕人都不出門了，跟物價完全沒關係。」",
      en: "Someone posted: “Night market business is down. It's obviously because young people never go out any more — nothing to do with prices.”",
    },
    question: {
      "zh-TW": "這個因果推論合理嗎？",
      en: "Does that cause-and-effect hold up?",
    },
  },
  {
    id: "four_day_week",
    label: { "zh-TW": "🗓️ 四天工作制", en: "🗓️ Four-day week" },
    text: {
      "zh-TW":
        "「某公司試行每週工作四天後，員工說自己更專注，公司也說產出沒有下降。這證明所有公司都應該立刻改成四天工作制。」",
      en: "“After one company tried a four-day week, employees reported better focus and the company said output hadn't fallen. This proves every company should switch immediately.”",
    },
    question: {
      "zh-TW": "四天工作制，真的會讓工作更有效率嗎？",
      en: "Would a four-day week really make us more productive?",
    },
  },
  {
    id: "scam_number",
    label: { "zh-TW": "📈 詐騙數字", en: "📈 Scam figure" },
    text: {
      "zh-TW":
        "看到一則貼文：「今年詐騙案件比去年多了 300 件，代表治安正在快速惡化，政府完全沒在做事。」",
      en: "A post claimed: “There were 300 more fraud cases than last year, which shows public safety is collapsing and the government is doing nothing.”",
    },
    question: {
      "zh-TW": "這個數字能支持這個結論嗎？",
      en: "Does that number support that conclusion?",
    },
  },
  {
    id: "review_bombing",
    label: { "zh-TW": "⭐ 五星評價", en: "⭐ Five-star reviews" },
    text: {
      "zh-TW":
        "有人說：「這家餐廳評價都是五星，一定是刷的，現在網路上的好評都不能信。」",
      en: "Someone said: “This restaurant only has five-star reviews, so they must be fake. You can't trust any good review online any more.”",
    },
    question: {
      "zh-TW": "從評價就能判斷是不是造假嗎？",
      en: "Can you tell it's fake from the ratings alone?",
    },
  },
  {
    id: "poll_reading",
    label: { "zh-TW": "📊 民調解讀", en: "📊 Poll reading" },
    text: {
      "zh-TW":
        "貼文寫著：「最新網路投票有七成的人反對這個政策，可見全國民意已經很清楚了。」",
      en: "A post read: “The latest online poll shows 70% oppose this policy, so public opinion nationwide is clearly settled.”",
    },
    question: {
      "zh-TW": "這樣能代表全國民意嗎？",
      en: "Does that represent national opinion?",
    },
  },
];

export function findSample(id: string): Sample | undefined {
  return SAMPLES.find((sample) => sample.id === id);
}
