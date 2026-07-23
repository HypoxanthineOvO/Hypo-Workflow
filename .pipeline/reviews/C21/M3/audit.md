# C21-M3 Independent Audit

## Metadata

- Milestone: `C21-M3`
- Verdict: `NEEDS_CHANGES`
- Audit worker: `/root/m3_audit`
- Mode: strict read-only
- Findings: `3 Critical / 3 Warning / 0 Info`
- Threshold: `3`

## Conclusion

M3 must not complete yet. The existing focused `29/29` suite and full `842/842` regression prove the declared normal and fault paths, but independent temporary-workspace checks found three blocking correctness gaps and three architecture/API gaps.

## Findings

### Critical 1: Equal-timestamp Packs can restore an older generation

- Location: `core/src/recovery/pack.js:63`, `core/src/recovery/pack.js:118`, `core/src/recovery/pack.js:705`
- When `sealed_at` is equal, the selector uses content hash as a tie-break. A hash does not represent creation order.
- A temporary workspace reproduced sealing a second Pack after changing Continuation, then selecting the first Pack and restoring its older `next_action`.
- Acceptance: with a fixed Clock, two consecutive generations must select the second; corrupting the second must fall back to the first. Ordering must use a monotonic generation or verified Pack-chain head, never hash order.

### Critical 2: Cross-writer blob deduplication races with partial writes

- Location: `core/src/recovery/journal.js:449`, `core/src/recovery/journal.js:480`, `core/src/recovery/journal.js:506`
- Different writer streams can persist the same large output concurrently. One creates the blob while another reads it before the first write is complete and reports a false integrity error.
- A targeted check produced 15 failures among 16 concurrent writers.
- Acceptance: concurrent distinct writers appending the same large redacted content all succeed, exactly one blob exists, every Journal event is persisted, and every descriptor/digest matches.

### Critical 3: Journal metadata bypasses sensitive-data gating

- Location: `core/src/recovery/journal.js:77`, `core/src/recovery/journal.js:212`
- Redaction covers summary, rationale, and payload, but `object_ref`, `session_id`, `writer.id`, and `turn_id` only receive path-format validation.
- A recognized sensitive pattern can therefore enter directory names, event bytes, and returned event data unchanged.
- Acceptance: every metadata position rejects sensitive input before any write. Paths, events, blobs, returned values, and sanitized errors must not expose the input.

### Warning 1: Retention apply does not validate plan integrity

- Location: `core/src/recovery/pack.js:215`
- `retained_pack_refs` is only checked as an array and is not normalized or cross-checked against `delete_paths`.
- A contained plan can be altered to delete a Pack that the original plan retained, as long as another valid Pack remains.
- Acceptance: delete and retain sets are normalized, mutually exclusive, and bound to the deterministic plan. Altered or stale plans fail before the first deletion.

### Warning 2: Capsule update is not incremental

- Location: `core/src/recovery/capsule.js:38`, `core/src/recovery/index.js:42`
- `updateContextCapsule` and `rebuildContextCapsule` call the same full-replay implementation.
- Output is correct, but the required previous-Capsule plus cursor-delta path is absent.
- Acceptance: update starts from a validated existing Capsule cursor and replays only the delta; output remains byte-identical to full rebuild; cursor drift fails closed.

### Warning 3: Append omits the promised cursor

- Location: `core/src/recovery/journal.js:96`
- The public handoff requires at least `{event, path, cursor}`; current append returns only `{event, path}`.
- Acceptance: append returns a stable vector cursor, and replay from that cursor returns only later events.

## Validation

- Independent focused suite: `29/29` passed.
- Lifecycle log: `7/7` passed.
- Root exports: `14/14` present.
- Syntax, config validation, `git diff --check`, and scoped credential scan: passed.
- Main-thread evidence: full `842/842`, M1 `76/76`, M2 `61/61`.
- Passing audited boundaries: Journal partition, same-stream sequence, cursor drift, truncated tail, earlier corruption fail-closed, Capsule derived-only behavior, Pack transaction, and restore budget.

The auditor did not repeat the full suite.

## Scoring

Scale: `1=best`, `5=worst`.

| Dimension | Score |
|---|---:|
| `diff_score` | 4 |
| `code_quality` | 3 |
| `test_coverage` | 3 |
| `complexity` | 3 |
| `architecture_drift` | 3 |
| **overall** | **4** |

## Worker Separation

`/root/m3_test`, `/root/m3_implement`, and `/root/m3_audit` remained separate identities and scopes. The audit was strictly read-only.

## Dirty Worktree

All adversarial checks used temporary workspaces. The auditor did not reset, checkout, clean, install dependencies, perform remote operations, or modify repository files. Existing dirty worktree content remained in place.

## Residual Risks

Even after revision, cross-process locking, fsync/TOCTOU, and finite sensitive-pattern coverage remain explicit residual risks unless later milestones strengthen them.

## Completion Narrative

- **Change Summary**: The audit changed no files and found three blocking defects plus three warnings.
- **Technical Approach**: Contract mapping, source review, focused regression, and isolated temporary-workspace falsification.
- **Modified Files / Modules**: None; reviewed Journal, blob, Capsule, Pack, restore, retention, root exports, and lifecycle evidence.
- **Test Design**: Added independent equal-timestamp, cross-writer blob, metadata-sensitive, and altered-retention-plan checks.
- **Validation Results**: Existing suites are green, but the six scenarios above remain uncovered and reproducible.
- **Expected Result**: Return M3 to TDD and obtain a fresh independent audit after all six contracts close.
- **Problems Encountered**: Existing tests emphasize normal sequences and do not prove shared-resource concurrency, actual incremental behavior, or equal-time ordering.
- **Risks / Follow-Up**: Retain cross-process locking, fsync/TOCTOU, and finite detection-corpus risks after revision.
