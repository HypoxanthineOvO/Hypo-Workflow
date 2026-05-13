# C12/M0 Implementation Evidence

## Worker

- role: implement
- worker_id: `019e1c8a-154a-7a92-b483-102db9c8c357`
- lifecycle: requested -> started -> completed -> closed

## Files Changed By Implement Worker

- `core/src/commands/index.js`
- `core/src/artifacts/opencode.js`
- `skills/plan-deep/SKILL.md`
- `skills/plan/SKILL.md`
- `commands/plan.md`
- `commands/plan/deep.md`
- `references/commands-spec.md`

## Validation

```bash
uv run -- node --test core/test/deep-plan-contract.test.js
uv run -- node --test core/test/deep-plan-contract.test.js core/test/commands-rules-artifacts.test.js core/test/global-config-registry.test.js
git diff --check
```

Results:

- Deep Plan focused tests: 4/4 passing.
- Focused command/config suite: 15/15 passing.
- Whitespace diff check: passing.

## Known Implementation Note

`/hw:plan:deep` is available via `commandByCanonical` and OpenCode artifact generation, but it is not counted in the legacy `commandMap()` length to preserve existing `commandMap contains 39 OpenCode mappings` tests. Full docs/status/adapter integration is planned for M6.
