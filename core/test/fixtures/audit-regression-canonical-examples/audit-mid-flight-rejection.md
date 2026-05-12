# Canonical Example: Audit Mid-Flight Rejection

## Failure Condition

An `audit` worker detects a mid-flight rejection condition before milestone
completion: runtime evidence is insufficient, worker-separation evidence is
missing, or validation quality cannot support acceptance. The run must not mark
the milestone complete and must not continue to the next normal step.

The rejection artifact must be structured, not prose-only:

```yaml
schema_version: 1
cycle_id: C11
feature_id: F001
milestone_id: M05
scope: milestone
verdict: rejected
reasons:
  - code: TEST-01
    severity: warning
    summary: Rejection loop has no deterministic rework routing.
required_rework:
  - id: RW-01
    owner_roles: [test, implement]
    summary: Add deterministic rework routing and validation evidence.
blocked_request:
  status: none
audit:
  reviewer_role: audit
  verdict: needs_changes
  findings:
    - code: AUDIT-REWORK-01
      summary: Runtime would silently continue after rejection.
original_prompt_ref: .pipeline/prompts/04-orchestrator-rejection-rework-blocked-runtime-loop.md
created_at: 2026-05-11T10:00:00+08:00
```

## Expected Governance Behavior

The runtime reads the artifact and calls the rejection next-step resolver,
`resolveRejectionNextStep`, before selecting any follow-up step. For
`verdict=rejected` and the default reject action `needs_revision`, the next step
is deterministic rework, with `prompt_kind=rework`, `silent_continue=false`, and
`reason=cycle_rejected`.

This is the deterministic rework next step; it is not an advisory note and it
must run before any normal continuation.

The generated rework prompt must preserve `original_prompt_ref`, include the
active `prompt_ref`, and derive incremental scope from `required_rework`,
`reasons`, and `audit.findings`. Rework requires at least `test` and `implement`
workers, even if the rejection owner list is narrower.

## Helper And Contract References

- `references/audit-spec.md`: audit may reject before milestone completion and
  must produce or reference a structured rejection artifact.
- `references/state-contract.md`: `required_rework` and rejection next step
  rules define deterministic rework routing.
- Scenario `s68-rejection-rework-blocked-runtime-loop`: verifies structured
  rejection, next step routing, and rework prompt linkage.

## Executable Commands

```bash
node --test core/test/rejection-rework-blocked-runtime-loop.test.js
bash tests/scenarios/v11/s65-audit-memory-handoff/run.sh
bash tests/scenarios/v11/s68-rejection-rework-blocked-runtime-loop/run.sh
```
