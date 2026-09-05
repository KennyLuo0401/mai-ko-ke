import { fileURLToPath } from "node:url";
import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";

const root = fileURLToPath(new URL(".", import.meta.url)).replace(/\/$/, "");

// Load .env.local so the Supabase, RLS and OpenAI suites can find credentials.
// The empty prefix loads every variable, not just NEXT_PUBLIC_ ones.
//
// The defaults are then pinned back to the deterministic pair regardless of what
// the developer is currently running the app on: the base suite must be fast,
// free and repeatable. The suites that need the real thing opt in explicitly —
// supabase-flow.test.ts sets MKK_STORE itself, and openai.test.ts calls the
// adapter directly rather than through this setting.
// 基礎測試一律使用固定資料與記憶體後端；需要真實服務的測試自行切換。
const env = {
  ...loadEnv("", root, ""),
  MKK_STORE: "memory",
  MKK_ANALYSIS_ADAPTER: "fixture",
};

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/frontend/**/*.test.ts", "tests/backend/**/*.test.ts"],
    env,
    // The Supabase suites share one project, so they must not interleave.
    fileParallelism: false,
    // A full round against a hosted Postgres is many round trips.
    testTimeout: 60_000,
  },
  resolve: { alias: { "@": root } },
});
