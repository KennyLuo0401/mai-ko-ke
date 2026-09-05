/**
 * Persistence boundary / 儲存邊界
 *
 * The game logic in `store.ts` never touches a database. It loads a whole
 * RoomRecord, changes it in memory, and commits with a compare-and-swap on
 * `version`. That CAS is what makes reveal fire exactly once and what makes two
 * simultaneous final answers safe, on either backend.
 *
 * 遊戲邏輯只操作 RoomRecord，以 version 做 CAS 提交；翻牌只發生一次由此保證。
 */

import type {
  ConsensusStatement,
  GamePackage,
  GameState,
  Language,
  LocalizedText,
  MappedStatement,
  ProcessingStatus,
  ResponsePayload,
} from "@/lib/contracts";
import type { VoteTable } from "@/lib/game/rules";

export type StoredPlayer = {
  playerId: string;
  userId: string;
  nickname: string;
  language: Language;
  active: boolean;
  /** Frozen roster flag, set when the initial vote opens. */
  required: boolean;
  /** The one thinking card dealt to this player. */
  cardId?: string;
  joinedAt: number;
};

export type StoredResponses = {
  initial?: Extract<ResponsePayload, { stage: "initial" }>;
  card?: Extract<ResponsePayload, { stage: "card" }>;
  final?: Extract<ResponsePayload, { stage: "final" }>;
};

export type RoomRecord = {
  id: string;
  code: string;
  hostUserId: string;
  language: Language;
  state: GameState;
  /** Monotonic; the optimistic-concurrency token. */
  version: number;
  createdAt: number;
  /** Epoch ms the current answering phase opened. Drives the shared countdown. */
  phaseStartedAt?: number;
  players: StoredPlayer[];
  material?: { sourceText: string; hostQuestion: string };
  gamePackage?: GamePackage;
  responses: Record<string, StoredResponses>;
  consensusStatements?: ConsensusStatement[];
  consensusVotes: VoteTable;
  map?: MappedStatement[];
  mapSummary?: LocalizedText;
  processing?: ProcessingStatus;
};

export interface Backend {
  readonly name: "memory" | "supabase";
  /** Insert a brand new room. Rejects a duplicate code. */
  create(room: RoomRecord): Promise<void>;
  loadById(roomId: string): Promise<RoomRecord | null>;
  loadByCode(code: string): Promise<RoomRecord | null>;
  /**
   * Commit `room`, but only if the stored version still equals
   * `expectedVersion`. Returns false when another writer won the race, and the
   * caller reloads and reapplies. Child rows are written before the room row,
   * so a lost race leaves only idempotent writes behind.
   */
  save(
    room: RoomRecord,
    expectedVersion: number,
    /** The record as loaded, so a backend can write only what actually changed. */
    previous?: RoomRecord,
  ): Promise<boolean>;
  /** Test-only. */
  reset(): Promise<void>;
}

let cached: Backend | null = null;

export function selectedBackendName(): "memory" | "supabase" {
  return process.env.MKK_STORE === "supabase" ? "supabase" : "memory";
}

export async function getBackend(): Promise<Backend> {
  if (cached && cached.name === selectedBackendName()) return cached;
  if (selectedBackendName() === "supabase") {
    const { supabaseBackend } = await import("@/lib/server/backend-supabase");
    cached = supabaseBackend;
  } else {
    const { memoryBackend } = await import("@/lib/server/backend-memory");
    cached = memoryBackend;
  }
  return cached;
}

/** Test-only: drop the cached backend so a changed env var takes effect. */
export function __clearBackendCache(): void {
  cached = null;
}
