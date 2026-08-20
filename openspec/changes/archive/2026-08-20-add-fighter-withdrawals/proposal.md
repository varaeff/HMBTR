## Why

Tournament staff need a way to keep an absent or withdrawn fighter in the
already closed nomination structure while making the competition outcome
deterministic. Today the "Remove" action disappears after registration closes,
but there is no equivalent workflow for a no-show before group or Olympic
formation, or for a fighter who withdraws after fights are created.

## What Changes

- Add a "No-show" action for each registered fighter after nomination
  registration is closed and before any competition block is formed.
- Mark that fighter as withdrawn from the nomination with an unexcused reason,
  while still keeping them in group distribution or direct Olympic bracket
  creation.
- Add a fighter context-menu action in fight cards for "fighter withdrew".
- Open a withdrawal dialog with a required reason field, an "excused reason"
  checkbox, cancel/save actions, and a close button matching the card-issuance
  dialog pattern.
- On save, make the fighter lose the selected fight and all later applicable
  fights by the same technical score shape used for red-card technical defeats.
- Prevent withdrawn fighters from advancing out of a group even when their
  points would otherwise qualify.
- Show a withdrawal marker next to the fighter name in this nomination's
  registration list, groups, and fight cards, using the Lucide `TriangleAlert`
  icon with color and tooltip derived from the withdrawal reason.
- While the affected block results are not fixed, expose "cancel withdrawal" in
  the fighter context menu and reset the generated technical losses.
- Preserve existing remove-registration behavior while registration is still
  open.

Non-goals:

- Do not make withdrawal a disciplinary card or change the yellow/red card
  lifecycle.
- Do not remove withdrawn fighters from closed nominations, groups, standings,
  or brackets.
- Do not change the red-card rules themselves except by extracting/reusing the
  shared technical-defeat behavior needed by withdrawals.

Assumption:

- The "excused reason" checkbox is metadata for the withdrawal record and
  reporting/audit display; both excused and unexcused withdrawals still cause
  technical defeats and block advancement as described.

## Relevant project skills

- `competition-flow`
- `disciplinary-cards`
- `backend-architecture`
- `frontend-architecture`
- `minimal-validation`

## Capabilities

### New Capabilities

- `tournaments/fighter-withdrawals`: Handles nomination-scoped fighter
  withdrawal/no-show actions, their technical-loss consequences, cancelation,
  and advancement eligibility.

### Modified Capabilities

- None.

## Impact

- Backend: new persisted withdrawal state, authorization/DTO/API endpoints,
  competition-side consequence application, reset behavior, group advancement
  eligibility, and response mapping.
- Frontend: closed-registration participant-list action, fight-card context menu
  actions, withdrawal modal, withdrawal marker presentation, Pinia/API command
  wiring, state refresh, and i18n labels.
- Shared behavior: technical-defeat score shape should remain consistent with
  red-card forfeits for both aggregate-score and round-win nominations.
- Validation: focused backend tests for withdrawal persistence, forfeits,
  ranking exclusion, reset behavior, and frontend tests for action visibility
  and dialog/menu flows.
