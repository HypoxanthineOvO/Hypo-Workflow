# M3 - Research 只读证据流

## Objective

Implement Deep Plan `research` semantics for local read-only repo/history/docs investigation that writes evidence into the discussion package.

## Scope

- Record evidence refs, findings, unknowns, searched surfaces, and source boundaries.
- Default allowed actions: read repository files, inspect archives, search local docs/tests.
- Block or require confirmation for code edits, service restarts, remote access, destructive or external side effects.
- Integrate compact Knowledge references without copying full discussion bodies into every context.

## Validation

- Tests prove research records evidence refs and unknowns.
- Boundary tests reject write/restart/remote actions without explicit policy.
- Knowledge tests prove compact references can be indexed safely.

## Subworker Assignment Plan

- `test`: owns read-only boundary tests, evidence fixture tests, and Knowledge reference tests. Handoff: `.pipeline/reviews/C12/M3/test-evidence.md`.
- `implement`: owns research operation helpers and evidence recording. Must not edit test-owned assets. Handoff: `.pipeline/reviews/C12/M3/implementation-evidence.md`.
- `audit`: reviews side-effect boundaries, evidence quality, and secret-safe behavior. Handoff: `.pipeline/reviews/C12/M3/audit.md`.

## Audit Fields

- `audit_target`: Deep Plan local research flow.
- `risk_hypotheses`: research silently edits files; remote access bypasses gates; evidence is not traceable.
- `test_scenarios`: local docs search, archive inspection, blocked write action, compact evidence.
- `evidence_required`: tests, example research entry, boundary decision table.
- `independent_validator`: audit worker.
- `manual_checks`: inspect a sample research entry for traceability.
- `known_limits`: full live web research is out of scope.
