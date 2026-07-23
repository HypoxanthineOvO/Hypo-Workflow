# C21-M2 Test Evidence

## Role And Verdict

- Worker role: `test`
- Worker identity: `/root/m2_test`
- Verdict: `RED_READY`
- Separation: this worker wrote only the five authorized M2 test files, one test-helper fixture, and this evidence file. It did not edit production modules, package manifests, Skills, adapters, config, M1 artifacts, completion/audit reports, or protected Workflow state/log/progress files.
- Test shape: real temporary current-format workspaces and real YAML/Markdown files; no source-phrase scan is accepted as storage or authorization proof.

## Revision 1: Certified M1 Recovery Scope

Status: `TEST_REVISION_READY`

The initial missing-module RED below is retained as historical evidence. During Revision 1 validation, the independent implementation worker's M2 production modules became visible in the shared worktree. This test worker did not inspect or edit those production changes except through public test execution.

### Trigger And Correction

The original four `after_prepare` recovery cases compared the complete directory tree to the pre-transaction tree. That required M1 recovery to remove newly created empty `.pipeline/runtime` and `.pipeline/runtime/transactions` base directories. The certified M1 contract guarantees restored authority/manifest bytes, removal of transaction evidence, no target residue, and idempotent second recovery; it does not guarantee removal of those two empty directory nodes.

Revision 1 adds `assertRecoveredWorkspaceMatches(root, before)` to the test helper and uses it only after `recoverWorkspaceTransaction(...).action === "rolled_back"` in:

- `runtime-store.test.js`
- `record-store.test.js`
- `receipt-store.test.js`
- `snapshot-store.test.js`

The helper ignores only the two exact directory entries `.pipeline/runtime` and `.pipeline/runtime/transactions`. It still:

- compares every file byte through the full-tree base64 snapshot;
- rejects every descendant below `runtime/transactions/`, including a transaction marker, staged data, or backup;
- rejects any target file or target directory residue;
- rejects any other newly created empty directory, including `runtime/objects/`;
- checks that either ignored entry, when present, is a real directory rather than a file or symlink;
- leaves all pre-transaction zero-write comparisons unchanged.

The same-assumption scan found exactly these four post-recovery full-tree comparisons. Eight other `snapshotTree(root) === before` assertions cover pre-transaction schema rejection, secret rejection, bare-confirmation rejection, caller-ID/dedupe conflict, or cross-object overwrite. They remain exact and were not routed through the recovery helper.

### Revision 1 Validation

Syntax:

```bash
node --check core/test/fixtures/c21-m2/helpers.js
node --check core/test/runtime-store.test.js
node --check core/test/record-store.test.js
node --check core/test/receipt-store.test.js
node --check core/test/snapshot-store.test.js
node --check core/test/authority-nonduplication.test.js
```

Result: all 6 exited `0`.

An isolated test-side smoke used the certified M1 `commitWorkspaceTransaction` to interrupt at `after_prepare`, recover with `rolled_back`, compare through the new helper, and confirm a second recovery returned `none`. The smoke then added an unexpected empty `.pipeline/runtime/objects` directory and proved the helper rejects it. Result: `recovery-helper-smoke: pass`.

M1 transaction regression:

```bash
node --test core/test/workspace-transaction.test.js
```

Result: exit `0`; `19` pass, `0` fail.

Current shared-worktree M2 execution after production modules appeared:

```bash
node --test \
  core/test/runtime-store.test.js \
  core/test/record-store.test.js \
  core/test/receipt-store.test.js \
  core/test/snapshot-store.test.js \
  core/test/authority-nonduplication.test.js
```

Result at this handoff boundary: 49 test/subtest nodes, `25` pass and `24` fail. The revised Runtime and Record recovery cases reach the M1 seam and pass. Receipt and Snapshot recovery cases currently stop on earlier, unrelated Receipt-scope and hidden-reasoning input validation, so this worker does not claim their production-path GREEN result and did not modify those contracts as part of this narrow revision.

No production file, protected Workflow state, package metadata, adapter, Skill, or completion/audit report was changed by Revision 1.

## Revision 2: Snapshot Uses Public Persisted Records

Status: `TEST_REVISION_READY`

### Trigger And Correction

The Public API Handoff already defined Snapshot Record input as the public `readRecord()` result `{ path, attributes, body }`. The original Snapshot fixture instead constructed an unpublished `{ id, attributes, body }` object, duplicated identity at the top level, and omitted the persisted Record `schema_version`, `semantic_hash`, and `authority_role`. That fixture could let Snapshot tests pass against data the Record Store never emits.

Revision 2 removes the handcrafted positive Record fixture. `snapshot-store.test.js` now:

1. creates a temporary manifest-activated workspace;
2. calls `createRecordPatch()` for each durable fact;
3. commits through `commitRecordPatch()`;
4. reads the authoritative file through `readRecord()`;
5. supplies that exact public result to `buildSnapshotProjection()` or `writeSnapshot()`.

The fixture helper asserts the returned top-level keys are exactly `attributes`, `body`, and `path`; top-level `id` is absent; identity lives at `attributes.id`; `attributes.schema_version` is `"1"`; and the persisted `attributes.semantic_hash` has the public 64-hex shape. It does not calculate, copy, or recreate the Record semantic-hash algorithm.

Snapshot projection assertions likewise locate identity at `record.attributes.id`, require persisted schema/hash preservation, and reject a second top-level `id` field.

### Preserved Behaviors

- Accepted Goal and checkpoint Cycle round-trip both use the same real persisted Records.
- Cross-clone stability creates Records independently in two workspaces with different local workspace identity, reverses Record order, and compares deterministic projection bytes.
- Durable semantic change creates and commits a genuinely different Record in a separate workspace; it does not mutate body text while retaining a forged/stale hash.
- Secret and hidden-reasoning negatives derive from a valid `readRecord()` result and then inject only the prohibited input under test.
- Transaction recovery snapshots the workspace after real Records exist, so recovery must preserve those Record bytes as well as remove Snapshot transaction evidence.
- Invalid Snapshot kind/object cases use valid persisted Records.
- The empty-Records case remains exactly `records: []` and must still reject before write; Revision 2 does not weaken or skip it.

The hidden-reasoning negative retained the same input and error expectation. Because `buildSnapshotProjection()` is synchronous, its assertion was mechanically corrected from `assert.rejects` to `assert.throws`; this changes no product contract.

### Revision 2 Validation

Public shape probe through real Record APIs:

```text
top-level keys: attributes, body, path
attribute identity: present
top-level identity: absent
schema_version: 1
semantic_hash: 64 lowercase hex
```

Static fixture scan found no remaining `snapshotRecord` constructor, `source.id`, `record.id`, or handcrafted top-level Record ID in `snapshot-store.test.js`.

Focused Snapshot command:

```bash
node --test core/test/snapshot-store.test.js
```

Result: exit `0`; `9` pass, `0` fail, `0` skip. This includes both Goal/Cycle subtests, cross-clone Record-order stability, independently committed durable change, secret/hidden exclusions, M1 transaction recovery, unsafe paths, invalid schemas, and the required empty-Records rejection.

Focused M1 compatibility baseline:

```bash
node --test \
  core/test/workspace-format.test.js \
  core/test/workspace-transaction.test.js \
  core/test/legacy-write-fence.test.js \
  core/test/yaml-parser-unification.test.js \
  core/test/workflow-commit.test.js
```

Result: exit `0`; `76` pass, `0` fail, `0` skip.

Scope and hygiene checks: `node --check core/test/snapshot-store.test.js` and `git diff --check` exited `0`; scoped trailing-whitespace and stale handcrafted-Record scans exited `1` with no matches; the explicit `records: []` contract remains present. Revision 2 status is limited to `snapshot-store.test.js` and this evidence path.

Revision 2 changed only `core/test/snapshot-store.test.js` and this evidence file. It did not edit production, protected Workflow state, the shared fixture helper, other M2 tests, package metadata, Skills, adapters, or reports owned by implementation/audit workers.

## Revision 3: Audit-Driven Authority And Portability RED

Status: `RED_READY`

Revision 3 adds real-filesystem contracts for four blocking invariants and three precise warnings without reading or editing M2 production code.

### Blocking Contracts

| Contract | Test construction | Current result |
|---|---|---|
| Independently merged same-dedupe Records | Commit different no-`supersedes` Records in two current workspaces, copy the remote canonical Record bytes into the local store, then rebuild indexes | RED: rebuild selects/writes instead of rejecting multiple active leaves |
| Distinct mapping Receipt scopes | Issue pairs whose null-prototype `bindings` contain isolated own properties, including prototype-sensitive names; verify `Object.prototype` descriptors remain unchanged | RED: one prototype-sensitive own-property case collapses to the same `scope_hash` |
| Snapshot source portability | Use public Record APIs to persist complete hash-valid Records with repo-semantic or local filesystem locators, then build Snapshot projections | RED: a local absolute locator is retained; portable repo/semantic sources remain intact |
| Clock authority | Require `createReceiptStore({ clock })`; all deterministic lifecycle tests use its zero-argument clock. Standalone APIs use host time and must reject own `now` options | RED: factory/module/root export missing; standalone validate/reserve accept overrides and consume interprets the override |

The factory contract returns the same seven lifecycle methods as the module: `issueReceipt`, `readReceipt`, `validateReceipt`, `reserveReceipt`, `consumeReceipt`, `invalidateReceipt`, and `revokeReceipt`. Store methods read time only from the injected zero-argument clock. Standalone `validateReceipt`, `reserveReceipt`, and `consumeReceipt` have no public per-call time override.

### Warning Contracts

- Attempted zero-active-leaf Record cycle: GREEN fail-closed. Append-only public Records cannot form a valid cycle; rewriting two valid files into a cycle without recomputing authority fails persisted semantic integrity before index selection.
- Record derived path: GREEN. A byte-valid Record copied to a different contained Record filename is rejected before index writes.
- Snapshot derived path: RED. `readSnapshot` accepts a byte-valid Snapshot copied to a contained path that is not derived from its object/content.
- Nested Runtime/Continuation ownership: RED. A nested continuation inside Runtime or nested lifecycle state inside Continuation is accepted instead of failing before write.
- Nested sensitive/hidden content: GREEN. Table-driven Record, Receipt, and Snapshot inputs reject or exclude nested samples; the assertion helper emits only a sanitized failure if production echoes a sample.

### Revision 3 Validation

Focused command:

```bash
node --test \
  core/test/runtime-store.test.js \
  core/test/record-store.test.js \
  core/test/receipt-store.test.js \
  core/test/snapshot-store.test.js \
  core/test/authority-nonduplication.test.js
```

Result: exit `1`; `54` test/subtest nodes, `34` pass, `11` fail, `9` skip. Failures are the two factory export checks, Receipt scope collision, three per-call clock subtests plus their aggregate parent, same-dedupe index rebuild, nested Runtime/Continuation ownership, non-portable Snapshot locator, and non-derived Snapshot read path. Receipt lifecycle tests that require the new factory are intentionally skipped until that API exists.

M1 baseline remains exit `0`: `76` pass, `0` fail, `0` skip.

All six M2 test/helper JavaScript syntax checks exit `0`. `git diff --check` exits `0`; scoped trailing-whitespace scan has no matches. Revision 3 changed only the five authorized M2 tests, the authorized helper, and this evidence file. It did not edit production, protected Workflow files, Skills, adapters, implementation evidence, or audit/completion artifacts.

## Test Size

| File | Top-level cases | Green-time subtests | Primary surface |
|---|---:|---:|---|
| `core/test/runtime-store.test.js` | 10 | 3 | object runtime, continuation, active pointer, nested ownership, path/ref guards, M1 transaction recovery |
| `core/test/record-store.test.js` | 13 | 0 | Record Patch, Markdown Records, merge ambiguity, path binding, secret rejection, dedupe, supersedes, index rebuild |
| `core/test/receipt-store.test.js` | 11 | 11 | lifecycle, injected/host clock, mapping scope identity, drift, expiry, concurrency, revocation |
| `core/test/snapshot-store.test.js` | 9 | 2 | accepted/checkpoint projection, source/path portability, cross-clone stability, exclusions, transaction recovery |
| `core/test/authority-nonduplication.test.js` | 2 | 0 | explicit root exports and cross-object disk authority scan |
| **Total** | **45** | **16** | **Current RED executes 54 test/subtest nodes; factory-gated subtests activate later** |

At the initial pre-implementation RED boundary, the loader gate registered 37 top-level cases, executed 5 module/API boundary checks, and skipped the 32 behavior cases whose production module was absent. This deliberately avoided repeating the same module-not-found stack for every disk contract. Once each module exists, its behavior cases and table-driven subtests enable automatically.

## Changed Test Artifacts

- `core/test/runtime-store.test.js`
- `core/test/record-store.test.js`
- `core/test/receipt-store.test.js`
- `core/test/snapshot-store.test.js`
- `core/test/authority-nonduplication.test.js`
- `core/test/fixtures/c21-m2/helpers.js`
- `.pipeline/reviews/C21/M2/test-evidence.md`

The helper creates isolated manifest-activated workspaces, optional byte-stable legacy sentinels, deterministic timestamps, full-tree snapshots, YAML readers, and secret-safe rejection assertions. It is test support only and owns no product authority.

## Coverage Matrix

| M2 requirement | Executable contract |
|---|---|
| Active pointer contains references only | disk parse of `.pipeline/runtime/active.yaml`; exact top-level/ref keys; lifecycle-key exclusion |
| Delivery, Activity, Bootstrap Job own runtime and continuation | three real object directories, two files per object, deterministic read/rewrite |
| Object references are path-safe and collision-safe | traversal, absolute path, nested component, unknown kind, alias, inconsistent key, slot collision, and cross-object overwrite rejection |
| Invalid pointer/runtime/continuation fails before write | byte/path full-tree comparison around schema and ref mismatches |
| Updating one object cannot mutate another | byte comparison of both files for the untouched object |
| Nested runtime ownership does not duplicate | table-driven nested Continuation-in-Runtime and lifecycle-in-Continuation zero-write rejection |
| Runtime uses M1 transaction APIs | injected `after_prepare`, visible M1 marker, absent object targets, `recoverWorkspaceTransaction(...)=rolled_back`, idempotent second recovery |
| One durable fact per Markdown Record | one patch produces one file under `memory/records/<scope>/<kind>/`; stable frontmatter/body round-trip |
| Typed Record semantics | scope, kind, source refs, confidence, dedupe key, created/updated timestamps, supersedes validation |
| Writer owns final Record IDs | staged patch has no ID; caller ID and overwrite attempts fail with unchanged bytes |
| Raw secrets never reach Records | generated secret-like values in metadata/body reject before write; exact value absent from error and disk |
| Secret references are permitted | an `env` reference round-trips while no raw value is provided |
| Hidden reasoning is prohibited | `chain_of_thought`, `hidden_reasoning`, and `rationale_dump` fields reject |
| Record indexes are derived | delete/tamper both indexes, rebuild from individual files, assert every Record byte unchanged |
| Supersedes remains traceable | old and replacement files remain readable; active derived index selects replacement |
| Dedupe is deterministic | identical patch returns the same ID/path and unchanged bytes; changed fact with no supersedes edge rejects |
| Merge ambiguity fails closed | independently committed same-dedupe Record files are merged on disk; index rebuild must reject multiple active leaves |
| Record content binds path | exact valid bytes copied to another contained Record path must fail before index writes |
| Receipt binds required context | persisted actor, intent, object ref, canonical scope hash, plan hash, issued/expiry timestamps, and state |
| Bare booleans cannot authorize | `confirmed: true` issue attempt rejects before write; no such field is persisted |
| Receipt lifecycle is single-use | `issued -> reserved(tool_use_id) -> consumed`; re-reserve, wrong owner, double consume, and post-consume validation fail |
| Concurrent reservation has one owner | same-process `Promise.allSettled` race yields exactly one fulfilled reserve and one stable on-disk owner |
| Drift fails closed and invalidates | actor, intent, object, path, content, broadened action, and plan drift each produce `invalidated`; correct retry then fails |
| Expired/malformed/revoked/invalidated fail closed | deterministic injected-store clock, direct malformed-file fixture, and explicit lifecycle operations |
| Receipt secrets are excluded | raw scope value rejects, sanitized error asserted, full workspace scan proves absence |
| Receipt scopes preserve own mappings | isolated normal/prototype-sensitive own properties yield distinct bindings without prototype mutation |
| Receipt time has one authority | injected store clock drives deterministic tests; standalone APIs reject per-call override options |
| Snapshot reconstructs accepted/checkpoint semantics | accepted Goal and checkpoint Cycle include project identity, object contract, durable Record metadata/body, schema, and semantic hash |
| Snapshot is cross-clone deterministic | workspace ID, manifest creation time, local runtime/evidence, and input Record order changes leave projection byte-equivalent |
| Durable semantic changes affect Snapshot | changed Record body changes serialized projection and semantic hash |
| Snapshot excludes local-only or unsafe content | runtime, Journal, Receipt, recovery, transcript/local paths, temp/lock, secrets, and hidden reasoning sentinels are absent from the file |
| Snapshot source/path portability | public Records with local locators reject/exclude; a valid Snapshot copied to a non-derived contained path rejects on read |
| Snapshot uses allowed M1 zone | path must remain under `.pipeline/snapshots/{goals,cycles}/`; injected prepare crash recovers through M1 |
| Authority is not re-aggregated | one real workspace emits every M2 object; unique sentinels prove pointer/runtime/continuation/Record/Receipt ownership and only explicit derived projection duplication |
| New APIs never write legacy authority | seeded `state.yaml`, `cycle.yaml`, `log.yaml`, and `knowledge/` bytes remain exact; emitted-path scan finds no additional legacy authority |
| M2 APIs are explicit public exports | all 21 exact functions, including `createReceiptStore`, are required from their modules and `core/src/index.js` |

## Public API Handoff

All write operations below take a final M1-compatible transaction options object with at least `{ id, faultInjector? }`. `faultInjector` receives the existing M1 phase event and must not be serialized.

### Runtime

- `normalizeRuntimeObjectRef({ kind, id })`
  - accepted kinds: `delivery`, `activity`, `bootstrap_job`
  - returns at least `{ kind, id, key, directory }`
  - `directory` is below `.pipeline/runtime/objects/`
  - rejects traversal, absolute/nested IDs, aliases, unknown kinds, and inconsistent caller keys
- `writeRuntimeObject(root, { object_ref, runtime, continuation }, options)`
  - validates all three refs as the same object before any write
  - commits `runtime.yaml` and `continuation.yaml` in one recoverable M1 transaction
  - returns `{ runtime_path, continuation_path }`
- `readRuntimeObject(root, objectRef)` returns `{ object_ref, runtime, continuation }`.
- Runtime and Continuation schemas reject nested copies of each other's owned lifecycle/next-action fields before any write.
- `writeActivePointer(root, pointer, options)` writes exactly `.pipeline/runtime/active.yaml` and returns `{ path }`.
- `readActivePointer(root)` returns the canonical pointer.
- Pointer schema is `{ schema_version: "1", active: { delivery?, activity?, bootstrap_job? } }`; each populated value is only `{ kind, id }`.

### Records

- `createRecordPatch(input)` validates and normalizes a staged input without allocating `id` or `record_id`.
- Required input: typed `scope`, supported `kind`, non-empty `source_refs`, `confidence`, safe `dedupe_key`, timezone-bearing `created_at`/`updated_at`, optional `supersedes`, and non-empty Markdown `body`.
- Optional `secret_refs` may contain references such as `{ provider: "env", ref: "OPENAI_API_KEY" }`; raw secret-like values fail with sanitized errors.
- `commitRecordPatch(root, stagedPatch, options)` is the only final-ID allocator and returns at least `{ id, path, deduplicated }`.
- Identical semantic patches deterministically resolve to the same Record. A changed fact with the same dedupe key requires an explicit `supersedes` edge.
- `readRecord(root, id)` returns `{ path, attributes, body }`.
- `rebuildRecordIndexes(root, options)` rebuilds `.pipeline/memory/index.yaml` and `INDEX.md` only from individual Records.
- Machine index contains `authority_role: derived`, `records`, and `active_by_dedupe_key`; index entries do not carry full Record bodies.
- Rebuild derives each expected Record path from validated content and rejects any supplied path mismatch.
- A same-dedupe graph must have exactly one active leaf. Multiple independently merged leaves fail closed; a zero-leaf cycle cannot bypass persisted semantic integrity.

### Receipts

- `createReceiptStore({ clock })` returns the complete Receipt lifecycle API and is the only deterministic-time seam. `clock` is called with zero arguments.
- `issueReceipt(root, input, options)` returns `{ id, path }`; the path is `.pipeline/runtime/receipts/<id>.yaml`.
- Required issue input: `actor`, `intent`, `object_ref`, canonicalizable `scope`, 64-hex `plan_hash`, `issued_at`, and `expires_at`.
- Receipt data contains `receipt_id`, required bindings, canonical `scope_hash`, `plan_hash`, timestamps, and lifecycle state. It does not use `confirmed: true` and does not persist a mutable raw plan.
- `readReceipt(root, id)` returns validated Receipt data.
- Store `validateReceipt(root, id, context)` succeeds only for exact actor/intent/object/scope/plan context and a currently usable state.
- Store `reserveReceipt(root, id, context, { tool_use_id, id, faultInjector? })` atomically claims an issued Receipt for one owner.
- Store `consumeReceipt(root, id, context, { tool_use_id, id, faultInjector? })` requires the reservation owner and consumes once.
- Store `invalidateReceipt(root, id, { reason }, options)` and `revokeReceipt(root, id, { reason }, options)` are explicit state transitions.
- Standalone Receipt APIs use host time and reject any caller-supplied `now`/clock override before mutation.
- Canonical scope hashing includes every own mapping property, including prototype-sensitive names, without reading or mutating global prototypes.
- Scope/plan/path/content drift invalidates future use. Concurrent reserve calls must produce one winner.

### Snapshots

- `buildSnapshotProjection(input)` returns deterministic data with `schema_version: "1"`, `authority_role: projection`, `snapshot_kind`, `project`, `object`, sorted durable `records`, and `semantic_hash`.
- `snapshot_kind` is `accepted` or `checkpoint`; C21 contracts Goal and Cycle projections.
- Cross-clone `project` identity is `{ format, schema_version, project_id }`; local `workspace_id` and manifest creation time are excluded.
- Input Records use the exact `readRecord()` shape `{ path, attributes, body }`; there is no top-level Record `id`. Persisted `attributes` carry `id`, `schema_version`, `semantic_hash`, `authority_role`, sources, and typed semantics.
- Snapshot Record projections preserve persisted schema/hash and keep identity only at `attributes.id`; they do not introduce a second top-level `id`.
- `local_context` may be supplied as convenience evidence but is never projected.
- Portable repo-relative and semantic source locators are preserved; absolute, file-URI, traversal, and machine-local locators are rejected or excluded.
- `writeSnapshot(root, input, options)` returns `{ path, ... }` and writes only below `.pipeline/snapshots/project|goals|cycles/` through M1 transaction handling.
- `readSnapshot(root, path)` validates containment and the content-derived object/path binding; traversal, absolute paths, and copied valid Snapshots at non-derived contained paths reject.

## Authority Ownership Assertions

| Fact | Sole active authority | Permitted derived surface |
|---|---|---|
| Active object selection | `runtime/active.yaml` reference | none |
| Lifecycle state | object `runtime.yaml` | accepted/checkpoint Snapshot must use accepted semantics, not transient runtime |
| Next resumable action | object `continuation.yaml` | later Capsule/Pack work, outside M2 |
| Durable requirement/preference/decision/feedback | individual Record Markdown | metadata-only indexes; explicit Snapshot semantic projection |
| Authorization and tool reservation | individual Receipt YAML | none in runtime, Record, index, or Snapshot |
| Cross-clone accepted/checkpoint semantics | Snapshot marked `authority_role: projection` | consumer reconstruction only; never active runtime authority |

The end-to-end test uses distinct sentinel values for lifecycle status, continuation action, Record body, Receipt intent, and reservation owner. It scans actual emitted paths and bytes. The Record fact may appear exactly twice: once in its authority file and once in the explicitly marked Snapshot projection. Every other active fact appears exactly once.

## Commands And Evidence

Syntax checks were run separately for the five test files and the helper:

```bash
node --check core/test/fixtures/c21-m2/helpers.js
node --check core/test/runtime-store.test.js
node --check core/test/record-store.test.js
node --check core/test/receipt-store.test.js
node --check core/test/snapshot-store.test.js
node --check core/test/authority-nonduplication.test.js
```

Result: all 6 exited `0`.

M2 RED command:

```bash
node --test \
  core/test/runtime-store.test.js \
  core/test/record-store.test.js \
  core/test/receipt-store.test.js \
  core/test/snapshot-store.test.js \
  core/test/authority-nonduplication.test.js
```

Result: exit `1`; 37 registered tests, `0` pass, `5` fail, `32` skip. The five sanitized failure classes are:

1. missing `core/src/runtime/index.js`;
2. missing `core/src/records/index.js`;
3. missing `core/src/receipts/index.js`;
4. missing `core/src/snapshots/index.js`;
5. the combined authority/root-export suite cannot load because the first required M2 module is missing.

There are no syntax, fixture, assertion-setup, dependency, or environment failures. Behavior skips are intentional until the corresponding production module exists.

Focused M1 compatibility baseline:

```bash
node --test \
  core/test/workspace-format.test.js \
  core/test/workspace-transaction.test.js \
  core/test/legacy-write-fence.test.js \
  core/test/yaml-parser-unification.test.js \
  core/test/workflow-commit.test.js
```

Result: exit `0`; `76` pass, `0` fail, `0` skip. M2 test authoring did not change production or regress the certified M1 format, transaction, recovery, fence, serialization, or compatibility behavior.

Whitespace and scope checks:

```bash
git diff --check
rg -n '[[:blank:]]+$' \
  core/test/runtime-store.test.js \
  core/test/record-store.test.js \
  core/test/receipt-store.test.js \
  core/test/snapshot-store.test.js \
  core/test/authority-nonduplication.test.js \
  core/test/fixtures/c21-m2/helpers.js \
  .pipeline/reviews/C21/M2/test-evidence.md
```

`git diff --check` exited `0`. The scoped `rg` command exits `1` with no matches as its clean signal. Scoped status contains only the five authorized tests, the authorized fixture helper, and this authorized evidence file.

## Secret-Safe Evidence

- Tests synthesize non-production secret-like sentinel values at runtime rather than embedding or reading real credentials.
- Record, Receipt, and Snapshot negative cases assert the exact seeded value is absent from thrown error text.
- Rejections compare the entire workspace tree before and after to prove failure before persistence.
- Receipt and Snapshot cases also scan all emitted file bytes for absence.
- This report records only `<seeded-secret-sentinel>` as a category; it contains no seeded raw value and no external credential.

## Deferred Risks

- Receipt concurrency covers same-process competing calls. A true cross-process lease remains coupled to the known M1 filesystem-lock residual and is not silently claimed here.
- Snapshot retention, historical version naming, and pruning are not fixed by M2 architecture; tests require deterministic accepted/checkpoint paths and semantics, not a retention policy.
- Record supported-kind expansion beyond the confirmed requirements/preferences/decisions/feedback family is an implementation policy detail as long as unknown kinds fail closed.
- Secret classification quality beyond explicit raw-secret patterns and forbidden hidden-reasoning fields will be extended by M3/M7 redaction and Hook work.
- Journal, Capsule, Recovery Pack, Hook capture, public Goal/Cycle commands, history extraction, migration, live repository activation, and deletion are intentionally absent.
- The tests reuse M1 path guards and transaction fault phases; they do not create a competing write primitive or claim to resolve M1's fsync/cross-process TOCTOU residuals.

## Verdict

`RED_READY`

The M2 disk contracts are executable, bounded to confirmed architecture, secret-safe, and independently RED only because the four production modules and their root exports do not yet exist. M1 remains `76/76` GREEN.
