# C23 M1 TEST Worker Evidence

- Worker ID: `c23-m1-test-luna`
- Role: `test`
- Model: `gpt-5.6-luna`
- Effort: `xhigh`
- Timestamp: `2026-07-18T12:00:00+08:00` (Asia/Shanghai)
- Verdict: `RED_READY`
- M1 status: test surface prepared; M1 was not advanced or claimed complete.

## Scope

This worker owns only the C23 M1 Experiment-lane test surface. The tests define the contract for a reference
NeRF-like sandbox and an AceSim-like sandbox using the current manifest/Runtime, Record, and Receipt conventions.
No production source, production configuration, Hook, protected lifecycle state, or existing dirty change was
modified. The test catalog entry is test metadata only.

## Test design

`core/test/c23-m1-experiment.test.js` contains six focused RED cases:

1. The Core API must publish `createExperimentStore` and `buildExperimentReceiptContext`, with the store methods for
   create/read/list, attempts, explicit rerun, supersede, trash/restore, and baseline changes.
2. The NeRF-like fixture records an intentional old OOM failure followed by a completed attempt. Historical failure
   remains visible, while current status and current attempt select the successful attempt.
3. The AceSim-like fixture keeps one logical Experiment identity across multiple attempts. A rerun without a parent
   attempt is rejected; an accepted rerun records `rerun_of_attempt_id` explicitly.
4. Superseding a logical Experiment preserves the original Experiment and its attempt history while the active list
   selects the replacement.
5. Trash and restore are Receipt-gated, hide trashed Experiments from the active list, and preserve attempts through
   the round trip. Consumed Receipt state is checked.
6. Baseline change is Receipt-gated, appends baseline history, leaves existing attempt baseline IDs unchanged, and
   preserves the current completed status.

The tests also seed and byte-check frozen `.pipeline/state.yaml`, `.pipeline/cycle.yaml`, and `.pipeline/log.yaml`
sentinels after every mutating scenario. Fixtures:

- `core/test/fixtures/c23-m1/nerf-like.json`
- `core/test/fixtures/c23-m1/acesim-like.json`

## Modified test surface

- `core/test/c23-m1-experiment.test.js`
- `core/test/fixtures/c23-m1/nerf-like.json`
- `core/test/fixtures/c23-m1/acesim-like.json`
- `tests/regression-catalog.json` (one maintained C23-M1 test entry)
- `.pipeline/runtime/objects/delivery/c23-experiment-management/evidence/m1-test.md`

## Commands and results

```text
node --check core/test/c23-m1-experiment.test.js
fixture JSON parse check
```

Result: `PASS`.

```text
node core/test/c23-m1-experiment.test.js
```

Result: expected RED, exit `1`; `6 tests`, `0 pass`, `6 fail`. The first failure is:

```text
Core must export createExperimentStore
+ actual - expected
+ 'undefined'
- 'function'
```

The remaining five cases fail at the same missing `CORE.createExperimentStore` API. No fixture or legacy-sentinel
assertion ran before that production API boundary.

```text
node --test core/test/c23-m1-experiment.test.js
```

Result: expected RED, exit `1`; Node 22.22.3's repository test runner reports the child test file as `1 file`,
`0 pass`, `1 fail`, with `error: 'test failed'`. The direct Node test-file command above is the authoritative
per-case RED count because this runner aggregates the nested `node:test` output at file level in this workspace.

```text
node tests/run_core_tests.mjs --set maintained --dry-run --json
```

Result: `PASS`, catalog validates with `maintained_count: 51`, `quarantined_count: 116`, and the new
`core/test/c23-m1-experiment.test.js` is selected.

```text
git diff --check -- tests/regression-catalog.json
rg -n '[[:blank:]]+$' core/test/c23-m1-experiment.test.js core/test/fixtures/c23-m1/nerf-like.json core/test/fixtures/c23-m1/acesim-like.json .pipeline/runtime/objects/delivery/c23-experiment-management/evidence/m1-test.md tests/regression-catalog.json
```

Result: `PASS`; the tracked catalog diff has no whitespace errors and the whitespace scan has no matches for the new
test, fixtures, or evidence.

## Expected implementation result

After the Experiment lane implementation is added, the direct focused command should become `6 tests`, `6 pass`,
`0 fail`. The implementation should preserve one logical Experiment `object_ref`, append immutable Attempt history,
require explicit rerun identity, derive current status without letting stale failures override a current result, retain
history across supersede/trash/restore, append baseline changes, consume one-shot Receipts for sensitive transitions,
and leave frozen legacy lifecycle files byte-identical.

## Current blocker and remaining risks

The current blocker is intentional: Core has no `createExperimentStore` or `buildExperimentReceiptContext` export, so
the RED cases cannot yet exercise their deeper assertions. The contract names and fields are the test-side M1 proposal
for the implementation worker to satisfy or reconcile explicitly.

These are deterministic reference fixtures, not real NeRF/AceSim/GPU executions; real-project resource behavior,
reproducibility bindings, long-run supervision, scan expansion, and scientific review remain later C23 milestones.
The maintained regression gate will remain RED while this M1 implementation is absent.
