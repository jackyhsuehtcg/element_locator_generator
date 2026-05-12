// lib/generator/ShadowDomPathBuilder.js — Shadow DOM 路徑組裝（Playwright `>>` 語法）

export const SHADOW_MAX_DEPTH = 3

/**
 * 判斷元素是否在 shadow root 內
 * @param {Element} element
 * @returns {boolean}
 */
export function isInShadowDom(element) {
  let node = element
  while (node) {
    if (node instanceof ShadowRoot) return true
    node = node.parentNode
  }
  return false
}

/**
 * 計算元素所在的 shadow root 層數（0 = 一般 DOM）
 * @param {Element} element
 * @returns {number}
 */
export function shadowDepth(element) {
  let depth = 0
  let node = element.parentNode
  while (node) {
    if (node instanceof ShadowRoot) depth++
    node = node.parentNode
  }
  return depth
}

/**
 * 產生元素在其所在 root（document 或 shadowRoot）中的簡單 CSS selector
 * 優先使用 id / data-testid / aria-label，否則 tag[:nth-of-type]
 * @param {Element} element
 * @returns {string}
 */
function localSelector(element) {
  if (element.id) return `#${CSS.escape(element.id)}`

  const testId = element.getAttribute('data-testid')
  if (testId) return `[data-testid="${CSS.escape(testId)}"]`

  const ariaLabel = element.getAttribute('aria-label')
  if (ariaLabel) return `[aria-label="${ariaLabel.replace(/"/g, '\\"')}"]`

  const tag = element.nodeName.toLowerCase()
  const parent = element.parentNode
  if (!parent) return tag

  const sameTag = Array.from(parent.children || []).filter(el => el.nodeName === element.nodeName)
  if (sameTag.length === 1) return tag
  const idx = sameTag.indexOf(element) + 1
  return `${tag}:nth-of-type(${idx})`
}

/**
 * 遞迴向上穿透 shadow root，產生 Playwright `>>` 路徑
 * 格式：<host-selector> >> <inner-selector>（可多層）
 * @param {Element} element
 * @returns {{ selector: string, depth: number, warning: string|null }}
 */
export function buildShadowPath(element) {
  const depth = shadowDepth(element)

  if (depth === 0) {
    // 不在 shadow DOM 中，直接返回本地 selector
    return { selector: localSelector(element), depth: 0, warning: null }
  }

  if (depth > SHADOW_MAX_DEPTH) {
    return {
      selector: localSelector(element),
      depth,
      warning: `Shadow DOM 深度 ${depth} 超過限制 ${SHADOW_MAX_DEPTH}，僅使用本地 selector`
    }
  }

  // 收集每一層：[ {hostSelector, innerSelector} ]
  const parts = []
  let currentRoot = element.getRootNode()
  let currentElement = element

  while (currentRoot instanceof ShadowRoot) {
    const innerSel = buildPathWithinRoot(currentElement, currentRoot)
    const hostEl = currentRoot.host
    const hostSel = localSelector(hostEl)

    parts.unshift({ hostSel, innerSel })
    currentElement = hostEl
    currentRoot = hostEl.getRootNode()
  }

  // 最外層（document 中的 host 路徑）
  const outerSel = buildPathWithinRoot(currentElement, currentRoot)

  const segments = [outerSel]
  for (const { innerSel } of parts) {
    segments.push(innerSel)
  }

  const warning = depth >= SHADOW_MAX_DEPTH
    ? `Shadow DOM 深度 ${depth} 已達限制，selector 可能不穩定`
    : null

  return { selector: segments.join(' >> '), depth, warning }
}

/**
 * 從元素向上走到指定 root 並組裝 CSS 路徑（最多 5 層）
 * @param {Element} element
 * @param {Document|ShadowRoot} root
 * @returns {string}
 */
function buildPathWithinRoot(element, root) {
  const path = []
  let current = element

  while (current && current !== root && !(current instanceof ShadowRoot)) {
    path.unshift(localSelector(current))
    if (current.id || current.getAttribute('data-testid') || current.getAttribute('aria-label')) break
    current = current.parentNode
    if (path.length >= 5) break
  }

  return path.join(' > ') || localSelector(element)
}
