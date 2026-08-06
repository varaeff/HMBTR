# Project Operating Policy

## Coding Rules

- Do not allow `any` type in coding.
- Never start an answer-wait timer when asking the user for clarification.
- Any code changes must account for the architectural constraints and
  recommendations described in the `backend-architecture` and
  `frontend-architecture` skills.
- Always use the `minimal-validation` skill when selecting tests and checks
  for code changes.

## Persistent Instruction Storage

1. Prefer this root `AGENTS.md` as the primary project instruction file.
2. Store and maintain long-term project instructions in this file.
3. Treat this file as the persistent operating policy for all future work in this repository.
4. Do not duplicate long-term instructions in `.codex-local/`.
5. Use `.agents/skills/` for reusable implementation knowledge and recurring patterns.
6. Use `.codex-local/` only for ephemeral local state:
   - temporary analysis
   - scratch notes
   - caches
   - generated intermediate artifacts
   - session-specific data

## Required Engineering Workflow

For every non-trivial implementation task, automatically execute this workflow.

### 1. Reconnaissance

Before making changes:

- analyze relevant parts of the codebase,
- inspect neighboring modules and existing abstractions,
- identify project conventions and architectural patterns,
- keep exploration proportional to task complexity,
- avoid unnecessary full-project scans.

The current implementation is the primary source of truth. If documentation conflicts with implementation, follow the implementation.

### 2. Skill Discovery

Search for relevant reusable knowledge in:

- `.agents/skills/`
- related documentation
- adjacent feature implementations

Look for:

- architectural patterns
- coding conventions
- integration approaches
- testing strategies
- debugging workflows
- performance optimizations
- reusable abstractions

Reuse existing project patterns whenever practical.

### 3. Implementation

If matching patterns or skills exist:

- follow them consistently,
- adapt them to the current implementation state,
- avoid unnecessary rewrites.

If no suitable pattern exists:

- design a maintainable solution using best practices for the current stack,
- maintain consistency with surrounding code,
- avoid introducing unnecessary abstractions.

### 4. Validation

Before finalizing:

- use the `minimal-validation` skill and choose the smallest sufficient
  validation set from `docs/validation-policy.md`,
- verify consistency with neighboring modules,
- check naming, typing, imports, architecture, and structure,
- avoid duplicated logic,
- ensure compatibility with existing conventions.

### 5. Knowledge Capture

After completing reusable or architecturally meaningful work:

- update an existing skill if relevant,
- otherwise create a new concise skill under `.agents/skills/`.

Document only reusable engineering knowledge, such as:

- architectural decisions
- integration patterns
- implementation workflows
- recurring fixes
- edge cases
- debugging techniques
- optimization patterns

Do not create skills for:

- trivial edits
- cosmetic changes
- isolated renames
- one-off fixes
- low-value refactors

Prefer extending existing skills over creating duplicates.

### 6. Skill Structure

Each skill should contain:

- context
- problem statement
- chosen approach
- implementation pattern
- constraints
- edge cases
- related files/modules
- maintenance considerations

Keep skills concise, practical, and implementation-oriented.

## Continuous Enforcement

Apply this workflow automatically for all future repository tasks without requiring repeated reminders.
