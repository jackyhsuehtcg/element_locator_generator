## 1. Manifest Updates
- [x] 1.1 Update manifest.json host_permissions to include `https://openrouter.ai/*`
- [x] 1.2 Update manifest.json description to reflect OpenRouter-only support

## 2. Options Page Updates
- [x] 2.1 Remove provider dropdown from options.html
- [x] 2.2 Add OpenRouter API Key input field (required)
- [x] 2.3 Add model selection with preset dropdown and custom input option
- [x] 2.4 Add preset model list (google/gemini-2.5-flash, anthropic/claude-3-7-sonnet-20250219, openai/gpt-4o, etc.)
- [x] 2.5 Update options.css for new layout

## 3. Options Manager Updates
- [x] 3.1 Remove providers configuration object from options.js
- [x] 3.2 Add OpenRouter-specific default settings
- [x] 3.3 Remove updateProviderFields method (no longer needed)
- [x] 3.4 Update buildRequestBody for OpenRouter format
- [x] 3.5 Update setAuthHeaders for OpenRouter Bearer token
- [x] 3.6 Update testConnection for OpenRouter endpoint
- [x] 3.7 Update saveSettings for new setting structure

## 4. Background Script Updates
- [x] 4.1 Remove providers configuration from background.js
- [x] 4.2 Simplify buildRequestBody for OpenRouter-only
- [x] 4.3 Simplify setAuthHeaders for OpenRouter Bearer token
- [x] 4.4 Simplify parseResponse for OpenAI-compatible format
- [x] 4.5 Update handleGenerateLocators to use new structure

## 5. Validation & Testing
- [x] 5.1 Test connection to OpenRouter API with valid credentials
- [x] 5.2 Test locator generation with different models
- [x] 5.3 Verify error handling for invalid API key
- [x] 5.4 Verify error handling for network failures
- [x] 5.5 Test with preset models
- [x] 5.6 Test with custom model input

## 6. Documentation
- [x] 6.1 Update README.md with OpenRouter setup instructions
- [x] 6.2 Update installation_guide.md if needed
- [x] 6.3 Update openspec/project.md to reflect new tech stack
