// background/ResponseParser.js — 解析 OpenRouter 回應

export class ResponseParser {
  /**
   * 解析非 streaming 回應
   * @param {Object} data
   * @returns {string} locator 文字
   */
  parse(data) {
    if (!data.choices || data.choices.length === 0) {
      throw new Error('API 沒有返回回應')
    }
    const choice = data.choices[0]
    if (!choice.message?.content) {
      throw new Error('API 回應格式異常')
    }
    return choice.message.content
  }

  /**
   * 累加 streaming chunk
   * @param {string} chunk SSE data line content
   * @param {string} accumulated 目前累積的內容
   * @returns {{ done: boolean, accumulated: string }}
   */
  parseChunk(chunk, accumulated = '') {
    if (chunk === '[DONE]') return { done: true, accumulated }
    try {
      const data = JSON.parse(chunk)
      const delta = data.choices?.[0]?.delta?.content || ''
      return { done: false, accumulated: accumulated + delta }
    } catch (_) {
      return { done: false, accumulated }
    }
  }
}
