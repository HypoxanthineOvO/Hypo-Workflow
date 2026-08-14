# C23 M1 Recovery Implementation Evidence

- Worker ID: `c23-m1-recovery-implementation-luna`
- Role: implementation only
- Model: `gpt-5.6-luna`
- Effort: `xhigh`
- Date: `2026-07-18` (Asia/Shanghai)
- Verdict: `GREEN_FOCUSED`
- Audit claim: none

## Exact Modified Files

- `core/src/experiment/index.js`
- `.pipeline/runtime/objects/delivery/c23-experiment-management/evidence/m1-recovery-implementation.md`

`core/src/index.js`, tests, fixtures, regression catalog, and protected Workflow files were not modified by this worker.

## Design

The public Experiment Store now exposes:

```js
store.recoverTransition(root, transitionDescriptor, { id: operationId })
```

The recovery descriptor uses the existing Receipt envelope. Recovery first validates the immutable Receipt binding,
reservation owner, lifecycle source, and exact target hash for supersede/baseline transitions. It then invokes the
existing `recoverWorkspaceTransaction` API for the reserve, authority, consume, and context-invalidation transaction
ids. The current Experiment authority determines the outcome after those markers are reconciled:

- Activated authority is preserved; a stranded reserved Receipt is consumed, and an unusable issued Receipt is
  compensated with a recovery reason.
- Non-activated authority remains rolled back/original; an issued or reserved Receipt is invalidated with
  `experiment_transition_recovery_authority_not_activated`.
- Already terminal Receipts and already reconciled authority are left unchanged.

No transaction or Receipt paths are written directly. Existing Experiment authority compilation, Receipt transitions,
workspace path guards, secret checks, manifest transactions, and legacy sentinel boundaries remain in force.

## Validation Commands and Results

- `node --check core/src/experiment/index.js`: PASS.
- `git diff --check -- core/src/experiment/index.js`: PASS.
- `node core/test/c23-m1-experiment-boundary.test.js`: PASS, `10/10` tests.
  This includes authority-activated, authority-not-activated, and consume-interruption recovery cases.
- Initial focused run exposed a local `root is not defined` parameter mistake in the new reconciler; the production
  call signature was corrected and the complete focused suite was rerun successfully.

Only the focused C23 boundary tests were run, as requested. No full-suite run and no independent audit were performed.

## Expected Behavior

Recovery deterministically removes pending transaction residue, preserves authority once its manifest activation is
observable, compensates a pre-activation interruption without mutating the Experiment, and is byte-idempotent on
repetition. A retry of the original transition sees a terminal Receipt and cannot apply a second authority mutation.

## Residual Risks

- Focused boundary coverage exercises `experiment.trash`; supersede/baseline recovery validation is implemented but not
  independently exercised by this worker.
- Unexpected external authority/Receipt drift fails closed with a recovery conflict; resolving such drift requires a
  separate operator decision.
- Independent audit and broader regression coverage remain for the designated audit worker.
