// lib/i18n/i18n.js — chrome.i18n 封裝（Phase 11 完整化）

/**
 * 取得 i18n 訊息，若 chrome.i18n 不可用則 fallback 到 key
 * @param {string} key
 * @param {string|string[]} [substitutions]
 * @returns {string}
 */
export function t(key, substitutions) {
  if (typeof chrome !== 'undefined' && chrome.i18n) {
    const msg = chrome.i18n.getMessage(key, substitutions)
    if (msg) return msg
  }
  // 開發 / 測試環境 fallback
  return key
}
