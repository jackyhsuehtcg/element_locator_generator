## Purpose
Define the persistent mode feature that allows continuous element selection across multiple clicks without re-activating the extension.

## Requirements
### Requirement: Persistent Mode
The extension SHALL provide a persistent mode that allows continuous element selection without re-activating.

#### Scenario: Enable persistent mode
- **WHEN** user enables persistent mode from the popup
- **THEN** the extension SHALL save `persistentModeEnabled: true` to storage
- **AND** SHALL activate element selection mode on all tabs

#### Scenario: Disable persistent mode
- **WHEN** user disables persistent mode from the popup
- **THEN** the extension SHALL save `persistentModeEnabled: false` to storage
- **AND** SHALL deactivate element selection mode

#### Scenario: Persistent mode status check
- **WHEN** the popup opens
- **THEN** the extension SHALL check `persistentModeEnabled` from storage
- **AND** SHALL display the appropriate enable/disable button
