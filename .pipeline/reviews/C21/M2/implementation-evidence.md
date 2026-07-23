# C21-M2 Implementation Evidence

## Verdict

`IMPLEMENTED`

The production implementation now provides object-local Runtime and Continuation files, a one-fact-per-file Markdown Record Store with rebuildable indexes, scoped single-use Receipts, and deterministic cross-clone Snapshot projections. No new aggregate authority file was introduced.

Revision 1 aligns the production schemas with the published worker-independent contract: Records use `{type,ref}` scope, structured source refs, and array supersedes; Receipt path collections accept bound path/content-hash objects; Runtime requires explicit schema/status/next action; and Snapshot discards convenience-only `local_context` before durable security checks.

Revision 2 completes the remaining public envelopes: Receipt actor is structured `{type,id}` with canonical deep binding; derived Record indexes expose every Record's active state; and Snapshot preserves the exact Goal/Cycle delivery object contract without rewriting its identity.

Revision 3 separates Receipt authority reads from derived public lifecycle views, makes drift diagnostics explicit, expands raw GitHub credential detection, and requires every Snapshot to project at least one authoritative `readRecord()` result.

Revision 4 removes the last nondeterministic authority fallbacks, hardens prototype-sensitive canonical mappings, introduces instance-scoped Receipt clocks, enforces portable/canonical Snapshot locators and paths, and applies Runtime/Continuation ownership checks recursively.

Revision 5 completes Receipt clock and hidden-reasoning ownership: store invalidation/revocation timestamps come only from the captured clock, and Receipt scopes reject hidden reasoning before hashing, lookup, invalidation, or write.

## Worker Boundary

- Worker identity: `/root/m2_implement`
- Role satisfied: `implement` only
- Read inputs: published M2 prompt/architecture, M1 production serialization/manifest/workspace-format/workspace-store APIs, and public requirements from the orchestrator envelope.
- Not read or run: M2 test sources, fixtures, snapshots/assertions, raw test output, or `.pipeline/reviews/C21/M2/test-evidence.md`.
- Not changed: tests, fixtures, package/config/Skill/adapter files, protected Workflow state/cycle/rules/log/progress files, or legacy authority files.

## Production Files

- `core/src/runtime/internal.js`: shared M2 schema, secret, canonical-value, object-ref, timestamp, transaction-option, and current-Manifest validation.
- `core/src/runtime/index.js`: Runtime Object and reference-only active-pointer APIs.
- `core/src/records/schema.js`: Record Patch, persisted Record, semantic ID, scope, source, confidence, supersedes, and secret-ref schemas.
- `core/src/records/frontmatter.js`: canonical Markdown frontmatter parser/renderer.
- `core/src/records/index.js`: deterministic Record commit/read and derived machine/human index rebuild.
- `core/src/receipts/index.js`: issue/read/validate/reserve/consume/invalidate/revoke state machine, injected-clock store factory, and per-Receipt in-process serialization.
- `core/src/snapshots/index.js`: durable projection builder, transactional writer, contained reader, and semantic-hash verification.
- `core/src/index.js`: 20 explicit M2 named exports; no broad barrel wildcard was added.

## Public API And Authority Mapping

### Runtime

- Exports: `normalizeRuntimeObjectRef`, `writeRuntimeObject`, `readRuntimeObject`, `writeActivePointer`, `readActivePointer`.
- Object kinds are exactly `delivery`, `activity`, and `bootstrap_job`.
- Canonical key is `<kind>:<id>` and canonical directory is `.pipeline/runtime/objects/<kind>/<id>`; supplied `key` or `directory` must match exactly.
- `writeRuntimeObject` validates the outer, Runtime, and Continuation refs as one object, then writes `runtime.yaml` and `continuation.yaml` in one M1 transaction.
- Runtime and Continuation each require `schema_version: "1"`; Runtime requires non-empty `status`, while Continuation requires non-empty `next_action`. Invalid or mismatched inputs fail before transaction creation.
- Runtime owns lifecycle. Continuation owns next-action fields. Opposing Runtime/Continuation fields and Receipt state/owner fields are rejected recursively from both surfaces; secret and hidden-reasoning scans remain recursive and zero-write.
- Active pointer schema is exactly `{schema_version: "1", active: {delivery?, activity?, bootstrap_job?}}`; persisted values contain only `{kind,id}`.

### Records

- Exports: `createRecordPatch`, `commitRecordPatch`, `readRecord`, `rebuildRecordIndexes`.
- Supported durable kinds are `requirement`, `preference`, `decision`, and `feedback`.
- Patch scope is exactly `{type,ref}`. Confirmed project/delivery/Goal/Cycle/Milestone/activity/bootstrap/Maintain types are accepted; unknown types and absolute/traversal refs are rejected.
- `source_refs` is a non-empty structured array of `{type,ref,locator}` and round-trips without flattening. Source refs reject absolute/traversal `ref` values.
- `supersedes` is always an array of Record IDs and defaults to `[]`. A replacement uses `[activeRecordId]`; indexes, active-leaf selection, graph validation, and semantic hashes all use this array form.
- Patch validation also requires confidence, a safe dedupe key, timezone-bearing timestamps, and non-empty Markdown. Caller `id` and `record_id` are rejected by both staging and commit paths.
- Optional `secret_refs` contain only `{provider,ref}`. Raw secret-like values and hidden-reasoning fields fail with sanitized errors before transaction creation.
- Record IDs are allocated only by `commitRecordPatch` from canonical semantic content. Retry timestamps do not change semantic identity, so identical semantics return the existing path without changing its bytes.
- A changed fact with the same dedupe key must explicitly supersede the one active leaf via `[oldId]`. Both old and replacement Markdown files remain authoritative and traceable.
- `.pipeline/memory/index.yaml` and `.pipeline/memory/INDEX.md` are rebuilt only from validated individual Records. The machine index is marked `authority_role: derived`, contains metadata rather than bodies, and selects the superseding active Record.
- Every machine-index `records[]` entry has a derived boolean `active`. The superseded Record is `false` and its active replacement is `true`.
- Human `INDEX.md` lists every Record ID, not only active leaves, and explicitly labels inactive rows as `inactive (superseded)` without including Record bodies.
- Rebuild requires exactly one active authority leaf per dedupe key. Multiple or zero leaves fail with `ERR_RECORD_SUPERSEDES_CONFLICT`; timestamps are never used to arbitrate authority.

### Receipts

- Exports: `createReceiptStore`, `issueReceipt`, `readReceipt`, `validateReceipt`, `reserveReceipt`, `consumeReceipt`, `invalidateReceipt`, `revokeReceipt`.
- Actor is exactly `{type,id}` with safe single-component fields. Issue, disk read, and context validation preserve that structure; actor binding uses canonical deep equality rather than object identity.
- Deterministic Receipt identity binds actor, intent, object ref, canonical scope hash, plan hash, issuance, and expiry.
- Disk state stores the exact immutable bindings and `scope_hash`, but never raw scope, raw mutable plan, or `confirmed: true`.
- Canonical scope supports `paths: [{path,content_hash}]`; validation recursively checks the real path leaf and each 64-hex content hash without treating the container object as a path string.
- Lifecycle is `issued -> reserved(reserved_by) -> consumed`; explicit `invalidated` and `revoked` terminal transitions are transaction-backed.
- Exact scope hashing closes actor/intent/object/action/path/content/scope/plan broadening. A well-formed drift invalidates the Receipt on disk, so a later correct retry still fails. Invalid schemas or raw secrets are rejected before any invalidation write.
- Replay, re-reserve, wrong-owner consume, expired use, and post-consume validation fail closed. Timestamps are checked against issuance/reservation/expiry ordering.
- Public lifecycle envelopes are explicit: validate returns `{ok:true,receipt_id,state:"issued"}`, reserve includes `{state:"reserved",reservation:{tool_use_id}}`, and consume includes `{state:"consumed",consumption:{tool_use_id}}`.
- Public `readReceipt()` adds `reservation: {tool_use_id}` for reserved/consumed states and `consumption: {tool_use_id}` for consumed state. Internal transitions use an authority-only reader, so these derived view fields never enter persisted Receipt schema.
- Context mismatch first persists `invalidated`, then throws `ERR_RECEIPT_CONTEXT_DRIFT` with an explicit sanitized `drift` diagnostic.
- Raw secret detection covers GitHub credential-like values with underscore/hyphen suffixes, including `ghp_<sentinel_with_underscores>`, without echoing the value.
- Canonical mapping normalization preserves every safe enumerable own data property, including `__proto__`, `constructor`, and `prototype`, through descriptor-based writes while preserving the input mapping prototype. Symbols, accessors, and non-enumerable/undefined properties fail consistently rather than collapse scope identity.
- `createReceiptStore({clock})` returns the full lifecycle surface and captures only its injected clock for validate/reserve/consume and terminal transitions. Standalone operations use an internal immutable host clock. Store operations reject own `options.now`, and standalone validate/reserve/consume do the same, with `ERR_RECEIPT_CLOCK_OVERRIDE` before reading or mutating Receipt state; transaction ID/fault/tool-use options remain available.
- Store `invalidateReceipt`/`revokeReceipt` accept reason-only transitions and inject their timestamp from the same captured clock. Caller `transition.now` and `options.now` are rejected before Receipt read/mutation; standalone terminal operations retain their explicit transition timestamp contract.
- Receipt issue and context scope normalization recursively reject `chain_of_thought`, `hidden_reasoning`, and `rationale_dump` variants with sanitized `ERR_HIDDEN_REASONING_FORBIDDEN` before canonical hashing. Invalid context never reaches the clock, Receipt lock, or drift invalidation.
- A dependency-free Promise queue serializes operations by resolved workspace root plus Receipt ID. Same-process concurrent reserve attempts have exactly one winner and preserve its owner. This intentionally does not claim a cross-process lease.

### Snapshots

- Exports: `buildSnapshotProjection`, `writeSnapshot`, `readSnapshot`.
- Projection top level is exactly `schema_version`, `authority_role: projection`, `snapshot_kind`, `project`, `object`, sorted `records`, and `semantic_hash`.
- Project projection contains only format, schema version, and project ID; local workspace ID and Manifest creation time are excluded.
- `local_context` is convenience-only and is removed as a whole before secret/hidden-reasoning checks. It may contain Runtime, Journal, Receipt, local paths, raw local credentials, or chain-of-thought without entering or blocking the durable projection.
- Durable object schema is exact: `{object_ref:{kind:"delivery",id}, object_type:"goal"|"cycle", state:"accepted"|"checkpoint", plan_hash, accepted_at|checkpoint_at, checkpoint_ref?}`.
- `object.state` must match top-level `snapshot_kind`; accepted and checkpoint timestamps are mutually exclusive. Non-delivery refs, `object_type: analysis`, mismatched state, raw secrets, hidden reasoning, and extra transient object fields are rejected.
- Snapshot output preserves the durable object deeply without adding/replacing it with `kind/id`; classification uses `object_type` and the path ID uses `object_ref.id`.
- Records must use validated `readRecord` shape and are sorted by Record ID. Reordering input Records or changing local Manifest fields leaves bytes/hash stable; changing durable Record membership/content changes the semantic hash.
- `records` must be a non-empty array. Empty Snapshot input fails before transaction creation; no alternate simplified Record schema is accepted.
- Portable semantic/repository `scope.ref`, source `ref`/`locator`, and `checkpoint_ref` values are preserved. Absolute POSIX, drive/backslash, home shorthand/environment, `file:`/extended file URI, and percent-encoded equivalents fail with `ERR_SNAPSHOT_LOCATOR_NONPORTABLE`.
- Each supplied Record path is recomputed from its persisted scope/kind/id and must match exactly. `readSnapshot` also recomputes the canonical content-addressed Goal/Cycle path and rejects an otherwise valid projection copied elsewhere inside the Snapshot zone.
- Transactional paths are deterministic and content-addressed under `snapshots/goals/<id>` or `snapshots/cycles/<id>`. No retention or pruning policy is imposed.
- `readSnapshot` rejects traversal/absolute/out-of-zone paths and verifies the stored semantic hash before returning the projection.

## M1 Transaction Integration

- Every actual M2 writer loads and validates the current `.pipeline/manifest.yaml`, passes it unchanged to `commitWorkspaceTransaction`, and writes only within M1 `runtime`, `memory`, or `snapshots` zones.
- Inputs, schemas, secret checks, ownership checks, and paths are validated before a transaction starts.
- No competing rename/write primitive was added.
- A production smoke injected a fault at M1 `after_prepare` while creating a new Runtime Object. Both targets remained absent and `recoverWorkspaceTransaction` deterministically returned `rolled_back`.
- Four self-created legacy sentinels (`state.yaml`, `cycle.yaml`, `log.yaml`, and a legacy Knowledge file) remained byte-identical after all Runtime, Record, Receipt, and Snapshot writes.

## Production-Only Validation

No repository test was read or run. Validation used production imports and self-created `/tmp` current-format workspaces only.

- `node --check` passed for all new M2 modules and `core/src/index.js`.
- Root dynamic import confirmed all 20 required APIs: Runtime 5, Records 4, Receipts 8, Snapshots 3.
- `git diff --check` passed for the owned production paths.
- Full disk smoke: `M2_PRODUCTION_SMOKE_OK`.
  - Runtime round-trip and reference-only active pointer passed.
  - M1 injected-fault rollback passed.
  - Record semantic dedupe, explicit supersedes, unchanged old Record, index rebuild, body exclusion, and active selection passed.
  - Concurrent Receipt reserve produced one winner; consume/replay and scope-drift behavior passed.
  - Snapshot order/local-Manifest stability, local-field exclusion, contained read, and durable semantic change passed.
  - Four legacy sentinels remained unchanged.
- Security/zero-write smoke: `M2_SECRET_ZERO_WRITE_OK`.
  - Raw Record/Receipt/Snapshot secrets produced sanitized errors and no target writes.
  - Invalid secret-bearing validation context left an issued Receipt unchanged.
  - Runtime rejected copied Receipt state before creating object files.
- Receipt lifecycle smoke: `M2_RECEIPT_LIFECYCLE_OK`.
  - `Promise.allSettled` reserve produced exactly one winner.
  - Wrong-owner consume did not change the stable reserved owner.
  - Exact owner consumed once; actor drift and expiry persisted `invalidated`.
- Revision 1 public-shape smoke: `M2_REVISION_1_PRODUCTION_SMOKE_OK`.
  - All five invalid Runtime cases were zero-write: bad Runtime schema, null status, bad Continuation schema, empty next action, and mismatched Continuation ref.
  - `{type,ref}` scope, two structured source refs, default `[]`, replacement `[oldId]`, Markdown round-trip, and active-index selection passed.
  - A structured Record retry with different timestamps deduplicated to the same ID/path and left the existing Markdown bytes unchanged: `M2_R1_RECORD_DEDUPE_BYTES_OK`.
  - Unknown/traversal scope, absolute/traversal source ref, scalar supersedes, and caller ID were rejected before write.
  - Receipt object-path scope validated, exact context succeeded, content-hash drift persisted `invalidated`, and traversal path failed closed.
  - Secret/chain-of-thought-bearing `local_context` was ignored before security scans; the same fields in durable object input were rejected.
- Revision 2 lifecycle/index/Snapshot smoke: `M2_REVISION_2_PRODUCTION_SMOKE_OK`.
  - Structured actor round-tripped through issue/read; an independently allocated equal actor validated, while actor-ID drift persisted `invalidated`.
  - Validate returned the exact `{ok,receipt_id,state}` envelope; reserve/consume exposed the bound tool-use ID; wrong owner, replay, and same-process concurrent reserve remained fail-closed.
  - Machine index marked the original Record `active: false` and replacement `active: true`; human index contained both IDs, active/inactive status, and no body text.
  - Goal accepted output deep-equaled its durable input and wrote under `snapshots/goals/G001/accepted-*`.
  - Cycle checkpoint including `checkpoint_ref` deep-equaled its durable input and wrote under `snapshots/cycles/C001/checkpoint-*`.
  - `object_type: analysis`, mismatched state, and non-delivery object ref were rejected.
- Revision 3 targeted public-view/security smoke: `M2_REVISION_3_PRODUCTION_SMOKE_OK`.
  - Reserved read view exposed `{reservation:{tool_use_id}}`; consumed view exposed both reservation and consumption.
  - Raw YAML retained only `reserved_by`/timestamps and contained neither derived view field after both transitions.
  - Actor mismatch persisted `invalidated`, retained `ERR_RECEIPT_CONTEXT_DRIFT`, and emitted a message containing `drift`.
  - A `ghp_` credential-looking value with multiple underscores failed before issue write and was absent from the sanitized error.
  - Empty Snapshot input failed in both projection build and transactional write, leaving Snapshot and transaction targets absent.
- Revision 4 authority/canonical smoke: `M2_R4_AUTHORITY_CANONICAL_SMOKE_OK`.
  - Two valid unsuperseded leaves with different timestamps failed `ERR_RECORD_SUPERSEDES_CONFLICT`; no index or transaction was written and no recency winner was selected.
  - `__proto__`, `constructor`, and `prototype` remained own data properties with the original prototype; distinct dangerous-looking scope mappings produced distinct Receipt IDs and no prototype pollution.
- Revision 4 Receipt clock smoke: `M2_R4_RECEIPT_CLOCK_SMOKE_OK`.
  - Standalone and store per-call `now` overrides failed before clock/read/mutation. The injected clock drove validate/reserve/consume exactly once each through a complete lifecycle.
  - Independent frozen stores captured separate function/object clocks without global mutable clock state.
- Revision 4 Snapshot portability/path smoke: `M2_R4_SNAPSHOT_PORTABILITY_PATH_SMOKE_OK` and `M2_R4_LOCATOR_EDGE_SMOKE_OK`.
  - Portable repository and semantic locators, including literal percent text, round-tripped unchanged.
  - Absolute, drive/backslash, home, file URI, encoded file URI, and extended local forms were rejected.
  - A mismatched Record path and a valid Snapshot copied to another contained path were both rejected by canonical derivation.
- Revision 4 recursive ownership smoke: `M2_R4_RUNTIME_RECURSIVE_OWNERSHIP_SMOKE_OK`.
  - Nested next-action data in Runtime, lifecycle state in Continuation, and Receipt ownership fields were rejected before write.
  - Nested hidden reasoning and raw secret values remained sanitized zero-write failures; neutral nested Runtime/Continuation data round-tripped.
- Revision 4 final edge smoke: `M2_R4_FINAL_EDGE_SMOKE_OK`.
  - Store-level issue `options.now` was rejected without creating Receipt storage.
  - Traversal locator input was rejected while a portable semantic locator containing a literal percent round-tripped unchanged.
- Revision 5 terminal clock smoke: `M2_R5_STORE_TERMINAL_CLOCK_SMOKE_OK`.
  - Store invalidation and revocation persisted the two injected clock values and invoked the clock exactly once per successful transition.
  - Caller timestamp in either transition or options failed before read/mutation and left each Receipt `issued`; standalone explicit terminal time remained supported.
- Revision 5 hidden scope smoke: `M2_R5_RECEIPT_HIDDEN_SCOPE_SMOKE_OK`.
  - Nested issue-scope hidden reasoning failed before Receipt/hash/transaction storage and did not echo the raw sample.
  - Nested context hidden reasoning failed before injected-clock use or invalidation, did not echo the raw sample, and left the valid Receipt `issued`.

## Problems Encountered

- The first production smoke exposed a composability defect before the first Runtime transaction: a normalized object ref's derived `directory` field was rejected when reused internally. The normalizer now accepts its own derived shape only when both supplied `key` and `directory` exactly match kind/id. The complete smoke then passed.
- Revision 1 corrected four public-contract mismatches reported through sanitized focused results: the initial Record shape used scalar/string forms, Receipt path validation stopped at the collection container, Runtime tolerated omitted required fields, and Snapshot scanned local-only context too early. All were corrected strictly in production modules and verified through a fresh public-shape `/tmp` workspace.
- Revision 2 corrected the final three sanitized contract clusters: Receipt actor/envelopes, per-Record derived active visibility, and exact delivery-object Snapshot identity. No authority layout or M1 transaction behavior changed.
- Revision 3 corrected the remaining public read-view and validation boundaries without changing Receipt disk authority or introducing another Record/Snapshot schema.
- Revision 4 clock smoke initially exposed synchronous override errors from factory wrappers while standalone methods returned rejected Promises. The wrappers are now async, preserving one lifecycle API contract; the complete clock smoke then passed.
- Revision 4 supersedes prior historical smoke use of per-call `options.now`. Current deterministic callers must use `createReceiptStore({clock})`; standalone lifecycle calls intentionally reject that override.
- Revision 5 closes the terminal-operation exception to store clock ownership and applies the same durable hidden-reasoning boundary to Receipt scopes; no disk schema or external module changed.
- No dependency, architecture expansion, out-of-scope production edit, or protected-file write was required.

## M2 Boundary And Residual Risks

- Deliberately absent: Hook capture, Journal/Capsule/Recovery Pack, public Goal/Cycle commands, migration/history extraction, live-repository activation, deletion, retention/pruning, and expanded Record taxonomy.
- Receipt serialization guarantees same-process ownership only. Cross-process locking remains deferred; M1 pending-transaction detection still fails closed around concurrent process writes.
- M1's documented TOCTOU and lack of fsync-backed durability remain unchanged.
- Snapshot object projection now uses the exact published Goal/Cycle delivery contract. A future project-level bootstrap Snapshot requires an explicit schema extension rather than inference through this object shape.
- Record reads currently validate the complete Store to detect duplicate IDs, misplaced files, and invalid Record schemas; index rebuild additionally validates the supersedes graph. This is intentionally strict and may need an indexed performance path after correctness is established.
