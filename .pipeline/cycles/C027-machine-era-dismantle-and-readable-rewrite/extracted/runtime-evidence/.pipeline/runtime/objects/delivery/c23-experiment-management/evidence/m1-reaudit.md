# C23 M1 Experiment Authority Remediation Re-Audit

- Worker ID: `c23-m1-reaudit-terra`
- Role: independent read-only audit
- Model: `gpt-5.6-terra`
- Effort: `xhigh`
- Timestamp: `2026-07-18T14:43:17+08:00` (Asia/Shanghai)
- Verdict: `RED`
- Workflow Runtime advancement: none

## Conclusion

The two prior P0 findings are remediated: public `writeRuntimeObject` rejects an Experiment before any manifest read or write, Receipt targets are normalized and bound, and persisted Experiment integrity checks now fail closed. The focused C23 and shared suites pass.

M1 is nevertheless not safe to verify. A sensitive Experiment transition is three independently recoverable transactions: Receipt reserve, Experiment authority write, then Receipt consume. If interruption occurs after the authority transaction activates but before consumption, recovery finalizes the Experiment change while the Receipt remains `reserved`. The Experiment Store cannot retry or reconcile that state because retry begins by reserving the Receipt and the Receipt Store accepts reservations only from `issued`. This reports a failed operation after a durable trash/supersede/baseline change and leaves no domain recovery path to complete the consumption record.

This is an M1 blocking recovery and Receipt-authority defect. It does not claim C23 completion; later milestones and real project runs remain out of scope.

## Findings

### P1 - Sensitive Experiment changes can commit while their Receipt is permanently stranded in `reserved`

`receiptTransition` reserves first, writes Experiment authority second, and consumes last at [core/src/experiment/index.js](/home/heyx/Hypo-Workflow/core/src/experiment/index.js:294), [core/src/experiment/index.js](/home/heyx/Hypo-Workflow/core/src/experiment/index.js:306), and [core/src/experiment/index.js](/home/heyx/Hypo-Workflow/core/src/experiment/index.js:310). Its only compensation is for `ERR_RECEIPT_CONTEXT_DRIFT`; a storage/interruption failure after the authority write is rethrown without invalidation, consumption, or domain recovery at [core/src/experiment/index.js](/home/heyx/Hypo-Workflow/core/src/experiment/index.js:316).

The workspace transaction marks authority active before the injectable post-activation point at [core/src/workspace-store/transaction.js](/home/heyx/Hypo-Workflow/core/src/workspace-store/transaction.js:153). Recovery treats fully installed authority data plus the activated manifest as finalized at [core/src/workspace-store/transaction.js](/home/heyx/Hypo-Workflow/core/src/workspace-store/transaction.js:279). Meanwhile, a subsequent Store retry calls `reserveReceipt`, which rejects every state other than `issued` at [core/src/receipts/index.js](/home/heyx/Hypo-Workflow/core/src/receipts/index.js:183).

Independent `/tmp` fault injection reproduced the defect for `experiment.trash`: the second `after_manifest_activation` event (the authority transaction) threw; `recoverWorkspaceTransaction(..., { id: "cross-transition-authority" })` returned `finalized`; the Experiment lifecycle read as `trashed`; the Receipt read as `reserved`; retrying `store.trash` with the same valid envelope rejected at reservation. The same control flow serves supersede, restore, and baseline change. A reserved Receipt still blocks replay, but it is not consumed and does not provide a recoverable terminal record for the operation that has already changed authority.

Expected remediation: make the Receipt terminal transition and Experiment authority write one recoverable domain transaction, or add an idempotent Experiment-transition recovery protocol that can prove the reserved operation's authority outcome and consume or compensate it. Cover every interruption boundary: after reserve, during authority write, after authority activation, and during consume.

### P2 - Maintained C23 tests do not cover the blocking reserve-authority-consume recovery boundary

The seven-case boundary suite covers generic-write denial, target substitution, normal consumed replay, and selected integrity errors at [core/test/c23-m1-experiment-boundary.test.js](/home/heyx/Hypo-Workflow/core/test/c23-m1-experiment-boundary.test.js:18); it has no fault-injected sensitive transition. The original suite exercises normal trash/restore and baseline consumption at [core/test/c23-m1-experiment.test.js](/home/heyx/Hypo-Workflow/core/test/c23-m1-experiment.test.js:164) and [core/test/c23-m1-experiment.test.js](/home/heyx/Hypo-Workflow/core/test/c23-m1-experiment.test.js:208), not recovery between authority commit and Receipt consumption. The shared Receipt recovery test covers Receipt issuance alone at [core/test/receipt-store.test.js](/home/heyx/Hypo-Workflow/core/test/receipt-store.test.js:450), while workspace-transaction tests cover one transaction at a time.

Therefore the test2 worker's 6/6 + 7/7 + shared-suite PASS evidence establishes normal behavior but cannot establish the asserted sensitive-transition recovery behavior. Add a maintained test that reproduces the P1 sequence and asserts a terminal Receipt plus an idempotent retry/recovery outcome.

## Verified Remediations

- **Generic Runtime authority:** `writeRuntimeObject` rejects kind `experiment` before transaction-option normalization and manifest loading at [core/src/runtime/index.js](/home/heyx/Hypo-Workflow/core/src/runtime/index.js:73). An independent no-manifest probe confirmed `ERR_RUNTIME_EXPERIMENT_WRITE_FORBIDDEN` with no directory writes. Experiment Store persistence remains domain-owned through normalized runtime documents and `commitWorkspaceTransaction` at [core/src/experiment/index.js](/home/heyx/Hypo-Workflow/core/src/experiment/index.js:335). A post-activation create fault recovered to a readable Experiment with the transaction finalized.
- **Receipt target authority:** supersede and baseline changes require a normalized target; trash and restore reject targets at [core/src/experiment/index.js](/home/heyx/Hypo-Workflow/core/src/experiment/index.js:97). The target hash binds both scope and plan hash at [core/src/experiment/index.js](/home/heyx/Hypo-Workflow/core/src/experiment/index.js:608), and the mutation recomputes and compares the expected target context before authority write at [core/src/experiment/index.js](/home/heyx/Hypo-Workflow/core/src/experiment/index.js:301). The independent substitution probe confirmed authority stability and Receipt `invalidated`, not merely non-consumed.
- **Attempt and baseline integrity:** persisted reads reject duplicate Attempt IDs and duplicate/missing baseline history bindings at [core/src/experiment/index.js](/home/heyx/Hypo-Workflow/core/src/experiment/index.js:405). Attempts require ordered `started_at` and `finished_at` at [core/src/experiment/index.js](/home/heyx/Hypo-Workflow/core/src/experiment/index.js:477), while baseline history reuse is rejected at [core/src/experiment/index.js](/home/heyx/Hypo-Workflow/core/src/experiment/index.js:513). Append reads the normalized persisted view first, so it inherits these fail-closed checks.
- **Shared boundaries:** the Experiment Store retains manifest validation, guarded paths and symlink refusal, canonical-value/secret checks, and injected zero-argument clocks through the shared Runtime, Receipt, and workspace transaction helpers. Frozen legacy lifecycle sentinels are checked in the C23 mutation tests.

## Expected M1 Behavior

A sensitive transition must either leave both Experiment authority and the Receipt unchanged, or durably leave the Experiment in its new state with the exact Receipt terminally `consumed`. Following recovery, the domain Store must be able to return that same terminal outcome idempotently; it must not report a failed operation while authority has changed and the Receipt is stranded as `reserved`.

## Test And Evidence Review

- Approved C23 plan and runtime: M1 is executing, has strict test/implement/audit separation, and is limited to Experiment authority, logical identity, history semantics, baseline changes, and pilot fixtures at [runtime.yaml](/home/heyx/Hypo-Workflow/.pipeline/runtime/objects/delivery/c23-experiment-management/runtime.yaml:4). The approved plan assigns append-friendly Git Records and materialized status to later M5 at [decision-eb4cf6e1b6a7f306e53be993cd17e90c.md](/home/heyx/Hypo-Workflow/.pipeline/memory/records/cycle-ba7549ec1a47/decision/decision-eb4cf6e1b6a7f306e53be993cd17e90c.md:160).
- Prior RED audit, remediation implementation evidence, test2 evidence, original M1 implementation/test evidence, production changes, both C23 test files, fixtures, Receipt/Runtime/Record/workspace transaction code, and regression catalog were inspected.
- `node core/test/c23-m1-experiment.test.js` - PASS, 6/6.
- `node core/test/c23-m1-experiment-boundary.test.js` - PASS, 7/7.
- `node --test core/test/record-store.test.js core/test/receipt-store.test.js core/test/runtime-store.test.js core/test/workspace-transaction.test.js` - PASS, 4/4 suites.
- `node --check` for the two production and two C23 test files - PASS.
- Maintained Core and scenario runner dry-runs - PASS: 52 Core paths and 8 scenarios selected; both C23 paths are catalogued.
- `git diff --check` - PASS.
- Independent temporary-workspace probes - PASS for no-manifest generic-write denial, target-drift invalidation, baseline historical-ID reuse rejection, and single-domain-transaction recovery; FAIL for the P1 cross-transaction recovery invariant as described above.

## Worker Separation And Scope

The active delivery requires strict test/implement/audit identity separation at [runtime.yaml](/home/heyx/Hypo-Workflow/.pipeline/runtime/objects/delivery/c23-experiment-management/runtime.yaml:84). This worker (`c23-m1-reaudit-terra`, audit, Terra) is distinct from `c23-m1-remediate-implement-luna` (implement) and `c23-m1-remediation-test2-luna` (test); their evidence declares the required Luna identities and no Runtime advancement.

The named remediation evidence limits production changes to `core/src/runtime/index.js` and `core/src/experiment/index.js`; test2 limits its change to the optional-target adaptation in `core/test/c23-m1-experiment.test.js`. The M1 export, kind registration, C23 fixtures/boundary test, and catalog entry are consistent with the original M1 surface. No out-of-scope change attributable to either named remediation worker was found. The worktree contains substantial pre-existing unrelated tracked and untracked changes, so they were not attributed to these workers or modified by this audit.

## Residual Risks And Follow-up

- The previous concern that durable Experiment facts are currently mutable Runtime data rather than immutable Records remains real. It is a documented later-M5 risk rather than an additional M1 blocker: M5 is the approved milestone for append-friendly Git Records and materialized summaries. It must not be treated as resolved by this M1 audit.
- Add persisted-read tests for reverse timestamp ordering, duplicate baseline history, and mismatched current baseline, even though the implementation now rejects them by inspection. These are coverage improvements, not the reason for this RED verdict.
- After repairing P1, rerun the C23 suites and the shared Receipt/Runtime/Record/workspace transaction suites, including the new interruption-recovery test. Re-audit M1 before changing its Runtime status.

## Modified Files

- `.pipeline/runtime/objects/delivery/c23-experiment-management/evidence/m1-reaudit.md` (this audit evidence only).

## Problems

The shared worktree was already dirty and contains unrelated changes. No production, test, fixture, hook, catalog, protected Workflow file, existing evidence, or Workflow Runtime record was modified by this worker. Workflow Runtime was not advanced.
