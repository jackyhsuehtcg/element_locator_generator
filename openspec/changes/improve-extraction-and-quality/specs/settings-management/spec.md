## ADDED Requirements

### Requirement: Enabled Locator Types Selection
The extension SHALL allow users to select which locator types are generated.

#### Scenario: Configure enabled types
- **WHEN** user opens settings
- **THEN** user SHALL see checkboxes for: Playwright, CSS, XPath, Selenium, Cypress, Testing Library, WebdriverIO
- **AND** user SHALL be able to enable/disable each independently
- **AND** at least one type MUST remain enabled

#### Scenario: Apply enabled types to LLM prompt
- **WHEN** generating locators
- **THEN** the LLM prompt SHALL request only the enabled types
- **AND** disabled types SHALL NOT appear in the result panel

### Requirement: Selenium Language Selection
The extension SHALL allow users to choose the Selenium example language.

#### Scenario: Select Selenium language
- **WHEN** Selenium is enabled in settings
- **THEN** user SHALL see a language dropdown with options: Python, Java, JavaScript, C#
- **AND** the default SHALL be Python

### Requirement: Sensitive Data Filter Settings
The extension SHALL expose settings for sensitive data filtering.

#### Scenario: Toggle sensitive filter
- **WHEN** user opens settings
- **THEN** user SHALL see a toggle "Enable sensitive data filter"
- **AND** user SHALL see a text area for custom blacklist patterns (one per line)

#### Scenario: Toggle pre-send preview
- **WHEN** user opens settings
- **THEN** user SHALL see a toggle "Preview payload before sending"
- **AND** when enabled, the extension SHALL show a preview modal before each LLM call

### Requirement: API Key Storage Strategy
The extension SHALL offer multiple storage strategies for API key.

#### Scenario: Storage strategy options
- **WHEN** user opens settings
- **THEN** user SHALL see a dropdown "API key storage" with options:
  - `sync` (default, synced across devices)
  - `local` (this browser only)
  - `session` (cleared when browser closes; must re-enter)

### Requirement: History Settings
The extension SHALL expose settings for selection history.

#### Scenario: Configure history
- **WHEN** user opens settings
- **THEN** user SHALL see a toggle "Enable history" and a numeric input "Max history entries" (10-500, default 50)
- **AND** user SHALL see a "Clear History" button

### Requirement: Cache Settings
The extension SHALL expose settings for locator caching.

#### Scenario: Configure cache
- **WHEN** user opens settings
- **THEN** user SHALL see a toggle "Enable locator cache"
- **AND** user SHALL see a "Clear Cache" button

### Requirement: Settings Schema Migration
The extension SHALL migrate older settings schemas to the current version automatically.

#### Scenario: Migrate from unversioned settings
- **WHEN** loaded settings have no `version` field
- **THEN** the extension SHALL treat it as version 0 and apply all migrations in order
- **AND** SHALL save the migrated settings back to storage

#### Scenario: Backward compatibility
- **WHEN** loaded settings version is higher than the current code version
- **THEN** the extension SHALL load only fields known to the current version
- **AND** SHALL log a warning about the version mismatch

## MODIFIED Requirements

### Requirement: Settings Storage
The extension SHALL store user settings in Chrome storage with a configurable backend.

#### Scenario: Save settings
- **WHEN** user submits the settings form
- **THEN** the extension SHALL save to the chosen storage backend (sync/local/session) based on the API key storage strategy setting
- **AND** non-sensitive settings (theme, enabled types, etc.) SHALL always go to `chrome.storage.sync`
- **AND** SHALL display a success notification

#### Scenario: Load settings on initialization
- **WHEN** the options page loads
- **THEN** the extension SHALL retrieve settings from appropriate storage
- **AND** SHALL apply schema migrations if needed
- **AND** SHALL populate the form fields with migrated values

### Requirement: Settings Validation
The extension SHALL validate settings before saving with detailed error messages.

#### Scenario: Validate API key presence for online usage
- **WHEN** user saves settings with offline fallback disabled AND empty API key
- **THEN** the extension SHALL warn that generation will fail without a key
- **AND** SHALL allow saving but highlight the API key field

#### Scenario: Validate model name format
- **WHEN** user saves settings with a non-empty model name
- **THEN** the extension SHALL verify it matches `provider/model-name` format (contains at least one `/`)
- **AND** SHALL reject and display an error if malformed

#### Scenario: Validate at least one locator type enabled
- **WHEN** user saves settings with all locator types disabled
- **THEN** the extension SHALL reject the save
- **AND** SHALL display an error requiring at least one enabled type
