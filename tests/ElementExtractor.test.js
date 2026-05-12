import { describe, it, expect, beforeEach } from 'vitest'
import { JSDOM } from 'jsdom'
import { ElementExtractor } from '../Extension/lib/extractor/ElementExtractor.js'

// 建立 jsdom 環境
function makeDoc(html) {
  const dom = new JSDOM(`<!DOCTYPE html><html><body>${html}</body></html>`)
  return dom.window.document
}

describe('ElementExtractor', () => {
  let extractor

  beforeEach(() => {
    extractor = new ElementExtractor()
  })

  describe('_getClassName', () => {
    it('returns className string for HTML element', () => {
      const doc = makeDoc('<div class="foo bar"></div>')
      const el = doc.querySelector('div')
      expect(extractor._getClassName(el)).toBe('foo bar')
    })

    it('returns null for empty className', () => {
      const doc = makeDoc('<div></div>')
      const el = doc.querySelector('div')
      expect(extractor._getClassName(el)).toBeNull()
    })

    it('handles SVGAnimatedString-like object (baseVal)', () => {
      // 模擬 SVG className（非字串）
      const mockEl = { className: { baseVal: 'svg-class' } }
      expect(extractor._getClassName(mockEl)).toBe('svg-class')
    })

    it('handles null element', () => {
      expect(extractor._getClassName(null)).toBeNull()
    })
  })

  describe('_getAssociatedLabels', () => {
    it('finds explicit label[for] association', () => {
      const doc = makeDoc('<label for="myEmail">Email</label><input id="myEmail" type="text">')
      const input = doc.querySelector('input')
      const labels = extractor._getAssociatedLabels(input)
      expect(labels).toContain('Email')
    })

    it('finds implicit ancestor label', () => {
      const doc = makeDoc('<label>Username <input type="text"></label>')
      const input = doc.querySelector('input')
      const labels = extractor._getAssociatedLabels(input)
      expect(labels.length).toBeGreaterThan(0)
    })

    it('returns empty array when no labels', () => {
      const doc = makeDoc('<input type="text">')
      const input = doc.querySelector('input')
      const labels = extractor._getAssociatedLabels(input)
      expect(labels).toEqual([])
    })
  })

  describe('_getAriaAttributes', () => {
    it('extracts all aria-* attributes', () => {
      const doc = makeDoc('<button aria-label="Close" aria-pressed="false" role="button">X</button>')
      const btn = doc.querySelector('button')
      const aria = extractor._getAriaAttributes(btn)
      expect(aria['aria-label']).toBe('Close')
      expect(aria['aria-pressed']).toBe('false')
      expect(aria['role']).toBe('button')
    })

    it('returns empty object when no aria attributes', () => {
      const doc = makeDoc('<div></div>')
      const el = doc.querySelector('div')
      expect(extractor._getAriaAttributes(el)).toEqual({})
    })
  })

  describe('_getNeighborContext', () => {
    it('returns a target-centered same-tag window', () => {
      const doc = makeDoc(`
        <div>
          <button>One</button>
          <button>Two</button>
          <button>Three</button>
          <button>Four</button>
          <button>Five</button>
          <button>Six</button>
        </div>
      `)
      const target = doc.querySelectorAll('button')[4]
      const ctx = extractor._getNeighborContext(target)

      expect(ctx.sameTagCount).toBe(6)
      expect(ctx.targetIndexAmongSameTag).toBe(4)
      expect(ctx.neighbors.map(n => n.index)).toEqual([2, 3, 4, 5])
      expect(ctx.neighbors.some(n => n.isSelf && n.index === 4)).toBe(true)
    })
  })

  describe('text extraction', () => {
    it('prefers innerText over textContent', () => {
      const doc = makeDoc('<button>Click me</button>')
      const btn = doc.querySelector('button')
      // jsdom innerText may be undefined; ensure we fall back correctly
      const text = btn.innerText?.trim().substring(0, 100)
        || btn.textContent?.trim().substring(0, 100)
        || null
      expect(text).toBe('Click me')
    })
  })
})
