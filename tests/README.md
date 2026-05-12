# Tests

Unit tests for pure logic modules. Run with `npm test`.

## Coverage

| Module | Tests |
|---|---|
| `lib/extractor/ElementExtractor.js` | className SVG, labels lookup, aria attributes |
| `lib/generator/LocalLocatorGenerator.js` | XPath, CSS nth-of-type, dynamic class filtering |
| `lib/validator/LocatorValidator.js` | smart indexing, existing index detection |
| `lib/extractor/SensitiveDataFilter.js` | email/card/jwt/uuid patterns, field blacklist |
| `lib/validator/StabilityScorer.js` | feature weights, tier thresholds |

## Not covered by unit tests

- UI modules (ResultPanel, SelectionOverlay, etc.) — covered by manual testing
- Chrome API integration (background.js) — requires extension environment
