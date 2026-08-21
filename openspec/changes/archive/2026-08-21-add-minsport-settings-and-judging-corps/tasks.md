## 1. Data Model And Contracts

- [x] 1.1 Update Prisma schema for Ministry of Sport settings, optional nomination weapon, tournament secretary text, chief-judge marker on tournament judge assignments, and removal of the manual marshal-registration lock field.
- [x] 1.2 Regenerate Prisma client and update shared/frontend/backend TypeScript models without introducing explicit `any`.
- [x] 1.3 Keep the existing production `db push` deployment model and add an automatic idempotent post-schema-sync backfill that marks the lowest-id existing judge assignment as chief for each tournament that has judges and no chief judge.
- [x] 1.4 Remove shared route constants, DTOs, model fields, and API callers for the old finish-judge-registration endpoint and manual lock field.

## 2. Backend Behavior

- [x] 2.1 Add read/update API behavior for Ministry of Sport report settings with multiline strings up to 2000 characters and empty values allowed.
- [x] 2.2 Include nomination weapon in nomination create, update, list, and cached common-data responses.
- [x] 2.3 Update tournament judge assignment so the first added judge becomes chief, later added judges do not, duplicate assignment remains rejected, and delete does not auto-promote another chief.
- [x] 2.4 Add backend behavior for setting one tournament judge as chief while clearing every other chief marker for the same tournament.
- [x] 2.5 Add backend behavior for reading and updating tournament secretary text while preserving existing tournament permission rules.
- [x] 2.6 Replace nomination registration-close validation with complete judging-corps validation: at least one judge, exactly one chief judge, and non-empty secretary.
- [x] 2.7 Update tournament report read models/builders only as needed to keep existing reports compiling after marshal/tournament shape changes; do not render Ministry of Sport settings yet.

## 3. Frontend Settings

- [x] 3.1 Add the "Ministry of Sport Report" Settings tab with organization name and address multiline inputs, 2000-character constraints, save state, success/error handling, and i18n keys.
- [x] 3.2 Add the nomination weapon field to Settings nomination drafts, create/update payloads, table rows, and new-nomination form.
- [x] 3.3 Expand and tighten the nomination directory table layout so the weapon column fits and compact columns do not waste horizontal space.

## 4. Frontend Tournament Judging Corps

- [x] 4.1 Remove the "Finish adding judges" button and all UI state that treats judge registration as manually finished.
- [x] 4.2 Make "Add judges" visible and functional whenever the user can manage tournament judges and at least one nomination registration is open.
- [x] 4.3 Replace the added-judges list with a table containing full name, category, chief-judge checkbox, and existing remove behavior while editable.
- [x] 4.4 Wire chief-judge checkbox updates through the backend so selecting one row clears the previous chief and read-only state applies when all registrations are closed.
- [x] 4.5 Add the centered tournament secretary input below the judges table and persist it through the tournament API.
- [x] 4.6 Group judges and secretary inside a "Judging Corps" collapsible section.
- [x] 4.7 Update close-registration disabled state and hints for missing judges, missing chief judge, and missing secretary.

## 5. Completion Collapsible State

- [x] 5.1 Extend the collapsible persistence helper or add a narrow companion helper so completion actions can explicitly write closed state for section keys.
- [x] 5.2 Collapse and persist closed state for all current nomination sections when final nomination results are fixed.
- [x] 5.3 Collapse and persist closed state for tournament-level "Disciplinary Cards" and "Judging Corps" when all tournament nominations are finished.
- [x] 5.4 Default finished nominations and fully finished tournaments to closed sections when no saved user state exists, while preserving later manual overrides.

## 6. Tests And Validation

- [x] 6.1 Update or add focused backend tests for Ministry of Sport settings validation/storage, nomination weapon create/update, idempotent chief-judge backfill, tournament judge chief behavior, secretary persistence, and close-registration prerequisites.
- [x] 6.2 Update or add focused frontend tests for Settings tabs/nomination weapon, tournament judge action visibility, chief-judge UI state, secretary close-registration hint, and completion collapsible persistence where practical.
- [x] 6.3 Run focused backend tests, including `npm --prefix backend test -- settings.service.spec.ts nominations.service.spec.ts tournaments.service.spec.ts --runInBand` or the closest touched spec set after implementation.
- [x] 6.4 Run focused frontend tests, including `npm --prefix front run check:unit -- SettingsPage.spec.ts tournamentMarshalRegistration.spec.ts useTournamentCompetitionActions.spec.ts` or the closest touched spec set after implementation.
- [x] 6.5 Run cross-layer checks required by `minimal-validation`: `npm run check:no-any`, `npm run check:backend:build`, and `npm run check:front:type`.

## 7. Knowledge Capture

- [x] 7.1 After implementation and archive, update `marshal-registration` skill to remove the obsolete manual finish-registration rule and describe the open-nomination-driven judging-corps edit rule.
