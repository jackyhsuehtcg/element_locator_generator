## Context
The extension currently supports 5 different LLM providers (LM Studio, Ollama, OpenAI, Gemini, Anthropic), each with their own API format, authentication, and response parsing logic. This creates code duplication and maintenance overhead. The goal is to simplify by using OpenRouter as a unified gateway.

## Goals / Non-Goals
- Goals:
  - Single LLM integration point (OpenRouter)
  - Access to 100+ models through one API
  - Simplified code with one API format
  - User-friendly model selection (presets + custom)
- Non-Goals:
  - Support for other aggregators (Anthropic, etc.) in the future
  - Local LLM support (this would require a separate extension)
  - Complex model filtering/ranking logic

## Decisions
- **API Endpoint**: Fixed to `https://openrouter.ai/api/v1`
  - Rationale: OpenRouter's standard OpenAI-compatible endpoint
  - Alternative considered: Allow custom endpoint (added unnecessary complexity)
- **Model Selection**: Preset dropdown + custom input field
  - Rationale: Balances convenience with flexibility for advanced users
  - Preset models: google/gemini-2.5-flash, anthropic/claude-3-7-sonnet-20250219, openai/gpt-4o
- **Authentication**: Bearer token in Authorization header
  - Rationale: Matches OpenRouter's standard OpenAI-compatible format
- **Request/Response Format**: OpenAI-compatible chat completions
  - Rationale: OpenRouter uses standard OpenAI API format, simplifying parsing

## Risks / Trade-offs
- **Risk**: OpenRouter service outage → Mitigation: Users cannot switch to alternatives
- **Risk**: Model pricing varies → Mitigation: Users can choose models based on their needs
- **Trade-off**: Lost local LLM support → Acceptable since local setup is complex for average users

## Migration Plan
1. Update manifest.json with new host_permissions
2. Update options.js with OpenRouter-specific settings
3. Update background.js with simplified OpenRouter-only API calls
4. Update options.html UI
5. Test connection to OpenRouter API
6. Verify locator generation works with new provider

## Open Questions
- Should we include site URL restriction (referer) for OpenRouter? (OpenRouter recommends it for tracking)
