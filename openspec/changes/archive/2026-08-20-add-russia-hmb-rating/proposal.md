## Why

HMBTR needs a separate "Russia HMB rating" workflow for official tournament scoring that does not affect, reuse, or replace the existing Elo rating. Staff must be able to calculate this rating after nomination results are finalized, and users must be able to view yearly Russia HMB leaderboards and fighter-specific Russia HMB totals.

## What Changes

- Add an administrator/secretary action on a finished tournament nomination podium to calculate Russia HMB rating with tournament coefficient `1`, `2`, or `4`.
- Persist per-fighter Russia HMB rating results for a specific tournament nomination, including the coefficient used and the calculated points.
- Replace the calculate modal content with the calculated, descending per-nomination rating list after calculation.
- Change the finished nomination action from "Calculate Russia HMB rating" to "Russia HMB rating" after calculation and make the result visible to all users.
- Rename the existing global "Rating" UI to "Elo rating".
- Restrict the existing Elo rating page and fighter Elo rating block to authenticated users who have at least one assigned role.
- Add a new public "HMB rating" navigation entry and a "Russia HMB ratings" page that mirrors the Elo rating table structure, adds a year selector, lists only years with calculated Russia HMB ratings, filters nominations by selected year, and shows yearly summed points with a "Tournaments" column.
- Add a "Russia HMB rating" column to the fighter completed tournaments section, showing the per-nomination Russia HMB result or a dash.
- Add a public fighter-profile "Russia HMB rating" section after the fights/wins section when the fighter has calculated Russia HMB ratings, with year selection and per-nomination yearly totals.

Non-goals:

- Do not change the Elo formula, Elo persistence, Elo history, or Elo calculation scheduling.
- Do not recalculate Russia HMB rating automatically during tournament finalization.
- Do not allow recalculating or overwriting an already calculated Russia HMB rating in this change unless a later decision explicitly adds that workflow.
- Do not use Russia HMB rating data as a competition ranking, seeding, or advancement input.

## Capabilities

### New Capabilities

- `ratings/russia-hmb-rating`: Calculates, stores, and displays Russia HMB ratings independently from Elo ratings.

### Modified Capabilities

- None.

## Relevant Project Skills

- `backend-architecture`
- `frontend-architecture`
- `competition-flow`
- `disciplinary-cards`
- `fighter-page`
- `minimal-validation`

## Impact

- Backend: new persistence model(s), rating calculation logic, read APIs for tournament nomination results, yearly leaderboards, and fighter profile Russia HMB rating summaries.
- Backend authorization: calculate endpoint requires administrator or secretary; Elo rating endpoints stop being public and require an authenticated user with at least one role; Russia HMB read endpoints are public unless existing global auth policy requires an explicit public marker.
- Frontend: tournament nomination podium/actions, calculate/result modal, main navigation, routing, Elo rating access gating, new Russia HMB rating page, fighter completed tournaments table, and fighter rating sections.
- Shared contracts: add route constants and typed response/payload shapes without introducing `any`.
- Database: add tables/fields for Russia HMB tournament-nomination calculation state and per-fighter rating rows, separate from `fighter_nomination_ratings` and `fighter_nomination_rating_history`.
