# C23 M1 Recovery Test Evidence

- Worker ID: `c23-m1-recovery-test-luna`
- Role: test source and evidence only
- Model: `gpt-5.6-luna`
- Effort: `xhigh`
- Date: `2026-07-18` (Asia/Shanghai)
- Verdict: `RED_READY`
- Workflow Runtime advancement: none

## Contract and Test Design

The maintained tests define the smallest reversible public recovery contract as:

```js
store.recoverTransition(root, transitionDescriptor, { id: operationId })
```

`transitionDescriptor` reuses the public Experiment Receipt envelope: `object_ref`,
`receipt_id`, `actor`, `intent`, `scope`, `plan_hash`, and `tool_use_id`. A
targeted transition must carry its exact `replacement` or `baseline` value in the
same descriptor; the recovery scenarios here use `experiment.trash`, so no target
is applicable. The operation id is passed through the existing Store options
shape, keeping the recovery request scoped to the same reserve, authority, and
consume transaction ids.

Three maintained tests were added to the existing boundary file:

1. Authority activated: a second `after_manifest_activation` fault rejects the
   original trash operation after the authority transaction activates. The test
   finalizes that authority transaction with shared `recoverWorkspaceTransaction`,
   calls `recoverTransition`, and requires a trashed Experiment, a terminal Receipt
   (`consumed`, or an explicitly reasoned terminal compensation), no transaction
   residue, and no mutation on repeated recovery or retry.
2. Authority not activated: a second `after_prepare` fault rejects the operation
   before authority activation. Shared recovery must roll back the authority
   transaction; `recoverTransition` must leave the Experiment active and move the
   reserved Receipt to a terminal invalidation/compensation with a reason.
3. Consume interrupted: a third `after_manifest_activation` fault rejects during
   Receipt consumption after authority is already terminal. `recoverTransition`
   must recognize/finalize the consumed Receipt, remove consume transaction
   residue, and remain retry-safe.

All scenarios use `temporaryCurrentWorkspace`, the existing C23 fixtures, a fixed
Experiment/Receipt clock, and legacy sentinel checks. Assertions observe domain
state, Receipt terminal state, transaction residue, and byte-for-byte idempotence;
they do not require a private implementation name.

## Exact Modified Files

- `core/test/c23-m1-experiment-boundary.test.js`
- `.pipeline/runtime/objects/delivery/c23-experiment-management/evidence/m1-recovery-test.md`

No catalog entry was edited because `core/test/c23-m1-experiment-boundary.test.js`
was already maintained and catalogued.

## RED Results Before Implementation

- Baseline boundary suite before the additions: `7/7` passed.
- Baseline C23 Experiment suite: `6/6` passed.
- After adding the three recovery tests: `10` total, `7` passed, `3` failed.
- All three failures are the intended missing public contract:
  `store.recoverTransition is not a function`.
- The original seven boundary cases remained green; no existing case was weakened
  or removed.

Validation performed:

- `node --check core/test/c23-m1-experiment-boundary.test.js`: PASS.
- `git diff --check` on the tracked surface: PASS; the no-index checks against
  `/dev/null` for both new files emitted no whitespace diagnostics (their diff
  exit status `1` is expected because the files are untracked additions).
- `node tests/run_core_tests.mjs --set maintained --dry-run --json`: PASS,
  maintained selection `52`.
- `node tests/run_core_tests.mjs --set all --dry-run --json`: PASS, all selection
  `168`.

## Expected GREEN Behavior

The implementation worker may choose the exact internal transaction arrangement,
but GREEN must make each recovery request deterministic and idempotent: an
authority outcome and its Receipt must never remain split with a reserved Receipt,
and pending transaction markers must be gone after recovery. A post-activation
authority outcome must reconcile to trashed plus consumed (or a documented
terminal compensation that cannot be reused). A pre-activation outcome must
reconcile to active plus terminal invalidated/compensated. A consume interruption
must recognize the already-consumed Receipt while preserving the terminal
authority. Repeating `recoverTransition` and retrying the original transition
must not change any workspace bytes or domain state.

## Problems and Risks

- The public recovery API does not yet exist, which is the sole observed failure
  in each new test; production code was not changed by this worker.
- The tests allow terminal compensation for the authority-activated case only
  when it is terminal and reasoned; they do not allow a stranded `reserved`
  Receipt or a second authority mutation.
- The consume test intentionally leaves the consume transaction pending for
  `recoverTransition` to reconcile, while the authority-interruption tests call
  shared workspace recovery first as required by the scenario.
- This test tranche uses trash because it is the smallest sensitive transition;
  supersede and baseline target binding remain covered by the existing boundary
  cases and must preserve exact target binding when the recovery API is extended.

Workflow Runtime was not advanced. No production source, fixture, catalog, hook,
protected lifecycle/state/log/progress/continuation/plan file, or existing
evidence file was modified.
