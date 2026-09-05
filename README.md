# 《麥擱假》 Māi koh ké

**[Live demo / 線上展示](https://mai-ko-ke.vercel.app)** ·
**[MIT License](./LICENSE)** ·
**[Third-party disclosure / 第三方揭露](./THIRD_PARTY_NOTICES.md)** ·
**[Submission status / 繳交狀態](./SUBMISSION.md)**

## Problem and summary / 問題與摘要

網路討論容易讓人急著站隊，卻很少說清楚判斷背後的理由。《麥擱假》把一則有爭議的內容變成同場朋友的思辨遊戲：玩家先秘密表態，再收到不同角度的思考卡，完成後一起翻牌、面對面討論，最後確認一張保留共識、分歧與資訊缺口的地圖。AI 負責白話導讀與整理觀點，不判定真假或替玩家打分。支援中英文與手機操作，讓不熟悉議題的人也能參與。

Online discussions often reward taking sides before explaining reasons. Mai Ko
Ke gives each person space to decide independently, examine another angle and
understand disagreement without asking AI to declare a winner.

An AI-facilitated social thinking game for friends in the same room. A host
drops in a doubtful post; the facilitator writes a neutral briefing and deals
each player a **different** thinking card; everyone answers privately, reveals
together, argues face to face, and ends on a **consensus map that preserves
disagreement**.

> 不用想得一樣，但可以多想一點。
> You don't have to agree. Just bring a reason.

- Scope and roadmap: **[BUILD_PLAN.md](./BUILD_PLAN.md)**
- Current state, verification results and limitations: **[PROJECT_STATUS.md](./PROJECT_STATUS.md)**
- Session checklist: **[SESSION_PROMPT.md](./SESSION_PROMPT.md)**

## Run it

Use **Node.js 24.x and npm 11.x** (verified locally with Node 24.12.0 and npm
11.6.2), Git, and a current browser. Clone the repo before installing. /
請先準備以上執行環境、Git 與現代瀏覽器，再下載專案。

```bash
git clone https://github.com/KennyLuo0401/mai-ko-ke.git
cd mai-ko-ke
npm ci
cp .env.example .env.local     # works as-is; no credentials needed
npm run dev                    # http://localhost:3001
```

A full round needs **three browser contexts** — the host is a separate role and
does not vote. Use separate profiles or incognito windows: identity is a cookie,
so two tabs in one profile are the same player.

1. Host → **我來開房 / Host a room** → **開一間房**, then read out the six-digit code.
2. Each player → enter the code and a nickname.
3. Host → **填入示範素材** (or paste your own) → **產生中立導讀**.

| Command | What it does |
|---|---|
| `npm run dev` | Dev server on port 3001 |
| `npm run build` | Production build |
| `npm run lint` / `npm run typecheck` | ESLint / TypeScript |
| `npm run test` | Vitest — UI rules, game rules, state machine, schemas, store flow |
| `npm run test:e2e` | Playwright — host + two players, desktop and mobile |
| `npm run smoke` | HTTP smoke test of the whole flow against a running server |
| `npm run verify` | lint + typecheck + test + build |

Playwright needs its browser once: `npx playwright install chromium`.
Next 16 allows only one dev server per project directory, so `test:e2e` reuses
the one started by `npm run dev`.

For an offline presentation backup after dependencies/browser installation,
keep `MKK_STORE=memory` and `MKK_ANALYSIS_ADAPTER=fixture`: no Supabase/OpenAI
credentials are needed. The fixed briefing is not a live analysis of arbitrary
pasted text. Video/submission items still awaiting the team are listed in
[SUBMISSION.md](./SUBMISSION.md). / 安裝依賴後可用 memory／fixture 作為本機展示備援；固定導讀不代表任意貼文的即時 AI 分析。影片與報名待辦另見繳交文件。

## How it is put together

```
Host browser ─┐
              ├── Next.js 16 (App Router)
Players ──────┘        ├── app/api/**            Route Handlers (all authority)
                       ├── lib/contracts/        the shared interface
                       ├── lib/game/**           state machine + rules (pure)
                       ├── lib/server/store.ts   persistence + transitions
                       └── lib/ai/**             analyzeMaterial / draftConsensus
```

Three boundaries are deliberate and worth keeping:

**1. The AI never judges.** `lib/ai/` writes a briefing, extracts claims with
their *evidence boundary*, generates cards and drafts consensus candidates. It
never decides truth, never scores a player and never approves its own
statements. Final placement in the map is computed by `lib/game/rules.ts` from
player votes alone.

**2. State transitions are code.** `lib/game/machine.ts` is pure and total.
Reveal fires exactly once, only after every player on the frozen roster has
answered, and only the server decides it — button states are presentation only.

**3. Privacy is enforced server-side.** `getRoomView()` is the single
role-filtered read model. Before the reveal it returns only the caller's own
answers and card — the host is not a back door either.

### Two adapters, one seam

`MKK_ANALYSIS_ADAPTER` picks where briefings come from:

- **`fixture`** (default) — a deterministic bilingual package. No API key, no
  network, same output every time. Returns the same package for any input.
- **`openai`** — the OpenAI Responses API with Structured Outputs and three
  attempts with exponential backoff. Set `OPENAI_API_KEY` and `OPENAI_MODEL`.

Both pass the same strict versioned schemas in `lib/ai/schemas.ts`. Malformed
model output is a visible failure with a retry, never data the game carries on
with.

### Storage

`MKK_STORE=memory` (default) keeps rooms **in-process**, with no external
credentials. Rooms are lost on restart and do not work across multiple server
instances. Use it for local play and tests.

`MKK_STORE=supabase` uses the included Postgres backend. Apply the migrations in
`supabase/migrations/` in order and configure the Supabase variables before
deployment. Set a unique `MKK_SESSION_SECRET`; never deploy the template value.
`MKK_HOST_KEY` optionally restricts who can create rooms.

Live OpenAI and database tests skip when their credentials are absent. The
Supabase flow suite resets room data: run it only against a dedicated disposable
test project, never the deployed game's database.
