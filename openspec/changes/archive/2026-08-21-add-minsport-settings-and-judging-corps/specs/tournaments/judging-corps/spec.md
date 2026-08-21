## Purpose

Defines tournament-level judging staff management, including judges, chief judge selection, secretary entry, and prerequisites for closing nomination registration.

## ADDED Requirements

### Requirement: Judge management remains available while any nomination registration is open
The system SHALL allow authorized tournament staff to add, remove, and edit tournament judging staff while at least one nomination in the tournament has open registration.

#### Scenario: Add judges action is available with open nominations
- **WHEN** an authorized tournament staff user views a tournament
- **AND** at least one nomination registration is open
- **THEN** the system shows an "Add judges" action
- **AND** the action can be used to add judges to the tournament

#### Scenario: Add judges action is unavailable when all nominations are closed
- **WHEN** all nomination registrations in the tournament are closed
- **THEN** the system does not allow adding judges to the tournament

#### Scenario: Reopening a nomination reopens judge management
- **WHEN** a nomination registration is reopened
- **THEN** the system again allows authorized tournament staff to add, remove, and edit tournament judging staff

#### Scenario: Manual finish action is absent
- **WHEN** the user views tournament judge management
- **THEN** the system does not show a "Finish adding judges" action

### Requirement: Tournament judges are shown as a table with one chief judge
The system SHALL show registered tournament judges in a table and SHALL persist at most one chief judge assignment per tournament.

#### Scenario: Judge table shows required columns
- **WHEN** the tournament has registered judges
- **THEN** the system shows them in a table with "Full name", "Category", and "Chief judge" columns

#### Scenario: First added judge becomes chief judge
- **WHEN** the first judge is added to a tournament
- **THEN** the system marks that judge as chief judge
- **AND** the chief-judge value is stored

#### Scenario: Later added judges are not chief by default
- **WHEN** a tournament already has a judge
- **AND** another judge is added
- **THEN** the newly added judge is not marked as chief judge by default

#### Scenario: Selecting a chief judge clears the previous one
- **WHEN** judge management is editable
- **AND** the user marks one judge as chief judge
- **THEN** the system marks that judge as chief judge
- **AND** all other judges in the tournament are no longer marked as chief judge
- **AND** the new chief-judge value is stored

#### Scenario: Deleted chief judge is not replaced automatically
- **WHEN** the current chief judge is removed from the tournament
- **THEN** the system does not automatically mark another judge as chief judge
- **AND** the tournament remains without a chief judge until the user selects one

#### Scenario: Chief judge is read-only after all registrations close
- **WHEN** all nomination registrations in the tournament are closed
- **THEN** the system shows the saved chief-judge value
- **AND** the user cannot edit the chief-judge checkbox

#### Scenario: Existing tournament judges receive an initial chief judge
- **WHEN** a tournament already has registered judges from before chief-judge tracking existed
- **AND** no judge is marked as chief judge
- **THEN** the system marks the earliest registered judge in that tournament as chief judge
- **AND** no other judge in that tournament is marked as chief judge

### Requirement: Tournament secretary is editable with judging staff
The system SHALL store one tournament secretary name as free text and edit it under the judging staff area while judging staff are editable.

#### Scenario: Secretary section appears under judges
- **WHEN** the user views the tournament judging staff area
- **THEN** the system shows a "Tournament secretary" section below the tournament judges list
- **AND** the section contains one centered text input for the secretary full name

#### Scenario: Secretary name is saved
- **WHEN** the user enters a tournament secretary name
- **AND** saves or leaves the secretary field according to the tournament page save behavior
- **THEN** the system stores the secretary name as text
- **AND** the saved value is shown when the tournament is opened again

#### Scenario: Secretary is editable while any registration is open
- **WHEN** at least one nomination registration in the tournament is open
- **THEN** authorized tournament staff can edit the tournament secretary field

#### Scenario: Secretary is read-only when all registrations are closed
- **WHEN** all nomination registrations in the tournament are closed
- **THEN** the system shows the saved tournament secretary name
- **AND** authorized tournament staff cannot edit the secretary field

### Requirement: Closing nomination registration requires a complete judging corps
The system SHALL prevent closing nomination registration until the tournament has at least one judge, exactly one chief judge, and a non-empty tournament secretary name.

#### Scenario: Close registration is blocked without judges
- **WHEN** a nomination registration is open
- **AND** the tournament has no registered judges
- **THEN** the close-registration action is disabled with a hint to add judges
- **AND** a direct close-registration request is rejected

#### Scenario: Close registration is blocked without chief judge
- **WHEN** a nomination registration is open
- **AND** the tournament has registered judges
- **AND** no judge is marked as chief judge
- **THEN** the close-registration action is disabled with a hint to select a chief judge
- **AND** a direct close-registration request is rejected

#### Scenario: Close registration is blocked without secretary
- **WHEN** a nomination registration is open
- **AND** the tournament has at least one registered judge
- **AND** exactly one judge is marked as chief judge
- **AND** the tournament secretary field is empty or contains only whitespace
- **THEN** the close-registration action is disabled with a hint to enter the tournament secretary
- **AND** a direct close-registration request is rejected

#### Scenario: Close registration is allowed with complete judging corps
- **WHEN** a nomination registration is open
- **AND** the tournament has at least one registered judge
- **AND** exactly one judge is marked as chief judge
- **AND** the tournament secretary field has non-whitespace text
- **THEN** the system allows the nomination registration to be closed

### Requirement: Judging corps is grouped under a collapsible section
The system SHALL group tournament judges and the tournament secretary inside a single "Judging Corps" collapsible section.

#### Scenario: Judging corps contains judges and secretary
- **WHEN** the user views tournament judging staff
- **THEN** the "Judging Corps" section contains the tournament judges list and the tournament secretary field
