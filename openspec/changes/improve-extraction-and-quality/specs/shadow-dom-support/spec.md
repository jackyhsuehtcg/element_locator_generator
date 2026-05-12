## ADDED Requirements

### Requirement: Shadow DOM Element Selection
The extension SHALL allow users to select elements inside shadow roots.

#### Scenario: Click target inside shadow root
- **WHEN** user clicks an element that resides inside a shadow root during selection mode
- **THEN** the extension SHALL use `event.composedPath()[0]` as the target element
- **AND** SHALL NOT treat the shadow host as the target

#### Scenario: Hover highlights shadow DOM element
- **WHEN** user hovers over an element inside a shadow root during selection mode
- **THEN** the extension SHALL highlight the actual inner element, not the shadow host

### Requirement: Shadow DOM Path Generation
The extension SHALL produce locators that traverse shadow DOM boundaries.

#### Scenario: Generate piercing path for shadow element
- **WHEN** a selected element's ancestry includes one or more shadow roots
- **THEN** the extension SHALL produce a Playwright-compatible piercing selector using `>>` syntax (e.g. `my-host >> .inner-class`)
- **AND** SHALL annotate each shadow boundary in the generated path

#### Scenario: CSS and XPath limitations for shadow elements
- **WHEN** a target element resides inside a shadow root
- **THEN** the extension SHALL mark CSS and XPath locators as `(Shadow DOM - Playwright only)` when the path crosses a shadow boundary
- **AND** SHALL NOT produce invalid CSS/XPath selectors that appear to work but cannot pierce shadow DOM

### Requirement: Shadow DOM Depth Limit
The extension SHALL limit shadow DOM traversal depth to prevent pathological cases.

#### Scenario: Exceeds depth limit
- **WHEN** an element's shadow nesting depth exceeds 3 levels
- **THEN** the extension SHALL display a warning in the result panel
- **AND** SHALL still produce a best-effort locator to the deepest resolvable level
