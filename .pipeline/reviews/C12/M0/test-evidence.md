# C12/M0 Test Evidence

## Worker

- role: test
- worker_id: `019e1c84-1a0e-7d40-a40d-df6a8d9fac7d`
- lifecycle: requested -> started -> completed -> closed

## Files Changed By Test Worker

- `core/test/deep-plan-contract.test.js`

## Red Test Command

```bash
uv run -- node --test core/test/deep-plan-contract.test.js
```

## Expected RED Result

The focused test failed as expected because M0 production contracts are not implemented yet:

- missing canonical `/hw:plan:deep` command registry entry
- missing `skills/plan-deep/SKILL.md`
- ordinary Plan skill/command/spec do not yet document `--deep` alias and P1-P4 gate preservation

## Ownership

The test worker owns these red tests and fixtures. The implement worker must not edit `core/test/deep-plan-contract.test.js`.
