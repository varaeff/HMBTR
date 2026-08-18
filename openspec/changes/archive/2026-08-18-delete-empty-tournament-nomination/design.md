## Context

Tournament nominations are stored as tournament-local memberships in
`tournament_nominations`. They link a tournament to a global nomination
definition; deleting a tournament nomination for this change must delete only
that membership row, not the global nomination record.

The current backend follows the tournaments boundary:

- `TournamentsController` exposes nomination membership endpoints under
  `API_ROUTES.TOURNAMENTS.NOMINATION`.
- `TournamentsService` acts as the facade.
- `TournamentNominationService` owns the add/update nomination membership logic.

The current frontend follows the tournament page orchestration pattern:

- `useTournamentPage` derives `tournamentNominations.all/open` and keeps the
  active nomination tab in sync with route query state.
- `TournamentCompetitionWorkspace` adapts page state/actions into tournament
  widgets.
- `TournamentNominationTabs` renders the selected nomination workspace.
- `NominationCompetitors` renders the registered participant list and competitor
  actions.
- `tournamentsListStore` owns tournament API calls and local tournament state
  updates.

Relevant project skills used for this design:

- `backend-architecture`
- `frontend-architecture`
- `competition-flow`
- `minimal-validation`

## Goals

- Allow authorized tournament editors to remove an empty extra nomination from a
  tournament.
- Keep deletion distinct from global nomination deletion.
- Reuse the current tournaments service/store/widget structure.
- Keep the page on a valid remaining nomination after deletion.
- Cover backend constraints and frontend empty-state behavior with focused tests.

## Non-Goals

- Do not delete or modify global nomination definitions.
- Do not support deleting a nomination that already has registered competitors.
- Do not support deleting the last remaining tournament nomination.
- Do not redesign tournament nomination tabs or participant management.
- Do not introduce a new authorization architecture.

## Decisions

### Backend deletion belongs to the tournament nomination service

Add a deletion method to `TournamentNominationService` and expose it through the
existing `TournamentsService` facade. This keeps nomination membership behavior
in the same place as `addNomination`, `updateNomination`, and
`updateNominationStage`.

The method should:

- resolve the membership by `(tournament_id, nomination_id)`;
- reject missing memberships with `NotFoundException`;
- count tournament nominations for the tournament and reject deletion when the
  count is `1`;
- count competitors for the same `(tournament_id, nomination_id)` and reject
  deletion when the count is greater than `0`;
- delete the `tournament_nominations` row by its internal id.

Use a Prisma transaction for the checks and delete so the operation is handled
as one backend command.

### API route stays under the existing tournaments nomination boundary

Add a delete endpoint under `API_ROUTES.TOURNAMENTS.NOMINATION`, using
tournament id and nomination id as route parameters or a typed DTO. The shared
route helper should be extended so the frontend does not hardcode endpoint
strings.

The endpoint must enforce tournament edit access. The UI eligibility check is
for presentation only; backend validation remains authoritative.

### Frontend state update belongs to the tournaments list store

Add a `deleteTournamentNomination(tournamentId, nominationId)` action to
`tournamentsListStore`. After a successful response, remove the matching
nomination from the loaded tournament's `nominations` collection.

`useTournamentPage` already normalizes active tabs against
`tournamentNominations.all`. The delete flow should rely on that existing
normalization where possible and explicitly choose a remaining nomination only
where needed to avoid a stale selected tab immediately after deletion.

### Empty participant area renders the delete action

`TournamentNominationTabs` currently renders the registered fighters section
only when competitors exist. Extend that branch so the participant-list area can
also render for an empty nomination when deletion is allowed.

The delete action can be passed through the existing competition actions object.
`NominationCompetitors` may receive a narrow optional delete capability and
emit/call it when no competitors are present. This keeps the action colocated
with the participant-list area without adding a new component or state layer.

Eligibility should require:

- current user can edit the competition;
- selected nomination has zero registered competitors;
- tournament has more than one nomination;
- deletion is not already in progress.

Use existing i18n files for the visible label. English should read
`Delete nomination`; other locales should provide the corresponding localized
delete-nomination label.

## Risks / Trade-offs

- Counting competitors by `(tournament_id, nomination_id)` is necessary because
  competitor rows do not reference `tournament_nominations` directly.
- Existing add/update nomination endpoints are light on explicit role handling;
  this change should still enforce edit access for the new destructive command.
- Route-query synchronization can briefly point at a deleted nomination unless
  the frontend updates local state and selected tab in the same flow.
- A delete action in the participant area must not be shown for read-only users,
  non-empty nominations, or the only remaining nomination, even though backend
  validation is still the final guard.
