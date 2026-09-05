/**
 * 《麥擱假》shared contracts / 共用介面
 *
 * Source of truth for the interfaces named in BUILD_PLAN.md §19–§21.
 * Both the frontend (Kenny) and the backend build against this file.
 * Interface changes require agreement from both developers.
 *
 * 對應 BUILD_PLAN.md 第 19–21 節。前後端共用，變更須雙方確認。
 */

export const SCHEMA_VERSION = "1.0.0" as const;

/* -------------------------------------------------------------------------- */
/* Localization / 多語                                                        */
/* -------------------------------------------------------------------------- */

export type Language = "zh-TW" | "en";
export const LANGUAGES: Language[] = ["zh-TW", "en"];

/** All generated display text is bilingual. Option IDs are never translated. */
export type LocalizedText = { "zh-TW": string; en: string };

/* -------------------------------------------------------------------------- */
/* Game state machine / 遊戲狀態機 (§7)                                       */
/* -------------------------------------------------------------------------- */

export type GameState =
  | "LOBBY"
  | "MATERIAL_SUBMITTED"
  | "BRIEFING_READY"
  | "INITIAL_VOTE"
  | "PRIVATE_CARD"
  | "READY_TO_REVEAL"
  | "REVEALED"
  | "IN_PERSON_DISCUSSION"
  | "FINAL_VOTE"
  | "CONSENSUS_REVIEW"
  | "COMPLETED";

export const GAME_STATES: GameState[] = [
  "LOBBY",
  "MATERIAL_SUBMITTED",
  "BRIEFING_READY",
  "INITIAL_VOTE",
  "PRIVATE_CARD",
  "READY_TO_REVEAL",
  "REVEALED",
  "IN_PERSON_DISCUSSION",
  "FINAL_VOTE",
  "CONSENSUS_REVIEW",
  "COMPLETED",
];

/** Host-controlled transitions. Automatic transitions are never client actions. */
export type HostAction =
  | "start_initial_vote"
  | "start_discussion"
  | "start_final_vote"
  | "publish";

export type Role = "host" | "player";

/* -------------------------------------------------------------------------- */
/* 3-1-1 answer options / 3-1-1 選項 (§20.1)                                  */
/* -------------------------------------------------------------------------- */

/** Single choice #1 (initial) and the final yes/no/uncertain question. */
export type YesNoUncertain = "yes" | "no" | "uncertain";
export const YES_NO_UNCERTAIN: YesNoUncertain[] = ["yes", "no", "uncertain"];

/** Single choice #2 — reaction to the assigned thinking card. */
export type ReactionChoice =
  | "strengthens"
  | "weakens"
  | "unchanged"
  | "uncertain";
export const REACTION_CHOICES: ReactionChoice[] = [
  "strengthens",
  "weakens",
  "unchanged",
  "uncertain",
];

/** Single choice #3 — change in position after discussion. */
export type ChangeChoice =
  | "more_supportive"
  | "less_supportive"
  | "unchanged"
  | "uncertain";
export const CHANGE_CHOICES: ChangeChoice[] = [
  "more_supportive",
  "less_supportive",
  "unchanged",
  "uncertain",
];

export const MIN_REASONS = 1;
export const MAX_REASONS = 2;

/* -------------------------------------------------------------------------- */
/* Response payloads / 答案格式 (§20.1)                                       */
/* -------------------------------------------------------------------------- */

export type InitialResponse = {
  stage: "initial";
  initialChoice: YesNoUncertain;
};

export type CardResponse = {
  stage: "card";
  reactionChoice: ReactionChoice;
  /** 1–2 stable reason IDs from GamePackage.reasons. */
  reasonIds: string[];
};

export type FinalResponse = {
  stage: "final";
  changeChoice: ChangeChoice;
  finalChoice: YesNoUncertain;
  comment?: string;
};

export type ResponsePayload = InitialResponse | CardResponse | FinalResponse;
export type ResponseStage = ResponsePayload["stage"];

export const MAX_COMMENT_LENGTH = 280;
export const MAX_SOURCE_TEXT_LENGTH = 6000;
export const MAX_HOST_QUESTION_LENGTH = 280;
export const MAX_NICKNAME_LENGTH = 24;

/* -------------------------------------------------------------------------- */
/* AI contract / AI 介面 (§21)                                                */
/* -------------------------------------------------------------------------- */

export type Claim = {
  id: string;
  text: LocalizedText;
  /** How far the available evidence actually reaches. Never a verdict. */
  evidenceBoundary: LocalizedText;
};

/** One thinking card: a perspective plus a question answerable without expertise. */
export type ThinkingCard = {
  id: string;
  perspective: LocalizedText;
  prompt: LocalizedText;
};

export type Reason = {
  id: string;
  label: LocalizedText;
};

export type GamePackage = {
  schemaVersion: string;
  briefing: LocalizedText;
  claims: Claim[];
  cards: ThinkingCard[];
  reasons: Reason[];
};

export type AnalyzeMaterialInput = {
  sourceText: string;
  hostQuestion: string;
  cardCount: number;
  languages: Language[];
};

export type ConsensusCategory =
  | "candidate_agreement"
  | "disagreement"
  | "missing_evidence"
  | "uncertainty";

export const CONSENSUS_CATEGORIES: ConsensusCategory[] = [
  "candidate_agreement",
  "disagreement",
  "missing_evidence",
  "uncertainty",
];

export type ConsensusStatement = {
  id: string;
  text: LocalizedText;
  category: ConsensusCategory;
};

export type ConsensusPackage = {
  schemaVersion: string;
  statements: ConsensusStatement[];
};

/** Pseudonymous player answers handed to the analysis adapter. No real IDs. */
export type PseudonymousAnswer = {
  pseudonym: string;
  initialChoice?: YesNoUncertain;
  cardPerspective?: LocalizedText;
  reactionChoice?: ReactionChoice;
  reasonIds?: string[];
  changeChoice?: ChangeChoice;
  finalChoice?: YesNoUncertain;
  comment?: string;
};

export type DraftConsensusInput = {
  sourceText: string;
  hostQuestion: string;
  claims: Claim[];
  answers: PseudonymousAnswer[];
  languages: Language[];
};

/** One approved statement plus where the players' votes put it. */
export type SettledStatement = {
  text: LocalizedText;
  section: MapSection;
  tally: Record<ConsensusDecision, number>;
};

export type SummariseOutcomeInput = {
  sourceText: string;
  hostQuestion: string;
  statements: SettledStatement[];
  answers: PseudonymousAnswer[];
  languages: Language[];
};

/** A short closing paragraph — a reading of the map, never a verdict on it. */
export type OutcomeSummary = { summary: LocalizedText };

/** The adapter functions named in BUILD_PLAN §9, plus the closing summary. */
export interface AnalysisAdapter {
  analyzeMaterial(input: AnalyzeMaterialInput): Promise<GamePackage>;
  draftConsensus(input: DraftConsensusInput): Promise<ConsensusPackage>;
  summariseOutcome(input: SummariseOutcomeInput): Promise<OutcomeSummary>;
}

/* -------------------------------------------------------------------------- */
/* Consensus approval / 共識確認 (§20.3)                                      */
/* -------------------------------------------------------------------------- */

export type ConsensusDecision = "agree" | "needs_revision" | "disagree";
export const CONSENSUS_DECISIONS: ConsensusDecision[] = [
  "agree",
  "needs_revision",
  "disagree",
];

/** Final placement is computed by code from player votes, never by the model. */
export type MapSection =
  | "we_agree"
  | "we_differ"
  | "missing_evidence"
  | "uncertainty";

export type MappedStatement = {
  id: string;
  text: LocalizedText;
  section: MapSection;
  /** Vote tallies, present once the map is published. */
  tally: Record<ConsensusDecision, number>;
};

/* -------------------------------------------------------------------------- */
/* RoomView — the single role-filtered read model / 房間畫面資料 (§19)        */
/* -------------------------------------------------------------------------- */

export type PublicPlayer = {
  playerId: string;
  nickname: string;
  language: Language;
  active: boolean;
  /** Whether this player has finished the current answering stage. */
  done: boolean;
};

export type RevealedAnswer = {
  playerId: string;
  nickname: string;
  cardPerspective: LocalizedText;
  initialChoice: YesNoUncertain;
  reactionChoice: ReactionChoice;
  reasonIds: string[];
};

export type ProcessingStatus = {
  kind: "analysis" | "consensus";
  status: "pending" | "failed";
  /** Stable error code for frontend localization. */
  code?: ApiErrorCode;
};

/**
 * Which analysis source produced this room's briefing. Surfaced so the UI can
 * state the truth instead of carrying a hardcoded label that drifts out of date
 * whenever the adapter is switched.
 */
export type AnalysisMode = "live" | "fixture";

export type RoomView = {
  roomId: string;
  roomCode: string;
  state: GameState;
  /** "fixture" means every room gets the same briefing — a visible fallback. */
  analysis: AnalysisMode;
  /** Monotonic. Discard any view older than the one already rendered. */
  version: number;
  role: Role;
  language: Language;
  /** Present for the caller when they are a player. */
  playerId?: string;
  players: PublicPlayer[];
  /** Roster frozen at INITIAL_VOTE; these players must finish each stage. */
  requiredPlayerIds: string[];
  completion: { done: number; required: number };
  /** Epoch ms the current answering phase opened, so every client shares a clock. */
  phaseStartedAt?: number;
  /** Verbatim host submission, shown beside the briefing to expose framing. */
  material?: { sourceText: string; hostQuestion: string };
  /** Briefing/claims/reasons are public once analysis succeeds. */
  briefing?: LocalizedText;
  claims?: Claim[];
  reasons?: Reason[];
  /** The caller's own assigned card. Never another player's. */
  myCard?: ThinkingCard;
  /** The caller's own saved answers. Never another player's. */
  myResponses?: {
    initial?: InitialResponse;
    card?: CardResponse;
    final?: FinalResponse;
  };
  /** Absent until the server has revealed. */
  reveal?: RevealedAnswer[];
  /** Present from CONSENSUS_REVIEW onward. */
  consensusStatements?: ConsensusStatement[];
  /** The caller's own consensus votes, statementId → decision. */
  myConsensusVotes?: Record<string, ConsensusDecision>;
  /** How many required players have voted on each statement. */
  consensusProgress?: Record<string, number>;
  /** Published map. Present only at COMPLETED. */
  map?: MappedStatement[];
  /** Prose reading of the map. Absent if the summary call failed. */
  mapSummary?: LocalizedText;
  processing?: ProcessingStatus;
};

/* -------------------------------------------------------------------------- */
/* API envelopes / API 格式 (§19)                                             */
/* -------------------------------------------------------------------------- */

export type ApiErrorCode =
  | "invalid_input"
  | "unauthenticated"
  | "forbidden"
  | "host_key_required"
  | "room_not_found"
  | "room_code_not_found"
  | "phase_conflict"
  | "late_join_rejected"
  | "roster_full"
  | "duplicate_answer"
  | "analysis_failed"
  | "consensus_failed"
  | "ai_invalid_output"
  | "service_unavailable"
  | "internal_error";

export type ApiError = {
  code: ApiErrorCode;
  /** Developer-facing English. The frontend localizes from `code`. */
  message: string;
  retryable: boolean;
};

export type ApiSuccess<T> = { data: T };
export type ApiFailure = { error: ApiError };
export type ApiResult<T> = ApiSuccess<T> | ApiFailure;

/** HTTP status for each stable error code (§19). */
export const ERROR_STATUS: Record<ApiErrorCode, number> = {
  invalid_input: 400,
  unauthenticated: 401,
  forbidden: 403,
  host_key_required: 403,
  room_not_found: 404,
  room_code_not_found: 404,
  phase_conflict: 409,
  late_join_rejected: 409,
  roster_full: 409,
  duplicate_answer: 409,
  analysis_failed: 502,
  consensus_failed: 502,
  ai_invalid_output: 502,
  service_unavailable: 503,
  internal_error: 500,
};

export const RETRYABLE_CODES: ReadonlySet<ApiErrorCode> = new Set<ApiErrorCode>([
  "analysis_failed",
  "consensus_failed",
  "service_unavailable",
]);

/* -------------------------------------------------------------------------- */
/* Request payloads / 請求格式                                                */
/* -------------------------------------------------------------------------- */

export type CreateRoomRequest = {
  language: Language;
  /** Required only when the deployment sets a host key. */
  hostKey?: string;
};

/** Public, secret-free deployment facts the entry screen needs. */
export type PublicConfig = { hostKeyRequired: boolean };
export type CreateRoomResponse = { roomId: string; roomCode: string };

export type JoinRoomRequest = {
  roomCode: string;
  nickname: string;
  language: Language;
};
export type JoinRoomResponse = { roomId: string; playerId: string };

export type SubmitMaterialRequest = {
  sourceText: string;
  hostQuestion: string;
};

export type AdvanceRequest = {
  expectedState: GameState;
  action: HostAction;
};

export type RemovePlayerRequest = { playerId: string };

export type ConsensusVoteRequest = {
  statementId: string;
  decision: ConsensusDecision;
};

/* -------------------------------------------------------------------------- */
/* Limits / 上限                                                              */
/* -------------------------------------------------------------------------- */

/**
 * How long a phase is *expected* to take, shown as a countdown.
 *
 * Pacing only. Nothing expires when it reaches zero: no answer is auto-submitted
 * and none is penalised for arriving late (§3 rules out speed scoring, which
 * rewards fast conformity over reflection). It exists so a table knows roughly
 * when to look up, and so the host has a fair moment to remove someone who has
 * actually left.
 * 只是節奏提示，時間到不會自動送出，也不扣分。
 */
export const ANSWER_SECONDS = 60;

export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 6;
/** One card per player; the fixture and adapters must supply at least this many. */
export const CARD_COUNT = MAX_PLAYERS;
