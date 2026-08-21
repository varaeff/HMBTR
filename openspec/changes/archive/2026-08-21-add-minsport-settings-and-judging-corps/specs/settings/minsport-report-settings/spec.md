## Purpose

Stores organization metadata that tournament staff will later reuse in a Ministry of Sport report flow that is not part of this change.

## ADDED Requirements

### Requirement: Ministry of Sport report settings can be edited
The system SHALL provide a Settings tab named "Ministry of Sport Report" where authorized settings users can view and edit organization metadata.

#### Scenario: Settings tab shows organization fields
- **WHEN** an authorized settings user opens Settings
- **THEN** the system shows a "Ministry of Sport Report" tab
- **AND** the tab contains "Organization name" and "Organization address" fields

#### Scenario: Organization metadata is saved
- **WHEN** the user enters an organization name and organization address
- **AND** saves the Ministry of Sport report settings
- **THEN** the system stores both values
- **AND** the saved values are shown when Settings is opened again

### Requirement: Ministry of Sport fields support multiline text with a length limit
The system SHALL allow multiline text in each Ministry of Sport report setting field and SHALL enforce a maximum length of 2000 characters per field.

#### Scenario: Multiline values are accepted
- **WHEN** the user enters text with line breaks into either Ministry of Sport field
- **AND** the value is no longer than 2000 characters
- **THEN** the system allows the value to be saved with its line breaks preserved

#### Scenario: Overlong values are rejected
- **WHEN** the user attempts to save a Ministry of Sport field with more than 2000 characters
- **THEN** the system does not save that overlong value
- **AND** the user can correct the field

#### Scenario: Empty values are accepted
- **WHEN** the user clears one or both Ministry of Sport fields
- **AND** saves the Ministry of Sport report settings
- **THEN** the system stores the cleared value
