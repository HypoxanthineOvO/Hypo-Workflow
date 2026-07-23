# C23 M1 Remediation Implementation Evidence

- Worker ID: `c23-m1-remediate-implement-luna`
- Role: production remediation implementer
- Model: `gpt-5.6-luna`
- Effort: `xhigh`
- Date: 2026-07-18 (Asia/Shanghai)
- Runtime advancement: none

## Conclusion

Implemented the sanitized remediation contract for the two Terra P0 findings and the specified Experiment integrity boundaries. The public generic Runtime writer now rejects `experiment` authority before manifest/transaction work, while generic reads remain available and Experiment Store persistence continues to use the existing compile-plus-workspace-transaction path. Receipt target substitution is fail-closed through normalized target hashes and expected-context comparison. Attempt and baseline history validation now rejects the specified malformed persisted states.

## Technical Approach

- Added `ERR_RUNTIME_EXPERIMENT_WRITE_FORBIDDEN` in `writeRuntimeObject` after compilation but before transaction option normalization, manifest read, or workspace commit.
- Extended `buildExperimentReceiptContext` with conditional target handling:
  - `experiment.supersede` requires and domain-normalizes a replacement definition.
  - `experiment.baseline.change` requires and domain-normalizes a baseline, including historical-ID reuse checks.
  - `experiment.trash` and `experiment.restore` reject an unexpected target.
  - A canonical normalized target SHA-256 is included in both Receipt scope and plan hash.
- Passed the normalized replacement/baseline target from `supersede` and `changeBaseline` into the expected Receipt context before envelope comparison and consumption. Supersede state binding remains only `{object_ref, lifecycle}`, so appended attempts do not change its intentional stability.
- Required `started_at` and `finished_at` on every Attempt, rejected reverse execution intervals, rejected duplicate persisted Attempt IDs, required current/attempt baseline IDs to resolve in a non-empty unique baseline history, and rejected baseline changes reusing any historical ID.

## Production Files Changed

- `core/src/runtime/index.js`
- `core/src/experiment/index.js`

No tests, fixtures, hooks, legacy lifecycle files, Runtime/continuation state, or existing evidence files were modified.

## Expected Behavior

Generic callers cannot overwrite or manufacture Experiment Runtime authority through `writeRuntimeObject`; Experiment Store create/append/rerun and Receipt-gated supersede/trash/restore/baseline transitions retain their existing transaction and logical-identity behavior. A Receipt issued for replacement/baseline target A cannot authorize target B: the supplied envelope either fails Receipt context matching or fails expected-context matching and the reserved Receipt is invalidated on context drift. Persisted Experiment reads fail closed for missing execution timestamps, reverse intervals, duplicate Attempt IDs, duplicate baseline history IDs, or unresolved baseline references.

## Validation Performed

- `node --check core/src/runtime/index.js`
- `node --check core/src/experiment/index.js`
- `node --check core/src/index.js`
- `node --check core/src/runtime/internal.js`
- `node --check core/src/receipts/index.js`
- `node --check core/src/workspace-store/transaction.js`
- `git diff --check -- core/src/runtime/index.js core/src/experiment/index.js`
- Production-only inline smoke checks passed for target-bound Receipt contexts, target-required/unexpected rules, timestamp validation, and early generic Experiment write rejection (`production smoke checks passed`).

## Known Test Status

The focused C23 boundary tests were not read or run because this worker is prohibited from reading test source and fixtures. They are expected to turn GREEN after this implementation. Existing older target-less test helpers for supersede and baseline Receipt issuance will require test-role adaptation to provide the required target; this is an expected contract update, not a production workaround.

## Problems

- Full C23, Receipt, Runtime, and workspace-transaction suites were intentionally not executed under the worker boundary.
- No Workflow Runtime advancement or lifecycle record update was permitted.

## Residual Risks / Follow-up

- Independent audit and the test-role focused negative/fault-injection coverage remain required, especially consumed-Receipt replay, state drift, target substitution, and transaction recovery paths.
- Terra also identified a broader P1 concern about durable Experiment facts living in Runtime rather than immutable Records. That redesign is outside this remediation contract and was deliberately left unchanged to preserve the current C23 scope and existing Core conventions.
