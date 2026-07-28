---
name: fighter-page
description: Maintain the HMBTR fighter profile page and its server-derived profile statistics. Use when changing FighterPage.vue, fighter profile layout, completed-tournament lists, fight/win summaries, fighter rating placement/history, or fighter-page disciplinary-card placement.
---

# Fighter Page

## Context

The fighter page is a public profile view backed by typed server-derived statistics. The page combines editable fighter identity data, completed nomination participation, fight/win counts, rating placement and history, and the existing fighter disciplinary-card table.

## Problem Statement

Fighter profile changes can cross several layers:

- `front/src/pages/FighterPage.vue` for layout, profile editing, and rendering stats.
- `front/src/widgets/FighterRatingChart/` for fighter rating history graph rendering and point tooltips.
- `backend/src/ratings/ratings.service.ts` for completed nomination, fight/win, placement, and history aggregation.
- `backend/src/ratings/ratings.controller.ts` and `shared/routes.ts` for the profile stats API route.
- `front/src/model/index.ts` for shared frontend payload typing.
- `front/src/components/ui/chart/ChartContainer.vue` for shadcn-style rating history visualization with coordinate axes.
- `front/src/i18n/locales/en.json` and `front/src/i18n/locales/ru.json` for visible labels.
- `front/src/widgets/DisciplinaryCards/TournamentCardsTable.vue` for card rendering.

## Chosen Approach

Keep fighter statistics server-derived. The frontend should not reconstruct completed nominations, rating ranks, or fight outcomes from broad client state. It should request the typed profile payload, render empty/loading/error states, and keep card behavior delegated to the existing disciplinary-card store and table.

## Implementation Pattern

1. Add or extend a typed backend profile method when the page needs new derived fighter data.
2. Filter tournament participation to completed `tournament_nominations`; pending nominations must not appear in profile tournament stats.
3. Count fights from finished fights only, and count wins by matching the fighter's competitor id to `winner_id`.
4. Compute rating place and total fighter count using the same ordering as the rating table: rating desc, fights count desc, surname/name/id stable order.
5. Expose rating history from `fighter_nomination_rating_history` grouped by nomination.
6. Add frontend interfaces in `front/src/model/index.ts`; do not use `any`.
7. Render profile data in `FighterPage.vue` with a centered heading, location line, compact avatar, grouped completed-tournament table, fight/win totals, nomination breakdown, ratings selector, rating summary, delegated rating chart widget, and unchanged card table behavior.
8. Keep rating chart geometry, point hover/focus state, tooltip rendering, and axis-label density rules inside `front/src/widgets/FighterRatingChart/`.
9. Keep date of birth out of the fighter page display and edit payload unless the requested change explicitly reintroduces it.

## Constraints

- Do not introduce `any`.
- The page title should use the fighter name when loaded.
- Country, city, and club belong under the heading in small muted text.
- Fighter photo is a small rounded avatar in the upper-left profile header area.
- Completed tournaments display as one row per tournament with `Name`, `Date`, and grouped `Nominations`.
- Rating summary should show current place, total fighters in that nomination rating, and current rating.
- Rating history charts should use the installed shadcn `ChartContainer`, show rating values on the Y axis and dates on the X axis, and always start from the initial 1000 rating.
- Rating change points should show the tournament name in the custom chart tooltip; avoid SVG `<title>` for those points because it creates a second browser-native tooltip.
- Completed nomination filtering is backend responsibility.
- Disciplinary cards remain server-authoritative; do not duplicate card action rules in the fighter page.
- Prefer existing shadcn-style UI primitives and local i18n keys.

## Edge Cases

- Fighter has no completed nominations: show an empty tournaments state.
- Fighter has completed nominations but no finished fights: show zero totals and empty/zero nomination rows.
- Fighter has ratings without history: show current place/rating and a single starting-rating chart point.
- Fighter has multiple nominations in the same tournament: group those nominations into one tournament row.
- Fighter not found: backend should return `NotFoundException`.

## Related Files

- `front/src/pages/FighterPage.vue`
- `front/src/widgets/FighterRatingChart/FighterRatingChart.vue`
- `front/src/model/index.ts`
- `front/src/components/ui/chart/ChartContainer.vue`
- `front/src/i18n/locales/en.json`
- `front/src/i18n/locales/ru.json`
- `backend/src/ratings/ratings.controller.ts`
- `backend/src/ratings/ratings.service.ts`
- `shared/routes.ts`
- `front/src/stores/disciplinaryCards.ts`
- `front/src/widgets/DisciplinaryCards/TournamentCardsTable.vue`

## Maintenance

Run these checks after fighter profile changes:

```sh
cd front && npm run type-check
cd backend && npm run build
```

For card visibility or action changes, also run the focused card table tests:

```sh
cd front && npm run test:unit -- --run TournamentCardsTable.spec.ts
```
