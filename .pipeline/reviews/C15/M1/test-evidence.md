# C15-M1 Test Evidence

Worker: `test`

## Changed Test Files

- `core/test/p2-technical-route-contract.test.js`
  - Added focused content tests for the P2 Technical Route Gate contract.
  - Verifies P2 artifacts and docs require `technical_solution`, `technical_route`, `research_required`, `risks_and_alternatives`, `validation_path`, and `audit_focus`.
  - Verifies hard `research_required` signals block P2 proposed/P3 until resolved, asked as user blocking questions, or explicitly deferred by the user.
  - Verifies user challenges to a technical route route P2 back to `revision`/`in_progress`.
  - Verifies P3 Generate preserves P2 route fields into generated prompts.
  - Verifies ordinary single-feature `/hw:plan` remains simple and does not require Feature DAG.
- `core/test/progressive-discover.test.js`
  - Broadened existing worker-separation planning assertions to accept current Chinese contract wording while preserving the same semantic checks.

## Commands Run

```bash
uv run -- node --test core/test/p2-technical-route-contract.test.js
```

Result: pass, 6 tests passed.

```bash
uv run -- node --test core/test/progressive-discover.test.js core/test/batch-plan.test.js core/test/deep-plan-handoff.test.js
```

Result: pass, 21 tests passed.

```bash
rg -n "technical_route|technical_solution|research_required" skills/plan/SKILL.md skills/plan-decompose/SKILL.md skills/plan-generate/SKILL.md references/commands-spec.md
```

Result: pass, matches found in all required P2/P3 contract surfaces.

```bash
git diff --check -- core/test/p2-technical-route-contract.test.js core/test/progressive-discover.test.js
```

Result: pass.

## Gaps / Blockers

- No blockers remain in the focused test scope.
- These are content/contract assertions, not a full runtime simulation of an interactive P2 route challenge.
