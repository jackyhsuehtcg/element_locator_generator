## ADDED Requirements

### Requirement: Chrome i18n Integration
The extension SHALL use Chrome's built-in `chrome.i18n` API for all user-facing strings.

#### Scenario: Use _locales directory
- **WHEN** providing user-facing strings
- **THEN** strings SHALL be defined in `_locales/<locale>/messages.json`
- **AND** code SHALL access them via `chrome.i18n.getMessage(key, substitutions)`

#### Scenario: Default locale
- **WHEN** `manifest.json` specifies `"default_locale": "zh_TW"`
- **THEN** Traditional Chinese SHALL be the fallback when no matching locale is available

### Requirement: Supported Locales
The extension SHALL support Traditional Chinese and English as initial locales.

#### Scenario: zh_TW locale
- **WHEN** user's browser locale is `zh-TW` or `zh-HK`
- **THEN** the extension SHALL display all UI strings in Traditional Chinese

#### Scenario: English locale
- **WHEN** user's browser locale is `en-*` (any English variant)
- **THEN** the extension SHALL display all UI strings in English

#### Scenario: Unsupported locale fallback
- **WHEN** user's browser locale is not supported
- **THEN** the extension SHALL fall back to `zh_TW` as the default locale

### Requirement: String Coverage
All user-facing strings SHALL be externalized to locale files.

#### Scenario: UI panel strings
- **WHEN** rendering overlay hints, result panels, error panels, loading indicators, buttons, labels, tooltips
- **THEN** every string SHALL be sourced from `chrome.i18n.getMessage`
- **AND** no hardcoded user-facing Chinese or English strings SHALL remain in JavaScript files

#### Scenario: Validation status messages
- **WHEN** displaying locator validation results (唯一匹配 / 無匹配元素 / 已加索引)
- **THEN** these messages SHALL be externalized to locale files

#### Scenario: Settings page strings
- **WHEN** rendering the options page
- **THEN** all labels, hints, placeholders, button texts, and help content SHALL use i18n
