## Purpose
Define all UI rendering behaviors including overlay hints, loading indicators, result/error panels, and iframe-specific information display.

## Requirements
### Requirement: Overlay Hint Display
The extension SHALL display an overlay hint during element selection mode.

#### Scenario: Show overlay hint
- **WHEN** element selection mode is activated
- **THEN** the extension SHALL display an overlay at the top of the page
- **AND** SHALL show the tool name, operation hint, and current model info

#### Scenario: Hide overlay hint
- **WHEN** element selection mode is deactivated
- **THEN** the extension SHALL remove the overlay from the page

### Requirement: Loading Indicator
The extension SHALL display a loading indicator while waiting for AI response.

#### Scenario: Show loading spinner
- **WHEN** element data is sent to OpenRouter
- **THEN** the extension SHALL display a full-screen overlay with a spinner
- **AND** SHALL show "正在生成 Locators..." text

#### Scenario: Hide loading spinner
- **WHEN** AI response is received or an error occurs
- **THEN** the extension SHALL remove the loading overlay

### Requirement: Result Panel Display
The extension SHALL display a modal panel with generated locators.

#### Scenario: Show result panel
- **WHEN** AI successfully generates locators
- **THEN** the extension SHALL display a centered modal panel
- **AND** SHALL show four locator types: Playwright, CSS, XPath, Selenium
- **AND** SHALL include a close button

#### Scenario: Show error panel
- **WHEN** AI generation fails
- **THEN** the extension SHALL display a centered error panel
- **AND** SHALL show the error message

### Requirement: Iframe Info Display
The extension SHALL display iframe-specific information when locators originate from an iframe.

#### Scenario: Show iframe info
- **WHEN** locators are generated from an iframe element
- **THEN** the result panel SHALL include iframe locator hints
- **AND** SHALL show a note indicating the iframe must be located first
