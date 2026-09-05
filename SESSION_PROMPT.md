# S2-IMPORT — Full-stack package import / 前後端整合包匯入

Import the final Desktop/maike source package into this repository, exclude secrets and generated output, verify the local memory/fixture game, and push the current branch. Preserve the original package. / 將 Desktop/maike 最終程式匯入本 repo，排除機密與產物，驗證本機 memory／fixture 遊戲並推送當前分支，保留原包。

Acceptance: lint/typecheck/build pass; local tests and desktop/mobile E2E pass; external-service skips are explicitly reported; staged files contain no local environment or deployment linkage; commit and remote match. No deployment or live database mutation is part of this import. / 驗收：lint／型別／build 通過，本機測試與桌機／手機 E2E 通過，明列外部服務跳過項目，暫存檔案不含本機環境與部署連結資料，提交與遠端一致。本次不部署、不修改線上資料庫。

## Historical S1-F scope / 以下為舊 S1-F 範圍

Owner: Kenny. Status: frontend slice verified; project S1 pending backend. / 負責人：Kenny；狀態：前端範圍已驗證，專案 S1 待後端。

## Scope / 範圍

- Runnable Next.js scaffold because the repository has no application yet. Shared setup is an initial handoff to the backend owner. / Repo 尚無程式，先建立可執行 Next.js 骨架；共用設定為交給後端負責人的初始版本。
- Bilingual, responsive create/join, host/player lobby, briefing, initial vote, private card, waiting and reveal screens using explicit local fixtures. / 雙語響應式建房／加入、主持人／玩家大廳、導讀、初答、私密卡、等待與翻牌畫面，明確使用本機固定資料。
- Dedicated frontend preview model in lib/client; no shared backend contracts are declared final. / 前端預覽模型放在 lib/client，不將後端共用介面宣告為定案。
- Do not implement app/api, Supabase, AI, authorization, multiplayer transport, final consensus or deployment. / 不實作 app/api、Supabase、AI、授權、多人傳輸、最終共識或部署。

## Acceptance / 驗收

1. Host and player routes can be opened; language can be changed without clearing selections. / 可開啟主持人與玩家路徑，切換語言不清除選擇。
2. Demo joins require the displayed six-digit fixture code and a nickname. / 加入預覽須使用畫面顯示的六位固定房號與暱稱。
3. Player can submit initial answer and card response, choose at most two reasons, reach waiting, then explicitly simulate reveal. / 玩家可提交初答與卡片答案、最多選兩個理由、進入等待，再明確模擬翻牌。
4. No other fixture answers render before reveal. Host sees completion counts, not answer controls. / 翻牌前不呈現其他示範玩家答案；主持人看完成數，不顯示玩家答題控制。
5. Build, lint, typecheck, unit and desktop/mobile browser tests pass. / build、lint、型別、單元與桌機／手機瀏覽器測試通過。
6. Record backend integration gaps honestly; this slice does not complete project S1. / 明確記錄後端串接缺口，本次前端範圍不代表專案 S1 完成。
