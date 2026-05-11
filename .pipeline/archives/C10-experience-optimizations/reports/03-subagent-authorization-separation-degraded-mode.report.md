# M3 Report - Subagent 授权、隔离与降级治理

## Result

pass

## Summary

M3 tightened the Subagent governance contract. It now explicitly connects `P0 Configure` to Subagent authorization, documents implement/test/audit role separation, hides test source from implementation Subagents, and requires user-confirmed degraded mode when strict separation cannot be satisfied.

## Changed Areas

- `references/subagent-spec.md`
- `core/test/subagent-separation-contract.test.js`

## Validation

- `node --test core/test/subagent-separation-contract.test.js` - pass, 2 tests.
- `node --test core/test/subagent-separation-contract.test.js core/test/codex-subagent-discipline.test.js core/test/review-artifacts.test.js core/test/explain-subagent.test.js` - pass, 18 tests.
- `bash scripts/validate-config.sh .pipeline/config.yaml` - pass.
- `git diff --check` - pass.

## Evidence

- Subagent spec now states `P0 Configure` asks for Subagent authorization before P1 Discover.
- Implementation Subagents must not read test source, fixtures, snapshots, or assertion details.
- Test/review/audit Subagents may read test source and final diff for validation roles.
- Degraded mode requires explicit user confirmation and report/log/state evidence.

## Subagent And Separation

- Actual Subagent delegation was not launched because this session did not explicitly authorize spawning Subagents.
- The contract now requires future executions to record this kind of non-delegation rationale.

## Residual Risk

- The contract does not implement cross-platform sandbox enforcement. It defines prompt, report, and execution discipline that host agents must follow.
