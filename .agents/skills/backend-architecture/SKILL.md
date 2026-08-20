---
name: backend-architecture
description: Backend module architecture and refactoring guidance for HMBTR. Use when creating or refactoring backend services, NestJS modules, business logic, transaction flows, persistence orchestration, tests, or internal providers, especially to avoid supermodules, mixed responsibilities, duplication, and overengineering.
---

# Backend Architecture

## Context

Backend code should be easy to navigate by business task. A public service may be a stable facade, but real behavior should live in cohesive collaborators with narrow responsibilities.

## Core Rules

- Keep public API stability separate from internal architecture. Preserve controllers, DTOs, module exports, routes, and response shapes unless the user explicitly asks to change them.
- Avoid supermodules and god-services. If a service owns unrelated reads, state transitions, validation, persistence, scoring, ranking, and side effects, split it.
- Avoid mixed responsibility. Put state reads, validation, domain calculation, persistence, lifecycle transitions, and external side effects into separate owners.
- Avoid duplication before adding abstractions. Extract shared helpers only when the same rule appears in multiple real places.
- Avoid overengineering. Do not add pass-through layers, empty barrels, generic frameworks, or abstractions that do not remove real complexity.
- Do not introduce `any`. Type Prisma payloads, DTO-derived shapes, and internal helper results explicitly.
- Keep comments short and local to non-obvious domain rules. Do not narrate obvious code.
- Let tests follow architecture. Test pure helpers and focused internal services directly; keep facade tests minimal and compatibility-oriented.

## Preferred Module Shape

Use this structure for complex backend modules:

- Root controller: route mapping and DTO boundary only.
- Root public service: facade over use cases, preserving public methods.
- Root module: registers internal providers and exports only the public service unless another export is intentionally part of the API.
- Internal type/constants files: shared contracts, lifecycle constants, status constants, transaction aliases.
- Pure logic files: deterministic domain algorithms without Nest or Prisma.
- Task-oriented service folders: one folder per business capability, not per technical accident.

Prefer task names over vague names:

- `state/*` for current-state reads and shared query readers.
- `results/*` for submission validation, result evaluation, persistence, fixation.
- `rankings/*` for standings, tie detection, advancement, manual tie resolution.
- `lifecycle/*` for rollback/cancel/backward flows.
- `finish/*` for finalization and completion workflows.
- `red-cards/*` or similar domain folders for domain side effects and policy.
- `withdrawals/*` for nomination-scoped no-show/fight withdrawal state,
  withdrawal-generated forfeits, and withdrawal cancelation/cleanup policy.
- `reports/*` for report orchestration, storage/cache, read-model queries, markdown/PDF formatting, and report-specific normalization.

## Report And Read-Model Services

For report-heavy modules, keep rendering separate from business lifecycle:

- Use one report facade to orchestrate cache lookup, read-model loading, validation, rendering, and storage.
- Put large Prisma include trees into a reader service with an explicit internal result type.
- Put cache/table checks and raw SQL persistence into a storage service.
- Put markdown/table/text formatting into formatters or builders, not into CRUD services.
- Keep compatibility normalizers local to the report flow when they exist only to repair old display/order data.

## Decomposition Heuristics

Split a file when two or more are true:

- It has multiple reasons to change.
- Methods naturally form task groups with different vocabulary.
- Private helpers are tested through casts.
- Different methods repeat the same query shape, transition check, reset logic, or persistence sequence.
- A bug fix in one flow risks unrelated flows because the file is too broad.
- Reading the file requires holding several independent state machines in memory.

Do not split when:

- The new service would only forward one method without owning behavior.
- The split hides a short cohesive algorithm behind more DI noise.
- The abstraction is generic but only one concrete use exists.

## Refactoring Workflow

1. Inspect the current implementation first. Treat code as source of truth.
2. Identify public API boundaries and mark them as stable.
3. Group methods by business task and data ownership.
4. Extract pure domain rules before moving orchestration.
5. Extract collaborators one responsibility at a time.
6. Replace private-method tests with direct tests for the new pure helper or internal service.
7. Keep behavior fixed while moving code: same errors, same transitions, same response shape.
8. Remove obsolete orchestration services when they stop owning real workflow.
9. Run focused lint/tests/build after meaningful moves.
10. Check for `any`, dead imports, duplicate helpers, and accidental changes outside scope.

## Duplication Removal Pattern

Extract small shared helpers for repeated technical rules:

- optimistic transition helpers for `updateMany(...).count !== 1`;
- fixed-state checkers shared across similar lifecycle flows;
- persistence helpers for repeated child-row replacement;
- reset helpers for score columns, warnings, forfeits, and lifecycle cleanup;
- typed Prisma include/select shapes used by several collaborators.

Keep extracted helpers close to the module unless they are truly cross-module.

## Facade Pattern

Use a facade when callers need a stable single entry point but the implementation has multiple use cases.

- The facade delegates and returns collaborator results unchanged.
- The facade should not accumulate private business helpers.
- Collaborators may depend on each other only through narrow methods.
- If an orchestrator remains, it must own a real cross-use-case transaction, not become a dumping ground.

## Validation

Use the `minimal-validation` skill and `docs/validation-policy.md` before
choosing checks. Prefer the smallest focused validation set that covers the
changed backend behavior.

For backend refactors, prefer focused checks from the affected package:

```sh
npx --no-install eslint "src/<module>/**/*.ts"
npm test -- <focused specs> --runInBand
npm run build
rg "\bany\b" src/<module>
```

Avoid broad auto-fix commands when the requested scope is narrow.

## Integration Tests

Use integration tests when unit tests cannot cover the contract between guards,
controllers, DTO validation, services, Prisma persistence, and side effects.

- Keep integration tests on a separate database and a separate script. Do not reuse the local dev database.
- Prefer `prisma db push --force-reset` for disposable test databases when migrations are not the source of truth yet.
- Seed data through Prisma fixtures, then exercise the system through HTTP routes.
- Keep fixtures explicit and typed; avoid hidden global state and `any`.
- Mock external IO at the edge, such as email delivery or PDF rendering, while preserving real internal formatting/read-model code.
- Test a few high-value vertical flows rather than duplicating every unit scenario.
- Ensure Nest app shutdown closes Prisma and the underlying `pg.Pool`, otherwise Jest can pass while leaving open handles.
- Keep transaction aliases based on generated `PrismaClient`, not Nest-specific `PrismaService`, so lifecycle hooks do not leak into transaction types.
