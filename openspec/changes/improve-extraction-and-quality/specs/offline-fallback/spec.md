## ADDED Requirements

### Requirement: Offline Fallback on API Failure
The extension SHALL provide a fallback locator generation path when the OpenRouter API is unavailable.

#### Scenario: Network error fallback
- **WHEN** the OpenRouter API request fails due to network error (no response received)
- **THEN** the extension SHALL compute locators using the local generator (XPath + CSS + basic Playwright synthesis)
- **AND** SHALL display the result panel with an "⚠️ Offline Mode" banner indicating the failure reason

#### Scenario: HTTP error fallback
- **WHEN** the OpenRouter API returns 401 / 402 / 429 / 5xx status
- **THEN** the extension SHALL enter offline mode with the specific error reason shown
- **AND** SHALL include a "Retry" button in the banner

#### Scenario: Missing API key fallback
- **WHEN** user attempts to generate locators without a configured API key
- **THEN** the extension SHALL proceed in offline mode directly
- **AND** SHALL display a banner suggesting to configure API key in settings

### Requirement: Offline Locator Coverage
The extension SHALL generate as many locator types as possible in offline mode.

#### Scenario: Offline CSS and XPath
- **WHEN** in offline mode
- **THEN** the extension SHALL always produce CSS and XPath locators using the local generator

#### Scenario: Offline Playwright synthesis
- **WHEN** element has identifiable semantic attributes (role, aria-label, placeholder, text)
- **THEN** the extension SHALL synthesize a best-effort `getByRole`/`getByLabel`/`getByText`/`getByPlaceholder` Playwright locator locally
- **AND** SHALL label it as "(Offline synthesis)"

#### Scenario: Selenium unavailable offline
- **WHEN** in offline mode
- **THEN** Selenium locator SHALL be marked as "Not available offline"

### Requirement: Retry Mechanism
The extension SHALL allow users to retry the API request from offline mode.

#### Scenario: User retries after fixing network
- **WHEN** user clicks the "Retry" button in the offline banner
- **THEN** the extension SHALL re-send the same element data to the LLM
- **AND** SHALL replace offline results with LLM results on success
