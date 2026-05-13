# M2 - First-Principles Ask Engine 与浅层计划拒绝

## Objective

Build the Deep Plan `ask` loop that challenges unclear requirements from first principles and rejects pseudo-deep one-shot planning.

## Scope

- Challenge dimensions: necessity, minimum viable loop, falsifying evidence, essential-vs-habitual requirements.
- Do not default to asking “who is the user”.
- Record question rounds, answers, extracted decisions, unresolved ambiguity, and next recommended question.
- Add shallow-plan rejection when a discussion package has not met the target readiness depth.

## Validation

- Fixture tests simulate unclear requirements and verify repeated challenge rounds.
- Tests prove “who is the user” is not a default first-principles prompt.
- Tests reject immediate Milestone decomposition from shallow discussion state.

## Subworker Assignment Plan

- `test`: owns multi-round ask fixtures, shallow-plan rejection tests, and wording regression checks. Handoff: `.pipeline/reviews/C12/M2/test-evidence.md`.
- `implement`: owns ask engine helper and package update integration. Must not edit test-owned fixtures. Handoff: `.pipeline/reviews/C12/M2/implementation-evidence.md`.
- `audit`: reviews challenge quality, non-hostile interaction, rejection behavior, and role evidence. Handoff: `.pipeline/reviews/C12/M2/audit.md`.

## Audit Fields

- `audit_target`: first-principles ask loop.
- `risk_hypotheses`: endless questioning; hostile UX; shallow planning still passes; wrong default user question.
- `test_scenarios`: unclear request, partially answered request, ready request, pseudo-deep request.
- `evidence_required`: fixture snapshots, pass/fail outputs, extracted decision examples.
- `independent_validator`: audit worker.
- `manual_checks`: read sample questions for clarity.
- `known_limits`: no full Hypo-Agent manual scenario yet.
