# C23 M1 Remediation TEST Worker Evidence

- Worker ID: `c23-m1-remediation-test-luna`
- Role: `test`
- Model: `gpt-5.6-luna`
- Effort: `xhigh`
- Timestamp: `2026-07-18T14:30:00+08:00` (Asia/Shanghai)
- Verdict: `RED`
- M1 status: remediation test surface prepared; Workflow Runtime was not advanced.

## Conclusion

The bounded remediation surface is RED against the current implementation and covers every requested Terra boundary.
The existing shared Receipt lifecycle already rejects replay of a consumed Receipt without changing Experiment authority.
The remaining six cases expose current gaps: generic Runtime writes accept Experiment objects, target-aware Receipt
context is not published, unknown baseline references are accepted, execution timestamps are optional, and duplicate
persisted attempt IDs are accepted on read.

## Technical approach

Added one focused test file so the original six M1 contract cases remain visible and independently runnable. Every case
uses a temporary current workspace, a deterministic zero-argument clock returning `2026-07-18T12:00:00+08:00`, and
legacy lifecycle sentinels where mutation is exercised.

The supersede and baseline cases call:

```js
buildExperimentReceiptContext(experiment, { actor, intent, target })
```

with two distinct normalized target definitions. They issue a Receipt for target A, submit target B to the transition,
and require rejection without changing the Experiment authority. The duplicate-attempt case first creates valid domain
state, then uses the public workspace transaction helper to inject duplicate persisted IDs into a temporary workspace;
it does not edit production source or repository fixtures.

## Changed tests and catalog

- `core/test/c23-m1-experiment-boundary.test.js`
  - generic `writeRuntimeObject` Experiment write rejection;
  - supersede target substitution rejection;
  - baseline target substitution rejection;
  - consumed Receipt replay rejection with unchanged authority;
  - unknown `baseline_id` rejection;
  - missing execution timestamp rejection;
  - duplicate persisted attempt ID rejection on read.
- `tests/regression-catalog.json`
  - added only the new maintained path entry with reason and `C23-M1` coverage.
- `.pipeline/runtime/objects/delivery/c23-experiment-management/evidence/m1-remediation-test.md`
  - this worker evidence.

No production source, fixtures, hooks, protected lifecycle files, plan files, runtime state files, or existing evidence
files were modified.

## RED results

`node core/test/c23-m1-experiment-boundary.test.js`:

- `7` tests total, `1` pass, `6` fail, exit `1`.
- Replay of a consumed Receipt passes: the current shared Receipt state rejects the second transition and authority/tree
  remain unchanged.
- Generic Experiment Runtime write fails the expected rejection assertion because the current generic writer accepts it.
- Supersede and baseline target cases fail at context construction because current `buildExperimentReceiptContext`
  rejects the new `target` field.
- Unknown baseline, missing timestamp, and duplicate persisted attempt cases fail because current implementation accepts
  each invalid state.

`node --test core/test/c23-m1-experiment-boundary.test.js` reports the expected aggregate result: one file failure.

The unchanged original suite remains green:

`node core/test/c23-m1-experiment.test.js`: `6` tests, `6` pass, `0` fail.

## Validation

- `node --check core/test/c23-m1-experiment-boundary.test.js`: PASS.
- `node tests/run_core_tests.mjs --set maintained --dry-run --json`: PASS; `maintained_count: 52`, and the new boundary
  path is selected.
- `git diff --check -- tests/regression-catalog.json`: PASS.
- No trailing whitespace in the new test or catalog entry: PASS.

## Expected result after implementation remediation

The focused remediation file should become `7` tests, `7` pass, `0` fail once the Experiment Store is the only
Experiment writer, target payloads are included in Receipt scope/plan bindings and transition verification, baseline
references and execution timestamps are required, and persisted attempt IDs are unique on read. Target substitution
must fail before authority mutation; consumed Receipt replay must remain a terminal rejection.

## Remaining risks and follow-up

This surface verifies M1 boundaries only. It does not prove the later C23 reproducibility, scan, supervision, sync, or
scientific-review milestones. The duplicate persisted-ID test exercises the read path through a transaction-backed
temporary workspace, but does not validate Record-based historical storage because that is an implementation decision
outside this test worker's allowed scope. After production remediation, rerun this file plus the existing Experiment,
Record, Receipt, Runtime, and workspace-transaction suites, then request independent Terra re-audit. M1 remains RED and
the Workflow Runtime remains unchanged.
