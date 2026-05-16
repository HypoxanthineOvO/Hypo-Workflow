# C15-M1 Implementation Evidence

Worker: `implement`

## Scope

Edited only authorized guidance/spec files:

- `skills/plan/SKILL.md`
- `skills/plan-decompose/SKILL.md`
- `skills/plan-generate/SKILL.md`
- `plan/PLAN-SKILL.md`
- `references/commands-spec.md`

No tests, source JS files, or protected workflow state files were edited.

## Implemented Contract

- P2 Decompose now requires every implementation milestone to include:
  - `technical_solution`
  - `technical_route`
  - `research_required`
  - `risks_and_alternatives`
  - `validation_path`
  - `audit_focus`
- Goal-only P2 checkpoints are explicitly rejected from `proposed`.
- Unknown tools, external services, third-party libraries, platform capabilities, and user-private schemas are hard `research_required` triggers.
- Active blocking research questions can be shown as a waiting P2 checkpoint, but cannot be confirmed or carried into P3.
- User challenges to a technical route return P2 to `revision` or `in_progress`, require challenge recording, targeted research, and a revised checkpoint.
- P3 Generate must preserve P2 technical route/research fields in generated prompts and stop back to P2 revision if required fields or research gates are missing.
- Ordinary single-feature planning remains simple; Feature DAG semantics remain limited to batch planning.

## Checks

Ran:

```bash
rg -n "technical_route|technical_solution|research_required|risks_and_alternatives|validation_path|audit_focus|goal-only|blocking research|Feature DAG" skills/plan/SKILL.md skills/plan-decompose/SKILL.md skills/plan-generate/SKILL.md plan/PLAN-SKILL.md references/commands-spec.md
git diff --check -- skills/plan/SKILL.md skills/plan-decompose/SKILL.md skills/plan-generate/SKILL.md plan/PLAN-SKILL.md references/commands-spec.md
```

Result:

- Content check found the required contract terms across all five target files.
- `git diff --check` passed with no whitespace errors.

## Gaps

- Did not edit or run test-owned assertions; test worker owns tests for this milestone.
- No runtime JS behavior was changed in this worker.
