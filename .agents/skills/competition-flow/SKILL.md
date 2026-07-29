---
name: competition-flow
description: Captures HMBTR tournament competition flow patterns across Vue, Pinia, NestJS DTOs, and backend ranking/bracket logic. Use when changing group stages, Olympic bracket creation, advancers, placements, tie handling, or tournament-finish behavior.
---

# Competition Flow

## Context

Competition state is server-authoritative. The frontend exposes allowed actions, but bracket and advancement decisions must be validated and built in the backend.

## Problem Statement

Tournament flow changes often touch multiple layers:

- `front/src/pages/TournamentPage.vue` for action visibility.
- `front/src/stores/competition.ts` for API payloads and state refresh.
- `backend/src/competition/dto/` for validated request flags.
- `backend/src/competition/competition.service.ts` for persisted block creation.
- `backend/src/competition/competition.logic.ts` for deterministic ranking and selection rules.
- `backend/src/competition/competition.logic.spec.ts` for focused rules tests.
- `backend/src/disciplinary-cards/disciplinary-cards.service.ts` for card issuance side effects.

## Chosen Approach

Keep domain rules in backend logic helpers, not in Vue components. The frontend should compute enough state to show or hide actions, then pass a small explicit flag or payload to the backend. The backend recomputes rankings and validates that the resulting block is legal.

## Implementation Pattern

1. Add or update pure helper functions in `competition.logic.ts` for reusable ranking/selection rules.
2. Cover those helpers in `competition.logic.spec.ts` before relying on them from the service.
3. Extend the DTO with explicit optional fields when the UI needs to request a variant.
4. In `competition.service.ts`, load the active block inside the transaction, recompute rankings, validate constraints, then create/lock blocks.
5. In `competition.ts` Pinia store, pass only the new explicit API flag and continue applying returned state with `applyCompetitionState`.
6. Keep `front/src/pages/TournamentPage.vue` as a route shell: parse route props, call `useTournamentPage`, and compose `widgets/Tournament*`.
7. Keep tournament page orchestration in `front/src/composables/useTournamentPage.ts`; preserve competition refresh ordering there.
8. Keep tournament feature UI in `front/src/widgets/Tournament*` modules that receive props and emit actions. Do not create new stores or call `http` from those widgets, except inside pre-existing nested widgets with established store usage.
9. Gate action visibility from current loaded state, but do not construct bracket slots or final participant lists client-side.
10. Add i18n keys for all visible action labels.

## Olympic Third-Place Pattern

- Track group name and group place with selected Olympic advancers in backend logic.
- When third-place advancers are used, preserve their priority order from the selection helper.
- Before creating an Olympic bracket with third-place advancers, resolve ties in two passes:
  1. Resolve any in-group tie for 3rd place in groups whose third-place fighter advances or can advance through a tied cutoff.
  2. Then resolve cross-group ties between third-place fighters when the tied wins/diff set crosses the remaining Olympic bracket slots.
- Store cross-group best-third manual order separately from per-group placements so it does not alter group rankings.
- First-round Olympic slots are adjacent pairs. Pair each selected third-place fighter with a first-place fighter from another group before seeding the remaining competitors.
- Preserve backend slot creation as the source of truth; frontend highlighting should derive selected competitor ids from created Olympic bracket slots.

## Persisted Lifecycle Pattern

- Group blocks persist `lifecycle_state`: `FORMATION_EDITABLE`, `FIGHTS_EDITABLE`, or `RESULTS_FIXED`.
- Olympic blocks persist one `competition_round_states` row per round with independent pair and result fixation.
- The explicit result-recording action submits every fight score for the stage/round, validates them together, fixes the results, and advances an Olympic bracket when applicable.
- Persisted card forfeits remain server-authoritative during result recording:
  require their fight ids in the complete stage/round submission, but do not
  validate client score drafts for them or overwrite their generated result.
- Group result recording persists complete scores but leaves results editable when a ranking tie must be resolved. Resolving the final required group-placement tie automatically transitions the block to `RESULTS_FIXED`; no second result-recording action is required.
- While a group-placement tie resolver is pending, hide both group result-recording and group fight-unfix actions. Although the persisted lifecycle remains `FIGHTS_EDITABLE`, tie resolution is the only valid forward UI action at that point.
- Group action buttons rendered inside a block loop must derive readiness from that loop's `block`, not from the global `activeBlock`. Keep the click handler guarded with the same block-specific readiness check so stale UI state cannot POST incomplete fights.
- Do not expose a separate score-saving action in the competition UI. Local score edits remain drafts until result recording.
- Only backward lifecycle transitions require confirmation. Use `AlertWidget` with a destructive confirmation action and a neutral cancel action.
- A later block or round must be deleted before the previous result fixation can be canceled.
- Rolling back a pending/downstream Olympic round also cancels the immediately previous round's result fixation in the same transaction, preserving that previous round's scores and cards so they are editable after one backward action.
- When a group or Olympic result is unfixed directly, or when an Olympic downstream round rollback unfixes the previous round, clear `is_finished` and `winner_id` only on non-forfeit fights. Red-card forfeits remain server-generated fixed results.
- Canceling result fixation preserves scores and cards but clears manual group tie ordering.
- Canceling fight/pair fixation deletes fights and attached cards, resets card-driven forfeits, and renumbers remaining fights.
- Rolling back the first block restores stage `0` and reopens fighter registration. Format selection remains unavailable until registration is explicitly closed again.
- Competition state responses include `tournamentNomination.is_open`; map it into Pinia and use it as the current nomination's server-authoritative registration state. Do not rely on child lifecycle events to infer whether rollback reopened registration.
- Closing fighter registration for a nomination requires at least one marshal
  registered on the tournament. The frontend should disable the close action
  with an "Add judges" hint, and the backend must still validate the rule.
- Final placements, nomination completion, editing lock, and rating calculation occur only through explicit tournament-result finalization.
- If a formed block has participants with an active red card but no fights yet,
  do not interrupt other nomination flows when the card is issued. Block fight
  generation with a 409 payload and let the UI offer rollback of only the
  current active block with `remove_active_red_competitors`.

## Round Scoring Pattern

- Global nomination fields `rounds` and `round_win` define fight scoring. `round_win` is valid only with three normal rounds.
- Persist `rounds` and `round_win` on every fight when it is created. Later
  nomination-setting changes must affect only future fights; scoring, warnings,
  forfeits, reports, and result validation should read the fight snapshot.
- Keep pure score evaluation and result formatting in `shared/fightScoring.ts`; backend and frontend must consume the same rules.
- All fights submit ordered `round_scores`, including one-round nominations. The backend calculates aggregate scores and `winner_id`.
- For `round_win = false`, the aggregate total determines the winner. For `round_win = true`, won rounds determine the winner and drawn rounds award no round win.
- If base rounds are tied, append extra rounds until the first non-draw extra round determines a winner. This applies to both total-score and round-win nominations.
- Aggregate scores always sum every played round, including extra rounds, and remain the source for group point difference.
- Group wins, Olympic advancement, ratings, and other outcome logic use persisted `winner_id`, never aggregate score comparison.
- Red-card forfeits in round-win nominations persist `X:0`, where `X` is the
  normal-round count, plus `5:0` for the opponent in every normal round.
  Other forfeits remain aggregate-only and use `winner_id`.
- Persisted round details live in `fight_round_scores`; legacy `competitor*_round1..4_score` columns may exist only as compatibility summary fields.
- Editable frontend drafts store structured round scores. Extra rows are cleared immediately when obsolete, but new extra rows are revealed only after blur of the last score input in the visible fight group. Moving focus to another fight is not sufficient unless the blurred input was that last input.
- When Enter or forward Tab navigation from the last score input reveals an extra round, move focus to the first input of the new extra round instead of leaving it in the next fight.
- If focus leaves a tied fight for another fight before the last visible score input, keep the current rows and highlight the tied score inputs instead of adding an extra row. Suppress that highlight for the next fight when it only lost focus because Enter navigation was redirected back to a newly added extra round.
- If changed base scores make extra rounds stale, do not silently delete an extra round that contains fight warnings. Trim only later stale rounds, ask for confirmation before deleting the first warning-bearing extra round, and suppress repeat prompts until score or warning data changes.
- Fixed/read-only results use compact shared formatting: total-score mode `8:5 (3:1, 5:4)`; round-win mode `2:1 (5:3, 2:4, 1:1, 3:2)`. If warnings affect a total-score fight, show the effective aggregate first and raw round/warning details in parentheses, for example `0:3 (0:0+3)`.
- Frontend stage-completion gates must use each fight's shared-evaluator `isResultValid` value. Aggregate totals can be equal for a valid round-win result or unequal for an unresolved one.
- Before submitting a result, include only the minimal prefix of base rounds plus tied extras through the first decisive extra round, computed from warning-adjusted scores while sending the original judge-entered round scores. This prevents stale UI draft data from causing backend rejection.

## Fight Warning Pattern

- Fight warnings are local fight-scoring draft data until result fixation, just like unfinished score edits. Store warning drafts in the same localStorage result-draft entry as score drafts.
- Fight warning reasons are required UI input and part of the warning payload. Preserve `reason` through frontend drafts, result-fix DTOs, persisted `fight_warnings`, and state responses; score calculation still depends only on `competitorId` and `round`.
- On result fixation, submit warnings with the fight score payload. The backend validates warning competitor ids, available submitted rounds, and the maximum of three warnings per competitor.
- Backend fixation may persist raw judge scores whose extra rounds are required
  only after warning bonuses. Validate raw score shape and numeric limits without
  applying stale-extra rejection, then require the warning-adjusted evaluation to
  have a winner before setting `winner_id`.
- Persist fixed warnings separately from disciplinary cards in `fight_warnings`. They do not create fighter-profile sanctions and do not transfer between fights.
- Keep base judge scores in the fight score fields. Compute effective scores from base scores plus warning bonuses wherever results, standings, or report rows are displayed or ranked.
- Editable fight widgets must reveal or trim extra rounds from the warning-adjusted effective score, not from raw judge scores alone. A warning can turn a base-round winner into an effective tie that requires another round.
- Fight-warning round pickers derive allowed rounds from the currently visible round-score rows, including extra rows in one-round nominations.
- One warning adds `+3` to the opponent in that warning's round. Three warnings by one competitor produce the same technical-defeat score shape as a red-card forfeit, but keep `forfeit_card_id` null so ratings treat the fight as an ordinary completed fight.
- Red-card forfeits take precedence over three-warning technical defeats. Preserve persisted warnings when result fixation is canceled so they become editable draft state again.

## Group-Derived Olympic Pairing

- Direct Olympic brackets keep club/city-aware seeding.
- Group-derived brackets without selected thirds use cyclic pairs: `A1-B2`, `B1-C2`, ..., final group first versus `A2`.
- Selected third places are paired with available first places from another group before remaining competitors are matched.
- Remaining matching globally minimizes same-group pairs first, then first-place-versus-first-place pairs, and always returns a complete bracket.
- Manual pending-pair swaps remain unrestricted.

## Constraints

- Do not introduce `any`.
- Normal Olympic brackets support only 4, 8, or 16 fighters.
- Group-stage advancement uses group rankings from completed fights plus manual tie resolution.
- Existing pending-tie checks must block creating later stages until relevant ties are resolved.
- Backend validation must reject illegal bracket sizes even if the frontend hides the action.
- Red-card consequences are tournament-wide and belong in backend services. UI refreshes can show the result, but must not decide who is removed or forfeited.

## Edge Cases

- If top-2 group advancers already produce 4, 8, or 16 fighters, use normal Olympic creation.
- If top-2 advancers fall short of the next supported Olympic size, optional third-place advancement may fill only the exact shortfall.
- If there are not enough third-place fighters to fill the full shortfall, do not partially expand the bracket.
- When more third-place fighters exist than slots, choose deterministically using the same ranking metrics: wins, then diff, then stable group/name and competitor id ordering.
- Single-group stages finish directly instead of creating an Olympic block from group top-2 logic.
- If a selected third-place fighter is added to Olympic, highlight that fighter in the original group table using the same visual treatment as first and second places.
- Fight block headings should render only for blocks with generated fights. Use singular `Group` for one group letter and plural `Groups` for paired group blocks.
- Olympic bronze fights are displayed and held before the final, so bronze fight numbers must be lower than final fight numbers.
- Olympic block creation persists bracket slots only. The frontend shows draggable pending pairs and calls the explicit fix-pairs endpoint before fights for that round are generated.
- After each fixed non-semifinal Olympic round, the backend reorders winner slots and stops. The frontend then shows the next draggable pair tables. Fixed semifinal completion creates only the bronze fight and final immediately.
- A red card removes the fighter from other nominations in the same tournament when those nominations have no competition block yet.
- In a group block, a red card preserves earlier fights, forfeits the fight
  where the card was issued and all later fights in that same block by
  `fight_number`, and the fighter remains visible in standings but cannot
  advance.
- Outside group blocks, a red card forfeits unfinished fights in formed
  nominations across the tournament. Reapply forfeits after future Olympic
  fights are generated, including fixed pairs and final/bronze fights created
  by progression.
- Keep red-carded fighters visible in group standings, but exclude active-red competitors before advancement selection and advancement-related tie detection.
- When a red-card semifinal forfeit completes both semifinals, progress the Olympic block immediately and reapply forfeits so a newly created bronze fight involving that fighter is fixed at `0:10`.

## Related Files

- `front/src/pages/TournamentPage.vue`
- `front/src/composables/useTournamentPage.ts`
- `front/src/widgets/Tournament*`
- `front/src/stores/competition.ts`
- `front/src/i18n/locales/en.json`
- `front/src/i18n/locales/ru.json`
- `backend/src/competition/dto/create-competition-block.dto.ts`
- `backend/src/competition/competition.logic.ts`
- `backend/src/competition/competition.logic.spec.ts`
- `backend/src/competition/competition.service.ts`
- `backend/src/disciplinary-cards/disciplinary-cards.service.ts`

## Maintenance

Run focused backend logic tests after any ranking or advancer change:

```sh
npm test -- competition.logic.spec.ts
```

Run backend build and frontend type/build checks when API shape or page flow changes:

```sh
npm run build
npm run type-check
```
