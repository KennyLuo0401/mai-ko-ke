# 《麥擱假》Build Plan / 開發計畫

- Project: 20260904 Taiwan Future Festival Hackathon
- Updated / 更新日期: 2026-09-05
- Status / 狀態: Frontend/backend ownership confirmed; implementation not started; detailed contracts below are proposed for S0 review. / 前後端分工已確認，尚未開始實作；下方詳細介面為 S0 待確認草案。
- Product type / 產品形式: Co-located multiplayer web app / 同場多人 Web App

## 1. Product Objective / 產品目標

《麥擱假》是一款由 AI 主持的朋友思辨遊戲。主持人投入一篇令人懷疑或具有爭議的網路內容；AI 降低理解門檻、分派不同思考角度，讓玩家先獨立判斷，再看見彼此的理由，最後共同確認一張保留分歧的共識地圖。

《麥擱假》 is an AI-facilitated social thinking game. A host submits questionable or controversial online content. AI makes it easier to understand, assigns different thinking perspectives, lets players reason independently, and helps the group confirm a consensus map that preserves disagreement.

The product does not ask AI to decide who is right. Its goal is to help friends think one step deeper and understand how one another forms judgments.

產品不要求 AI 判定誰對誰錯。成功標準是讓朋友願意多想一層，並理解彼此如何形成判斷。

## 2. Locked Decisions / 已鎖定決策

- Build a web app, not a Telegram Bot. / 第一版製作 Web App，不做 Telegram Bot。
- Players are physically together and discuss face-to-face. / 玩家在同一空間，翻牌後直接口頭討論。
- No in-app chat in the MVP. / MVP 不做站內聊天室。
- The host and players use separate views. / 主持人與玩家使用不同畫面。
- Players join through a six-digit room code; QR code is optional polish. / 玩家用六位數房號加入；QR Code 屬於後期優化。
- Players answer privately before a synchronized reveal. / 玩家先秘密作答，完成後同步翻牌。
- Chinese and English player experiences are required. / 必須支援中英文玩家體驗。
- AI facilitates and aggregates; it does not score players or issue a truth verdict. / AI 負責引導與聚合，不替玩家打分或宣判真假。
- The MVP accepts pasted text first. Image input is a later session. / MVP 優先支援貼上文字；圖片輸入放在後續 Session。
- The MVP does not depend on X API access. / MVP 不依賴 X API。

## 3. Explicitly Out of Scope / 明確不做

- KOL reputation scores / KOL 長期信用分數
- Bot or fake-account detection / 機器人或假帳號偵測
- Automatic fact-checking verdicts / 自動事實查核判決
- Remote chat or voice rooms / 遠端聊天或語音房
- Social-media account login / 社群帳號登入
- X API integration or guaranteed URL extraction / X API 或保證能擷取所有連結
- Speed-based scoring, streaks, winners, or leaderboards / 手速計分、連勝、勝負與排行榜
- Native mobile applications / 原生手機 App

These items must not be added unless the build plan is explicitly revised.

除非正式更新本計畫，否則不得順手加入以上功能。

## 4. Core User Flow / 核心流程

~~~text
Host creates a room / 主持人建立房間
        ↓
Players join with code and choose name/language
玩家輸入房號、暱稱與語言
        ↓
Host pastes source material / 主持人貼入素材
        ↓
AI creates a neutral briefing / AI 產生中立導讀
        ↓
Players answer privately / 玩家秘密快押
        ↓
Each player receives a different thinking card
每人收到不同思考卡
        ↓
All players complete → synchronized reveal
全員完成 → 同步翻牌
        ↓
Face-to-face discussion / 面對面討論
        ↓
Players submit their final position / 玩家再次表態
        ↓
AI drafts consensus statements / AI 起草共識候選
        ↓
Players approve, revise, or reject / 玩家確認、要求修改或反對
        ↓
Final consensus map / 最終共識地圖
~~~

A normal session should finish in three to five minutes, excluding optional face-to-face discussion.

一般遊戲流程應在三至五分鐘內完成，不含玩家自行延長的面對面討論。

## 5. Universal 3-1-1 Framework / 通用 3-1-1 框架

Each player receives:

每位玩家會收到：

1. Three single-choice questions / 三個單選題
   - Initial view / 初始立場
   - Reaction to the assigned perspective / 對抽卡角度的反應
   - Change in position / 觀點變化
2. One multiple-choice question / 一個複選題
   - Select no more than two major reasons / 最多選兩個主要理由
3. One final yes-no-uncertain question / 一個「是／不是／不確定」問題
   - One optional short comment / 僅有一個選填簡短補充

“Uncertain” or “not enough information” must always be available. The system must not manufacture false certainty.

「不確定／資訊不足」必須永遠存在，系統不得逼迫玩家製造虛假確定性。

## 6. Technical Architecture / 技術架構

Recommended stack / 建議技術：

- Next.js with TypeScript and App Router
- Supabase Postgres, Anonymous Auth, Realtime, and Row Level Security
- OpenAI Responses API for text analysis and Structured Outputs
- Vitest for unit tests
- Playwright for two-browser end-to-end tests

~~~text
Host browser ─────┐
                  ├── Next.js application
Player browsers ──┘        │
                           ├── Route Handlers
                           ├── Supabase Auth + Postgres + Realtime
                           └── OpenAI Responses API
~~~

Use Supabase Postgres Changes for the first version because it has lower setup complexity. Do not optimize for large-scale Broadcast until there is evidence that the MVP needs it.

第一版使用設定較簡單的 Supabase Postgres Changes；在沒有實際規模需求前，不提前導入 Broadcast 優化。

All privileged database operations and OpenAI calls run through server-side Route Handlers. Service-role credentials must never be exposed to the browser.

所有高權限資料庫操作與 OpenAI 呼叫都必須經過伺服器端 Route Handlers；service-role 金鑰不得出現在瀏覽器。

## 7. State Machine / 遊戲狀態機

State transitions are deterministic code, not AI decisions.

狀態轉換由確定性程式控制，不交給 AI 判斷。

~~~text
LOBBY
→ MATERIAL_SUBMITTED
→ BRIEFING_READY
→ INITIAL_VOTE
→ PRIVATE_CARD
→ READY_TO_REVEAL
→ REVEALED
→ IN_PERSON_DISCUSSION
→ FINAL_VOTE
→ CONSENSUS_REVIEW
→ COMPLETED
~~~

Rules / 規則：

- Only the host can advance host-controlled phases. / 只有主持人能推進主持階段。
- Reveal occurs exactly once and only after all active players finish. / 只有所有有效玩家完成後才能翻牌，且只能發生一次。
- Late joins are disabled after private voting begins. / 秘密快押開始後禁止新玩家加入。
- State transitions must be idempotent. / 狀態轉換必須具備冪等性。
- Player answers remain private until reveal. / 翻牌前不得向其他玩家洩漏答案。

## 8. Minimum Data Model / 最小資料模型

- rooms: room code, host, language, state, timestamps
- players: room, anonymous user ID, nickname, language, active status
- materials: source text, host question, processing status
- game_packages: neutral briefing, extracted claims, generated cards, schema version
- assignments: player-to-card assignment
- responses: initial, card, and final structured answers
- consensus_statements: AI-drafted statements and category
- consensus_votes: agree, needs revision, or disagree

Use exact identifiers for deduplication. Room codes must have a unique database constraint, and collision handling must generate a new code rather than use fuzzy matching.

去重必須使用精確 ID。房號要有資料庫唯一約束；碰撞時重新產生房號，不使用模糊比對。

## 9. AI Boundary and Contract / AI 邊界與介面

AI may perform:

AI 可以處理：

- Neutral plain-language briefing / 中立白話導讀
- Claim and evidence-boundary extraction / 主張與證據邊界抽取
- Thinking-card generation / 思考卡產生
- Chinese-English localization / 中英文轉換
- Viewpoint clustering and summary / 觀點聚類與摘要
- Drafting consensus candidates / 起草共識候選

Code must perform:

一般程式必須處理：

- Routing and authorization / 路由與權限
- Room and player state / 房間與玩家狀態
- Question counts and option limits / 題數與選項上限
- Completion checks and reveal timing / 完成檢查與翻牌時機
- Vote aggregation / 投票統計
- Retry, timeout, and validation / 重試、逾時與驗證

Required interface / 必要介面：

~~~text
analyzeMaterial(input) → GamePackage
draftConsensus(input) → ConsensusPackage
~~~

Both outputs must use versioned JSON Schemas with strict validation. External API calls use three attempts with exponential backoff. Invalid model output is an error, not permission to continue with malformed data.

兩種輸出都必須使用具版本的 JSON Schema 嚴格驗證。外部 API 使用三次 exponential backoff。模型輸出不符合 schema 時必須明確失敗，不得帶著錯誤資料繼續。

## 10. Two-computer Ownership / 兩台電腦分工

Before parallel work, both developers must start from the same committed scaffold, contracts, fixture, and environment template.

並行前，兩位開發者必須從相同的 scaffold、介面、fixture 與環境變數範本開始。

### Developer A — Kenny: Frontend / 開發者 A：Kenny，前端

Owns / 負責：

- app/**/page.tsx, app/**/layout.tsx, frontend styles / 頁面、版面與前端樣式
- components/**
- lib/client/**, frontend translation resources / 前端資料串接與介面翻譯
- tests/frontend/**, tests/e2e/**
- Host/player screens, room forms, lobby, private voting, reveal, consensus UI, loading/errors, client subscriptions, mobile usability, bilingual copy and demo cases. / 主持人與玩家畫面、房間表單、大廳、秘密作答、翻牌、共識介面、載入與錯誤、前端訂閱、手機操作、雙語文案與展示素材。

### Developer B — Collaborator: Backend and Integration / 開發者 B：朋友，後端與整合

Owns / 負責：

- app/api/**
- lib/game/**, lib/server/**, lib/contracts/**
- supabase/**
- lib/ai/**
- lib/ai/schemas/**
- lib/ai/prompts/**
- lib/ai/fixtures/**
- tests/backend/**, tests/ai/**, database-policy tests / 資料庫權限測試
- package.json, lockfile, .env.example, shared tooling and deployment configuration / 共用工具與部署設定
- Room APIs, identity, authorization, RLS, persistence, state transitions, safe Realtime events, AI briefing/cards/localization/consensus, validation, retry and deployment. / 房間 API、身分、授權、RLS、儲存、狀態轉換、安全同步事件、AI 導讀／卡片／翻譯／共識、驗證、重試與部署。

Neither developer edits the other developer’s files without coordination. Developer B maintains shared contracts and package configuration; both developers must agree on interface changes before implementation. Backend authority is required for reveal, completion, vote counts and access control; frontend button states are presentation only.

未協調不得修改對方負責的檔案。共用介面與套件設定由朋友維護；介面變更須兩人確認後才實作。翻牌、完成條件、票數與權限由後端決定，前端按鈕狀態只負責呈現。

Git branches / Git 分支：

~~~text
main
├── feat/frontend
└── feat/backend
~~~

Developer B owns merges to main and deployment. Both developers review changes affecting their boundary. Main must remain runnable at every checkpoint. This frontend/backend split supersedes the previous game/AI ownership split.

由朋友負責合併 main 與部署，兩人各自確認涉及自己的串接邊界。每個檢查點的 main 都必須可執行。本版前後端分工取代舊版遊戲／AI 分工。

## 11. Session Roadmap / Session 路線

### S0 — Shared Starting Point / 共同起點

- B creates the runnable scaffold, shared contracts, deterministic bilingual fixtures, environment template and verification commands; A validates that fixtures cover every required screen. / 朋友建立可執行骨架、共用介面、雙語固定資料、環境範本與驗證指令；Kenny 確認資料涵蓋必要畫面。
- Agree on the proposed API and gameplay details in sections 18–22. These are design proposals, not existing code. / 確認第 18–22 節的 API 與遊戲細節草案；這些是設計提案，不是現有程式。
- Both developers branch from the same commit. A can run the frontend with fixture data without AI credentials. / 兩人從同一 commit 開分支，Kenny 不需 AI 金鑰即可用固定資料執行前端。
- Deliver SESSION_PROMPT.md and PROJECT_STATUS.md before implementation; keep BUILD_PLAN.md as the scope source. / 實作前建立 SESSION_PROMPT.md 與 PROJECT_STATUS.md，BUILD_PLAN.md 維持為範圍依據。
- Acceptance: agreed contracts, one fixture-driven screen, reproducible startup and successful scaffold build/lint. / 驗收：介面確認、一個固定資料驅動畫面、可重現啟動、骨架 build/lint 通過。

### S1 — Deterministic Game Skeleton / 固定資料遊戲骨架

Scope / 範圍：

- Initialize Next.js and Supabase integration.
- Create room, six-digit code, anonymous join, nickname, and language.
- Use a deterministic fixture instead of AI.
- Complete private initial vote, private card, waiting state, and synchronized reveal.
- Run the flow in two independent browser contexts.

Acceptance / 驗收：

- Two players can join the same room from separate browsers.
- Players cannot read one another’s answers before reveal.
- Reveal fires once after all active players finish.
- Chinese and English player views work with fixture content.
- Unit, database-policy, build, and E2E checks pass.

Stop point / 中止點：

Do not integrate OpenAI until the deterministic end-to-end flow passes.

固定資料的端到端流程通過前，不得接入 OpenAI。

### S2 — AI Briefing and Thinking Cards / AI 導讀與思考卡

Scope / 範圍：

- Implement analyzeMaterial with Structured Outputs.
- Support pasted text.
- Generate neutral briefing, claims, and player cards.
- Apply player-language localization.
- Add three-attempt exponential backoff.
- Replace only the deterministic analysis adapter.

Acceptance / 驗收：

- Valid inputs produce schema-valid GamePackage objects.
- Invalid AI output is rejected and visible to the host.
- Retry behavior is tested deterministically.
- Existing S1 E2E tests continue to pass.

### S3 — Final Position and Consensus Map / 最終立場與共識地圖

Scope / 範圍：

- Add in-person discussion phase controlled by the host.
- Collect final player positions.
- Draft consensus candidates.
- Let every player mark Agree, Needs revision, or Disagree.
- Publish a map of agreement, disagreement, missing evidence, and uncertainty.

Acceptance / 驗收：

- AI cannot approve its own consensus statements.
- Minority views remain present.
- Only player-approved statements enter “We agree.”
- The complete two-player game finishes without manual database changes.

### S4 — Demo Polish / Demo 優化 — SKIPPABLE

Scope / 範圍：

- Image input
- QR code joining
- Mobile visual polish
- Curated bilingual demo cases

Stop point / 中止點：

If S1–S3 are not stable, skip S4 and demo the text-only core flow.

若 S1–S3 尚未穩定，停止 S4，以文字版核心流程參賽。

### Release Gate — Deployment and Rehearsal / 必要發布關卡：部署與彩排

- Deployment and final rehearsal are required for a shareable demo, independent of optional S4. / 可分享的 demo 必須部署與彩排，不屬於可跳過的 S4。
- B deploys and records the URL and required configuration; A checks mobile layouts and runs the full bilingual flow with B on separate devices. / 朋友部署並記錄網址與必要設定；Kenny 檢查手機版，兩人以不同裝置跑完雙語流程。
- Agree on room-data deletion behavior before public deployment, and verify it works. / 公開部署前確認房間資料刪除方式並驗證。
- Acceptance: the deployed host-plus-two-player flow passes, no browser secrets are exposed, and deployment URL, test results and limitations are recorded. / 驗收：部署環境通過主持人加兩位玩家流程、瀏覽器未暴露機密，並記錄網址、測試結果與限制。

## 12. Verification Strategy / 驗證策略

Every Session must run:

每個 Session 必須執行：

- Unit tests for pure state and validation logic
- RLS allow-and-deny tests for every exposed table
- Production build
- Lint
- Playwright E2E for the host and two-player path

Critical E2E scenario / 核心 E2E：

1. Host creates room. / 主持人建立房間。
2. Two anonymous players join in separate browser contexts. / 兩位匿名玩家從不同瀏覽器加入。
3. Host submits fixture material. / 主持人提交固定素材。
4. Players answer privately. / 玩家秘密作答。
5. No answers leak before reveal. / 翻牌前答案不外洩。
6. All players finish and reveal occurs once. / 全員完成並只翻牌一次。
7. Players submit final positions. / 玩家提交最終立場。
8. Consensus statements require player approval. / 共識敘述必須經玩家確認。
9. Final map preserves unresolved disagreement. / 最終地圖保留未解分歧。

No Session is complete until all existing tests pass with zero failures and the status documents are updated.

所有既有測試零失敗且狀態文件完成更新前，不得宣告 Session 完成。

## 13. Security and Privacy / 安全與隱私

- Enable RLS on every exposed Supabase table. / 所有對外資料表都必須啟用 RLS。
- Test both permitted and denied database actions. / 同時測試允許與拒絕的資料操作。
- Keep service-role and OpenAI keys server-side. / service-role 與 OpenAI 金鑰只能存在伺服器端。
- Validate material length and supported input types at the system boundary. / 在系統邊界驗證素材長度與輸入類型。
- Do not expose one player’s private answers to another before reveal. / 翻牌前不得洩漏玩家答案。
- Do not send raw player identifiers to the AI provider; use a stable pseudonymous safety identifier if required. / 不將玩家真實識別資料送給 AI；需要時使用穩定假名識別碼。
- Define deletion behavior for room data before public deployment. / 公開部署前必須定義房間資料刪除機制。

## 14. Known Risks / 已知風險

- AI may frame the source material in a biased way. Mitigation: require neutral schema fields and show the original text beside the briefing.
- AI 可能帶入框架偏誤。對策：固定中立欄位，並讓原文與導讀並列。
- Realtime and RLS may silently hide events. Mitigation: policy tests and two-browser E2E.
- Realtime 與 RLS 可能讓事件被靜默阻擋。對策：政策測試與雙瀏覽器 E2E。
- Players may not understand specialist content. Mitigation: one short excerpt, plain-language context, and an explicit knowledge-boundary option.
- 玩家可能不懂專業內容。對策：一次只給短片段、白話背景與「不熟悉」選項。
- Consensus summaries may erase minority views. Mitigation: player confirmation and a separate disagreement section.
- 共識摘要可能抹除少數意見。對策：玩家確認與獨立分歧區。
- External links, especially X, may not be readable. Mitigation: pasted text is the supported MVP input.
- 外部連結尤其 X 可能無法讀取。對策：MVP 正式支援貼上文字。

## 15. Current Blockers and Open Decisions / 目前阻礙與待決

- No application scaffold exists yet. / 尚未建立應用程式 scaffold。
- Supabase project and credentials are not configured. / 尚未設定 Supabase 專案與金鑰。
- OpenAI model and budget limits are not selected. / 尚未選擇 OpenAI 模型與預算上限。
- Deployment provider is not selected. / 尚未選擇部署平台。
- Ownership confirmed: Kenny owns frontend; the collaborator owns backend and integration. / 分工已確認：Kenny 負責前端，朋友負責後端與整合。
- Detailed API contracts and gameplay defaults in sections 18–22 require agreement at S0. / 第 18–22 節的詳細 API 與遊戲預設須在 S0 確認。

These do not block repository initialization or document creation. They must be resolved before the relevant implementation Session.

以上不影響初始化 repo 與建立文件，但必須在對應 Session 開始前解決。

## 16. Definition of First Version / 第一版完成定義

The first version is complete when Kenny and one friend can use two computers to join the same room, read a bilingual neutral briefing, answer privately, reveal simultaneously, discuss face-to-face, submit final positions, and approve a consensus map that preserves disagreement.

當 Kenny 與一位朋友能用兩台電腦加入同一房間，閱讀雙語中立導讀、秘密作答、同步翻牌、面對面討論、提交最終立場，並共同確認一份保留分歧的共識地圖，才算完成第一版。

## 17. Technical References / 技術參考

- Next.js Route Handlers: https://nextjs.org/docs/app/getting-started/route-handlers
- Next.js Testing: https://nextjs.org/docs/app/guides/testing
- Supabase Anonymous Sign-Ins: https://supabase.com/docs/guides/auth/auth-anonymous
- Supabase Row Level Security: https://supabase.com/docs/guides/database/postgres/row-level-security
- Supabase Realtime with Next.js: https://supabase.com/docs/guides/realtime/realtime-with-nextjs
- OpenAI Responses API: https://developers.openai.com/api/reference/cli/resources/responses/methods/create
