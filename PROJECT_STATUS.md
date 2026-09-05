# Project Status / 專案狀態

## 2026-09-06 — S3-F Entry layout stability / 首頁分頁穩定

Join and host panels share a content-sized grid area; the inactive panel remains in layout but is invisible and inert. Switching tabs keeps the card, heading, hero and footer stationary without a fixed pixel height. No backend changes. / 加入與開房面板共用依內容決定高度的網格，未選取面板保留空間但隱藏且不可操作；切換不再推動卡片、標題、標語與頁尾，不寫死像素高度，未修改後端。

Verification: reproduced failures before the fix; all 10 desktop/mobile E2E tests pass, including Chinese/English and gated/ungated layout checks. `npm run verify` passes lint, typecheck, build and 99 tests; 24 live-service tests remain skipped because external credentials are absent. Existing Playwright color-environment warnings remain. Not pushed or deployed in this session. / 修前已重現失敗；修後桌機／手機共 10 項 E2E 通過，涵蓋中英文及有無通行碼；lint、型別、建置與 99 項測試通過，24 項外部服務測試因未配置憑證跳過。既有瀏覽器測試色彩環境提示仍存在，本次未推送或部署。

**場景**：首頁切換加入／開房時，內容高度不同使周圍版面跳動。
**教訓**：同一張入口卡片的分頁應共用足夠的自然高度，並驗證周圍元素位置不變。
**適用**：本專案首頁分頁與響應式版面調整。

## 2026-09-06 — Submission documentation / 繳交文件

Added MIT LICENSE, third-party package/model/data/asset disclosure, README demo link/problem summary/runtime setup, and SUBMISSION.md mapped to the organizer checklist. Team/track/sponsor/video/receipt items remain explicitly pending; no form was submitted or deployment performed. Public identity/path review remains a team check. / 補齊 MIT 授權、第三方揭露、README 展示網址／摘要／環境與繳交檢查文件；隊伍、賽道、贊助、影片與送出證明仍明列待完成，本次未填報表單或部署，公開身分與路徑資料仍待團隊確認。

## 2026-09-06 — Final package import / 最終整合包匯入

Imported source from `/Users/kenny/Desktop/maike` into this repo on `feat/frontend`, preserving the original folder. This entry supersedes older statements about the local checkout; prior deployment/test reports below are historical and were not revalidated against live services in this import. / 從桌面 maike 匯入前後端至本 repo 的 feat/frontend，保留原資料夾。本節優先於舊的本機狀態；下方既有部署與測試紀錄屬歷史，本次未對線上服務重新驗證。

- Included app/API, components, contracts, client/game/server/AI modules, migrations, tests, scripts, lockfile and documentation. Removed four superseded preview files; recoverable from commit 0f9d0c1. / 納入前後端程式、介面、migration、測試、腳本、lockfile 與文件；移除四個舊預覽檔，可從 0f9d0c1 恢復。
- Excluded `.next`, `.vercel`, `node_modules`, local `.env` files, test/build artifacts, `.DS_Store` and `*.tsbuildinfo`. Kept the locally generated next-env.d.ts. / 排除快取、部署連結、本機機密、依賴與產物；保留本機生成的 next-env.d.ts。
- Sanitized Supabase/OpenAI credential fields in `.env.example`; added empty optional MKK_HOST_KEY. Common credential-pattern scan found no matches in 69 candidate source/config/document files; ignore rules checked explicitly. This is not an exhaustive security audit. / 清空範本的 Supabase／OpenAI 憑證欄位，新增空白 MKK_HOST_KEY；69 個候選檔案的常見憑證格式掃描無命中，已確認 ignore 規則。這不等於完整安全稽核。
- Fixed RLS test initialization: clients are now constructed inside beforeAll, so an unconfigured suite can actually skip. / 修正 RLS 測試初始化時機，使未配置憑證的測試可以正常跳過。
- `npm run verify`: lint/typecheck/build passed; 99 tests passed, 24 skipped, zero failures. `npm run test:e2e`: 6 passed, zero failures (desktop/mobile, real local host + two player contexts, memory storage and fixture AI). / lint、型別、build 通過；99 項測試通過、24 項跳過、零失敗；桌機／手機真實本機主持人加雙玩家流程共 6 項通過。
- Skipped suites: live RLS, Supabase flow, and live OpenAI because no external credentials were loaded. Supabase flow tests reset room data; use a dedicated disposable test project before running them. / 未載入外部金鑰，跳過真實 RLS、Supabase 流程與 OpenAI；Supabase 測試會重設房間資料，須使用獨立可拋棄的測試專案。
- npm reported 0 vulnerabilities. Existing ESLint 9 deprecation and Playwright color-environment warnings remain. No deployment was performed. / npm 稽核零漏洞；既有 ESLint 9 淘汰與 Playwright 色彩環境提示仍存在。本次未部署。

## Homepage copy revision / 首頁文案調整

English headline uses exactly two lines: “You don’t have to agree.” / “Just bring a reason.” Font size adapts to the column width to keep each sentence intact. / 英文主標依最新指定固定兩行，每句各一行，字級依欄寬調整以保持句子完整。

Rotated the headline and its two orange quotation marks together 6 degrees counterclockwise, per the updated request. / 依最新要求，將主標與兩個橘色雙引號整體逆時針旋轉 6 度。

Promoted “不用想得一樣，但可以多想一點。” to the main headline, replacing the previous heading. Added orange opening/closing quotation marks at the headline’s upper-left/lower-right corners; English and mobile layouts updated too. / 將「不用想得一樣，但可以多想一點。」放大為主標，取代舊標題；主標左上／右下加入橘色雙引號，同步英文與手機版。

Removed the six circled homepage elements in both languages: intro eyebrow, three-item metadata row, quote attribution, orange card arrow, preview hint and bottom three-step guide. / 依截圖移除六處首頁元素並同步英文：主標上方小字、三項資訊列、引言旁註、卡片橘色箭頭、預覽提示、底部三步驟說明。

**場景**：首頁加入多處裝飾性小字，使用者圈選要求移除。 / **Context**: The user requested removal of ornamental homepage copy.
**教訓**：首頁保持精簡，依指定圈選刪除，不自行補回同類說明。 / **Lesson**: Keep homepage copy concise and do not replace removed copy with equivalent clutter.
**適用**：本專案首頁文案與視覺調整。 / **Applies to**: Homepage copy and visual changes in this project.

## S1-F — Frontend / 前端

Frontend slice implemented and verified on feat/frontend. / 前端範圍已在 feat/frontend 實作並驗證。

- Next.js 16.3.4 + React 19.2.8 + TypeScript; npm lockfile; tested with Node 24.12.0 and npm 11.6.2. / 使用以上版本與 npm lockfile，已在所列環境驗證。
- Chinese/English home, demo join validation, host/player lobby, fixed briefing, initial vote, thinking card, waiting and reveal. / 中英文首頁、示範加入驗證、主持人／玩家大廳、固定導讀、初答、思考卡、等待與翻牌。
- Language changes preserve in-memory selections; reason selection is limited to two; no other sample answers render before reveal. / 切換語言保留記憶體中的選擇；理由最多兩項；翻牌前不呈現其他示範答案。
- Desktop, phone and thinking-card screenshots visually checked; no horizontal overflow in tested desktop/mobile layouts. / 已檢視桌機、手機及思考卡截圖，測試的桌機／手機版無水平溢出。

## Run locally / 本機執行

> Updated at S1-B: rooms are now real, so there is no fixed demo code. / S1-B 後房間為真實建立，已無固定示範房號。

```sh
npm ci
cp .env.example .env.local   # works as-is; no credentials needed
npm run dev                  # http://localhost:3001
```

Open http://localhost:3001. One person opens a room and reads out the six-digit code; the others join with it. Use **separate browser profiles or incognito windows** — identity is a cookie, so two tabs in one profile are the same player. The host is a separate role and does not vote, so a full round needs three contexts. The server is local to the running computer, not a shared online room. / 一人開房並唸出六位數房號，其他人輸入加入。請使用**不同瀏覽器設定檔或無痕視窗**：身分存在 cookie，同一設定檔的兩個分頁會被視為同一位玩家。主持人為獨立角色不投票，完整一局需要三個環境。伺服器只在執行的電腦上，不是共用線上房間。

## Verification / 驗證

| Command / 指令 | Result / 結果 |
|---|---|
| npm run build | Passed; home, host and player routes compiled / 通過，首頁、主持人、玩家路徑編譯成功 |
| npm run lint | Passed; 0 errors, 0 warnings / 通過，零錯誤零警告 |
| npm run typecheck | Passed / 通過 |
| npm test | 4 passed, 0 failed, 0 skipped / 4 項通過，零失敗零跳過 |
| npm run test:e2e | 6 passed across desktop/mobile, 0 failed, 0 skipped / 桌機與手機共 6 項通過，零失敗零跳過 |
| git diff --check | Passed / 通過 |

Browser tests cover join errors, language switching without losing selections, initial/card answers, the two-reason cap, waiting/reveal, host answer-control isolation and invalid-room display. These are UI preview tests, not RLS or multi-client security tests. / 瀏覽器測試涵蓋加入錯誤、切換語言保留選擇、初答／卡片答案、理由上限、等待／翻牌、主持人無答題控制及錯誤房間顯示；這些是 UI 預覽測試，不是 RLS 或多人安全測試。

Known tooling warning: ESLint 9.39.5 is marked deprecated by npm. It is pinned because ESLint 10.10.0 fails in the React rules bundled with eslint-config-next 16.3.4. Upgrade together once compatible; do not force incompatible peers. Playwright emitted an inherited NO_COLOR/FORCE_COLOR environment warning; tests still passed. npm installation audit reported 0 vulnerabilities. / 已知工具警告：npm 將 ESLint 9.39.5 標為淘汰；目前固定此版本，因為 10.10.0 與 eslint-config-next 16.3.4 內含 React 規則實測不相容，日後須一起升級，不強制覆寫 peer 相依。Playwright 出現繼承環境 NO_COLOR／FORCE_COLOR 提示，測試仍通過。npm 安裝稽核為零漏洞。

## Backend handoff / 後端交接

No real rooms, server authorization, Supabase, AI or deployment exist yet. The full S0/S1 acceptance remains pending backend integration. / 尚無真實房間、伺服器授權、Supabase、AI 或部署。完整 S0／S1 驗收仍待後端整合。

Shared configuration files are being initialized by the frontend task because none existed; the backend owner should reuse this scaffold. / 由於原先沒有骨架，本次前端任務初始化共用設定；後端負責人請沿用此骨架。

1. Reuse package.json, package-lock.json, tsconfig.json, lint/test configs and .env.example; they are bootstrap files only, with future ownership remaining backend. / 沿用 package.json、package-lock.json、tsconfig.json、lint／測試設定及 .env.example；這些只是初始骨架，後續仍由後端負責。
2. app/api, lib/game, lib/ai, lib/contracts and supabase have not been created or changed. lib/client/preview.ts is a frontend fixture model, not the authoritative shared contract. / 未建立或修改後端目錄；lib/client/preview.ts 只是前端固定資料模型，不是權威共用介面。
3. Replace the local phase state and explicit simulation buttons in components/game-preview.tsx with authorized RoomView reads and backend actions after agreeing on the contracts. / 介面確認後，以授權 RoomView 讀取與後端動作取代 components/game-preview.tsx 的本機階段與模擬按鈕。
4. Material is deliberately read-only in the preview; hook up editable input, processing/errors and retry when the material API exists. / 預覽素材刻意唯讀；素材 API 就緒後再接可編輯輸入、處理中／錯誤與重試。
5. Reloading resets preview progress. Reconnect recovery, persisted responses, real late-join rejection, actual reveal concurrency and RLS remain unimplemented. / 重整會重設預覽進度；重連恢復、持久化答案、真實遲加入限制、並行翻牌與 RLS 尚未實作。
6. No database-policy or true host-plus-two-player synchronization checks were run because no backend exists. No AI calls, final vote, consensus UI or deployment are included in S1-F. / 後端尚不存在，未執行資料庫權限或真實主持人加雙玩家同步驗證。S1-F 不包含 AI 呼叫、最終投票、共識介面或部署。

The verified frontend task is committed and pushed to `origin/feat/frontend`; it has not been merged into `main` or deployed. / 已驗證的前端任務已 commit 並推送至 `origin/feat/frontend`；尚未合併至 `main` 或部署。

## S1-B — Backend integrated into the frontend / 後端已接上前端

The preview is now a real game. The frontend's visual language, copy and layout are unchanged; every phase, count, card and reveal now comes from the server's authorized `RoomView`. / 預覽已成為真實遊戲：視覺、文案與版面維持不變，所有階段、計數、卡片與翻牌改由伺服器授權的 `RoomView` 提供。

Answering the six handoff points above, in order / 依序回應上方六點交接：

1. Reused as-is: package.json, lockfile, tsconfig, ESLint flat config, Playwright config. Added scripts `smoke` and `verify`; `dev` now serves port 3001; Playwright reuses that one dev server because Next 16 allows only one per project directory. / 沿用既有設定，新增 `smoke` 與 `verify`；`dev` 改為 3001，Playwright 共用同一台，因為 Next 16 每個專案目錄只允許一台 dev server。
2. Created `lib/contracts/index.ts` as the authoritative shared interface (encodes BUILD_PLAN §19–§21), plus `lib/game`, `lib/server`, `lib/ai` and `app/api`. / 建立權威共用介面與後端目錄。
3. `components/game-preview.tsx` and `lib/client/preview.ts` are replaced by `components/game-room.tsx` and `lib/client/game-ui.ts`. Simulation buttons are gone; host controls now call `/advance` and the server decides. Fixture data moved server-side; the UI receives bilingual `LocalizedText`. / 模擬按鈕已移除，主持人操作改呼叫後端；固定資料移至伺服器。
4. Material input is editable for the host, with processing, error and retry states wired. / 素材輸入已可編輯，並接上處理中／錯誤／重試。
5. Reload now restores the current phase and saved answers from the server. Late joins are rejected once the roster freezes; reveal is atomic and fires exactly once. **RLS does not exist** — see limitation below. / 重整可恢復階段與答案；名單凍結後拒絕遲加入；翻牌具原子性且只發生一次。**RLS 仍不存在**。
6. Host-plus-two-player synchronization is now verified in three isolated browser contexts, and the final vote, consensus review and consensus map are implemented. / 已用三個隔離瀏覽器環境驗證主持人加兩位玩家；最終表態、共識確認與共識地圖皆已實作。

### Verification / 驗證 (S1-B)

| Command / 指令 | Result / 結果 |
|---|---|
| npm run lint | Passed; 0 errors, 0 warnings / 通過 |
| npm run typecheck | Passed / 通過 |
| npm test | 70 passed, 0 failed, 0 skipped / 70 項通過 |
| npm run test:e2e | 6 passed across desktop/mobile, 0 failed / 桌機與手機共 6 項通過 |
| npm run smoke | 21 passed, 0 failed / 21 項通過 |
| npm run build | Passed; 12 routes / 通過，12 條路由 |

Tested with Node 24.15.0 and npm 11.12.1. Privacy is asserted, not assumed: no answer reaches another player **or the host** before the reveal; a signed-in non-member gets `room_not_found`; publication is blocked while any required vote is missing; a single dissent moves a statement to "we differ" without deleting it. / 隱私為實測而非假設。

### Limitations that block deployment / 阻擋部署的限制

1. **No Supabase.** `lib/server/store.ts` is in-memory: rooms are lost on restart and will not work across more than one server instance. The RLS allow/deny suite in BUILD_PLAN §12 does not exist because there is no database to police. This is the gap between "runs locally" and "deployable". / 房間存在記憶體，重啟即消失，且無法跨多個執行個體；RLS 測試因無資料庫而不存在。
2. **No Realtime.** The client polls the authorized `RoomView` every 1.2s and discards stale versions. The swap is confined to `useRoomView` in `lib/client/api.ts`. / 目前為輪詢，替換點只在一個 hook。
3. **AI is off.** The OpenAI Responses adapter is written, schema-validated and retry-wrapped, but `MKK_ANALYSIS_ADAPTER` defaults to `fixture` and **no live call has ever been made from this repo**. The fixture returns the same package for any submitted text — intended for S1, and the reason S2 matters. Model, cost cap and timeout are still unchosen. / AI 尚未啟用，固定資料對任何輸入都回傳相同套件。
4. **No deployment**, and no room-data deletion policy defined or implemented (required before public deployment, §13). / 尚未部署，也未定義房間資料刪除政策。
5. Disconnects wait indefinitely, per §20.2. No host removal, timeout or skip. / 斷線無限等待，不含踢人或逾時。

## S1.5 — Supabase, and deployed / Supabase 與部署

**Live: https://mai-ko-ke.vercel.app** — real rooms, shared across devices.

Limitations 1 and 2 above are closed. Rooms now live in Postgres, so the app
works across serverless instances and survives a restart. / 房間改存 Postgres，
可跨執行個體並在重啟後保留。

### What changed / 變更

- `supabase/migrations/0001_init.sql` — 7 tables per §8, with the §21 rules as
  real database constraints: unique room code, one seat per user per room, one
  answer per player per stage, one vote per player per statement.
- **RLS denies anon and authenticated on all 7 tables.** The browser never talks
  to Postgres for game data, so RLS is the second line of defence. The one
  exception is a *column-level* grant of `(id, code, state, version)` on `rooms`
  for Realtime; `host_user_id` and `published_map` stay unreadable. / RLS 預設全
  部拒絕，僅開放 rooms 四個非機密欄位供 Realtime 使用。
- `lib/server/store.ts` was rewritten around a **compare-and-swap on `version`**
  rather than a lock, so the same logic runs on either backend. Child rows are
  written first (idempotent upserts), then the room row commits. `MKK_STORE`
  selects `memory` or `supabase`.
- Identity is still a signed httpOnly cookie, not Supabase Anonymous Auth — a
  deliberate deviation from §6, since the browser never needs database access.
  It satisfies §19 ("identity comes from the authenticated session"). Revisit if
  client-side Realtime auth is ever needed.

### Two real bugs this found / 找到的兩個真實問題

1. **A round could strand at `PRIVATE_CARD`.** The loser of a version race has
   already written its response row, so on retry it saw its own answer and
   returned early as an idempotent no-op — never evaluating the transition the
   answer completed. Fixed by falling through to the transition check.
2. **`jsonb` does not preserve key order.** An answer read back from Postgres is
   not textually identical to the one written, so the raw `JSON.stringify`
   equality check reported `duplicate_answer` on a legitimate retry. Fixed with
   `canonicalJson` in `lib/game/rules.ts`. The in-memory backend could never
   surface this, which is the argument for testing against the real database.

Both have regression tests in `tests/backend/supabase-flow.test.ts`.

Also fixed: the host's **Publish** button is now disabled until every player has
responded to every statement, instead of failing the click with a phase conflict.

### Verification / 驗證 (S1.5)

| Command / 指令 | Result / 結果 |
|---|---|
| npm run lint | Passed; 0 errors, 0 warnings |
| npm run typecheck | Passed |
| npm test | **90 passed**, 0 failed, 2 skipped (placeholders) |
| npm run test:e2e | **6 passed** desktop + mobile, against Supabase |
| npm run smoke | 21 passed, 0 failed |
| npm run build | Passed |
| smoke vs **production** | **21 passed, 0 failed** |
| test:e2e vs **production** | **3 passed** (full round in real browsers) |

The suite includes RLS allow *and* deny: a leaked browser key can read room
state and nothing else — not a player's answer, not the host id — and cannot
write anything. Database constraints are asserted too. / 已驗證 RLS 允許與拒絕。

### Deployment / 部署

Vercel project `mai-ko-ke` (`mxber2022s-projects`), deployed from the CLI.
GitHub auto-deploy is **not** connected — the Vercel account lacks write access
to `KennyLuo0401/mai-ko-ke`. Redeploy with `npx vercel deploy --prod`.

Production env vars: `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`,
`MKK_SESSION_SECRET`, `MKK_STORE=supabase`, `MKK_ANALYSIS_ADAPTER=fixture`.

## S2 — live AI / 真實 AI

**On in production.** The app now briefs whatever text is pasted, in both
languages, instead of always returning the fixture. / 已上線，能處理任何貼上的內容。

### Model choice / 模型選擇

Chosen by measurement, not assumption: three candidates were run against the
real strict schema with a real post. All three produced valid output; the
selected one was fastest.

| Model | Latency | Tokens | Schema valid |
|---|---|---|---|
| gpt-4.1-mini | 13.1s | 1349 | ✔ |
| **gpt-5.4-mini** (selected) | **9.0s** | 1812 | ✔ |
| gpt-5.4-nano | 15.5s | 2479 | ✔ |

`OPENAI_MODEL=gpt-5.4-mini`, `OPENAI_REASONING_EFFORT=low`,
`OPENAI_TIMEOUT_MS=45000`. Reasoning models think before writing, which this
task does not need — asking for low effort cut ~15s to ~9s. The parameter is
only sent to models that accept it. Cost is roughly 2 calls × ~2k tokens per
round: fractions of a cent. / 依實測選型，非猜測。

`export const maxDuration = 60` was added to the three routes that call the
model; without it the platform's default function timeout would kill a briefing
mid-flight in production. / 三個呼叫模型的路由已延長逾時。

### The fixture stays / 保留固定資料

`MKK_ANALYSIS_ADAPTER=fixture` still works and is one env var away. If the API
rate-limits or venue wifi dies mid-pitch, the app plays a complete round instead
of failing on stage. / 保留固定資料作為退路。

### Verification / 驗證 (S2)

| Command / 指令 | Result / 結果 |
|---|---|
| npm run lint / typecheck / build | Passed |
| npm test | **93 passed**, 0 failed, 3 skipped (placeholders) |
| npm run smoke (local, live AI) | 21 passed, 0 failed |
| smoke vs **production** (live AI) | **22 passed, 0 failed** |
| test:e2e vs **production** (live AI) | **3 passed** — full round in real browsers |

`tests/backend/openai.test.ts` asserts the contract, not prose: schema-valid
output, six distinct angles, bilingual everywhere, an evidence boundary on every
claim, and that the result is about the submitted text rather than the fixture.
It also asserts an unusable model **fails loudly** instead of inventing data.

The smoke script now reads reason and statement ids from the room itself, so it
passes against either adapter rather than assuming fixture ids.

### Still open / 仍未完成

1. **No Realtime yet.** The client polls every 1.2s; `rooms` is published and
   readable, so the swap is confined to `useRoomView`.
2. **No room-data deletion policy** (§13 requires one before public use).
3. Latency: a briefing takes ~9–13s and a full round ~40 API calls. The loading
   states cover it, but it is not snappy.
4. Disconnects wait indefinitely (§20.2). No host removal, timeout or skip.
5. Supabase Anonymous Auth is not used; see the deviation noted above.
6. Secrets used during this work were pasted into a chat transcript and should
   be rotated. / 開發期間貼過的金鑰應輪替。

### Next session / 下一步

**Realtime**, to replace polling and make the reveal feel instant, or **S4
polish** (image input, QR join). Both are optional; the release gate in the plan
is already met. / 可做 Realtime 或 S4 優化。
