# C23 M1 Remediation TEST2 Worker Evidence

- Worker ID: `c23-m1-remediation-test2-luna`
- Role: `test`
- Model: `gpt-5.6-luna`
- Effort: `xhigh`
- Timestamp: `2026-07-18` (Asia/Shanghai)
- Verdict: `PASS`
- Workflow Runtime advancement: none

## Conclusion

PASS. The M1 remediation is validated by the existing seven-case boundary surface and the preserved six-case original
M1 contract. The boundary suite is GREEN at 7/7, the original M1 suite remains GREEN at 6/6, and the focused shared
Record, Receipt, Runtime, and workspace transaction suites remain GREEN. No production defect was exposed by these
tests.

## Technical approach

The original test helper `issueReceipt` now accepts an optional `target` and conditionally passes it to
`buildExperimentReceiptContext`, preserving target-less trash/restore calls. Only the two target-bound calls were
updated:

- supersede now issues its Receipt for the exact replacement definition later submitted to the Store;
- baseline change now issues its Receipt for `fixture.experiment.baseline_v2`, the exact baseline later submitted.

No assertion, fixture, production behavior, or original test intent was weakened or changed. The existing focused
boundary file was retained unchanged and its seven cases were executed.

## Test design

The original six cases cover Experiment Store publication, NeRF attempt history and status, AceSim rerun identity,
supersede history preservation, Receipt-gated trash/restore, and Receipt-gated baseline history. The seven retained
boundary cases cover generic Runtime Experiment-write rejection, supersede target substitution, baseline target
substitution, consumed Receipt replay, unknown baseline references, missing execution timestamps, and duplicate
persisted attempt IDs. Failure paths also check authority/tree stability and legacy lifecycle sentinels where applicable.

## Exact changed test files

- `core/test/c23-m1-experiment.test.js` — adapted the optional-target Receipt helper and the two supersede/baseline
  Receipt calls.

The existing `core/test/c23-m1-experiment-boundary.test.js` was read and retained; it was not modified by this worker.
`tests/regression-catalog.json` already contained maintained entries for both C23 M1 test files and was not modified.

## Commands and results

- `node --check core/test/c23-m1-experiment.test.js` — PASS.
- `node --check core/test/c23-m1-experiment-boundary.test.js` — PASS.
- `node --test core/test/c23-m1-experiment.test.js` — PASS, exit 0 (Node file-level summary: 1 subtest).
- `node --test core/test/c23-m1-experiment-boundary.test.js` — PASS, exit 0 (Node file-level summary: 1 subtest).
- `node core/test/c23-m1-experiment.test.js` — PASS, 6 tests / 6 pass / 0 fail.
- `node core/test/c23-m1-experiment-boundary.test.js` — PASS, 7 tests / 7 pass / 0 fail.
- `node --test core/test/record-store.test.js core/test/receipt-store.test.js core/test/runtime-store.test.js core/test/workspace-transaction.test.js` — PASS, 4 suites / 4 pass / 0 fail.
- `node tests/run_core_tests.mjs --set maintained --dry-run --json` — PASS; catalog schema valid, 52 maintained, 116 quarantined, 52 selected, and both C23 M1 test paths selected.
- `python3 tests/run_regression.py --set maintained --dry-run --json` — PASS; 8 maintained scenarios selected from 8 maintained / 68 quarantined.
- `git diff --check` — PASS.

## Expected behavior

The original M1 happy-path contract remains green while target-bound Receipt contexts authorize only the exact
replacement or baseline payload. Substitution is rejected before authority mutation; consumed Receipt replay remains
terminal and write-free; generic Runtime callers cannot create an Experiment authority; malformed baseline references,
missing execution timestamps, and duplicate persisted attempt IDs are rejected.

## Problems encountered

No implementation/test contract mismatch remained after the remediation. `node --test <file>` reported a Node
file-level subtest summary (`tests=1`) in this repository; direct execution of each test file was also run to record the
actual case counts required for M1 (`6/6` and `7/7`). The maintained runner dry-runs were intentionally not expanded
into full execution because this worker request required dry-run validation for the catalog/runner surface.

## Residual risks and follow-up

This evidence covers only C23 M1 Experiment authority and integrity boundaries. Later C23 milestones, real project runs,
Record-based historical redesign, and the independent Terra audit remain outside this worker's scope. The worktree has
pre-existing unrelated changes and untracked C23/runtime artifacts; they were preserved. Workflow Runtime was not
advanced, and this worker did not modify any protected lifecycle/state/log/progress/continuation/plan record or any
existing evidence file.

## Final verdict

`PASS`
