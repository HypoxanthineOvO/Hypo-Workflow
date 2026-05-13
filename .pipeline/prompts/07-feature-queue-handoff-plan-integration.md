# M7 - Feature Queue Handoff 与普通 Plan 集成

## Objective

Connect Deep Plan `convert` output to existing Feature Queue and ordinary Plan flow so execution order, acceptance depth, test matrix, and risks survive the transition.

## Scope

- Consume compact Deep Plan context in batch/Feature Queue planning.
- Preserve readiness depth per Feature.
- Allow directional items to stay parked while implementation-ready items enter queue.
- Ensure ordinary Plan receives risks, unknowns, and pseudo-test rejection policy.

## Validation

- Batch plan tests consume Deep Plan convert context and produce ordered Feature Queue drafts.
- Tests prove parked directional items do not become executable Milestones.
- Audit fixtures reject conversion when target depth requires missing artifacts.

## Subworker Assignment Plan

- `test`: owns handoff, queue, depth, and audit rejection tests. Handoff: `.pipeline/reviews/C12/M7/test-evidence.md`.
- `implement`: owns integration with batch-plan/progressive-discover and Plan context loading. Must not edit test assets. Handoff: `.pipeline/reviews/C12/M7/implementation-evidence.md`.
- `audit`: reviews transition boundary and Feature Queue correctness. Handoff: `.pipeline/reviews/C12/M7/audit.md`.

## Audit Fields

- `audit_target`: Deep Plan to ordinary Plan handoff.
- `risk_hypotheses`: unresolved risks disappear; parked items become executable; acceptance depth is lost.
- `test_scenarios`: mixed readiness package, implementation-ready package, missing test matrix package.
- `evidence_required`: queue fixtures, tests, convert context examples.
- `independent_validator`: audit worker.
- `manual_checks`: inspect generated Feature Queue draft.
- `known_limits`: final Hypo-Agent playbook is M8.
