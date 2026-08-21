## Context

See `proposal.md` for motivation and scope. This change crosses Settings, nomination catalog data, tournament marshal assignment, nomination registration gating, and tournament-page collapsible state.

Current project knowledge that must guide implementation:

- `backend-architecture`
- `frontend-architecture`
- `marshal-registration`
- `competition-flow`
- `minimal-validation`

Current production deployment runs Prisma schema sync with `db push`, not migration history. This change keeps that deployment model. Schema shape changes are automatic at container startup, and the chief-judge data repair must run as a separate idempotent backfill after schema sync rather than through Prisma migrations.

## Goals / Non-Goals

**Goals:**

- Replace the manual judge-registration lock with an open-nomination-driven edit rule.
- Persist Ministry of Sport organization metadata without wiring it into any report output.
- Persist nomination weapon metadata without making it required for existing or new nominations.
- Persist a single chief judge per tournament and a free-text tournament secretary.
- Enforce judge, chief judge, and secretary prerequisites both in the UI and backend when closing nomination registration.
- Make completion-driven collapsible state deterministic while keeping user manual overrides after completion.

**Non-Goals:**

- Do not implement the Ministry of Sport report itself.
- Do not add marshal category management.
- Do not convert the free-text tournament secretary into a user or marshal relation.
- Do not introduce a full migration framework as part of this change.
- Do not switch production deployment from `prisma db push` to Prisma migrations in this change.

## Decisions

### Store Ministry of Sport settings in a typed singleton settings record

Add a typed singleton persistence shape for Ministry of Sport report settings, similar in spirit to the existing disciplinary-card settings singleton. The API should expose a read and update contract with `organization_name` and `organization_address`, each allowing empty multiline text up to 2000 characters.

Alternative considered: a generic key-value settings table. Rejected for this change because the existing settings module uses typed contracts, and these two fields are stable domain fields rather than arbitrary runtime configuration.

### Add `weapon` directly to nominations

Add an optional text field to nomination definitions and include it in nomination create/update/read contracts. Existing nominations can keep it empty. The field should not affect tournament membership, scoring, ratings, or fight snapshots.

Alternative considered: a separate nomination-details table. Rejected because weapon is a simple catalog attribute with the same lifecycle as nomination names.

### Remove the manual marshal-registration lock from behavior and schema

Remove the `is_marshals_registration_closed` behavior path and the finish-registration endpoint/action. Judge editability becomes a derived rule: authorized users can edit the judging corps while any tournament nomination registration is open. If a nomination registration is reopened, judge and secretary editability returns.

This intentionally conflicts with the current `marshal-registration` skill rule that describes `Finish adding marshals`. The new OpenSpec change supersedes that rule for this workflow. After implementation and archive, update the skill so future agents do not preserve the obsolete lock.

Alternative considered: leave the field as an ignored compatibility column. Rejected because the user explicitly chose full removal of the old flag and manual blocking mechanism.

### Persist chief judge on tournament marshal assignment

Add a boolean chief-judge marker to tournament judge assignments. The first registered judge for a tournament is created as chief. Later registrations default to non-chief. Setting a judge as chief should update the chosen row and clear the marker on every other row for the same tournament in one backend operation.

If the chief judge is deleted, no replacement is selected automatically. This makes the missing chief visible and lets registration-close validation block until staff make an explicit choice.

Alternative considered: storing `chief_marshal_id` on tournaments. Rejected because the chief role belongs to the tournament assignment row and should be deleted naturally when that assignment is removed.

### Keep `db push` and add an application-owned chief-judge backfill

Do not introduce Prisma migrations for this change. Keep the existing production startup contract where the backend entrypoint runs `prisma db push --accept-data-loss`. After `db push` has made the new chief-judge column available, run an idempotent backfill that marks the lowest-id tournament judge assignment as chief for each tournament that has at least one judge and no chief judge.

The backfill must be safe to run repeatedly: it must not change tournaments that already have a chief judge, and it must not assign more than one chief judge per tournament. It may live in the backend startup path or a narrowly scoped startup data-repair service, but it must run automatically in production after schema sync and before staff depend on close-registration validation.

Alternative considered: switching deployment to Prisma migrations and placing the backfill in migration SQL. Rejected for this change because the requested path is to stay on `db push`; migration adoption can be handled as a separate production-hardening change.

### Store tournament secretary as free text on tournaments

Add a nullable text field on tournaments for the tournament secretary name. Treat blank or whitespace-only input as missing for registration-close validation. The field is editable while judging corps editability is open and read-only after all nomination registrations close.

Alternative considered: relate secretary to `users` or `marshals`. Rejected because the requirement asks for one text input and database storage in text form.

### Centralize registration-close prerequisites in backend validation

Closing nomination registration must validate a complete judging corps in the backend: at least one tournament judge, exactly one chief judge, and non-empty secretary. The frontend should mirror these checks only for visibility, disabled state, and user hints.

This follows `competition-flow`: the frontend exposes allowed actions, but the backend remains authoritative for state transitions.

### Use persisted collapsible state helpers with completion-driven overrides

Extend the existing collapsible LocalStorage pattern so completion actions can explicitly write closed state for affected keys. After completion, manual user changes continue to write their chosen state. On initial view, finished nominations and fully finished tournaments default to closed when no saved state exists.

Alternative considered: collapse only in current memory without touching LocalStorage. Rejected because it would reopen old saved `true` state after reload, contradicting the desired completed view.

## Risks / Trade-offs

- Production `db push --accept-data-loss` can drop the removed manual-lock column without a migration prompt -> confirm the field is no longer read anywhere before deployment and take a production backup before destructive schema sync.
- `db push` will not backfill chief judges -> keep `db push`, then run an idempotent application-owned backfill that marks the first existing tournament judge as chief only for tournaments that have judges and no chief.
- Chief-judge uniqueness can be violated by concurrent updates if only handled client-side -> enforce single-chief updates in backend persistence, preferably transactionally.
- Removing the finish-registration endpoint may leave stale frontend/shared route constants or tests -> remove all callers and update focused tests around tournament marshal registration.
- Collapsible keys must remain stable across route changes and active nomination changes -> define keys from tournament id, nomination id, and section identity, and cover key behavior with focused frontend tests where practical.

## Migration Plan

1. Add the new schema fields and remove the old manual-lock field from the Prisma schema.
2. Keep the existing production `db push` startup schema sync; do not add Prisma migrations for this change.
3. Add an automatic idempotent backfill path that runs after schema sync and marks the lowest-id assignment per tournament as chief when that tournament has judges and no chief exists.
4. Remove UI and API behavior that writes or reads the old manual-lock field.
5. Deploy with the existing backend entrypoint `db push` schema sync, then let the idempotent backfill run.
6. Rollback requires reverting code and schema. Because the old lock column is removed destructively, restore from backup if production data from that column is unexpectedly needed.
