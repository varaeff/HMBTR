---
name: russia-hmb-rating
description: Maintain HMBTR Russia HMB rating calculation, storage, tournament modal, yearly leaderboards, fighter profile summaries, and separation from Elo rating. Use when changing Russia HMB/ИСБ rating formula, calculation permissions, saved results, public leaderboards, or fighter profile Russia HMB data.
---

# Russia HMB Rating

## Context

Russia HMB rating is an official per-tournament nomination rating. It is
separate from the existing Elo rating and must not read from or write to Elo
rating tables, Elo history, or Elo calculation status.

## Problem Statement

Russia HMB rating changes cross backend formula/read/persistence code,
competition finalization state, disciplinary card and withdrawal consequences,
frontend tournament modal state, public leaderboards, and fighter profile data.

## Chosen Approach

Keep the formula in a pure helper, feed it from a narrow persisted read model,
and persist one immutable calculation per tournament nomination. Keep public
Russia HMB read endpoints separate from role-gated Elo endpoints.

## Implementation Pattern

1. Backend formula lives in `backend/src/ratings/russia-hmb/russia-hmb-rating.logic.ts`.
2. Calculation input is read by `RussiaHmbRatingReader` from finished nomination
   state: participants, finished fights, final placements, no-show withdrawals,
   nomination-scoped yellow cards, and active red cards.
3. Persist results through `RussiaHmbRatingPersistence`; reject duplicate
   calculation for the same tournament nomination.
4. Use `russia_hmb_rating_calculations` and `russia_hmb_rating_results`; do not
   touch `fighter_nomination_ratings`, `fighter_nomination_rating_history`, or
   `tournament_nominations.rating_status`.
5. Frontend tournament widgets receive Russia HMB state/actions through
   tournament page orchestration. Do not call HTTP directly from widgets.
6. Public leaderboard/profile reads use typed functions in `front/src/api/ratings.ts`.
7. Fighter profile data remains server-derived. Public profile data may include
   Russia HMB summaries; Elo summaries are fetched separately only for users
   with at least one role.

## Formula Rules

- Formula: `(Qc + Qn) * K - Qm`.
- Qc: winner receives `2`.
- Qc: non-technical loser receives `1` only when eligible by close total score
  or by winning/drawing a persisted round. For round-win nominations, only the
  persisted-round condition applies.
- Technical losses never award loser Qc points. Technical losses include red-card
  forfeits, withdrawal forfeits, and three-warning technical defeats.
- Qn: places `1/2/3` receive `6/4/2`.
- Qm: unexcused active no-show withdrawal receives `10`.
- Qm: every yellow card attached to a nomination fight receives `10`, including
  yellows later consumed by a red card.
- Qm: active red cards attached to nomination fights receive `30`; inactive red
  cards do not count.

## Constraints

- Do not introduce `any`.
- Do not make Russia HMB rating depend on Elo data or status.
- Do not recalculate or overwrite saved Russia HMB results without an explicit
  product decision; current persistence is one calculation per tournament
  nomination.
- Technical score rows can contain `0:0` persisted rounds. The technical-loss
  marker, not round contents, decides loser Qc eligibility.

## Edge Cases

- Existing saved results may become stale after formula changes. Treat repair as
  a separate recalculation/migration task because duplicate calculation is
  rejected by design.
- A fight lost by three warnings may have no `forfeit_card_id`; detect it from
  persisted warning count for the losing competitor.
- Excused no-show withdrawals still affect competition flow but do not add Qm
  no-show penalty.

## Related Files

- `backend/src/ratings/russia-hmb/`
- `backend/src/ratings/ratings.controller.ts`
- `backend/src/ratings/profile/fighter-rating-profile.service.ts`
- `backend/prisma/schema.prisma`
- `front/src/widgets/tournament/TournamentNominationTabs/TournamentNominationTabs.vue`
- `front/src/composables/useRussiaHmbRatingPageData.ts`
- `front/src/composables/useFighterProfileStats.ts`
- `front/src/api/ratings.ts`
- `front/src/model/rating.ts`
- `shared/routes.ts`

## Maintenance

Run focused checks after formula or reader changes:

```sh
npm --prefix backend test -- russia-hmb-rating.logic.spec.ts russia-hmb-rating.service.spec.ts --runInBand
npm run check:no-any
npm run check:backend:build
```

For frontend-only Russia HMB UI changes, run:

```sh
npm run check:no-any
npm run check:front:type
```
