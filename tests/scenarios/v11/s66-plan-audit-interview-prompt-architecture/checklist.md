# System Test Checklist: s66-plan-audit-interview-prompt-architecture

- Scenario: `s66-plan-audit-interview-prompt-architecture`
- Goal: Verify the M03 planning and prompt architecture contract is explicit before implementation.

## Checks

- [ ] P1 cannot complete without a mandatory audit question group.
- [ ] P2 and P3 echo the audit contract gathered in P1.
- [ ] Generated prompt architecture requires `orchestrator`, `test`, `implement`, and `audit` files per milestone.
- [ ] Rework prompts reference the original prompt and use rejection-driven incremental scope.
- [ ] Contract coverage is enforced by a focused Node test.
