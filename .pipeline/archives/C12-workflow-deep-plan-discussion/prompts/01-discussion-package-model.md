# M1 - Discussion Package 数据模型与持久化

## Objective

Implement durable Deep Plan discussion packages under `.pipeline/deep-plans/DPxxx-slug/` with active pointers, conversation summaries, structured decisions, tracks, readiness depth, and compact plan context.

## Scope

- Add core helpers to create, read, list, update, and archive Deep Plan packages.
- Preserve both conversation summaries and structured decisions.
- Store compact context for later ordinary Plan handoff.
- Do not create git worktrees; do not overwrite `.pipeline/state.yaml`, `.pipeline/cycle.yaml`, or `.pipeline/rules.yaml`.

## Validation

- Package tests create, read, list, update, and archive DP packages.
- Schema tests prove long summaries and compact structured context are retained separately.
- Boundary tests prove no Explore worktree is created and protected authority files are not unexpectedly written.

## Subworker Assignment Plan

- `test`: owns package lifecycle tests, schema fixtures, and protected-file boundary tests. Handoff: `.pipeline/reviews/C12/M1/test-evidence.md`.
- `implement`: owns `core/src/deep-plan/` package model and minimal exports. Must not edit test assets. Handoff: `.pipeline/reviews/C12/M1/implementation-evidence.md`.
- `audit`: reviews persistence semantics, protected file writes, and schema stability. Handoff: `.pipeline/reviews/C12/M1/audit.md`.

## Audit Fields

- `audit_target`: DP package data model and persistence.
- `risk_hypotheses`: package becomes transient only; raw conversation pollutes Plan prompt; protected files are mutated.
- `test_scenarios`: create/list/archive/update, malformed package, protected file snapshot.
- `evidence_required`: test output, example package fixture, file write list.
- `independent_validator`: audit worker.
- `manual_checks`: inspect generated DP fixture for human readability.
- `known_limits`: operations can be helper-level before full command integration.
