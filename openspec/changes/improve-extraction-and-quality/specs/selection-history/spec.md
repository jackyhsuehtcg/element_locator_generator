## ADDED Requirements

### Requirement: Selection History Persistence
The extension SHALL persist a history of element selections and their generated locators in `chrome.storage.local`.

#### Scenario: Save selection to history
- **WHEN** the extension successfully generates locators for a selected element
- **THEN** the extension SHALL append an entry containing `{ id, timestamp, url, elementPreview, locators, stabilityScore }` to history storage
- **AND** SHALL maintain FIFO order limited to the configured maximum (default 50 entries)
- **AND** SHALL evict the oldest entry when the limit is exceeded

#### Scenario: History survives page reload
- **WHEN** user reloads the page or reopens the browser
- **THEN** the history SHALL remain accessible from `chrome.storage.local`

### Requirement: History Retrieval and Display
The extension SHALL allow users to view past selections via a history panel.

#### Scenario: Open history panel from popup
- **WHEN** user clicks the "History" action in the popup
- **THEN** the extension SHALL display a list of historical entries sorted by timestamp descending
- **AND** each entry SHALL show URL, timestamp, element preview (tag + text snippet), and top stability score

#### Scenario: Restore historical result
- **WHEN** user clicks a history entry
- **THEN** the extension SHALL render the stored locators in the result panel with original validation status preserved

### Requirement: History Management
The extension SHALL allow users to clear history and adjust the retention limit.

#### Scenario: Clear all history
- **WHEN** user clicks "Clear History" in settings
- **THEN** the extension SHALL remove all history entries from storage
- **AND** SHALL display a confirmation notification

#### Scenario: Configure retention limit
- **WHEN** user sets a new retention limit in settings (between 10 and 500)
- **THEN** the extension SHALL apply the new limit and evict excess entries on next save
