// lib/validator/LocatorValidator.js — 唯一性驗證 + 聰明索引

import { LocalLocatorGenerator } from '../generator/LocalLocatorGenerator.js'

const gen = new LocalLocatorGenerator()

export class LocatorValidator {
  validateCSS(selector, targetElement) {
    // Playwright shadow DOM 路徑（含 >>）無法由 querySelectorAll 驗證
    if (selector.includes(' >> ')) {
      return { value: selector, status: 'shadow', message: 'Shadow DOM selector — Playwright only，無法本地驗證' }
    }

    try {
      const elements = Array.from(document.querySelectorAll(selector))

      if (elements.length === 0) {
        const fallback = gen.generateCSSSelector(targetElement)
        return { value: `${selector}`, fallback, status: 'error', message: '無匹配元素', suggestion: fallback }
      }

      if (elements.length === 1) {
        if (elements[0] === targetElement) {
          return { value: selector, status: 'success', message: '唯一匹配' }
        }
        return { value: selector, status: 'error', message: '匹配到非目標元素' }
      }

      // 多個匹配 — 偵測既有索引
      const hasIndex = /:nth-(?:child|of-type|last-child|last-of-type)\(|\[\d+\]/.test(selector)
      if (hasIndex) {
        const fallback = gen.generateCSSSelector(targetElement)
        return { value: fallback, status: 'warning', message: 'LLM 索引無效，已替換為本地生成' }
      }

      const targetIndex = elements.indexOf(targetElement)
      if (targetIndex >= 0) {
        const fallback = gen.generateCSSSelector(targetElement)
        return { value: fallback, status: 'warning', message: `${elements.length}個匹配，已替換為精準本地生成` }
      }

      return { value: selector, status: 'error', message: `匹配${elements.length}個元素但不包含目標` }
    } catch (error) {
      return { value: selector, status: 'error', message: `無效選擇器: ${error.message}` }
    }
  }

  validateXPath(xpath, targetElement) {
    try {
      const result = document.evaluate(xpath, document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null)
      const elements = []
      for (let i = 0; i < result.snapshotLength; i++) {
        elements.push(result.snapshotItem(i))
      }

      if (elements.length === 0) {
        const fallback = gen.generateXPath(targetElement)
        return { value: xpath, status: 'error', message: '無匹配元素', suggestion: fallback }
      }

      if (elements.length === 1) {
        if (elements[0] === targetElement) {
          return { value: xpath, status: 'success', message: '唯一匹配' }
        }
        return { value: xpath, status: 'error', message: '匹配到非目標元素' }
      }

      // 偵測既有 [N]
      const hasIndex = /\[\d+\]$/.test(xpath.trim())
      if (hasIndex) {
        const fallback = gen.generateXPath(targetElement)
        return { value: fallback, status: 'warning', message: 'LLM 索引無效，已替換為本地生成' }
      }

      const targetIndex = elements.indexOf(targetElement)
      if (targetIndex >= 0) {
        const fallback = gen.generateXPath(targetElement)
        return { value: fallback, status: 'warning', message: `${elements.length}個匹配，已替換為精準本地生成` }
      }

      return { value: xpath, status: 'error', message: `匹配${elements.length}個元素但不包含目標` }
    } catch (error) {
      return { value: xpath, status: 'error', message: `無效XPath: ${error.message}` }
    }
  }
}
