# C18-M2 Quality Command And Report Contract

## Goal

新增 `/hw:quality` 一等命令，用于质量 scorecard、baseline、compare、review、quality action queue 和质量 gate。

## Technical Solution

- Register `/hw:quality` in the canonical command registry.
- Put scoring/reporting semantics in `references/quality-spec.md`.
- Add `skills/quality/SKILL.md` as the command entry.
- Expose the command consistently through root `SKILL.md`, command specs, OpenCode specs, command map, docs, and tests.
- Quality can gate evidence-backed quality thresholds but must escalate risk/security/behavioral blockers to Audit.

## Subworker Assignment Plan

Status: authorized. Worker Separation mode: recommended.

- `test`
  - Owns command registry, skill/spec, docs, OpenCode artifact, report/state/action path, and command count tests for `/hw:quality`.
  - Evidence path: `.pipeline/reviews/C18/M2/test-evidence.md`.
- `implement`
  - Owns `core/src/commands/index.js`, root `SKILL.md`, `skills/quality/SKILL.md`, `references/quality-spec.md`, `references/commands-spec.md`, `references/opencode-spec.md`, and `references/opencode-command-map.md`.
  - Must not create or rewrite tests owned by `test`.
  - Evidence path: `.pipeline/reviews/C18/M2/implementation-evidence.md`.
- `audit`
  - Reviews first-class command exposure, Audit/Quality boundary, durable paths, generated docs, and worker separation.
  - Evidence path: `.pipeline/reviews/C18/M2/audit.md`.
- Main agent
  - Coordinates workers, integrates outputs, updates lifecycle files, and writes the completion report.

## Technical Route

1. Add `/hw:quality` to `CANONICAL_COMMANDS` with OpenCode mapping and skill path.
2. Create `skills/quality/SKILL.md` with output language, Intake, modes, persistence, and reference links.
3. Create `references/quality-spec.md` with rubric, 1-5 scoring, core dimensions, gate thresholds, compare mode, report template, and Action Queue.
4. Update root `SKILL.md`, `references/commands-spec.md`, `references/opencode-spec.md`, `references/opencode-command-map.md`, and generated docs expectations.
5. Update tests that assert command count and generated OpenCode metadata.

## Research Required

Status: resolved.

Evidence:

- `.plan-state/c18-quality-command-decisions.md`
- `tmp.md` article-derived rubric
- Existing command/artifact/docs tests under `core/test/`

## Risks And Alternatives

Risks:

- Command count snapshots and generated docs may fail if not updated consistently.
- Quality gate could duplicate Audit gate semantics.

Rejected alternative: implement Quality as `/hw:audit --quality`. Rejected because Quality is a first-class report/score command.

Mitigation: spec explicitly distinguishes Quality from Audit and escalates risk findings to Audit.

## Validation

Run:

```bash
node --test core/test/commands-rules-artifacts.test.js core/test/docs-governance.test.js core/test/skill-spec.test.js
node --test core/test/completion-report-contract.test.js
git diff --check
```

Pass signal: tests exit 0 and command map/docs/skill contract include `/hw:quality`.

## Audit Focus

- `/hw:quality` is first-class.
- It does not overwrite Audit risk governance.
- `.pipeline/quality/quality-NNN.md`, `state.yaml`, and `actions.yaml` paths are clear.
- Adapter/docs surfaces are fresh.

## Completion Report Requirements

Include changed files, command registration evidence, report/state path contract, validation output, Audit boundary summary, and residual risks.
