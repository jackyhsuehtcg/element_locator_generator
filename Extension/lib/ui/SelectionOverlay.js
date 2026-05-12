// lib/ui/SelectionOverlay.js — 選取模式提示 overlay

export class SelectionOverlay {
  constructor() {
    this._element = null
  }

  show() {
    if (this._element) return
    this._element = document.createElement('div')
    this._element.id = 'element-locator-overlay'
    this._element.innerHTML = `
      <div class="overlay-content">
        <span>Element Locator Generator</span>
        <span>點擊元素生成 locator，按 ESC 取消</span>
      </div>
    `
    document.body.appendChild(this._element)
  }

  hide() {
    if (this._element) {
      this._element.remove()
      this._element = null
    }
  }

  getElement() {
    return this._element
  }

  contains(target) {
    return this._element?.contains(target) ?? false
  }
}
