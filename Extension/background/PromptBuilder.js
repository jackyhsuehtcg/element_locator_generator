// background/PromptBuilder.js — 組裝 system + user prompt

const LOCATOR_EXAMPLES = {
  playwright: `page.getByRole('button', { name: 'Submit' })`,
  css: `#submit-btn`,
  xpath: `//button[@id='submit-btn']`,
  selenium_python: `driver.find_element(By.ID, "submit-btn")`,
  cypress: `cy.get('[data-testid="submit-btn"]')`,
  testing_library: `screen.getByRole('button', { name: /submit/i })`,
  webdriverio: `$('[data-testid="submit-btn"]')`
}

const LOCATOR_LABEL_MAP = {
  playwright: 'Playwright',
  css: 'CSS',
  xpath: 'XPath',
  selenium: 'Selenium',
  cypress: 'Cypress',
  testing_library: 'TestingLibrary',
  webdriverio: 'WebdriverIO'
}

export class PromptBuilder {
  /**
   * 靜態 system prompt（英文，利於指令遵循）
   * @param {string[]} enabledTypes
   * @param {string} seleniumLanguage 'python'|'java'|'javascript'|'csharp'
   */
  buildSystemPrompt(enabledTypes = ['playwright', 'css', 'xpath', 'selenium'], seleniumLanguage = 'python') {
    const typeLines = enabledTypes.map(t => {
      const label = LOCATOR_LABEL_MAP[t] || t
      let example = ''
      if (t === 'selenium') {
        example = this._seleniumExample(seleniumLanguage)
      } else {
        example = LOCATOR_EXAMPLES[t] || ''
      }
      return `${label}: ${example}`
    })

    return `You are an expert test automation engineer specializing in generating reliable element locators.

Your task: Given an element's DOM data, generate stable element locators that UNIQUELY identify the target element.

CRITICAL RULES:
1. Each locator MUST uniquely identify the target. Use the provided neighborContext to understand ambiguity.
2. Prefer semantic attributes in this order: id > data-testid > aria-label > role+name > text > class > position
3. Avoid framework-generated dynamic classes (sc-*, css-*, _ngcontent-*, svelte-*, data-v-*).
4. Use nth-of-type or positional indexing ONLY as a last resort.

Playwright priority: getByRole > getByLabel > getByPlaceholder > getByText > getByTestId > getByTitle > getByAltText

Output EXACTLY these lines (one per requested type, no extra text):
${typeLines.join('\n')}

Example output:
${typeLines.map((_, i) => `${LOCATOR_LABEL_MAP[enabledTypes[i]]}: <locator>`).join('\n')}`
  }

  /**
   * 動態 user prompt（含元素資料）
   * @param {Object} elementData
   */
  buildUserPrompt(elementData) {
    const lines = [
      `Tag: ${elementData.tagName}`,
      `ID: ${elementData.id || 'none'}`,
      `Class: ${elementData.className || 'none'}`,
      `Text: ${elementData.text || 'none'}`,
      `Placeholder: ${elementData.placeholder || 'none'}`,
      `Value: ${elementData.value || 'none'}`,
      `Attributes: ${JSON.stringify(elementData.attributes || {})}`,
      `ARIA: ${JSON.stringify(elementData.ariaAttributes || {})}`,
      `Labels: ${(elementData.labels || []).join(', ') || 'none'}`,
    ]

    if (elementData.neighborContext) {
      const nc = elementData.neighborContext
      lines.push(`\nSame-tag siblings: ${nc.sameTagCount} total, target is index ${nc.targetIndexAmongSameTag}`)
      if (nc.neighbors?.length > 1) {
        lines.push('Neighbors (distinguish target from these):')
        nc.neighbors.forEach(n => {
          const marker = n.isSelf ? ' ← TARGET' : ''
          lines.push(`  [${n.index}] text="${n.text || ''}" attrs=${JSON.stringify(n.distinguishingAttrs)}${marker}`)
        })
      }
    }

    if (elementData.framework && elementData.framework !== 'unknown') {
      lines.push(`\nDetected framework: ${elementData.framework}`)
    }

    if (elementData.cssSelector || elementData.xpath) {
      lines.push(`\nLocally-generated references (use as fallback if needed):`)
      if (elementData.cssSelector) lines.push(`  CSS ref: ${elementData.cssSelector}`)
      if (elementData.xpath) lines.push(`  XPath ref: ${elementData.xpath}`)
    }

    if (elementData.framePath?.length > 0) {
      lines.push(`\nFrame path: ${JSON.stringify(elementData.framePath)}`)
    }

    return lines.join('\n') + '\n\nGenerate locators now:'
  }

  _seleniumExample(lang) {
    switch (lang) {
      case 'java': return `driver.findElement(By.id("submit-btn"))`
      case 'javascript': return `driver.findElement(By.id('submit-btn'))`
      case 'csharp': return `driver.FindElement(By.Id("submit-btn"))`
      default: return `driver.find_element(By.ID, "submit-btn")`
    }
  }
}
