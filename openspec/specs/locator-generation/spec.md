## Purpose
Define the AI-powered locator generation process using OpenRouter, including API integration, prompt engineering, response parsing, and error handling.

## Requirements
### Requirement: OpenRouter API Integration
The extension SHALL use OpenRouter as the sole LLM provider for generating element locators.

#### Scenario: Send request to OpenRouter
- **WHEN** user clicks an element to generate locators
- **THEN** the extension SHALL send a POST request to `https://openrouter.ai/api/v1/chat/completions`
- **AND** SHALL include the selected element data in a structured prompt
- **AND** SHALL include Authorization header with Bearer token

### Requirement: OpenRouter API Configuration
The extension SHALL provide configuration for OpenRouter with API Key and model selection.

#### Scenario: User configures OpenRouter settings
- **WHEN** user opens the options page
- **THEN** user SHALL see API Key input (required)
- **AND** user SHALL see model selection dropdown with preset models
- **AND** user SHALL see custom model input option
- **AND** user SHALL be able to adjust temperature and max tokens

### Requirement: Prompt Engineering
The extension SHALL construct a structured prompt that guides the AI to generate stable locators.

#### Scenario: Build prompt from element data
- **WHEN** extension prepares the AI request
- **THEN** the prompt SHALL include element tag, id, class, text, attributes, placeholder, value
- **AND** SHALL specify output format: Playwright, CSS, XPath, Selenium (one per line)
- **AND** SHALL define Playwright priority order: getByRole > getByLabel > getByPlaceholder > getByText > getByTestId > getByTitle > getByAltText

### Requirement: OpenRouter Response Parsing
The extension SHALL parse OpenRouter responses in OpenAI-compatible chat completions format.

#### Scenario: Parse successful response
- **WHEN** OpenRouter returns a response
- **THEN** the extension SHALL extract content from `choices[0].message.content`
- **AND** SHALL return the raw text for further processing

#### Scenario: Handle empty response
- **WHEN** the response has no choices array
- **THEN** the extension SHALL throw an error: "API 沒有返回回應"

#### Scenario: Handle malformed response
- **WHEN** the response choice has no message content
- **THEN** the extension SHALL throw an error: "API 回應格式異常"

### Requirement: API Error Handling
The extension SHALL handle API errors gracefully.

#### Scenario: API returns error status
- **WHEN** the API response status is not 2xx
- **THEN** the extension SHALL throw an error with status code and response body text

#### Scenario: Network failure
- **WHEN** the network request fails
- **THEN** the extension SHALL display an error message to the user
