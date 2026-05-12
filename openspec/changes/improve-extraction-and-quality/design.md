## Context

本擴充功能自初版以來以單一 `content.js`（800+ 行單一 class）承載所有瀏覽器端邏輯，並以鬆散的 prompt 向 LLM 索取 locator。經全面檢討發現 30+ 項可改進點，範圍橫跨資料擷取正確性、生成邏輯、prompt 設計、驗證機制、使用體驗、效能、安全隱私、程式碼架構與國際化。本 design 文件釐清此大規模改進的技術決策。

**目前狀態限制：**
- Manifest V3 架構，service worker 型 background script（無持續狀態）
- Chrome Extension 沙箱環境，受 CSP 限制（禁 inline script / eval）
- 零外部依賴原則（目前所有檔案皆為 vanilla JS，無 bundler）
- 單人/小團隊使用場景，無 CI/CD 自動測試管線
- 使用者已有既存設定於 `chrome.storage.sync`，需考量相容性

**關鍵關係人：**
- 使用者：QA 工程師、前端工程師（需穩定的 locator、流暢的體驗）
- 擴充開發者：本專案未來貢獻者（需清晰的模組邊界）
- LLM API 提供者：OpenRouter（需高效的 prompt、合理的呼叫頻率）

## Goals / Non-Goals

**Goals:**
- 修正所有已識別的資料擷取與本地生成 bug（SVG className、`:nth-child` 誤用、索引 append 無效等）
- 讓 LLM 生成的 locator 在提供的 DOM 上下文中更高機率唯一且穩定
- 為使用者提供離線可用性、歷史紀錄、鍵盤導航等常用功能
- 支援 shadow DOM 與巢狀 iframe 等現代前端架構
- 建立可維護、可測試的模組化架構
- 保護使用者隱私（敏感欄位過濾、API key 儲存策略）
- 保持零外部依賴原則（除測試框架外）

**Non-Goals:**
- 不改變 OpenRouter 作為唯一 LLM 提供者的決策
- 不引入 bundler / TypeScript 編譯（保持 vanilla JS 直接執行）
- 不支援瀏覽器自動化（本擴充僅生成 locator，不執行測試）
- 不內建視覺回歸測試或元素截圖比對
- 不實作自己的 AI 推論（仍仰賴 OpenRouter）
- 不處理極端複雜的 locator 需求（如跨多層 shadow DOM + 多層 iframe）—以合理深度為限

## Decisions

### D1: 程式碼組織採用原生 ES Modules 而非 bundler

**Decision**: 將 `content.js` 拆分為 `lib/` 下多個檔案，在 `manifest.json` 中以 `"type": "module"` 聲明 content script，使用原生 `import` / `export`。

**Rationale**:
- Manifest V3 + Chrome 120+ 已支援 content script ES modules
- 避免引入 webpack / rollup 的複雜度與額外建置步驟
- 保持專案「clone 即可載入為未打包擴充」的簡潔性
- 單一職責檔案更易於單元測試

**Alternatives considered**:
- Webpack/Rollup bundler：增加建置複雜度，違反零依賴原則
- 單一大檔保留，以 class 拆分職責：類別爆量但檔案未拆，仍難維護
- IIFE + 全域命名空間：不利測試，容易污染 window

### D2: 拆分模組邊界

**Decision**: 以下列模組邊界拆分 `content.js`：

```
lib/
├── extractor/
│   ├── ElementExtractor.js      # DOM → 結構化資料
│   ├── SensitiveDataFilter.js   # 敏感欄位過濾
│   └── FrameworkDetector.js     # 前端框架偵測
├── generator/
│   ├── LocalLocatorGenerator.js # XPath / CSS 本地生成
│   └── ShadowDomPathBuilder.js  # Shadow DOM 路徑
├── validator/
│   ├── LocatorValidator.js      # 唯一性驗證
│   ├── PlaywrightParser.js      # Playwright locator 解析與驗證
│   └── StabilityScorer.js       # 穩定性評分
├── ui/
│   ├── ResultPanel.js           # 結果 UI
│   ├── SelectionOverlay.js      # 選取提示 overlay
│   ├── ElementHighlighter.js    # 頁面元素高亮
│   └── HistoryPanel.js          # 歷史紀錄面板
├── controller/
│   ├── SelectionController.js   # 選取事件與生命週期
│   ├── KeyboardNavigator.js     # DOM 樹鍵盤導航
│   └── IframeBridge.js          # 跨 frame 通訊
├── storage/
│   ├── HistoryStore.js          # 歷史紀錄儲存
│   ├── CacheStore.js            # Locator 結果快取
│   └── SettingsStore.js         # 設定管理（抽象）
└── i18n/
    └── i18n.js                  # chrome.i18n 封裝
```

Background script 亦拆分：
```
background/
├── OpenRouterClient.js     # API 呼叫 + streaming
├── PromptBuilder.js        # Prompt 組裝
├── ResponseParser.js       # 回應解析
├── RateLimiter.js          # 速率限制
└── ErrorClassifier.js      # 錯誤分類
```

**Rationale**: 每個檔案對應單一關注點，利於測試與獨立演進。命名與職責對齊 proposal 中的 capabilities。

### D3: Shadow DOM 穿透策略

**Decision**: 使用以下策略穿透 shadow DOM：
1. **選取階段**：監聽 `click` 事件的 `composedPath()` 取得含 shadow root 的完整路徑，目標元素取 `event.composedPath()[0]`
2. **路徑生成**：遞迴向上，遇到 `ShadowRoot` 則產生 `host-selector >>> inner-selector` 格式（>>> 為 Playwright shadow piercing 語法）
3. **驗證階段**：遇到 `>>>` 時切換為 Playwright 專用查詢，CSS/XPath 標示「僅限 Playwright 可用」
4. **限制**：最深穿透 3 層 shadow DOM（超過視為異常用法）

**Rationale**:
- Playwright 原生支援 shadow piercing，對測試工程師最友善
- `composedPath()` 為 Web 標準 API，穩定可靠
- CSS/XPath 無法原生穿透 shadow DOM，必須誠實標示限制

**Alternatives considered**:
- 用 `document.elementFromPoint` 遞迴：效能差且不保證命中 shadow root
- 完全不支援 shadow DOM：現代前端（Lit、Stencil、Salesforce LWC）幾乎都用，不可接受

### D4: Prompt 架構：System + User 分離

**Decision**: OpenRouter 請求採用兩段式 messages：

```js
messages: [
  { role: 'system', content: systemPrompt },
  { role: 'user', content: userPrompt }
]
```

- **System prompt**（英文，靜態，可快取）：角色定義、輸出格式、規則、few-shot examples
- **User prompt**（動態）：元素資料、鄰近元素摘要、本地生成的 XPath/CSS 參考

**Rationale**:
- 英文 system prompt 指令遵循率較高（主流模型訓練資料以英文為主）
- 靜態 system prompt 未來可考慮使用 prompt caching（OpenRouter 部分模型支援）降低成本
- 分離資料與指令減少誤解風險

**Alternatives considered**:
- 單一 user prompt：目前作法，指令遵循率較低
- 三段式（system / context / user）：過度複雜，OpenRouter 規範為兩段

### D5: 唯一性驗證的聰明索引

**Decision**: `LocatorValidator` 實作以下策略：

1. 收到 LLM 回傳的 selector 後，先執行 `querySelectorAll`
2. 若匹配 0 個：標記 `❌ 無匹配`，嘗試放寬（例如去除最後一個偽選擇器）再試一次
3. 若匹配 1 個：檢查是否為目標元素
   - 是 → `✅ 唯一匹配`
   - 否 → `❌ 匹配但非目標元素`（此為 selector 方向錯誤）
4. 若匹配多個：
   - 先偵測原 selector 是否已含 `:nth-*` 或 `[N]`
   - 有 → 視為 LLM 已嘗試唯一化但失敗，返回替代 selector（用本地生成的作 fallback）並標記 `⚠️ LLM 索引無效，已替換`
   - 無 → 計算目標元素在匹配陣列中的位置，append `:nth-of-type(N)` 並再次驗證
   - append 後仍非唯一 → 降級為本地生成

**Rationale**: 避免目前「暴力 append 索引」造成無效 selector 的問題；維持「能用」優先的原則。

### D6: Locator 穩定性評分演算法

**Decision**: 評分函數基於 selector 包含的選擇器類型：

```
Score = Σ (feature_weight × presence)

權重：
- id (非動態)          : 100
- data-testid/data-test: 95
- data-cy / data-automation: 90
- aria-label           : 80
- role + name          : 75
- getByRole/getByLabel : 70 (Playwright)
- for/label 關聯       : 65
- placeholder          : 55
- title / alt          : 50
- text (短且獨特)      : 45
- class (靜態)         : 30
- class (動態)         : 10
- nth-of-type / [N]    : -20
- 位置 (>3 層路徑)     : -10/層
```

分級：
- 80+ : ⭐⭐⭐⭐⭐ 極穩定
- 60-79 : ⭐⭐⭐⭐ 穩定
- 40-59 : ⭐⭐⭐ 普通
- 20-39 : ⭐⭐ 脆弱
- <20  : ⭐ 極脆弱

**Rationale**: 權重參考業界共識（data-testid > aria > semantic > class > position）。負分項反映索引與深路徑的脆弱性。

**Alternatives considered**:
- 純機器學習分類：資料不足且過度工程
- 三級分類（高/中/低）：顆粒度過粗，無法區分「class 靜態」vs「class 動態」

### D7: 歷史紀錄儲存於 `chrome.storage.local`

**Decision**:
- 使用 `chrome.storage.local`（容量 10MB，不同步）
- FIFO 保留最近 50 筆
- 結構：`{ id, timestamp, url, elementPreview, locators, stabilityScore }`
- Options 頁可調整上限 / 清空

**Rationale**:
- `sync`（100KB 上限）放歷史會爆
- `local` 足夠，且不同步避免跨裝置污染
- 50 筆為合理預設（平均每筆 1-2KB，遠低於 10MB）

### D8: 敏感資料過濾策略

**Decision**: `SensitiveDataFilter` 採三層過濾：

1. **欄位名黑名單**（可設定）：`password`、`token`、`secret`、`api[_-]?key`、`credit[_-]?card`、`ssn`
2. **值 pattern 偵測**：
   - Email: `[\w.+-]+@[\w-]+\.[\w.-]+`
   - Credit card: 13-19 位連續數字（Luhn 驗證）
   - JWT: `^eyJ[\w-]+\.[\w-]+\.[\w-]+$`
   - UUID: `[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}`
   - Bearer token: `^Bearer\s+`
3. **長度閾值**：`value` 超過 200 字元預設截斷（可能是大型 JSON/token）

符合任一條件 → 以 `[REDACTED:reason]` 替換，於送出預覽中顯示原因。

**Rationale**: 在「資料完整性」與「隱私」間折衷。黑名單 + pattern + 長度三層涵蓋常見敏感場景。

**Alternatives considered**:
- 完全不過濾，信任使用者：隱私風險高
- 送出前強制預覽：中斷流程，體驗差（列為可選設定）

### D9: 離線 fallback 策略

**Decision**: `OpenRouterClient` 呼叫失敗時（network / 401 / 429 / 5xx），`handleGenerateLocators` 不直接回報錯誤，而是：
1. 呼叫 `LocalLocatorGenerator` 產生本地 XPath + CSS
2. 套用 `LocatorValidator` 驗證與索引修正
3. 套用 `StabilityScorer` 評分
4. Playwright/Selenium 欄位標示「離線模式不可用」
5. 在結果面板頂部顯示 banner：「⚠️ 離線模式（API 失敗：原因）」

使用者可手動重試（面板加 Retry 按鈕）。

**Rationale**: 相比「直接失敗」，離線 fallback 保證最低可用性。本地生成的 CSS/XPath 雖不如 LLM 語義化，但足以應急。

### D10: 單元測試採 Vitest + jsdom

**Decision**: 引入 Vitest（開發依賴）+ jsdom 模擬 DOM 環境。僅針對純邏輯模組測試：
- `ElementExtractor`（輸入 DOM → 輸出物件）
- `LocalLocatorGenerator`（輸入 element → 輸出 selector）
- `LocatorValidator`（輸入 selector + DOM → 輸出驗證結果）
- `SensitiveDataFilter`（輸入 string → 輸出 filtered string）
- `StabilityScorer`（輸入 selector → 輸出 score）
- `FrameworkDetector`（輸入 DOM → 輸出 framework name）

UI 模組（ResultPanel 等）與 Chrome API 整合（background script）暫不寫自動測試，以手動測試覆蓋。

**Rationale**:
- Vitest 與 Node 原生 ES Modules 相容，不需 babel
- jsdom 對 shadow DOM 支援足夠
- 純邏輯測試 ROI 最高，整合測試投入過大

### D11: 設定遷移（Schema Migration）

**Decision**: `SettingsStore` 在載入時執行 migration：

```js
const MIGRATIONS = {
  1: (s) => ({ ...s, version: 1, enabledLocatorTypes: ['playwright', 'css', 'xpath', 'selenium'] }),
  2: (s) => ({ ...s, version: 2, seleniumLanguage: 'python' }),
  3: (s) => ({ ...s, version: 3, sensitiveDataFilter: { enabled: true, customBlacklist: [] } }),
  // ...
}
```

儲存結構加 `version` 欄位。載入時若 version 低於當前則依序套用 migration。

**Rationale**: 舊使用者更新擴充後不需手動重設定。

### D12: I18n 採 Chrome 內建機制

**Decision**: 使用 `chrome.i18n.getMessage(key)` 搭配 `_locales/` 目錄：
```
_locales/
├── zh_TW/messages.json  # 繁中 (default)
└── en/messages.json
```

`manifest.json` 中 `"default_locale": "zh_TW"`。

**Rationale**: 零依賴、原生支援、自動依使用者瀏覽器語言切換。

**Alternatives considered**:
- 自製 i18n 系統：重造輪子
- i18next 等 library：違反零依賴原則

## Risks / Trade-offs

- **[Risk] 大規模重構引入回歸 bug** → 採分階段實作（tasks 內分批次），每階段驗證既有功能；建立核心邏輯單元測試
- **[Risk] ES Modules 在舊版 Chrome 不支援** → manifest 設定 `minimum_chrome_version: 120`，避開相容性問題
- **[Risk] Shadow DOM 支援可能破壞既有網站封裝** → 僅於使用者主動選取時穿透；於結果中明確標示 shadow boundary
- **[Risk] 敏感資料過濾可能誤判正常資料** → 提供「白名單覆寫」設定；送出預覽模式讓使用者可見與修正
- **[Risk] 快取導致結果不即時** → Cache key 納入 URL + timestamp bucket（每小時換桶），避免跨時段污染
- **[Risk] 離線 fallback 讓使用者誤以為 API 正常** → Banner 明顯提示 + retry 按鈕
- **[Risk] Streaming 實作複雜度高且錯誤處理困難** → 首版採非 streaming，streaming 列為後續增強（可從 tasks 中標為 optional）
- **[Trade-off] 新增 `_locales/` 與 module 拆分讓專案結構變複雜** → 以清晰的目錄階層補償；README 說明架構
- **[Trade-off] 穩定性評分為主觀啟發式** → 明確文件化權重，使用者可參考；未來可根據回饋調整
- **[Trade-off] 單元測試僅覆蓋純邏輯** → UI 與整合靠手動測試；為未來留下可擴充的測試框架

## Migration Plan

### 分階段部署

**Phase 1：基礎修正（低風險）**
- Bug 修正：className SVG、`:nth-child` → `:nth-of-type`、索引 append 邏輯
- 修正 `sendToGemini` → `sendToLLM` 命名
- 相容性：原有資料結構保持；使用者無感

**Phase 2：架構重構**
- 拆分 content.js 為 lib/ 模組
- 導入 ES modules (manifest `"type": "module"`)
- 引入 Vitest，補齊核心邏輯測試
- 相容性：內部重構，無使用者感知

**Phase 3：Prompt 與驗證升級**
- System/User prompt 分離
- 聰明索引、Playwright/Selenium 驗證、穩定性評分
- 結果面板 hover 回高亮、就地編輯
- 相容性：UI 改動，使用者有感但向後相容

**Phase 4：新能力**
- 歷史紀錄、鍵盤導航、shadow DOM 支援、巢狀 iframe、多元素模式、匯出
- 相容性：純新增功能

**Phase 5：安全與 i18n**
- 敏感資料過濾、送出預覽、API key 儲存策略選項
- i18n 抽離字串、英文翻譯
- 設定 schema migration
- 相容性：設定需 migration，`SettingsStore` 自動處理

### Rollback 策略
- 每階段獨立 commit；發現重大問題可 `git revert` 該階段
- Settings migration 需保留舊版 reader，以防降級時讀取失敗（向後讀取 v1 即使目前為 v3）

## Open Questions

- **Streaming 是否列入此次變更？** 目前標為 optional；若時程緊迫可推延
- **穩定性評分權重是否需要公開讓使用者自訂？** 首版採硬編碼，觀察使用者回饋後再議
- **Cypress / Testing Library / WebdriverIO 三種新 locator 類型是否全部實作？** 可先實作 Cypress + Testing Library（使用者較多），WebdriverIO 視回饋再加
- **是否要保留 Selenium 範例生成？** Selenium 使用者遞減，但本擴充無 breaking 移除理由；保留但預設關閉
- **shadow DOM 最深穿透層數應為幾？** 暫訂 3 層；若實際遇到更深案例再調整
