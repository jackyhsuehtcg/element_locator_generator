import { describe, it, expect, beforeEach } from 'vitest'
import { JSDOM } from 'jsdom'
import { LocatorValidator } from '../Extension/lib/validator/LocatorValidator.js'

function makeDoc(html) {
  const dom = new JSDOM(`<!DOCTYPE html><html><body>${html}</body></html>`)
  const win = dom.window
  global.CSS = win.CSS || { escape: (s) => s.replace(/[!"#$%&'()*+,./:;<=>?@[\\\]^`{|}~]/g, '\\$&') }
  global.Node = win.Node
  global.document = win.document
  global.XPathResult = win.XPathResult
  return win.document
}

describe('LocatorValidator', () => {
  let validator

  beforeEach(() => {
    validator = new LocatorValidator()
  })

  it('replaces ambiguous CSS with precise local selector', () => {
    const doc = makeDoc(`
      <section data-testid="panel">
        <div><button>Save</button></div>
        <div><button>Save</button></div>
      </section>
    `)
    const target = doc.querySelectorAll('button')[1]
    const result = validator.validateCSS('button', target)

    expect(result.status).toBe('warning')
    expect(result.value).not.toBe('button:nth-of-type(2)')
    expect(result.value).toContain('[data-testid="panel"]')
  })

  it('replaces ambiguous XPath with precise local xpath', () => {
    const doc = makeDoc('<div><input name="email"><input name="password"></div>')
    const target = doc.querySelector('input[name="password"]')
    const result = validator.validateXPath('//input', target)

    expect(result.status).toBe('warning')
    expect(result.value).toContain('@name="password"')
  })
})
