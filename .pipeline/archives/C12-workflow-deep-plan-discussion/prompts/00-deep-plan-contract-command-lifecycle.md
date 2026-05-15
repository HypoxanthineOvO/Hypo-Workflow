# M0 - Deep Plan 合同、命令入口与生命周期

## Objective

Define the C12 product contract for Deep Plan: `/hw:plan:deep` as canonical entry, `/hw:plan --deep` as alias, operation vocabulary, lifecycle states, and the boundary from `/hw:explore` and ordinary `/hw:plan`.

## Scope

- Add or update the command registry/specs so `/hw:plan:deep` is a first-class canonical command.
- Document the alias `/hw:plan --deep` without making ordinary `/hw:plan` skip P1-P4 gates.
- Define operations: `new`, `ask`, `research`, `map`, `drill`, `readiness`, `convert`.
- Define lifecycle states for a discussion package, for example `drafting`, `researching`, `architecture_mapping`, `module_drilldown`, `ready_for_plan`, `converted`, `archived`.
- Explicitly state: `/hw:explore` validates ideas in isolated worktrees; Deep Plan shapes requirements and architecture before experiments.

## Validation

- Command registry tests prove `/hw:plan:deep` exists and routes to a Plan skill.
- Contract tests prove the operation vocabulary and lifecycle states are exposed.
- Tests reject using `/hw:guide` or `/hw:explore` as the primary Deep Plan path.

## Subworker Assignment Plan

- `test`: owns red tests and fixtures for command registry, operation vocabulary, lifecycle states, and boundary rejection. Expected evidence: failing tests before implementation and passing tests after implementation. Handoff: `.pipeline/reviews/C12/M0/test-evidence.md`.
- `implement`: owns command/spec/skill contract edits only after test evidence exists. Must not create, edit, or rewrite test-owned assets. Handoff: `.pipeline/reviews/C12/M0/implementation-evidence.md`.
- `audit`: reviews final diff, command semantics, boundary clarity, test evidence, and worker separation. Handoff: `.pipeline/reviews/C12/M0/audit.md`.
- Main agent orchestrates lifecycle and integration only; it must not satisfy both implementation and validation roles.

## Audit Fields

- `audit_target`: Deep Plan command and lifecycle contract.
- `risk_hypotheses`: Deep Plan is confused with Explore; ordinary Plan gates are bypassed; alias becomes hidden behavior.
- `test_scenarios`: command lookup, generated artifacts, skill docs, boundary fixtures.
- `evidence_required`: failing/passing tests, command map diff, docs/spec excerpts.
- `independent_validator`: audit worker.
- `manual_checks`: read help/docs and confirm entry wording is understandable.
- `known_limits`: no full Deep Plan package runtime in this milestone.
