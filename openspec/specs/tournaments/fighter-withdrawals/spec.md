# tournaments/fighter-withdrawals Specification

## Purpose

Defines how tournament staff mark nomination fighters as no-shows or withdrawn
without removing them from already closed competition structures.

## Requirements

### Requirement: Closed nomination fighters can be marked as no-shows before block formation
The system SHALL allow an authorized tournament editor to mark a registered
fighter as a no-show after nomination registration is closed and before the
nomination has a competition block.

#### Scenario: No-show action appears after registration closes
- **WHEN** an authorized tournament editor views registered fighters for a nomination
- **AND** the nomination registration is closed
- **AND** no competition block exists for that nomination
- **THEN** the system shows a "No-show" action for each fighter
- **AND** the system does not show the open-registration "Remove" action

#### Scenario: No-show action is hidden while registration is open
- **WHEN** nomination registration is open
- **THEN** the system does not show the "No-show" action
- **AND** the system preserves the existing removable-registration behavior

#### Scenario: Direct no-show request is rejected when unsafe
- **WHEN** a user requests a no-show for a fighter
- **AND** the user lacks tournament edit access, registration is still open, the fighter is not registered in the nomination, or a competition block already exists
- **THEN** the system rejects the request

#### Scenario: No-show keeps fighter in future competition structure
- **WHEN** a fighter is marked as a no-show before block formation
- **AND** the tournament editor creates groups or a direct Olympic bracket
- **THEN** the fighter remains included in the generated groups or bracket
- **AND** the fighter is visibly marked as withdrawn from the nomination

#### Scenario: No-show uses default withdrawal reason
- **WHEN** a fighter is marked as a no-show before block formation
- **THEN** the system records the withdrawal reason as "РЅРµСЏРІРєР°"
- **AND** the system records the reason as unexcused

### Requirement: Fight-card withdrawal can be recorded with a reason
The system SHALL allow an authorized tournament editor to record that a fighter
withdrew from a fight block from the fighter context menu in fight cards.

#### Scenario: Withdrawal menu action opens a dialog
- **WHEN** an authorized tournament editor opens the context menu on a fighter surname in a fight card
- **AND** the fight results that would be affected are still editable
- **AND** the fighter is not already withdrawn in that nomination context
- **THEN** the system shows a "fighter withdrew" action
- **AND** selecting it opens a dialog with a "withdrawal reason" field, an "excused reason" checkbox, cancel and save actions, and a top close action

#### Scenario: Withdrawal requires a reason
- **WHEN** the tournament editor saves the withdrawal dialog without a withdrawal reason
- **THEN** the system does not record the withdrawal
- **AND** the system indicates that the reason is required

#### Scenario: Withdrawal reason and excused flag are stored
- **WHEN** the tournament editor enters a withdrawal reason
- **AND** chooses whether the reason is excused
- **AND** saves the dialog
- **THEN** the system records the fighter as withdrawn in that nomination context
- **AND** the withdrawal displays enough information for staff to distinguish excused and unexcused withdrawals

#### Scenario: Direct withdrawal request is rejected when unsafe
- **WHEN** a user requests fight-card withdrawal
- **AND** the user lacks tournament edit access, the fighter is not in the fight, the affected results are fixed, or the nomination is already finished
- **THEN** the system rejects the request

### Requirement: Withdrawn fighters receive technical losses and cannot advance
The system SHALL apply technical losses to withdrawn fighters using the same
technical score shape as red-card technical defeats and SHALL prevent withdrawn
fighters from advancing from a group.

#### Scenario: Pre-block no-show loses generated fights technically
- **WHEN** a fighter marked as a no-show is included in generated group fights or a direct Olympic bracket
- **THEN** the system marks every applicable fight involving that fighter as a technical loss for that fighter
- **AND** the score shape matches the red-card technical-defeat score for the nomination scoring mode

#### Scenario: Fight-card withdrawal loses selected and later fights technically
- **WHEN** a fighter is withdrawn from a fight card
- **THEN** the system marks that fight and all later applicable fights involving that fighter as technical losses for that fighter
- **AND** fights before the withdrawal point remain unchanged

#### Scenario: Future generated fights inherit withdrawal consequences
- **WHEN** a withdrawn fighter appears in a later generated fight before the withdrawal is canceled
- **THEN** the system marks that later fight as a technical loss for the withdrawn fighter

#### Scenario: Withdrawn group fighter cannot advance
- **WHEN** group results are used to select fighters for a later block
- **AND** a withdrawn fighter has enough points or tie-break results to qualify
- **THEN** the system excludes that fighter from advancement
- **AND** the fighter remains visible in the group standings

#### Scenario: Withdrawal technical losses are not ordinary match wins
- **WHEN** downstream ratings or statistics distinguish technical defeats from ordinary completed fights
- **THEN** the system treats withdrawal-generated technical losses as technical defeats
- **AND** the system does not count them as ordinary match wins for the opponent

### Requirement: Withdrawn fighters are marked in nomination displays
The system SHALL show a withdrawal marker next to the withdrawn fighter's name
where that fighter appears in the affected nomination's registration list,
groups, and fight cards.

#### Scenario: Withdrawal marker appears next to fighter name
- **WHEN** a fighter has an active withdrawal in a nomination
- **THEN** the system shows the Lucide `TriangleAlert` icon next to that fighter's name in that nomination's registration list, group displays, and fight cards
- **AND** the system does not show the withdrawal marker for the same fighter outside the affected nomination

#### Scenario: Withdrawal marker color reflects excuse status
- **WHEN** a withdrawn fighter's reason is excused
- **THEN** the withdrawal marker uses the base icon color
- **WHEN** a withdrawn fighter's reason is unexcused
- **THEN** the withdrawal marker uses red color

#### Scenario: Withdrawal marker tooltip includes reason
- **WHEN** a user hovers or focuses the withdrawal marker
- **THEN** the marker hint uses the text "Р±РѕРµС† СЃРЅСЏС‚: [reason]"
- **AND** "[reason]" is the stored withdrawal reason

### Requirement: Editable withdrawals can be canceled
The system SHALL allow an authorized tournament editor to cancel a withdrawal
while the affected competition results are not fixed.

#### Scenario: Cancel action appears for editable withdrawn fighter
- **WHEN** an authorized tournament editor opens the context menu on a withdrawn fighter in a fight card
- **AND** the affected competition results are not fixed
- **THEN** the system shows a "cancel withdrawal" action

#### Scenario: Canceling withdrawal clears generated technical losses
- **WHEN** the tournament editor cancels a withdrawal before results are fixed
- **THEN** the system removes the withdrawal marker
- **AND** the system resets technical-loss results generated by that withdrawal for editable fights
- **AND** fights that were not generated by that withdrawal remain unchanged

#### Scenario: Withdrawal cannot be canceled after results are fixed
- **WHEN** the affected competition results are fixed or the nomination is finished
- **THEN** the system does not show the "cancel withdrawal" action
- **AND** direct cancelation requests are rejected
