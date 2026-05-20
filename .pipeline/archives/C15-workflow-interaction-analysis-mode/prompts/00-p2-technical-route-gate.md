# C15-M1 P2 Technical Route Gate

## Goal

Make P2 Decompose technically auditable. P2 must no longer be allowed to present only Milestone goals, acceptance criteria, or a feature queue and then ask for P3 confirmation.

## Technical Solution

Extend the P2 contract across `skills/plan/SKILL.md`, `skills/plan-decompose/SKILL.md`, `skills/plan-generate/SKILL.md`, `plan/PLAN-SKILL.md`, and `references/commands-spec.md` so each P2 Milestone has:

- `technical_solution`
- `technical_route`
- `research_required`
- `risks_and_alternatives`
- `validation_path`
- `audit_focus`

P2 may be `proposed` only when those fields exist and any `research_required` item is resolved, explicitly deferred by the user, or converted into a user-facing blocking question.

## Subworker Assignment Plan

Status: authorized. Worker Separation mode: recommended.

- `test`
  - Owns red/content tests that prove goal-only P2 checkpoints are rejected.
  - Must not edit implementation guidance after implementation begins.
  - Evidence path: `.pipeline/reviews/C15/M1/test-evidence.md`.
- `implement`
  - Owns edits to plan/decompose/generate skills, command spec, and planning contract text.
  - Must not create or rewrite test assertions owned by `test`.
  - Evidence path: `.pipeline/reviews/C15/M1/implementation-evidence.md`.
- `audit`
  - Reviews final diff, P2 route preservation, research-gate behavior, and worker identity separation.
  - Evidence path: `.pipeline/reviews/C15/M1/audit.md`.
- Main agent
  - Coordinates workers, integrates outputs, updates state/log/PROGRESS, and writes the final report.

## Required Steps

1. Read `.plan-state/decompose.yaml`, `.plan-state/technical-route.md`, `skills/plan/SKILL.md`, `skills/plan-decompose/SKILL.md`, `skills/plan-generate/SKILL.md`, `plan/PLAN-SKILL.md`, and `references/commands-spec.md`.
2. Add or strengthen the P2 technical route contract.
3. Ensure P3 Generate is required to preserve P2 route fields in generated prompts.
4. Add focused tests or content assertions for:
   - P2 must include technical solution and technical route.
   - research-required signals are a hard gate.
   - user challenge returns P2 to revision/in_progress instead of silently moving to P3.
5. Keep ordinary single-feature planning simple; do not introduce Feature DAG semantics outside batch planning.

## Validation

Run targeted checks:

```bash
uv run -- node --test core/test/progressive-discover.test.js core/test/batch-plan.test.js core/test/deep-plan-handoff.test.js
rg -n "technical_route|technical_solution|research_required" skills/plan/SKILL.md skills/plan-decompose/SKILL.md skills/plan-generate/SKILL.md references/commands-spec.md
```

Smoke expectation: a dry P2 fixture with an unknown external tool cannot become `proposed` without a user-facing question or explicit deferral.

## Completion Report Requirements

The final report must include: what changed, technical reasoning, files/modules touched, test design, validation result, expected behavior, problems encountered, and residual risks.
