# System Test Checklist: s64-audit-governance-contract

- Scenario: `s64-audit-governance-contract`
- Goal: Verify the M01 audit governance contract is explicit in repo contracts before runtime implementation.

## Checks

- [ ] Audit may reject before milestone completion.
- [ ] Audit may reject `milestone`, `feature`, and `cycle`.
- [ ] `blocked` requires an `implement` proposal plus `audit` approval.
- [ ] Contract coverage is enforced by a focused Node test.
