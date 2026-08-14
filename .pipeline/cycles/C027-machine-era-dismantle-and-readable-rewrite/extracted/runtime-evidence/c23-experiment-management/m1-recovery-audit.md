# C23 M1 Cross-Transaction Recovery Audit

- Worker ID: `c23-m1-recovery-audit-terra`
- Role: independent read-only audit
- Model: `gpt-5.6-terra`
- Effort: `xhigh`
- Date: `2026-07-18` (Asia/Shanghai)
- Verdict: `RED`
- M1 ready for Core milestone verification: `No`
- Workflow Runtime/Continuation advancement: none

## Technical Conclusion

The prior P0 authority and target-binding remediations remain effective: generic
`writeRuntimeObject` rejects Experiment authority, target-bearing Receipts bind
the canonical replacement/baseline target, and the current persisted-view
validator rejects the previously reported duplicate Attempt, missing timestamp,
and unresolved baseline cases. The original reserve -> authority -> consume
interruption paths are also GREEN in the maintained C23 tests.

M1 cannot be verified because the new domain recovery procedure is not itself
recoverable. `recoverTransition` can create a second Receipt consume or Receipt
invalidation transaction, but its next invocation only recovers the four
original transition transaction IDs. A crash during that second recovery write
can leave a pending transaction that blocks all later workspace writes, or makes
the same recovery retry fail. This violates the atomicity and idempotence
guarantee that the remediation was intended to establish.

## Findings

### P1 - Recovery leaves its own Receipt-reconciliation transactions unrecoverable

`RECOVERY_TRANSACTION_STAGES` contains only `reserve`, `authority`, `consume`,
and `invalidate` at `core/src/experiment/index.js:51`, and
`recoverTransitionTransactions` only iterates those names at
`core/src/experiment/index.js:389-392`. However, receipt reconciliation creates
new transactions named `"${operation.id}-recovery-consume"` and
`"${operation.id}-recovery-receipt"` at `core/src/experiment/index.js:321-341`.
Neither ID is ever recovered by a later `recoverTransition` call.

If a process stops after `recovery-consume` or `recovery-receipt` prepares but
before cleanup, the next domain recovery reaches the same Receipt write. The
workspace transaction kernel rejects it because any pending transaction blocks a
new commit at `core/src/workspace-store/transaction.js:71-77`. If the stop occurs
after manifest activation, the Receipt may already be terminal, so
`recoverTransition` can return success while the private pending transaction
directory remains and blocks subsequent unrelated mutations. The shared
`recoverWorkspaceTransaction` can repair the exact internal ID only when an
operator already knows it; the public domain recovery API does not do so.

The recovery method normalizes a `faultInjector` in its options at
`core/src/experiment/index.js:295-301`, but does not pass it to either
reconciliation write at `core/src/experiment/index.js:325-332` or `337-340`.
Consequently the maintained fault tests cannot exercise this recovery-of-recovery
boundary. The three cases only interrupt the original transition, and the first
two manually recover the original authority transaction before calling the
domain recovery API at `core/test/c23-m1-experiment-boundary.test.js:211-216`
and `239-245`.

Expected correction: model recovery reconciliation as a fully enumerated
recoverable stage set, including its terminal consume/invalidate IDs, or use one
deterministic operation journal from which all pending descendants are resolved.
Add fault tests for both recovery-created transaction types at `after_prepare`
and `after_manifest_activation`; retry must clear every transaction descendant,
leave a correct terminal Receipt, preserve the selected Experiment authority,
and permit a subsequent unrelated workspace transaction.

### P2 - Persisted rerun lineage is not validated

For an API-created rerun, `appendAttempt` checks the parent exists before
persisting at `core/src/experiment/index.js:213-218`. Persisted reads do not
enforce that invariant. `normalizeAttempt` merely normalizes a supplied
`rerun_of_attempt_id` as a safe identifier at
`core/src/experiment/index.js:575-603`; `normalizeExperimentView` validates
Attempt uniqueness and baseline membership at `core/src/experiment/index.js:522-555`
without requiring a rerun parent to exist, precede the child, or differ from the
child. A malformed but otherwise valid authority document can therefore expose a
dangling, forward, or self-referential rerun history.

This weakens the M1 logical Experiment/Attempt identity contract. The maintained
AceSim case verifies a normal rerun and rejects a missing parent in an API
request at `core/test/c23-m1-experiment.test.js:89-108`; it has no persisted-read
negative case. Persisted integrity checks should fail closed for unknown,
self-referential, and forward rerun parent IDs.

### P2 - Recovery coverage is narrower than the claimed transition surface

The maintained recovery cases are all `experiment.trash` at
`core/test/c23-m1-experiment-boundary.test.js:196-275`. The retest evidence
truthfully records two ad hoc no-repository-write probes for activated
supersede/baseline recovery at
`.pipeline/runtime/objects/delivery/c23-experiment-management/evidence/m1-recovery-retest.md:53-64`,
but these are not catalogued reproducible cases. There are no maintained
pre-activation or consume-interruption cases for either target-bearing
transition, no negative owner-binding recovery case, and no recovery-of-recovery
fault case. This is not an additional authority bypass by inspection, but it
leaves the new recovery protocol insufficiently evidenced.

## Authority, Integrity, And Scope Assessment

- **Plan and Receipt authority:** the active C23 Runtime and its Continuation
  both bind plan hash
  `77c28b1e7276ed65a1b59eac8bf57198510252df746ae951974ee8ea0a4ed6f6` at
  `.pipeline/runtime/objects/delivery/c23-experiment-management/runtime.yaml:77-80`
  and `continuation.yaml:1-8`. The approved plan record carries the same hash at
  `.pipeline/memory/records/cycle-ba7549ec1a47/decision/decision-eb4cf6e1b6a7f306e53be993cd17e90c.md:108-118,186`.
  The approval and start Receipts are consumed and bind that same delivery and
  plan at `.pipeline/runtime/receipts/receipt-897c02630b2ac604322b6c443caf4e25.yaml:1-18`
  and `.pipeline/runtime/receipts/receipt-52d2f3d897f2e9885f252feeef0baf17.yaml:1-18`.
- **Prior remediation status:** generic Experiment writes are denied before
  Runtime transaction work at `core/src/runtime/index.js:73-80`. Receipt target
  canonicalization/binding is present at `core/src/experiment/index.js:93-127`,
  `395-422`, and recovery rechecks immutable Receipt, target, and reservation
  owner bindings at `703-762`. No regression was found in these paths.
- **Malformed input, secrets, and paths:** recovery rejects raw secret-like data
  before descriptor normalization at `core/src/experiment/index.js:703-718`;
  identifiers and object references use the shared safe-component normalizers at
  `679-700` and `812-826`. Shared Receipt and transaction suites passed their
  raw-secret, drift, traversal, outside-zone, and symlink checks
  (`core/test/receipt-store.test.js:256-279,413-449`;
  `core/test/workspace-transaction.test.js:283-390`).
- **Legacy isolation:** the M1 and recovery tests retain byte checks for the
  legacy sentinel files at `core/test/c23-m1-experiment.test.js:254-261` and
  `core/test/c23-m1-experiment-boundary.test.js:219-221,248-250,272-274`.
  The live focused runs passed.
- **Worker separation and evidence integrity:** the recovery test/retest roles
  are Luna and explicitly do not claim Terra audit
  (`m1-recovery-test.md:3-9`, `m1-recovery-retest.md:3-10`); the implementation
  is Luna and declares no audit claim (`m1-recovery-implementation.md:3-9`).
  This audit is a distinct Terra role. All M1 evidence files, the complete
  Experiment production addition, C23 fixtures/tests, Receipt Store, Runtime,
  workspace transaction/recovery implementation, and relevant shared evidence
  were reviewed. No C23 recovery scope creep was found beyond the Experiment
  Store recovery method and its C23 boundary cases. Pre-existing unrelated dirty
  worktree changes were not attributed to C23.

## Test Design And Results

Read-only focused verification executed against the current worktree:

- Syntax checks passed for `core/src/experiment/index.js`, Receipt Store,
  workspace transaction, Runtime, and both C23 test modules.
- `node core/test/c23-m1-experiment.test.js`: PASS, `6/6`.
- `node core/test/c23-m1-experiment-boundary.test.js`: PASS, `10/10`, including
  the three original reserve/authority/consume interruption scenarios.
- Shared direct suites: Recovery faults `7/7`, Record Store `13/13`, Receipt
  Store `22/22`, Runtime Store `13/13`, and workspace transaction `19/19`.
  Total: `90/90`.
- `node tests/run_core_tests.mjs --set maintained --dry-run --json`: PASS,
  `52` selected, including both C23 files.
- `node tests/run_core_tests.mjs --set all --dry-run --json`: PASS, `168`
  selected.
- `git diff --check` and trailing-whitespace scan of the tracked and untracked
  C23 surfaces: PASS.

The P1 is a code-path recovery failure under interruption of recovery itself, so
the passing tests do not disprove it. No production, test, fixture, catalog,
Receipt, Runtime, Continuation, active pointer, or protected Workflow state was
modified by this audit.

## Expected Behavior, Problems, And Residual Risk

After remediation, every sensitive transition must reach one of two durable,
retry-safe outcomes: original Experiment authority plus a reasoned terminal
compensation, or selected transition authority plus its exact terminal consumed
Receipt. The same must hold if the reconciliation write itself is interrupted;
no `transactions/<operation>-*` descendants may remain, and a later unrelated
transaction must be allowed.

No command or syntax problem was encountered. The blocking problem is the P1
incomplete recovery stage graph. Residual non-blocking risks after its repair are
the persisted rerun lineage invariant and unmaintained target-bearing recovery
fault coverage described above. M1 must remain `executing`; do not mark it
verified or advance Core milestone state until P1 is fixed, independently tested,
and re-audited.

## Modified File

- `.pipeline/runtime/objects/delivery/c23-experiment-management/evidence/m1-recovery-audit.md`
