// lib/storage/HistoryStore.js — 選取歷史紀錄（chrome.storage.local）

const STORAGE_KEY = 'locator_history'
const DEFAULT_LIMIT = 50

export class HistoryStore {
  constructor(limit = DEFAULT_LIMIT) {
    this.limit = limit
  }

  async getAll() {
    const data = await chrome.storage.local.get(STORAGE_KEY)
    return data[STORAGE_KEY] || []
  }

  async push(entry) {
    const history = await this.getAll()
    history.unshift({ ...entry, id: Date.now() })
    if (history.length > this.limit) {
      history.splice(this.limit)
    }
    await chrome.storage.local.set({ [STORAGE_KEY]: history })
  }

  async clear() {
    await chrome.storage.local.remove(STORAGE_KEY)
  }
}
