# Project Context

## Purpose
Chrome Extension for generating stable web element locators using local or cloud LLM. Supports Playwright, CSS, XPath, and Selenium with iframe support and real-time validation/copy functionality. Designed for QA automation testing engineers.

Key features:
- Smart element selection: Click any element to automatically collect tag, attribute, text, and hierarchy info
- AI-powered locator generation: Generate 4 types of locators via configurable LLM providers
  - Playwright semantic locators (`getByRole`, `getByLabel`, `getByText`, etc.)
  - CSS selectors
  - XPath expressions
  - Selenium examples
- Results panel with one-click copy
- Iframe support with iframe locator hints
- Local validation for CSS/XPath uniqueness

## Tech Stack
- **Platform**: Chrome Extension (Manifest V3)
- **Language**: JavaScript (ES6+)
- **Styling**: CSS3 (animations, backdrop-filter, responsive design)
- **UI**: HTML5
- **LLM Provider**: OpenRouter (unified API gateway, 100+ models)
- **Storage**: Chrome Storage API (chrome.storage.sync)
- **Communication**: Chrome Runtime Messaging, window.postMessage (for iframe cross-frame communication)

## Project Conventions

### Code Style
- **Architecture**: ES6 Class-based components
- **Comments**: Traditional Chinese throughout codebase
- **Naming**: 
  - CamelCase for methods (e.g., `startElementSelection`, `validateCSS`)
  - Descriptive names in Traditional Chinese comments
  - Console logging uses `console.debug` for debug, `console.error` for errors
- **Pattern**: Async/await for all async operations
- **No semicolons** in JavaScript files
- **Error handling**: Try-catch blocks with descriptive error messages

### Architecture Patterns
- **Content Script** (`Extension/content.js`): Element selection, DOM traversal, data extraction, UI rendering
- **Background Script** (`Extension/background.js` + `Extension/background/*.js`): LLM API communication, prompt building, response parsing
- **Options Page** (`Extension/options.js`): Settings management with provider-specific configurations
- **Shared Lib** (`Extension/lib/`): Modular utilities (generator, validator, extractor, ui, controller, storage, i18n)
- **Communication Flow**:
  - Extension icon click → Background script injects content script → User clicks element → Content script collects data → Background script calls LLM → Results displayed in content script panel
  - Cross-frame communication via `window.postMessage` for iframe support

### Testing Strategy
- Manual testing via browser DevTools
- Connection test functionality built into options page
- No formal test framework implemented

### Git Workflow
- Standard feature branch workflow (implied)
- Conventional commits (not strictly enforced)
- No CI/CD pipeline configured

## Domain Context
- **QA Automation Testing**: Locators are used to identify web elements for automated testing
- **Testing Frameworks**: Playwright, Selenium, Cypress compatible outputs
- **Element Identification**: Semantic locators preferred over fragile selectors
- **LLM Prompt Engineering**: System prompts guide AI to generate stable, maintainable locators

## Important Constraints
- Chrome/Edge system pages (`chrome://`, `edge://`, `chrome-extension://`) cannot use extension
- Some sites' CSP may restrict content script or style injection
- `host_permissions` in manifest.json must include LLM API domains
- API keys stored locally in chrome.storage.sync, never uploaded

## External Dependencies
- **LLM API**: OpenRouter (https://openrouter.ai) - unified gateway to 100+ models
- **Browser**: Chrome/Edge browser with extension support
- **No external npm packages** - pure vanilla JavaScript implementation
