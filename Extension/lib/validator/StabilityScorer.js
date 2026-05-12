// lib/validator/StabilityScorer.js — Locator 穩定性評分

import { isDynamicClass } from '../generator/LocalLocatorGenerator.js'

const TIERS = [
  { min: 80, stars: 5, label: 'Excellent' },
  { min: 60, stars: 4, label: 'Stable' },
  { min: 40, stars: 3, label: 'Moderate' },
  { min: 20, stars: 2, label: 'Fragile' },
  { min: -Infinity, stars: 1, label: 'Very fragile' }
]

export class StabilityScorer {
  /**
   * 計算 locator 穩定性分數
   * @param {string} locator - 完整的 locator 字串
   * @param {'playwright'|'css'|'xpath'|'selenium'} type
   * @returns {{ score: number, stars: number, label: string, factors: string[] }}
   */
  score(locator, type) {
    const factors = []
    let score = 0

    if (!locator || locator === '未生成') {
      return { score: 0, stars: 1, label: 'Very fragile', factors: [] }
    }

    // ID (靜態)
    if (/#[a-zA-Z][\w-]*(?!\s*\[)/.test(locator) || /\[@id=/.test(locator) || /By\.ID/.test(locator)) {
      score += 100; factors.push('+100 id')
    }
    // data-testid / data-test
    if (/data-testid|data-test(?![a-z])/i.test(locator)) {
      score += 95; factors.push('+95 data-testid')
    }
    // data-cy / data-automation
    if (/data-cy|data-automation/i.test(locator)) {
      score += 90; factors.push('+90 data-cy/automation')
    }
    // aria-label
    if (/aria-label/i.test(locator)) {
      score += 80; factors.push('+80 aria-label')
    }
    // getByRole / role+name
    if (/getByRole|getByLabel/.test(locator)) {
      score += 70; factors.push('+70 getByRole/getByLabel')
    } else if (/\[role=/.test(locator)) {
      score += 75; factors.push('+75 role')
    }
    // getByLabel (standalone)
    if (/getByLabel/.test(locator) && score < 70) {
      score += 65; factors.push('+65 label')
    }
    // placeholder
    if (/placeholder|getByPlaceholder/.test(locator)) {
      score += 55; factors.push('+55 placeholder')
    }
    // title / alt
    if (/\[title=|\[alt=|getByTitle|getByAltText/.test(locator)) {
      score += 50; factors.push('+50 title/alt')
    }
    // text
    if (/getByText|contains\(text\(\)|\.text\(/.test(locator)) {
      score += 45; factors.push('+45 text')
    }

    // 靜態 class vs 動態 class
    const classMatches = locator.match(/\.([a-zA-Z][\w-]*)/g) || []
    classMatches.forEach(m => {
      const cls = m.slice(1)
      if (isDynamicClass(cls)) {
        score += 10; factors.push(`+10 dynamic-class(${cls})`)
      } else {
        score += 30; factors.push(`+30 class(${cls})`)
      }
    })

    // 懲罰：索引定位
    const nthMatches = (locator.match(/:nth-(?:child|of-type|last-child)\(/g) || []).length
    const xpathIndexMatches = (locator.match(/\[\d+\]/g) || []).length
    const totalIndex = nthMatches + xpathIndexMatches
    if (totalIndex > 0) {
      score += totalIndex * -20; factors.push(`${totalIndex * -20} nth/index`)
    }

    // 懲罰：深路徑
    const depth = (locator.match(/\s*>\s*/g) || locator.match(/\//g) || []).length
    if (depth > 3) {
      const penalty = (depth - 3) * -10
      score += penalty; factors.push(`${penalty} depth(${depth})`)
    }

    const tier = TIERS.find(t => score >= t.min)
    return { score, stars: tier.stars, label: tier.label, factors }
  }

  /**
   * 回傳星等顯示字串
   */
  starsDisplay(stars) {
    return '⭐'.repeat(stars) + '☆'.repeat(5 - stars)
  }
}
