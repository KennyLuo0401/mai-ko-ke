# Project Status / 專案狀態

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

```sh
npm ci
npm run dev -- --hostname 127.0.0.1 --port 3100
```

Open http://127.0.0.1:3100. Demo code: 482916. Enter a nickname, or select the host tab. The server is local to the running computer, not a shared online room. / 開啟上述網址，示範房號 482916，輸入暱稱或切到主持人分頁。伺服器只在執行的電腦上，不是共用線上房間。

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
