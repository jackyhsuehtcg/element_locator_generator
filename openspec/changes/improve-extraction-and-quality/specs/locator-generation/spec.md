## ADDED Requirements

### Requirement: Dynamic Class Filtering
The local CSS selector generator SHALL skip dynamically-generated classes.

#### Scenario: Filter hash-based classes
- **WHEN** generating a CSS selector using class names
- **THEN** the generator SHALL exclude classes matching these patterns:
  - `sc-[a-zA-Z0-9]+` (styled-components)
  - `css-[a-zA-Z0-9]+` (Emotion)
  - `_ngcontent-*`, `_nghost-*` (Angular)
  - `svelte-[a-z0-9]+` (Svelte)
  - `[a-z]+-[a-f0-9]{6,}` (generic hash pattern)
- **AND** SHALL fall back to `:nth-of-type` if excluding dynamic classes leaves no identifying feature

### Requirement: Chain Locator Generation
The extension SHALL support chain-style Playwright locators for nested contexts.

#### Scenario: Generate container-scoped locator
- **WHEN** the target element is inside an identifiable container (e.g. table row, card, modal) with a unique attribute or text
- **THEN** the extension SHALL generate a chain locator of the form `page.locator(containerSelector).getByRole(targetRole, { name: targetName })`
- **AND** SHALL include this as an additional Playwright variant in the result

### Requirement: Table Element Special Handling
The extension SHALL generate row-and-column based locators for table cells.

#### Scenario: Generate table cell locator
- **WHEN** target element is `<td>` or `<th>` inside a `<table>`
- **THEN** the extension SHALL generate a Playwright locator of form `page.getByRole('row', { name: <unique row text> }).getByRole('cell').nth(<col index>)`
- **AND** SHALL fall back to `:nth-child` row/column CSS when Playwright format is not appropriate

### Requirement: Multiple Locator Type Support
The extension SHALL support additional locator types beyond the original four.

#### Scenario: Cypress locator
- **WHEN** user enables Cypress in settings
- **THEN** the extension SHALL include Cypress-style locator (e.g. `cy.get('[data-testid="..."]')`) in the result

#### Scenario: Testing Library locator
- **WHEN** user enables Testing Library in settings
- **THEN** the extension SHALL include Testing Library locator (e.g. `screen.getByRole('button', { name: '...' })`)

#### Scenario: WebdriverIO locator
- **WHEN** user enables WebdriverIO in settings
- **THEN** the extension SHALL include WebdriverIO locator (e.g. `$('[data-testid="..."]')`)

## MODIFIED Requirements

### Requirement: CSS Selector Generation
The extension SHALL generate CSS selectors using `:nth-of-type` for positional indexing.

#### Scenario: Generate CSS selector with element id
- **WHEN** the selected element has an id attribute (non-dynamic)
- **THEN** the CSS selector SHALL use the id format: `#element-id`

#### Scenario: Generate CSS selector without element id
- **WHEN** the selected element has no id attribute
- **THEN** the CSS selector SHALL use static class names (excluding dynamic classes) and `:nth-of-type` pseudo-classes (NOT `:nth-child`)
- **AND** SHALL limit traversal depth to 5 levels
- **AND** SHALL prefer semantic attributes (data-testid, aria-label) as identifying features when class names are all dynamic

### Requirement: XPath Generation
The extension SHALL generate XPath expressions using text-based predicates when beneficial.

#### Scenario: Generate XPath with element id
- **WHEN** the selected element has an id attribute (non-dynamic)
- **THEN** the XPath SHALL use the id-based format: `//*[@id="element-id"]`

#### Scenario: Generate XPath without element id
- **WHEN** the selected element has no id attribute
- **THEN** the XPath SHALL traverse the DOM tree with tag names and positional indices
- **AND** SHALL include `[contains(text(), "...")]` or `[@attribute="..."]` predicates when they reduce ambiguity
- **AND** SHALL include index notation `[N]` when multiple siblings share the same tag

### Requirement: Prompt Engineering
The extension SHALL construct a structured two-part prompt (system + user) that guides the AI to generate stable, unique locators.

#### Scenario: System prompt content
- **WHEN** preparing the LLM request
- **THEN** the system message SHALL be in English and contain:
  - Role definition ("You are an expert test automation engineer...")
  - Output format specification (one locator per line, prefixed by type name)
  - Uniqueness requirement ("Each generated locator MUST uniquely identify the target element given the provided DOM context")
  - Playwright priority order (getByRole > getByLabel > getByPlaceholder > getByText > getByTestId > getByTitle > getByAltText)
  - Framework-specific guidance when framework is detected
  - Few-shot examples demonstrating correct format
- **AND** SHALL NOT contain dynamic element data

#### Scenario: User prompt content
- **WHEN** preparing the LLM request
- **THEN** the user message SHALL contain structured element data including:
  - Target element attributes (tag, id, className, text, attributes, ariaAttributes)
  - neighborContext (sibling summary for uniqueness reasoning)
  - labels (associated label texts)
  - framePath (shadow/iframe context)
  - Locally-generated XPath and CSS as reference
  - framework (detected frontend framework, if any)
  - enabledLocatorTypes (which types the user wants generated)
- **AND** SHALL request the output in the format defined by system prompt
