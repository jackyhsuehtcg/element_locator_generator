## ADDED Requirements

### Requirement: History Export
The extension SHALL allow users to export selection history in multiple formats.

#### Scenario: Export history as JSON
- **WHEN** user clicks "Export as JSON" in history panel
- **THEN** the extension SHALL trigger a download of a JSON file containing all history entries
- **AND** the file SHALL be named `element-locators-<timestamp>.json`

#### Scenario: Export history as CSV
- **WHEN** user clicks "Export as CSV" in history panel
- **THEN** the extension SHALL trigger a download of a CSV file with columns: timestamp, url, elementTag, playwright, css, xpath, selenium, stabilityScore
- **AND** SHALL properly escape commas and quotes in cell values

#### Scenario: Export history as Page Object Model
- **WHEN** user clicks "Export as POM" in history panel
- **THEN** the extension SHALL generate a JavaScript/TypeScript class file where each history entry becomes a class property
- **AND** the property name SHALL be derived from the element's text/label/role (camelCase, deduplicated)

### Requirement: Batch Selection Mode
The extension SHALL allow users to capture multiple elements in a single session and export them together.

#### Scenario: Start batch capture session
- **WHEN** user activates "Batch Capture" mode
- **THEN** the extension SHALL collect each subsequent selection into a batch buffer
- **AND** SHALL NOT display individual result panels during batch mode

#### Scenario: Finish and export batch
- **WHEN** user clicks "Finish Batch"
- **THEN** the extension SHALL display all captured elements with their locators
- **AND** SHALL provide export options (JSON/CSV/POM) for the batch

### Requirement: Filtered Export
The extension SHALL allow users to export a subset of history.

#### Scenario: Filter history by URL
- **WHEN** user applies a URL filter in the history panel
- **THEN** subsequent exports SHALL only include entries matching the filter
