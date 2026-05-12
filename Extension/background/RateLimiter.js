// background/RateLimiter.js — client-side rate limit（debounce + queue）

export class RateLimiter {
  constructor(minIntervalMs = 500) {
    this.minInterval = minIntervalMs
    this._lastAt = 0
    this._pending = null
    this._inFlight = false
  }

  /**
   * 包裝 async fn，確保最小間隔並防止並發
   * @param {Function} fn 要執行的 async 函數
   * @returns {Promise}
   */
  async run(fn) {
    if (this._inFlight) {
      // 已有飛行中請求 — 以最新 fn 取代 pending
      this._pending = fn
      return null
    }

    const now = Date.now()
    const wait = Math.max(0, this.minInterval - (now - this._lastAt))

    if (wait > 0) {
      await new Promise(res => setTimeout(res, wait))
    }

    this._inFlight = true
    this._lastAt = Date.now()
    try {
      const result = await fn()
      return result
    } finally {
      this._inFlight = false
      // 執行 pending（若有）
      if (this._pending) {
        const next = this._pending
        this._pending = null
        // 不 await，讓 caller 管理
        this.run(next)
      }
    }
  }
}
