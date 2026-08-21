---
name: marshal-registration
description: Maintain HMBTR marshal/judge list, profile, categories, secretary permissions, and tournament marshal registration.
---

# Marshal Registration

## Context

Marshals and judges are the same domain entity. The app stores them in `marshals`, categorizes them through `marshals_categories`, assigns them to whole tournaments through `tournament_marshals`, and stores the tournament secretary on `tournaments.secretary_name`.

## Problem Statement

Marshal changes cross backend schema/API, user roles, public list/profile pages, and tournament-page registration. The secretary role is deliberately narrow and must not inherit organizer powers.

## Chosen Approach

Use marshal naming in code and URLs. Visible UI text may say judges where the workflow asks for judges. Keep category values read-only from `marshals_categories`; do not add category management UI unless explicitly requested.

## Implementation Pattern

1. Public marshal reads live under `MARSHALS` routes: list, count, details/profile, categories.
2. Marshal create/update is limited to admin or secretary.
3. Tournament marshal registration is limited to admin, organizer, or secretary.
4. A marshal is assigned once to a whole tournament, not per nomination.
5. Backend marshal/secretary edits must reject when no tournament nomination has
   `is_open = true`; reopening any nomination registration reopens judge and
   secretary editability.
6. Do not use a manual finish-registration flag or endpoint. There is no
   `Finish adding marshals` flow.
7. Marshal profile displays only identity/location/photo and all assigned tournaments; edit mode may include required category.
8. The first assigned tournament marshal becomes chief judge by default. Later
   assignments are not chief automatically. Selecting a chief judge clears the
   previous chief for the same tournament. Deleting a chief judge does not
   auto-promote another judge.
9. Fighter nomination registration cannot be closed until the judging corps is
   complete: at least one marshal, exactly one chief judge, and non-empty
   `secretary_name`. Enforce this on the backend and show disabled
   close-registration actions with specific hints in the tournament UI.
10. Marshal profile edit-mode lifecycle uses
   `front/src/composables/useEditableEntityForm.ts`; keep marshal-specific
   category handling and `MarshalDB` payload construction as page-level
   adapters.

## Constraints

- Do not introduce `any`.
- Use `marshals_categories.name_ru` and `name_en`.
- Category is required when creating or editing a marshal.
- Duplicate marshal rule is `name + surname + country_id`.
- Do not broaden `hasAccess`; use explicit marshal permission helpers.
- Existing production data is repaired after `db push` by an idempotent startup
  backfill that marks the lowest-id tournament marshal as chief only when a
  tournament has judges and no chief.

## Edge Cases

- Empty categories means marshal save remains disabled.
- Assigned marshal list remains visible after marshal or fighter registration closes.
- Removal and chief/secretary edits are allowed only while at least one
  nomination registration is open.
- During a started add-marshal session, keep the selector visible after the
  first marshal is assigned while at least one nomination registration remains
  open.
- Completed tournament views keep the judging corps visible but collapsed by
  default unless local collapsible state overrides it.

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
