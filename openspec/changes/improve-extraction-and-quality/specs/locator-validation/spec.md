## ADDED Requirements

### Requirement: Playwright Locator Validation
The extension SHALL validate Playwright locators by parsing and resolving them against the current DOM.

#### Scenario: Validate getByRole
- **WHEN** Playwright locator uses `getByRole(role, { name })`
- **THEN** the extension SHALL query elements matching `[role="<role>"]` or semantic HTML with matching implicit role
- **AND** SHALL filter by accessible name matching `name`
- **AND** SHALL mark as ✅/⚠️/❌ based on uniqueness

#### Scenario: Validate getByText / getByLabel / getByPlaceholder
- **WHEN** Playwright locator uses text-based methods
- **THEN** the extension SHALL emulate the matching semantics using DOM queries
- **AND** SHALL produce validation status consistent with CSS/XPath validators

### Requirement: Selenium Locator Validation
The extension SHALL validate Selenium locator expressions.

#### Scenario: Parse By.XXX strategy
- **WHEN** Selenium locator uses `By.ID`, `By.CSS_SELECTOR`, `By.XPATH`, `By.CLASS_NAME`, `By.NAME`
- **THEN** the extension SHALL extract the selector argument and validate it using the corresponding DOM query
- **AND** SHALL mark as ✅/⚠️/❌ based on uniqueness

### Requirement: Stability Score Attachment
The extension SHALL attach a stability score to every validated locator.

#### Scenario: Compute and attach score
- **WHEN** a locator passes validation
- **THEN** the extension SHALL compute its stability score (see locator-stability-score spec)
- **AND** SHALL include the score in the result data

## MODIFIED Requirements

### Requirement: CSS Locator Validation
The extension SHALL validate CSS selectors against the current page DOM with smart index handling.

#### Scenario: CSS selector matches single element and is target
- **WHEN** the CSS selector matches exactly one element AND it is the original target
- **THEN** the locator SHALL be marked with ✅ (unique match)

#### Scenario: CSS selector matches single element but not target
- **WHEN** the CSS selector matches exactly one element but it is not the original target
- **THEN** the locator SHALL be marked with ❌ (matched wrong element)
- **AND** the extension SHALL NOT attempt index modification (the selector is semantically wrong)

#### Scenario: CSS selector matches multiple elements without existing index
- **WHEN** the selector does not contain `:nth-*` or similar index notation AND matches multiple elements including the target
- **THEN** the extension SHALL append `:nth-of-type(N)` where N is the target's 1-based position among matches of the same tag
- **AND** SHALL re-validate the modified selector
- **AND** SHALL mark as ⚠️ if re-validation succeeds, or replace with local fallback if not

#### Scenario: CSS selector matches multiple elements with existing index
- **WHEN** the selector already contains `:nth-*` or `[N]` AND still matches multiple elements
- **THEN** the extension SHALL NOT blindly append another index
- **AND** SHALL replace the locator with a locally-generated fallback selector
- **AND** SHALL mark as ⚠️ (LLM index invalid, replaced with local)

#### Scenario: CSS selector matches no elements
- **WHEN** the CSS selector matches zero elements
- **THEN** the locator SHALL be marked with ❌ (no matching elements)
- **AND** the extension SHALL suggest the locally-generated selector as an alternative

#### Scenario: Invalid CSS selector
- **WHEN** the CSS selector throws an error during evaluation
- **THEN** the locator SHALL be marked with ❌ (invalid selector)
- **AND** SHALL include the parse error message for debugging

### Requirement: XPath Locator Validation
The extension SHALL validate XPath expressions against the current page DOM with smart index handling.

#### Scenario: XPath matches single element and is target
- **WHEN** XPath matches exactly one element AND it is the original target
- **THEN** the locator SHALL be marked with ✅ (unique match)

#### Scenario: XPath matches single element but not target
- **WHEN** XPath matches exactly one element but it is not the target
- **THEN** the locator SHALL be marked with ❌ (matched wrong element)

#### Scenario: XPath matches multiple elements without existing index
- **WHEN** XPath does not end with `[N]` AND matches multiple elements including the target
- **THEN** the extension SHALL wrap the XPath as `(<xpath>)[N]` where N is the target's 1-based position
- **AND** SHALL re-validate and mark ⚠️ if successful, or replace with local fallback

#### Scenario: XPath matches multiple elements with existing index
- **WHEN** XPath already ends with `[N]` AND still matches multiple elements
- **THEN** the extension SHALL NOT wrap it with another index
- **AND** SHALL replace with locally-generated fallback

#### Scenario: XPath matches no elements
- **WHEN** XPath matches zero elements
- **THEN** the locator SHALL be marked with ❌ (no matching elements)

#### Scenario: Invalid XPath expression
- **WHEN** XPath throws an error during evaluation
- **THEN** the locator SHALL be marked with ❌ (invalid XPath)
