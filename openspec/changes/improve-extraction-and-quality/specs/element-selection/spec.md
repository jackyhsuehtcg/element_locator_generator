## ADDED Requirements

### Requirement: Composed Path Target Resolution
The extension SHALL resolve the true target element through `event.composedPath()` to support shadow DOM.

#### Scenario: Target is inside shadow root
- **WHEN** user clicks an element inside a shadow root
- **THEN** the extension SHALL use `event.composedPath()[0]` instead of `event.target` to identify the actual target
- **AND** SHALL record the shadow boundary crossings for locator generation

### Requirement: Multi-Element Selection Entry Point
The extension SHALL provide a way to enter multi-element selection mode.

#### Scenario: Activate via popup action
- **WHEN** user clicks "Multi-Select" in the popup
- **THEN** the extension SHALL enter multi-element mode instead of single-select mode

#### Scenario: Activate via Shift+click modifier
- **WHEN** user holds Shift while clicking during regular selection mode
- **THEN** the extension SHALL switch to multi-element mode with the clicked element as the first selection

### Requirement: Keyboard Navigation During Selection
The extension SHALL allow keyboard-based DOM tree navigation during selection mode.

#### Scenario: Arrow keys traverse DOM
- **WHEN** user presses arrow keys during selection mode
- **THEN** the extension SHALL move the highlight to parent/child/sibling elements as specified in keyboard-navigation spec

## MODIFIED Requirements

### Requirement: Element Highlighting
The extension SHALL visually highlight the element under the mouse cursor or keyboard focus during selection mode.

#### Scenario: Mouse hover highlights element
- **WHEN** user moves the mouse over an element during selection mode
- **THEN** the element SHALL be highlighted with a warm coral outline (`#e8926c`) and semi-transparent background
- **AND** the highlight SHALL follow the element through shadow DOM boundaries when applicable

#### Scenario: Keyboard navigation highlights element
- **WHEN** user navigates via arrow keys during selection mode
- **THEN** the currently-focused element SHALL display a distinct focus indicator
- **AND** the indicator SHALL be visually different from hover highlight

#### Scenario: Mouse out clears highlight
- **WHEN** user moves the mouse away from an element (and no keyboard focus is active)
- **THEN** the highlight SHALL be removed from the previous element
