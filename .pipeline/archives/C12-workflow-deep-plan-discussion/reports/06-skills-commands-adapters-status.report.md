# M6 Report - Skills、Commands、Adapters 与状态面集成

## Result

pass_after_repair

## Summary

Deep Plan is now exposed as a first-class `/hw:plan:deep` command across canonical command metadata, Skills, generated OpenCode/Claude artifacts, help/spec/reference docs, and scenario regressions.

The independent audit initially found two blockers: the root Skill did not expose `/hw:plan:deep`, and scenario scripts still asserted 39 commands. Both were repaired and revalidated.

## Delivered

- `/hw:plan:deep` is part of the canonical command map and routes through `hw-plan`.
- OpenCode and Claude command generation derive Deep Plan from the canonical map without artifact-side special casing.
- Root `SKILL.md`, `skills/help/SKILL.md`, `skills/plan-deep/SKILL.md`, command files, references, docs, and generated OpenCode artifacts describe Deep Plan consistently.
- Stale 39-command / 37-skill expectations were updated to the 40-command / 38-skill surface.
- Deep Plan boundaries remain explicit: discussion/research/map/readiness/convert, not execution runner; remote code research remains explicit-confirmation gated.

## Validation

- `uv run -- node --test core/test/deep-plan-integration.test.js`: 4/4 passing.
- `uv run -- node --test core/test/commands-rules-artifacts.test.js core/test/skill-spec.test.js core/test/skill-quality.test.js core/test/docs-governance.test.js core/test/sync-standardization.test.js`: 23/23 passing.
- `uv run -- node --test core/test/deep-plan-integration.test.js core/test/commands-rules-artifacts.test.js core/test/skill-spec.test.js core/test/skill-quality.test.js core/test/docs-governance.test.js core/test/sync-standardization.test.js`: 27/27 passing after repair.
- `uv run -- node --test core/test/codex-subagent-discipline.test.js`: 10/10 passing.
- `tests/scenarios/v6/s19-help-list/run.sh`: passing.
- `tests/scenarios/v9/s55-opencode-command-map/run.sh`: passing.
- `git diff --check`: passing.

## Evidence

- `.pipeline/reviews/C12/M6/test-evidence.md`
- `.pipeline/reviews/C12/M6/implementation-evidence.md`
- `.pipeline/reviews/C12/M6/repair-implementation-evidence.md`
- `.pipeline/reviews/C12/M6/audit.md`
