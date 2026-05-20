# C15-M3 Interactive Analysis State And Command Entry

## Goal

Restore and upgrade Analysis into a usable interactive investigation lane. Analysis-like tasks should be able to automatically enter persistent Analysis state, remember the main thread, and maintain structured analysis records. A direct `/hw:analysis` entry should also be provided if feasible.

## Technical Solution

Use the existing Analysis foundations as the core:

- `references/analysis-spec.md`
- `references/analysis-ledger-spec.md`
- `templates/analysis/*`
- `core/src/analysis/index.js`
- `core/test/analysis-*.test.js`
- `.opencode/hypo-workflow.json.analysis`

Add command/routing/state/recovery exposure:

- canonical command: `/hw:analysis`
- OpenCode command: `/hw-analysis`
- source of truth: `.pipeline/analysis/<cycle-or-milestone>/ledger.yaml`
- readable summary: `.pipeline/analysis/<cycle-or-milestone>/summary.md`
- state pointer: `prompt_state.analysis_summary`

`/hw:chat` remains lightweight append conversation. Analysis is different because it records hypotheses, experiments, observations, confidence, and follow-up proposals.

## Subworker Assignment Plan

Status: authorized. Worker Separation mode: recommended.

- `test`
  - Owns command-map, generated artifact, analysis-state recovery, and smoke tests.
  - Evidence path: `.pipeline/reviews/C15/M3/test-evidence.md`.
- `implement`
  - Owns new skill/command routing, analysis state helpers, generated artifact updates, and docs/spec edits.
  - Evidence path: `.pipeline/reviews/C15/M3/implementation-evidence.md`.
- `audit`
  - Reviews command inventory sync, Analysis vs Chat distinction, safety boundaries, and state.yaml compactness.
  - Evidence path: `.pipeline/reviews/C15/M3/audit.md`.
- Main agent
  - Coordinates workers, integrates route and artifact updates, and writes lifecycle state.

## Required Steps

1. Read Analysis specs/templates/tests and chat/debug/status/report/start/resume skills.
2. Add `skills/analysis/SKILL.md` or an equivalent command skill with clear enter/continue/end/report semantics.
3. Add `/hw:analysis` to root `SKILL.md`, `references/commands-spec.md`, `references/opencode-command-map.md`, `references/skill-spec.md`, and `core/src/commands/index.js`.
4. Update OpenCode artifact generation so `/hw-analysis` is generated and metadata includes the command.
5. Add or reuse helpers for Analysis ledger initialization, continuation, summary rendering, and compact state pointer.
6. Update Debug guidance so sustained root-cause investigations can automatically enter Analysis state.
7. Update Status/Report/Progress guidance to show question, ledger path, outcome/confidence, and next action without dumping full hypotheses.

## Validation

Run targeted checks:

```bash
uv run -- node --test core/test/analysis-runtime.test.js core/test/analysis-state-ledger.test.js core/test/analysis-interaction.test.js core/test/analysis-preset.test.js
uv run -- node --test core/test/chat-runtime.test.js core/test/chat-mode-spec.test.js core/test/sync-standardization.test.js core/test/skill-spec.test.js
uv run python tests/run_regression.py --scenario s62-analysis-preset-runtime
```

Smoke expectations:

- Start a sample Analysis for a root-cause question.
- Append a second turn.
- Verify state summary points to the same ledger.
- Verify readable summary preserves the main thread.
- Run sync/artifact generation and verify `/hw-analysis` exists in OpenCode commands and metadata.

## Completion Report Requirements

Report why Analysis previously felt absent, what was restored, how state continuation works, which files changed, what tests prove it, and any remaining UX limits.
