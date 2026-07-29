# C21-M5 Recovery Pack order implementation evidence

## Scope

- Production change: `core/src/recovery/pack.js`
- Behavior corrected: valid Recovery Packs are ordered by the absolute instant represented by `sealed_at`, independent of timezone offset spelling.
- No repository test file or persisted manifest, Runtime, Journal, Capsule, Pack, Snapshot, Record Store, or legacy Workflow state artifact was read or changed by this worker.

## Technical choice

`sealed_at` has already passed `normalizeTimestamp` before an entry can reach `orderValidPacks`, so the comparator parses each timestamp to its finite epoch-millisecond instant. A newer instant sorts first. The existing ancestry tie-break runs only when both timestamps represent the same absolute instant; unrelated equal-instant Packs continue to return comparator equality, preserving stable input order.

This is deliberately local to the ordering comparator and does not change Pack validation, corrupt-Pack rejection, discovery order, retention, or restore behavior.

## Verification

- `node --check core/src/recovery/pack.js`
- Production-only temporary smoke covering:
  - different offsets where lexical and absolute-time ordering disagree;
  - equal absolute instants where a descendant must win;
  - equal absolute instants without ancestry, preserving stable order;
  - a corrupt newer Pack falling back to an older valid Pack.
- whitespace-error scans over both changed files, including their currently untracked content

The worker did not read or execute repository test files. Final focused and regression test execution remains assigned to the parent workflow.

The first temporary smoke fixture used expanded Runtime object-reference fields when hashing its synthetic Capsule and was rejected during fixture setup with `ERR_RECOVERY_CAPSULE_INTEGRITY`. Correcting the fixture to the persisted `{kind, id}` reference shape made the harness valid; this did not require a production-code change. The valid harness then passed all four cases above.

## Residual risk

The comparator relies on the pre-existing invariant that persisted Pack timestamps are normalized and valid before sorting. That invariant is enforced during Pack inspection; invalid timestamps remain rejected before `orderValidPacks` is called.
