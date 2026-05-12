// lib/generator/LocalLocatorGenerator.js — 本地 XPath / CSS 生成

// 動態 class pattern（不適合當 locator）
const DYNAMIC_CLASS_PATTERNS = [
  /^sc-[a-zA-Z0-9]+$/,        // styled-components / Stencil host
  /^css-[a-zA-Z0-9]+$/,       // Emotion
  /^_ngcontent-/,             // Angular content attr
  /^_nghost-/,                // Angular host attr
  /^ng-/,                     // Angular directive classes（ng-pristine, ng-valid...）
  /^svelte-[a-z0-9]+$/,       // Svelte scoped
  /^data-v-[a-f0-9]+/,        // Vue 2 scoped（有時以 class 呈現）
  /^__vue/,                   // Vue 3 internal
  /^[a-zA-Z]+-[a-f0-9]{6,}$/  // generic hash（e.g. abc-1a2b3c）
]

const STABLE_ATTRS = [
  'data-testid',
  'data-test',
  'data-cy',
  'data-automation',
  'name',
  'aria-label',
  'placeholder',
  'title',
  'alt',
  'type',
  'role',
  'href'
]

export function isDynamicClass(cls) {
  return DYNAMIC_CLASS_PATTERNS.some(rx => rx.test(cls))
}

function quoteCssValue(value) {
  return String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"')
}

function quoteXPathValue(value) {
  if (!String(value).includes('"')) {
    return `"${value}"`
  }
  if (!String(value).includes("'")) {
    return `'${value}'`
  }
  return `concat(${String(value).split('"').map((part, index, arr) => {
    const quoted = `"${part}"`
    return index < arr.length - 1 ? `${quoted}, '"', ` : quoted
  }).join('')})`
}

export class LocalLocatorGenerator {
  generateXPath(element) {
    if (!element || element.nodeType !== Node.ELEMENT_NODE) return ''

    if (element.id) {
      const byId = `//*[@id=${quoteXPathValue(element.id)}]`
      if (this._isUniqueXPathMatch(byId, element)) return byId
    }

    for (const candidate of this._getDirectXPathCandidates(element)) {
      if (this._isUniqueXPathMatch(candidate, element)) return candidate
    }

    let ancestor = element.parentElement
    while (ancestor) {
      const anchor = this._getBestAnchorXPath(ancestor)
      if (anchor) {
        const relative = this._buildRelativeXPath(anchor, ancestor, element)
        if (relative && this._isUniqueXPathMatch(relative, element)) return relative
      }
      ancestor = ancestor.parentElement
    }

    return this._buildAbsoluteXPath(element)
  }

  generateCSSSelector(element) {
    if (!element || element.nodeType !== Node.ELEMENT_NODE) return ''

    if (element.id) {
      const byId = `#${CSS.escape(element.id)}`
      if (this._isUniqueCssMatch(byId, element)) return byId
    }

    for (const candidate of this._getDirectCssCandidates(element)) {
      if (this._isUniqueCssMatch(candidate, element)) return candidate
    }

    let ancestor = element.parentElement
    while (ancestor) {
      const anchor = this._getBestAnchorCssSelector(ancestor)
      if (anchor) {
        const relative = this._buildRelativeCssPath(ancestor, element)
        const combined = relative ? `${anchor} > ${relative}` : anchor
        if (this._isUniqueCssMatch(combined, element)) return combined
      }
      ancestor = ancestor.parentElement
    }

    return this._buildAbsoluteCssPath(element)
  }

  _getDirectCssCandidates(element) {
    const tag = element.nodeName.toLowerCase()
    const candidates = []
    const attrEntries = this._getStableAttrEntries(element)

    attrEntries.forEach(({ attr, value }) => {
      candidates.push(`${tag}[${attr}="${quoteCssValue(value)}"]`)
    })

    for (let i = 0; i < attrEntries.length; i++) {
      for (let j = i + 1; j < attrEntries.length; j++) {
        const first = attrEntries[i]
        const second = attrEntries[j]
        candidates.push(
          `${tag}[${first.attr}="${quoteCssValue(first.value)}"][${second.attr}="${quoteCssValue(second.value)}"]`
        )
      }
    }

    const staticClasses = this._getStaticClasses(element)
    staticClasses.forEach(cls => {
      candidates.push(`${tag}.${CSS.escape(cls)}`)
    })

    for (let i = 0; i < staticClasses.length; i++) {
      for (let j = i + 1; j < staticClasses.length; j++) {
        candidates.push(`${tag}.${CSS.escape(staticClasses[i])}.${CSS.escape(staticClasses[j])}`)
      }
    }

    return [...new Set(candidates)]
  }

  _getDirectXPathCandidates(element) {
    const tag = element.nodeName.toLowerCase()
    const candidates = []
    const attrEntries = this._getStableAttrEntries(element)

    attrEntries.forEach(({ attr, value }) => {
      candidates.push(`//${tag}[@${attr}=${quoteXPathValue(value)}]`)
    })

    for (let i = 0; i < attrEntries.length; i++) {
      for (let j = i + 1; j < attrEntries.length; j++) {
        const first = attrEntries[i]
        const second = attrEntries[j]
        candidates.push(
          `//${tag}[@${first.attr}=${quoteXPathValue(first.value)} and @${second.attr}=${quoteXPathValue(second.value)}]`
        )
      }
    }

    const text = this._getElementText(element)
    if (text && element.children.length === 0) {
      candidates.push(`//${tag}[normalize-space(.)=${quoteXPathValue(text)}]`)
      attrEntries.forEach(({ attr, value }) => {
        candidates.push(`//${tag}[@${attr}=${quoteXPathValue(value)} and normalize-space(.)=${quoteXPathValue(text)}]`)
      })
    }

    return [...new Set(candidates)]
  }

  _getBestAnchorCssSelector(element) {
    if (element.id) {
      const byId = `#${CSS.escape(element.id)}`
      if (this._isUniqueCssMatch(byId, element)) return byId
    }

    for (const candidate of this._getDirectCssCandidates(element)) {
      if (this._isUniqueCssMatch(candidate, element)) return candidate
    }

    return null
  }

  _getBestAnchorXPath(element) {
    if (element.id) {
      const byId = `//*[@id=${quoteXPathValue(element.id)}]`
      if (this._isUniqueXPathMatch(byId, element)) return byId
    }

    for (const candidate of this._getDirectXPathCandidates(element)) {
      if (this._isUniqueXPathMatch(candidate, element)) return candidate
    }

    return null
  }

  _buildRelativeCssPath(anchor, element) {
    const segments = []
    let current = element

    while (current && current !== anchor) {
      const parent = current.parentElement
      if (!parent) break
      segments.unshift(this._buildScopedCssSegment(current, parent))
      current = parent
    }

    return segments.join(' > ')
  }

  _buildRelativeXPath(anchorXPath, anchor, element) {
    const segments = []
    let current = element

    while (current && current !== anchor) {
      const parent = current.parentElement
      if (!parent) break
      segments.unshift(this._buildScopedXPathSegment(current, parent))
      current = parent
    }

    return segments.length > 0 ? `${anchorXPath}/${segments.join('/')}` : anchorXPath
  }

  _buildScopedCssSegment(element, parent) {
    const tag = element.nodeName.toLowerCase()

    if (element.id) {
      const idSelector = `${tag}#${CSS.escape(element.id)}`
      if (this._isUniqueDirectChildCssMatch(parent, idSelector, element)) return idSelector
    }

    for (const candidate of this._getDirectCssCandidates(element)) {
      if (this._isUniqueDirectChildCssMatch(parent, candidate, element)) return candidate
    }

    const sameTag = Array.from(parent.children).filter(el => el.nodeName === element.nodeName)
    if (sameTag.length === 1) return tag

    return `${tag}:nth-of-type(${sameTag.indexOf(element) + 1})`
  }

  _buildScopedXPathSegment(element, parent) {
    const tag = element.nodeName.toLowerCase()
    const attrEntries = this._getStableAttrEntries(element)

    if (element.id && this._isUniqueDirectChildByPredicate(parent, element, child => child.id === element.id)) {
      return `${tag}[@id=${quoteXPathValue(element.id)}]`
    }

    for (const { attr, value } of attrEntries) {
      if (this._isUniqueDirectChildByPredicate(parent, element, child => child.nodeName === element.nodeName && child.getAttribute(attr) === value)) {
        return `${tag}[@${attr}=${quoteXPathValue(value)}]`
      }
    }

    for (let i = 0; i < attrEntries.length; i++) {
      for (let j = i + 1; j < attrEntries.length; j++) {
        const first = attrEntries[i]
        const second = attrEntries[j]
        if (this._isUniqueDirectChildByPredicate(parent, element, child => (
          child.nodeName === element.nodeName
          && child.getAttribute(first.attr) === first.value
          && child.getAttribute(second.attr) === second.value
        ))) {
          return `${tag}[@${first.attr}=${quoteXPathValue(first.value)} and @${second.attr}=${quoteXPathValue(second.value)}]`
        }
      }
    }

    const text = this._getElementText(element)
    if (text && element.children.length === 0) {
      if (this._isUniqueDirectChildByPredicate(parent, element, child => (
        child.nodeName === element.nodeName && this._getElementText(child) === text
      ))) {
        return `${tag}[normalize-space(.)=${quoteXPathValue(text)}]`
      }
    }

    const sameTag = Array.from(parent.children).filter(el => el.nodeName === element.nodeName)
    if (sameTag.length === 1) return tag

    return `${tag}[${sameTag.indexOf(element) + 1}]`
  }

  _buildAbsoluteCssPath(element) {
    const segments = []
    let current = element

    while (current && current.nodeType === Node.ELEMENT_NODE && current !== document.body) {
      const parent = current.parentElement
      if (!parent) break
      segments.unshift(this._buildScopedCssSegment(current, parent))
      current = parent
    }

    return document.body?.contains(element) ? ['body', ...segments].join(' > ') : segments.join(' > ')
  }

  _buildAbsoluteXPath(element) {
    const segments = []
    let current = element

    while (current && current.nodeType === Node.ELEMENT_NODE && current !== document.body) {
      const parent = current.parentElement
      if (!parent) break
      segments.unshift(this._buildScopedXPathSegment(current, parent))
      current = parent
    }

    const prefix = document.body?.contains(element) ? '//body' : ''
    return `${prefix}/${segments.join('/')}`
  }

  _getStableAttrEntries(element) {
    return STABLE_ATTRS
      .map(attr => ({ attr, value: element.getAttribute(attr) }))
      .filter(({ value }) => value && String(value).length <= 200)
  }

  _getStaticClasses(element) {
    const rawClass = typeof element.className === 'string'
      ? element.className
      : element.className?.baseVal || ''

    return rawClass.trim().split(/\s+/)
      .filter(cls => cls && !isDynamicClass(cls))
      .slice(0, 3)
  }

  _getElementText(element) {
    return (element.innerText || element.textContent || '').replace(/\s+/g, ' ').trim().substring(0, 80)
  }

  _isUniqueCssMatch(selector, targetElement) {
    try {
      const matches = Array.from(document.querySelectorAll(selector))
      return matches.length === 1 && matches[0] === targetElement
    } catch (_) {
      return false
    }
  }

  _isUniqueXPathMatch(xpath, targetElement) {
    try {
      const result = document.evaluate(xpath, document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null)
      return result.snapshotLength === 1 && result.snapshotItem(0) === targetElement
    } catch (_) {
      return false
    }
  }

  _isUniqueDirectChildCssMatch(parent, selector, targetElement) {
    try {
      const matches = Array.from(parent.children).filter(child => child.matches(selector))
      return matches.length === 1 && matches[0] === targetElement
    } catch (_) {
      return false
    }
  }

  _isUniqueDirectChildByPredicate(parent, targetElement, predicate) {
    const matches = Array.from(parent.children).filter(predicate)
    return matches.length === 1 && matches[0] === targetElement
  }
}
