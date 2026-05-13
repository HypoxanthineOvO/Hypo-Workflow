# M5 - Drill、Readiness Depth 与 Convert Gate

## Objective

Implement explicit `drill`, depth-aware `readiness`, and explicit `convert` gate from Deep Plan discussion package to ordinary Plan context.

## Scope

- `drill <module-or-topic>` scopes questions and updates only that module/topic card.
- Readiness levels: `directional`, `architecture-ready`, `implementation-ready`.
- Readiness distinguishes intentional blanks from blockers based on target depth.
- `convert` emits compact ordinary Plan context with Feature Queue draft, test matrix, acceptance depth, risks, and unresolved items.

## Validation

- Drill tests prove scoped updates and no unrelated track mutation.
- Readiness tests prove blocker behavior changes by target depth.
- Convert tests prove compact context includes Feature Queue, tests, acceptance depth, and risks.
- Carry-forward tests prove archived active-package semantics are explicit before `convert` runs.
- Carry-forward tests prove loaded `package_path` metadata cannot escape `.pipeline/deep-plans/DPxxx-slug/`.

## Subworker Assignment Plan

- `test`: owns drill, readiness, and convert tests with pseudo-test rejection fixtures. Handoff: `.pipeline/reviews/C12/M5/test-evidence.md`.
- `implement`: owns operation helpers and package state transitions. Must not edit test fixtures. Handoff: `.pipeline/reviews/C12/M5/implementation-evidence.md`.
- `audit`: reviews conversion boundary, readiness depth, and acceptance risk surfacing. Handoff: `.pipeline/reviews/C12/M5/audit.md`.

## Audit Fields

- `audit_target`: drill/readiness/convert behavior.
- `risk_hypotheses`: convert hides unknowns; directional mode is mistaken as implementation-ready; drill leaks scope.
- `test_scenarios`: directional package, architecture-ready package, implementation-ready package, scoped module drill, archived-active package, tampered package_path metadata.
- `evidence_required`: tests, convert context fixture, readiness report.
- `independent_validator`: audit worker.
- `manual_checks`: inspect readiness output for clear next action.
- `known_limits`: ordinary Plan prompt generation integration is in M7; M1 left active archive semantics and package_path boundary validation for this milestone.
