## ADDED Requirements

### Requirement: Nested Iframe Traversal
The extension SHALL recursively propagate selection mode through multiple levels of nested iframes.

#### Scenario: Propagate to nested iframes
- **WHEN** the main frame activates selection mode
- **THEN** each iframe SHALL propagate `ELEMENT_LOCATOR_START` to its own nested iframes
- **AND** propagation SHALL continue recursively until all reachable frames are active
- **AND** cross-origin iframes SHALL be skipped silently without breaking the chain

### Requirement: Complete Frame Path Construction
The extension SHALL construct a complete frame path from the main frame to the selected element.

#### Scenario: Build frame path for nested selection
- **WHEN** user selects an element inside a nested iframe (e.g. main > iframe A > iframe B > element)
- **THEN** the extension SHALL produce a `framePath` array listing each frame in order
- **AND** each path entry SHALL include the iframe locator (by id/name/src/className priority)

#### Scenario: Display frame path in result
- **WHEN** the result panel renders locators for a nested iframe element
- **THEN** the panel SHALL display the complete frame path as breadcrumbs
- **AND** SHALL show example Playwright code for navigating into the frame chain

### Requirement: Cross-Frame Message Authentication
The extension SHALL authenticate cross-frame messages to prevent injection.

#### Scenario: Sign messages
- **WHEN** sending a cross-frame message
- **THEN** each message SHALL include a session-specific random token
- **AND** receiving frames SHALL verify the token matches the current session

## MODIFIED Requirements

### Requirement: Iframe Selection Support
The extension SHALL support element selection within iframes, including nested iframes.

#### Scenario: Selection mode propagates to iframes recursively
- **WHEN** user activates element selection mode on the main frame
- **THEN** the extension SHALL broadcast `ELEMENT_LOCATOR_START` to all direct iframes
- **AND** each iframe SHALL further propagate to its own nested iframes
- **AND** all accessible frames SHALL activate their own selection mode

#### Scenario: ESC key stops selection in all frames
- **WHEN** user presses ESC in any frame (main or any depth of iframe)
- **THEN** the frame SHALL send `ELEMENT_LOCATOR_STOP_REQUEST` to the main frame
- **AND** the main frame SHALL broadcast `ELEMENT_LOCATOR_STOP` recursively to all frames

#### Scenario: Iframe element selection sends data with frame path
- **WHEN** user clicks an element inside any iframe (including nested)
- **THEN** the iframe SHALL construct its own frame info and send `ELEMENT_SELECTED` to its parent frame
- **AND** each intermediate frame SHALL prepend its own iframe info to the `framePath`
- **AND** the main frame SHALL receive the complete frame path before processing

### Requirement: Iframe Data Marking
The extension SHALL mark data originating from iframes with complete frame context.

#### Scenario: Mark iframe-sourced data with complete path
- **WHEN** element data is received at the main frame from any iframe depth
- **THEN** the extension SHALL add `fromIframe: true` and `framePath: [...]` to the data
- **AND** `framePath` SHALL contain ordered iframe descriptors from outermost to innermost
