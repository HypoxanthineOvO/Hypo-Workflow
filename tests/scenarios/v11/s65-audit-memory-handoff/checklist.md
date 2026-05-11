# System Test Checklist: s65-audit-memory-handoff

- Scenario: `s65-audit-memory-handoff`
- Goal: Verify the M02 audit memory contract preserves user requirements and scoped handoff authority.

## Checks

- [ ] Cycle-level audit memory persists user requirements, project rules summary, and cycle decisions.
- [ ] Milestone-level audit delta persists local special requirements without replacing cycle memory.
- [ ] Real `.pipeline/audit-memory/C11-audit-memory.yaml` and `.pipeline/audit-memory/M02-audit-delta.yaml` authority files exist for current-cycle requirements and decisions.
- [ ] `/hw:plan`, `/hw:start`, and `/hw:resume` scoped summaries preserve user special requirements.
- [ ] Raw/free-form conversation is not treated as the only authority or source of truth.
- [ ] Contract coverage is enforced by a focused Node test.
