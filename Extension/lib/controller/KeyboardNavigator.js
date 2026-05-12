// lib/controller/KeyboardNavigator.js — 鍵盤導航（Arrow keys DOM 元素間移動）

export class KeyboardNavigator {
  /**
   * @param {function(Element): void} onFocus - 聚焦新元素時的回調（用於高亮）
   * @param {function(Element): void} onSelect - 確認選取（Enter）時的回調
   */
  constructor(onFocus, onSelect) {
    this._onFocus = onFocus
    this._onSelect = onSelect
    this._current = null
    this._bound = null
  }

  attach() {
    this._bound = this._handleKey.bind(this)
    document.addEventListener('keydown', this._bound, true)
  }

  detach() {
    if (this._bound) {
      document.removeEventListener('keydown', this._bound, true)
      this._bound = null
    }
    this._current = null
  }

  setCurrent(element) {
    this._current = element
  }

  _handleKey(event) {
    const { key } = event
    if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter'].includes(key)) return

    event.preventDefault()
    event.stopPropagation()

    if (!this._current) return

    let next = null

    switch (key) {
      case 'ArrowUp':
        // 移到上一個兄弟元素
        next = this._prevSibling(this._current)
        break
      case 'ArrowDown':
        // 移到下一個兄弟元素
        next = this._nextSibling(this._current)
        break
      case 'ArrowLeft':
        // 移到父元素
        next = this._current.parentElement || null
        break
      case 'ArrowRight':
        // 移到第一個子元素
        next = this._current.firstElementChild || null
        break
      case 'Enter':
        this._onSelect(this._current)
        return
    }

    if (next && next !== document.body && next !== document.documentElement) {
      this._current = next
      this._onFocus(next)
    }
  }

  _prevSibling(el) {
    let sib = el.previousElementSibling
    while (sib && this._isLocatorUI(sib)) sib = sib.previousElementSibling
    return sib
  }

  _nextSibling(el) {
    let sib = el.nextElementSibling
    while (sib && this._isLocatorUI(sib)) sib = sib.nextElementSibling
    return sib
  }

  // 排除 extension 自身 UI 元素
  _isLocatorUI(el) {
    return el.id?.startsWith('locator-') || el.id === 'locator-loading'
  }
}
