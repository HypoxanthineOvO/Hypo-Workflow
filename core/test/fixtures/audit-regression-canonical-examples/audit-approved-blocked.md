# Canonical Example: Audit-Approved Blocked

## Failure Condition

An `implement` worker has a legitimate reason to stop, such as a missing
external credential or a user decision outside the milestone scope. The worker
may submit an implement proposal for `blocked`, but the proposal alone is not an
approved blocked runtime state.

Invalid evidence:

```yaml
blocked_request:
  status: blocked_proposed
  proposed_by_role: implement
  proposed_reason: external_dependency_unavailable
  approved_by_role: implement
```

This is a self-approve attempt. The runtime must not treat it as blocked because
only `audit` may approve a blocked transition.

## Expected Governance Behavior

`blocked_proposed` remains pending until an `audit` actor approves it. The gate
must reject or deny a blocked transition when `approved_by_role` is missing,
when it is `implement`, or when the approval evidence comes from the same worker
that authored the proposal. The authoritative state may become blocked only
after audit approval is present:

```yaml
blocked_request:
  status: blocked_approved
  proposed_by_role: implement
  approved_by_role: audit
  rationale_ref: .pipeline/acceptance/C11-M05-blocked-proposal.yaml
```

The run must not write `pipeline.status=blocked` or
`prompt_state.result=blocked` before audit approval exists.

## Helper And Contract References

- `references/audit-spec.md`: only `implement` may propose `blocked`; only
  `audit` may approve `blocked`; implement must never approve its own proposal.
- `references/state-contract.md`: `pipeline.status=blocked` and
  `prompt_state.result=blocked` are valid only for an audit-approved blocked
  outcome.
- Scenario `s64-audit-governance-contract`: verifies the audit governance
  contract and the blocked approval split.

## Executable Commands

```bash
node --test core/test/audit-governance-contract.test.js
bash tests/scenarios/v11/s64-audit-governance-contract/run.sh
```
