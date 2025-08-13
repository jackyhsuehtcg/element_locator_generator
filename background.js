// background.js - 處理本地 LLM API 調用和數據處理

class LocalLLMHandler {
  constructor() {
    this.defaultSettings = {
      provider: 'lmstudio',
      apiUrl: 'http://localhost:1234/v1/chat/completions',
      modelName: 'lm-studio',
      apiKey: '',
      temperature: 0.1,
      maxTokens: 512
    };

    this.providers = {
      lmstudio: { parameterName: 'max_tokens' },
      ollama: { parameterName: 'max_tokens' },
      openai: { parameterName: 'max_completion_tokens' },
      gemini: { parameterName: 'maxOutputTokens' },
      anthropic: { parameterName: 'max_tokens' }
    };
    this.settings = { ...this.defaultSettings };
    this.init();
  }

  async init() {
    // 載入設定
    await this.loadSettings();
    
    // 監聽消息
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.action === 'generateLocators') {
        this.handleGenerateLocators(message.data, sendResponse);
        return true; // 保持消息通道開放
      }
    });

    // 監聽 extension icon 點擊
    chrome.action.onClicked.addListener(async (tab) => {
      try {
        // 檢查是否為特殊頁面
        if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://') || tab.url.startsWith('edge://')) {
          // 創建通知
          chrome.notifications.create({
            type: 'basic',
            iconUrl: 'icons/icon48.png',
            title: 'Element Locator Generator',
            message: '無法在此類型頁面使用'
          });
          return;
        }

        // 注入 content script 並開始選擇（包括所有 iframe）
        await chrome.scripting.executeScript({
          target: { tabId: tab.id, allFrames: true },
          func: () => {
            if (window.elementLocatorGenerator) {
              // 強制重置狀態後再啟動，避免狀態不同步
              window.elementLocatorGenerator.forceStop();
              setTimeout(() => {
                // 所有框架統一啟動選擇模式
                window.elementLocatorGenerator.startElementSelection();
              }, 50);
            }
          }
        });
      } catch (error) {
        console.error('啟動元素選擇失敗:', error);
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'icons/icon48.png',
          title: 'Element Locator Generator',
          message: '啟動失敗，請刷新頁面重試'
        });
      }
    });
  }

  async loadSettings() {
    try {
      const result = await chrome.storage.sync.get(this.defaultSettings);
      this.settings = { ...this.defaultSettings, ...result };
      console.log('Settings loaded:', this.settings);
    } catch (error) {
      console.error('Failed to load settings, using defaults:', error);
      this.settings = { ...this.defaultSettings };
    }
  }

  async handleGenerateLocators(elementData, sendResponse) {
    try {
      const prompt = this.buildPrompt(elementData);
      const locators = await this.callLocalLLM(prompt);
      
      sendResponse({ 
        success: true, 
        locators: locators,
        modelInfo: {
          provider: this.settings.provider,
          modelName: this.settings.modelName
        }
      });
    } catch (error) {
      console.error('Error generating locators:', error);
      sendResponse({ 
        success: false, 
        error: `生成 locator 失敗: ${error.message}` 
      });
    }
  }

  buildPrompt(elementData) {
    return `基於以下元素資訊，生成四種不同的 locator。請優先使用 Playwright 語義化定位器，真的無法使用時才用 XPath，最後才用 CSS：

元素: ${elementData.tagName}
ID: ${elementData.id || '無'}
Class: ${elementData.className || '無'}  
Text: ${elementData.text || '無'}
屬性: ${JSON.stringify(elementData.attributes)}
Placeholder: ${elementData.placeholder || '無'}
Value: ${elementData.value || '無'}

請嚴格按照以下格式回應，每行一種 locator：

Playwright: [Playwright特化語法]
CSS: [CSS選擇器]
XPath: [XPath表達式]
Selenium: [Selenium特化代碼]

Playwright 優先級順序：
1. getByRole() - 如果有 role 屬性或語義化標籤 (button, link, textbox 等)
2. getByLabel() - 如果有 aria-label 或關聯的 label
3. getByPlaceholder() - 如果有 placeholder 屬性
4. getByText() - 如果有明確的文本內容
5. getByTestId() - 如果有 data-testid 屬性
6. getByTitle() - 如果有 title 屬性
7. 其他語義化方法如 getByAltText()

範例：
Playwright: page.getByRole('button', { name: 'Submit' })
CSS: #submit-btn
XPath: //button[@id='submit-btn']
Selenium: driver.find_element(By.ID, "submit-btn")

只回應代碼，不要額外解釋。`;
  }

  async callLocalLLM(prompt) {
    const requestBody = this.buildRequestBody(prompt);
    const headers = { 'Content-Type': 'application/json' };
    
    // 設定認證 headers
    this.setAuthHeaders(headers);

    // 處理 Gemini URL
    let apiUrl = this.settings.apiUrl;
    if (this.settings.provider === 'gemini' && this.settings.apiKey) {
      apiUrl += `?key=${this.settings.apiKey}`;
    }

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '無法讀取錯誤');
      throw new Error(`API 連接失敗 (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    console.log('API 回應:', JSON.stringify(data, null, 2));
    
    return this.parseResponse(data);
  }

  buildRequestBody(prompt) {
    const provider = this.providers[this.settings.provider];
    if (!provider) {
      throw new Error('未知的提供商');
    }

    switch (this.settings.provider) {
      case 'openai':
      case 'lmstudio':
      case 'ollama':
        const requestBody = {
          model: this.settings.modelName,
          messages: [{ role: "user", content: prompt }],
          [provider.parameterName]: this.settings.maxTokens,
          stream: false
        };
        
        // GPT-5 系列模型只支援預設 temperature (1)
        if (!this.settings.modelName.startsWith('gpt-5')) {
          requestBody.temperature = this.settings.temperature;
        }
        
        return requestBody;
      
      case 'gemini':
        return {
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: this.settings.temperature,
            maxOutputTokens: this.settings.maxTokens
          }
        };
      
      case 'anthropic':
        return {
          model: this.settings.modelName,
          max_tokens: this.settings.maxTokens,
          temperature: this.settings.temperature,
          messages: [{ role: "user", content: prompt }]
        };
      
      default:
        throw new Error('不支援的提供商類型');
    }
  }

  setAuthHeaders(headers) {
    if (!this.settings.apiKey) return;

    switch (this.settings.provider) {
      case 'openai':
      case 'lmstudio':
      case 'ollama':
        headers['Authorization'] = `Bearer ${this.settings.apiKey}`;
        break;
      
      case 'gemini':
        // Gemini 使用 URL 參數
        break;
      
      case 'anthropic':
        headers['x-api-key'] = this.settings.apiKey;
        headers['anthropic-version'] = '2023-06-01';
        headers['anthropic-dangerous-direct-browser-access'] = 'true';
        break;
    }
  }

  parseResponse(data) {
    switch (this.settings.provider) {
      case 'openai':
      case 'lmstudio':
      case 'ollama':
        if (!data.choices || data.choices.length === 0) {
          console.error('無回應選項:', data);
          throw new Error('API 沒有返回回應');
        }
        
        const choice = data.choices[0];
        if (!choice.message || !choice.message.content) {
          console.error('回應格式異常:', choice);
          throw new Error('API 回應格式異常');
        }
        
        return choice.message.content;
      
      case 'gemini':
        if (!data.candidates || data.candidates.length === 0) {
          console.error('Gemini 無回應候選:', data);
          throw new Error('Gemini API 沒有返回回應');
        }
        
        const candidate = data.candidates[0];
        if (!candidate.content || !candidate.content.parts || candidate.content.parts.length === 0) {
          console.error('Gemini 回應格式異常:', candidate);
          throw new Error('Gemini API 回應格式異常');
        }
        
        return candidate.content.parts[0].text;
      
      case 'anthropic':
        if (!data.content || data.content.length === 0) {
          console.error('Anthropic 無回應內容:', data);
          throw new Error('Anthropic API 沒有返回回應');
        }
        
        if (!data.content[0].text) {
          console.error('Anthropic 回應格式異常:', data.content[0]);
          throw new Error('Anthropic API 回應格式異常');
        }
        
        return data.content[0].text;
      
      default:
        throw new Error('不支援的提供商類型');
    }
  }
}

// 初始化
const localLLMHandler = new LocalLLMHandler();

// 安裝時的歡迎訊息
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('Element Locator Generator 安裝成功！');
  }
});