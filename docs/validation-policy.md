# Validation Policy

This project uses targeted validation. Do not run every check after every small
edit. Pick the smallest check set that covers the changed interface and the
likely failure mode.

## Check Matrix

| Change type | Minimum checks | Add when needed |
| --- | --- | --- |
| Type, model, DTO, shared contract, mapper, API adapter | `npm run check:no-any` and the relevant compile check | Focused tests for touched serialization, mapping, or contract behavior |
| Frontend TypeScript or Vue behavior | Focused Vitest spec if available, plus `npm run check:front:type` | `npm run check:front:build` for final validation, import graph, config, route, asset, or chunk-sensitive changes |
| Backend TypeScript behavior | Focused Jest spec if available, plus `npm run check:backend:build` | Integration tests for DB, Prisma, PDF/report generation, auth/session, or cross-service flows |
| Cross-layer frontend/backend/shared change | Relevant frontend and backend compile checks, plus focused tests around the touched contract | Frontend build or backend integration tests when the change affects runtime bundling, DB state, or external artifacts |
| Documentation, skills, comments only | Review the diff | No build or tests unless executable examples or commands changed |
| Final milestone or broad refactor | `npm run check:full` | Domain-specific integration/e2e checks only when the touched flow needs them |

## Default Commands

- `npm run check:no-any` checks explicit TypeScript `any` usage in non-generated
  project source. It is required when changing TypeScript/Vue implementation,
  types, DTOs, shared contracts, mappers, API adapters, casts, or generics.
- `npm run check:quick` is the default broad sanity pass: no explicit `any`,
  frontend type-check, and backend build.
- `npm run check:full` is the default final project pass for broad frontend or
  backend refactors.
- Use frontend `check:build` instead of `build` when type-check already ran.
  The existing frontend `build` script already repeats `type-check`.

## Lint Defaults

Existing `lint` scripts are mutating because they run ESLint with `--fix`.
They are not validation defaults.

Non-mutating `check:lint` scripts are available for local investigation, but
backend lint is not part of `check:quick` or `check:full` yet. The current
backend lint baseline is red because of Prettier line-ending errors and an
existing unused import. Treat that as separate cleanup work.

## Reporting

Do not keep a persistent manual log of every validation run. It will drift.
Report the checks actually run in the task summary, including failures,
timeouts, skipped checks, and known baseline warnings.
