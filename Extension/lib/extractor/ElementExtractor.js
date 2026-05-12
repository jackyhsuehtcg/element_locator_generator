// lib/extractor/ElementExtractor.js — DOM → 結構化資料

export class ElementExtractor {
  /**
   * 從 DOM 元素擷取用於 LLM 的結構化資料
   * @param {Element} element
   * @returns {Object}
   */
  extract(element) {
    const rect = element.getBoundingClientRect()

    return {
      // 保存原始元素引用（用於驗證）
      originalElement: element,

      // 基本屬性
      tagName: element.tagName.toLowerCase(),
      id: element.id || null,
      className: this._getClassName(element),
      name: element.getAttribute('name') || null,

      // 文本內容（優先使用 innerText 取可見文字）
      text: element.innerText?.trim().substring(0, 100)
        || element.textContent?.trim().substring(0, 100)
        || null,
      textContentRaw: element.textContent?.trim().substring(0, 200) || null,
      innerText: element.innerText?.trim().substring(0, 100) || null,
      placeholder: element.placeholder || null,
      value: element.value || null,

      // 屬性
      attributes: this._getRelevantAttributes(element),
      ariaAttributes: this._getAriaAttributes(element),

      // 關聯的 label 文字
      labels: this._getAssociatedLabels(element),

      // 位置信息
      position: {
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height
      },

      // DOM 結構
      parent: {
        tagName: element.parentElement?.tagName.toLowerCase() || null,
        className: element.parentElement ? this._getClassName(element.parentElement) : null,
        id: element.parentElement?.id || null
      },

      // 兄弟元素
      siblings: this._getSiblingsInfo(element),

      // 鄰近同 tag 元素摘要（協助 LLM 判斷唯一性）
      neighborContext: this._getNeighborContext(element),

      // 子元素數量
      children: element.children.length,

      // 頁面信息
      url: window.location.href,
      title: document.title,
      timestamp: new Date().toISOString()
    }
  }

  // SVGAnimatedString 安全轉字串
  _getClassName(element) {
    if (!element) return null
    if (typeof element.className === 'string') return element.className || null
    return element.className?.baseVal || null
  }

  _getRelevantAttributes(element) {
    const relevantAttrs = [
      'type', 'role', 'data-testid', 'data-test', 'data-cy', 'data-automation',
      'href', 'src', 'alt', 'title', 'for'
    ]
    const attrs = {}
    relevantAttrs.forEach(attr => {
      const value = element.getAttribute(attr)
      if (value) attrs[attr] = value
    })
    return attrs
  }

  _getAriaAttributes(element) {
    const aria = {}
    for (const attr of element.attributes) {
      if (attr.name.startsWith('aria-') || attr.name === 'role') {
        aria[attr.name] = attr.value
      }
    }
    return aria
  }

  // 反查關聯 <label for="id"> 或包裹 <label>
  _getAssociatedLabels(element) {
    const labels = []
    const doc = element.ownerDocument || document

    // 顯式 label[for]
    if (element.id) {
      const cssEscape = typeof CSS !== 'undefined' ? CSS.escape(element.id) : element.id
      doc.querySelectorAll(`label[for="${cssEscape}"]`).forEach(label => {
        const text = (label.innerText || label.textContent)?.trim()
        if (text) labels.push(text)
      })
    }

    // 隱式：祖先 <label>
    let ancestor = element.parentElement
    while (ancestor) {
      if (ancestor.tagName === 'LABEL') {
        const text = (ancestor.innerText || ancestor.textContent)?.trim()
        if (text) labels.push(text)
        break
      }
      ancestor = ancestor.parentElement
    }

    return labels
  }

  _getSiblingsInfo(element) {
    const siblings = Array.from(element.parentElement?.children || [])
    const index = siblings.indexOf(element)
    return {
      total: siblings.length,
      index,
      sameTagSiblings: siblings.filter(el => el.tagName === element.tagName).length
    }
  }

  // 同 tag 鄰近元素摘要（讓 LLM 知道這個按鈕跟旁邊的按鈕有何差異）
  _getNeighborContext(element) {
    const siblings = Array.from(element.parentElement?.children || [])
    const sameTagSiblings = siblings.filter(el => el.nodeName === element.nodeName)
    const targetIndex = sameTagSiblings.indexOf(element)

    const start = Math.max(0, targetIndex - 2)
    const end = Math.min(sameTagSiblings.length, targetIndex + 3)
    const neighbors = sameTagSiblings.slice(start, end).map((el, offset) => ({
      index: start + offset,
      isSelf: el === element,
      text: el.innerText?.trim().substring(0, 30) || el.textContent?.trim().substring(0, 30) || null,
      distinguishingAttrs: this._getDistinguishingAttrs(el)
    }))

    return {
      sameTagCount: sameTagSiblings.length,
      targetIndexAmongSameTag: targetIndex,
      neighbors
    }
  }

  _getDistinguishingAttrs(element) {
    const attrs = {}
    const keys = ['id', 'data-testid', 'aria-label', 'name', 'type', 'href']
    keys.forEach(k => {
      const v = element.getAttribute(k) || (k === 'id' ? element.id : null)
      if (v) attrs[k] = v
    })
    return attrs
  }
}
