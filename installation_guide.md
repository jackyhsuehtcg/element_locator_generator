# Chrome Extension - Element Locator Generator 安裝指南

## 📋 專案概述

這個 Chrome Extension 可以讓你點擊網頁上的任何元素，自動調用 Gemini AI 來生成多種可靠的 element locator，非常適合 QA 自動化測試工程師使用。

## 🎯 主要功能

- **智能元素檢測**: 點擊網頁元素自動收集詳細資訊
- **AI 驅動分析**: 使用 Gemini AI 分析元素特徵
- **多種 Locator 策略**: 生成適用於 Selenium、Playwright、Cypress 的 locator
- **優先級排序**: AI 會根據穩定性和可維護性排序推薦
- **多框架支援**: 提供 Python、JavaScript 等不同語言的實作範例

## 📁 檔案結構

```
chrome-extension/
├── manifest.json          # Extension 設定檔
├── background.js          # 背景腳本 - 處理 Gemini API
├── content.js            # 內容腳本 - 元素檢測和互動
├── content.css           # 樣式檔案
├── popup.html            # 彈出視窗 HTML
├── popup.js              # 彈出視窗邏輯
└── icons/                # 圖示資料夾
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

## 🚀 安裝步驟

### 1. 準備檔案

創建一個新資料夾 `element-locator-generator`，然後將所有程式碼檔案放入其中。

### 2. 準備圖示

在 `icons/` 資料夾中放入以下尺寸的圖示：
- `icon16.png` (16x16)
- `icon48.png` (48x48)  
- `icon128.png` (128x128)

你可以使用任何圖示，建議使用目標/瞄準相關的圖案。

### 3. 載入 Extension

1. 打開 Chrome 瀏覽器
2. 在網址列輸入 `chrome://extensions/`
3. 開啟右上角的「開發者模式」
4. 點擊「載入未封裝項目」
5. 選擇你的 `element-locator-generator` 資料夾
6. Extension 會出現在擴充功能列表中

## 🔑 取得 Gemini API Key

1. 前往 [Google AI Studio](https://makersuite.google.com/app/apikey)
2. 登入你的 Google 帳戶
3. 點擊 "Create API key"
4. 複製生成的 API key（通常以 `AIza` 開頭）

## 📖 使用方法

### 基本使用流程

1. **設置 API Key**
   - 點擊瀏覽器工具列中的 Extension 圖示
   - 在彈出視窗中輸入你的 Gemini API Key
   - 點擊「保存」

2. **開始元素選擇**
   - 在彈出視窗中點擊「開始選擇元素」
   - 頁面頂部會出現提示訊息
   - 滑鼠游標會變成十字線

3. **選擇目標元素**
   - 移動滑鼠到想要分析的元素上（會有高亮效果）
   - 點擊該元素
   - Extension 會自動收集元素資訊並發送給 Gemini AI

4. **查看生成結果**
   - AI 分析完成後會彈出結果視窗
   - 包含多種 locator 策略和實作範例
   - 可以點擊「複製到剪貼板」保存結果

### 高級使用技巧

- **按 ESC 鍵**: 隨時退出元素選擇模式
- **多種策略**: AI 會提供主要、次選、備用三種策略
- **框架特定**: 結果包含 Selenium、Playwright、Cypress 的具體用法
- **穩定性評估**: 每個策略都有穩定性評分（1-5 星）

## 🛠 自訂和擴展

### 修改 AI Prompt

在 `background.js` 中的 `buildPrompt` 方法可以自訂發送給 Gemini 的提示詞：

```javascript
buildPrompt(elementData) {
  return `你是一個專業的 QA 自動化測試工程師...`;
}
```

### 新增 Locator 策略

可以在 prompt 中要求 AI 生成特定類型的 locator，例如：
- 自訂 data attributes
- 特定的 CSS selector 模式
- XPath 變體

### 支援更多測試框架

修改 prompt 以包含其他測試框架：
- Robot Framework
- TestCafe  
- WebdriverIO
- Puppeteer

## 🔧 故障排除

### 常見問題

1. **Extension 無法載入**
   - 檢查 manifest.json 格式是否正確
   - 確保所有檔案都在正確位置

2. **無法點擊元素**
   - 重新載入目標網頁
   - 檢查是否在特殊頁面（chrome:// 等）

3. **API 調用失敗**
   - 確認 API Key 格式正確
   - 檢查網路連線
   - 查看開發者工具的 Console 錯誤訊息

4. **某些網站無法使用**
   - 某些網站有 CSP 限制
   - 嘗試在其他網站測試

### 偵錯技巧

1. 開啟 Chrome DevTools
2. 切換到 Console 標籤
3. 查看是否有錯誤訊息
4. 在 Extensions 頁面點擊「檢查視圖」查看詳細錯誤

## 🔒 隱私和安全

- API Key 儲存在本機 Chrome storage 中
- 元素資料只發送給 Gemini API
- 不會收集或儲存個人資料
- 建議定期更換 API Key

## 📈 未來改進方向

- [ ] 支援批量元素分析
- [ ] 加入 locator 驗證功能  
- [ ] 提供更多測試框架支援
- [ ] 加入本地儲存歷史記錄
- [ ] 支援 Shadow DOM 元素
- [ ] 加入效能最佳化

## 🤝 貢獻

歡迎提交 Issue 和 Pull Request 來改進這個專案！

## 📄 授權

這個專案使用 MIT 授權條款。