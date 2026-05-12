// lib/storage/CacheStore.js — Locator 結果快取（chrome.storage.session）

const STORAGE_KEY = 'locator_cache'
const MAX_ENTRIES = 100

export class CacheStore {
  _fingerprint(elementData) {
    const hourBucket = Math.floor(Date.now() / 3_600_000)
    const origin = new URL(elementData.url || location.href).origin
    const tag = elementData.tagName || ''
    const id = elementData.id || ''
    const cls = (elementData.className || '').split(/\s+/).sort().join(' ')
    const text = (elementData.text || '').substring(0, 50)
    return `${hourBucket}|${origin}|${tag}|${id}|${cls}|${text}`
  }

  async get(elementData) {
    try {
      const key = this._fingerprint(elementData)
      const data = await chrome.storage.session.get(STORAGE_KEY)
      const cache = data[STORAGE_KEY] || {}
      return cache[key] || null
    } catch (_) {
      return null
    }
  }

  async set(elementData, locators) {
    try {
      const key = this._fingerprint(elementData)
      const data = await chrome.storage.session.get(STORAGE_KEY)
      const cache = data[STORAGE_KEY] || {}
      cache[key] = { locators, timestamp: Date.now() }

      const entries = Object.entries(cache)
      if (entries.length > MAX_ENTRIES) {
        entries.sort((a, b) => a[1].timestamp - b[1].timestamp)
        delete cache[entries[0][0]]
      }

      await chrome.storage.session.set({ [STORAGE_KEY]: cache })
    } catch (_) {
      // ignore cache failures
    }
  }

  async clear() {
    try {
      await chrome.storage.session.remove(STORAGE_KEY)
    } catch (_) {
      // ignore cache failures
    }
  }
}
