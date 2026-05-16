# C15-M1 Test Rework Evidence

Worker: `test-rework`

## Audit Blocker Addressed

- Reworked `core/test/p2-technical-route-contract.test.js` so it no longer reads ignored or generated runtime state from `.plan-state/` or `.pipeline/prompts/`.
- Added portable fixtures under `core/test/fixtures/p2-technical-route/` for the P2 decompose contract, technical route review, and generated prompt preservation checks.
- Kept source/spec assertions against tracked contract surfaces under `skills/`, `plan/`, and `references/`.

## Coverage Preserved

- P2 requires `technical_solution`, `technical_route`, `research_required`, `risks_and_alternatives`, `validation_path`, and `audit_focus`.
- Hard `research_required` triggers block P2 proposed/P3 until resolved, asked, or explicitly deferred.
- User challenges to the technical route route P2 back to `revision`/`in_progress`.
- P3 Generate preserves P2 route fields in generated prompt content.
- Ordinary single-feature planning remains simple and must not require or display Feature DAG.

## Commands Run

```bash
uv run -- node --test core/test/p2-technical-route-contract.test.js
```

Result: pass, 6 tests passed.

```bash
uv run -- node --test core/test/progressive-discover.test.js core/test/batch-plan.test.js core/test/deep-plan-handoff.test.js core/test/p2-technical-route-contract.test.js
```

Result: pass, 27 tests passed.

```bash
rg -n "\\.plan-state|\\.pipeline/prompts" core/test/p2-technical-route-contract.test.js core/test/fixtures/p2-technical-route
```

Result: pass, no matches.

```bash
git diff --check -- core/test/p2-technical-route-contract.test.js core/test/fixtures .pipeline/reviews/C15/M1/test-rework-evidence.md
```

Result: pass.

Because these target files are currently untracked in this workspace, equivalent `git diff --no-index --check /dev/null <file>` checks were also run for the test, the three fixture files, and this evidence file.

Result: pass, no whitespace errors reported.

## Resolution

The audit blocker is resolved: the focused P2 route contract test is now portable to a clean checkout/CI environment and no longer depends on local ignored runtime artifacts.
