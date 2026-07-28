---
name: disciplinary-cards
description: Maintain HMBTR disciplinary card flows across Vue, Pinia, NestJS DTOs, and backend card side effects. Use when changing disciplinary card issuance, listing, editing, deletion visibility, expiration dates, active-card checks, automatic red cards, or card-driven competition consequences.
---

# Disciplinary Cards

## Context

Disciplinary cards are server-authoritative. The frontend may hide unavailable actions, but backend services must enforce card deletion, update shape, expiration, automatic red-card creation, and red-card competition consequences.

## Problem Statement

Card changes commonly cross multiple layers:

- `front/src/widgets/DisciplinaryCards/TournamentCardsTable.vue` for tournament and fighter card tables.
- `front/src/stores/disciplinaryCards.ts` for API calls and refresh behavior.
- `front/src/model/index.ts` for shared frontend card payloads.
- `backend/src/disciplinary-cards/dto/` for validated create/update payloads.
- `backend/src/disciplinary-cards/disciplinary-cards.service.ts` for persisted card rules.
- `backend/src/competition/competition.service.ts` for red-card forfeits and progression effects.

## Chosen Approach

Keep card domain rules in the backend. Send explicit server-derived flags, such as `can_delete`, to the UI when action visibility depends on persisted competition state. Keep card update payloads narrow so disabled frontend fields cannot be changed by direct API calls.

## Implementation Pattern

1. Load current card and related fight/block/nomination state in `DisciplinaryCardsService` before changing behavior.
2. Use DTOs to expose only fields that are intended to be editable.
3. For list-only UI decisions, add explicit response fields from the backend instead of duplicating full lock rules in Vue.
4. In `TournamentCardsTable.vue`, use the same component for tournament and fighter card views; branch only on display mode.
5. Refresh card state after create, update, or delete, and refresh competition state when red-card consequences can affect fights.
   - Card deletion must not eagerly reload a card collection inside the Pinia delete action. Deleting the last visible card can unmount the table before its `changed` event reaches the owning page. Let the page-level handler reload its card collection and any affected competition state.
6. Add focused component tests for visible card actions and edit-field availability.
7. Tournament-page card summaries should mirror the PDF card columns: type, fighter, nomination, fight number, and reason.
8. Fight rows open a context menu on fighter right-click; the menu action opens the card issuance dialog.
9. Fighter registration eligibility is server-derived in bulk. It combines open tournament nominations, gender compatibility, existing registrations, and active red cards evaluated on the tournament check date.
10. Applying or updating an active red card uses the full red-card consequence path: forfeit formed unfinished fights, progress any Olympic block made ready by those forfeits, then reapply forfeits to newly created final or bronze fights.
11. Group-stage red cards preserve earlier fights, forfeit the attached fight
    and all later fights in that same block by `fight_number`, and active-red
    exclusion from rankings prevents the fighter from advancing.
12. Canceling result fixation must not reopen red-card forfeit fights for
    editing. Keep their `is_finished`, `winner_id`, scores, and
    `forfeit_card_id` intact unless the card or generated fights are deleted.
13. In subgroup standings, active-red fighters retain their row but use a
    translucent light-red background only in the nomination, stage, and group
    where the card was received. This background takes precedence over advancer
    green.
14. Disciplinary-card expiration defaults live in the singleton
    `disciplinary_card_settings` row. Yellow cards support end-of-month or
    day-count expiry; red-card expiry is day-count only and depends on source
    plus the number of active yellow cards at `received_at`.
15. Red cards persist `active`. Only active red cards block registration,
    create forfeits, or restrict fighters. Inactive red cards remain visible
    with pale presentation and can be activated by card managers, but an active
    red card cannot be switched back to inactive.
16. Yellow cards also persist `active`. When an automatic red card consumes
    yellow cards, store those exact yellow ids in `red_card_yellow_sources`,
    close their `expires_at` to the red activation date, and set them inactive.
    Editing an inactive yellow must preserve its inactive state.
    If an inactive yellow was closed by an automatic red, expose it as
    expiration-locked and reject direct `expires_at` updates for it.
17. Every disciplinary card has a required `marshal_id`. Manual issuance must
    validate that the marshal is registered for that tournament. Automatic red
    cards inherit the marshal from the yellow card that triggered the check.
    If that trigger yellow's marshal is edited later, cascade the same marshal
    to the automatic red card generated from it.
18. Editing a manual card may change `marshal_id` through the same registered
    tournament-marshal selector used for manual issuance. Backend update must
    validate the selected marshal against the card's tournament.
19. Automatic cards can only have `expires_at` edited, and only from fighter
    card tables where expiration is visible. Do not show automatic-card edit on
    tournament card tables.

## Constraints

- Do not introduce `any`.
- Do not trust disabled form controls as authorization or write protection.
- Card delete remains backend-enforced by nomination/block state.
- Card reason, marshal, and fighter-profile expiration are metadata edits and
  remain editable after stage or nomination result fixation. Issue date remains
  fixed.
- Card type and active flag are result-affecting fields; expose
  `can_change_result_fields` and lock them after attached fight results are
  fixed.
- Card list responses expose `can_manage`, `can_change_result_fields`, and
  `can_delete` from persisted fight lifecycle state. Treat `can_manage` as
  metadata edit availability; do not tie it to `results_fixed` or
  `tournament_nominations.is_finished`. Hide delete when attached fight results
  are fixed, but keep metadata edit available.
- Red-card consequences belong in backend services; UI refreshes may reveal results but must not decide forfeits.
- General forfeit reapplication used by generation and rollback flows must not progress Olympic brackets. Bracket progression belongs only to the card-application consequence path.
- Secretaries have the same card-management permissions as administrators and
  organizers. Settings pages may still be administrator-only.

## Edge Cases

- A card issued in a completed nomination must not show `Delete` on either tournament or fighter pages.
- If a card table contains only non-deletable cards and no edit permission, hide the actions column.
- Editing red-card expiration can affect active-card forfeits; reset and reapply red-card forfeits after red-card expiration updates.
- Automatic red cards use backend threshold checks against active yellow cards.
  Prefer the active same-tournament threshold when it overlaps with the
  cross-tournament threshold. Cross-tournament automatic reds are inactive and
  must not prevent later active reds.
- Inactive card rows remain available behind the shared "show inactive"
  checkbox and should use `text-muted-foreground` in every card table.
- Automatic cards cannot be deleted manually and their reason is read-only.
  Deleting a yellow card that is linked through `red_card_yellow_sources`
  deletes the automatic red card it caused after resetting that red card's
  generated forfeits.

## Related Files

- `front/src/widgets/DisciplinaryCards/TournamentCardsTable.vue`
- `front/src/widgets/DisciplinaryCards/TournamentCardsTable.spec.ts`
- `front/src/stores/disciplinaryCards.ts`
- `front/src/model/index.ts`
- `backend/src/disciplinary-cards/dto/create-disciplinary-card.dto.ts`
- `backend/src/disciplinary-cards/dto/update-disciplinary-card.dto.ts`
- `backend/src/disciplinary-cards/disciplinary-cards.service.ts`
- `backend/src/competitors/competitors.service.ts`
- `front/src/widgets/FightersSelect/FightersSelect.vue`
- `backend/src/competition/competition.service.ts`
- `backend/src/tournaments/tournaments.service.ts` for tournament PDF report card summaries.

## Maintenance

Run focused checks after card-flow changes:

```sh
cd front && npm run test:unit -- --run TournamentCardsTable.spec.ts
cd front && npm run type-check
cd backend && npm run build
```
