# C21-M3 Independent Test Evidence

## Verdict

- Status: `RED_READY` (audit-driven Revision 1)
- Worker: `/root/m3_test`
- Role: independent test worker
- Initial evidence recorded at: `2026-07-12T02:59:49+08:00`
- Revision 1 recorded at: `2026-07-12T03:54:53+08:00`
- Production implementation read or edited: no
- Production behavior implemented: no

Initial authoring produced a stable missing-module RED and the first implementation later reached
`29/29` GREEN. Revision 1 preserves all 29 cases and adds real-filesystem contracts for six
independently reported gaps. The current boundary is `47` tests: `31` pass and `16` fail, with no
skip. The 31 passes are the original 29 plus two new control cases.

## Revision 1 Audit-Driven Contracts

1. **Equal-Clock Pack ancestry**: two real Pack generations are sealed with one fixed Clock around
   a persisted M2 Continuation/`next_action` change. Both digest-order directions are constructed.
   The descendant must win even when its digest sorts below the ancestor; a corrupt descendant
   must fall back to the ancestor.
2. **Concurrent blob convergence**: 32 distinct writer streams append the same 512 KiB output with
   a seeded sensitive value. Every append must fulfill, every persisted descriptor must match, and
   exactly one verified redacted blob path may exist.
3. **Sensitive routing metadata**: sensitive-like values in `object_ref.id`, `session_id`,
   `writer.id`, and `turn_id` reject before path selection. The raw value must be absent from the
   return, error, and complete temporary workspace tree.
4. **Retention plan integrity**: modified `delete_paths`, modified `retained_pack_refs`, and disk
   drift after planning must all be detected by apply-time plan binding/revalidation before the
   first planned removal. The tests do not require a particular cryptographic representation.
5. **True incremental Capsule update**: a valid Capsule/cursor is written, later delta is appended,
   and pre-cursor segments are made malformed so full replay demonstrably fails. Incremental update
   must still consume only the cursor delta and equal a clean-workspace full rebuild byte-for-byte.
   Tampered-hash and internally rehashed impossible cursors must reject without changing Capsule or
   authority bytes.
6. **Append cursor handoff**: successful append returns the stable vector cursor committed with the
   event. Replaying from it returns only later events, including a stream created after the cursor.

## Owned Files

- `core/test/recovery-journal.test.js`
- `core/test/context-capsule.test.js`
- `core/test/recovery-pack.test.js`
- `core/test/recovery-faults.test.js`
- `core/test/fixtures/c21-m3/helpers.js`
- `core/test/fixtures/c21-m3/faults.json`
- `.pipeline/reviews/C21/M3/test-evidence.md`

No production, package/config, Skill/adapter, report, or protected Workflow state file was changed
by this worker.

## Proposed Public API Handoff

The implementation worker can implement this contract from this section without reading tests.
All names below are required exports from both `core/src/recovery/index.js` and
`core/src/index.js`, except the factory-only configuration.

```js
RECOVERY_EVENT_TYPES
createRecoveryStore(config)
appendRecoveryEvent(root, event)
replayRecoveryJournal(root, query)
readRecoveryBlob(root, descriptor)
updateContextCapsule(root, input, options)
rebuildContextCapsule(root, input, options)
readContextCapsule(root, objectRef)
sealRecoveryPack(root, input, options)
validateRecoveryPack(root, packRef)
selectLatestValidRecoveryPack(root, query)
planRecoveryRestore(root, request)
planRecoveryRetention(root, request)
applyRecoveryRetention(root, plan, options)
```

`createRecoveryStore()` captures policy once:

```js
createRecoveryStore({
  clock,                         // required zero-argument Clock for deterministic tests
  max_events_per_segment,
  inline_output_bytes,
  default_restore_budget_bytes,
})
```

The returned store exposes the other twelve functions with the same signatures. Deterministic
time comes from the captured Clock, not from operation-level `now` or Clock arguments. Standalone
exports may use host time and product defaults.

### Journal

`appendRecoveryEvent(root, event)` accepts:

```js
{
  object_ref: { kind, id },
  session_id,
  writer: { kind: "main" | "subagent", id },
  turn_id,
  type,
  summary,
  rationale_summary?,
  payload,
}
```

The writer adds `schema_version: "1"`, `event_id` as a 64-hex content identity,
`occurred_at` from the store Clock, and a monotonic per-stream `sequence`. It returns at least
`{ event, path, cursor }`; this cursor is a stable value representing the append commit point.

Segments use this exact partition and eight-digit segment numbering:

```text
.pipeline/runtime/objects/<kind>/<id>/events/
  <session_id>/<writer.kind>/<writer.id>/<00000001>.jsonl
```

One stream rotates only after `max_events_per_segment`. Concurrent calls for the same stream must
serialize to unique ordered sequences; different subagent identities must use different files.

`replayRecoveryJournal(root, { object_ref, after_cursor? })` returns
`{ events, cursor, warnings }`. The cursor is a JSON-stable vector:

```js
{
  schema_version: "1",
  object_ref,
  streams: [{ session_id, writer, sequence, segment_id, event_id }],
}
```

Streams are deterministically ordered. Replaying from a cursor returns only later events across
all streams. A truncated final JSONL line is ignored with warning code `truncated_final_line`; a
malformed earlier line fails closed without repairing the file.

`RECOVERY_EVENT_TYPES` is an explicit array containing at least:

```text
turn.user, turn.agent, plan.updated, decision.recorded,
tool.started, tool.completed, files.changed, verification.completed,
worker.started, worker.stopped, hook.observed, receipt.observed,
record.flushed, compact.started, compact.completed,
restore.started, restore.completed
```

`rationale_summary` is allowed. Hidden fields/types such as `chain_of_thought`,
`hidden_reasoning`, and `scratchpad` reject recursively before writes, with sanitized errors.

Redaction occurs before hashing or persistence. Sensitive values become `[REDACTED]` in inline
events and blobs. A string payload field over `inline_output_bytes` is replaced in place by:

```js
{
  storage: "content_addressed_blob",
  digest: "sha256:<64-hex>",
  bytes,
  media_type: "text/plain",
  summary,
}
```

The descriptor has exactly those five keys. The blob lives at
`.pipeline/runtime/recovery/blobs/<64-hex>`, deduplicates identical redacted bytes, and is loaded
only by `readRecoveryBlob(root, descriptor)`, which returns
`{ digest, bytes, media_type, content }` after digest verification.

### Context Capsule

`updateContextCapsule()` and `rebuildContextCapsule()` accept:

```js
{
  object_ref,
  sources: {
    records: [readRecordShape],
    continuation: readRuntimeObjectResult.continuation,
    receipts: [readReceiptShape],
  },
}
```

Their final `options` is M1-compatible and includes `{ id, faultInjector? }`. They return
`{ path, capsule }`; the path is:

```text
.pipeline/memory/capsules/<kind>/<id>.yaml
```

The Capsule contains `schema_version: "1"`, `authority_role: "derived"`, `object_ref`, the vector
`cursor`, a 64-hex `semantic_hash`, `sources`, and `context`. `sources.records` and
`sources.receipts` are the exact safe refs supplied by the M3 fixture; `sources.continuation`
contains the object ref plus a semantic hash, not a second Continuation authority.

The reducer exposes explicit context when present: `current_goal`, `scope`, `non_goals`,
`next_action`, `recent_verification`, and worker checkpoints. It never accepts raw transcript input.
Incremental updates must serialize byte-identically to `rebuildContextCapsule()` over the complete
Journal. This is checked for a fixed scenario and three generated event sequences with different
segment and update boundaries.

Top-level `runtime`, `continuation`, `records`, or `receipts` authority copies are forbidden.
Unknown authority override fields fail before writes. Capsule creation must not modify any Runtime,
Continuation, Record, or Receipt byte.

### Recovery Pack

`sealRecoveryPack(root, input, { id, faultInjector? })` accepts:

```js
{
  object_ref,
  trigger: "pre_compact",
  capsule,
  continuation,
  record_refs: [{ type: "record", id, semantic_hash }],
  receipt_refs: [{ type: "receipt", id, state, scope_hash, plan_hash }],
  evidence_refs: [{ type: "file", path, digest: "sha256:<64-hex>" }],
  worktree_summary: {
    head,
    dirty_paths,
    diff_summary: { files_changed, insertions, deletions },
    diff_digest: "sha256:<64-hex>",
  },
  cursor,
}
```

All refs are resolved and verified before sealing. Absolute/local evidence paths, hash drift,
missing Records, mismatched Receipt bindings, secrets, extra raw `journal`, and transcript fields
fail before writes. Pack persistence uses the M1 recoverable transaction.

The result is `{ pack_ref, path, seal_path, pack }`, where `pack_ref` is
`{ object_ref, id }`, `id` is the canonical 64-hex Pack digest, and paths are content-derived:

```text
.pipeline/runtime/recovery/packs/<kind>/<id>/<pack-id>/pack.yaml
.pipeline/runtime/recovery/packs/<kind>/<id>/<pack-id>/seal.yaml
```

`pack.yaml` contains `schema_version: "1"`, `authority_role: "recovery_projection"`, the sealed
Clock timestamp, trigger, Capsule, Continuation, verified refs, worktree summary, cursor, and an
optional automatically linked `previous_pack_ref`. It contains no raw Journal/events or transcript.

`seal.yaml` contains:

```js
{
  schema_version: "1",
  pack_id,
  pack_digest: "sha256:<pack-id>",
  status: "sealed",
  sealed_at,
}
```

`validateRecoveryPack(root, packRef)` returns exactly
`{ valid: true, pack_ref: packRef, errors: [] }` for valid data. Invalid data returns
`{ valid: false, pack_ref, errors: [{ code, ... }] }`; it must not throw merely because a candidate
Pack is corrupt. A valid Pack copied under another contained ID fails path/content identity.

`selectLatestValidRecoveryPack(root, { object_ref })` selects the newest valid sealed candidate and
returns `{ pack_ref, pack, rejected_packs }`. Corrupt newer candidates appear in `rejected_packs`
with sanitized error codes and do not prevent fallback.

`planRecoveryRestore(root, { object_ref, budget_bytes })` returns at least:

```js
{
  selected_pack_ref,
  base_cursor,
  journal_delta,
  rejected_packs,
  next_action,
  context: { next_action, ... },
  budget: { limit_bytes, truncated, ... },
}
```

It uses the selected valid Pack plus the vector-cursor delta. The complete serialized plan must be
at or below `budget_bytes`; low-priority events are pruned while the authoritative next action is
retained. Blob bodies, raw segment bytes, and transcripts are excluded.

`planRecoveryRetention(root, request)` returns a deterministic plan including `delete_paths` and
`retained_pack_refs`. Identical disk state gives identical output. Even
`keep_valid_packs: 0` cannot select the sole valid Pack for deletion. No additional ranking or Pack
chain rewrite policy is fixed by these tests. `applyRecoveryRetention(root, plan, { id })` returns
at least `{ deleted_paths }`, matching the plan, and the last valid Pack must still validate.

## Coverage Matrix

| Contract family | Real evidence |
|---|---|
| Object/session/writer partition | Exact on-disk paths, rotation, JSONL line counts, two objects, two sessions, main and subagent streams |
| Vector cursor and delta | Multi-stream base cursor, append-result cursor, later/new-stream events, empty repeat replay, stable JSON round-trip |
| Concurrency | Sixteen concurrent same-writer appends produce sequences 1..16; two subagents use disjoint files |
| Event semantics | Explicit taxonomy, persisted rationale summary, unknown/hidden reasoning zero-write rejection |
| Redaction | Seeded sensitive value absent from returned events, Journal, blobs, and all temp-workspace bytes |
| Large output | Threshold offload, exact descriptor, content digest, on-demand load, deduplication, corruption rejection, 32-writer convergence |
| JSONL faults | Truncated final line preserves prior events; earlier corruption fails closed and leaves bytes unchanged |
| Capsule equivalence | Fixed/generated sequences plus unreadable pre-cursor history prove actual delta-only update equals clean full rebuild |
| Capsule cursor integrity | Tampered hash and internally rehashed impossible cursor reject without Capsule or authority mutation |
| Authority ownership | Capsule is derived; M2 Runtime/Continuation/Record/Receipt and legacy sentinel bytes remain exact |
| Pack integrity | Schema, seal, content-derived path, Capsule/Continuation/ref/worktree/cursor binding, secret and local-path rejection |
| Corrupt latest fallback | Latest corrupt Pack rejected; previous valid Pack selected; equal-Clock descendants use chain ancestry, not digest order |
| Restore bound | Actual serialized plan fits 8 KiB, prunes low-priority delta, preserves expected next action |
| M1 transaction | Injected `after_prepare` Pack fault leaves no target Pack and rolls back through M1 recovery |
| Retention | Stable plan, last-valid protection, delete/retained set binding, and apply-time disk revalidation before removal |
| Sensitive routing metadata | Four path/identity metadata fields reject before writes with no raw-value echo or residue |
| Root API | All thirteen functions plus event taxonomy required as explicit root exports |

These are behavior and real-filesystem contracts. No source phrase scan is used as proof.

## RED And Compatibility Results

M3 RED command:

```bash
node --test \
  core/test/recovery-journal.test.js \
  core/test/context-capsule.test.js \
  core/test/recovery-pack.test.js \
  core/test/recovery-faults.test.js
```

Initial result: expected exit `1`; `24` top-level tests, `0` pass, `4` fail, `20` skip. The four failures
are exactly three missing Recovery module/API boundaries and one missing core root-export boundary.

Pre-Revision-1 implementation baseline:

```text
29 pass / 0 fail / 0 skip
```

Revision 1 TAP result:

```text
47 tests / 31 pass / 16 fail / 0 skip
```

Exact failing clusters:

| Audit contract | Failing test nodes | Observable result |
|---|---:|---|
| Equal-Clock chain selection | 2 | lower-digest descendant loses to ancestor; aggregate fails; higher-digest control passes |
| Concurrent shared blob | 1 | 31 of 32 writers reject with `ERR_RECOVERY_BLOB_INTEGRITY` |
| Sensitive routing metadata | 5 | four field cases accept sensitive-like values; aggregate fails |
| Retention plan integrity | 3 | retained-set tamper and post-plan drift remove both targets; aggregate fails; delete-set control passes |
| True incremental Capsule/cursor integrity | 4 | pre-cursor corruption is reread; two impossible cursors are accepted; aggregate fails |
| Append-result cursor | 1 | append returns no cursor |

The six cluster counts total `16`. No prior test regressed.

M1 kernel/fence-only compatibility:

```text
65 pass / 0 fail / 0 skip
```

M1 five-file certification baseline, adding `yaml-parser-unification.test.js` and
`workflow-commit.test.js`:

```text
76 pass / 0 fail / 0 skip
```

M2 five-file certification baseline:

```text
61 pass / 0 fail / 0 skip
```

## Syntax, Scope, And Hygiene

- `node --check` passed for all four tests and `fixtures/c21-m3/helpers.js`.
- `git diff --check` passed for the existing worktree.
- Scoped trailing-whitespace scan returned no matches for all six new test/fixture files.
- Scoped credential-pattern scan returned no matches.
- Scoped `git status` contains only the four authorized test files and `fixtures/c21-m3/` before
  this evidence file was added.
- Current test and fixture code totals `2,110` lines before this evidence file.

## Deliberately Unfixed Policy

- No cross-process Journal lock is claimed; the contract requires same-process serialization and
  physical stream partitioning, consistent with the M1/M2 residual risks.
- The output summarizer algorithm is not fixed beyond the descriptor, byte bound, redaction, and
  digest contracts.
- Equal sealed timestamps are ordered by explicit Pack ancestry. No ranking among unrelated Pack
  heads or previous-Pack chain rewrite strategy is prescribed.
- Hook payloads, aggregate telemetry, live history migration, full transcript reinjection, and
  public commands remain outside M3.

## Handoff

Verdict: Revision 1 `RED_READY`. The implementation worker should own only
`core/src/recovery/**` and the
explicit recovery re-export block in `core/src/index.js`, must not edit these tests, and should use
this API handoff as its production contract.
