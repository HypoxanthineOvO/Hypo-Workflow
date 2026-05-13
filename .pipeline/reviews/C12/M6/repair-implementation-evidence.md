# C12/M6 Repair Implementation Evidence

## Scope

- `SKILL.md`
- `tests/scenarios/v9/s55-opencode-command-map/run.sh`
- `tests/scenarios/v6/s19-help-list/run.sh`
- `references/skill-spec.md`
- `core/test/codex-subagent-discipline.test.js`

## Fixes

- Exposed `/hw:plan:deep` through the root Skill surface.
- Updated stale 39-command scenario expectations to 40.
- Added `hw-plan-deep` scenario assertions.
- Corrected non-Deep Plan agent drift in `references/skill-spec.md`.
- Updated the Codex subagent discipline test to the new 40-command help surface.

## Validation

- `tests/scenarios/v6/s19-help-list/run.sh`: passing.
- `tests/scenarios/v9/s55-opencode-command-map/run.sh`: passing.
- `uv run -- node --test core/test/codex-subagent-discipline.test.js`: 10/10 passing.
- M6 integrated test suite: 27/27 passing.
- Stale 39/37 search: no matches.
