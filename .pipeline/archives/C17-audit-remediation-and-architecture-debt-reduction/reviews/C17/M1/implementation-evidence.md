# C17-M1 Implementation Evidence

Timestamp: 2026-05-21T17:36:38+08:00

## Scope

- Worker role: C17-M1 implement worker.
- Added dependency-light shared utils at `core/src/utils/index.js`.
- Did not edit tests or test evidence.
- Did not perform js-yaml replacement.

## Changed Production Files

- `core/src/utils/index.js`
- `core/src/index.js`
- `core/src/evidence/index.js`
- `core/src/reviews/index.js`
- `core/src/storage-sync/index.js`
- `core/src/domains/index.js`
- `core/src/project-events/index.js`
- `core/src/maintenance/project-linkage-e2e.js`

## Shared Utils Contract

`core/src/utils/index.js` exports:

- `isPlainObject`
- `cloneJson`
- `deepClone`
- `compactTimestamp`
- `stableStringify`
- `hasText`
- `safeId`

## Migration Notes

Migrated repeated local helpers to shared utils in six low-risk modules:

- `core/src/evidence/index.js`: `isPlainObject`, `stableStringify`
- `core/src/reviews/index.js`: `isPlainObject`, `cloneJson`
- `core/src/storage-sync/index.js`: `isPlainObject`, `hasText`
- `core/src/domains/index.js`: `hasText`
- `core/src/project-events/index.js`: `isPlainObject`, `cloneJson`, `stableStringify`, `safeId`
- `core/src/maintenance/project-linkage-e2e.js`: `stableStringify`

`core/src/index.js` now exports `./utils/index.js`.

## Validation

```sh
node --test core/test/utils.test.js
```

Result: passed, 7/7.

```sh
npm test
```

Result: passed, 640/640.

```sh
rg 'function isPlainObject|function compactTimestamp|function stableStringify|async function writeYaml' core/src
```

Result: expected remaining matches only. Shared utils owns the exported helpers. Remaining local helpers are outside the C17-M1 allowed migration slice or are `writeYaml` entries reserved for C17-M3.

```sh
git diff --check
```

Result: passed.
