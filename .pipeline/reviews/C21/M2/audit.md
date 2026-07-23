# C21-M2 Independent Audit Report

## Metadata

- Milestone: `C21-M2`
- Verdict: `NEEDS_CHANGES`
- Audit worker: `/root/m2_audit`
- Mode: strict read-only
- Findings: `4 Critical / 3 Warning / 0 Info`
- Threshold: `3`

## Conclusion

M2's mainline implementation is complete, and the focused `49/49` and full regression `801/801` suites pass. Adversarial validation nevertheless found four issues that violate the authority model or fail-closed guarantees. M2 therefore cannot pass the `review_code` gate yet.

## Critical Findings

### C1: The derived index arbitrates conflicting Record facts

- Location: `core/src/records/index.js:128`
- When two independently valid Records share a dedupe key and neither supersedes the other, index rebuild selects one active Record by time and ID instead of rejecting the conflict.
- This turns a derived view into a fact arbiter and violates the one-authority rule.
- Required remediation: each dedupe key must have exactly one active leaf. Zero or multiple active leaves must fail closed. Add a test for independently merged conflicting Records.

### C2: Receipt scope canonicalization can collapse distinct mappings

- Location: `core/src/runtime/internal.js:100`, `core/src/runtime/internal.js:113`
- Scope normalization assigns mapping keys into a normal object. Some prototype-sensitive keys are not preserved as ordinary own properties, so distinct source mappings can produce the same binding.
- A temporary-workspace check showed that two different scope inputs could validate as equal and leave the Receipt in `issued` state.
- Required remediation: reject prototype-sensitive keys or canonicalize into a representation that preserves every own property safely. Add a contract proving distinct mappings produce distinct scope hashes.

### C3: Snapshot can retain a clone-local Record locator

- Location: `core/src/records/schema.js:248`, `core/src/snapshots/index.js:213`
- `source_refs[].locator` currently checks only non-empty and newline constraints. Snapshot projection then preserves it without distinguishing portable locators from local filesystem paths.
- This violates the Git-eligible Snapshot requirement to exclude local-only paths.
- Required remediation: define a portable locator schema. Keep machine-local locations in runtime/Journal, or normalize them to portable references before Snapshot persistence.

### C4: Receipt expiry trusts per-call time supplied by the caller

- Location: `core/src/receipts/index.js:125`, `core/src/receipts/index.js:512`
- Public validate/reserve/consume APIs accept `now` on each authorization call, so expiry is not anchored to a trusted host clock.
- A temporary-workspace check confirmed that a Receipt outside the host's current time window could still validate when supplied a matching caller time.
- Required remediation: production operations read an internally owned Clock. Tests inject a fake Clock at store/factory construction rather than supplying time per authorization call.

## Warnings

1. `core/src/snapshots/index.js:209`: Snapshot accepts a contained Record path that does not match the Record content, and `readSnapshot` does not require the file path to equal the path derived from persisted content. Re-derive and compare Record and Snapshot paths.
2. `core/src/runtime/index.js:134`: Runtime/Continuation ownership checks cover only top-level fields. Nested lifecycle or next-action fields can cross owner boundaries. Use recursive ownership validation or an explicit extension namespace.
3. `core/src/runtime/internal.js:19`: sensitive-data and hidden-reasoning exclusion relies on a finite field-name/pattern list. Centralize the policy and add structured negative fixtures; do not claim absolute exclusion from the current corpus.

## Validation Results

- Independent focused suite: `49/49` passed.
- Main-thread full regression evidence: `801/801` passed.
- `git diff --check`: passed.
- Eight relevant production-file syntax checks: passed.
- No M2 writer introduced independent filesystem mutation primitives.
- Every actual M2 writer uses `readCurrentManifest` and `commitWorkspaceTransaction`.
- No M2 write to legacy `state.yaml`, `cycle.yaml`, `log.yaml`, or `knowledge/` was found.
- Same-process Receipt reservation still produced exactly one winner.

## Scoring

Scale: `1=best`, `5=worst`.

| Dimension | Score |
|---|---:|
| `diff_score` | 2 |
| `code_quality` | 3 |
| `test_coverage` | 3 |
| `complexity` | 2 |
| `architecture_drift` | 4 |
| **overall** | **4** |

The overall score exceeds the adaptive threshold because the four Critical findings affect authority and authorization semantics even though the planned feature surface is present.

## Worker Separation

`/root/m2_test`, `/root/m2_implement`, and `/root/m2_audit` remained separate identities with separate responsibilities. Test revisions were limited to the recorded M1 empty-directory recovery assumption and Snapshot `readRecord()` fixture. No test/implementation cross-edit was found.

## Dirty Worktree

The audit was read-only and used temporary workspaces outside the repository. The existing dirty worktree was preserved; no cleanup, reset, checkout, destructive action, dependency installation, or remote operation was performed.

## Residual Risks And Follow-Up

- Test worker must first encode the four Critical cases as RED contracts and should cover the three warnings where the expected behavior is sufficiently precise.
- Implement worker must receive only the published behavior contracts and must not inspect the test assertions.
- Main thread must confirm focused RED/GREEN and full regression.
- A fresh read-only audit identity must certify cumulative closure before M2 can complete.

## Completion Narrative

- **Change Summary**: Completed the independent M2 audit and found four Critical and three Warning issues; verdict is `NEEDS_CHANGES`.
- **Technical Approach**: Mapped architecture contracts to source, reviewed authority flows, reran focused tests, and used isolated temporary workspaces for adversarial checks.
- **Modified Files / Modules**: The audit worker modified no files. It reviewed Runtime, Records, Receipts, Snapshots, M1 transaction integration, M2 tests/evidence, and lifecycle records.
- **Test Design**: Examined authority direction, scope canonicalization, expiry, path identity, cross-clone exclusion, and concurrent reservation.
- **Validation Results**: Existing suites are green, but additional checks reproduced all four Critical gaps.
- **Expected Result**: Conflicting Records, distinct scope drift, expired Receipts, and non-portable Snapshot content must fail closed after revision.
- **Problems Encountered**: The first report transmission was blocked by the host content filter; the same audit identity returned this neutral local-correctness report without changing scope or evidence.
- **Risks / Follow-Up**: Return to TDD with the original test and implement workers, then use a fresh independent auditor for certification.
