# C19-M2 Structured Phase Artifacts And Adaptive Gates

## Objective

Implement the structured phase model, visible-output contracts, adaptive Discover completion gates, and diagram/table artifact contracts.

## Scope

- Extend `core/src/progressive-discover/index.js` with Plan Phase Model constants and gate/visible-output contracts.
- Represent Discover completion by scope/effect/acceptance clarity instead of rigid fixed rounds.
- Define required visible outputs: stage summary, decision table, open questions, and optional diagrams.
- Extend graph/table helpers or expose reusable renderers for phase flow, milestone tables, decision matrices, and dependency maps.

## Technical Solution

Add deterministic contracts in core helpers so Skills and adapters can rely on a tested phase model instead of only Markdown instructions.

## Technical Route

1. Add phase constants for Discover, Technical Stack, Architecture, Decompose, Generate, and Implementation.
2. Add completion/gate contract helpers for adaptive Discover and visible phase outputs.
3. Add or expose table/graph render helpers for required plan artifacts.
4. Update Progressive Discover spec and tests to reject fixed-round-only completion.

## Research Required

Status: resolved.

Evidence:
- `core/src/progressive-discover/index.js` currently defines P0, big questions, stages, and `min_rounds`.
- `core/src/batch-plan/index.js` already renders Markdown tables and Mermaid graphs.

## Risks And Alternatives

- Risk: over-abstracting phase model; keep helper deterministic and small.
- Risk: tests only check text; include structured helper outputs and artifact examples.
- Alternative rejected: Skill-only changes; rejected because user selected Skills + core + schema.

## Validation Path

Run:

```bash
uv run -- node --test core/test/progressive-discover.test.js core/test/batch-plan.test.js
```

Pass signal: tests prove new phases, adaptive gates, and graph/table artifacts are available and deterministic.

## Audit Focus

- No return to rigid min-round-only Discover.
- Visible outputs are required before phase gates.
- Core remains deterministic helper, not runner.

## Subworker Assignment Plan

- `test`: owns progressive-discover and batch-plan contract tests, including adaptive gate and visible-output fixtures. Output evidence under `.pipeline/reviews/C19/M2/test-evidence.md`.
- `implement`: owns deterministic helper implementation and spec updates. Must not edit tests after `test` owns them.
- `audit`: reviews helper scope, deterministic boundaries, test evidence, and no-runner regression. Output audit under `.pipeline/reviews/C19/M2/audit.md`.
- Main agent: coordinates workers, integrates outputs, and updates Workflow state/progress/log.
