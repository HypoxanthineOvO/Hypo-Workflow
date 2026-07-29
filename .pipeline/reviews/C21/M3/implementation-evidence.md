# C21-M3 Implementation Evidence

## Verdict

`IMPLEMENTED`

C21-M3 production scope now provides a segmented Recovery Journal, content-addressed text blobs, rebuildable Context Capsules, sealed Recovery Packs, bounded restore planning, corrupt-latest fallback, and deterministic retention. The implementation does not add Hook adapters, public commands, transcript authority, telemetry aggregation, migration, or any legacy-authority writer.

## Worker Boundary

- Implement worker: `/root/m3_implement`.
- Owned production scope: `core/src/recovery/**` and the explicit Recovery export block in `core/src/index.js`.
- Owned evidence scope: this file.
- No M3 test, fixture, assertion, test evidence, or audit file was read, modified, or executed.
- Protected Workflow state, Cycle, Rules, lifecycle log, and progress files were not read or modified by this worker.

## Production Files

- `core/src/recovery/shared.js`: Recovery policy/Clock capture, object/writer/cursor normalization, path containment, secret-safe validation, payload redaction, and digest helpers.
- `core/src/recovery/journal.js`: event taxonomy, per-stream append serialization, segmented JSONL replay, vector cursors, truncated-tail handling, redaction, and content-addressed blobs.
- `core/src/recovery/capsule.js`: complete-Journal reducer, safe M2 source resolution, deterministic Capsule persistence, and Capsule read/integrity validation.
- `core/src/recovery/pack.js`: Pack seal/validation/selection, M2/evidence reference verification, restore-budget pruning, fallback, and retention planning/application.
- `core/src/recovery/index.js`: captured-policy store plus standalone host-default APIs.
- `core/src/index.js`: 14 explicit Recovery exports; no wildcard export was introduced.

## Public API

The Recovery root exports are exactly:

1. `RECOVERY_EVENT_TYPES`
2. `createRecoveryStore`
3. `appendRecoveryEvent`
4. `replayRecoveryJournal`
5. `readRecoveryBlob`
6. `updateContextCapsule`
7. `rebuildContextCapsule`
8. `readContextCapsule`
9. `sealRecoveryPack`
10. `validateRecoveryPack`
11. `selectLatestValidRecoveryPack`
12. `planRecoveryRestore`
13. `planRecoveryRetention`
14. `applyRecoveryRetention`

`createRecoveryStore(...)` captures one zero-argument Clock and the segment/blob/restore policies. Store operations reject per-operation `now` or `clock`; standalone operations use host time and defaults.

## Journal And Blob Contract

- The event taxonomy contains the 17 confirmed turn, Plan, decision, tool, files, verification, worker, Hook, Receipt, Record, compact, and restore event types.
- Each event receives schema version `"1"`, a Clock-owned timezone timestamp, a contiguous per-stream sequence, an eight-digit segment id, and a canonical 64-hex event id.
- Streams are physically partitioned by object, session, writer kind, and writer id. A Promise queue serializes only the same process/same stream; different writers never share a segment file.
- Recursive hidden-reasoning, scratchpad, and raw-transcript fields fail before persistence. Sensitive payload keys and recognized credential values are redacted before hashing.
- String leaves above the configured UTF-8 byte threshold are replaced by the exact content-addressed descriptor and stored deduplicated under `.pipeline/runtime/recovery/blobs/<sha256>`. Blob reads require that exact five-key descriptor and verify its digest, expected byte count, and media type.
- Replay verifies path/stream identity, event hashes, sequences, and cursor anchors. It ignores only a malformed unterminated final line of a JSONL file and reports `truncated_final_line`; malformed interior lines fail closed without rewriting.
- After a tolerated truncated tail, the next append rotates to a new segment, preserving the damaged bytes for audit while keeping future replay valid.

Journal uses a same-process stream lock plus append-only segment boundary. It intentionally does not route each high-frequency event through M1's workspace-wide pending transaction, which would serialize independent writers. Capsule and Pack persistence use M1 transactions.

## Capsule Contract

- Initial update and full rebuild replay the complete Journal. Subsequent update validates the existing Capsule/hash/cursor, skips pre-cursor segment contents, replays only per-stream deltas plus new streams, and reduces from the previous bounded context. Its YAML bytes and semantic hash remain identical to a clean full rebuild.
- Supplied Records must be complete `readRecord()` shapes and match Record authority. Continuation must match `readRuntimeObject(...).continuation`. Receipts must be complete `readReceipt()` views and match Receipt authority.
- Persisted Capsule sources contain only safe Record/Receipt refs and a continuation object ref plus semantic hash. No Runtime, Record body, Receipt authority document, Journal segment, transcript, or hidden reasoning is copied into Capsule authority.
- Context exposes the authoritative continuation `next_action` plus explicit-event projections for current goal, scope, non-goals, the latest verification object, consolidated `workers`, and bounded recent event summaries. It does not expose the superseded `worker_checkpoints` field.
- Capsule persistence is one M1 recoverable transaction under `.pipeline/memory/capsules/<kind>/<id>.yaml`; M2 and legacy authority files are unchanged.

## Pack, Restore, And Retention Contract

- Seal accepts only `pre_compact`, verifies the current Capsule and Continuation, resolves every Record/Receipt ref through M2 readers, hashes contained evidence files, and rejects local/absolute paths, raw transcript/Journal data, secrets, missing refs, and drift before writing.
- `pack.yaml` and `seal.yaml` are committed together through one M1 transaction under the content-derived 64-hex Pack directory. The seal binds the Pack id, `sha256:<id>`, sealed status, and captured timestamp.
- The Pack persists the complete validated Runtime Continuation document, including schema, object reference, next action, and safe resume/update fields; it does not replace that document with a reduced semantic-hash projection.
- Validation is non-throwing for corrupt candidates and returns sanitized `{code}` error envelopes. It verifies path/content identity, complete Capsule/Continuation shape, seal identity, explicit refs, embedded Capsule refs, and evidence hashes.
- Selection orders valid sealed candidates by `sealed_at` and id, rejects corrupt newer candidates, and falls back to the newest remaining valid Pack.
- Selection accepts the exact query `{object_ref}` and returns corrupt-candidate diagnostics using the same sanitized error envelopes.
- Restore combines the selected Pack with only post-cursor Journal summaries. It excludes payload/blob bodies, raw segments, and transcripts; pruning removes oldest optional delta/context first while preserving the exact authoritative next action. A top-level `{limit_bytes,used_bytes,truncated}` budget reports the final total JSON serialization size.
- Retention deterministically keeps the newest requested valid Packs but clamps the valid keep count to at least one. Plans bind a normalized request, complete candidate inventory, recursive disk-content digests, delete/retain sets, and a canonical plan hash. Apply requires an operation `{id}`, rebuilds and compares the exact current plan before deletion, and preflights set completeness, disjointness, drift, and last-valid safety.

## Production-Only Validation

All filesystem validation used self-created temporary current-format workspaces and production imports only.

- Syntax checks passed for all five Recovery modules and `core/src/index.js`.
- Root dynamic import confirmed all 14 required exports.
- Journal smoke passed segmentation, three concurrent same-writer appends, distinct-writer partitioning, monotonic sequences, vector cursor delta, redaction, blob dedup/read verification, and absence of raw payload values in JSONL.
- Truncated-tail smoke passed warning emission, preservation of the damaged tail, rotation to the next segment, and post-cursor replay.
- Capsule smoke passed byte-identical incremental/full rebuild, equal semantic hashes, source refs, explicit current goal, and authoritative next action.
- Pack smoke passed two generations, seal validation, corrupt-newest fallback, Journal delta replay, a 4096-byte restore budget, `keep_valid_packs=0` last-valid preservation, and contained retention apply.
- M1 fault smoke injected failure after the first Pack file installation, propagated the original failure, recovered with `rolled_back`, and then sealed/validated successfully.
- M2 reference smoke used real Record and Receipt authority plus a real contained evidence file. Record/Receipt refs validated, and a later Receipt state transition produced sanitized `ERR_RECOVERY_REFERENCE_DRIFT`.
- Legacy authority preservation smoke kept `.pipeline/state.yaml`, `.pipeline/cycle.yaml`, and `.pipeline/log.yaml` byte-identical across Journal, Capsule, Pack, recovery, and retention operations.
- Scoped whitespace and credential-pattern scans returned no findings.

## Problems Resolved

1. With an intentionally tiny blob threshold, the fixed `[REDACTED]` marker was initially externalized. Re-reading a sensitive-key descriptor then redacted the descriptor itself, breaking idempotence. The marker is now always inline; real oversized values still use blobs.
2. A short oversized string was initially repeated verbatim in its blob summary. Summaries now report only media kind and byte count, so the Journal never defeats externalization by copying the full value into metadata.
3. A tolerated truncated tail became an "earlier segment" after the next append rotated. Replay now applies the truncation exception to the final unterminated line of each JSONL file, preserving the corrupt bytes while allowing subsequent segments to remain replayable. Interior corruption still fails closed.

## Expected Result And Residual Risks

Long-running work can now recover from explicit object-local events, a deterministic Capsule, and the newest valid sealed Pack without requiring a native transcript. Corrupt latest Packs fall back, recovery input stays bounded, and the only destructive M3 operation cannot delete the last valid restore point.

Residual boundaries are intentional: Journal append serialization is same-process, not a distributed or cross-process lock; direct segment/blob durability inherits host filesystem append/write guarantees; M1 retains its documented pending-transaction, TOCTOU, and fsync limitations; aggregate telemetry, Codex Hooks, live-history migration, and cross-platform adapters remain later milestones.

## GREEN Revision 1

### Input And Verdict

Main-agent focused validation reported `21/29` with eight production-side public-contract gaps. No test source, fixture, assertion, test evidence, or audit artifact was opened or executed by this worker. Revision verdict: `IMPLEMENTED`.

### Public Contract Corrections

1. Capsule now exposes one latest `recent_verification` object with status, evidence refs, and safe event metadata. Worker lifecycle events are consolidated by writer under `context.workers` as `{writer,role,status,evidence_refs}`; the public `worker_checkpoints` field was removed.
2. Journal string redaction now detects authorization, password, token, credential, secret, and API-key assignment forms inside arbitrary strings before blob hashing or persistence.
3. `readRecoveryBlob` now accepts only the exact five-key `content_addressed_blob` descriptor and verifies digest, byte count, and `text/plain` media before returning content.
4. Recovery Packs now store the complete validated Runtime Continuation document exactly, preserving safe resume/update data.
5. Pack validation and selection rejection diagnostics now use sanitized `{code}` objects rather than bare strings.
6. `selectLatestValidRecoveryPack` now requires the exact query `{object_ref}`; sealing and restore use the same internal query contract.
7. Restore plans now expose top-level `budget: {limit_bytes,used_bytes,truncated}` while preserving `context.next_action`; `used_bytes` equals the final serialized plan size.
8. Retention accepts and validates optional `keep_recent_segments` and `keep_referenced_blobs` without adding deletion behavior. Apply now requires the explicit operation option `{id}` while retaining exact-path and last-valid rechecks.

### Production-Only Validation

- One narrow temporary-workspace smoke covered all eight corrected contracts and returned `M3_REVISION_1_EIGHT_CONTRACT_SMOKE_OK`.
- Incremental and full Capsule rebuild remained byte-identical after the projection schema change.
- Embedded password/token/authorization/API-key assignments were absent from both the Journal and loaded blob; the descriptor round-tripped through the exact public reader shape.
- A Continuation carrying `resume_command` and nested update checkpoint data round-tripped byte-for-byte through Pack output.
- Corrupt candidate validation and selection returned `{code}` objects; legacy object-ref-only selection was rejected.
- Restore `budget.used_bytes` exactly matched `Buffer.byteLength(JSON.stringify(plan))` and remained within the requested limit.
- Reserved retention policy fields accepted valid values and rejected invalid types/ranges; apply rejected a missing operation id and succeeded with a safe id.

## GREEN Revision 2

### Input And Verdict

Main-agent focused validation reached `28/29`; the remaining gap was diagnostic classification only. A corrupt Pack YAML candidate correctly fell back but surfaced the generic `ERR_AUTHORITY_SCHEMA_INVALID`. Revision verdict: `IMPLEMENTED`.

### Correction

`readPackYaml(...)` now maps YAML parse failures and non-mapping decoded roots for both `pack.yaml` and `seal.yaml` to the stable sanitized envelope code `ERR_RECOVERY_PACK_CORRUPT`. The boundary never includes parser text, file bytes, or malformed content in the error result. Missing files, path violations, schema failures, digest drift, and reference drift retain their existing distinct classifications.

### Production-Only Validation

- A temporary workspace sealed two valid Pack generations, corrupted the newer `pack.yaml` with non-mapping YAML, and returned `M3_REVISION_2_CORRUPT_FALLBACK_SMOKE_OK`.
- Direct validation returned `{valid:false, errors:[{code:"ERR_RECOVERY_PACK_CORRUPT"}]}` without throwing.
- Latest-Pack selection rejected the corrupt generation with the same classifiable envelope and selected the prior valid Pack.
- No M3 test, fixture, test evidence, or audit file was read or executed.

## GREEN Revision 3

### Input And Verdict

The independent audit reported `47 total / 31 pass / 16 fail` while all prior 29 focused contracts remained green. The failures formed six published production contracts covering cursor returns, concurrent blobs, routing metadata, true incremental Capsule updates, equal-time Pack ancestry, and retention binding. Revision verdict: `IMPLEMENTED`.

### Production Corrections

1. `appendRecoveryEvent` now returns `{event,path,cursor}`. The cursor is a fresh deeply frozen full vector read after the committed event; replay from it includes only later events and all events from streams created later.
2. Content-addressed blob publication is serialized by resolved workspace root plus digest. Same-process writers never treat an in-progress identical write as a completed blob. This intentionally does not claim a cross-process lock.
3. Event routing metadata (`object_ref`, `session_id`, `writer`, and `turn_id`) receives a recursive raw-secret scan before Clock use, path derivation, hashing, blob publication, or Journal write.
4. Capsule update now reads and validates the existing Capsule, uses a cursor-aware Journal delta reader, and reduces from prior context. The delta reader verifies cursor anchors/tails, ignores contents of segments before each cursor anchor, reads all events for new streams, and rejects impossible cursors. Rebuild remains the complete replay oracle.
5. Equal-`sealed_at` Pack ordering follows verified `previous_pack_ref` ancestry. A descendant wins independently of lexical digest direction; when it is corrupt, selection falls back to its valid ancestor.
6. Retention plans now carry schema, normalized request, complete candidate inventory, recursive Pack-directory content digests, classifications, exact delete/retain sets, and `plan_hash`. Apply validates binding and collection invariants, regenerates the plan from current disk state before the first removal, and then rechecks last-valid safety.

### Production-Only Validation

- `M3_R3_JOURNAL_CURSOR_BLOB_METADATA_SMOKE_OK`: 32 distinct writer streams concurrently externalized identical redacted bytes, converged on one complete blob, and returned cursors containing their committed streams. A cursor captured before a new stream replayed that new stream as delta. Four secret-bearing routing metadata positions failed sanitized and zero-write before Clock use.
- `M3_R3_TRUE_INCREMENTAL_CURSOR_SMOKE_OK`: update skipped a corrupted segment before its cursor and matched the clean full-rebuild YAML byte-for-byte; full rebuild still rejected the corruption. A recomputed impossible cursor and a tampered Capsule semantic hash both failed without changing Capsule bytes.
- `M3_R3_EQUAL_CLOCK_ANCESTRY_SMOKE_OK`: one equal-time ancestry chain covered both lower-than-parent and higher-than-parent descendant digests. Each descendant was selected as head; corrupting the head selected its direct ancestor.
- `M3_R3_RETENTION_BINDING_SMOKE_OK`: normalized request/inventory/digests/hash were present. A retained-set swap with a recomputed hash, an incomplete delete set, and post-plan directory drift all failed before deleting either Pack; removing the drift allowed the original bound plan to delete only the planned old Pack.
- No repository M3 test, fixture, test evidence, or audit artifact was read or executed by this worker.

## GREEN Revision 4

### Input And Verdict

Main-agent focused validation reached `41/47`; the remaining failures were two production clusters: incremental update still opened the cursor segment, and routing identifiers containing a bounded password-seed pattern bypassed the generic secret scanner. Revision verdict: `IMPLEMENTED`.

### Production Corrections

1. Cursor-delta replay now treats the existing Capsule's semantic hash and normalized vector as the historical anchor binding. For each existing stream it validates the segment directory sequence, proves the named cursor segment exists, rejects a segment number that cannot contain the claimed sequence, and then opens only segments after the cursor segment. The cursor segment and every earlier segment are never read or parsed during update. New writer streams still receive full replay. Full rebuild remains unchanged and reads every segment.
2. Routing metadata adds one deliberately narrow identifier detector for sensitive-keyword plus `seed`/`value`/`key` plus a high-entropy alphanumeric component. It covers password, token, secret, credential, API-key, and related forms while leaving ordinary identifiers such as password-reset flows, tokenizer sessions, and credential schema names valid. Rejection uses only `ERR_RAW_SECRET_FORBIDDEN` and a generic message.

### Production-Only Validation

- `M3_R4_SKIP_CURSOR_SEGMENT_SMOKE_OK`: a Capsule cursor anchored in segment 2, with delta in segment 3, still updated after both segment 1 and segment 2 were replaced by corrupt content. The result was byte-identical to the clean full rebuild captured before corruption; a later full rebuild rejected the same corruption.
- The same smoke recomputed a valid Capsule hash around a nonexistent segment/sequence cursor and received `ERR_RECOVERY_CURSOR_DRIFT` without changing Capsule bytes. A bad semantic hash independently received `ERR_RECOVERY_CAPSULE_INTEGRITY`, also zero-write.
- `M3_R4_ROUTING_IDENTIFIER_SMOKE_OK`: the bounded `M3-password-seed-<entropy>-*` form was tested independently in object id, session id, writer id, and turn id. All four failed before Clock use and before `.pipeline/runtime` existed; no error echoed the entropy value.
- A control event using `M3-password-reset-flow`, `M3-tokenizer-session`, `M3-secretary-worker`, and `M3-credential-schema` appended successfully, demonstrating that keyword presence alone is not rejected.
- Revision 5 supersedes the temporary restriction that post-checkpoint events had to be written in later segments.
- No M3 test, fixture, test evidence, or audit artifact was read or executed by this worker.

## GREEN Revision 5

### Input And Verdict

Main-agent focused validation after Revision 4 reported `39/47`. Routing metadata and the unreadable sealed-cursor scenario were green; the remaining eight failures shared one regression: legitimate post-cursor events can still be appended to the cursor segment before rotation. Revision verdict: `IMPLEMENTED`.

### Selective Cursor-Segment Strategy

`readJournalStreamAfterCursor(...)` now first parses only the next segment, when one exists, without opening the cursor segment:

- If the next segment's first valid sequence is exactly `anchor.sequence + 1`, the cursor is the sealed tail of its segment. The cursor segment remains completely unread, preserving Revision 4 recovery from corrupted historical segments.
- If no next segment exists, or its first sequence is greater than `anchor.sequence + 1`, the cursor segment may contain required delta. Recovery reads it backward, validates the exact anchor id/sequence, returns only events after the anchor, and then requires a contiguous join with subsequent segments.
- If the next segment starts before the expected sequence, recovery rejects cursor drift. Internal gaps in either the cursor delta or later segments remain fail-closed.

Pack cursor equality remains strict. The correction advances the Capsule cursor correctly rather than weakening Pack validation.

### Production-Only Validation

- `M3_R5_SAME_SEGMENT_DELTA_OK`: an event appended after the Capsule checkpoint but inside the same segment was recovered; incremental output and cursor were byte-identical to full rebuild.
- `M3_R5_CURSOR_SEGMENT_GAP_AND_PACK_OK`: two post-cursor events remained in segment 1 before event 4 rotated to segment 2. Incremental recovery filled sequences 2-3 from the cursor segment, joined sequence 4 from the next segment, matched full rebuild, and then sealed/validated a Pack without cursor mismatch.
- `M3_R5_SEALED_CURSOR_SKIP_OK`: when segment 2 began at `anchor.sequence + 1`, a corrupted cursor segment 1 was never opened; incremental output matched the clean rebuild while a subsequent full rebuild rejected the corruption.
- The first smoke attempt used a generated transaction id beginning with `-`; the existing safe-id gate correctly rejected this fixture. Replacing only that temporary id with a valid fixed id produced all three PASS results; no production contract was changed in response.
- No M3 test, fixture, test evidence, or audit artifact was read or executed by this worker.
