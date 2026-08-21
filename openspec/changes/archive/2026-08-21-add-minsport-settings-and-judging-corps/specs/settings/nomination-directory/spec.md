## Purpose

Defines how settings users maintain the global nomination catalog fields and how the nomination directory remains usable as more columns are added.

## ADDED Requirements

### Requirement: Nomination directory stores weapon text
The system SHALL support an optional weapon value for each nomination in the global nomination directory.

#### Scenario: Existing nomination weapon is edited
- **WHEN** an authorized settings user edits an existing nomination
- **THEN** the system provides a "Weapon" input after the "Name EN" input
- **AND** saving the nomination stores the weapon value

#### Scenario: New nomination can be created without a weapon
- **WHEN** an authorized settings user creates a nomination without entering a weapon
- **THEN** the system creates the nomination successfully
- **AND** the nomination shows an empty weapon value

#### Scenario: Weapon value is shown after reload
- **WHEN** a nomination has a saved weapon value
- **AND** the user opens the nomination directory again
- **THEN** the system shows the saved weapon value in that nomination's row

### Requirement: Nomination directory layout accommodates the weapon column
The system SHALL lay out the nomination directory so the additional weapon column fits the table without unnecessary horizontal scrolling in normal desktop settings-page use.

#### Scenario: Weapon column appears in table order
- **WHEN** the user opens the nomination directory
- **THEN** the table shows columns in this order: "Name RU", "Name EN", "Weapon", then the existing remaining columns

#### Scenario: Compact columns use only necessary horizontal space
- **WHEN** the user views the nomination directory
- **THEN** the "Gender", "Rounds", "Win by rounds", and "Actions" columns use compact controls or widths appropriate to their content
- **AND** text-entry columns receive the remaining table width

#### Scenario: Narrow screens remain usable
- **WHEN** the nomination directory is viewed on a narrow screen
- **THEN** the user can still reach and use every nomination field and action
