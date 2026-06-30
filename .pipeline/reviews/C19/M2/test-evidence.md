# C19-M2 Test Evidence

Role: test worker

Scope:
- Added expected-failing contract tests only.
- Did not edit production code or source documentation.

Allowed files changed:
- `core/test/progressive-discover.test.js`
- `core/test/batch-plan.test.js`
- `.pipeline/reviews/C19/M2/test-evidence.md`

Contracts covered:
- Core exports deterministic `PLAN_PHASE_MODEL` constants for Discover, Technical Stack, Architecture, Decompose, Generate, and Implementation.
- Discover completion is not satisfied by `min_rounds` alone; it requires `scope_clarity`, `effect_clarity`, and `acceptance_clarity`.
- Visible phase output must include `stage_summary`, `decision_table`, and `open_questions` before the Question Tool / Ask gate.
- Core exports reusable renderers: `renderPlanPhaseFlow`, `renderMilestoneTable`, `renderDecisionMatrix`, and `renderDependencyMap`.

Expected failing command:

```bash
uv run -- node --test core/test/progressive-discover.test.js core/test/batch-plan.test.js
```

Expected failing signals before production implementation:
- `PLAN_PHASE_MODEL must be exported from core`
- `assessDiscoverCompletionGate must be exported`
- `validateVisiblePhaseGate must be exported`
- `renderPlanPhaseFlow must be exported`

Actual run:

```text
tests 20
pass 16
fail 4
```

Actual failing signals:
- `core/test/batch-plan.test.js`: `renderPlanPhaseFlow must be exported`
- `core/test/progressive-discover.test.js`: `PLAN_PHASE_MODEL must be exported from core`
- `core/test/progressive-discover.test.js`: `assessDiscoverCompletionGate must be exported`
- `core/test/progressive-discover.test.js`: `validateVisiblePhaseGate must be exported`

Notes:
- `core/test/batch-plan.test.js` was already modified in the worktree before this worker edited it. Existing changes were preserved.
- These failures are intentional red tests for the implement worker.

Final focused validation after implementation:

```bash
uv run -- node --test core/test/progressive-discover.test.js core/test/batch-plan.test.js
```

Result:

```text
tests 20
pass 20
fail 0
```

Final regression validation:

```bash
uv run -- node --test core/test/progressive-discover.test.js core/test/batch-plan.test.js core/test/commands-rules-artifacts.test.js core/test/docs-governance.test.js core/test/deep-plan-integration.test.js core/test/skill-spec.test.js core/test/readme-update.test.js && ruby -e 'require "yaml"; [".pipeline/state.yaml", ".pipeline/log.yaml", ".pipeline/cycle.yaml"].each { |f| Psych.unsafe_load_file(f); puts "#{f}: ok" }' && git diff --check
```

Result:

```text
tests 49
pass 49
fail 0
YAML parse ok
git diff --check passing
```
