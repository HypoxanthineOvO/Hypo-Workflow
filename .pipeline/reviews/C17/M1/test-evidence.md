# C17-M1 Test Evidence

Timestamp: 2026-05-21T17:32:27+08:00

## Scope

- Worker role: C17-M1 test worker.
- Wrote RED contract tests for the shared utils layer only.
- Modified test/evidence files only:
  - `core/test/utils.test.js`
  - `.pipeline/reviews/C17/M1/test-evidence.md`

## Command

```sh
node --test core/test/utils.test.js
```

## RED Result

Expected RED confirmed.

- Result: failed.
- Summary: 0 passed, 7 failed.
- Primary failure point:
  - `ERR_MODULE_NOT_FOUND`
  - `Cannot find module '/home/heyx/Hypo-Workflow/core/src/utils/index.js' imported from /home/heyx/Hypo-Workflow/core/test/utils.test.js`

All focused tests currently fail at import time because `core/src/utils/index.js` is absent. This is the intended RED state for C17-M1 before implementation.

## Covered Contract

- `core/src/utils/index.js` imports without side effects and exposes the dependency-light shared utils contract.
- Required exports:
  - `isPlainObject`
  - `cloneJson` or `deepClone`
  - `compactTimestamp`
  - `stableStringify`
  - `hasText`
  - `safeId`
- Semantic expectations:
  - `isPlainObject` returns true for plain objects and false for `null`, arrays, dates, and strings.
  - `cloneJson` or `deepClone` returns an isolated deep copy for nested JSON-like data.
  - `compactTimestamp("2026-05-21T17:30:00+08:00")` includes `20260521T173000+0800` or an equivalent compact UTC/local suffix.
  - `stableStringify` produces deterministic key order for top-level and nested objects.
  - `hasText` returns true only for non-empty strings after trimming.
  - `safeId` normalizes display text into a lower-ish filename-safe id.

## Expected GREEN Conditions

The focused test should pass when C17-M1 implementation adds `core/src/utils/index.js` with the required exports and matching semantics.

Minimum GREEN command:

```sh
node --test core/test/utils.test.js
```

Follow-up integration validation after implementation should also include the repository canonical test entry:

```sh
npm test
```
