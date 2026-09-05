# BUILDMODE 2026 submission status / 繳交狀態

Updated 2026-09-06 against the organizer-provided submission-checklist.md.
Checked boxes mean evidence was available; this is not a submission receipt.
/ 依主辦方提供的檢查表逐項記錄；勾選代表有檢查依據，不代表已送出報名。

## Links and summary / 連結與摘要

- Repository / 程式庫: https://github.com/KennyLuo0401/mai-ko-ke
- Demo / 展示: https://mai-ko-ke.vercel.app
- Project / 專案: 《麥擱假》 Māi koh ké
- 100–200 character Chinese summary / 中文摘要: README.md → 問題與摘要。
- Video URL / 影片連結: **Not supplied / 尚未提供**。

## Team / 隊伍資料

- [ ] 隊伍編號、隊名、成員與主要聯絡人正確 / Confirm team number/name/members/contact in the private submission form.
- [ ] 已選擇一條主賽道 / Select one main track.
- [ ] 僅勾選實際符合條件的 Sponsor Challenge／Bounty / Verify actual sponsor eligibility.
- [x] 專案名稱與 100–200 字摘要已校對 / Name and Chinese summary prepared in README; copy into the form when submitting.

Private contact details belong in the submission form, not the public repo. /
私人聯絡資料填在報名表，不放公開 repo。

## Code and documentation / 程式碼與文件

- [x] GitHub 儲存庫可由未登入瀏覽器直接開啟 / Checked in a fresh unauthenticated browser context on 2026-09-06, HTTP 200.
- [x] 儲存庫包含可辨識的實作內容 / main contains frontend, room APIs, AI adapters, migrations and tests.
- [x] README 包含問題、功能、架構、技術、執行方式與限制 / Added explicit problem statement and runtime requirements.
- [x] 已加入明確 LICENSE / MIT, see LICENSE.
- [x] 第三方套件、模型、資料與素材來源及授權已揭露 / See THIRD_PARTY_NOTICES.md and package-lock.json.
- [ ] 儲存庫內沒有 API Key、Token、密碼或個人資料 / Common credential-pattern and tracked-artifact checks passed, but a final team review of personal information in historical documents and Git history remains. Public contributor names and local author paths are present in project history/status; they have not been silently removed.

## Demo and video / 展示與影片

- [x] 展示網址可直接開啟 / Fresh unauthenticated browser returned HTTP 200 on 2026-09-06. This verifies opening the site, not every live game/API path.
- [x] README 提供安裝與執行方式 / Includes clone, environment, install and startup instructions.
- [ ] 評選影片不超過 2:00 / Video not supplied; check duration.
- [ ] YouTube 影片設為「知道連結即可觀看」 / Set Unlisted and test without signing in.
- [ ] 影片聲音、字幕與畫面正常 / Watch the final upload end to end.
- [ ] 本機備援影片或截圖已準備 / Select and keep the final backup locally; earlier development screenshots are not marked as final submission assets.

## Before submitting / 送出前

- [ ] 所有表單連結再次測試 / Open every final form link without signing in.
- [ ] 保留送出成功畫面或確認信 / Save confirmation locally; redact private details before sharing.
- [ ] 截止前預留至少 30 分鐘 / Confirm the actual deadline and leave time for link/permission fixes.

Local validation on package import: 99 tests passed, 24 live-service tests
skipped without credentials, and 6 desktop/mobile E2E tests passed. Do not
describe the skipped live Supabase/OpenAI checks as newly verified. /
整合包本機驗證為 99 通過、24 項外部服務測試因無憑證跳過，另 6 項 E2E 通過；不得將跳過項目宣稱為本次已驗證。
