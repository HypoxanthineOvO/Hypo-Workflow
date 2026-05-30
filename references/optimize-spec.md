# Optimize Spec

Use this reference for `/hw:optimize`, the closed-loop quality optimization workflow.

## Purpose

`/hw:optimize` coordinates sustained quality improvement while preserving correctness. It runs this canonical loop:

```text
Audit + Quality -> Optimize Implement/Test -> Audit + Quality
```

It is not a background optimizer and not permission for broad unbounded refactoring.

## Required Start Contract

Before implementation starts, record:

- scope and non-goals
- correctness contract
- backup or recovery strategy
- validation path
- budget: iteration count, time, files, diff size, or risk boundary
- mode: manual, semi-auto, or auto
- handoff rule for Patch and Plan

If any item is missing, stop and ask. Do not edit code.

## State

Persist optimize state under:

- `.pipeline/quality/optimize-state.yaml`
- `.pipeline/quality/actions.yaml`
- `.pipeline/quality/quality-NNN.md`
- `.pipeline/audits/audit-NNN.md`
- `.pipeline/reviews/<cycle>/<milestone>/`

State shape:

```yaml
schema_version: "1"
status: active | stopped | completed | blocked
scope: []
correctness_contract: []
backup:
  strategy: git-diff | branch | archive | user-confirmed
budget:
  max_iterations: 3
  max_files: null
validation:
  commands: []
baseline:
  audit_report: null
  quality_report: null
iterations:
  - index: 1
    actions: []
    validation: []
    post_audit: null
    post_quality: null
```

## Loop

1. Run or load Audit baseline.
2. Run or load Quality baseline.
3. Select bounded actions from the Action Queue.
4. Ask `test` worker to define or validate the real test method.
5. Ask `implement` worker to make scoped production/runtime/docs changes only.
6. Run validation.
7. Run post-change Audit and Quality.
8. Compare:
   - correctness preserved
   - quality improved or justified
   - no new Critical/Warning risk without accepted defer
9. Continue only if budget remains and next action is still bounded.

## Stop Conditions

Stop when:

- Overall Quality >= 4 and core dimensions >= 3
- Critical Audit finding appears
- validation fails and repair is not local/safe
- scope grows beyond the start contract
- budget is exhausted
- target change should become `/hw:plan`
- user pauses or rejects direction

## Routing

- `/hw:patch`: one or a few narrow fixes with clear validation.
- `/hw:plan`: broad refactor, architecture change, unclear boundary, migration, or multi-module redesign.
- `/hw:quality`: scorecard, baseline, compare, or action queue without implementation.
- `/hw:audit`: risk governance or acceptance-blocking findings.

## Worker Separation

- `test`: owns validation method, test evidence, pseudo-test rejection, failure/green evidence.
- `implement`: owns scoped implementation only and must not create, edit, or rewrite tests, fixtures, snapshots, assertions, or validation evidence.
- `audit`: read-only final risk and evidence review.
- The main agent coordinates, updates lifecycle files, and stops at gates.

## Report Template

```markdown
# Optimize Report — YYYY-MM-DD

## Start Contract
- Scope:
- Correctness contract:
- Backup:
- Budget:
- Validation:

## Baseline
- Audit:
- Quality:

## Iterations
| Iteration | Actions | Validation | Quality Delta | Audit Result |
|---:|---|---|---|---|

## Stop Reason
- completed / budget_exhausted / blocked / routed_to_plan / routed_to_patch

## Follow-Up
- Action Queue:
- Deferred:
```
