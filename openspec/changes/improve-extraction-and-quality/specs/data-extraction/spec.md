## ADDED Requirements

### Requirement: Label Association Lookup
The extension SHALL look up `<label for="...">` elements that reference the target element.

#### Scenario: Extract associated labels
- **WHEN** the target element has an `id` attribute
- **THEN** the extension SHALL query `document.querySelectorAll('label[for="<id>"]')` and record the labels' text content in a `labels` array field
- **AND** SHALL also check for ancestor `<label>` elements (implicit labeling) and include their text

### Requirement: Complete ARIA Attribute Capture
The extension SHALL capture all ARIA attributes on the target element, not just a fixed subset.

#### Scenario: Capture all aria-* attributes
- **WHEN** extracting attributes
- **THEN** the extension SHALL include every attribute whose name starts with `aria-` in the `ariaAttributes` field
- **AND** SHALL include `role` alongside them

### Requirement: Neighbor Context Summary
The extension SHALL capture a summary of same-tag neighbors within the parent element.

#### Scenario: Extract neighbor summary
- **WHEN** extracting element data
- **THEN** the extension SHALL produce a `neighborContext` object containing:
  - `sameTagCount`: number of same-tag siblings (including target)
  - `targetIndexAmongSameTag`: target's 0-based index among same-tag siblings
  - `neighbors`: array of up to 5 neighbor summaries each containing `{ index, text (first 30 chars), distinguishingAttrs }`

### Requirement: Frame and Shadow Path
The extension SHALL record the path of frames and shadow roots containing the element.

#### Scenario: Extract frame path
- **WHEN** target element is inside iframe(s) and/or shadow root(s)
- **THEN** the extension SHALL produce a `framePath` array where each entry is either `{ type: 'iframe', selector, index }` or `{ type: 'shadow', hostSelector, index }`
- **AND** the array SHALL be ordered from outermost to innermost

## MODIFIED Requirements

### Requirement: DOM Data Extraction
The extension SHALL extract comprehensive, type-safe data from the selected element for AI locator generation.

#### Scenario: Extract element data on click
- **WHEN** user clicks an element during selection mode
- **THEN** the extension SHALL extract the element's tag name, id, className (coerced to string for SVG elements), name, textContent, innerText, placeholder, value
- **AND** SHALL extract all ARIA attributes (see Complete ARIA Attribute Capture)
- **AND** SHALL extract relevant attributes (role, data-testid, data-test, data-cy, data-automation, href, src, alt, title, for, type)
- **AND** SHALL extract position info (x, y, width, height)
- **AND** SHALL extract parent element info (tag name, className as string, id)
- **AND** SHALL extract sibling element info (total count, index, same-tag count)
- **AND** SHALL extract neighborContext (see Neighbor Context Summary)
- **AND** SHALL extract labels (see Label Association Lookup)
- **AND** SHALL extract framePath (see Frame and Shadow Path)
- **AND** SHALL extract child element count
- **AND** SHALL generate XPath and CSS selector for the element via the local generator
- **AND** SHALL record page URL, title, and timestamp

### Requirement: Relevant Attributes Filtering
The extension SHALL filter element attributes to separate relevant attributes from full attribute dump.

#### Scenario: Filter attributes
- **WHEN** extracting element attributes
- **THEN** the `attributes` field SHALL contain: type, role, data-testid, data-test, data-cy, data-automation, href, src, alt, title, for
- **AND** all `aria-*` attributes SHALL be captured separately in the `ariaAttributes` field
- **AND** attributes SHALL have non-null values to be included

### Requirement: Text Content Extraction
The extension SHALL prioritize visible text over raw textContent for LLM context.

#### Scenario: Prefer innerText for visible text
- **WHEN** extracting the element's text
- **THEN** the `text` field SHALL come from `innerText.trim().substring(0, 100)` (visible text)
- **AND** the `textContentRaw` field SHALL contain `textContent.trim().substring(0, 200)` as fallback context

#### Scenario: Handle elements with no visible text
- **WHEN** the element has no innerText but has `aria-label`, `placeholder`, `title`, or `value`
- **THEN** the extension SHALL use the first available of: aria-label > placeholder > title > value as `text`
