# Canonical Example: Cross-Role Test/Implement Rejection

## Failure Condition

Worker separation is enabled and one shared worker performs both `test` and
`implement` responsibilities, or one role changes files owned by the other
role. This is a cross-role ownership/scope violation even when the final command
passes.

Invalid worker evidence:

```yaml
runtime_workers:
  workers:
    - role: test
      worker_id: worker-17
      prompt_scope:
        - core/test/**
        - tests/**
      changed_files:
        - core/test/audit-regression-canonical-examples.test.js
    - role: implement
      worker_id: worker-17
      prompt_scope:
        - core/src/**
        - references/**
      changed_files:
        - core/test/fixtures/audit-regression-canonical-examples/audit-approved-blocked.md
```

The same shared worker identity is reused for `test` and `implement`, and the
implement role changed a fixture under test-owned assets. Acceptance evidence is
therefore rejected, blocked, or denied by the worker separation gate.

## Expected Governance Behavior

The gate rejects shared worker identity in recommended and strict modes,
rejects missing persisted `prompt_scope` or `changed_files`, ignores
runtime-only subtask observations, and rejects changed files outside each
role's declared scope. A valid no-op role must persist both `prompt_scope` and
`changed_files: []`; absence is not enough.

The main agent may orchestrate, but it must not impersonate `test` or
`implement` evidence after the fact. If role-sensitive evidence cannot be
preserved, the milestone remains blocked from acceptance until the role
evidence is repaired or the user explicitly downgrades worker separation.

## Helper And Contract References

- `references/subagent-spec.md`: `test` owns red tests, fixtures, snapshots,
  assertions, and validation evidence; `implement` owns production/runtime/docs
  implementation and must not edit test-owned assets.
- `references/state-contract.md`: `runtime_workers` mirrors persisted worker
  evidence and ignores runtime-only observations.
- Scenario `s67-worker-separation-spawn-enforcement`: verifies worker identity,
  lifecycle closure, prompt scope, and changed-file ownership checks.

## Executable Commands

```bash
node --test core/test/worker-separation-spawn-enforcement.test.js
bash tests/scenarios/v11/s67-worker-separation-spawn-enforcement/run.sh
```
