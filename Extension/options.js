// options.js - 設定頁面功能

class OptionsManager {
  constructor() {
    this.defaultSettings = {
      apiKey: '',
      modelName: '',
      temperature: 0.1,
      maxTokens: 512,
      enabledLocatorTypes: ['playwright', 'css', 'xpath', 'selenium'],
      seleniumLanguage: 'python',
      enableSensitiveFilter: true,
      showPreviewModal: false,
      customBlacklist: [],
      apiKeyStorage: 'sync'
    }

    this.currentSettings = { ...this.defaultSettings }
    this.init()
  }

  async init() {
    this.bindEvents()
    await this.loadSettings()
    console.log('Options manager initialized')
  }

  _getStorage(strategy) {
    if (strategy === 'local') return chrome.storage.local
    if (strategy === 'session') return chrome.storage.session
    return chrome.storage.sync
  }

  async loadSettings() {
    try {
      const syncResult = await chrome.storage.sync.get(this.defaultSettings)
      const strategy = syncResult.apiKeyStorage || 'sync'

      let apiKey = syncResult.apiKey || ''
      if (strategy !== 'sync') {
        const storageResult = await this._getStorage(strategy).get({ apiKey: '' })
        apiKey = storageResult.apiKey || ''
      }

      this.currentSettings = { ...this.defaultSettings, ...syncResult, apiKey }
      this.populateForm()
    } catch (error) {
      console.error('Failed to load settings:', error)
      this.currentSettings = { ...this.defaultSettings }
      this.populateForm()
    }
  }

  populateForm() {
    document.getElementById('apiKey').value = this.currentSettings.apiKey || ''
    document.getElementById('modelName').value = this.currentSettings.modelName || ''
    document.getElementById('temperature').value = this.currentSettings.temperature
    document.getElementById('maxTokens').value = this.currentSettings.maxTokens

    const enabledTypes = this.currentSettings.enabledLocatorTypes || this.defaultSettings.enabledLocatorTypes
    document.querySelectorAll('input[name="locatorType"]').forEach((checkbox) => {
      checkbox.checked = enabledTypes.includes(checkbox.value)
    })

    document.getElementById('seleniumLanguage').value = this.currentSettings.seleniumLanguage || 'python'
    document.getElementById('enableSensitiveFilter').checked = this.currentSettings.enableSensitiveFilter !== false
    document.getElementById('showPreviewModal').checked = !!this.currentSettings.showPreviewModal
    document.getElementById('customBlacklist').value = Array.isArray(this.currentSettings.customBlacklist)
      ? this.currentSettings.customBlacklist.join('\n')
      : ''
    document.getElementById('apiKeyStorage').value = this.currentSettings.apiKeyStorage || 'sync'

    this._updateSeleniumLanguageVisibility()
    this.updateSliderOutput('temperature')
    this.updateSliderOutput('maxTokens')
  }

  _updateSeleniumLanguageVisibility() {
    const seleniumChecked = document.getElementById('lt_selenium')?.checked
    const group = document.getElementById('seleniumLanguageGroup')
    if (group) group.style.display = seleniumChecked ? '' : 'none'
  }

  updateSliderOutput(id) {
    const slider = document.getElementById(id)
    const output = slider?.nextElementSibling
    if (slider && output) {
      output.textContent = slider.value
    }
  }

  bindEvents() {
    document.getElementById('toggleApiKeyBtn').addEventListener('click', () => {
      const input = document.getElementById('apiKey')
      input.type = input.type === 'password' ? 'text' : 'password'
    })

    document.querySelectorAll('.form-slider').forEach((slider) => {
      slider.addEventListener('input', (event) => {
        const output = event.target.nextElementSibling
        if (output) output.textContent = event.target.value
      })
    })

    document.getElementById('settingsForm').addEventListener('submit', async (event) => {
      event.preventDefault()
      await this.saveSettings()
    })

    document.getElementById('testButton').addEventListener('click', () => {
      this.testConnection()
    })

    document.getElementById('lt_selenium')?.addEventListener('change', () => {
      this._updateSeleniumLanguageVisibility()
    })

    document.getElementById('clearHistoryBtn')?.addEventListener('click', async () => {
      if (!confirm('確定要清除所有歷史紀錄？')) return

      try {
        await chrome.runtime.sendMessage({ action: 'clearHistory' })
        this.showMessage('歷史紀錄已清除', 'success')
      } catch (error) {
        this.showMessage('清除歷史紀錄失敗：' + error.message, 'error')
      }
    })

    document.getElementById('clearCacheBtn')?.addEventListener('click', async () => {
      try {
        await chrome.runtime.sendMessage({ action: 'clearCache' })
        this.showMessage('快取已清除', 'success')
      } catch (error) {
        this.showMessage('清除快取失敗：' + error.message, 'error')
      }
    })
  }

  getFormData() {
    const customBlacklistRaw = document.getElementById('customBlacklist').value.trim()
    const enabledLocatorTypes = Array.from(document.querySelectorAll('input[name="locatorType"]:checked'))
      .map((checkbox) => checkbox.value)

    return {
      apiKey: document.getElementById('apiKey').value.trim(),
      modelName: document.getElementById('modelName').value.trim(),
      temperature: parseFloat(document.getElementById('temperature').value) || 0.1,
      maxTokens: parseInt(document.getElementById('maxTokens').value, 10) || 512,
      enabledLocatorTypes: enabledLocatorTypes.length > 0 ? enabledLocatorTypes : this.defaultSettings.enabledLocatorTypes,
      seleniumLanguage: document.getElementById('seleniumLanguage').value || 'python',
      enableSensitiveFilter: document.getElementById('enableSensitiveFilter').checked,
      showPreviewModal: document.getElementById('showPreviewModal').checked,
      customBlacklist: customBlacklistRaw ? customBlacklistRaw.split('\n').map((line) => line.trim()).filter(Boolean) : [],
      apiKeyStorage: document.getElementById('apiKeyStorage').value || 'sync'
    }
  }

  async saveSettings() {
    try {
      const settings = this.getFormData()

      if (!settings.apiKey) {
        this.showMessage('請輸入 API Key', 'error')
        return
      }

      if (!settings.modelName) {
        this.showMessage('請輸入模型名稱', 'error')
        return
      }

      const { apiKey, apiKeyStorage, ...restSettings } = settings
      const syncSettings = { ...restSettings, apiKeyStorage }

      if (apiKeyStorage === 'sync') {
        await chrome.storage.sync.set(settings)
        await chrome.storage.local.remove('apiKey').catch(() => {})
        await chrome.storage.session.remove('apiKey').catch(() => {})
      } else {
        await chrome.storage.sync.set(syncSettings)
        await chrome.storage.sync.remove('apiKey').catch(() => {})
        await chrome.storage.local.remove('apiKey').catch(() => {})
        await chrome.storage.session.remove('apiKey').catch(() => {})
        await this._getStorage(apiKeyStorage).set({ apiKey })
      }

      try {
        await chrome.runtime.sendMessage({ action: 'reloadSettings' })
      } catch (_) {
        // 背景頁未就緒時忽略，重新開啟頁面仍會自動載入設定
      }

      await this.loadSettings()
      this.showMessage('設定已成功儲存！', 'success')
    } catch (error) {
      console.error('Failed to save settings:', error)
      this.showMessage('儲存設定時發生錯誤：' + error.message, 'error')
    }
  }

  async testConnection() {
    const testButton = document.getElementById('testButton')
    const originalHTML = testButton.innerHTML

    try {
      testButton.disabled = true
      testButton.textContent = 'Testing...'

      const settings = this.getFormData()

      if (!settings.apiKey) {
        throw new Error('請輸入 API Key')
      }

      if (!settings.modelName) {
        throw new Error('請輸入模型名稱')
      }

      const requestBody = {
        model: settings.modelName,
        messages: [{ role: 'user', content: '測試連接：請回應 "OK"' }],
        max_tokens: 50,
        temperature: settings.temperature,
        stream: false
      }

      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${settings.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      })

      if (!response.ok) {
        const errorText = await response.text().catch(() => '無法讀取錯誤訊息')
        throw new Error(`HTTP ${response.status}: ${errorText}`)
      }

      const data = await response.json()
      if (!data.choices || data.choices.length === 0) {
        throw new Error('API 回應格式異常：沒有找到 choices 欄位')
      }

      const responseContent = data.choices[0].message?.content || '已收到回應'
      this.showTestResult('Connection successful', 'success', `Response: ${responseContent}`)
    } catch (error) {
      console.error('Connection test failed:', error)
      this.showTestResult(error.message, 'error')
    } finally {
      testButton.disabled = false
      testButton.innerHTML = originalHTML
    }
  }

  showTestResult(message, type, detail = '') {
    const resultDiv = document.getElementById('testResult')
    const iconDiv = document.getElementById('testResultIcon')
    const messageDiv = document.getElementById('testResultMessage')

    iconDiv.textContent = type === 'success' ? '✓' : '✕'
    messageDiv.innerHTML = `<strong>${message}</strong>${detail ? `<br><small>${detail}</small>` : ''}`
    resultDiv.className = `test-result test-result-${type}`
    resultDiv.style.display = 'flex'

    if (type === 'success') {
      setTimeout(() => {
        resultDiv.style.display = 'none'
      }, 5000)
    }
  }

  showMessage(message, type = 'info') {
    const notification = document.createElement('div')
    notification.className = `notification notification-${type}`
    notification.innerHTML = `
      <span>${message}</span>
      <button class="notification-close">✕</button>
    `

    notification.querySelector('.notification-close').addEventListener('click', () => {
      notification.remove()
    })

    document.body.insertBefore(notification, document.body.firstChild)

    setTimeout(() => {
      if (notification.parentElement) notification.remove()
    }, 5000)
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new OptionsManager()
})
