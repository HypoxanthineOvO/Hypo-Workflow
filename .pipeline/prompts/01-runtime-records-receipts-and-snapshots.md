# C21-M2 Runtime Objects, Records, Receipts, And Snapshots

## Objective

Implement the authority objects required by Init, migration, delivery, acceptance, and recovery without replacing the legacy giant state file with another giant file.

## Requirements

- `runtime/active.yaml` stores references only.
- Each work object owns its runtime and continuation.
- Each durable semantic fact is one typed Markdown Record with source refs and optional supersedes edges.
- `INDEX.md` and `index.yaml` are derived and rebuildable.
- Receipts bind actor, intent, object, scope hash, plan hash, expiry, and consumption state.
- Receipt lifecycle supports `issued -> reserved(tool_use_id) -> consumed` and invalidation on drift.
- Accepted/checkpoint Snapshots contain cross-clone semantics but no raw Journal, secret, or transient runtime.

## Boundaries

In scope: `core/src/runtime/`, `core/src/records/`, `core/src/receipts/`, `core/src/snapshots/`, tests, fixtures, and explicit root exports.

Out of scope: Hook capture, Journal/Capsule/Pack, public Goal/Cycle commands, history extraction, and live workspace activation.

## Technical Solution

Use object runtime for lifecycle truth, a reference-only active pointer, one Markdown file per Record, scoped single-use Receipt files, and deterministic Snapshot projection. Record patches are staged inputs; only the deterministic writer allocates IDs and commits them.

## Technical Route

1. Write RED tests for reference-only active pointers, object runtime, Record round-trip/rebuild, Receipt drift/replay, and Snapshot exclusion.
2. Define object references and schemas for Delivery, Activity, and Bootstrap Job runtime/continuation.
3. Implement Record frontmatter/schema parsing, normalized body handling, source refs, confidence, dedupe keys, and supersedes.
4. Implement deterministic Record Patch validation and writer-owned ID allocation.
5. Implement derived human and machine index rebuild from individual Records.
6. Implement Receipt issue, validate, reserve, consume, expire, and invalidate-on-plan/scope/path drift.
7. Implement accepted/checkpoint Snapshot projection with explicit inclusion and exclusion lists.
8. Add an authority non-duplication test across pointer, runtime, Record, Receipt, indexes, and Snapshot.

## Research Required

Status: resolved.

Evidence: the confirmed C21 authority table defines ownership; current Knowledge code supplies stable-ID/redaction lessons but is not reused as authority; the Recovery design fixes Receipt intents and raw-secret prohibition.

## Risks And Alternatives

- Risk: Records become an untyped dumping ground.
- Risk: broad Receipts authorize later unrelated work; narrow Receipts become unusable.
- Rejected: one `records.yaml`; it creates contention and poor diff/review behavior.
- Rejected: `confirmed: true`; it cannot prove actor, scope, plan, expiry, or single use.
- Mitigation: typed frontmatter, one fact per file, schema validation, canonical scope hashes, and authority-duplication tests.

## Test Specification

- Active pointer rejects copied status/phase fields.
- Record frontmatter/body round-trip is stable and seeded secrets fail before write.
- Index tampering is repaired from Records and never overwrites Records.
- Superseded decisions remain traceable while the active index selects the replacement.
- Expired, drifted, replayed, or concurrently reserved Receipts fail.
- Snapshot excludes all local-only paths and contains enough accepted semantics for reconstruction.

## Validation Commands

```bash
node --test \
  core/test/runtime-store.test.js \
  core/test/record-store.test.js \
  core/test/receipt-store.test.js \
  core/test/snapshot-store.test.js \
  core/test/authority-nonduplication.test.js
```

Pass signal: round-trips and rebuilds are deterministic, every invalid Receipt fails closed, and Snapshot fixtures contain no forbidden data.

Pseudo-test rejection: phrase scans over schema files are insufficient; tests must issue/consume files and reconstruct indexes/Snapshots from disk.

## Evidence Paths

- `.pipeline/reviews/C21/M2/test-evidence.md`
- `.pipeline/reviews/C21/M2/implementation-evidence.md`
- `.pipeline/reviews/C21/M2/audit.md`
- `.pipeline/reports/01-runtime-records-receipts-and-snapshots.report.md`

## Audit Focus

- No raw secret or hidden chain-of-thought enters a Record or Snapshot.
- Indexes are derived and cannot act as reverse authority.
- Receipt scope and plan hash cannot be bypassed or reused.
- Snapshot does not leak transient runtime or local evidence blobs.

## Subworker Assignment Plan

Status: authorized, strict separation.

- `test`: owns M2 tests/fixtures and independently proves Record, Receipt, and Snapshot behavior on disk.
- `implement`: owns scoped runtime/records/receipts/snapshots modules and may not edit M2 tests.
- `audit`: independently reviews authority ownership, redaction, Receipt abuse cases, and worker separation.
- Main agent: orchestration and lifecycle only; it does not implement or validate the milestone itself.
- Required lifecycle evidence: requested, started, completed/failed/blocked, and closed/released for each role.

## Expected Artifacts

- runtime, Record, Receipt, and Snapshot modules
- focused disk fixtures and tests
- evidence and completion reports
