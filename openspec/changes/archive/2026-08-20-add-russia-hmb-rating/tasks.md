## 1. Backend Data Model

- [x] 1.1 Add Prisma models for Russia HMB rating calculations and per-fighter results with unique tournament-nomination calculation constraint and leaderboard/profile indexes.
- [x] 1.2 Generate the Prisma client and verify generated types expose the new models without introducing explicit `any`.
- [x] 1.3 Add shared route constants and typed backend/frontend payload shapes for calculation, nomination result reads, yearly leaderboards, and fighter profile Russia HMB summaries.

## 2. Backend Calculation

- [x] 2.1 Add a pure Russia HMB rating formula helper with typed inputs for participants, fights, persisted round scores, placements, withdrawals, and card penalties.
- [x] 2.2 Cover formula cases for winner points, total-score close losses, round-win loss eligibility, placement points, no-show penalties, yellow-card penalties, active red-card penalties, technical forfeits, and coefficient multiplication.
- [x] 2.3 Add a calculation reader that loads finished nomination state, participants, final placements, fights with round scores, active no-show withdrawals, nomination-scoped yellow cards, and effective active red cards.
- [x] 2.4 Add persistence that atomically creates one calculation row and all participant result rows, rejects duplicate calculations, and returns rows sorted by points descending.
- [x] 2.5 Add calculation controller/facade endpoint with administrator-or-secretary authorization and coefficient validation.
- [x] 2.6 Ensure Russia HMB calculation does not read from or write to Elo rating tables/status fields.

## 3. Backend Reads And Auth

- [x] 3.1 Add public read endpoint for saved Russia HMB tournament-nomination results used by the podium modal.
- [x] 3.2 Add public read endpoints for Russia HMB available years, year-filtered nominations, and yearly nomination leaderboard totals with tournament counts.
- [x] 3.3 Extend fighter profile stats or add a typed companion profile endpoint for completed-tournament Russia HMB points and yearly fighter Russia HMB nomination totals.
- [x] 3.4 Add backend "has any role" authorization for existing Elo rating endpoints while keeping Russia HMB read endpoints public.
- [x] 3.5 Cover duplicate calculation, unauthorized calculation, unfinished nomination calculation, and Elo-read role gating with focused backend tests.

## 4. Tournament UI

- [x] 4.1 Extend competition/tournament state mapping with saved Russia HMB rating availability and result rows for the active nomination.
- [x] 4.2 Add a tournament nomination Russia HMB modal with coefficient selector, close action, calculate action, post-calculation result list, and close-window result action.
- [x] 4.3 Render the centered podium action: calculate button for administrators/secretaries before saved rating, saved-rating button for everyone after saved rating, hidden before nomination finalization.
- [x] 4.4 Wire typed frontend API calls and refresh behavior through tournament page orchestration rather than direct widget HTTP calls.

## 5. Leaderboard And Navigation UI

- [x] 5.1 Rename existing rating navigation/page labels to Elo rating and gate the route/nav by authenticated users with at least one role.
- [x] 5.2 Add the public Russia HMB rating route and navigation action after Elo rating.
- [x] 5.3 Build the Russia HMB rating page by reusing the existing rating table structure, adding year selection, year-filtered nomination selection, summed rating points, and tournament counts.
- [x] 5.4 Add typed frontend API/composable code for Russia HMB years, nominations, and leaderboard rows.

## 6. Fighter Profile UI

- [x] 6.1 Add Russia HMB rating values to completed tournament nomination rows, showing a dash where absent.
- [x] 6.2 Rename the existing fighter Elo rating block to Elo ratings and hide it from unauthenticated users or users with no roles.
- [x] 6.3 Add the public fighter Russia HMB rating section after fights/wins with year selector and per-nomination yearly totals.
- [x] 6.4 Keep fighter profile data server-derived and update frontend model types without using `any`.

## 7. Validation

- [x] 7.1 Run focused backend formula/service tests for Russia HMB calculation and authorization.
- [x] 7.2 Run focused frontend unit tests for tournament modal/action visibility, rating navigation gating, Russia HMB page state, and fighter profile visibility where colocated specs exist or are added. No colocated frontend specs exist under `front/src`.
- [x] 7.3 Run `npm run check:no-any` because this change touches TypeScript, Vue, DTO/model, shared contract, mapper, and API adapter surfaces.
- [x] 7.4 Run `npm run check:backend:build` and `npm run check:front:type` for the cross-layer contract changes.
- [x] 7.5 Run `npm run check:front:build` before finalizing because this change adds routes and page-level chunks.
- [x] 7.6 Review the diff for accidental Elo table/status coupling and unrelated changes.
