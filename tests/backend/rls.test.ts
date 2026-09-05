import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { beforeAll, describe, expect, it } from "vitest";

/**
 * Row level security: allow AND deny / RLS 允許與拒絕測試 (BUILD_PLAN §12, §13)
 *
 * These run against the real project, using the publishable key exactly as a
 * leaked browser key would. The question they answer is: if that key escaped,
 * what could someone read or write? The answer must be "room state, and nothing
 * else".
 *
 * Skipped when the project credentials are absent, and never against
 * production data — point them at a development project.
 */

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishable = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const secret = process.env.SUPABASE_SECRET_KEY;
const configured = Boolean(url && publishable && secret);

const PRIVATE_TABLES = [
  "players",
  "materials",
  "game_packages",
  "responses",
  "consensus_statements",
  "consensus_votes",
] as const;

describe.skipIf(!configured)("row level security", () => {
  let anon: SupabaseClient;
  let server: SupabaseClient;

  let roomId = "";
  const code = String(Math.floor(Math.random() * 900000) + 100000);

  beforeAll(async () => {
    anon = createClient(url!, publishable!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    server = createClient(url!, secret!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await server
      .from("rooms")
      .insert({ code, host_user_id: "rls-test-host", language: "zh-TW" })
      .select("id")
      .single();
    if (error) throw new Error(`seed failed: ${error.message}`);
    roomId = (data as { id: string }).id;

    await server.from("players").insert({
      room_id: roomId,
      user_id: "rls-test-player",
      nickname: "RLS",
      language: "en",
    });
    const { data: player } = await server
      .from("players")
      .select("id")
      .eq("room_id", roomId)
      .single();
    await server.from("responses").insert({
      room_id: roomId,
      player_id: (player as { id: string }).id,
      stage: "initial",
      payload: { stage: "initial", initialChoice: "yes" },
    });

    return async () => {
      await server.from("rooms").delete().eq("id", roomId);
    };
  });

  /* ---------------------------------------------------------------- allow */

  it("lets the server key do its job", async () => {
    const { data, error } = await server.from("rooms").select("*").eq("id", roomId);
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
  });

  it("lets a browser key read room state, so Realtime can work", async () => {
    const { data, error } = await anon
      .from("rooms")
      .select("id, code, state, version")
      .eq("id", roomId);
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect((data as { state: string }[])[0].state).toBe("LOBBY");
  });

  /* ----------------------------------------------------------------- deny */

  it("hides every non-public room column from a browser key", async () => {
    for (const column of ["host_user_id", "published_map", "created_at"]) {
      const { error } = await anon.from("rooms").select(column).eq("id", roomId);
      expect(error, `column ${column} must not be selectable`).not.toBeNull();
    }
  });

  it("refuses select on every private table", async () => {
    for (const table of PRIVATE_TABLES) {
      const { data, error } = await anon.from(table).select("*");
      // Either a hard error, or an empty result — never another player's data.
      expect(error !== null || (data ?? []).length === 0, `${table} leaked rows`).toBe(true);
    }
  });

  it("refuses to expose a player's answer to a browser key", async () => {
    const { data, error } = await anon.from("responses").select("*").eq("room_id", roomId);
    expect(error !== null || (data ?? []).length === 0).toBe(true);
  });

  it("refuses writes to room state from a browser key", async () => {
    const { error: updateError } = await anon
      .from("rooms")
      .update({ state: "REVEALED" })
      .eq("id", roomId);
    expect(updateError).not.toBeNull();

    const { error: insertError } = await anon
      .from("rooms")
      .insert({ code: "999999", host_user_id: "attacker", language: "en" });
    expect(insertError).not.toBeNull();

    const { error: deleteError } = await anon.from("rooms").delete().eq("id", roomId);
    expect(deleteError).not.toBeNull();

    // And the row is untouched.
    const { data } = await server.from("rooms").select("state").eq("id", roomId).single();
    expect((data as { state: string }).state).toBe("LOBBY");
  });

  it("refuses writes to every private table from a browser key", async () => {
    for (const table of PRIVATE_TABLES) {
      const { error } = await anon.from(table).insert({ room_id: roomId });
      expect(error, `${table} accepted an anonymous insert`).not.toBeNull();
    }
  });

  /* ----------------------------------------------------- database constraints */

  it("enforces the constraints the plan requires", async () => {
    // Unique room code.
    const dupCode = await server
      .from("rooms")
      .insert({ code, host_user_id: "other", language: "en" });
    expect(dupCode.error?.code).toBe("23505");

    // One seat per user per room.
    const dupSeat = await server.from("players").insert({
      room_id: roomId,
      user_id: "rls-test-player",
      nickname: "again",
      language: "en",
    });
    expect(dupSeat.error?.code).toBe("23505");

    // One answer per player per stage.
    const { data: player } = await server
      .from("players")
      .select("id")
      .eq("room_id", roomId)
      .single();
    const dupAnswer = await server.from("responses").insert({
      room_id: roomId,
      player_id: (player as { id: string }).id,
      stage: "initial",
      payload: { stage: "initial", initialChoice: "no" },
    });
    expect(dupAnswer.error?.code).toBe("23505");

    // Unknown enum values are rejected.
    const badState = await server.from("rooms").update({ state: "WINNER" }).eq("id", roomId);
    expect(badState.error).not.toBeNull();
  });
});

describe.skipIf(configured)("row level security (skipped)", () => {
  it("needs Supabase credentials in .env.local", () => {
    expect(configured).toBe(false);
  });
});
