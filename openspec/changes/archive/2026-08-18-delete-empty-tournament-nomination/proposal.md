## Why

Tournament organizers can add multiple nominations to a tournament, but there is
currently no tournament-page workflow to remove a nomination that was added by
mistake. Empty extra nominations should be removable without touching global
nomination definitions or any registered competitors.

## What Changes

- Add a tournament-page action that lets an authorized competition editor remove
  the currently selected tournament nomination when it has no registered
  competitors.
- Show the action in the empty participant area for the selected nomination,
  replacing the absent participant list.
- Keep deletion unavailable when the selected nomination has any registered
  competitor or when it is the tournament's only nomination.
- Enforce the same deletion constraints on the backend.
- After successful deletion, refresh the tournament nomination list and keep the
  page on a valid remaining nomination tab.

## Relevant project skills

- `backend-architecture`
- `frontend-architecture`
- `competition-flow`
- `minimal-validation`

## Capabilities

### New Capabilities

- `tournaments/nomination-membership`: Behavior for managing which nomination
  definitions are attached to a tournament.

### Modified Capabilities

- None.

## Impact

- Adds a protected tournament-nomination deletion API under the existing
  tournaments boundary.
- Extends the tournament nomination store/page orchestration so the frontend can
  request deletion and update local tournament state.
- Extends the tournament nomination tab empty state and translations for the new
  delete action.
- Adds focused backend and frontend coverage for the new eligibility and action
  behavior.
