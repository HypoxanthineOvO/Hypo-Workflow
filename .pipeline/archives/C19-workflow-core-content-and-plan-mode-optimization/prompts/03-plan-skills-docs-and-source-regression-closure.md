# C19-M4 Plan Skills Docs And Source Regression Closure

## Objective

Synchronize Skills, references, docs, architecture baseline, and source-side tests after command/model/adapter changes.

## Scope

- Update all Plan Skills and plan references to the new phase model.
- Refresh docs and command help references.
- Ensure `.pipeline/architecture.md` remains aligned with implementation.
- Run focused and full source-side regression.

## Technical Solution

Close source-side consistency across Skill authority, references, docs, generated artifacts, and tests before target adaptation.

## Technical Route

1. Search and update stale P1/P2/P3/P4 and confirm-command references.
2. Run focused command, progressive discover, adapter, and docs tests.
3. Run full `npm test` after focused tests pass.
4. Run `git diff --check`.
5. Produce source-side closure report and target adaptation discussion input.

## Research Required

Status: resolved.

Evidence:
- Relevant docs/tests were identified during Technical Stack and Architecture phases.

## Risks And Alternatives

- Risk: stale docs in generated command surfaces; mitigate with docs-governance and sync tests.
- Risk: broad wording churn; keep edits scoped to Plan/adapter/rules surfaces.

## Validation Path

Run:

```bash
uv run -- node --test core/test/progressive-discover.test.js core/test/p2-technical-route-contract.test.js core/test/commands-rules-artifacts.test.js core/test/docs-governance.test.js
npm test
git diff --check
```

Pass signal: focused and full regression pass with no whitespace errors.

## Audit Focus

- Skill/spec/docs are mutually consistent.
- No user-facing confirm command remains unless explicitly documented as removed/migrated.
- Architecture baseline matches implemented behavior.

## Subworker Assignment Plan

- `test`: owns focused and full source-side regression, including command/docs/adapter tests. Output evidence under `.pipeline/reviews/C19/M4/test-evidence.md`.
- `implement`: owns doc/Skill/reference synchronization and source closure report.
- `audit`: reviews consistency across Skills, specs, docs, tests, architecture baseline, and generated surfaces. Output audit under `.pipeline/reviews/C19/M4/audit.md`.
- Main agent: coordinates workers, records source closure, and prepares the M5 discussion gate.
