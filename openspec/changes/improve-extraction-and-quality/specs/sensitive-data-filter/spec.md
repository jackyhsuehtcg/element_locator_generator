## ADDED Requirements

### Requirement: Sensitive Field Name Blacklist
The extension SHALL filter element data fields whose names match a sensitive blacklist before sending to the LLM.

#### Scenario: Redact value of password field
- **WHEN** an element has `name="password"` or `type="password"` or any attribute name matching `/password|secret|token|api[_-]?key|credit[_-]?card|ssn/i`
- **THEN** the extension SHALL replace the `value` and `text` fields with `[REDACTED:blacklist]` before sending to LLM
- **AND** SHALL preserve the field names for context

#### Scenario: User-defined blacklist
- **WHEN** user adds custom field name patterns in settings
- **THEN** the extension SHALL merge them with the default blacklist
- **AND** SHALL apply both during filtering

### Requirement: Sensitive Value Pattern Detection
The extension SHALL detect and redact values matching known sensitive patterns regardless of field name.

#### Scenario: Redact email address
- **WHEN** a field value matches the pattern `[\w.+-]+@[\w-]+\.[\w.-]+`
- **THEN** the extension SHALL replace the value with `[REDACTED:email]`

#### Scenario: Redact credit card number
- **WHEN** a field value contains 13-19 consecutive digits passing Luhn validation
- **THEN** the extension SHALL replace the value with `[REDACTED:credit-card]`

#### Scenario: Redact JWT token
- **WHEN** a field value matches `^eyJ[\w-]+\.[\w-]+\.[\w-]+$`
- **THEN** the extension SHALL replace the value with `[REDACTED:jwt]`

#### Scenario: Redact UUID
- **WHEN** a field value matches UUID v4 format
- **THEN** the extension SHALL replace the value with `[REDACTED:uuid]`

#### Scenario: Redact bearer token
- **WHEN** a field value starts with `Bearer `
- **THEN** the extension SHALL replace the value with `[REDACTED:bearer]`

### Requirement: Value Length Threshold
The extension SHALL truncate overly long values to avoid sending large payloads.

#### Scenario: Truncate long value
- **WHEN** a field value exceeds 200 characters
- **THEN** the extension SHALL truncate it to the first 200 characters followed by `...[truncated]`

### Requirement: Pre-Send Preview
The extension SHALL optionally show users the filtered payload before sending.

#### Scenario: User enables preview mode
- **WHEN** user enables "Preview before send" in settings
- **THEN** the extension SHALL display a modal showing the exact JSON payload that will be sent to the LLM
- **AND** user SHALL be able to cancel, proceed, or edit specific fields before sending

### Requirement: Filtering Disable Option
The extension SHALL allow users to disable sensitive data filtering when needed.

#### Scenario: Disable filter for trusted pages
- **WHEN** user toggles off "Sensitive Data Filter" in settings
- **THEN** the extension SHALL send element data as-is without filtering
- **AND** SHALL display a persistent warning banner in the options page
