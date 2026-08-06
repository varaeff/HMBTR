---
name: minimal-validation
description: Select the smallest sufficient HMBTR validation commands after code changes. Use when Codex changes backend, frontend, shared TypeScript, generated contracts, docs, skills, or tests and needs to decide which focused tests/build/type checks to run without defaulting to every check.
---

# Minimal Validation

## Context

HMBTR uses targeted validation. The source of truth is `docs/validation-policy.md`; this skill turns that policy into a repeatable development workflow.

## Problem Statement

Running all checks after every change slows development and hides the signal from the touched behavior. Validation should cover the changed interface and likely failure mode, while avoiding broad suites unless the change is broad or final-milestone risky.

## Chosen Approach

Start from the smallest focused check that can fail for the changed behavior. Add compile/type/no-`any` checks when a contract or TypeScript surface changed. Run broad checks only for broad refactors, cross-layer contracts, final milestones, or when focused checks cannot cover the risk.

## Implementation Pattern

1. Read `docs/validation-policy.md` before choosing commands.
2. Classify the change by touched surface: backend behavior, frontend behavior, shared contract, DTO/model/mapper/API adapter, docs/skills only, or broad refactor.
3. Prefer focused tests colocated with the changed behavior:
   - backend: `npm --prefix backend test -- <spec files> --runInBand`;
   - frontend: `npm --prefix front run check:unit -- <spec-file>`.
4. Add `npm run check:no-any` for TypeScript/Vue implementation, DTO, model, mapper, shared contract, cast, generic, or type changes.
5. Add compile checks for touched runtime:
   - backend: `npm run check:backend:build`;
   - frontend: `npm run check:front:type`;
   - cross-layer: relevant backend and frontend compile checks.
6. Use `npm run check:front:build` only when Vite config, route chunks, assets, imports, bundling, or final frontend packaging can fail beyond type-check.
7. Use backend integration tests only for DB/Prisma persistence contracts, HTTP controller/DTO/guard flows, reports/PDF, auth/session, or cross-service side effects that unit tests cannot cover.
8. For docs, skills, and comments only, review the diff. Do not run builds or tests unless executable examples or commands changed.
9. Report exactly what ran, including failures, skipped broader checks, timeouts, and known baseline warnings.

## Constraints

- Do not run every available check by default.
- Do not use mutating lint scripts as validation defaults.
- Do not use persistent manual validation logs.
- Do not introduce `any`.

## Edge Cases

- If a focused test does not exist, run the closest compile/type check and state that no focused spec exists.
- If a focused test fails because of unrelated baseline issues, isolate with a narrower command or report the baseline separately.
- If a change touches generated Prisma output only because the schema/client changed, validate the owning schema/build path, not every generated file.
- If a small change follows a larger dirty worktree, choose checks for the files and behavior actually touched in the current task, unless the existing dirty state affects that behavior.

## Related Files

- `docs/validation-policy.md`
- `backend/src/**/*.spec.ts`
- `front/src/**/*.spec.ts`
- `scripts/check-no-explicit-any.mjs`

## Maintenance

Update this skill whenever `docs/validation-policy.md` changes or when repeated validation choices prove too broad or too narrow.
