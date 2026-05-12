## ADDED Requirements

### Requirement: Multi-Element Selection Mode
The extension SHALL provide a mode for selecting multiple elements before generating locators.

#### Scenario: Enter multi-select mode
- **WHEN** user activates multi-select mode from the popup or via Shift+click during regular selection
- **THEN** subsequent clicks SHALL add elements to a selection set instead of immediately generating locators
- **AND** the overlay SHALL display the current count of selected elements

#### Scenario: Visual marking of selected elements
- **WHEN** an element is added to the selection set
- **THEN** the extension SHALL apply a persistent visual marker (distinct from hover highlight) to that element
- **AND** SHALL remove the marker if the element is clicked again (toggle behavior)

#### Scenario: Finalize multi-selection
- **WHEN** user confirms multi-selection (via dedicated button or keyboard shortcut)
- **THEN** the extension SHALL send all selected elements to the LLM in a single request
- **AND** SHALL render the result panel with one locator block per element

### Requirement: Differential Locator Generation
The extension SHALL produce locators that distinguish between multiple selected elements in a common context.

#### Scenario: Generate locators for sibling buttons
- **WHEN** user selects multiple sibling elements (e.g. 3 buttons in a toolbar)
- **THEN** the extension SHALL produce distinct locators for each element that differ by text, position, or unique attributes
- **AND** SHALL avoid identical locators that would match all selections

### Requirement: Batch Mode Constraints
The extension SHALL enforce reasonable limits for multi-element mode.

#### Scenario: Maximum selection count
- **WHEN** user attempts to add more than 20 elements to the selection set
- **THEN** the extension SHALL prevent further additions
- **AND** SHALL display a warning indicating the limit
