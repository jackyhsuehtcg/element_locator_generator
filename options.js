// options.js - 設定頁面功能

class OptionsManager {
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
      lmstudio: {
        name: 'LM Studio',
        apiUrl: 'http://localhost:1234/v1/chat/completions',
        models: ['lm-studio', 'llama-2-7b', 'llama-2-13b', 'codellama-7b'],
        defaultModel: 'lm-studio',
        requiresKey: false,
        parameterName: 'max_tokens'
      },
      ollama: {
        name: 'Ollama',
        apiUrl: 'http://localhost:11434/v1/chat/completions',
        models: ['llama3.2', 'llama3.1', 'llama2', 'codellama', 'mistral'],
        defaultModel: 'llama3.2',
        requiresKey: false,
        parameterName: 'max_tokens'
      },
      openai: {
        name: 'OpenAI',
        apiUrl: 'https://api.openai.com/v1/chat/completions',
        models: ['gpt-5', 'gpt-5-mini', 'gpt-4o'],
        defaultModel: 'gpt-5-mini',
        requiresKey: true,
        parameterName: 'max_completion_tokens'
      },
      gemini: {
        name: 'Google Gemini',
        apiUrl: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
        models: ['gemini-2.5-flash', 'gemini-2.5-pro'],
        defaultModel: 'gemini-2.5-flash',
        requiresKey: true,
        parameterName: 'maxOutputTokens'
      },
      anthropic: {
        name: 'Anthropic',
        apiUrl: 'https://api.anthropic.com/v1/messages',
        models: ['claude-4-sonnet-20250514', 'claude-3-7-sonnet-20250219'],
        defaultModel: 'claude-4-sonnet-20250514',
        requiresKey: true,
        parameterName: 'max_tokens'
      }
    };

    this.init();
  }

  async init() {
    // 載入當前設定
    await this.loadSettings();
    
    // 綁定事件
    this.bindEvents();
    
    console.log('Options manager initialized');
  }

  async loadSettings() {
    try {
      const result = await chrome.storage.sync.get(this.defaultSettings);
      this.currentSettings = { ...this.defaultSettings, ...result };
      
      // 填入表單
      this.populateForm();
    } catch (error) {
      console.error('Failed to load settings:', error);
      this.currentSettings = { ...this.defaultSettings };
      this.populateForm();
    }
  }

  populateForm() {
    document.getElementById('provider').value = this.currentSettings.provider || 'lmstudio';
    document.getElementById('apiUrl').value = this.currentSettings.apiUrl;
    document.getElementById('modelName').value = this.currentSettings.modelName;
    document.getElementById('apiKey').value = this.currentSettings.apiKey;
    document.getElementById('temperature').value = this.currentSettings.temperature;
    document.getElementById('maxTokens').value = this.currentSettings.maxTokens;
    
    // 更新模型選項和其他欄位
    this.updateProviderFields(this.currentSettings.provider || 'lmstudio');
  }

  bindEvents() {
    // 提供商變更
    document.getElementById('provider').addEventListener('change', (e) => {
      this.updateProviderFields(e.target.value);
    });

    // 表單提交
    document.getElementById('settingsForm').addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveSettings();
    });

    // 測試連接
    document.getElementById('testButton').addEventListener('click', () => {
      this.testConnection();
    });


    // 即時驗證 URL 格式
    document.getElementById('apiUrl').addEventListener('input', (e) => {
      this.validateUrl(e.target);
    });
  }

  updateProviderFields(providerId) {
    if (!providerId || !this.providers[providerId]) {
      return;
    }

    const provider = this.providers[providerId];
    
    // 更新 API URL
    document.getElementById('apiUrl').value = provider.apiUrl;
    
    // 更新模型名稱為下拉選單
    const modelNameInput = document.getElementById('modelName');
    const modelContainer = modelNameInput.parentElement;
    
    // 移除現有的模型輸入框
    modelNameInput.remove();
    
    // 創建模型選擇下拉選單
    const modelSelect = document.createElement('select');
    modelSelect.id = 'modelName';
    modelSelect.name = 'modelName';
    modelSelect.className = 'form-input';
    modelSelect.required = true;
    
    // 添加模型選項
    provider.models.forEach(model => {
      const option = document.createElement('option');
      option.value = model;
      option.textContent = model;
      if (model === provider.defaultModel) {
        option.selected = true;
      }
      modelSelect.appendChild(option);
    });
    
    // 插入新的下拉選單
    const modelHint = modelContainer.querySelector('.form-hint');
    modelContainer.insertBefore(modelSelect, modelHint);
    
    // 更新提示文字
    modelHint.textContent = `選擇 ${provider.name} 模型`;
    
    // 更新 API Key 欄位的提示和必填狀態
    const apiKeyInput = document.getElementById('apiKey');
    const apiKeyHint = apiKeyInput.parentElement.querySelector('.form-hint');
    
    if (provider.requiresKey) {
      apiKeyInput.required = true;
      apiKeyHint.textContent = `${provider.name} API Key (必填)`;
      apiKeyInput.parentElement.querySelector('.form-label .label-text').innerHTML = 'API Key <span class="label-required">*</span>';
    } else {
      apiKeyInput.required = false;
      apiKeyHint.textContent = `${provider.name} API Key (選填，本地服務通常不需要)`;
      apiKeyInput.parentElement.querySelector('.form-label .label-text').innerHTML = 'API Key';
    }
  }

  buildRequestBody(settings, content, maxTokens) {
    const provider = this.providers[settings.provider];
    if (!provider) {
      throw new Error('未知的提供商');
    }

    switch (settings.provider) {
      case 'openai':
      case 'lmstudio':
      case 'ollama':
        const requestBody = {
          model: settings.modelName,
          messages: [{ role: "user", content: content }],
          [provider.parameterName]: maxTokens,
          stream: false
        };
        
        // GPT-5 系列模型只支援預設 temperature (1)
        if (!settings.modelName.startsWith('gpt-5')) {
          requestBody.temperature = settings.temperature;
        }
        
        return requestBody;
      
      case 'gemini':
        return {
          contents: [{ parts: [{ text: content }] }],
          generationConfig: {
            temperature: settings.temperature,
            maxOutputTokens: maxTokens
          }
        };
      
      case 'anthropic':
        return {
          model: settings.modelName,
          max_tokens: maxTokens,
          temperature: settings.temperature,
          messages: [{ role: "user", content: content }]
        };
      
      default:
        throw new Error('不支援的提供商類型');
    }
  }

  setAuthHeaders(headers, settings) {
    if (!settings.apiKey) return;

    switch (settings.provider) {
      case 'openai':
      case 'lmstudio':
      case 'ollama':
        headers['Authorization'] = `Bearer ${settings.apiKey}`;
        break;
      
      case 'gemini':
        // Gemini 使用 URL 參數，不需要 header
        break;
      
      case 'anthropic':
        headers['x-api-key'] = settings.apiKey;
        headers['anthropic-version'] = '2023-06-01';
        headers['anthropic-dangerous-direct-browser-access'] = 'true';
        break;
    }
  }

  validateUrl(input) {
    try {
      new URL(input.value);
      input.setCustomValidity('');
    } catch {
      if (input.value) {
        input.setCustomValidity('請輸入有效的 URL 格式');
      } else {
        input.setCustomValidity('');
      }
    }
  }

  async saveSettings() {
    try {
      // 獲取表單資料
      const formData = new FormData(document.getElementById('settingsForm'));
      const settings = {
        provider: formData.get('provider').trim(),
        apiUrl: formData.get('apiUrl').trim(),
        modelName: formData.get('modelName').trim() || 'lm-studio',
        apiKey: formData.get('apiKey').trim(),
        temperature: parseFloat(formData.get('temperature')) || 0.1,
        maxTokens: parseInt(formData.get('maxTokens')) || 512
      };

      // 驗證 URL
      try {
        new URL(settings.apiUrl);
      } catch {
        this.showMessage('請輸入有效的 API URL', 'error');
        return;
      }

      // 儲存到 Chrome storage
      await chrome.storage.sync.set(settings);
      this.currentSettings = settings;
      
      this.showMessage('設定已成功儲存！', 'success');
      
      console.log('Settings saved:', settings);
    } catch (error) {
      console.error('Failed to save settings:', error);
      this.showMessage('儲存設定時發生錯誤：' + error.message, 'error');
    }
  }

  async testConnection() {
    const testButton = document.getElementById('testButton');
    const originalText = testButton.textContent;
    
    try {
      // 禁用按鈕並顯示載入狀態
      testButton.disabled = true;
      testButton.textContent = '🔄 測試中...';
      
      // 獲取當前表單的設定
      const formData = new FormData(document.getElementById('settingsForm'));
      const settings = {
        provider: formData.get('provider').trim(),
        apiUrl: formData.get('apiUrl').trim(),
        modelName: formData.get('modelName').trim() || 'lm-studio',
        apiKey: formData.get('apiKey').trim(),
        temperature: parseFloat(formData.get('temperature')) || 0.1,
        maxTokens: parseInt(formData.get('maxTokens')) || 512
      };

      // 根據提供商準備不同的請求體
      const requestBody = this.buildRequestBody(settings, "測試連接：請回應 'OK'", 50);

      const headers = {
        'Content-Type': 'application/json'
      };

      // 根據提供商設定 headers
      this.setAuthHeaders(headers, settings);

      // 處理 Gemini API URL
      let apiUrl = settings.apiUrl;
      if (settings.provider === 'gemini' && settings.apiKey) {
        apiUrl += `?key=${settings.apiKey}`;
      }

      // 發送測試請求
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => '無法讀取錯誤訊息');
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      
      // 根據不同提供商解析回應
      let responseContent = '';
      switch (settings.provider) {
        case 'openai':
        case 'lmstudio':
        case 'ollama':
          if (!data.choices || data.choices.length === 0) {
            throw new Error('API 回應格式異常：沒有找到 choices 欄位');
          }
          responseContent = data.choices[0].message?.content || '已收到回應';
          break;
        
        case 'gemini':
          if (!data.candidates || data.candidates.length === 0) {
            throw new Error('Gemini API 回應格式異常：沒有找到 candidates 欄位');
          }
          responseContent = data.candidates[0].content?.parts?.[0]?.text || '已收到回應';
          break;
        
        case 'anthropic':
          if (!data.content || data.content.length === 0) {
            throw new Error('Anthropic API 回應格式異常：沒有找到 content 欄位');
          }
          responseContent = data.content[0]?.text || '已收到回應';
          break;
        
        default:
          responseContent = '已收到回應';
      }

      // 測試成功
      this.showTestResult('✅ 連接測試成功！', 'success', `回應：${responseContent}`);
      
    } catch (error) {
      console.error('Connection test failed:', error);
      let errorMessage = '連接測試失敗';
      
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        errorMessage = '無法連接到伺服器，請檢查 URL 是否正確且伺服器正在運行';
      } else {
        errorMessage = `連接測試失敗：${error.message}`;
      }
      
      this.showTestResult('❌ ' + errorMessage, 'error');
    } finally {
      // 恢復按鈕狀態
      testButton.disabled = false;
      testButton.textContent = originalText;
    }
  }

  showTestResult(message, type, detail = '') {
    const resultDiv = document.getElementById('testResult');
    const iconDiv = document.getElementById('testResultIcon');
    const messageDiv = document.getElementById('testResultMessage');
    
    // 設定圖示和訊息
    if (type === 'success') {
      iconDiv.textContent = '✅';
      messageDiv.innerHTML = `<strong>${message}</strong>${detail ? `<br><small>${detail}</small>` : ''}`;
      resultDiv.className = 'test-result test-result-success';
    } else {
      iconDiv.textContent = '❌';
      messageDiv.innerHTML = `<strong>${message}</strong>${detail ? `<br><small>${detail}</small>` : ''}`;
      resultDiv.className = 'test-result test-result-error';
    }
    
    // 顯示結果
    resultDiv.style.display = 'block';
    
    // 自動隱藏成功訊息
    if (type === 'success') {
      setTimeout(() => {
        resultDiv.style.display = 'none';
      }, 5000);
    }
  }

  showMessage(message, type = 'info') {
    // 創建臨時通知
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
      <span>${message}</span>
      <button class="notification-close" onclick="this.parentElement.remove()">✖</button>
    `;
    
    // 插入到頁面頂部
    document.body.insertBefore(notification, document.body.firstChild);
    
    // 自動移除
    setTimeout(() => {
      if (notification.parentElement) {
        notification.remove();
      }
    }, 5000);
  }
}

// 初始化
document.addEventListener('DOMContentLoaded', () => {
  new OptionsManager();
});