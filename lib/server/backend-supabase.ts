/**
 * Supabase backend / Supabase 後端 (S1.5)
 *
 * Server-only. Uses the secret key, which bypasses RLS, so authorization is
 * still enforced in `store.ts` on every operation — the database policies are
 * the second line of defence, not the first (BUILD_PLAN §13, §21).
 *
 * Commit order matters: child rows are written first and are all idempotent
 * upserts keyed on their unique constraints, then the `rooms` row is updated
 * with a compare-and-swap on `version`. A lost race therefore leaves only
 * repeatable writes behind, and the caller reloads and reapplies.
 *
 * 先寫子表（皆為冪等 upsert），最後以 version CAS 更新 rooms 作為提交點。
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type {
  ConsensusStatement,
  GamePackage,
  GameState,
  Language,
  MappedStatement,
  ProcessingStatus,
  ResponsePayload,
} from "@/lib/contracts";
import { canonicalJson, type VoteTable } from "@/lib/game/rules";
import type { Backend, RoomRecord, StoredPlayer } from "@/lib/server/backend";
import { ApiFault } from "@/lib/server/fault";

/* -------------------------------------------------------------------------- */
/* Client                                                                     */
/* -------------------------------------------------------------------------- */

let client: SupabaseClient | null = null;

function sb(): SupabaseClient {
  if (client) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    throw new ApiFault(
      "internal_error",
      "MKK_STORE=supabase requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY",
    );
  }
  client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}

/* -------------------------------------------------------------------------- */
/* Row shapes                                                                 */
/* -------------------------------------------------------------------------- */

type RoomRow = {
  id: string;
  code: string;
  host_user_id: string;
  language: Language;
  state: GameState;
  version: number;
  processing_kind: ProcessingStatus["kind"] | null;
  processing_status: ProcessingStatus["status"] | null;
  processing_code: string | null;
  published_map: MappedStatement[] | null;
  created_at: string;
  phase_started_at: string | null;
  map_summary: { "zh-TW": string; en: string } | null;
};

type PlayerRow = {
  id: string;
  room_id: string;
  user_id: string;
  nickname: string;
  language: Language;
  active: boolean;
  required: boolean;
  card_id: string | null;
  joined_at: string;
};

type ResponseRow = { player_id: string; stage: string; payload: ResponsePayload };
type StatementRow = {
  id: string;
  text: ConsensusStatement["text"];
  category: ConsensusStatement["category"];
  position: number;
};
type VoteRow = { statement_id: string; player_id: string; decision: string };
type MaterialRow = { source_text: string; host_question: string };
type PackageRow = Omit<GamePackage, "schemaVersion"> & { schema_version: string };

function fail(message: string, error: { message: string } | null): never {
  throw new ApiFault("internal_error", `${message}: ${error?.message ?? "unknown"}`);
}

/* -------------------------------------------------------------------------- */
/* Load                                                                       */
/* -------------------------------------------------------------------------- */

async function hydrate(roomRow: RoomRow): Promise<RoomRecord> {
  const db = sb();
  const roomId = roomRow.id;

  const [players, material, pkg, responses, statements, votes] = await Promise.all([
    db.from("players").select("*").eq("room_id", roomId).order("joined_at"),
    db.from("materials").select("source_text, host_question").eq("room_id", roomId).maybeSingle(),
    db.from("game_packages").select("*").eq("room_id", roomId).maybeSingle(),
    db.from("responses").select("player_id, stage, payload").eq("room_id", roomId),
    db.from("consensus_statements").select("id, text, category, position").eq("room_id", roomId).order("position"),
    db.from("consensus_votes").select("statement_id, player_id, decision").eq("room_id", roomId),
  ]);

  if (players.error) fail("load players", players.error);
  if (responses.error) fail("load responses", responses.error);
  if (statements.error) fail("load statements", statements.error);
  if (votes.error) fail("load votes", votes.error);

  const record: RoomRecord = {
    id: roomRow.id,
    code: roomRow.code,
    hostUserId: roomRow.host_user_id,
    language: roomRow.language,
    state: roomRow.state,
    version: Number(roomRow.version),
    createdAt: Date.parse(roomRow.created_at),
    players: (players.data as PlayerRow[]).map((row) => ({
      playerId: row.id,
      userId: row.user_id,
      nickname: row.nickname,
      language: row.language,
      active: row.active,
      required: row.required,
      ...(row.card_id ? { cardId: row.card_id } : {}),
      joinedAt: Date.parse(row.joined_at),
    })),
    responses: {},
    consensusVotes: {},
  };

  if (material.data) {
    const row = material.data as MaterialRow;
    record.material = { sourceText: row.source_text, hostQuestion: row.host_question };
  }

  if (pkg.data) {
    const row = pkg.data as PackageRow;
    record.gamePackage = {
      schemaVersion: row.schema_version,
      briefing: row.briefing,
      claims: row.claims,
      cards: row.cards,
      reasons: row.reasons,
    };
  }

  for (const row of responses.data as ResponseRow[]) {
    const bucket = (record.responses[row.player_id] ??= {});
    if (row.stage === "initial") bucket.initial = row.payload as never;
    else if (row.stage === "card") bucket.card = row.payload as never;
    else if (row.stage === "final") bucket.final = row.payload as never;
  }

  const statementRows = statements.data as StatementRow[];
  if (statementRows.length > 0) {
    record.consensusStatements = statementRows.map((row) => ({
      id: row.id,
      text: row.text,
      category: row.category,
    }));
  }

  const voteTable: VoteTable = {};
  for (const row of votes.data as VoteRow[]) {
    (voteTable[row.statement_id] ??= {})[row.player_id] = row.decision as never;
  }
  record.consensusVotes = voteTable;

  if (roomRow.processing_kind && roomRow.processing_status) {
    record.processing = {
      kind: roomRow.processing_kind,
      status: roomRow.processing_status,
      ...(roomRow.processing_code ? { code: roomRow.processing_code as never } : {}),
    };
  }

  if (roomRow.published_map) record.map = roomRow.published_map;
  if (roomRow.map_summary) record.mapSummary = roomRow.map_summary;
  if (roomRow.phase_started_at) {
    record.phaseStartedAt = Date.parse(roomRow.phase_started_at);
  }

  return record;
}

/* -------------------------------------------------------------------------- */
/* Backend                                                                    */
/* -------------------------------------------------------------------------- */

export const supabaseBackend: Backend = {
  name: "supabase",

  async create(room) {
    const { error } = await sb().from("rooms").insert({
      id: room.id,
      code: room.code,
      host_user_id: room.hostUserId,
      language: room.language,
      state: room.state,
      version: room.version,
    });
    // 23505 is a unique violation — the caller regenerates the code.
    if (error) {
      if (error.code === "23505") throw new ApiFault("internal_error", "Room code collision");
      fail("create room", error);
    }
  },

  async loadById(roomId) {
    // A malformed id is "not found", not a database error.
    if (!/^[0-9a-f-]{36}$/i.test(roomId)) return null;
    const { data, error } = await sb().from("rooms").select("*").eq("id", roomId).maybeSingle();
    if (error) fail("load room", error);
    return data ? hydrate(data as RoomRow) : null;
  },

  async loadByCode(code) {
    const { data, error } = await sb().from("rooms").select("*").eq("code", code).maybeSingle();
    if (error) fail("load room by code", error);
    return data ? hydrate(data as RoomRow) : null;
  },

  async save(room, expectedVersion, previous) {
    const db = sb();

    // Write only the sections that actually changed. Most commits touch one,
    // so this is the difference between one round trip and seven.
    // canonicalJson, because a section loaded from jsonb has normalized key
    // order and would otherwise always look changed.
    const changed = (pick: (r: RoomRecord) => unknown): boolean =>
      !previous || canonicalJson(pick(room)) !== canonicalJson(pick(previous));

    // 1 — Child rows first. Every one is an idempotent upsert.
    if (room.players.length > 0 && changed((r) => r.players)) {
      const { error } = await db.from("players").upsert(
        room.players.map((player: StoredPlayer) => ({
          id: player.playerId,
          room_id: room.id,
          user_id: player.userId,
          nickname: player.nickname,
          language: player.language,
          active: player.active,
          required: player.required,
          card_id: player.cardId ?? null,
          joined_at: new Date(player.joinedAt).toISOString(),
        })),
        { onConflict: "room_id,user_id" },
      );
      if (error) fail("save players", error);
    }

    if (room.material && changed((r) => r.material)) {
      const { error } = await db.from("materials").upsert(
        {
          room_id: room.id,
          source_text: room.material.sourceText,
          host_question: room.material.hostQuestion,
        },
        { onConflict: "room_id" },
      );
      if (error) fail("save material", error);
    }

    if (room.gamePackage && changed((r) => r.gamePackage)) {
      const { error } = await db.from("game_packages").upsert(
        {
          room_id: room.id,
          schema_version: room.gamePackage.schemaVersion,
          briefing: room.gamePackage.briefing,
          claims: room.gamePackage.claims,
          cards: room.gamePackage.cards,
          reasons: room.gamePackage.reasons,
        },
        { onConflict: "room_id" },
      );
      if (error) fail("save package", error);
    }

    const responseRows = Object.entries(room.responses).flatMap(([playerId, bucket]) =>
      (["initial", "card", "final"] as const)
        .filter((stage) => bucket[stage])
        .map((stage) => ({
          room_id: room.id,
          player_id: playerId,
          stage,
          payload: bucket[stage] as ResponsePayload,
        })),
    );
    if (responseRows.length > 0 && changed((r) => r.responses)) {
      const { error } = await db
        .from("responses")
        .upsert(responseRows, { onConflict: "player_id,stage" });
      if (error) fail("save responses", error);
    }

    if (room.consensusStatements?.length && changed((r) => r.consensusStatements)) {
      const { error } = await db.from("consensus_statements").upsert(
        room.consensusStatements.map((statement, position) => ({
          room_id: room.id,
          id: statement.id,
          text: statement.text,
          category: statement.category,
          position,
        })),
        { onConflict: "room_id,id" },
      );
      if (error) fail("save statements", error);
    }

    const voteRows = Object.entries(room.consensusVotes).flatMap(([statementId, byPlayer]) =>
      Object.entries(byPlayer).map(([playerId, decision]) => ({
        room_id: room.id,
        statement_id: statementId,
        player_id: playerId,
        decision,
      })),
    );
    if (voteRows.length > 0 && changed((r) => r.consensusVotes)) {
      const { error } = await db
        .from("consensus_votes")
        .upsert(voteRows, { onConflict: "room_id,statement_id,player_id" });
      if (error) fail("save votes", error);
    }

    // 2 — The commit point: only lands if nobody else moved the room meanwhile.
    const { data, error } = await db
      .from("rooms")
      .update({
        state: room.state,
        version: room.version,
        processing_kind: room.processing?.kind ?? null,
        processing_status: room.processing?.status ?? null,
        processing_code: room.processing?.code ?? null,
        published_map: room.map ?? null,
        map_summary: room.mapSummary ?? null,
        phase_started_at: room.phaseStartedAt
          ? new Date(room.phaseStartedAt).toISOString()
          : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", room.id)
      .eq("version", expectedVersion)
      .select("id");

    if (error) fail("commit room", error);
    return (data?.length ?? 0) > 0;
  },

  async reset() {
    // Cascades to every child table.
    const { error } = await sb().from("rooms").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    if (error) fail("reset", error);
  },
};
