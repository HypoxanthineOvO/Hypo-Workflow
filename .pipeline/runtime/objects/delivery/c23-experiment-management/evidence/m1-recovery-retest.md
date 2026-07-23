# C23 M1 Recovery Independent Retest Evidence

- Worker ID: `c23-m1-recovery-test-retest-luna`
- Role: independent test/retest only
- Model: `gpt-5.6-luna`
- Effort: `xhigh`
- Date: `2026-07-18` (Asia/Shanghai)
- Verdict: `GREEN_RETEST`
- Terra audit: not performed and not claimed
- Workflow Runtime advancement: none; Runtime and Continuation were not advanced

## Scope and Boundaries

The retest read the active C23 Runtime, `m1-recovery-test.md`,
`m1-recovery-implementation.md`, the current Experiment Store, Receipt Store,
workspace transaction, shared recovery, Record, and Runtime modules. The public
recovery contract under test is:

```js
store.recoverTransition(root, transitionDescriptor, { id: operationId })
```

This worker changed only this evidence file. No production source, test,
fixture, regression catalog, manifest, Runtime, Continuation, active pointer,
Receipt, transaction marker, legacy sentinel, or Workflow protected state was
modified. In particular, no fixture/assertion defect was found, so
`core/test/c23-m1-experiment-boundary.test.js` was not changed.

## Interruption Paths Verified

All three maintained recovery cases passed independently:

1. Authority activated: an `after_manifest_activation` fault on the second
   transaction occurrence left the authority transaction pending. Shared
   workspace recovery finalized it; Experiment state became `trashed`, the
   reserved Receipt became terminal (`consumed`), and no transaction residue
   remained.
2. Authority not activated: an `after_prepare` fault on the second occurrence
   left authority unactivated. Shared recovery rolled it back; the Experiment
   remained `active`, and recovery terminally invalidated the reserved Receipt
   with a recovery/authority reason.
3. Consume interrupted: an `after_manifest_activation` fault on the third
   occurrence left a terminal authority and a pending consume transaction.
   Recovery finalized the consume transaction, preserved `trashed` authority
   and the `consumed` Receipt, and removed all transaction residue.

For each path, repeating `recoverTransition` was byte-idempotent. Retrying the
original transition was terminally rejected or otherwise had no write effect;
the Experiment, Receipt, legacy sentinels, and workspace bytes remained
unchanged. The exact operation-specific transaction descendants were empty
after recovery.

## Target Binding and Sentinel Checks

Two additional no-repository-write probes independently covered authority-
activated `experiment.supersede` and `experiment.baseline.change` recovery.
Both exact targets recovered successfully and consumed their Receipts. Replacing
the approved supersede target or baseline target was rejected before recovery
and was byte-for-byte zero-write; the pending authority marker remained until
the explicitly requested shared transaction recovery. Both probes then ended
with no transaction descendants and unchanged legacy `state.yaml`, `cycle.yaml`,
and `log.yaml` sentinels.

The maintained C23 boundary cases also passed the existing forward target
substitution checks for supersede and baseline, consumed-Receipt replay checks,
and legacy sentinel checks.

## Exact Test Results

Direct modules:

- `node core/test/c23-m1-experiment.test.js`: `6/6` passed.
- `node core/test/c23-m1-experiment-boundary.test.js`: `10/10` passed,
  including all three interruption paths.
- `node core/test/recovery-faults.test.js`: `7/7` passed.
- `node core/test/record-store.test.js`: `13/13` passed.
- `node core/test/receipt-store.test.js`: `22/22` passed.
- `node core/test/runtime-store.test.js`: `13/13` passed.
- `node core/test/workspace-transaction.test.js`: `19/19` passed.
- Direct module total: `90/90` passed.
- Independent target/recovery probes: `2/2` scenarios passed.

Catalog dry-runs:

- `node tests/run_core_tests.mjs --set maintained --dry-run --json`: passed;
  maintained selection `52`.
- `node tests/run_core_tests.mjs --set all --dry-run --json`: passed; all
  selection `168`.

Syntax and diff checks:

- `node --check` passed for `core/src/experiment/index.js`,
  `core/src/receipts/index.js`, `core/src/workspace-store/transaction.js`,
  `core/test/c23-m1-experiment.test.js`, and
  `core/test/c23-m1-experiment-boundary.test.js`.
- `git diff --check` passed with no whitespace diagnostics.
- No-index checks for the existing untracked C23 test files returned the
  expected “different from /dev/null” status and emitted no whitespace
  diagnostics.

## Expected Behavior and Validation Conclusion

Recovery preserves an authority outcome once manifest activation is observable,
rolls back or compensates an unactivated authority outcome, reconciles an
interrupted Receipt consume, and never leaves a reserved Receipt or pending
transaction marker stranded. Receipt actor, intent, object, scope, plan, owner,
and exact transition target bindings remain enforced. Repeated recovery and
retry do not apply a second domain mutation.

The implementation is independently GREEN for the tested C23 M1 recovery
contract. The implementation worker's focused scope remains a residual risk:
the maintained interruption suite uses `trash`; the additional probes exercised
activated supersede and baseline recovery but did not add pre-activation or
consume-interruption cases for those two target-bearing transitions. The full
catalog was inventoried by dry-run only, not executed as a full-suite run.

No implementation or test problems were encountered. One initial shell wrapper
used zsh's read-only `status` variable and was rerun with a different variable
name; the final diff and residue checks passed. The no-index diff check returned
the expected exit status for an untracked-file comparison and emitted no
diagnostics. Runtime was not advanced, no Workflow lifecycle state was written,
and this result is not a Terra audit.
