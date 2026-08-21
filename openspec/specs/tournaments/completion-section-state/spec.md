# Completion Section State Specification

## Purpose

Defines how tournament page collapsible sections react to nomination and tournament completion while preserving user-controlled section state.

## Requirements

### Requirement: Final nomination result fixation collapses nomination sections
The system SHALL collapse all collapsible sections that belong to a nomination when that nomination's final results are fixed.

#### Scenario: Nomination sections collapse after final results are fixed
- **WHEN** an authorized user fixes final results for a nomination
- **THEN** every collapsible section for that nomination is set to closed
- **AND** the user can manually reopen or close those sections afterward

#### Scenario: Collapsed nomination state is persisted
- **WHEN** final results are fixed for a nomination
- **THEN** the system saves the closed state for that nomination's collapsible sections
- **AND** reopening the tournament page shows those sections closed unless the user later manually changed their state

### Requirement: Completed tournament collapses tournament-level sections
The system SHALL collapse tournament-level "Disciplinary Cards" and "Judging Corps" sections when all tournament nominations are finished.

#### Scenario: Tournament-level sections collapse after all nominations finish
- **WHEN** the last unfinished nomination in a tournament has its final results fixed
- **THEN** the system sets the "Disciplinary Cards" section to closed
- **AND** the system sets the "Judging Corps" section to closed
- **AND** the user can manually reopen or close those sections afterward

#### Scenario: Tournament-level collapsed state is persisted
- **WHEN** all tournament nominations become finished
- **THEN** the system saves the closed state for "Disciplinary Cards" and "Judging Corps"
- **AND** reopening the tournament page shows those sections closed unless the user later manually changed their state

### Requirement: Finished tournaments and nominations default to collapsed sections
The system SHALL default completed tournament and nomination sections to closed when no user-specific saved section state exists.

#### Scenario: Finished nomination without saved state opens collapsed
- **WHEN** a user views a nomination whose final results were already fixed
- **AND** no saved state exists for a nomination collapsible section
- **THEN** that nomination section is closed by default

#### Scenario: Finished tournament without saved state opens collapsed
- **WHEN** a user views a tournament where all nominations are finished
- **AND** no saved state exists for "Disciplinary Cards" or "Judging Corps"
- **THEN** those tournament-level sections are closed by default

#### Scenario: Saved manual state overrides completed default
- **WHEN** a user manually opens or closes a completed nomination or tournament-level section
- **THEN** the user's saved manual state is used on later page views
