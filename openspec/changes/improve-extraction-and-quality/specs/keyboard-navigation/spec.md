## ADDED Requirements

### Requirement: DOM Tree Keyboard Navigation
The extension SHALL allow users to move the current selection target through the DOM tree using arrow keys during selection mode.

#### Scenario: Move to parent element
- **WHEN** user presses the ArrowUp key during selection mode with a currently highlighted element
- **THEN** the extension SHALL move the highlight to the parent element
- **AND** SHALL respect shadow DOM boundaries (jumping to host when crossing)

#### Scenario: Move to first child
- **WHEN** user presses the ArrowDown key
- **THEN** the extension SHALL move the highlight to the first child element (if any)

#### Scenario: Move to previous sibling
- **WHEN** user presses the ArrowLeft key
- **THEN** the extension SHALL move the highlight to the previous element sibling within the same parent

#### Scenario: Move to next sibling
- **WHEN** user presses the ArrowRight key
- **THEN** the extension SHALL move the highlight to the next element sibling within the same parent

#### Scenario: Confirm selection with Enter
- **WHEN** user presses the Enter key on a highlighted element
- **THEN** the extension SHALL treat it as a click and proceed to locator generation

### Requirement: Result Panel Keyboard Navigation
The extension SHALL support keyboard navigation within the result panel.

#### Scenario: Tab between locator items
- **WHEN** user presses Tab within the result panel
- **THEN** focus SHALL move to the next focusable element (copy button, editable locator code, close button)

#### Scenario: Close result panel with Escape
- **WHEN** user presses Escape while the result panel is focused
- **THEN** the extension SHALL close the result panel

### Requirement: Keyboard Navigation Indicator
The extension SHALL visually indicate the keyboard-navigated element.

#### Scenario: Show focus ring on keyboard selection
- **WHEN** user navigates via keyboard
- **THEN** the highlighted element SHALL display a distinct focus indicator (different from hover highlight) to distinguish keyboard vs mouse navigation
