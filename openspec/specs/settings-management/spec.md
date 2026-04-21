## Purpose
Define user settings management including OpenRouter API Key, model selection, parameter configuration, connection testing, and storage persistence.

## Requirements
### Requirement: Settings Storage
The extension SHALL store user settings in Chrome's sync storage.

#### Scenario: Save settings
- **WHEN** user submits the settings form
- **THEN** the extension SHALL save apiKey, modelName, temperature, and maxTokens to `chrome.storage.sync`
- **AND** SHALL display a success notification

#### Scenario: Load settings on initialization
- **WHEN** the options page loads
- **THEN** the extension SHALL retrieve settings from `chrome.storage.sync`
- **AND** SHALL populate the form fields with saved values

### Requirement: API Key Configuration
The extension SHALL require an OpenRouter API Key for authentication.

#### Scenario: API Key is required
- **WHEN** user attempts to save settings without an API Key
- **THEN** the extension SHALL display an error message
- **AND** SHALL not save the settings

### Requirement: Model Selection
The extension SHALL provide preset model options and custom model input.

#### Scenario: Select preset model
- **WHEN** user selects a model from the dropdown
- **THEN** the extension SHALL use the selected model name for API requests

#### Scenario: Custom model input
- **WHEN** user selects "Custom" from the dropdown
- **THEN** the extension SHALL display a custom model name input field
- **AND** SHALL use the custom model name for API requests

### Requirement: Connection Test
The extension SHALL provide a function to test the OpenRouter API connection.

#### Scenario: Successful connection test
- **WHEN** user clicks "Test Connection" with valid settings
- **THEN** the extension SHALL send a minimal test request to OpenRouter
- **AND** SHALL display a success message with the API response

#### Scenario: Failed connection test
- **WHEN** user clicks "Test Connection" with invalid settings
- **THEN** the extension SHALL display an error message with details

### Requirement: Settings Validation
The extension SHALL validate settings before saving.

#### Scenario: Validate API Key presence
- **WHEN** user saves settings
- **THEN** the extension SHALL verify API Key is not empty

#### Scenario: Validate custom model name
- **WHEN** user saves settings with custom model option
- **THEN** the extension SHALL verify the custom model name is not empty
