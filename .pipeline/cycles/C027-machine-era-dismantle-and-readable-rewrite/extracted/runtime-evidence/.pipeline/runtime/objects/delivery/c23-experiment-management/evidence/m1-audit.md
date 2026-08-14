# C23 M1 Experiment Management Audit

- Worker ID: c23-m1-audit-terra
- Role: audit
- Model: gpt-5.6-terra
- Effort: xhigh
- Timestamp: 2026-07-18T14:10:52+08:00 (Asia/Shanghai)
- Verdict: RED
- M1 safe to verify: No.

## Conclusion

M1 implements the intended happy-path API, transactional Runtime writes, logical Experiment/Attempt identity, and legacy lifecycle sentinels. It is not safe to verify. A public generic Runtime writer can directly replace Experiment authority and bypass the Experiment Store, append-only history rule, and Receipt gates. Supersede and baseline-change Receipts bind the current Experiment but not the proposed replacement or baseline, so a valid confirmation can authorize a substituted target payload.

## Findings

### P0 - Generic Runtime writes bypass Experiment authority, Receipt gates, and append-only history

experiment is globally added to the Runtime object-kind allowlist at core/src/runtime/internal.js:12-17. The root exports the generic writeRuntimeObject API at core/src/index.js:54-60. That API accepts every allowed kind and writes Runtime/Continuation documents at core/src/runtime/index.js:73-92 after generic checks only at core/src/runtime/index.js:127-180. It never calls normalizeExperimentView, enforces append-only attempts, or demands a Receipt.

Any Core caller can therefore replace an experiment runtime.yaml and continuation.yaml directly: it can truncate or replace attempts, reactivate a trashed Experiment, change a baseline, or manufacture projected status. This bypasses the Store checks at core/src/experiment/index.js:160-205 and core/src/experiment/index.js:237-270. The generic Runtime suite deliberately permits in-place object updates at core/test/runtime-store.test.js:180-207, so this is a supported writer rather than an unreachable path.

This violates the approved C23 authority split across Runtime, Records, and Receipts, and invalidates the claims of Receipt-gated transitions and immutable attempt history.

### P0 - Supersede and baseline Receipts do not bind the proposed target

buildExperimentReceiptContext accepts only the current Experiment, actor, and intent at core/src/experiment/index.js:86-104. Supersede binds only object_ref and lifecycle at core/src/experiment/index.js:532-550. Baseline change hashes the current Experiment but includes no proposed baseline. The normalizer removes replacement/baseline before validating the Receipt envelope at core/src/experiment/index.js:486-507, while the mutation applies the unbound caller payload at core/src/experiment/index.js:208-234 and core/src/experiment/index.js:255-270.

A Receipt issued to supersede an active Experiment can create any valid replacement naming it. A Receipt issued for a baseline change can install any valid new baseline. The shared Receipt store correctly provides one-shot and drift-sensitive context at core/src/receipts/index.js:428-450, but the context does not describe the authorized effect. This is an authorization-scope bypass.

### P1 - Durable Experiment facts are mutable Runtime state rather than immutable Records

The implementation stores the whole Experiment definition, Attempt history, baseline history, lifecycle, and status as mutable Runtime files at core/src/experiment/index.js:318-330 and core/src/experiment/index.js:570-581. It does not use the Record writer. Attempts, baselines, and supersession evidence are durable historical facts; the project authority contract assigns durable facts to Records and current lifecycle to Runtime.

The Record writer has deterministic identities, immutable content, and explicit supersedes behavior at core/src/records/index.js:58-83, core/test/record-store.test.js:40-70, and core/test/record-store.test.js:224-277. M1 emits no such Records. The generic Runtime overwrite in the P0 finding can erase audit history.

### P2 - Attempt and baseline referential invariants are incomplete

normalizeAttempt only checks that baseline_id is syntactically safe; it never requires membership in baseline_history at core/src/experiment/index.js:413-439. normalizeExperimentView permits duplicate persisted Attempt IDs and never checks each Attempt against historical baselines at core/src/experiment/index.js:385-410. The duplicate guard protects only newly appended attempts at core/src/experiment/index.js:186-188.

Timestamps are optional at core/src/experiment/index.js:432-437, while status derivation selects -Infinity timestamp attempts by insertion order at core/src/experiment/index.js:462-484. The stated M1 behavior is newest execution timestamp. A timestamp-less attempt can become current by append order and an unknown baseline reference makes history unverifiable.

### P2 - M1 tests omit the authorization and integrity boundaries claimed by the evidence

core/test/c23-m1-experiment.test.js:46-209 covers six happy paths and checks three frozen legacy files. It does not test direct writeRuntimeObject overwrite, Receipt replay after consumption, state drift, reservation ownership, reserve/authority/consume interruption recovery, replacement/baseline target substitution, unsafe identifiers, symlinked Experiment directories, duplicate persisted Attempt IDs, missing timestamps, or unknown baseline IDs.

The shared suites cover generic Receipt replay/context drift and transaction recovery/path defense at core/test/receipt-store.test.js:205-343, core/test/workspace-transaction.test.js:37-132, and core/test/workspace-transaction.test.js:345-390. They do not prove the Experiment integration has a sufficient Receipt scope or preserves Experiment invariants. The M1 test only asserts consumed state at core/test/c23-m1-experiment.test.js:159-167 and core/test/c23-m1-experiment.test.js:195-207; it never attempts a second use.

## Test and Evidence Review

- Approved plan: the C23 record defines M1 as Experiment authority, logical Experiment/Attempt identity, historical trash/restore, baseline changes, and NeRF-like/AceSim-like fixtures. It requires manifest/Runtime/Records/Receipts authority and frozen legacy lifecycle files: .pipeline/memory/records/cycle-ba7549ec1a47/decision/decision-eb4cf6e1b6a7f306e53be993cd17e90c.md.
- Runtime: the active C23 Delivery uses approved plan hash 77c28b1e7276ed65a1b59eac8bf57198510252df746ae951974ee8ea0a4ed6f6; M1 is executing and strict test/implement/audit separation is required: .pipeline/runtime/objects/delivery/c23-experiment-management/runtime.yaml. This audit did not advance Runtime.
- Implementation evidence: m1-implementation.md reports six focused passing tests and no legacy lifecycle writes. Code review corroborates the Store-owned Runtime path and shared transaction path/security controls, but not the domain authority boundary.
- Test evidence: m1-test.md describes the six cases. The fixtures contain the expected stale NeRF OOM followed by success and explicit AceSim rerun parent at core/test/fixtures/c23-m1/nerf-like.json:46-80 and core/test/fixtures/c23-m1/acesim-like.json:47-82. They are reference data, not real project runs.
- Independent read-only checks: node --check passed for core/src/experiment/index.js, core/src/index.js, core/src/runtime/internal.js, and core/test/c23-m1-experiment.test.js. git diff --check passed for the tracked M1 integration diff. The focused suite was not rerun because this audit was restricted to read-only work and its helpers create temporary workspaces.

## Expected Behavior After Remediation

1. Make the Experiment Store the only supported Experiment authority writer. Generic Runtime APIs must reject experiment, or Experiment persistence must be private and domain-validated before every write.
2. Store append-only Attempt, baseline, and supersession facts as immutable Records or an equally append-only Experiment event authority. Runtime should retain only current lifecycle/status projection and record references.
3. Bind a canonical hash of the proposed replacement or baseline into Receipt scope and verify it before reserve/consume. Preserve any intentional state-drift policy explicitly.
4. Require or explicitly define execution timestamps, enforce unique persisted Attempt IDs, and require baseline_id to resolve in the historical baseline set.
5. Add focused negative and fault-injection tests for these boundaries, including consumed-Receipt replay and legacy sentinel checks on failure paths.

## Residual Risks and Follow-up

Shared manifest validation, safe identifiers, guarded paths, symlink rejection, and transaction recovery have focused coverage. They do not compensate for a domain authority bypass through the permitted generic Runtime API.

After remediation, rerun the focused C23 M1 suite plus Record, Receipt, Runtime, and workspace-transaction suites. Assert that generic Runtime writes cannot create or mutate an Experiment, no legacy lifecycle file changes, and an independent audit accepts the revised Receipt scopes before M1 verification.
