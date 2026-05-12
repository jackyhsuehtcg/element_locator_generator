## ADDED Requirements

### Requirement: Hover-to-Highlight in Result Panel
The extension SHALL highlight matching elements on the page when user hovers over a locator in the result panel.

#### Scenario: Hover shows matches
- **WHEN** user hovers over a locator in the result panel
- **THEN** the extension SHALL evaluate the locator against the current DOM
- **AND** SHALL highlight all matching elements with a distinct color (different from selection highlight)
- **AND** SHALL display a badge showing the match count next to the locator

#### Scenario: Leave hover removes highlight
- **WHEN** user moves the mouse away from the locator
- **THEN** the extension SHALL remove the highlight from matched elements

### Requirement: In-Panel Locator Editing
The extension SHALL allow users to edit locators in-place within the result panel.

#### Scenario: Click to edit
- **WHEN** user clicks the locator code text in the result panel
- **THEN** the text SHALL become editable (contenteditable or input-swap)
- **AND** SHALL provide syntax-friendly editing (preserving monospace font)

#### Scenario: Re-validate on edit
- **WHEN** user commits an edit (blur or Enter)
- **THEN** the extension SHALL re-validate the modified locator against the DOM
- **AND** SHALL update the status badge (✅/⚠️/❌) and stability score accordingly

### Requirement: Stability Score Display
The extension SHALL show stability scores in the result panel.

#### Scenario: Show star tier per locator
- **WHEN** rendering each locator in the result panel
- **THEN** the extension SHALL display the stability tier (⭐ × 1-5) next to the locator type label
- **AND** hovering the stars SHALL show a tooltip explaining the score

### Requirement: Offline Mode Banner
The extension SHALL display a prominent banner when in offline fallback mode.

#### Scenario: Show offline banner
- **WHEN** the result panel is rendered in offline mode
- **THEN** the extension SHALL display a yellow/amber banner at the top with the message "⚠️ Offline Mode: <reason>"
- **AND** the banner SHALL include a "Retry" button

### Requirement: History Panel
The extension SHALL provide a history panel accessible from the popup.

#### Scenario: Open history panel
- **WHEN** user clicks "History" in the popup
- **THEN** the extension SHALL open a history panel as a new tab or modal
- **AND** SHALL list past selections with URL, timestamp, element preview, and top stability score

### Requirement: Frame Path Breadcrumbs
The extension SHALL render frame path as breadcrumbs for iframe/shadow DOM elements.

#### Scenario: Show breadcrumbs for nested element
- **WHEN** the result panel renders locators for an element inside iframe or shadow DOM
- **THEN** the panel SHALL display a breadcrumb trail at the top (e.g. "main > iframe#app > shadow:my-widget > button")
- **AND** each breadcrumb segment SHALL indicate its boundary type (iframe / shadow)

## MODIFIED Requirements

### Requirement: Overlay Hint Display
The extension SHALL display an overlay hint during element selection mode.

#### Scenario: Show overlay hint
- **WHEN** element selection mode is activated
- **THEN** the extension SHALL display an overlay at the top of the page
- **AND** SHALL show the tool name and operation hint
- **AND** SHALL show the current selection count when in multi-element mode

#### Scenario: Hide overlay hint
- **WHEN** element selection mode is deactivated
- **THEN** the extension SHALL remove the overlay from the page

### Requirement: Result Panel Display
The extension SHALL display a modal panel with generated locators, stability scores, and interactive features.

#### Scenario: Show result panel
- **WHEN** AI successfully generates locators (or offline fallback produces them)
- **THEN** the extension SHALL display a centered modal panel
- **AND** SHALL show enabled locator types (configurable) with stability scores
- **AND** SHALL support hover-to-highlight and in-panel editing
- **AND** SHALL include a close button
- **AND** SHALL include frame path breadcrumbs if applicable
- **AND** SHALL include offline mode banner if applicable

#### Scenario: Show error panel
- **WHEN** AI generation fails AND offline fallback is disabled
- **THEN** the extension SHALL display a centered error panel
- **AND** SHALL show a user-friendly error message classified by error type
- **AND** SHALL include a "Retry" button and a "Configure Settings" link where relevant
