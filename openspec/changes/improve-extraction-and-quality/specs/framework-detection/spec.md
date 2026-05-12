## ADDED Requirements

### Requirement: Frontend Framework Detection
The extension SHALL detect common frontend frameworks used on the current page.

#### Scenario: Detect React
- **WHEN** the page contains `__REACT_DEVTOOLS_GLOBAL_HOOK__`, `React` in global scope, or elements with `data-reactroot` / `data-reactid` attributes
- **THEN** the extension SHALL mark the framework as "react"

#### Scenario: Detect Vue
- **WHEN** the page contains `__VUE__`, `Vue` in global scope, or elements with `data-v-*` attributes
- **THEN** the extension SHALL mark the framework as "vue"

#### Scenario: Detect Angular
- **WHEN** the page contains `ng-version` attribute on root element or elements with `_ngcontent-*` / `_nghost-*` attributes
- **THEN** the extension SHALL mark the framework as "angular"

#### Scenario: Detect Svelte
- **WHEN** the page contains elements with class names matching `svelte-[a-z0-9]+`
- **THEN** the extension SHALL mark the framework as "svelte"

#### Scenario: Detect Stencil / LWC
- **WHEN** the page contains elements with `scoped` attribute pattern or LWC-style tag names
- **THEN** the extension SHALL mark the framework as "stencil" or "lwc" respectively

#### Scenario: No framework detected
- **WHEN** no known framework signals are found
- **THEN** the extension SHALL mark the framework as "unknown"

### Requirement: Framework-Aware Locator Generation
The extension SHALL adjust locator strategies based on detected framework.

#### Scenario: Skip dynamic classes for detected framework
- **WHEN** framework is detected as Vue/Angular/Svelte/React with Tailwind
- **THEN** the local locator generator SHALL skip framework-specific dynamic class patterns (`data-v-*`, `_ngcontent-*`, `svelte-*`, `sc-*`, `css-*`)
- **AND** SHALL prefer semantic attributes / text over framework-generated class names

### Requirement: Framework Info in Prompt
The extension SHALL include detected framework in the LLM prompt context.

#### Scenario: Inform LLM of framework
- **WHEN** building the LLM prompt
- **THEN** the prompt SHALL include a `framework` field with the detected framework name
- **AND** the system prompt SHALL instruct the LLM to avoid framework-generated attributes when stable alternatives exist
