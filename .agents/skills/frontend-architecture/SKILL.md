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
