// background/ErrorClassifier.js — HTTP 錯誤分類與使用者友善訊息

export class ErrorClassifier {
  /**
   * @param {number|null} status HTTP status code，null 表示 network error
   * @param {string} [body] 回應 body
   * @param {Headers} [headers] 回應 headers
   * @returns {{ message: string, code: string }}
   */
  classify(status, body = '', headers = null) {
    if (!status) {
      return {
        code: 'network',
        message: '網路連線失敗，請確認您的網路連線後重試。'
      }
    }
    switch (status) {
      case 401:
        return {
          code: 'auth',
          message: 'API Key 無效，請至設定頁確認您的 OpenRouter API Key。'
        }
      case 402:
        return {
          code: 'billing',
          message: 'OpenRouter 帳戶餘額不足，請前往 openrouter.ai 儲值。'
        }
      case 429: {
        const retryAfter = headers?.get?.('retry-after')
        const wait = retryAfter ? `（${retryAfter} 秒後重試）` : ''
        return {
          code: 'rate_limit',
          message: `請求頻率超出限制${wait}，請稍後再試。`
        }
      }
      default:
        if (status >= 500) {
          return {
            code: 'server',
            message: `OpenRouter 伺服器暫時不可用 (${status})，請稍後重試。`
          }
        }
        return {
          code: 'unknown',
          message: `API 請求失敗 (${status}): ${body.substring(0, 100)}`
        }
    }
  }
}
