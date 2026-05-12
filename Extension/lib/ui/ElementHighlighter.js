// lib/ui/ElementHighlighter.js — 頁面元素高亮

export class ElementHighlighter {
  constructor() {
    this._current = null
    this._hoverTargets = []
    this._HOVER_COLOR = '#e8926c'
    this._HOVER_BG = 'rgba(232, 146, 108, 0.1)'
    this._MATCH_COLOR = '#6ca0b8'
    this._MATCH_BG = 'rgba(108, 160, 184, 0.12)'
    // 儲存被高亮元素的原始 style（避免修改使用者樣式）
    this._saved = new Map()
  }

  highlight(element) {
    this.clear()
    if (!element) return
    this._current = element
    this._apply(element, this._HOVER_COLOR, this._HOVER_BG)
  }

  clear() {
    if (this._current) {
      this._restore(this._current)
      this._current = null
    }
  }

  // Hover-to-highlight：高亮 locator 的所有匹配元素
  highlightMatches(elements) {
    this.clearMatches()
    elements.forEach(el => {
      this._hoverTargets.push(el)
      this._apply(el, this._MATCH_COLOR, this._MATCH_BG)
    })
  }

  clearMatches() {
    this._hoverTargets.forEach(el => this._restore(el))
    this._hoverTargets = []
  }

  _apply(element, outlineColor, bgColor) {
    if (!element || this._saved.has(element)) return
    this._saved.set(element, {
      outline: element.style.outline,
      outlineOffset: element.style.outlineOffset,
      backgroundColor: element.style.backgroundColor
    })
    element.style.outline = `3px solid ${outlineColor}`
    element.style.outlineOffset = '2px'
    element.style.backgroundColor = bgColor
  }

  _restore(element) {
    if (!element || !this._saved.has(element)) return
    const saved = this._saved.get(element)
    element.style.outline = saved.outline
    element.style.outlineOffset = saved.outlineOffset
    element.style.backgroundColor = saved.backgroundColor
    this._saved.delete(element)
  }
}
