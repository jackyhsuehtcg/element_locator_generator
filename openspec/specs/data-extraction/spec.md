## Purpose
Define how the extension extracts DOM data from selected elements, including attribute filtering, XPath/CSS generation, and sibling analysis.

## Requirements
### Requirement: DOM Data Extraction
The extension SHALL extract comprehensive data from the selected element for AI locator generation.

#### Scenario: Extract element data on click
- **WHEN** user clicks an element during selection mode
- **THEN** the extension SHALL extract the element's tag name, id, className, name, text content, placeholder, value
- **AND** SHALL extract relevant attributes (role, aria-*, data-testid, href, src, alt, title, for)
- **AND** SHALL extract position info (x, y, width, height)
- **AND** SHALL extract parent element info (tag name, className, id)
- **AND** SHALL extract sibling element info (total count, index, same-tag count)
- **AND** SHALL extract child element count
- **AND** SHALL generate XPath and CSS selector for the element
- **AND** SHALL record page URL, title, and timestamp

### Requirement: XPath Generation
The extension SHALL generate XPath expressions for selected elements.

#### Scenario: Generate XPath with element id
- **WHEN** the selected element has an id attribute
- **THEN** the XPath SHALL use the id-based format: `//*[@id="element-id"]`

#### Scenario: Generate XPath without element id
- **WHEN** the selected element has no id attribute
- **THEN** the XPath SHALL traverse the DOM tree with tag names and positional indices
- **AND** SHALL include index notation when multiple siblings share the same tag

### Requirement: CSS Selector Generation
The extension SHALL generate CSS selectors for selected elements.

#### Scenario: Generate CSS selector with element id
- **WHEN** the selected element has an id attribute
- **THEN** the CSS selector SHALL use the id format: `#element-id`

#### Scenario: Generate CSS selector without element id
- **WHEN** the selected element has no id attribute
- **THEN** the CSS selector SHALL use class names and nth-child pseudo-classes
- **AND** SHALL limit traversal depth to 5 levels

### Requirement: Relevant Attributes Filtering
The extension SHALL filter element attributes to only include those relevant for locator generation.

#### Scenario: Filter attributes
- **WHEN** extracting element attributes
- **THEN** the extension SHALL only include: type, role, aria-label, aria-labelledby, aria-describedby, data-testid, data-test, data-cy, data-automation, href, src, alt, title, for
