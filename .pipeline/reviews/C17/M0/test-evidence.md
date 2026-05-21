# C17-M0 Test Evidence

Role: test worker
Scope: RED tests only. No production code, root package metadata, README, or implementation files were changed.

## Changed Test

- `core/test/audit-baseline.test.js`

The test defines the C17 baseline contract:

- Repository root must contain a private `package.json` with `scripts.test`, so `npm test` works from the repository root.
- Core must export `buildAuditInventory()` or `auditInventory()`.
- The audit inventory result must include `schema_version: 1`, `generated_at`, and these category keys:
  - `hardcoded_paths`
  - `duplicate_helpers`
  - `workspace_imports`
  - `yaml_parsers`
  - `ledger_rewrites`
  - `barrel_exports`
- Each category may be either an array of entry objects or an object with numeric `count` and array `entries`.

## Commands Run

### `npm test`

Exit code: 254

RED failure:

```text
npm error enoent Could not read package.json: Error: ENOENT: no such file or directory, open '/home/heyx/Hypo-Workflow/package.json'
```

Interpretation: the repository root currently has no `package.json`, so the required root `npm test` entry is unavailable.

### `node --test core/test/audit-baseline.test.js`

Exit code: 1

RED failures:

```text
not ok 1 - repository root exposes npm test as the canonical test entry
error: Got unwanted rejection: repository root must contain package.json so `npm test` works from the root
Actual message: "ENOENT: no such file or directory, access 'package.json'"
```

```text
not ok 2 - C17 audit inventory exposes baseline categories for debt closure tracking
error: core must export buildAuditInventory() or auditInventory() for C17 baseline tracking
actual: 'undefined'
expected: 'function'
```

Interpretation: both intended RED points are present:

- Missing root test entry.
- Missing audit inventory export/implementation.

## Expected GREEN Conditions

Implementation worker should make these pass without changing this test contract:

1. Add a minimal private root `package.json` with `scripts.test` delegating to the existing core test command.
2. Export `buildAuditInventory()` or `auditInventory()` from `core/src/index.js` or a helper re-exported by it.
3. Return an audit inventory object with `schema_version: 1`, a string `generated_at`, and all required C17 categories.
4. Each category should return either concrete entry objects or `{ count, entries }` so later milestones can compare before/after debt counts.
5. `npm test` from `/home/heyx/Hypo-Workflow` and `node --test core/test/audit-baseline.test.js` should both exit 0 after implementation.
