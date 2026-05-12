## ADDED Requirements

### Requirement: Structured Two-Part Messages
The extension SHALL send OpenRouter requests with separated system and user messages.

#### Scenario: System and user messages
- **WHEN** calling OpenRouter chat completions
- **THEN** the `messages` array SHALL contain exactly two entries: one with `role: "system"` and one with `role: "user"`
- **AND** SHALL NOT combine both into a single user message

### Requirement: HTTP Error Classification
The extension SHALL classify API errors by HTTP status code with user-friendly messages.

#### Scenario: 401 unauthorized
- **WHEN** the API returns 401
- **THEN** the extension SHALL display "Invalid API key. Please check your OpenRouter key in settings."
- **AND** SHALL provide a link to the options page

#### Scenario: 402 payment required
- **WHEN** the API returns 402
- **THEN** the extension SHALL display "Insufficient credits on your OpenRouter account."
- **AND** SHALL provide a link to the OpenRouter billing page

#### Scenario: 429 rate limit
- **WHEN** the API returns 429
- **THEN** the extension SHALL display "Rate limit exceeded. Please wait before retrying."
- **AND** SHALL include the Retry-After value if present in the response headers

#### Scenario: 5xx server error
- **WHEN** the API returns 500-599
- **THEN** the extension SHALL display "OpenRouter service temporarily unavailable."
- **AND** SHALL suggest retrying after a delay

#### Scenario: Network failure
- **WHEN** the fetch throws (no response)
- **THEN** the extension SHALL display "Network error. Check your internet connection."

### Requirement: Rate Limiting
The extension SHALL limit the frequency of API requests from client side.

#### Scenario: Debounce rapid requests
- **WHEN** user triggers element selection within 500ms of a previous successful selection
- **THEN** the extension SHALL queue the request rather than firing immediately
- **AND** SHALL process queued requests sequentially with 500ms minimum interval

#### Scenario: Concurrent request prevention
- **WHEN** an API request is in-flight and user triggers another selection
- **THEN** the extension SHALL NOT fire a second concurrent request
- **AND** SHALL either queue or replace the pending request based on user action (multi-select queues, single-select replaces)

### Requirement: Streaming Response Support
The extension SHALL support streaming responses when enabled by the user.

#### Scenario: Streaming disabled by default
- **WHEN** user has not enabled streaming in settings
- **THEN** the extension SHALL send requests with `stream: false`
- **AND** SHALL wait for the complete response before rendering

#### Scenario: Enable streaming in settings
- **WHEN** user enables "Stream responses" in settings
- **THEN** the extension SHALL send requests with `stream: true`
- **AND** SHALL progressively update the result panel as tokens arrive

## MODIFIED Requirements

### Requirement: OpenRouter Request Format
The extension SHALL send requests in OpenAI-compatible chat completions format with system and user messages.

#### Scenario: Extension builds request body
- **WHEN** extension prepares API request
- **THEN** request body SHALL contain:
  - `model`: selected model name
  - `messages`: array with exactly two entries (system, user) as described in Structured Two-Part Messages
  - `max_tokens`: configured max tokens value
  - `temperature`: configured temperature value
  - `stream`: boolean (true if streaming enabled in settings)

### Requirement: Connection Test
The extension SHALL provide a connection test function for OpenRouter using minimal payload.

#### Scenario: User tests OpenRouter connection
- **WHEN** user clicks "Test Connection" button
- **THEN** extension SHALL send a test request to OpenRouter with a minimal prompt ("Say OK in one word")
- **AND** SHALL use max_tokens: 10 to minimize cost
- **AND** SHALL display success with model name and response snippet, or error with HTTP status and reason

### Requirement: OpenRouter Response Parsing
The extension SHALL parse OpenRouter responses in OpenAI-compatible format with streaming awareness.

#### Scenario: Parse non-streaming response
- **WHEN** OpenRouter returns a non-streaming response
- **THEN** extension SHALL extract content from `choices[0].message.content`

#### Scenario: Parse streaming response
- **WHEN** OpenRouter returns a streaming response
- **THEN** extension SHALL accumulate `choices[0].delta.content` from each chunk
- **AND** SHALL handle the terminating `[DONE]` signal
