# Change: Migrate LLM Provider to OpenRouter Only

## Why
Simplify the LLM provider architecture by consolidating to a single, unified API gateway (OpenRouter). This reduces code complexity, maintenance burden, and provides users access to multiple models through one credential.

## What Changes
- **REMOVED**: All LLM providers (LM Studio, Ollama, OpenAI, Gemini, Anthropic)
- **ADDED**: OpenRouter as the sole LLM provider
- **ADDED**: API Key setting (required, stored in chrome.storage.sync)
- **ADDED**: Model selection with preset popular models and custom input option
- **ADDED**: Fixed OpenRouter API endpoint (https://openrouter.ai/api/v1)
- **MODIFIED**: Options page UI to reflect single provider
- **MODIFIED**: Background script to use OpenRouter API format
- **MODIFIED**: manifest.json host_permissions to include OpenRouter domain

## Impact
- Affected specs: `llm-provider`
- Affected code:
  - `options.js` - Remove provider dropdown, add OpenRouter-specific settings
  - `background.js` - Remove provider switch cases, implement OpenRouter-only API calls
  - `manifest.json` - Update host_permissions
  - `options.html` - UI changes for new settings
