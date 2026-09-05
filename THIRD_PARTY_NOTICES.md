# Third-party sources and licenses / 第三方來源與授權

Reviewed against the committed package-lock.json on 2026-09-06. This project's
[MIT license](./LICENSE) covers its contributed source and documentation, not
third-party packages, proprietary services, or material supplied by players.

依 2026-09-06 提交的 package-lock.json 核對。專案 MIT 授權適用於專案貢獻的程式與文件；第三方套件、專有服務與玩家提供的素材仍適用各自條款。

## Direct dependencies / 直接依賴

Versions and license identifiers below come from installed package metadata
matching the lockfile. Upstream repositories contain the authoritative license
and copyright notices. Preserve applicable upstream notices when redistributing
those packages or bundled builds.

下列版本與授權識別碼取自對應 lockfile 的套件 metadata。完整授權與著作權聲明請見上游 repo；散布套件或包含套件的建置成品時，須保留適用的上游聲明。

| Package / 套件 | Version / 版本 | License / 授權 | Source / 來源 |
|---|---|---|---|
| next | 16.3.4 | MIT | [vercel/next.js](https://github.com/vercel/next.js) |
| react | 19.2.8 | MIT | [facebook/react](https://github.com/facebook/react) |
| react-dom | 19.2.8 | MIT | [facebook/react](https://github.com/facebook/react) |
| @supabase/supabase-js | 2.115.0 | MIT | [supabase/supabase-js](https://github.com/supabase/supabase-js) |
| @playwright/test | 1.63.0 | Apache-2.0 | [microsoft/playwright](https://github.com/microsoft/playwright) |
| @types/node | 24.13.3 | MIT | [DefinitelyTyped](https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/node) |
| @types/react | 19.2.18 | MIT | [DefinitelyTyped](https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/react) |
| @types/react-dom | 19.2.7 | MIT | [DefinitelyTyped](https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/react-dom) |
| eslint | 9.39.5 | MIT | [eslint/eslint](https://github.com/eslint/eslint) |
| eslint-config-next | 16.3.4 | MIT | [vercel/next.js](https://github.com/vercel/next.js) |
| typescript | 5.9.3 | Apache-2.0 | [microsoft/TypeScript](https://github.com/microsoft/TypeScript) |
| vitest | 5.0.0 | MIT | [vitest-dev/vitest](https://github.com/vitest-dev/vitest) |

Transitive and platform-specific dependencies are inventoried in
[package-lock.json](./package-lock.json): each non-root package entry records
its version, source (`resolved`) where applicable, integrity and `license`.
No non-root package entry lacks a license field at this revision. They are
downloaded by npm, not vendored into this repository. Their own license files
and notices remain in their installed packages; this table does not relicense
them under MIT. Regenerate/review this disclosure when changing dependencies.

間接與平台專用依賴完整記錄於 package-lock.json，包含版本、適用的下載來源、完整性與授權欄位。本版非根套件均有 license 欄位；套件由 npm 下載，不隨 repo 納入。各自授權與聲明仍保留於安裝套件中，不因本表而改授 MIT；更新依賴時需同步檢查本揭露。

## Models and services / 模型與服務

- **OpenAI Responses API**: a hosted proprietary service; no model weights are
  distributed here. The code and environment template default to
  `gpt-4.1-mini`; the earlier deployment log reports `gpt-5.4-mini`. The actual
  runtime model is selected by `OPENAI_MODEL`, and was not independently
  verified on the live deployment during this documentation update. Service
  use is governed by the applicable [OpenAI agreement](https://openai.com/policies/services-agreement/),
  not this repository's MIT license. / 使用代管專有模型，不散布權重；程式預設與歷史部署模型如上，實際依環境設定，本次未核對線上模型。API 使用適用 OpenAI 服務條款。
- **Supabase**: the JavaScript client uses MIT (above). Hosted Auth/database/
  Realtime services are subject to [Supabase terms](https://supabase.com/terms),
  separately from the client license. / SDK 授權與代管服務條款分開。
- **Vercel**: hosts the linked demonstration under [Vercel terms](https://vercel.com/legal/terms).
  Deployment credentials and local project linkage are excluded from Git. /
  展示站使用 Vercel，部署機密與本機專案連結不提交。
- **Chromium**: downloaded separately by Playwright for browser tests; its
  upstream [license and third-party notices](https://chromium.googlesource.com/chromium/src/+/main/LICENSE)
  are separate from Playwright's Apache-2.0 license. No browser binaries are
  included in this repository. / 測試瀏覽器另行下載，非本 repo 散布內容。

## Data, text and visual assets / 資料、文字與視覺素材

- Built-in discussion scenarios in `lib/game/samples.ts` and fixed game content
  in `lib/ai/fixtures/demo.ts` are project-authored fictional examples, not
  sourced studies, real-user records, or a licensed external dataset. They are
  supplied with the project's source under MIT. / 內建情境與固定資料為專案編寫的虛構示範，非真實研究、使用者紀錄或外部資料集，隨專案原始碼授權。
- AI assistance was used during project development and drafting. Live AI
  briefings/cards/summaries are generated at runtime; the project does not
  present these as verified facts or human-authored verdicts. / 開發與起草使用 AI 輔助；即時導讀、卡片與摘要為模型輸出，不當作已驗證事實或人工裁決。
- The current UI uses CSS, text-based quotation marks/question marks, system
  fonts and system-rendered emoji. No stock photos, downloaded font files or
  third-party illustration assets are bundled in the app source. System font
  and emoji artwork rights remain with their respective vendors. / 現行介面使用 CSS、文字符號、系統字型與 emoji，未內附圖庫照片、下載字型或第三方插畫；系統資源權利仍屬各供應商。
- Pasted player/host material belongs to its respective rights holders; this
  project's license does not grant rights over it. Use fictional or authorized
  text for public demos and omit private information. / 玩家或主持人貼入素材的權利屬原權利人，本專案不替其授權；公開展示使用虛構或已獲授權文字並避開私密資訊。
