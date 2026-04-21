// background.js - 處理 OpenRouter API 調用和數據處理

class OpenRouterHandler {
  constructor() {
    this.defaultSettings = {
      apiKey: '',
      modelName: '',
      temperature: 0.1,
      maxTokens: 512
    }

    this.settings = { ...this.defaultSettings }
    this.apiUrl = 'https://openrouter.ai/api/v1/chat/completions'
    this.init()
  }

  async init() {
    await this.loadSettings()
    
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.action === 'generateLocators') {
        this.handleGenerateLocators(message.data, sendResponse)
        return true
      }
    })

    chrome.action.onClicked.addListener(async (tab) => {
      try {
        if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://') || tab.url.startsWith('edge://')) {
          chrome.notifications.create({
            type: 'basic',
            iconUrl: 'icons/icon48.png',
            title: 'Element Locator Generator',
            message: '無法在此類型頁面使用'
          })
          return
        }

        await chrome.scripting.executeScript({
          target: { tabId: tab.id, allFrames: true },
          func: () => {
            if (window.elementLocatorGenerator) {
              window.elementLocatorGenerator.forceStop()
              setTimeout(() => {
                window.elementLocatorGenerator.startElementSelection()
              }, 50)
            }
          }
        })
      } catch (error) {
        console.error('啟動元素選擇失敗:', error)
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'icons/icon48.png',
          title: 'Element Locator Generator',
          message: '啟動失敗，請刷新頁面重試'
        })
      }
    })
  }

  async loadSettings() {
    try {
      const result = await chrome.storage.sync.get(this.defaultSettings)
      this.settings = { ...this.defaultSettings, ...result }
      console.log('Settings loaded:', this.settings)
    } catch (error) {
      console.error('Failed to load settings, using defaults:', error)
      this.settings = { ...this.defaultSettings }
    }
  }

  async handleGenerateLocators(elementData, sendResponse) {
    try {
      const prompt = this.buildPrompt(elementData)
      const locators = await this.callOpenRouter(prompt)
      
      sendResponse({ 
        success: true, 
        locators: locators,
        modelInfo: {
          provider: 'openrouter',
          modelName: this.settings.modelName
        }
      })
    } catch (error) {
      console.error('Error generating locators:', error)
      sendResponse({ 
        success: false, 
        error: `生成 locator 失敗: ${error.message}` 
      })
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

只回應代碼，不要額外解釋。`
  }

  async callOpenRouter(prompt) {
    const requestBody = {
      model: this.settings.modelName,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: this.settings.maxTokens,
      temperature: this.settings.temperature,
      stream: false
    }

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.settings.apiKey}`
    }

    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(requestBody)
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => '無法讀取錯誤')
      throw new Error(`API 連接失敗 (${response.status}): ${errorText}`)
    }

    const data = await response.json()
    console.log('API 回應:', JSON.stringify(data, null, 2))
    
    return this.parseResponse(data)
  }

  parseResponse(data) {
    if (!data.choices || data.choices.length === 0) {
      console.error('無回應選項:', data)
      throw new Error('API 沒有返回回應')
    }
    
    const choice = data.choices[0]
    if (!choice.message || !choice.message.content) {
      console.error('回應格式異常:', choice)
      throw new Error('API 回應格式異常')
    }
    
    return choice.message.content
  }
}

const openRouterHandler = new OpenRouterHandler()

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('Element Locator Generator 安裝成功！')
  }
})
