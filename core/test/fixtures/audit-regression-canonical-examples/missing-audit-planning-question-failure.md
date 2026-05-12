# Canonical Example: Missing Audit Planning Question Failure

## Failure Condition

P1 planning omits the mandatory P1 audit question group. The plan asks about
feature scope and implementation preferences, but it does not ask how audit
governance, blocked approval, worker separation, and rejection rework should be
handled for the Cycle.

Invalid P1 output:

```yaml
planning:
  phase: P1
  question_groups:
    - id: product_scope
      required: true
    - id: implementation_constraints
      required: true
  audit_question_group: null
```

Because the audit question group is missing, absent, or omitted, the planner
cannot enter P2. P2 decomposition and P3 prompt generation would otherwise lack
the audit contract needed to produce `orchestrator`, `test`, `implement`, and
`audit` prompt files for each milestone.

## Expected Governance Behavior

P1 must include a required audit question group before P1 can close. If the
group is absent, planning is blocked from entering P2 and must ask the user for
the missing audit decisions. P2 and P3 must echo the audit contract gathered in
P1, including execution subworker authorization, role separation mode,
audit-owned review expectations, and rejection rework behavior.

Generated prompt architecture must preserve the split roles. Rework prompts
must reference the original prompt and use rejection-driven incremental scope
instead of regenerating unrelated work.

## Helper And Contract References

- `references/subagent-spec.md`: plan-time artifacts must include `test`,
  `implement`, and `audit` role assignments and authorization boundaries.
- `references/audit-spec.md`: audit is a hard governance gate and blocked
  approval belongs to audit.
- Scenario `s66-plan-audit-interview-prompt-architecture`: verifies the P1
  audit question group and P2/P3 audit contract propagation.

## Executable Commands

```bash
node --test core/test/plan-audit-interview-prompt-architecture.test.js
bash tests/scenarios/v11/s66-plan-audit-interview-prompt-architecture/run.sh
```
