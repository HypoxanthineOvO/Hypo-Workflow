# C17-M0 Audit Baseline And Root Test Entry

## Goal

Make C17 remediation measurable and ensure the project can be tested from the repository root with `npm test`.

## Technical Solution

- Add root-level package metadata and npm scripts that delegate to existing core tests without changing runtime behavior.
- Add an audit inventory script/helper that captures hardcoded paths, duplicate helpers, workspace imports, parser split, ledger write patterns, and barrel export state.
- Record baseline counts before refactors so later milestones can prove reduction.

## Subworker Assignment Plan

Status: authorized. Worker Separation mode: recommended.

- `test`
  - Owns red tests for root `npm test` behavior and audit inventory output shape.
  - Must verify failure before implementation if root `npm test` is currently unavailable.
  - Evidence path: `.pipeline/reviews/C17/M0/test-evidence.md`.
- `implement`
  - Owns root package metadata, scripts, audit inventory helper/script, and minimal docs update for test entry.
  - Must not create or rewrite tests owned by `test`.
  - Evidence path: `.pipeline/reviews/C17/M0/implementation-evidence.md`.
- `audit`
  - Reviews package metadata scope, lockfile churn, audit inventory usefulness, and worker separation.
  - Evidence path: `.pipeline/reviews/C17/M0/audit.md`.
- Main agent
  - Coordinates workers, integrates outputs, updates lifecycle files, and writes the completion report.

## Technical Route

1. Inspect root package absence and existing `core/package.json`.
2. Add root `package.json` as private package with `npm test` delegating to the current core test command.
3. Add audit inventory helper/script for C17 closure scans.
4. Add focused tests for the inventory if implemented as a core helper.
5. Update README/developer docs only where needed for the root test command.

## Research Required

Status: none.

Evidence:

- `core/package.json` already defines `npm test` through `node --test core/test/*.test.js`.
- Repository root currently has no `package.json`.

## Risks And Alternatives

Risks:

- Root package metadata could conflict with `cli/` or `core/` package ownership.
- Package lock churn can obscure the actual remediation.

Rejected alternative: relying on `npm test --prefix core`; user explicitly requires root `npm test`.

## Validation

Run:

```bash
npm test
npm test --prefix core
git diff --check
```

Pass signal: root `npm test` and existing core tests pass from repository root.

## Audit Focus

- Root `npm test` must not depend on fragile working-directory hacks.
- Root package metadata must be private/minimal.
- No unrelated lockfile churn unless required and explained.

## Completion Report Requirements

Include changed files, test design, validation output, audit inventory baseline counts, expected behavior, and residual risks.
