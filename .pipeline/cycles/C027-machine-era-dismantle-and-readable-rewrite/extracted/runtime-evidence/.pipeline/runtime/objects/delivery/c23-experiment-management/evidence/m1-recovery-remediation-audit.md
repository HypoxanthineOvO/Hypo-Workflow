# C23 Revision 1 M1 Recovery Remediation Fresh Independent Audit

- Worker ID: `c23-m1-recovery-remediation-audit-terra`
- Role: `audit` only
- Semantic assessment: complexity `bounded`; uncertainty `medium`; oracle `mixed`; blast radius `authority`; hazards `recovery_conflict`, `runtime_authority`; routing class `critical`
- Audit date: 2026-07-18 (Asia/Shanghai)
- Verdict: `PASS` for the approved revision-1 M1 outcome
- Workflow Runtime/Continuation advancement: none

## Findings By Severity

### P0/P1: none

The two prior recovery blockers are closed in the current production path and independently reproduced:

- **Prior P1 recovery-of-recovery defect: closed.** `RECOVERY_TRANSACTION_STAGES` now includes `recovery-consume` and `recovery-receipt` (`core/src/experiment/index.js:51-58`), recovery enumerates all of those deterministic descendants (`:403-406`), and recovery-created Receipt writes receive the operation fault injector (`:328-355`). The maintained remediation test passes both `after_prepare` and `after_manifest_activation` fault cases, clears the descendant, converges authority and Receipt, is byte-idempotent on repeat, and permits a later unrelated transaction.
- **Prior P2 persisted rerun-lineage defect: closed.** Persisted reads reject duplicate Attempt IDs and require every `rerun_of_attempt_id` to identify a distinct earlier Attempt (`core/src/experiment/index.js:536-557`). The maintained remediation test independently rejects unknown, self, and forward parents.

### P2: target-bearing recovery coverage remains a documented residual risk, not an M1 blocker

The maintained recovery-of-recovery tests use `experiment.trash`; they do not provide catalogued fault-injection cases for recovery-created Receipt transactions under target-bearing `experiment.supersede` and `experiment.baseline.change`. This is a coverage gap in the evidence surface.

It does not block the approved M1 outcome in this audit because the action-specific recovery path was independently exercised in a temporary workspace across both target-bearing transitions and all three original interruption positions:

- `supersede`: authority `after_prepare`, authority `after_manifest_activation`, and Receipt consume interruption: `3/3` PASS.
- `baseline.change`: authority `after_prepare`, authority `after_manifest_activation`, and Receipt consume interruption: `3/3` PASS.
- Combined target-bearing matrix: `6/6` PASS, with exact target binding, compensation or finalization as appropriate, terminal Receipt state, empty transaction directory, and byte-idempotent repeated recovery.

The remaining missing maintained cases should be added before broadening recovery semantics or relying on target-bearing recovery as a standalone public contract. They are not evidence of a current M1 authority or recovery failure.

### P2: durable Experiment history remains mutable Runtime authority

Attempts, baseline history, and supersession facts are still stored in the Experiment Runtime document rather than immutable Records. This is the previously documented later-M5 design risk; M1's approved revision-1 scope uses the current Experiment Store authority and does not require the M5 Record redesign. The remediation did not claim this risk was resolved.

## Exact Validation

### Active authority and revision binding

- `.pipeline/manifest.yaml` selects the current-format workspace and `.pipeline/runtime/active.yaml` selects `c23-experiment-management`.
- Active `.pipeline/runtime/objects/delivery/c23-experiment-management/runtime.yaml` and `continuation.yaml` both bind revision `1` and plan hash `dc63837d450c3006b9ba106027f1fafdf218e9a13e1c185ae03dd1f952821c0e`.
- The active plan Record is `decision-861cb23500113ed79b04c1b99f29ee2e`, whose embedded revision-1 plan hash is the same `dc63837d...`; revision-1 approval/start Receipts also bind that hash and are `consumed`.
- Revision-0 plan Record `decision-eb4cf6e1b6a7f306e53be993cd17e90c` and older evidence contain historical plan hash `77c28b1e...`. Those records are explicitly superseded by revision 1 and are evidence history, not current Runtime/Continuation authority. No active hash drift was found.

### Authority, target binding, and integrity boundaries

- Generic `writeRuntimeObject` rejects `experiment` before manifest read or transaction work (`core/src/runtime/index.js:73-80`); the C23 generic-writer zero-write test passes.
- Supersede and baseline Receipt scopes and plan hashes include the canonical target hash (`core/src/experiment/index.js:814-837`), and transition verification recomputes the expected target before authority write (`:409-445`). Target A to target B substitution tests pass with unchanged authority and no consumed Receipt.
- Persisted Attempt uniqueness, timestamp requirements, baseline-history membership, and rerun-parent ordering all fail closed in the current normalizer (`core/src/experiment/index.js:536-600`). The C23 boundary and remediation tests pass.
- Shared Receipt actor/intent/object/scope/plan/owner checks, Runtime object references, workspace path/symlink guards, secret rejection, and transaction recovery remain effective in the independently passing shared suites.
- Current repository `.pipeline/runtime/transactions/` has no transaction descendants. All temporary-workspace recovery cases also ended with no transaction descendants.

### Tests and catalog

Focused C23 direct runs, independently executed:

- `node core/test/c23-m1-experiment.test.js`: `6/6` PASS.
- `node core/test/c23-m1-experiment-boundary.test.js`: `10/10` PASS.
- `node core/test/c23-m1-recovery-remediation.test.js`: `5/5` PASS.
- C23 focused total: `21/21` PASS.

Shared direct runs, independently executed:

- `recovery-faults.test.js`: `7/7`; `recovery-journal.test.js`: `14/14`; `recovery-pack.test.js`: `15/15`.
- `record-store.test.js`: `13/13`; `receipt-store.test.js`: `22/22`; `runtime-store.test.js`: `13/13`; `workspace-transaction.test.js`: `19/19`.
- Shared total: `103/103` PASS.

Additional checks:

- `node tests/run_core_tests.mjs --set maintained --dry-run --json`: catalog valid, `53` maintained selected, all three C23 M1 paths selected.
- `node tests/run_core_tests.mjs --set all --dry-run --json`: catalog valid, `169` paths selected.
- `node --check` for current Experiment, Runtime, Receipt, workspace-transaction, Core export, and all three C23 test modules: PASS.
- `git diff --check`: PASS.

### Worker identity separation

Inspected evidence has distinct role identities, including `c23-m1-implement-luna`, `c23-m1-test-luna`, `c23-m1-audit-terra`, `c23-m1-recovery-remediation-main`, `c23-m1-recovery-remediation-test-luna`, `c23-m1-recovery-remediation-retest`, and prior recovery `test`/`audit` workers. This audit uses the distinct ID `c23-m1-recovery-remediation-audit-terra`; no test or implementation claim is made.

## Conclusion

`PASS` for revision-1 M1 recovery remediation and the approved M1 Experiment authority outcome. The prior recovery-of-recovery and persisted rerun-lineage defects are closed; generic Runtime write denial, target binding, integrity validation, Receipt lifecycle, transaction recovery, legacy isolation, and worker separation remain effective. Target-bearing supersede/baseline recovery breadth is a documented P2 residual risk, supported by a passing independent `6/6` action-specific interruption matrix, and is not blocking this approved M1 outcome.

M1 remains `executing` in the active Runtime because this audit was read-only with respect to Workflow lifecycle state. No milestone, pointer, Receipt, Runtime, Continuation, manifest, catalog, test, fixture, hook, version, cachebuster, or legacy file was advanced or modified.

## Expected Behavior

Every sensitive Experiment transition must converge after interruption to either original authority plus a reasoned terminal Receipt compensation, or the exact selected authority plus its terminal consumed Receipt. Recovery retries must reconcile every transaction descendant, leave no pending transaction residue, preserve target binding and ownership, and be byte-idempotent. Persisted rerun history must reject dangling, self-referential, and forward parent links.

## Modified File

- `.pipeline/runtime/objects/delivery/c23-experiment-management/evidence/m1-recovery-remediation-audit.md` only.

## Problems Encountered

The first ad-hoc target matrix wrapper had a local assertion mistake and a follow-up diagnostic wrapper had a shell-input syntax typo. Neither touched the repository or altered a test result. The corrected independent matrix completed `6/6` PASS; no production, test, fixture, or Workflow-state problem was encountered.

## Residual Risks / Follow-up

- Add maintained target-bearing recovery-of-recovery cases for supersede and baseline change, especially both Receipt-reconciliation fault phases, before treating that coverage as a complete public recovery contract.
- Keep the immutable-Record redesign for Experiment historical facts tracked under the approved later-M5 scope.
- The maintained/all catalog checks above were dry-runs; this audit did not run the full 53- or 169-path catalog.
