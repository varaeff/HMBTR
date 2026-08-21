## Why

Tournament staff need to prepare data for a future Ministry of Sport report and keep tournament judging information complete before nominations move into competition flow. The current marshal-registration flow also has a manual "finish adding judges" step that no longer matches the desired workflow.

## What Changes

- Add a Settings tab for Ministry of Sport report defaults with editable organization name and organization address fields.
- Add an optional "Weapon" field to the global nomination directory and show it in the nomination table after "Name EN".
- Expand the nomination directory layout so the extra field fits without relying on horizontal scrolling, and tighten low-content columns.
- Remove the manual "Finish adding judges" workflow.
- Keep the "Add judges" action available while at least one tournament nomination registration is open, and make it available again if a nomination registration is reopened.
- Render tournament judges as a table with full name, category, and a single editable chief-judge checkbox while judging data is editable.
- Persist chief-judge selection; default the first added judge to chief judge and migrate existing tournaments by marking the first registered judge as chief.
- Add a tournament secretary text field below the tournament judges list, editable on the same rule as judge assignment and persisted on the tournament.
- Block nomination registration closing unless the tournament has at least one judge, exactly one chief judge, and a non-empty tournament secretary.
- Group tournament judges and secretary under a "Judging Corps" collapsible section.
- Collapse nomination sections when final nomination results are fixed, and collapse tournament-level disciplinary cards and judging corps when all tournament nominations are finished, while preserving manual reopen/close control through LocalStorage.
- **BREAKING**: Remove the old `is_marshals_registration_closed` manual lock as a behavior source and persistence contract.

## Relevant project skills

- `backend-architecture`
- `frontend-architecture`
- `marshal-registration`
- `competition-flow`
- `minimal-validation`

## Capabilities

### New Capabilities

- `settings/minsport-report-settings`: Stores and edits organization metadata for a future Ministry of Sport report.
- `settings/nomination-directory`: Manages nomination catalog fields and table behavior, including the optional weapon field.
- `tournaments/judging-corps`: Manages tournament judges, chief judge selection, tournament secretary, and registration-close prerequisites.
- `tournaments/completion-section-state`: Defines automatic collapsible-section state changes when nominations or tournaments are completed.

### Modified Capabilities

- None.

## Impact

- Backend persistence and API contracts for settings, nominations, tournament marshals, and tournaments.
- Frontend Settings page tabs and nomination directory layout.
- Tournament page judge/secretary UI, action visibility, and registration-close gating.
- Existing tournament report read models may need to continue compiling after marshal and tournament fields change, but the new Ministry of Sport fields are not rendered into any report in this change.
- Database schema/data migration must remove the manual judge-registration lock and backfill chief judges for existing tournament judge rows.
