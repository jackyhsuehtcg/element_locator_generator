## Purpose
Define the element selection mode behavior, including activation, highlighting, system page restrictions, and force restart capabilities.

## Requirements
### Requirement: Element Selection Mode
The extension SHALL provide an element selection mode that allows users to click on any web element to initiate locator generation.

#### Scenario: User starts element selection via extension icon
- **WHEN** user clicks the extension icon on a supported web page
- **THEN** the extension SHALL activate element selection mode
- **AND** the cursor SHALL change to crosshair
- **AND** an overlay hint SHALL appear at the top of the page

#### Scenario: User stops element selection via ESC key
- **WHEN** user presses the ESC key during element selection mode
- **THEN** the extension SHALL deactivate element selection mode
- **AND** the cursor SHALL return to default
- **AND** the overlay hint SHALL be removed

### Requirement: Element Highlighting
The extension SHALL visually highlight the element under the mouse cursor during selection mode.

#### Scenario: Mouse hover highlights element
- **WHEN** user moves the mouse over an element during selection mode
- **THEN** the element SHALL be highlighted with a red outline and semi-transparent background

#### Scenario: Mouse out clears highlight
- **WHEN** user moves the mouse away from an element
- **THEN** the highlight SHALL be removed from the previous element

### Requirement: System Page Restriction
The extension SHALL NOT activate on browser system pages.

#### Scenario: Extension blocked on system pages
- **WHEN** user clicks the extension icon on a `chrome://`, `edge://`, or `chrome-extension://` page
- **THEN** the extension SHALL display a notification indicating the page type is not supported
- **AND** element selection mode SHALL NOT be activated

### Requirement: Force Stop and Restart
The extension SHALL support force-stopping and restarting element selection to avoid state desynchronization.

#### Scenario: Force stop before restart
- **WHEN** user clicks the extension icon while selection mode is already active
- **THEN** the extension SHALL force-stop the current selection mode
- **AND** SHALL restart selection mode after a brief delay
