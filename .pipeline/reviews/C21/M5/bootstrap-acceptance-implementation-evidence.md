# C21-M5 Bootstrap Acceptance IMPLEMENT Evidence

- Worker: `/root/m5_acceptance_implement`
- Role: independent `IMPLEMENT`
- Decision: `IMPLEMENTED REVISION 2 / PRODUCTION SMOKES GREEN`
- Repository tests read or run by this worker: none
- Live authority edits: none

## Conclusion

HIGH-01 is implemented as an explicit `pending -> accepted` Bootstrap lifecycle. A pending rollback checkpoint now blocks ordinary current-format mutation at the lowest shared writer boundaries. Acceptance writes one immutable, checkpoint-bound, self-hashed companion through the existing recoverable workspace transaction engine. Accepted rollback is rejected before baseline-drift checks, and existing coherent post-activation descendants can be accepted only through the explicit reconciliation mode.

The implementation does not add a user command. `acceptBootstrapActivation` is published from the migration module and Core root as an internal programmatic transition.

Revision 2 closes the authenticity findings from the fresh re-audit. New rollback checkpoints seal the exact four-file legacy freeze inventory, acceptance evidence is now a verified Snapshot/File union, and both strict and reconciliation validation heads bind stable evidence and freeze hashes. Existing sealed checkpoints remain immutable and require an explicit compatibility binding; no live binding or live acceptance was created by this worker.

## Revision 2 Authenticity Protocol

### Future checkpoints

Before staging artifacts or activation writes are created, `stageBootstrapWorkspace` reads exactly:

```text
.pipeline/cycle.yaml
.pipeline/log.yaml
.pipeline/PROGRESS.md
.pipeline/state.yaml
```

Each regular non-symlink file is sealed as `{path, sha256, size_bytes, mtime_ns}`. The canonical path-sorted inventory is included in the stage semantic hash, activation plan, and rollback checkpoint semantic hash. Activation verifies it again before the transaction, and strict/reconciliation acceptance verifies bytes, size, inode-stable observation, and nanosecond mtime before writing the companion.

### Strict evidence union

Acceptance now permits only:

```text
{type: "snapshot", path, semantic_hash}
{type: "file", path, sha256}
```

Exactly one Snapshot ref is required. It must be a real repository-contained, regular non-symlink Snapshot whose schema/self-hash validates and whose path/hash exactly equals `stage.checkpoint`. File refs must be repository-relative regular non-symlink files with matching byte SHA-256. Unknown types, unsupported fields, absolute/traversal paths, missing files, wrong digests, wrong Snapshot semantics, and symlinks fail before any transaction write.

The normalized verified refs are hashed as:

```text
verified_evidence_hash = canonicalHash(normalized_verified_evidence_refs)
```

The canonical four-file inventory is hashed as:

```text
legacy_freeze_inventory_hash = canonicalHash(normalized_legacy_freeze_inventory)
```

Both hashes are mandatory in `validation_head`, cross-checked by the companion normalizer, and therefore covered by the companion semantic self-hash. Reconciliation computes and verifies both proofs independently in each of its two head observations.

### Existing sealed-checkpoint compatibility

An old checkpoint without `legacy_freeze_inventory` cannot be accepted without the optional API input:

```js
legacy_freeze_binding: {
  path: ".pipeline/reviews/C21/M5/legacy-freeze-acceptance-baseline.json",
  sha256: "<SHA-256 of exact file bytes>",
}
```

The referenced file must be repository-contained, regular, non-symlink, byte-hash matched, and decode to this exact self-hashed document:

```yaml
schema_version: "1"
authority_role: bootstrap_legacy_freeze_binding
binding_kind: sealed_checkpoint_compatibility
bootstrap_job_ref:
  kind: bootstrap_job
  id: <job-id>
checkpoint_ref:
  path: .pipeline/runtime/migrations/<job-id>/rollback-checkpoint.yaml
  semantic_hash: <sealed checkpoint semantic hash>
legacy_freeze_inventory:
  - path: .pipeline/cycle.yaml
    sha256: <byte hash>
    size_bytes: <integer>
    mtime_ns: "<decimal nanoseconds>"
  - path: .pipeline/log.yaml
    sha256: <byte hash>
    size_bytes: <integer>
    mtime_ns: "<decimal nanoseconds>"
  - path: .pipeline/PROGRESS.md
    sha256: <byte hash>
    size_bytes: <integer>
    mtime_ns: "<decimal nanoseconds>"
  - path: .pipeline/state.yaml
    sha256: <byte hash>
    size_bytes: <integer>
    mtime_ns: "<decimal nanoseconds>"
semantic_hash: <canonicalHash of every preceding field>
```

Generation inputs must come from the already audited three-file freeze baseline plus a separately audited `PROGRESS.md` fact. The binding must use the exact existing checkpoint path/hash, then compute its semantic hash, serialize once, compute the serialized file-byte SHA-256, and pass that byte hash in `legacy_freeze_binding`. Acceptance re-reads and verifies the binding and all four live legacy facts; it never constructs a baseline from current live files. The current live binding remains a main-thread/auditor task.

## Technical Approach

### Low-level pending boundary

`core/src/workspace-store/bootstrap-acceptance.js` inspects activated Bootstrap checkpoints and their canonical `acceptance.yaml` companions. It validates the current manifest digest, checkpoint semantic hash, companion self-hash, job/checkpoint/stage/manifest bindings, and returns one of `none`, `pending`, or `accepted`.

The gate is enforced at the three mutation kernels:

- `commitWorkspaceTransaction` before transaction-directory creation, covering Runtime, Record, Receipt, Snapshot, Capsule, Pack, indexes, and generic transaction callers.
- `appendRecoveryEventWithPolicy` before blob externalization, directory creation, or JSONL append.
- `applyRecoveryRetentionInternal` before the first `rm`.

Ordinary transaction callers cannot pass an option to bypass the gate. Direct writes to a canonical Bootstrap `acceptance.yaml` path are rejected. The specialized acceptance transaction is not exported from `workspace-store/index.js` or the Core root and compiles exactly one canonical companion write with an unchanged current manifest.

### Immutable acceptance companion

The companion path is:

```text
.pipeline/runtime/migrations/<bootstrap-job-id>/acceptance.yaml
```

The strict document binds:

- `authority_role: bootstrap_acceptance`
- `acceptance_state: accepted`
- Bootstrap job and rollback checkpoint ref
- stage hash and manifest byte digest
- `strict` or `reconciliation` mode
- accepted timestamp and caller evidence refs
- Runtime, Continuation, Capsule, current cursor, initial/head Pack, Pack chain, Journal counts, and inventory hashes as applicable
- semantic self-hash

The sealed rollback checkpoint is never rewritten. Repeating the same acceptance request returns the existing fact without changing companion bytes or mtime. A conflicting repeat or corrupt companion fails with `ERR_BOOTSTRAP_ACCEPTANCE_INVALID`.

### Strict validation

Strict acceptance validates the staged proposal, plan, checkpoint, manifest, complete initial write set, exact new-format file inventory, Runtime/Continuation, active pointer, Records and indexes, Capsule with empty cursor, initial sealed Pack, and checkpoint Snapshot. Any descendant or extra authority file is rejected before the acceptance transaction is created.

### Reconciliation validation

Reconciliation preserves the manifest, active pointer, initial Records and indexes, empty Receipt inventory, initial Snapshot inventory, initial Pack, and staging artifacts. It permits changes only to the delivery Runtime/Continuation, its Journal and referenced blobs, its Capsule, and valid Packs for the same delivery.

All discovered Packs must validate and form one linear chain rooted at the initial Pack. Orphans, forks, disconnected chains, corrupt Packs, changed Record refs, Receipt refs, or backwards cursors are rejected. The current Journal must have no warnings, and its cursor must equal both the current Capsule cursor and chain-head Pack cursor. The head Pack must embed the current Capsule and Continuation, and restore from that head must have zero Journal delta.

The validation head is computed twice before commit; drift between the two observations rejects acceptance.

### Rollback and restore

`rollbackBootstrapActivation` reads and validates the companion before checking the rollback baseline. A valid accepted companion returns `ERR_BOOTSTRAP_ROLLBACK_ACCEPTED`; a corrupt companion returns `ERR_BOOTSTRAP_ACCEPTANCE_INVALID`; only an absent companion proceeds to the original exact pending-baseline rollback.

`restoreBootstrapWorkspace` remains additive/backward compatible and now also returns `current_cursor` plus a compact `validation_head` containing selected/base/current cursors and Journal delta/warning counts.

## Modified Production Files

- `core/src/workspace-store/bootstrap-acceptance.js` - new low-level checkpoint/companion parser, pending gate, immutable fact compiler, and commit validation.
- `core/src/workspace-store/transaction.js` - central pending gate and non-public single-companion acceptance transaction path.
- `core/src/migration/bootstrap-workspace.js` - accept transition, strict/reconciliation validation, rollback precedence, idempotency, and restore validation head.
- `core/src/migration/index.js` - migration export.
- `core/src/recovery/journal.js` - pre-blob/pre-append pending gate.
- `core/src/recovery/pack.js` - pre-delete retention gate and internal full Pack inventory inspection for reconciliation.
- `core/src/index.js` - Core root export.

No test, fixture, live manifest, Runtime, Journal, Capsule, Pack, Record, Snapshot, rollback checkpoint, legacy `state.yaml/cycle.yaml/log.yaml/PROGRESS.md`, or other evidence file was modified.

## Production-only Validation

### Strict lifecycle smoke

An isolated `/tmp` legacy workspace was built entirely through production proposal, curation, audit, stage, and activation APIs.

Result: `STRICT_ACCEPTANCE_SMOKE_OK`

- pending Runtime write returned `ERR_BOOTSTRAP_ACCEPTANCE_PENDING`
- strict acceptance wrote the canonical companion
- `acceptance_ref.semantic_hash` matched the normalized acceptance fact
- repeat acceptance was idempotent and preserved companion mtime
- accepted rollback returned `ERR_BOOTSTRAP_ROLLBACK_ACCEPTED`
- ordinary Runtime writing reopened after acceptance

### Revision 2 future-checkpoint authenticity

Result: `REVISION2_FUTURE_CHECKPOINT_SMOKE_OK`

- stage and rollback checkpoint contained exactly four path-sorted legacy freeze facts
- valid Snapshot + file evidence produced both mandatory proof hashes
- wrong Snapshot semantic hash failed with `ERR_BOOTSTRAP_ACCEPTANCE_INVALID`
- mtime-only legacy drift failed before companion creation

### Revision 2 sealed-checkpoint compatibility

Result: `REVISION2_COMPATIBILITY_BINDING_SMOKE_OK`

- a reconstructed old sealed checkpoint without embedded inventory rejected acceptance when no binding was supplied
- an exact byte-hashed, self-hashed, checkpoint-bound compatibility file enabled acceptance
- the companion recorded `legacy_freeze_source.kind: compatibility_binding`

### Revision 2 reconciliation proofs

Result: `REVISION2_RECONCILIATION_SMOKE_OK`

- one Runtime/Journal/Capsule/Pack descendant reconciled successfully
- both validation observations verified the real Snapshot evidence and four-file freeze inventory
- the accepted head retained the two-Pack chain and both mandatory proof hashes

### Reconciliation happy path

An isolated workspace was advanced through one Runtime/Continuation change, one Journal event, a matching Capsule, and one sealed descendant Pack. The accepted companion was removed only in `/tmp` to reconstruct the historical pre-gate pending state.

Result: `RECONCILIATION_ACCEPTANCE_SMOKE_OK`

- chain was `initial -> descendant`
- validation head contained two Pack refs and one Journal event
- Capsule, Continuation, Journal cursor, selected head, and zero restore delta agreed
- reconciliation acceptance succeeded

### Unsafe extra authority

An isolated pending workspace received an unexpected Record authority file before reconciliation.

Result: `RECONCILIATION_UNEXPECTED_AUTHORITY_SMOKE_OK`

- acceptance returned `ERR_BOOTSTRAP_ACCEPTANCE_INVALID`
- no `acceptance.yaml` was created

### Pending direct writer and crash recovery

Results:

- `LOW_LEVEL_ACCEPTANCE_SMOKE_OK` - generic transaction and direct Journal append were blocked pending; accepted companion reopened ordinary transaction writing.
- `JOURNAL_PRE_BLOB_GATE_SMOKE_OK` - a 9000-byte Journal payload was rejected before any blob directory was created.
- `ACCEPTANCE_FAULT_RECOVERY_SMOKE_OK` - a fault after companion installation left an M1 transaction that `recoverWorkspaceTransaction` finalized; ordinary writes then reopened.

### Static and API checks

- `node --check`: all seven modified production files passed.
- API boundary: `REVISION2_API_BOUNDARY_OK`.
- `acceptBootstrapActivation`: present in migration and Core root exports.
- specialized acceptance transaction: absent from `workspace-store/index.js` and Core root.
- tracked `git diff --check`: passed.
- untracked production files checked with `git diff --no-index --check`: no whitespace findings.

## Expected Result

Fresh Bootstrap activation remains readable and immediately rollback-capable while pending, but cannot accumulate new-format writes. Explicit strict acceptance closes that rollback window and reopens writers. Historical coherent descendants can use reconciliation once; unsafe or incoherent descendants fail closed. Rollback after acceptance reports the lifecycle fact instead of a misleading baseline-drift error.

Acceptance now additionally proves that the four legacy authority files still match a checkpoint-bound baseline and that every persisted evidence ref is real and digest-bound.

## Problems Encountered

The first low-level smoke exposed that the manifest is outside the normal three workspace write roots. The companion inspector was corrected to read `.pipeline/manifest.yaml` through an explicit `.pipeline` allowed root while preserving the normal runtime-zone guard for migration artifacts.

Revision 2 required backward compatibility without modifying the already sealed live checkpoint. The compatibility protocol was therefore implemented as a separate immutable, self-hashed, checkpoint-bound file reference rather than adding or rewriting a field in the old checkpoint.

No repository test failure was investigated by this worker because the assigned identity explicitly prohibited reading or running `core/test/**`.

## Risks and Follow-up

- Independent TEST and a new final-audit identity must run the behavior-first acceptance suite, existing M1/M3/M5 baselines, Knowledge gate, and full Core regression.
- The live compatibility binding has intentionally not been generated. Main-thread creation must combine the audited state/cycle/log baseline with an independently verified `PROGRESS.md` fact and receive fresh audit before live reconciliation acceptance.
- The acceptance transition has deterministic single-process transaction safety inherited from M1; cross-process locking and filesystem `fsync` durability remain the same known M1 residual risks.
- Reconciliation validates files and all semantic authority currently in scope, but empty unexpected directories are not treated as authority files.
- The internal Pack inventory reader is intentionally not a root/public API. Future refactors should keep that boundary internal.
