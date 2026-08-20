## Context

See `proposal.md` for motivation and `specs/ratings/russia-hmb-rating/spec.md` for observable behavior. Current Elo ratings live in `backend/src/ratings`, use `fighter_nomination_ratings` and `fighter_nomination_rating_history`, and are scheduled automatically after `CompetitionFinishService.finish()`. Competition finalization already stores final podium rows in `competition_placements`, finished fights in `fights`, per-round scores in `fight_round_scores`, withdrawals in `fighter_withdrawals`, and cards in `disciplinary_cards`.

Relevant project skills for apply work: `backend-architecture`, `frontend-architecture`, `competition-flow`, `disciplinary-cards`, `fighter-page`, and `minimal-validation`.

## Goals / Non-Goals

**Goals:**

- Keep Russia HMB rating physically and semantically independent from Elo.
- Make the calculation deterministic from persisted server state after nomination finalization.
- Reuse the existing rating page/profile UI patterns where they fit, while keeping separate API contracts and labels.
- Keep role checks enforced by the backend for calculation and Elo reads, not only by navigation visibility.

**Non-Goals:**

- No automatic Russia HMB calculation from nomination finalization.
- No Russia HMB recalculation/edit flow after a result has been saved.
- No changes to Elo formulas, Elo persistence semantics, or competition advancement.

## Decisions

### Store Russia HMB rating in separate calculation and result tables

Create dedicated persistence instead of extending Elo tables:

- `russia_hmb_rating_calculations`: one row per tournament nomination, with `tournament_nomination_id` unique, `tournament_id`, `nomination_id`, `event_year`, `coefficient`, `calculated_at`, and optional `calculated_by_user_id`.
- `russia_hmb_rating_results`: one row per participant result, with `calculation_id`, `tournament_nomination_id`, `tournament_id`, `nomination_id`, `fighter_id`, `competitor_id`, `points`, and diagnostic columns such as `qc_points`, `qn_points`, `qm_points`, `yellow_cards_count`, `active_red_cards_count`, and `no_show_penalty_count`.

Rationale: the user explicitly stated this rating must not intersect with Elo. Separate tables prevent accidental Elo leaderboard/history coupling and allow tournament-nomination result display, yearly aggregation, and fighter profile summaries without reverse-engineering from Elo history.

Alternative considered: add a second rating type column to existing Elo tables. Rejected because Elo stores current cumulative state and history deltas, while Russia HMB stores independent per-tournament points that are summed by year.

### Add a focused Russia HMB rating backend capability

Implement the new backend behavior as a cohesive rating capability, either inside the existing `ratings` module under a clearly named `russia-hmb/` area or as a new `russia-hmb-ratings` module if the existing module becomes too mixed. Follow `backend-architecture`: keep the public controller/facade narrow, put persisted-state reads in a reader, formula logic in a pure helper, and inserts/duplicate guards in persistence.

The calculation endpoint should:

1. Validate the requester is an administrator or secretary.
2. Validate coefficient is one of `1`, `2`, `4`.
3. Validate the tournament nomination is finished and has no saved Russia HMB calculation.
4. Read participants, fights, round scores, final placements, withdrawals, cards, and tournament event year inside one transaction.
5. Calculate all participant results with a pure helper.
6. Insert the calculation row and all result rows atomically.
7. Return the saved result list in descending point order.

Read endpoints should cover:

- saved tournament-nomination result by tournament nomination or tournament+nomination;
- available leaderboard years;
- nominations with saved rating for a year;
- yearly leaderboard by year and nomination;
- fighter profile Russia HMB yearly data.

### Use persisted fight snapshots for Qc

For each finished fight with a persisted winner:

- winner receives `2` Qc;
- loser receives `1` Qc only once per fight when eligible;
- total-score close-loss eligibility means `loserTotal * 2 >= winnerTotal`;
- round-performance eligibility comes from persisted `fight_round_scores`;
- for `round_win = true`, ignore aggregate total-score difference and use only round-performance eligibility.

Technical forfeits remain finished fights for winner Qc, but their generated `0:10` or round-win technical score usually gives the loser no close-loss or round-performance point. This keeps the formula aligned with persisted competition results while still applying explicit no-show/card penalties.

### Use final placements for Qn

Read `competition_placements` with final scope for the tournament nomination. Award only places 1-3: `6`, `4`, and `2`. If a placement row is missing, that place contributes zero and calculation should still return all participants. A missing entire final placement set on a finished nomination should be treated as invalid state and rejected, because the UI action is only meaningful below the podium.

### Use nomination-scoped withdrawals and cards for Qm

No-show penalties come from active `fighter_withdrawals` for the tournament nomination with `source = "NO_SHOW"`. Yellow-card penalties count all yellow cards for the participant's fighter attached to fights in the tournament nomination, including inactive yellows closed by automatic red-card logic. Red-card penalties count effective active red cards for the participant's fighter attached to fights in the tournament nomination using the same tournament-date active-card interpretation described by `disciplinary-cards`.

This preserves current card semantics: yellow consumption by red does not erase the yellow penalty, and expired/inactive red cards do not receive the red penalty.

### Snapshot event year at calculation time

Save `event_year` on the calculation row using the tournament event date. Yearly leaderboards and fighter profile year selectors should query this snapshot rather than recomputing from mutable tournament data. If implementation discovers tournaments can be finished without an event date, reject Russia HMB calculation for those nominations with a clear validation error rather than creating an ungrouped yearly rating.

### Gate Elo as a role-bearing feature

Add a single shared frontend/backend concept for "has any assigned role" based on the current user flags. The frontend should use it for navigation and route meta; the backend should use it for existing Elo rating endpoints. Avoid relying on only the hidden nav item because direct route/API access must also be denied.

The Russia HMB leaderboard and fighter Russia HMB profile data remain public.

### Keep tournament and fighter UI data server-derived

Follow `frontend-architecture`, `competition-flow`, and `fighter-page`:

- tournament widgets receive saved Russia HMB result state and emit calculate/open actions upward;
- API calls live in typed frontend API modules/composables, not directly in route templates;
- fighter profile completed tournaments and Russia HMB yearly summaries come from the profile stats response or a typed companion endpoint;
- all visible strings get i18n keys, including the existing Elo relabeling.

## Risks / Trade-offs

- Formula ambiguity around "score difference <= 50%" -> Mitigation: this design defines it as the losing total being at least half of the winning total; confirm during review before apply if a different federation interpretation is intended.
- Card active-state ambiguity for historical tournaments -> Mitigation: use the existing tournament-date effective active-card interpretation from `disciplinary-cards`, and persist the calculated result so later card/date changes do not silently mutate leaderboards.
- Duplicate calculation policy may be too strict if staff need corrections -> Mitigation: reject duplicates for the first implementation and add an explicit administrator recalculation/reset workflow later if needed.
- Adding yearly public pages could expose fighter location data already shown on Elo pages -> Mitigation: reuse existing public fighter identity/location fields only; do not add private fighter data.
- Broad profile response changes can disturb the existing fighter page -> Mitigation: extend typed profile payloads carefully and keep existing Elo fields backward-compatible for role-bearing users.

## Migration Plan

1. Add Prisma models and indexes for Russia HMB calculation/result tables.
2. Generate Prisma client.
3. Deploy backend with read/write code that tolerates empty Russia HMB tables.
4. Deploy frontend labels, routes, modal, leaderboard, and fighter profile additions.

Rollback strategy: remove or hide the new frontend entry points and calculation action first. Existing saved Russia HMB rows can remain inert because Elo tables and competition state do not depend on them.
