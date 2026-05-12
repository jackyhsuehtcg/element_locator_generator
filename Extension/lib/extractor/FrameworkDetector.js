// lib/extractor/FrameworkDetector.js — 前端框架偵測（React/Vue/Angular/Svelte/Stencil/LWC）

/**
 * 偵測頁面使用的前端框架
 * @returns {'react'|'vue'|'angular'|'svelte'|'stencil'|'lwc'|'unknown'}
 */
export function detectFramework() {
  // React：__REACT_DEVTOOLS_GLOBAL_HOOK__ 或元素上的 __reactFiber / __reactInternals
  if (
    typeof window.__REACT_DEVTOOLS_GLOBAL_HOOK__ !== 'undefined' ||
    typeof window.React !== 'undefined' ||
    document.querySelector('[data-reactroot]') ||
    _hasReactFiber()
  ) {
    return 'react'
  }

  // Vue 3：__VUE__ / __vue_app__
  if (
    typeof window.__VUE__ !== 'undefined' ||
    document.querySelector('[data-v-app]') ||
    _hasVueApp()
  ) {
    return 'vue'
  }

  // Vue 2
  if (typeof window.Vue !== 'undefined') return 'vue'

  // Angular：ng-version attribute 或 getAllAngularRootElements
  if (
    document.querySelector('[ng-version]') ||
    typeof window.getAllAngularRootElements === 'function'
  ) {
    return 'angular'
  }

  // Svelte：__svelte_meta 或 svelte-* class pattern
  if (
    typeof window.__svelte !== 'undefined' ||
    document.querySelector('[class*="svelte-"]')
  ) {
    return 'svelte'
  }

  // Stencil：_stencil_app
  if (document.querySelector('[class*="sc-"]') && typeof window.customElements !== 'undefined') {
    // 更精確偵測：Stencil 的 host element 帶有 sc-<tag> class
    if (_hasStencilHostClass()) return 'stencil'
  }

  // LWC（Salesforce Lightning Web Components）
  if (
    document.querySelector('[data-lwc-host-mutated]') ||
    typeof window.$A !== 'undefined' // Aura（LWC 前身）
  ) {
    return 'lwc'
  }

  return 'unknown'
}

/**
 * 偵測頁面所有可能的框架（部分頁面混用）
 * @returns {string[]}
 */
export function detectAllFrameworks() {
  const frameworks = []

  if (
    typeof window.__REACT_DEVTOOLS_GLOBAL_HOOK__ !== 'undefined' ||
    typeof window.React !== 'undefined' ||
    document.querySelector('[data-reactroot]') ||
    _hasReactFiber()
  ) frameworks.push('react')

  if (
    typeof window.__VUE__ !== 'undefined' ||
    typeof window.Vue !== 'undefined' ||
    document.querySelector('[data-v-app]') ||
    _hasVueApp()
  ) frameworks.push('vue')

  if (
    document.querySelector('[ng-version]') ||
    typeof window.getAllAngularRootElements === 'function'
  ) frameworks.push('angular')

  if (
    typeof window.__svelte !== 'undefined' ||
    document.querySelector('[class*="svelte-"]')
  ) frameworks.push('svelte')

  if (_hasStencilHostClass()) frameworks.push('stencil')

  if (
    document.querySelector('[data-lwc-host-mutated]') ||
    typeof window.$A !== 'undefined'
  ) frameworks.push('lwc')

  return frameworks
}

// ——— 私有輔助 ———

function _hasReactFiber() {
  // 檢查 DOM 上是否存在 __reactFiber$ 或 __reactInternalInstance$ key
  const el = document.querySelector('*')
  if (!el) return false
  return Object.keys(el).some(k => k.startsWith('__reactFiber') || k.startsWith('__reactInternalInstance'))
}

function _hasVueApp() {
  const el = document.querySelector('*')
  if (!el) return false
  return Object.keys(el).some(k => k.startsWith('__vue'))
}

function _hasStencilHostClass() {
  // Stencil host elements 帶 sc-<tagname> class
  const els = document.querySelectorAll('[class]')
  for (const el of els) {
    const tag = el.tagName.toLowerCase()
    if (el.classList.contains(`sc-${tag}`)) return true
  }
  return false
}
