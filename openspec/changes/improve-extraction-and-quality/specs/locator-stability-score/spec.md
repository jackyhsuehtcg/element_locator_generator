## ADDED Requirements

### Requirement: Stability Score Calculation
The extension SHALL compute a numeric stability score for each generated locator.

#### Scenario: Score based on locator features
- **WHEN** a locator is generated
- **THEN** the extension SHALL compute a score as a weighted sum of feature presence
- **AND** feature weights SHALL follow:
  - static id: 100
  - data-testid / data-test: 95
  - data-cy / data-automation: 90
  - aria-label: 80
  - role + name: 75
  - Playwright getByRole / getByLabel: 70
  - label/for relation: 65
  - placeholder: 55
  - title / alt: 50
  - unique short text: 45
  - static class: 30
  - dynamic class (hash pattern): 10
  - `:nth-*` or `[N]` index: -20
  - DOM path depth > 3 levels: -10 per level

#### Scenario: Dynamic class detection
- **WHEN** computing the class contribution to score
- **THEN** the extension SHALL detect dynamic class patterns including `sc-[a-z0-9]+`, `css-[a-z0-9]+`, `_ngcontent-*`, `data-v-*`, hash-like substrings
- **AND** SHALL score them as dynamic (weight 10) instead of static (weight 30)

### Requirement: Stability Tier Display
The extension SHALL translate numeric scores into visual tiers for display.

#### Scenario: Tier thresholds
- **WHEN** displaying a locator's stability
- **THEN** the extension SHALL map the score to a star tier:
  - 80+: ⭐⭐⭐⭐⭐ Excellent
  - 60-79: ⭐⭐⭐⭐ Stable
  - 40-59: ⭐⭐⭐ Moderate
  - 20-39: ⭐⭐ Fragile
  - <20: ⭐ Very fragile
- **AND** SHALL display the tier in the result panel alongside each locator

### Requirement: Score Tooltip
The extension SHALL explain the score via tooltip.

#### Scenario: Hover over stability score
- **WHEN** user hovers over the stability tier indicator
- **THEN** the extension SHALL display a tooltip showing the numeric score and contributing factors (e.g. "+95 data-testid, -20 nth-of-type")
