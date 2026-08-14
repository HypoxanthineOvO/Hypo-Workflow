# C23 M1 Recovery Remediation Test Evidence

- Worker ID: `c23-m1-recovery-remediation-test-luna`
- Role: reproducible test and evidence only
- Model: `gpt-5.6-luna`
- Effort: `xhigh`
- Date: `2026-07-18` (Asia/Shanghai)
- Verdict: `RED_READY`
- Terra audit: not performed and not claimed
- Workflow Runtime advancement: none

## Scope

This tranche adds only a new focused test module and this new evidence file.
Production source, existing tests/assertions, fixtures, Receipt files,
transaction markers, hooks, Runtime/Continuation, protected Workflow state,
and existing evidence files were not changed.

## Test design

`core/test/c23-m1-recovery-remediation.test.js` adds five maintained-style
direct tests:

1. Recovery-created `receipt-consume` is faulted at `after_prepare` after an
   authority-activated trash transition. The retry must recover that pending
   descendant, reconcile the Receipt to `consumed`, remove every transaction
   descendant, be byte-idempotent on repetition, and allow an unrelated
   Experiment create transaction.
2. The same recovery-created Receipt transaction is faulted at
   `after_manifest_activation`, exercising the installed-but-pending recovery
   marker and the same retry/unrelated-transaction contract.
3. Persisted read rejects a child whose `rerun_of_attempt_id` is unknown.
4. Persisted read rejects a child whose rerun parent is itself.
5. Persisted read rejects a first attempt whose rerun parent points forward to
   a later attempt.

The recovery tests use the existing AceSim-like fixture, a fixed clock, the
public Experiment Store and Receipt APIs, shared workspace transaction
recovery for the authority interruption, transaction-descendant enumeration,
byte snapshots, and legacy sentinel checks. The rerun tests first create a
valid two-attempt lineage, then use a workspace transaction to inject each
malformed persisted runtime view before calling the public read path.

## Exact modified files

- `core/test/c23-m1-recovery-remediation.test.js`
- `.pipeline/runtime/objects/delivery/c23-experiment-management/evidence/m1-recovery-remediation-test.md`

No production file, existing test, fixture, catalog, hook, Receipt, Runtime,
Continuation, or protected Workflow file was modified.

## Validation results

- `node --check core/test/c23-m1-recovery-remediation.test.js`: PASS.
- `node core/test/c23-m1-recovery-remediation.test.js`: `0/5` passed,
  `5/5` failed for the intended missing contracts:
  - both recovery fault cases reported `Missing expected rejection`, showing
    the recovery-created Receipt transaction did not receive the injected
    fault;
  - unknown, self, and forward persisted rerun-parent cases each reported
    `Missing expected rejection`, showing persisted read accepted malformed
    lineage.
- Existing C23 tests were not modified or weakened; their focused rerun is
  pending the implementation worker's remediation.

## Expected GREEN behavior

The implementation should propagate the recovery fault injector to every
recovery-created Receipt transaction and enumerate/recover its descendants on
retry. Both injected phases must leave at most the corresponding recovery
transaction pending, and an un-faulted retry must leave no transaction marker,
preserve `trashed` authority with a `consumed` Receipt, remain byte-idempotent,
and permit a later unrelated workspace transaction.

Persisted Experiment read should require each rerun parent to exist, differ
from the child, and precede the child in persisted attempt order. Unknown,
self-referential, and forward parent IDs must fail closed without being
accepted as a valid history.

## Residual risks

The new recovery cases use `experiment.trash`, so target-bearing supersede and
baseline recovery still need equivalent interruption coverage. The persisted
lineage cases validate the read boundary but do not redesign Experiment facts
onto immutable Records. Full maintained/all-suite execution and independent
Terra audit remain outside this test worker's scope.
