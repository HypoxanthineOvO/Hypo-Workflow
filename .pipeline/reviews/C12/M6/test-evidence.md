# C12/M6 Test Evidence

## Worker

- role: test
- worker_id: `019e1d28-c56b-7570-b2c7-991d34bf3281`
- lifecycle: requested -> started -> completed -> closed

## Files Changed By Test Worker

- `core/test/deep-plan-integration.test.js`
- `core/test/commands-rules-artifacts.test.js`
- `core/test/docs-governance.test.js`
- `core/test/sync-standardization.test.js`
- `core/test/skill-spec.test.js`
- `core/test/skill-quality.test.js`

## Red Test Commands

```bash
node --test core/test/deep-plan-integration.test.js
node --test core/test/commands-rules-artifacts.test.js core/test/skill-spec.test.js core/test/skill-quality.test.js core/test/docs-governance.test.js core/test/sync-standardization.test.js
```

## Expected RED Result

The focused tests failed as expected because Deep Plan is not yet first-class in the canonical command map and generated docs/adapters still carry 39-command legacy expectations.

## Coverage

- `/hw:plan:deep` must be present exactly once in `commandMap()` for OpenCode and Claude Code.
- OpenCode artifacts must derive Deep Plan from `commandMap()` rather than artifact-side splicing.
- Claude Code generated commands must include `commands/plan/deep.md`.
- Help/spec/docs must use 40 user-facing commands and 38 user-facing Skill paths.
- Deep Plan docs must describe operations, boundaries, Explore distinction, and ordinary Plan P1-P4 gates.

## Ownership

The test worker owns the listed test files. The implement worker must not edit them.
