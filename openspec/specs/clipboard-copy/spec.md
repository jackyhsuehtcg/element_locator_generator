## Purpose
Define the clipboard copy functionality for individual locators and iframe-specific locators, including API fallback and error handling.

## Requirements
### Requirement: Single Locator Copy
The extension SHALL provide one-click copy for individual locator types.

#### Scenario: Copy single locator
- **WHEN** user clicks the copy button next to a locator type
- **THEN** the extension SHALL copy that locator's text to the clipboard
- **AND** SHALL display a "✅ 已複製" feedback for 2 seconds
- **AND** SHALL restore the original button text after feedback

### Requirement: Iframe Locator Copy
The extension SHALL provide one-click copy for iframe-specific locators.

#### Scenario: Copy iframe locator
- **WHEN** user clicks an iframe locator tag
- **THEN** the extension SHALL copy the iframe locator text to the clipboard
- **AND** SHALL display a "✅ 已複製" feedback for 2 seconds

### Requirement: Clipboard API Fallback
The extension SHALL fallback to `document.execCommand('copy')` when Clipboard API is unavailable.

#### Scenario: Clipboard API unavailable
- **WHEN** `navigator.clipboard` is not available or page is not in secure context
- **THEN** the extension SHALL create a temporary textarea
- **AND** SHALL select and copy the text using `execCommand('copy')`

### Requirement: Copy Error Handling
The extension SHALL handle copy failures gracefully.

#### Scenario: Copy fails
- **WHEN** clipboard write fails
- **THEN** the extension SHALL display an alert with the text content for manual copying
