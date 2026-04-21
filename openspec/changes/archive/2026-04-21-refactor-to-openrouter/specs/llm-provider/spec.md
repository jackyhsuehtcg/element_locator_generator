## ADDED Requirements
### Requirement: OpenRouter LLM Provider
The extension SHALL use OpenRouter as the sole LLM provider for generating element locators.

#### Scenario: Extension uses OpenRouter for locator generation
- **WHEN** user clicks an element to generate locators
- **THEN** the extension SHALL send a request to OpenRouter API
- **AND** the extension SHALL receive generated locators in response

### Requirement: OpenRouter API Configuration
The extension SHALL provide API configuration for OpenRouter with the following settings:
- API Key (required)
- Model selection (preset dropdown + custom input)
- Temperature (0.0 - 2.0, default 0.1)
- Max tokens (1 - 4096, default 512)

#### Scenario: User configures OpenRouter settings
- **WHEN** user opens options page
- **THEN** user SHALL see OpenRouter-specific settings
- **AND** user SHALL be able to enter API key
- **AND** user SHALL be able to select from preset models or enter custom model name
- **AND** user SHALL be able to adjust temperature and max tokens

### Requirement: OpenRouter API Endpoint
The extension SHALL use the fixed OpenRouter API endpoint: `https://openrouter.ai/api/v1`

#### Scenario: Extension sends request to OpenRouter
- **WHEN** extension needs to generate locators
- **THEN** extension SHALL send POST request to `https://openrouter.ai/api/v1/chat/completions`
- **AND** extension SHALL include Authorization header with Bearer token

### Requirement: OpenRouter Request Format
The extension SHALL send requests in OpenAI-compatible chat completions format.

#### Scenario: Extension builds request body
- **WHEN** extension prepares API request
- **THEN** request body SHALL contain:
  - `model`: selected model name
  - `messages`: array with user role and prompt content
  - `max_tokens`: configured max tokens value
  - `temperature`: configured temperature value

### Requirement: OpenRouter Response Parsing
The extension SHALL parse OpenRouter responses in OpenAI-compatible format.

#### Scenario: Extension parses API response
- **WHEN** OpenRouter returns a response
- **THEN** extension SHALL extract content from `choices[0].message.content`
- **AND** extension SHALL handle error responses appropriately

### Requirement: Connection Test
The extension SHALL provide a connection test function for OpenRouter.

#### Scenario: User tests OpenRouter connection
- **WHEN** user clicks "Test Connection" button
- **THEN** extension SHALL send a test request to OpenRouter
- **AND** extension SHALL display success or error message based on response

## REMOVED Requirements
### Requirement: Multiple LLM Provider Support
**Reason**: Consolidated to single provider (OpenRouter) for simplified architecture

- `### Requirement: LM Studio Provider`
- `### Requirement: Ollama Provider`
- `### Requirement: OpenAI Direct Provider`
- `### Requirement: Google Gemini Provider`
- `### Requirement: Anthropic Claude Provider`

**Migration**: Users must migrate their API keys to OpenRouter and select appropriate models from OpenRouter's supported list.

### Requirement: Provider Selection Dropdown
**Reason**: No longer needed with single provider

**Migration**: Options page will show OpenRouter-specific settings instead of provider selection.

### Requirement: Custom API URL Input
**Reason**: Fixed to OpenRouter endpoint for simplicity

**Migration**: API URL field removed; fixed endpoint used automatically.
