## Purpose

Define how tournament editors manage which nomination definitions are attached
to a specific tournament without changing the global nomination catalog.

## ADDED Requirements

### Requirement: Empty tournament nomination can be deleted
The system SHALL allow an authorized tournament editor to delete a nomination
from a tournament when that tournament nomination has no registered competitors
and the tournament has at least one other nomination.

#### Scenario: Delete action appears for an empty extra nomination
- **WHEN** an authorized tournament editor views a tournament nomination with no registered competitors
- **AND** the tournament has more than one nomination
- **THEN** the system shows a "Delete nomination" action in the participant list area

#### Scenario: Empty extra nomination is removed from the tournament
- **WHEN** an authorized tournament editor activates the delete nomination action
- **AND** the selected tournament nomination has no registered competitors
- **AND** the tournament has more than one nomination
- **THEN** the system removes that nomination from the current tournament
- **AND** the global nomination definition remains available outside that tournament

#### Scenario: Page remains on an existing nomination after deletion
- **WHEN** the currently selected tournament nomination is deleted
- **THEN** the removed nomination no longer appears as a tournament nomination tab
- **AND** the system selects an existing remaining tournament nomination

### Requirement: Tournament nomination deletion is blocked when unsafe
The system SHALL NOT allow deleting a tournament nomination that has registered
competitors, is the only nomination on the tournament, or is requested by a user
without tournament edit access.

#### Scenario: Nomination with registered competitors cannot be deleted
- **WHEN** a tournament nomination has at least one registered competitor
- **THEN** the system does not show the delete nomination action in place of the participant list
- **AND** direct deletion requests are rejected

#### Scenario: Only tournament nomination cannot be deleted
- **WHEN** a tournament has exactly one nomination
- **AND** that nomination has no registered competitors
- **THEN** the system does not show the delete nomination action
- **AND** direct deletion requests are rejected

#### Scenario: User without edit access cannot delete nomination
- **WHEN** a user without tournament edit access views an empty extra tournament nomination
- **THEN** the system does not show the delete nomination action
- **AND** direct deletion requests are rejected
