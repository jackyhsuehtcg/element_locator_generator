# Element Locator Generator

使用本地或雲端 LLM 一鍵生成穩定的 Web 元素定位器。支援 Playwright、CSS、XPath 與 Selenium，並提供 iframe 元素支援與即時驗證與複製。

## 功能特色

- 智能選取：點一下任意元素，即自動蒐集標籤、屬性、文字、階層等資訊
- AI 生定位器：透過可選的 LLM 產生 4 種定位器
  - Playwright 語義化優先（`getByRole`, `getByLabel`, `getByText`…）
  - CSS 選擇器
  - XPath 表達式
  - Selenium 取用範例
- 結果面板：顯示 4 種定位器並支援單鍵複製
- Iframe 支援：可於子框架中選取元素，並提供對應 iframe 定位提示
- 本地驗證：基本檢查 CSS/XPath 是否唯一或需加索引
- 快捷操作：ESC 可隨時退出選取模式

## 架構與檔案

- `manifest.json`：Chrome MV3 設定
- `Extension/background.js` + `Extension/background/`：與 LLM 溝通、建構 Prompt、解析回應、注入 content script
- `Extension/content.js`：元素選取、高亮、資料蒐集、結果顯示、複製與驗證
- `Extension/lib/`：共用模組（generator、validator、extractor、ui、controller、storage、i18n）
- `Extension/options.html` / `Extension/options.js` / `Extension/options.css`：設定頁（選擇供應商、API URL、模型、金鑰、測試連線）
- `Extension/popup.html` / `Extension/popup.js`：工具列彈出視窗（未來擴充用）

## 支援的 LLM 供應商

- LM Studio（本地，預設）
- Ollama（本地）
- OpenAI
- Google Gemini
- Anthropic Claude

注意：預設 `manifest.json` 僅允許 `http://localhost:1234/*`（LM Studio）做為 API 呼叫來源。若要改用其他供應商，請調整 `host_permissions`。

範例：

```json
{
  "host_permissions": [
    "http://localhost:1234/*",          // LM Studio
    "http://localhost:11434/*",          // Ollama
    "https://api.openai.com/*",          // OpenAI
    "https://generativelanguage.googleapis.com/*", // Gemini
    "https://api.anthropic.com/*"        // Anthropic
  ]
}
```

## 安裝

1) 下載或複製此專案到本機。

2) Chrome 載入未封裝擴充功能：
- 打開 `chrome://extensions/`
- 開啟右上角「開發人員模式」
- 點「載入未封裝項目」，選擇本專案的 `Extension/` 資料夾

3) 如果你使用 LM Studio（預設）
- 確保 LM Studio 在 `http://localhost:1234` 運行，且提供 OpenAI 相容的 Chat Completions API

4) 若你要用其他供應商
- 先在 `manifest.json` 的 `host_permissions` 新增對應 API 網域（見上方）
- 重新載入擴充功能

## 設定（Options）

在擴充功能的「選項」頁設定：

- 供應商：`LM Studio / Ollama / OpenAI / Gemini / Anthropic`
- API URL：各供應商預設已代入，可自行調整
- 模型名稱：從清單選擇（可依需求更換）
- API Key：雲端供應商通常必填；本地供應商通常不需
- Temperature：預設 0.1（穩定、可重現）
- Max Tokens：最大輸出 token 數（預設 512）

「🧪 測試連接」會以最小內容呼叫 API，並顯示成功/失敗訊息。

Gemini 特別說明：背景程式會將 `apiKey` 以查詢參數 `?key=...` 加到 `apiUrl`（符合 Gemini REST API 規格）。

## 使用方法

- 在任何頁面上，點擊工具列中的擴充功能圖示，即可啟用「元素選取模式」。
- 頂部會出現提示橫幅，游標變為十字準星。
- 將滑鼠移至目標元素（會高亮），點一下即可送出到 LLM 生成定位器。
- 完成後右下角會出現結果面板，包含：
  - Playwright
  - CSS
  - XPath
  - Selenium
  每個項目皆可一鍵複製。
- Iframe 內元素也支援，結果面板會額外顯示 iframe 的常見定位方式（如 `iframe#id`、`iframe[name=...]`）。
- 按 ESC 可隨時退出選取模式。

## 生成策略與驗證

- 生成優先順序以 Playwright 語義化定位為先，其次 CSS、XPath，並提供 Selenium 範例。
- 內容腳本會對 CSS/XPath 進行基本檢查：
  - 唯一匹配 → 標記 ✅
  - 多重匹配 → 嘗試補上索引並標記 ⚠️
  - 無效選擇器 → 標記 ❌

實際穩定性仍與網站結構與語義化標記品質有關，請視情況調整。

## 已知限制

- Chrome/Edge 系統頁（`chrome://`, `edge://`, `chrome-extension://`）不可使用。
- 某些站點的 CSP 可能限制內容腳本或樣式注入。
- 預設僅允許 LM Studio 主機；若要使用其他供應商，務必調整 `host_permissions`。

## 隱私

- API Key 儲存在本機 `chrome.storage.sync`，不會上傳到第三方。
- 僅在你操作時將選取的元素資料（標籤、屬性、文字片段等）送往你設定的 LLM API。

## 開發筆記

- 基於 MV3，背景腳本為 `service_worker`。
- 跨 iframe 透過 `window.postMessage` 溝通，同步開始/停止選取。
- 若要擴充輸出格式或框架，調整 `Extension/background/` 的 Prompt 與 `Extension/content.js` 的結果渲染即可。

## 授權

MIT License

