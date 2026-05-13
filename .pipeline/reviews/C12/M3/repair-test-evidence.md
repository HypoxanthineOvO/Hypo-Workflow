# C12/M3 Repair Test Evidence

## Worker

- role: test
- worker_id: `019e1ce3-a787-7ae0-bbfd-a826b00a1060`
- lifecycle: requested -> started -> completed -> closed

## Files Changed By Test Worker

- `core/test/deep-plan-research.test.js`

## Red Test Command

```bash
uv run -- node --test core/test/deep-plan-research.test.js
```

## Expected RED Result

The focused repair test failed as expected:

- `remote_clone` was incorrectly allowed by `allowed_actions`.
- `edit_code` was incorrectly allowed by `network_confirmed`.
- `evidence_refs` leaked secret-looking values.

## Coverage

- Remote/network actions cannot be allowlisted without explicit remote confirmation.
- Network confirmation cannot authorize code edits, restart, destructive delete, or external side effects.
- Compact Knowledge refs must redact secret-looking evidence refs, not only summaries.
