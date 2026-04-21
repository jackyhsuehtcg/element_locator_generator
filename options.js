// options.js - 設定頁面功能

class OptionsManager {
  constructor() {
    this.defaultSettings = {
      apiKey: '',
      modelName: '',
      temperature: 0.1,
      maxTokens: 512
    };

    this.init()
  }

  async init() {
    this.bindEvents()
    await this.loadSettings()
    console.log('Options manager initialized')
  }

  async loadSettings() {
    try {
      const result = await chrome.storage.sync.get(this.defaultSettings)
      this.currentSettings = { ...this.defaultSettings, ...result }
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

    this.updateSliderOutput('temperature')
    this.updateSliderOutput('maxTokens')
  }

  updateSliderOutput(id) {
    const slider = document.getElementById(id)
    const output = slider.nextElementSibling
    output.textContent = slider.value
  }

  bindEvents() {
    document.getElementById('toggleApiKeyBtn')
      .addEventListener('click', () => {
        const input = document.getElementById('apiKey')
        input.type = input.type === 'password' ? 'text' : 'password'
      })

    document.querySelectorAll('.form-slider').forEach(slider => {
      slider.addEventListener('input', (e) => {
        e.target.nextElementSibling.textContent = e.target.value
      })
    })

    document.getElementById('settingsForm').addEventListener('submit', (e) => {
      e.preventDefault()
      this.saveSettings()
    })

    document.getElementById('testButton').addEventListener('click', () => {
      this.testConnection()
    })
  }

  getFormData() {
    return {
      apiKey: document.getElementById('apiKey').value.trim(),
      modelName: document.getElementById('modelName').value.trim(),
      temperature: parseFloat(document.getElementById('temperature').value) || 0.1,
      maxTokens: parseInt(document.getElementById('maxTokens').value) || 512
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

      await chrome.storage.sync.set(settings)
      this.currentSettings = settings
      this.populateForm()

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

      const headers = {
        'Authorization': `Bearer ${settings.apiKey}`,
        'Content-Type': 'application/json'
      }

      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: headers,
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
      setTimeout(() => { resultDiv.style.display = 'none' }, 5000)
    }
  }

  showMessage(message, type = 'info') {
    const notification = document.createElement('div')
    notification.className = `notification notification-${type}`
    notification.innerHTML = `
      <span>${message}</span>
      <button class="notification-close">✕</button>
    `
    notification.querySelector('.notification-close')
      .addEventListener('click', () => notification.remove())

    document.body.insertBefore(notification, document.body.firstChild)

    setTimeout(() => {
      if (notification.parentElement) notification.remove()
    }, 5000)
  }
}

document.addEventListener('DOMContentLoaded', () => new OptionsManager())
