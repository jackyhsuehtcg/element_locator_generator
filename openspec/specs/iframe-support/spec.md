## Purpose
Define iframe cross-frame support for element selection, including mode propagation, data marking, and iframe-specific locator generation.

## Requirements
### Requirement: Iframe Selection Support
The extension SHALL support element selection within iframes on the page.

#### Scenario: Selection mode propagates to iframes
- **WHEN** user activates element selection mode on the main frame
- **THEN** the extension SHALL broadcast `ELEMENT_LOCATOR_START` to all iframes
- **AND** all iframes SHALL activate their own selection mode

#### Scenario: ESC key stops selection in all frames
- **WHEN** user presses ESC in any frame (main or iframe)
- **THEN** the extension SHALL stop selection mode in that frame
- **AND** the main frame SHALL broadcast `ELEMENT_LOCATOR_STOP` to all iframes

#### Scenario: Iframe element selection sends data to main frame
- **WHEN** user clicks an element inside an iframe
- **THEN** the iframe SHALL send an `ELEMENT_SELECTED` message to the main frame via postMessage
- **AND** the main frame SHALL process the data for AI locator generation

### Requirement: Iframe Locator Generation
The extension SHALL generate iframe-specific locators when elements are selected within iframes.

#### Scenario: Generate iframe locator
- **WHEN** an element is selected from within an iframe
- **THEN** the extension SHALL generate iframe locator based on available attributes (id, name, src, className)
- **AND** SHALL display a hint indicating the iframe must be located first

#### Scenario: Iframe locator priority
- **WHEN** generating iframe locator
- **THEN** the extension SHALL prioritize: id selector > name selector > src selector > className selector > generic `iframe` tag

### Requirement: Iframe Data Marking
The extension SHALL mark data originating from iframes for proper processing.

#### Scenario: Mark iframe-sourced data
- **WHEN** element data is received from an iframe
- **THEN** the extension SHALL add a `fromIframe: true` flag to the data
- **AND** SHALL attach iframe information (id, name, src, className, title) to the data
