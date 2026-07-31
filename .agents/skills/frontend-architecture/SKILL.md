# Frontend Architecture

## Context

HMBTR frontend uses a pragmatic layered structure, not strict FSD. The folder layout should reflect responsibility and feature ownership while staying close to the existing Vue codebase.

## Problem Statement

Flat `widgets/` made domain UI ownership unclear and mixed app shell, reusable user flows, generic UI modules, and tournament/fighter/rating/marshal/user widgets.

## Chosen Approach

- `app/` contains application shell composition and cross-route app chrome.
- `features/` contains reusable user flows/actions that can be used by multiple pages or shell modules.
- `components/ui/` contains generic UI primitives and shared presentational modules without domain semantics.
- `widgets/` contains domain UI modules with semantic business meaning.

## Implementation Pattern

Group domain widgets by feature area:

- `widgets/tournament/` for tournament pages, competition blocks, cards, fights, nominations, brackets, and tournament registration UI.
- `widgets/fighter/` for fighter-facing domain cards and profile/list presentation modules.
- `widgets/marshal/` for marshal/judge domain UI.
- `widgets/user/` for user administration widgets.
- `widgets/rating/` for rating visualization widgets.

Keep widget public exports via local `index.ts` files. Import grouped widgets through their group path, for example `@/widgets/tournament/FightCard` or `@/widgets/fighter/FighterCard`.

For complex widgets, keep the `.vue` file as a composition shell when possible. Move local UI state machines into colocated composables named after the domain behavior, for example `widgets/tournament/FightCard/useFightScoreDraft.ts`. The composable should own mutation, derived state, and focused tests; the Vue shell should wire props, emits, dialogs, and presentational child modules.

Tournament widgets that only display or edit already-loaded competition data
should receive that data through props and emit typed action payloads upward.
Keep `useCompetitionStore` calls in `useTournamentPage` orchestration unless a
widget is an explicitly accepted nested flow that already owns store usage.
The same rule applies to disciplinary-card operations inside tournament
widgets: card list/edit/delete/issue UI may own draft state and payload
construction, but Pinia store calls belong to page/composable orchestration and
are passed down as typed action props.
When the route shell would need to pass a very wide competition prop/event
contract, introduce a domain workspace widget such as
`widgets/tournament/TournamentCompetitionWorkspace`. The workspace may adapt the
grouped `useTournamentPage` return object to existing child widgets, but must
not create stores or call `http`.
Keep `useTournamentPage` as a facade over narrower internal composables for
confirmation, report download, card-derived state, persisted block-open state,
and lifecycle orchestration. This keeps the external page contract stable while
improving locality inside the orchestration implementation.
For stores that grow private helper modules, prefer a slice folder with a
public `index.ts` over a flat mix in `stores/`. Example:
`stores/competition/index.ts` re-exports the Pinia facade from `store.ts`,
while `commands.ts`, `mapper.ts`, draft persistence, score helpers, and focused
specs stay private to `stores/competition/`. Callers should keep importing from
`@/stores/competition`, not from private files.
Large tournament widgets such as `OlympicBracket` should keep pure view
derivation in colocated helpers and split repeated template regions into
presentational subcomponents before lifting lifecycle actions upward.
Tournament fighter registration is a feature flow, not a tournament display
widget. Keep it under `features/tournament-fighter-registration`, with private
select UI and feature-level store/router orchestration in a colocated composable.
If the feature caches registration eligibility locally, keep it synchronized
with external mutations of `competitionStore.tournamentCompetitors`, because
competitor removal is orchestrated outside the feature.
For profile edit pages that share the same edit-mode lifecycle, use
`composables/useEditableEntityForm.ts`. Pages provide domain adapters for
draft creation, source-to-draft mapping, payload construction, permissions, and
store save calls; the composable owns `draft`, `isEditing`, required-field
disabled state, start/cancel, and save lifecycle.

## Constraints

- Do not introduce `any`.
- Do not move generic primitives into `widgets/`.
- Do not put route shell orchestration into widgets.
- Keep `AlertWidget` top-level unless it becomes clearly owned by a narrower feature area.

## Related Files

- `front/src/app/shell/`
- `front/src/features/`
- `front/src/components/ui/`
- `front/src/widgets/`
