## Purpose
Define how the extension validates and optimizes generated locators against the current page DOM, including CSS, XPath, and iframe-specific validation.

## Requirements
### Requirement: Locator Parsing
The extension SHALL parse AI-generated locator text into four distinct types.

#### Scenario: Parse four locator types
- **WHEN** AI response is received
- **THEN** the extension SHALL extract Playwright, CSS, XPath, and Selenium locators from lines starting with respective prefixes
- **AND** SHALL store each type separately for display

### Requirement: CSS Locator Validation
The extension SHALL validate CSS selectors against the current page DOM.

#### Scenario: CSS selector matches single element
- **WHEN** the CSS selector matches exactly one element
- **THEN** the locator SHALL be marked with ✅ (unique match)

#### Scenario: CSS selector matches multiple elements
- **WHEN** the CSS selector matches multiple elements
- **THEN** the extension SHALL attempt to add index notation (`:nth-of-type`)
- **AND** SHALL mark the locator with ⚠️ (multiple matches, index added)

#### Scenario: CSS selector matches no elements
- **WHEN** the CSS selector matches zero elements
- **THEN** the locator SHALL be marked with ❌ (no matching elements)

#### Scenario: Invalid CSS selector
- **WHEN** the CSS selector throws an error during evaluation
- **THEN** the locator SHALL be marked with ❌ (invalid selector)

### Requirement: XPath Locator Validation
The extension SHALL validate XPath expressions against the current page DOM.

#### Scenario: XPath matches single element
- **WHEN** the XPath matches exactly one element
- **THEN** the locator SHALL be marked with ✅ (unique match)

#### Scenario: XPath matches multiple elements
- **WHEN** the XPath matches multiple elements
- **THEN** the extension SHALL attempt to add index notation
- **AND** SHALL mark the locator with ⚠️ (multiple matches, index added)

#### Scenario: XPath matches no elements
- **WHEN** the XPath matches zero elements
- **THEN** the locator SHALL be marked with ❌ (no matching elements)

#### Scenario: Invalid XPath expression
- **WHEN** the XPath throws an error during evaluation
- **THEN** the locator SHALL be marked with ❌ (invalid XPath)

### Requirement: Iframe Locator Validation
The extension SHALL handle iframe-originated locators with basic validation.

#### Scenario: Iframe locators preserved as-is
- **WHEN** locators are generated from an iframe element
- **THEN** the extension SHALL preserve the original format without adding validation markers
- **AND** SHALL return locators suitable for copying
