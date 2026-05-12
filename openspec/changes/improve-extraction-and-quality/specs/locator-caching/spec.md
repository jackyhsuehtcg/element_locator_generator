## ADDED Requirements

### Requirement: Element Fingerprint Cache Key
The extension SHALL cache LLM-generated locators keyed by element fingerprint.

#### Scenario: Compute fingerprint
- **WHEN** preparing to call the LLM for a selected element
- **THEN** the extension SHALL compute a cache key from: `tagName + id + className(static only) + textContent(first 50 chars) + pageOrigin + hourBucket`
- **AND** the hour bucket SHALL be `Math.floor(Date.now() / 3600000)` to invalidate stale cache every hour

### Requirement: Cache Lookup Before API Call
The extension SHALL check the cache before initiating an API request.

#### Scenario: Cache hit
- **WHEN** a computed fingerprint exists in cache
- **THEN** the extension SHALL return the cached locators without calling the API
- **AND** SHALL re-run validation against the current DOM (since DOM may have changed)
- **AND** SHALL display a subtle "from cache" indicator in the result panel

#### Scenario: Cache miss
- **WHEN** the computed fingerprint does not exist in cache
- **THEN** the extension SHALL proceed with the normal API call
- **AND** SHALL store the result under the fingerprint after successful response

### Requirement: Cache Storage
The extension SHALL store cache entries in `chrome.storage.session` (cleared on browser restart).

#### Scenario: Session storage used
- **WHEN** caching a locator result
- **THEN** the extension SHALL use `chrome.storage.session.set`
- **AND** SHALL NOT persist to sync or local storage

### Requirement: Cache Size Limit
The extension SHALL limit cache size to prevent memory bloat.

#### Scenario: Evict oldest on overflow
- **WHEN** cache size exceeds 100 entries
- **THEN** the extension SHALL evict the oldest entry (by insertion timestamp)

### Requirement: Cache Disable Option
The extension SHALL allow users to disable caching.

#### Scenario: User disables cache
- **WHEN** user toggles off "Enable Locator Cache" in settings
- **THEN** the extension SHALL skip cache lookup and never write to cache
