// background.js — Entry point (module)

import { OpenRouterClient } from './background/OpenRouterClient.js'
import { PromptBuilder } from './background/PromptBuilder.js'
import { RateLimiter } from './background/RateLimiter.js'
import { HistoryStore } from './lib/storage/HistoryStore.js'
import { CacheStore } from './lib/storage/CacheStore.js'

const client = new OpenRouterClient()
const promptBuilder = new PromptBuilder()
const rateLimiter = new RateLimiter(500)
const historyStore = new HistoryStore()
const cacheStore = new CacheStore()

const DEFAULT_SETTINGS = {
  apiKey: '',
  modelName: '',
  temperature: 0.1,
  maxTokens: 512,
  enabledLocatorTypes: ['playwright', 'css', 'xpath', 'selenium'],
  seleniumLanguage: 'python',
  apiKeyStorage: 'sync',
  streamResponses: false
}

let settings = { ...DEFAULT_SETTINGS }

function getStorageArea(strategy) {
  if (strategy === 'local') return chrome.storage.local
  if (strategy === 'session') return chrome.storage.session
  return chrome.storage.sync
}

async function loadSettings() {
  try {
    const syncSettings = await chrome.storage.sync.get(DEFAULT_SETTINGS)
    const strategy = syncSettings.apiKeyStorage || 'sync'

    let apiKey = syncSettings.apiKey || ''
    if (strategy !== 'sync') {
      const storageResult = await getStorageArea(strategy).get({ apiKey: '' })
      apiKey = storageResult.apiKey || ''
    }

    settings = { ...DEFAULT_SETTINGS, ...syncSettings, apiKey }
  } catch (e) {
    console.error('載入設定失敗，使用預設值:', e)
    settings = { ...DEFAULT_SETTINGS }
  }
}

// 監聽設定變動即時更新
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'sync' || area === 'local' || area === 'session') {
    loadSettings().catch((error) => {
      console.error('重新載入設定失敗:', error)
    })
  }
})

async function handleGenerateLocators(elementData, sendResponse) {
  // Task 7.5 — 先查 cache
  const cached = await cacheStore.get(elementData)
  if (cached) {
    sendResponse({
      success: true,
      locators: cached.locators,
      fromCache: true,
      modelInfo: { provider: 'cache' }
    })
    return
  }

  await rateLimiter.run(async () => {
    try {
      const enabledTypes = settings.enabledLocatorTypes || DEFAULT_SETTINGS.enabledLocatorTypes
      const systemPrompt = promptBuilder.buildSystemPrompt(enabledTypes, settings.seleniumLanguage)
      const userPrompt = promptBuilder.buildUserPrompt(elementData)

      const locators = await client.call({
        apiKey: settings.apiKey,
        modelName: settings.modelName,
        systemPrompt,
        userPrompt,
        temperature: settings.temperature,
        maxTokens: settings.maxTokens,
        stream: settings.streamResponses
      })

      // 寫入 cache
      await cacheStore.set(elementData, locators)

      sendResponse({
        success: true,
        locators,
        fromCache: false,
        modelInfo: { provider: 'openrouter', modelName: settings.modelName }
      })
    } catch (error) {
      console.error('生成 locator 失敗:', error)
      sendResponse({ success: false, error: error.message })
    }
  })
}

async function handleTestConnection(sendResponse) {
  try {
    const result = await client.call({
      apiKey: settings.apiKey,
      modelName: settings.modelName,
      systemPrompt: 'You are a helpful assistant.',
      userPrompt: 'Say OK in one word.',
      temperature: 0,
      maxTokens: 10
    })
    sendResponse({ success: true, message: `連線成功。模型回應: "${result.trim()}"` })
  } catch (error) {
    sendResponse({ success: false, error: error.message })
  }
}

// 訊息監聽
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'generateLocators') {
    handleGenerateLocators(message.data, sendResponse)
    return true
  }
  if (message.action === 'testConnection') {
    handleTestConnection(sendResponse)
    return true
  }
  if (message.action === 'reloadSettings') {
    loadSettings().then(() => sendResponse({ success: true }))
    return true
  }
  // Task 7.1 — 歷史紀錄管理
  if (message.action === 'saveHistory') {
    historyStore.push(message.entry).then(() => sendResponse({ success: true })).catch(() => sendResponse({ success: false }))
    return true
  }
  if (message.action === 'getHistory') {
    historyStore.getAll().then(history => sendResponse({ success: true, history })).catch(() => sendResponse({ success: false, history: [] }))
    return true
  }
  if (message.action === 'clearHistory') {
    historyStore.clear().then(() => sendResponse({ success: true })).catch(() => sendResponse({ success: false }))
    return true
  }
  // Task 7.4 — 快取管理
  if (message.action === 'clearCache') {
    cacheStore.clear ? cacheStore.clear().then(() => sendResponse({ success: true })).catch(() => sendResponse({ success: false })) : sendResponse({ success: true })
    return true
  }
})

// extension icon click
chrome.action.onClicked.addListener(async (tab) => {
  try {
    if (tab.url?.startsWith('chrome://') || tab.url?.startsWith('chrome-extension://') || tab.url?.startsWith('edge://')) {
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
          setTimeout(() => window.elementLocatorGenerator.startElementSelection(), 50)
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

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('Element Locator Generator 安裝成功！')
  }
})

// 初始化
loadSettings()
