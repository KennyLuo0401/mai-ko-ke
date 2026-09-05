/**
 * UI copy and pure input rules / 介面文案與純輸入規則
 *
 * Succeeds `lib/client/preview.ts`. The fixture data moved to the server
 * (`lib/ai/fixtures/demo.ts`) — briefing, cards and reasons now arrive from the
 * API as bilingual `LocalizedText`. What stays here is interface copy plus the
 * pure client-side guards, which the server enforces again on every write.
 *
 * 固定資料已移到伺服器；這裡只保留介面文案與前端輸入檢查，後端仍會再驗證一次。
 */

import type {
  ApiErrorCode,
  ChangeChoice,
  ConsensusDecision,
  GameState,
  Language,
  LocalizedText,
  MapSection,
  ReactionChoice,
  YesNoUncertain,
} from "@/lib/contracts";

export type { Language };

export function text(language: Language, value: LocalizedText): string {
  return value[language] ?? value.en;
}

/* -------------------------------------------------------------------------- */
/* Progress rail / 進度                                                       */
/* -------------------------------------------------------------------------- */

/** The steps a player sees. Transient server states collapse into these. */
export const steps: { state: GameState; label: LocalizedText }[] = [
  { state: "LOBBY", label: { "zh-TW": "集合", en: "Gather" } },
  { state: "BRIEFING_READY", label: { "zh-TW": "讀一讀", en: "Read" } },
  { state: "INITIAL_VOTE", label: { "zh-TW": "先表態", en: "Take a view" } },
  { state: "PRIVATE_CARD", label: { "zh-TW": "換個角度", en: "Reconsider" } },
  { state: "REVEALED", label: { "zh-TW": "一起翻牌", en: "Reveal" } },
  { state: "IN_PERSON_DISCUSSION", label: { "zh-TW": "聊一聊", en: "Talk" } },
  { state: "FINAL_VOTE", label: { "zh-TW": "再想一次", en: "Think again" } },
  { state: "CONSENSUS_REVIEW", label: { "zh-TW": "找共識", en: "Common ground" } },
  { state: "COMPLETED", label: { "zh-TW": "這一桌", en: "Our table" } },
];

/** MATERIAL_SUBMITTED and READY_TO_REVEAL are waits, not their own steps. */
export function stepIndex(state: GameState): number {
  const collapsed: Partial<Record<GameState, GameState>> = {
    MATERIAL_SUBMITTED: "BRIEFING_READY",
    READY_TO_REVEAL: "REVEALED",
  };
  const target = collapsed[state] ?? state;
  const index = steps.findIndex((step) => step.state === target);
  return index < 0 ? 0 : index;
}

export const phaseTitles: Record<GameState, LocalizedText> = {
  LOBBY: { "zh-TW": "人到齊，話題就開始。", en: "Good conversations start here." },
  MATERIAL_SUBMITTED: { "zh-TW": "正在讀這段話…", en: "Reading it over…" },
  BRIEFING_READY: { "zh-TW": "同一段話，不同的讀法。", en: "Same story. Different readings." },
  INITIAL_VOTE: { "zh-TW": "先不管別人，你怎麼想？", en: "Before the others, what do you think?" },
  PRIVATE_CARD: { "zh-TW": "換個問題，風景就不同。", en: "A different question changes the view." },
  READY_TO_REVEAL: { "zh-TW": "你的想法，先收好了。", en: "Your thoughts are safely tucked away." },
  REVEALED: { "zh-TW": "答案不同，才有得聊。", en: "Different answers. More to talk about." },
  IN_PERSON_DISCUSSION: { "zh-TW": "先把螢幕放下。", en: "Take it off screen." },
  FINAL_VOTE: { "zh-TW": "聊完了，現在你怎麼想？", en: "After all that, where do you land?" },
  CONSENSUS_REVIEW: { "zh-TW": "哪些話，我們都同意？", en: "Which of these can we all sign?" },
  COMPLETED: { "zh-TW": "這一桌，我們談到這裡。", en: "This is where our table got to." },
};

/* -------------------------------------------------------------------------- */
/* Answer options / 選項                                                      */
/* -------------------------------------------------------------------------- */

export const choices: {
  id: YesNoUncertain;
  label: LocalizedText;
  detail: LocalizedText;
}[] = [
  {
    id: "yes",
    label: { "zh-TW": "傾向是", en: "Leaning yes" },
    detail: { "zh-TW": "目前的說法有道理", en: "The idea seems plausible" },
  },
  {
    id: "no",
    label: { "zh-TW": "傾向不是", en: "Leaning no" },
    detail: { "zh-TW": "我還不太買單", en: "I'm not convinced yet" },
  },
  {
    id: "uncertain",
    label: { "zh-TW": "還不確定", en: "Not sure yet" },
    detail: { "zh-TW": "我需要更多資訊", en: "I need more information" },
  },
];

export const reactions: { id: ReactionChoice; label: LocalizedText }[] = [
  { id: "strengthens", label: { "zh-TW": "更支持原本的說法", en: "More convinced" } },
  { id: "weakens", label: { "zh-TW": "更懷疑原本的說法", en: "Less convinced" } },
  { id: "unchanged", label: { "zh-TW": "沒有改變", en: "No change" } },
  { id: "uncertain", label: { "zh-TW": "還不確定", en: "Still uncertain" } },
];

export const changes: { id: ChangeChoice; label: LocalizedText }[] = [
  {
    id: "more_supportive",
    label: { "zh-TW": "更願意相信了", en: "More willing to believe" },
  },
  {
    id: "less_supportive",
    label: { "zh-TW": "更不願意相信了", en: "Less willing to believe" },
  },
  { id: "unchanged", label: { "zh-TW": "想法沒有變", en: "My view didn't move" } },
  { id: "uncertain", label: { "zh-TW": "還是資訊不足", en: "Still not enough information" } },
];

export const decisions: { id: ConsensusDecision; label: LocalizedText }[] = [
  { id: "agree", label: { "zh-TW": "我同意", en: "I agree" } },
  { id: "needs_revision", label: { "zh-TW": "想改一下", en: "Needs rewording" } },
  { id: "disagree", label: { "zh-TW": "我不同意", en: "I disagree" } },
];

export const sectionLabels: Record<MapSection, LocalizedText> = {
  we_agree: { "zh-TW": "我們都同意", en: "We all agree" },
  we_differ: { "zh-TW": "我們還不一樣", en: "We still differ" },
  missing_evidence: { "zh-TW": "我們還缺什麼", en: "What we're missing" },
  uncertainty: { "zh-TW": "還說不準", en: "Still unsure" },
};

/* -------------------------------------------------------------------------- */
/* Pure input rules / 純輸入檢查                                              */
/* -------------------------------------------------------------------------- */

export const MAX_REASON_PICKS = 2;

/**
 * Toggle a reason, capped at two, ignoring ids the room does not offer.
 * `validIds` comes from the room's own package, so translated labels can never
 * be used as identifiers.
 */
export function toggleReason(
  selected: string[],
  id: string,
  validIds: string[],
): string[] {
  if (!validIds.includes(id)) return selected;
  if (selected.includes(id)) return selected.filter((value) => value !== id);
  return selected.length < MAX_REASON_PICKS ? [...selected, id] : selected;
}

export function validCard(
  reaction: string,
  reasonIds: string[],
  validIds: string[],
): boolean {
  return (
    reactions.some((option) => option.id === reaction) &&
    reasonIds.length >= 1 &&
    reasonIds.length <= MAX_REASON_PICKS &&
    new Set(reasonIds).size === reasonIds.length &&
    reasonIds.every((id) => validIds.includes(id))
  );
}

/**
 * Material that is essentially just a link.
 *
 * Nothing in this app fetches URLs (BUILD_PLAN §3, §14: pasted text is the
 * supported input), so a bare link gives the facilitator nothing to brief. It
 * behaves correctly — it reports that it can only see a URL rather than
 * inventing what the page says — but the round is wasted. Catch it before the
 * host spends a model call, not after.
 *
 * A link accompanied by real text is fine; only near-empty material is refused.
 * The threshold is deliberately low because the primary language is Chinese,
 * where a dozen characters is already a whole sentence — a Latin-calibrated
 * limit would reject real material.
 * 本產品不會抓取連結內容，貼上原文才有東西可讀。門檻設低，因中文字數密度高。
 */
const MIN_MATERIAL_BESIDES_LINK = 16;

export function looksLikeBareLink(text: string): boolean {
  if (!/https?:\/\//i.test(text)) return false;
  const withoutLinks = text.replace(/https?:\/\/\S+/gi, " ").trim();
  return withoutLinks.length < MIN_MATERIAL_BESIDES_LINK;
}

/**
 * Local pre-check before we spend a request. Whether the room actually exists
 * is the server's answer, not ours.
 */
export function validateJoin(
  code: string,
  nickname: string,
): "nickname" | "format" | null {
  if (!nickname.trim() || nickname.trim().length > 20) return "nickname";
  if (!/^\d{6}$/.test(code)) return "format";
  return null;
}

/* -------------------------------------------------------------------------- */
/* Errors / 錯誤訊息                                                          */
/* -------------------------------------------------------------------------- */

const errors: Record<ApiErrorCode, LocalizedText> = {
  invalid_input: { "zh-TW": "這樣的輸入沒辦法送出。", en: "That input can't be sent." },
  unauthenticated: { "zh-TW": "請重新整理頁面再試一次。", en: "Please refresh the page and try again." },
  forbidden: { "zh-TW": "這個動作不屬於你的角色。", en: "That action isn't yours to take." },
  host_key_required: {
    "zh-TW": "開房需要主持人通行碼。你可以用房號加入朋友開的房間。",
    en: "Opening a room needs the host passcode. You can still join a friend's room with its code.",
  },
  room_not_found: { "zh-TW": "找不到這個房間。", en: "That room can't be found." },
  room_code_not_found: { "zh-TW": "查無這個房號，再確認一次？", en: "No room with that code — check it again?" },
  phase_conflict: { "zh-TW": "現在這個階段還不能這樣做。", en: "That isn't available in this phase." },
  late_join_rejected: { "zh-TW": "這一桌已經開始了，來不及入座。", en: "This table already started." },
  roster_full: { "zh-TW": "這一桌坐滿了。", en: "This table is full." },
  duplicate_answer: { "zh-TW": "你這一輪的答案已經收好了。", en: "Your answer for this round is already saved." },
  analysis_failed: { "zh-TW": "導讀沒有產生成功，再試一次。", en: "The briefing didn't come through. Try again." },
  consensus_failed: { "zh-TW": "共識草稿沒有產生成功，再試一次。", en: "The consensus draft didn't come through. Try again." },
  ai_invalid_output: { "zh-TW": "回傳的格式不對，再試一次。", en: "The response came back malformed. Try again." },
  service_unavailable: { "zh-TW": "服務忙碌中，等一下再試。", en: "Busy right now — try again shortly." },
  internal_error: { "zh-TW": "發生了預期外的問題。", en: "Something unexpected went wrong." },
};

export function errorMessage(language: Language, code: ApiErrorCode): string {
  return text(language, errors[code] ?? errors.internal_error);
}
