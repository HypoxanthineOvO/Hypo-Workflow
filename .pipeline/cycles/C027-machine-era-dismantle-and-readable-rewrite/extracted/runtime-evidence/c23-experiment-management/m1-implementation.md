# C23 M1 IMPLEMENT Worker Evidence

- Worker ID: `c23-m1-implement-luna`
- Role: `implement`
- Model: `gpt-5.6-luna`
- Effort: `xhigh`
- Timestamp: `2026-07-18T14:02:26+08:00` (Asia/Shanghai)
- Verdict: `GREEN_FOCUSED`
- M1 status: implementation completed and focused M1 verification passed; Workflow Runtime was not advanced.

## Technical approach

Implemented a focused Experiment authority store using the existing Runtime object and workspace transaction paths.
Experiment authority is stored below the manifest-selected runtime zone as one logical `experiment` object_ref with
its complete append-only attempt history, current status/current attempt projection, baseline history, and lifecycle.
The Runtime object-ref whitelist now accepts `experiment`, while Experiments remain outside the Delivery active pointer.

The store exposes create/read/list, recordAttempt, rerun, supersede, trash, restore, and changeBaseline. Attempt status
is derived from the newest execution timestamp, so a stale failed attempt cannot override a newer completed attempt.
Rerun requires an existing explicit `rerun_of_attempt_id`; the logical Experiment object_ref remains unchanged.

Supersede, trash, restore, and baseline changes use the existing Receipt reserve -> authority transaction -> consume
pattern. Supersede binds authorization to the logical Experiment identity and active lifecycle so a creation-time view
can authorize the explicit replacement after attempts are appended; other transitions bind the complete current
authority state. Legacy `.pipeline/state.yaml`, `.pipeline/cycle.yaml`, and `.pipeline/log.yaml` are never written.

## Changed production files

- `core/src/experiment/index.js` - Experiment store, normalization, status derivation, persistence, and Receipt context.
- `core/src/runtime/internal.js` - Add `experiment` to the Runtime authority object-ref kinds.
- `core/src/index.js` - Export `createExperimentStore` and `buildExperimentReceiptContext`.

## Test design and results

- `node core/test/c23-m1-experiment.test.js`: PASS, 6 tests, 6 pass, 0 fail.
- `node --test core/test/c23-m1-experiment.test.js`: PASS, 1 file, 1 pass.
- `node --check core/src/experiment/index.js && node --check core/src/index.js && node --check core/src/runtime/internal.js`: PASS.
- `node core/test/record-store.test.js`: PASS, 13/13.
- `node core/test/receipt-store.test.js`: PASS, 22/22.
- `node core/test/authority-nonduplication.test.js`: PASS, 2/2.
- `node core/test/runtime-store.test.js`: PASS, 13/13.
- `node core/test/workspace-transaction.test.js`: PASS, 19/19.
- `node core/test/workflow-commit.test.js`: PASS, 6/6.
- `git diff --check` and trailing-whitespace scan for changed production files: PASS.

The focused M1 cases cover API publication, NeRF-like stale OOM history, AceSim-like explicit reruns, supersede history
preservation, Receipt-gated trash/restore, one-shot Receipt consumption, baseline history append, unchanged attempt
baseline IDs, current completed status, and frozen legacy lifecycle sentinels.

## Expected behavior

The M1 Experiment lane now persists authority transactionally in the current-format runtime zone, keeps one logical
Experiment identity across attempts, derives current status without stale-attempt overwrite, and requires explicit
Receipt-bound lifecycle transitions. Trashed and superseded objects remain readable with their attempt history while
active listing selects only active Experiments.

## Problems and remaining risks

The first implementation bound every Receipt to the full Experiment view. The M1 supersede fixture intentionally signs
from the creation-time view before recording an attempt, so supersede was narrowed to identity plus active lifecycle;
trash/restore/baseline transitions retain full-state drift protection.

The maintained suite inventory selected 51 tests and completed with 45 pass / 6 fail. The six failures are outside the
M1 lane and reproduce in existing Bootstrap/C21 lifecycle/Hook tests as empty fresh-process stdout or empty subprocess
diagnostics. The focused Experiment, Record, Receipt, Runtime, and transaction tests all pass. Real NeRF/AceSim
execution, resource supervision, reproducibility bindings, and later C23 milestones remain unimplemented by design.
