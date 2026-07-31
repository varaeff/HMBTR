---
name: marshal-registration
description: Maintain HMBTR marshal/judge list, profile, categories, secretary permissions, and tournament marshal registration.
---

# Marshal Registration

## Context

Marshals and judges are the same domain entity. The app stores them in `marshals`, categorizes them through `marshals_categories`, and assigns them to whole tournaments through `tournament_marshals`.

## Problem Statement

Marshal changes cross backend schema/API, user roles, public list/profile pages, and tournament-page registration. The secretary role is deliberately narrow and must not inherit organizer powers.

## Chosen Approach

Use marshal naming in code and URLs. Visible UI text may say judges where the workflow asks for judges. Keep category values read-only from `marshals_categories`; do not add category management UI unless explicitly requested.

## Implementation Pattern

1. Public marshal reads live under `MARSHALS` routes: list, count, details/profile, categories.
2. Marshal create/update is limited to admin or secretary.
3. Tournament marshal registration is limited to admin, organizer, or secretary.
4. A marshal is assigned once to a whole tournament, not per nomination.
5. Backend registration must reject when `tournaments.is_marshals_registration_closed` is true or no tournament nomination has `is_open = true`.
6. `Finish adding marshals` permanently sets `is_marshals_registration_closed`
   only after at least one marshal is assigned; there is no reopen flow for
   non-empty registration.
7. Marshal profile displays only identity/location/photo and all assigned tournaments; edit mode may include required category.
8. Fighter nomination registration cannot be closed until at least one marshal
   is registered for the tournament. Enforce this in `TournamentsService` and
   show a disabled close-registration action with an "Add judges" hint in the
   tournament UI.
9. Marshal profile edit-mode lifecycle uses
   `front/src/composables/useEditableEntityForm.ts`; keep marshal-specific
   category handling and `MarshalDB` payload construction as page-level
   adapters.

## Constraints

- Do not introduce `any`.
- Use `marshals_categories.name_ru` and `name_en`.
- Category is required when creating or editing a marshal.
- Duplicate marshal rule is `name + surname + country_id`.
- Do not broaden `hasAccess`; use explicit marshal permission helpers.

## Edge Cases

- Empty categories means marshal save remains disabled.
- Assigned marshal list remains visible after marshal or fighter registration closes.
- Removal is allowed only while marshal registration is still open by the backend rule.
- If test data contains `is_marshals_registration_closed = true` with zero
  assigned marshals, keep the add-marshal UI/API available so the tournament can
  recover while fighter registration is still open. The first assigned marshal
  in this recovery path should reset `is_marshals_registration_closed` to false.
- During a started add-marshal session, keep the selector and finish action
  visible after the first marshal is assigned. The UI should treat explicit
  finish, not the first non-empty marshal list, as the end of the session.

## Related Files

- `backend/prisma/schema.prisma`
- `backend/src/marshals/`
- `backend/src/tournaments/tournaments.service.ts`
- `front/src/stores/marshalsList.ts`
- `front/src/stores/tournamentMarshals.ts`
- `front/src/pages/MarshalPage.vue`
- `front/src/widgets/marshal/TournamentMarshals/TournamentMarshals.vue`
- Tournament PDF reports include registered marshals; keep report data and copy in sync when marshal assignment fields change.

## Maintenance

Run:

```sh
cd backend && npm run build && npm test -- marshals.service.spec.ts tournaments.service.spec.ts
cd front && npm run type-check
```
