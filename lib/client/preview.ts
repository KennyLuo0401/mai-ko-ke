export type Language = "zh-TW" | "en";
export type LocalizedText = Record<Language, string>;
export type Phase = "LOBBY" | "BRIEFING_READY" | "INITIAL_VOTE" | "PRIVATE_CARD" | "READY_TO_REVEAL" | "REVEALED";
export type Choice = "yes" | "no" | "uncertain";

export const demoCode = "482916";
export const phases: Phase[] = ["LOBBY", "BRIEFING_READY", "INITIAL_VOTE", "PRIVATE_CARD", "READY_TO_REVEAL", "REVEALED"];
export const phaseLabels: Record<Phase, LocalizedText> = {
  LOBBY: { "zh-TW": "集合", en: "Gather" },
  BRIEFING_READY: { "zh-TW": "讀一讀", en: "Read" },
  INITIAL_VOTE: { "zh-TW": "先表態", en: "Take a view" },
  PRIVATE_CARD: { "zh-TW": "換個角度", en: "Reconsider" },
  READY_TO_REVEAL: { "zh-TW": "等大家", en: "Wait" },
  REVEALED: { "zh-TW": "一起翻牌", en: "Reveal" },
};

export const fixture = {
  question: { "zh-TW": "四天工作制，真的會讓工作更有效率嗎？", en: "Would a four-day workweek really make us more productive?" },
  source: {
    "zh-TW": "「某公司試行每週工作四天後，員工說自己更專注，公司也說產出沒有下降。這證明所有公司都應該立刻改成四天工作制。」",
    en: '“After one company tried a four-day workweek, employees reported better focus and the company said output had not fallen. This proves every company should switch immediately.”',
  },
  briefing: {
    "zh-TW": "這段文字從一家公司的經驗，推論所有公司都適合縮短工時。它提到了專注與產出，卻沒有交代樣本、試行時間，或如何衡量成效。",
    en: "The post takes one company’s experience and applies it to every company. It mentions focus and output, but does not describe the sample, trial length, or how results were measured.",
  },
  boundary: { "zh-TW": "這是虛構的討論素材，不是真實研究。現有資訊不足以判斷普遍成效。", en: "This is a fictional discussion prompt, not a real study. It cannot establish a general effect." },
  perspective: { "zh-TW": "找找看，沒被說出來的事。", en: "Look for what was left unsaid." },
  prompt: { "zh-TW": "如果這家公司本來就能彈性排班，結果還能套用在醫院或餐廳嗎？你還想知道什麼？", en: "If this company already offered flexible schedules, would its results apply to a hospital or restaurant? What else would you want to know?" },
  reasons: [
    { id: "sample", label: { "zh-TW": "樣本太少", en: "Sample is too small" } },
    { id: "measurement", label: { "zh-TW": "成效怎麼算？", en: "How was output measured?" } },
    { id: "context", label: { "zh-TW": "產業情境不同", en: "Industries differ" } },
    { id: "wellbeing", label: { "zh-TW": "員工感受也重要", en: "Wellbeing matters too" } },
    { id: "uncertain", label: { "zh-TW": "資訊不足／不熟悉", en: "Not enough information" } },
  ],
};

export const choices: { id: Choice; label: LocalizedText; detail: LocalizedText }[] = [
  { id: "yes", label: { "zh-TW": "傾向是", en: "Leaning yes" }, detail: { "zh-TW": "目前的說法有道理", en: "The idea seems plausible" } },
  { id: "no", label: { "zh-TW": "傾向不是", en: "Leaning no" }, detail: { "zh-TW": "我還不太買單", en: "I’m not convinced yet" } },
  { id: "uncertain", label: { "zh-TW": "還不確定", en: "Not sure yet" }, detail: { "zh-TW": "我需要更多資訊", en: "I need more information" } },
];

export const reactions = [
  { id: "strengthens", label: { "zh-TW": "更支持原本的說法", en: "More convinced" } },
  { id: "weakens", label: { "zh-TW": "更懷疑原本的說法", en: "Less convinced" } },
  { id: "unchanged", label: { "zh-TW": "沒有改變", en: "No change" } },
  { id: "uncertain", label: { "zh-TW": "還不確定", en: "Still uncertain" } },
];

export function toggleReason(selected: string[], id: string) {
  if (!fixture.reasons.some((reason) => reason.id === id)) return selected;
  if (selected.includes(id)) return selected.filter((value) => value !== id);
  return selected.length < 2 ? [...selected, id] : selected;
}

export function validCard(reaction: string, reasonIds: string[]) {
  return reactions.some((option) => option.id === reaction)
    && reasonIds.length >= 1 && reasonIds.length <= 2
    && new Set(reasonIds).size === reasonIds.length
    && reasonIds.every((id) => fixture.reasons.some((reason) => reason.id === id));
}

export function validateJoin(code: string, nickname: string): "nickname" | "format" | "room" | null {
  if (!nickname.trim() || nickname.trim().length > 20) return "nickname";
  if (!/^\d{6}$/.test(code)) return "format";
  return code === demoCode ? null : "room";
}
