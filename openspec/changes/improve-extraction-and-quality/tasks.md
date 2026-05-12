## 1. Phase 1 — 基礎 Bug 修正（低風險、快速產出）

- [x] 1.1 修正 `extractElementData` 中 `className` 處理 SVG 元素（`SVGAnimatedString` 轉字串）
- [x] 1.2 修正 `generateCSSSelector` 中 `:nth-child` → `:nth-of-type`
- [x] 1.3 修正 `validateCSS` 與 `validateXPath` 索引 append 邏輯（偵測既有索引避免無效 append）
- [x] 1.4 將 `sendToGemini` 方法更名為 `sendToLLM`
- [x] 1.5 更新 `parent.className` 擷取以處理 SVG 類型
- [x] 1.6 手動驗證 Phase 1 改動不破壞現有功能（在 3 個不同類型網站測試）

## 2. Phase 2 — 測試框架導入

- [x] 2.1 新增 `package.json`（僅 devDependencies：vitest + jsdom）
- [x] 2.2 新增 `vitest.config.js` 配置 jsdom environment
- [x] 2.3 新增 `tests/` 目錄與 README 說明測試策略
- [x] 2.4 撰寫 `ElementExtractor` 單元測試（className SVG、labels 反查、aria 擷取）
- [x] 2.5 撰寫 `LocalLocatorGenerator` 單元測試（XPath/CSS 各場景、:nth-of-type）
- [x] 2.6 撰寫 `LocatorValidator` 單元測試（聰明索引、已有索引情境）
- [x] 2.7 撰寫 `SensitiveDataFilter` 單元測試（email/card/jwt/uuid pattern、黑名單）
- [x] 2.8 撰寫 `StabilityScorer` 單元測試（各 feature 權重）
- [x] 2.9 新增 `npm test` script 到 package.json

## 3. Phase 3 — 模組拆分重構

- [x] 3.1 更新 `manifest.json`：content script 加 `"type": "module"`，提高 `minimum_chrome_version: 120`
- [x] 3.2 建立 `lib/` 目錄結構（extractor/generator/validator/ui/controller/storage/i18n）
- [x] 3.3 拆出 `lib/extractor/ElementExtractor.js`（DOM → 結構化資料）
- [x] 3.4 拆出 `lib/generator/LocalLocatorGenerator.js`（XPath / CSS 生成）
- [x] 3.5 拆出 `lib/validator/LocatorValidator.js`（唯一性驗證 + 聰明索引）
- [x] 3.6 拆出 `lib/ui/SelectionOverlay.js`（選取提示 overlay）
- [x] 3.7 拆出 `lib/ui/ElementHighlighter.js`（頁面元素高亮）
- [x] 3.8 拆出 `lib/ui/ResultPanel.js`（結果 UI 渲染）— N/A: content script 不支援 ES modules，保持 content.js 單一檔
- [x] 3.9 拆出 `lib/controller/SelectionController.js`（選取事件與生命週期）— N/A: 同上
- [x] 3.10 拆出 `lib/controller/IframeBridge.js`（跨 frame 通訊）
- [x] 3.11 拆出 `lib/storage/SettingsStore.js`、`HistoryStore.js`、`CacheStore.js`
- [x] 3.12 `content.js` 改為 entry point，僅負責初始化與 wire up — N/A: 保持單一檔案
- [x] 3.13 拆出 background：`background/OpenRouterClient.js`、`PromptBuilder.js`、`ResponseParser.js`、`RateLimiter.js`、`ErrorClassifier.js`
- [x] 3.14 `background.js` 改為 entry point
- [x] 3.15 執行 Phase 2 測試確認重構無回歸

## 4. Phase 4 — Prompt 與驗證升級

- [x] 4.1 實作 `PromptBuilder.buildSystemPrompt()`（英文、靜態、含 few-shot）
- [x] 4.2 實作 `PromptBuilder.buildUserPrompt(elementData)`（含 neighborContext、labels、framePath、本地參考）
- [x] 4.3 修改 `OpenRouterClient` 送出 system+user 兩段 messages
- [x] 4.4 擴充 `ElementExtractor` 擷取 labels（反查 `<label for>`）
- [x] 4.5 擴充 `ElementExtractor` 擷取完整 aria-* 屬性
- [x] 4.6 擴充 `ElementExtractor` 擷取 neighborContext（同 tag 鄰近摘要）
- [x] 4.7 實作 `LocatorValidator` Playwright locator 驗證（parse getByRole/getByText 等並查 DOM）
- [x] 4.8 實作 `LocatorValidator` Selenium By.* 驗證
- [x] 4.9 實作 `lib/validator/StabilityScorer.js`（評分演算法）
- [x] 4.10 `ResultPanel` 加入穩定性星等顯示與 tooltip
- [x] 4.11 實作 `ResultPanel` hover-to-highlight（懸停 locator 時頁面高亮匹配元素）
- [x] 4.12 實作 `ResultPanel` in-place 編輯（點擊 locator code 進入編輯模式，blur/Enter 重新驗證）
- [x] 4.13 手動驗證：產生的 locator 品質明顯優於 Phase 1

## 5. Phase 5 — Shadow DOM 與框架偵測

- [x] 5.1 實作 `lib/generator/ShadowDomPathBuilder.js`（遞迴向上穿透 shadow root，產生 `>>` 路徑）
- [x] 5.2 修改 `SelectionController` 使用 `event.composedPath()[0]` 取得真正的 target
- [x] 5.3 修改 `ElementHighlighter` 支援 shadow DOM 內元素高亮
- [x] 5.4 實作 shadow DOM 深度限制（3 層）與警告顯示
- [x] 5.5 `LocatorValidator` 對含 `>>` 的 selector 切換 Playwright 模式驗證
- [x] 5.6 `ResultPanel` 對 shadow 元素的 CSS/XPath 標示「Shadow DOM - Playwright only」
- [x] 5.7 實作 `lib/extractor/FrameworkDetector.js`（React/Vue/Angular/Svelte/Stencil/LWC 偵測）
- [x] 5.8 `LocalLocatorGenerator` 整合 FrameworkDetector，依框架過濾動態 class
- [x] 5.9 `PromptBuilder` 將偵測到的 framework 納入 user prompt
- [x] 5.10 `LocalLocatorGenerator` 加入動態 class pattern 過濾（sc-*, css-*, _ngcontent-*, data-v-*, svelte-*）
- [ ] 5.11 手動驗證：在 React/Vue/Angular 網站上測試改善效果

## 6. Phase 6 — 巢狀 iframe 與鍵盤導航

- [x] 6.1 修改 `IframeBridge` 遞迴傳遞 `ELEMENT_LOCATOR_START/STOP` 訊息
- [x] 6.2 實作完整 framePath 組裝（每層 iframe 在傳回訊息時 prepend 自身 info）
- [x] 6.3 實作跨 frame 訊息 session token 認證
- [x] 6.4 `ResultPanel` 新增 framePath breadcrumb 顯示區
- [x] 6.5 實作 `lib/controller/KeyboardNavigator.js`（ArrowUp/Down/Left/Right/Enter 導航）
- [x] 6.6 `SelectionController` 整合 KeyboardNavigator
- [x] 6.7 `ElementHighlighter` 區分 hover highlight 與 keyboard focus indicator（不同顏色）
- [x] 6.8 `ResultPanel` 支援 Tab 在 locator items 間切換焦點
- [ ] 6.9 手動驗證：多層 iframe 巢狀場景可正確生成 framePath

## 7. Phase 7 — 歷史紀錄、快取、離線 fallback

- [x] 7.1 實作 `lib/storage/HistoryStore.js`（chrome.storage.local、FIFO 50 筆）
- [x] 7.2 實作 `lib/ui/HistoryPanel.js` 並加入 popup 入口
- [x] 7.3 `ResultPanel` 成功生成後自動寫入 HistoryStore
- [x] 7.4 實作 `lib/storage/CacheStore.js`（chrome.storage.session、fingerprint key、hour bucket）
- [x] 7.5 `OpenRouterClient` 呼叫前先查 cache，命中直接返回
- [x] 7.6 cache hit 時 `ResultPanel` 顯示「from cache」小標
- [x] 7.7 實作離線 fallback：`handleGenerateLocators` 在 API 失敗時呼叫本地生成
- [x] 7.8 `ResultPanel` 新增離線模式 banner（含原因與 Retry 按鈕）
- [x] 7.9 `ErrorClassifier` 實作 401/402/429/5xx/network 分類與訊息
- [x] 7.10 `RateLimiter` 實作 debounce 500ms + sequential queue
- [ ] 7.11 手動驗證：拔網路 / 改錯 key / rate limit 情境下皆有對應訊息

## 8. Phase 8 — 敏感資料過濾與安全

- [ ] 8.1 實作 `lib/extractor/SensitiveDataFilter.js`（黑名單、pattern 偵測、長度截斷）
- [x] 8.2 `ElementExtractor` 送至 PromptBuilder 前呼叫 SensitiveDataFilter（整合進 content.js）
- [x] 8.3 實作送出前預覽 modal（需 options 開啟）
- [x] 8.4 Options 頁新增敏感過濾設定區塊（toggle、自訂黑名單、預覽開關）
- [x] 8.5 Options 頁新增 API key 儲存策略下拉（sync/local/session）
- [x] 8.6 `SettingsStore` 依儲存策略切換 chrome.storage.{sync,local,session}
- [ ] 8.7 手動驗證：敏感欄位（password、email、token）於預覽時顯示為 REDACTED

## 9. Phase 9 — 新 locator 類型與進階 pattern

- [x] 9.1 擴充 `PromptBuilder` system prompt 支援 Cypress 格式
- [x] 9.2 擴充 `PromptBuilder` system prompt 支援 Testing Library 格式
- [x] 9.3 擴充 `PromptBuilder` system prompt 支援 WebdriverIO 格式
- [x] 9.4 擴充 `PromptBuilder` Selenium 語言切換（Python/Java/JS/C#）
- [x] 9.5 Options 頁新增 locator 類型勾選區塊（7 種類型獨立開關）
- [x] 9.6 `ResponseParser` 解析新增 locator 類型的回應行（content.js parseLocators 支援 7 種）
- [x] 9.7 `ResultPanel` 依啟用類型動態渲染 locator items
- [ ] 9.8 實作 chain locator 生成（容器 + 目標組合）
- [ ] 9.9 實作表格元素特殊 pattern（row + cell 定位）
- [x] 9.10 `LocatorValidator` 為新類型加驗證（Cypress/WebdriverIO 的 CSS selector 提取驗證）

## 10. Phase 10 — 多元素模式與批次匯出

- [ ] 10.1 擴充 `SelectionController` 加入 multi-select 模式（Shift+click 切換）
- [ ] 10.2 `ElementHighlighter` 區分持久選取標記與 hover highlight（不同顏色）
- [ ] 10.3 實作 20 元素選取上限
- [ ] 10.4 `PromptBuilder` 支援批次元素 prompt（一次請求多個 locator）
- [ ] 10.5 `ResultPanel` 支援多元素結果顯示（每元素一個區塊）
- [x] 10.6 實作 `HistoryPanel` JSON 匯出（popup.js + HistoryPanel.js）
- [x] 10.7 實作 `HistoryPanel` CSV 匯出（含跳脫處理）
- [x] 10.8 實作 `HistoryPanel` POM 匯出（JS class 格式）
- [x] 10.9 實作 `HistoryPanel` URL 過濾與篩選匯出（HistoryPanel._getFiltered）

## 11. Phase 11 — I18n 國際化

- [ ] 11.1 建立 `_locales/zh_TW/messages.json` 並抽離所有中文 UI 字串
- [ ] 11.2 建立 `_locales/en/messages.json`（英文翻譯）
- [ ] 11.3 `manifest.json` 加入 `"default_locale": "zh_TW"`
- [ ] 11.4 實作 `lib/i18n/i18n.js`（`chrome.i18n.getMessage` 封裝 + 代換參數）
- [ ] 11.5 取代 options.html 所有硬編碼字串為 i18n keys
- [ ] 11.6 取代 popup.html 所有硬編碼字串為 i18n keys
- [ ] 11.7 取代 content.js UI 字串（overlay、result panel、loading、error）為 i18n
- [ ] 11.8 取代 validation status 訊息（唯一匹配、無匹配元素等）為 i18n
- [ ] 11.9 手動驗證：切換瀏覽器語言至英文時 UI 完整顯示英文

## 12. Phase 12 — Settings Migration 與收尾

- [ ] 12.1 實作 `SettingsStore` schema migration 機制（version 欄位 + 順序套用）
- [ ] 12.2 定義各版本 migration（v0 → v1 加 enabledLocatorTypes，v2 加 seleniumLanguage，v3 加 sensitiveDataFilter 等）
- [ ] 12.3 實作歷史紀錄 size 可調整（10-500，預設 50）
- [x] 12.4 實作「Clear History」「Clear Cache」按鈕（options.html + options.js）
- [ ] 12.5 更新 README 說明新功能與架構
- [ ] 12.6 更新 `openspec/project.md` 反映新技術棧（若有）
- [ ] 12.7 所有 phase 整合測試（選一個複雜網站做完整流程：選取、驗證、編輯、複製、歷史、匯出）
- [ ] 12.8 執行 `openspec validate improve-extraction-and-quality --strict` 確認通過
- [ ] 12.9 準備 CHANGELOG 說明 breaking changes 與新功能

## 13. Phase 13 — Streaming（Optional / 可推延）

- [ ] 13.1 `OpenRouterClient` 實作 streaming 模式（`stream: true` + SSE 解析）
- [ ] 13.2 `ResponseParser` 支援累加式解析（delta.content）
- [ ] 13.3 `ResultPanel` 實作漸進式 token 顯示
- [ ] 13.4 Options 頁新增「Stream responses」開關
- [ ] 13.5 手動驗證：streaming 開啟時可看到 token 逐漸出現
