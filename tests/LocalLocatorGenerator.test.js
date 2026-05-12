import { describe, it, expect, beforeEach } from 'vitest'
import { JSDOM } from 'jsdom'
import { LocalLocatorGenerator, isDynamicClass } from '../Extension/lib/generator/LocalLocatorGenerator.js'

function makeDoc(html) {
  const dom = new JSDOM(`<!DOCTYPE html><html><body>${html}</body></html>`)
  const win = dom.window
  global.CSS = win.CSS || { escape: (s) => s.replace(/[!"#$%&'()*+,./:;<=>?@[\\\]^`{|}~]/g, '\\$&') }
  global.Node = win.Node
  global.document = win.document
  return win.document
}

describe('isDynamicClass', () => {
  it('detects styled-components hash', () => {
    expect(isDynamicClass('sc-abcDEF123')).toBe(true)
  })
  it('detects emotion hash', () => {
    expect(isDynamicClass('css-abc123')).toBe(true)
  })
  it('detects angular _ngcontent', () => {
    expect(isDynamicClass('_ngcontent-abc-c1')).toBe(true)
  })
  it('detects svelte hash', () => {
    expect(isDynamicClass('svelte-abc123')).toBe(true)
  })
  it('does not flag normal class', () => {
    expect(isDynamicClass('btn-primary')).toBe(false)
    expect(isDynamicClass('header')).toBe(false)
  })
})

describe('LocalLocatorGenerator', () => {
  let gen

  beforeEach(() => {
    gen = new LocalLocatorGenerator()
  })

  describe('generateXPath', () => {
    it('uses id when present', () => {
      const doc = makeDoc('<button id="submit">Submit</button>')
      const btn = doc.querySelector('button')
      expect(gen.generateXPath(btn)).toBe('//*[@id="submit"]')
    })

    it('prefers unique text over positional index for same-tag siblings', () => {
      const doc = makeDoc('<div><button>A</button><button>B</button></div>')
      const buttons = doc.querySelectorAll('button')
      const xpath = gen.generateXPath(buttons[1])
      expect(xpath).toContain('normalize-space(.)="B"')
    })

    it('no index when only one of tag', () => {
      const doc = makeDoc('<div><button>Only</button><span>Other</span></div>')
      const btn = doc.querySelector('button')
      const xpath = gen.generateXPath(btn)
      expect(xpath).not.toContain('[1]')
      expect(xpath).not.toContain('[2]')
    })
  })

  describe('generateCSSSelector', () => {
    it('uses id when present', () => {
      const doc = makeDoc('<button id="ok">OK</button>')
      const btn = doc.querySelector('button')
      expect(gen.generateCSSSelector(btn)).toBe('#ok')
    })

    it('uses nth-of-type (NOT nth-child) for same-tag siblings', () => {
      const doc = makeDoc('<div><button>A</button><button>B</button></div>')
      const buttons = doc.querySelectorAll('button')
      const css = gen.generateCSSSelector(buttons[1])
      expect(css).toContain('nth-of-type')
      expect(css).not.toContain('nth-child')
    })

    it('skips dynamic classes', () => {
      const doc = makeDoc('<div class="sc-abc123 valid-class">X</div>')
      const el = doc.querySelector('div')
      const css = gen.generateCSSSelector(el)
      expect(css).not.toContain('sc-abc123')
      expect(css).toContain('valid-class')
    })

    it('handles element with only dynamic classes (no id)', () => {
      const doc = makeDoc('<div><button class="sc-abc123">A</button><button class="sc-def456">B</button></div>')
      const btn = doc.querySelectorAll('button')[1]
      const css = gen.generateCSSSelector(btn)
      // Should fall back to nth-of-type without class when all classes are dynamic
      expect(css).toContain('nth-of-type(2)')
    })

    it('prefers stable test attributes over positional fallback', () => {
      const doc = makeDoc('<div><button data-testid="save-btn">A</button><button>B</button></div>')
      const btn = doc.querySelector('[data-testid="save-btn"]')
      const css = gen.generateCSSSelector(btn)
      expect(css).toBe('button[data-testid="save-btn"]')
    })

    it('uses unique ancestor anchor plus relative path for repeated siblings', () => {
      const doc = makeDoc(`
        <section data-testid="settings-panel">
          <div><button>Save</button></div>
          <div><button>Save</button></div>
        </section>
      `)
      const btn = doc.querySelectorAll('button')[1]
      const css = gen.generateCSSSelector(btn)
      expect(css).toContain('[data-testid="settings-panel"]')
      expect(css).toContain('button')
    })
  })

  describe('generateXPath', () => {
    it('prefers stable attributes over raw position when possible', () => {
      const doc = makeDoc('<div><input name="email"><input name="password"></div>')
      const input = doc.querySelector('input[name="password"]')
      const xpath = gen.generateXPath(input)
      expect(xpath).toContain('@name="password"')
    })
  })
})
