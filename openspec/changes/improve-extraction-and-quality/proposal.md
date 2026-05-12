## Why

目前的元素資料擷取、本地 locator 生成、LLM prompt 建構與驗證機制皆有多項明顯瑕疵：SVG 元素的 `className` 會崩潰、CSS `:nth-child` 誤用導致索引對不上、驗證機制粗暴 append 索引可能產生無效 selector、prompt 未要求唯一性也未提供足夠上下文、敏感欄位無過濾就送往 LLM、API key 明文儲存於 `chrome.storage.sync`。這些問題使得生成的 locator 品質低、穩定性差，且有隱私風險。此外目前缺乏離線 fallback、歷史紀錄、shadow DOM 支援、穩定性評分等常用功能，使用者體驗受限。此次全面性改進將系統性修正資料擷取、生成邏輯、驗證機制、使用體驗、安全隱私、程式碼架構六個面向。

## What Changes

### 資料擷取修正
- **BREAKING**: `extractElementData` 回傳結構變更，`className` 統一為字串（處理 `SVGAnimatedString`），新增 `labels`（反查 `<label for>`）、`ariaAttributes`（完整 aria-*）、`neighborContext`（同層同 tag 鄰近元素摘要）、`framePath`（shadow DOM 與巢狀 iframe 路徑）
- 區分 `textContent` 與 `innerText` 用途；`text` 欄位改用 `innerText` 擷取可見文字，`textContent` 僅作為 fallback
- `getSiblingsInfo` 擴充為包含兄弟元素的差異摘要（文字差異、屬性差異）

### 本地生成器修正
- `generateCSSSelector` 將 `:nth-child` 改為 `:nth-of-type`，並過濾動態生成 class（偵測 hash pattern 如 `sc-abc123`、`css-xyz`、`_ngcontent-*`、`data-v-*`）
- 新增框架偵測（React / Vue / Angular / Svelte / Stencil）並依框架調整策略
- 新增 shadow DOM 感知的路徑生成（產生 `host >> inner` 風格）

### Prompt 重新設計
- 拆分 system prompt（角色、格式、規則）與 user prompt（資料）
- System prompt 明確要求 locator 需在提供的 DOM 上下文中唯一定位目標
- Prompt 附上本地生成的 XPath/CSS 作為參考
- Prompt 包含同層相似元素摘要以協助 LLM 判斷唯一性
- Selenium 語法格式新增語言選項（Python / Java / JavaScript / C#），由設定決定
- 採用英文 system prompt 提升 token 效率與指令遵循率
- 使用 few-shot examples 取代冗長規則列表

### 驗證與結果顯示
- `validateCSS` / `validateXPath` 採用聰明索引：偵測原 selector 是否已含偽選擇器/索引，避免無效 append；若無法修正則返回替代 selector 而非壞 selector
- 驗證範圍擴及 Playwright（解析 `getByRole`/`getByText` 等 API 並執行驗證）與 Selenium（解析 By.* 定位）
- 新增 locator **穩定性評分**（ID > data-testid > aria-label > role+name > text > class > position），在結果面板顯示星等
- 結果面板 hover 任一 locator 時，於頁面上即時高亮該 locator 實際匹配到的元素（含匹配數顯示）
- 結果面板可就地編輯 locator，編輯後即時重新驗證

### 使用體驗擴充
- 新增**歷史紀錄**（使用 `chrome.storage.local` 保存最近 50 筆選取結果），可重新開啟面板查看
- 新增**鍵盤導航**：方向鍵在 DOM 樹上下/左右/父子移動選取；Enter 確認；Tab 切換結果面板中的 locator
- 新增**shadow DOM 支援**：深層穿透 shadow root 進行元素選取與 locator 生成
- 新增**巢狀 iframe 支援**：遞迴處理多層 iframe，生成完整 frame 路徑
- 新增**多元素比對模式**：選取多個元素後產生差異化 locator（如容器內所有互動元素）
- 新增**批次模式 / 匯出功能**：將歷史紀錄匯出為 JSON / CSV / Page Object Model 格式

### Locator 類型可配置
- **BREAKING**: 設定新增「啟用的 locator 類型」勾選，使用者可選擇僅需要的類型（Playwright / CSS / XPath / Selenium / Cypress / Testing Library / WebdriverIO）
- 新增 Cypress、Testing Library、WebdriverIO 三種 locator 格式支援
- 新增 **chain locator** 語法支援（Playwright `locator().filter().getByRole()` 風格）
- 新增 **表格元素特殊處理**：偵測 `<td>`/`<th>` 時產生「按列文字定位再取欄位」的 pattern

### 效能與成本
- **Locator 結果快取**：以元素特徵 hash（tagName + key attrs + text）作 key，使用 `chrome.storage.session` 存同一 session 內結果，避免重複 API 呼叫
- **離線 fallback**：API 失敗或未設定 key 時，降級顯示本地生成的 XPath/CSS/Playwright 並標註「離線模式」
- 支援 **streaming 回應**（`stream: true`），結果逐步顯示
- 設定新增 **rate limit**（debounce + queue）避免快速連點造成 API 浪費

### 安全與隱私
- **敏感欄位過濾**：送 LLM 前過濾 `value`/`text`，偵測 email/phone/credit card/token 等 pattern 並以 `[REDACTED]` 替換；提供黑名單欄位名設定（`password`、`token`、`secret` 等）
- 新增**送出前預覽**選項（options 頁開啟後，每次送 API 前先顯示將送出的資料供使用者確認）
- API key 儲存策略改為 `chrome.storage.session`（僅當次瀏覽器 session，更安全）或提供「每次輸入」選項
- 新增**請求速率限制**（client-side rate limit），防止過度呼叫

### i18n 國際化
- **BREAKING**: 所有 UI 字串抽離為 i18n messages（`_locales/zh_TW/messages.json` 與 `_locales/en/messages.json`），使用 `chrome.i18n.getMessage`
- 驗證結果訊息（`唯一匹配`、`無匹配元素` 等）亦採用 i18n

### 錯誤處理精細化
- API 錯誤依 HTTP status code 分類顯示（401 key 錯、402 credit 不足、429 rate limit、5xx 服務端錯、network 錯）
- 錯誤訊息附上修復建議與相關設定連結

### 程式碼架構重構
- **BREAKING**: 拆分 `content.js` 單一大型 class（800+ 行）為多個模組：
  - `ElementExtractor`（DOM → 結構化資料）
  - `LocalLocatorGenerator`（XPath / CSS 本地生成）
  - `LocatorValidator`（唯一性驗證與索引修正）
  - `ResultPanel`（結果 UI 渲染）
  - `SelectionController`（選取事件與生命週期）
  - `IframeBridge`（跨 frame 通訊）
  - `ShadowDomTraverser`（shadow DOM 穿透）
- 將 `sendToGemini` 更名為 `sendToLLM`（Gemini 已非唯一 provider）
- 新增 JSDoc 型別標註於關鍵資料結構
- 新增單元測試（XPath 生成、CSS 生成、敏感資料過濾、索引修正邏輯）

## Capabilities

### New Capabilities
- `selection-history`: 使用者選取過的元素與生成結果的歷史紀錄儲存與檢視
- `shadow-dom-support`: Shadow DOM 元素的選取、穿透與 locator 生成
- `keyboard-navigation`: 選取模式下使用鍵盤在 DOM 樹中導航
- `multi-element-mode`: 選取多個元素並產生差異化或批次 locator
- `export-batch`: 歷史紀錄與批次結果的匯出（JSON / CSV / POM）
- `sensitive-data-filter`: 送往 LLM 前過濾敏感欄位
- `locator-stability-score`: Locator 穩定性評分與顯示
- `locator-caching`: 相同元素特徵的 locator 結果快取
- `offline-fallback`: API 失敗或未設定時降級為本地生成
- `framework-detection`: 前端框架偵測與對應調整策略
- `i18n`: 多語系支援（繁中 / 英文）

### Modified Capabilities
- `element-selection`: 新增鍵盤導航、shadow DOM 穿透、多元素模式
- `data-extraction`: 結構變更（className 修正、labels 反查、aria 完整化、neighborContext、framePath）
- `locator-generation`: 修正 CSS `:nth-child`、新增動態 class 過濾、chain locator、表格特殊處理、更多 locator 類型（Cypress、Testing Library、WebdriverIO）
- `locator-validation`: 聰明索引、Playwright/Selenium 驗證、穩定性評分
- `llm-provider`: Prompt 拆分 system/user、唯一性要求、few-shot、streaming、錯誤精細化
- `settings-management`: 新增啟用 locator 類型勾選、Selenium 語言、敏感過濾、送出預覽、API key 儲存策略、啟用歷史紀錄
- `iframe-support`: 巢狀 iframe 遞迴處理、完整 frame 路徑
- `ui-rendering`: Hover 回高亮、就地編輯、穩定性星等、i18n
- `clipboard-copy`: 無變更（已於前次修正）
- `persistent-mode`: 無變更

## Impact

### 受影響程式碼
- `content.js`（大幅重構，拆為多個模組檔）
- `background.js`（prompt 重寫、streaming、錯誤分類、快取、rate limit）
- `options.html` / `options.js` / `options.css`（新增多項設定）
- `popup.html` / `popup.js`（新增歷史紀錄入口、匯出入口）
- `manifest.json`（新增 `storage` 權限範圍、`_locales` 目錄）
- 新增 `_locales/zh_TW/messages.json`、`_locales/en/messages.json`
- 新增 `lib/` 目錄存放拆分後的模組

### 受影響 API
- 內部 message protocol 擴充（新增 history / cache / export 等 action）
- OpenRouter API 請求格式變更（system + user messages、streaming）

### 相依性
- 無新增外部套件（保持 zero-dependency 原則）
- 需新增單元測試框架（建議 Vitest，Chrome Extension 相容性佳）

### 破壞性變更
- `extractElementData` 回傳結構變更（對擴充開發者有影響，一般使用者無感）
- 設定頁 schema 變更（舊設定需 migration，在 `background.js` 載入時處理）
- `content.js` 單一 class 拆分（內部重構，無使用者感知）
- UI 字串 i18n 化（既有中文使用者無感）

### 風險與緩解
- **風險**：大量改動可能引入新 bug。**緩解**：新增單元測試覆蓋核心邏輯；分階段實作（見 tasks）。
- **風險**：Shadow DOM 穿透可能觸及封裝原則。**緩解**：僅在明確用戶選取時穿透，且於結果中明示 shadow boundary。
- **風險**：敏感資料過濾可能誤判。**緩解**：提供白名單機制，使用者可允許特定欄位通過。
