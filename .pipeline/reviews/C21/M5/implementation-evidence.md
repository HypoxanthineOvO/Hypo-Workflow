# C21-M5 Implementation Evidence

> Worker: `/root/m5_implement`
> Role: strict independent `implement`
> Updated: `2026-07-12T07:54:09+08:00`

## Result

`IMPLEMENTED`

C21-M5 已实现 internal Bootstrap Job 的九个 Core API，并从 `core/src/migration/index.js` 与 Core root 显式导出：

1. `createBootstrapProposal(...)`
2. `mergeBootstrapProposals(...)`
3. `curateBootstrapProposals(...)`
4. `auditBootstrapProposal(...)`
5. `stageBootstrapWorkspace(...)`
6. `activateBootstrapWorkspace(...)`
7. `recoverBootstrapActivation(...)`
8. `rollbackBootstrapActivation(...)`
9. `restoreBootstrapWorkspace(...)`

没有新增 public `/hw:migrate`、`/hw:bootstrap` 或任何 Skill/command/platform adapter。没有实现 M6 Delivery lifecycle、M7 Hooks 或 M8 cleanup。

## Technical Approach

### 1. Proposal-only worker topology

`core/src/migration/bootstrap-proposals.js` 实现 Extractor -> merge -> Curator -> Auditor 四层只读拓扑：

- Extraction candidate 使用 exact canonical fields；禁止 caller `id` / `record_id`。
- 只有经过 review、future decision risk 为 `material`、来源类别允许、support 足够、且属于 current 或显式 history-needed 的候选进入 included 集合。
- `raw_chat`、`full_tool_log`、`duplicate_report`、`obsolete_intermediate_state` 与 `private_live_data` 只生成 `{key, source_class, reason}`，不保留 payload。
- 相同 extractor delivery 可幂等去重；同一 worker 或 candidate key 的冲突 delivery fail closed。
- merge、curation 和 proposal refs 全部排序，completion order 与重复 delivery 不改变 JSON 结构或 semantic hash。
- Curator 保留 superseded history，验证 candidate-key graph 的断边、跨 dedupe edge、cycle 与 active leaf；每个 dedupe key 必须恰有一个 current leaf。
- Auditor 验证 regular/non-symlink/contained source、SHA-256 drift、Record schema、raw secret、hidden context、support/inference 与 source coverage。
- Auditor finding 只包含稳定 code 和可选 candidate key，不回显 source bytes、secret 或 resolved external path。

所有 proposal 都是 `authority_role: proposal`，使用 64-hex `semantic_hash`，并深冻结返回值；Extractor、Curator 和 Auditor 均无 authoritative writer。

### 2. Owner-module pure compilers

为了让 manifest 不存在时的 stage 使用认证过的 schema，而不是先激活再逐项写，抽取了最小纯编译边界：

- `core/src/runtime/index.js`
  - `compileRuntimeObjectDocuments(...)`
  - `compileActivePointerDocument(...)`
  - 既有 Runtime writers 改为复用同一 normalization。
- `core/src/records/index.js`
  - `compileRecordStore(...)`
  - deterministic Record IDs、supersedes graph、machine index 与 human index 由同一逻辑编译。
  - `rebuildRecordIndexes(...)` 改为复用相同 index compiler。
- `core/src/recovery/capsule.js`
  - `compileInitialContextCapsule(...)`
  - 生成 empty-Journal、derived-only Capsule，并保持与 certified rebuild 字节一致。
- `core/src/recovery/pack.js`
  - `compileRecoveryPackProjection(...)`
  - 既有 `sealRecoveryPack(...)` 改为复用相同 Pack/seal compiler。
- `core/src/snapshots/index.js`
  - 导出 owner-owned `snapshotProjectionPath(...)`，避免 migration 复制 content-derived path 规则。

这些 helper 只在 production module 内可见；Core root 没有增加它们的公开 surface。

### 3. Deterministic staging writer

`stageBootstrapWorkspace(...)` 仅接受 legacy reference workspace，并在任何 staging write 前完成：

- exact input/options validation；
- approved audit 与 curation hash/job binding；
- pending transaction exclusion；
- source digest revalidation；
- Curation candidate-key -> deterministic Record-ID supersedes graph 编译；
- complete Runtime/Continuation、delivery-only active pointer、Records、indexes、Capsule、Pack/seal 与 Cycle checkpoint Snapshot 的纯编译与交叉校验。

Manifest 的 deterministic `created_at` 绑定 checkpoint timestamp，不读取 host clock。Stage semantic hash 绑定：

- stage ID 与 Bootstrap Job ref；
- manifest；
- curation/audit hashes；
- delivery ref；
- complete canonical write-set path/hash；
- compiled Record IDs 与 active Record IDs；
- Pack ref；
- Snapshot ref。

真实 staging artifacts 位于：

- `.pipeline/runtime/migrations/<job>/proposal.yaml`
- `.pipeline/runtime/migrations/<job>/plan.yaml`
- `.pipeline/runtime/migrations/<job>/rollback-checkpoint.yaml`

Rollback checkpoint 在 activation 前已经持久存在，因此不依赖成功 transaction 会删除的 M1 private marker。它绑定 exact new-file hashes、manifest bytes hash、stage hash 与 `acceptance_state: pending`。Checkpoint 不进入 authoritative write set，从而避免 self-referential hash。

Stage 结束后 workspace detector 仍必须为 `legacy`，legacy `state.yaml`、`cycle.yaml`、`log.yaml` 的 bytes/mtime 均不改变。

### 4. Manifest-last activation and recovery

`activateBootstrapWorkspace(...)` 在 M1 transaction 前重新验证：

- stage object semantic binding；
- proposal/plan/checkpoint staging bytes；
- source digests；
- complete canonical write-set；
- Runtime/Record/Capsule/Pack/Snapshot cross-authority relationships。

随后只调用一次 `commitWorkspaceTransaction(...)`，manifest last。Fault adapter 同时支持 M1 phase 名和 M5 简写 phase：

- `after_prepare` -> recovery rollback；
- first `after_install_file` -> recovery rollback；
- `before_manifest_activation` / `before_manifest` -> recovery roll-forward；
- `after_manifest_activation` / `after_manifest` -> recovery finalize。

`recoverBootstrapActivation(...)` 先从 disk 读取并验证 staging plan 与 persistent checkpoint，再封装 M1 disk-fact recovery。若 all-data-installed、manifest 尚未激活，它会在 roll-forward 前再次验证 source binding。错误 transaction ID 不能绕过其他 pending transaction。

### 5. Rollback and fresh-process restore

`rollbackBootstrapActivation(...)` 仅在 checkpoint 仍为 pending acceptance 时可用。执行删除前验证：

- caller checkpoint ref；
- staging plan -> stage hash -> rollback checkpoint binding；
- current manifest bytes；
- 每个 cutover file bytes；
- runtime/memory/snapshot zones 不存在 post-checkpoint extra authority file；
- 没有 pending transaction。

Rollback 只删除 checkpoint 列出的 cutover files 与 manifest，不删除或改写 legacy state/cycle/log/source。Staging proposal/plan/checkpoint 作为非权威恢复证据保留，detector 返回 `legacy`。

`restoreBootstrapWorkspace(...)` 只调用 M3 Pack selection/restore planner 与 M2 Runtime reader，不读取 legacy state、chat 或 transcript。它返回 Runtime、Continuation、selected Pack、rejected corrupt Packs 与 authoritative next action。

## Modified Production Files

- `core/src/migration/bootstrap-proposals.js` - new; proposal/merge/curation/audit and source revalidation
- `core/src/migration/bootstrap-workspace.js` - new; stage/activate/recover/rollback/restore
- `core/src/migration/index.js` - nine M5 migration exports plus legacy inspector
- `core/src/runtime/index.js` - pure Runtime/active-pointer compilers reused by existing writers
- `core/src/records/index.js` - pure Record Store/index compiler reused by index rebuild
- `core/src/recovery/capsule.js` - empty-Journal Capsule compiler
- `core/src/recovery/pack.js` - precompiled Pack/seal compiler reused by existing Pack writer
- `core/src/snapshots/index.js` - canonical Snapshot path export
- `core/src/index.js` - nine explicit M5 root exports

M5 migration production totals at this revision:

- `bootstrap-proposals.js`: 1,034 lines
- `bootstrap-workspace.js`: 1,273 lines
- `migration/index.js`: 14 lines
- migration total: 2,321 lines

No dependency, package/config, Skill, command, adapter, Hook, CLI, fixture, or legacy writer was changed.

## Production-only Validation

Validation used only production imports and self-created `/tmp` legacy repositories. The reusable smoke was created at `/tmp/hw-m5-production-smoke.mjs`; it is not a repository test or fixture.

### Proposal and audit

- Extraction order and merge completion order produced byte-identical JSON and identical semantic hashes.
- Duplicate same-worker delivery deduplicated.
- Forbidden raw payload was absent from serialized proposal output.
- Two-generation supersedes history survived curation; active leaf mapped to the current candidate.
- Approved audit passed on matching sources.
- Source drift produced sanitized `BOOTSTRAP_SOURCE_DRIFT` and no writes.

### Staging and determinism

- Two independent clone roots with different absolute paths and mtimes produced byte-identical stage objects, write sets, staging refs, and semantic hashes.
- Both remained `legacy` after staging.
- Rejected source-drift stage produced no new files.
- Legacy authority bytes and mtimes remained unchanged.

### Activation and certified readers

- One complete activation produced a manifest-selected mixed-current workspace with only the C21 Delivery active.
- `readRuntimeObject`, `readActivePointer`, `readContextCapsule`, `readRecord`, `validateRecoveryPack`, and `readSnapshot` all opened the compiled artifacts.
- `rebuildContextCapsule(...)` reproduced the staged Capsule byte-for-byte.
- `rebuildRecordIndexes(...)` reproduced the staged machine index byte-for-byte.
- All 22 legacy writer families remain centrally fenced through the existing M1 manifest gate; direct `legacy.lifecycle.commit` smoke returned `ERR_LEGACY_WORKSPACE_WRITE_BLOCKED`.
- A post-activation `commitRecordPatch(...)` succeeded through the new Record Store and explicit supersedes ID.
- Rollback correctly rejected that post-checkpoint extra Record as drift.

### Fault, recovery, drift, and rollback

- `after_prepare` -> `rolled_back` / Bootstrap `rolled_back`.
- first `after_install_file` -> `rolled_back` / Bootstrap `rolled_back`.
- `before_manifest` -> `rolled_forward` / Bootstrap `activated`.
- `after_manifest` -> `finalized` / Bootstrap `activated`.
- A second activation while each transaction was pending was rejected.
- Source drift after stage was rejected before manifest/business installation.
- Staging plan drift was rejected before manifest/business installation.
- Successful rollback restored `legacy` classification and preserved legacy bytes/mtime.

### Fresh-process restore

- A second valid descendant Pack was sealed, then its `pack.yaml` was corrupted.
- A child Node process called only `restoreBootstrapWorkspace(...)`.
- Restore selected the valid ancestor Pack, reported the corrupt head under `rejected_packs`, preserved Runtime/Continuation next action, and performed zero writes.

Final smoke signal:

```text
C21_M5_PRODUCTION_SMOKES_OK
```

### Static validation

- Production syntax: all scoped M5/M1-M4 touched modules passed `node --check`.
- Core root dynamic import: `9/9` M5 functions present.
- Scoped tracked `git diff --check`: passed.
- Untracked/scoped trailing-whitespace scan: no findings.
- Scoped TODO/FIXME/XXX/HACK, console, and `process.env` scan: no findings.
- Scoped high-confidence credential-value scan: no findings.

## Problems Encountered

1. The first happy-path implementation compiled and restored correctly, but the expanded rollback inventory initially attempted to traverse M1 reserved transaction storage without the explicit path-guard flag. Production smoke reproduced the failure; the walker now opts into read-only transaction-path validation while still rejecting symlinks/non-regular entries.
2. The first synthetic post-activation Record timestamp was earlier in absolute time than its creation timestamp because the smoke mixed `Z` and `+08:00`. This was a smoke input error, not a production defect; the fixture timestamp was corrected.
3. The initial rollback checkpoint validation proved file hashes but did not reread the staging plan. It was hardened so recover/rollback rebuild and validate the exact stage from proposal/plan/checkpoint bytes before acting.
4. The initial stage validator bound write hashes but did not independently recompile every Pack/Record/Capsule/Snapshot relationship from the staged bytes. It now rejects missing, extra, or cross-authority-inconsistent files before M1 preparation.
5. Fault phase naming differed between M1 (`before_manifest_activation`) and the M5 prompt shorthand (`before_manifest`). The adapter now exposes both without changing M1 transaction semantics.

## Residual Risks

1. Transaction and Journal/Pack locks remain same-process; cross-process locking is not added by M5.
2. Filesystem fsync/atomic durability and transaction TOCTOU inherit the certified M1 residual boundary.
3. Rollback deletion is strictly prevalidated but is not itself a delete-capable M1 transaction; process interruption during rollback can leave a damaged-current workspace requiring manual recovery. The later M8 Deletion Manifest executor remains the proper owner for general destructive transactions.
4. Semantic hashes provide deterministic integrity, not keyed authenticity.
5. Secret detectors use a finite high-confidence corpus; independent audit must still inspect the migration selection and privacy boundary.
6. Staging artifacts intentionally remain after rollback as non-authoritative evidence. M8, not M5, owns any cleanup decision.

## Revision 1 - Fixture-shaped Source Provenance Contract

### Main-thread input

Focused Attempt 1 reported `36 total / 7 pass / 29 fail`. All 29 failures were truncated by the same production entry error:

```text
Bootstrap candidates[0].sources[0] contains unsupported fields: ref, type
```

The original M5 implementation reduced Extractor sources to `{locator, sha256}`. That retained file integrity but discarded the logical provenance `{type, ref}` required to bind an audited source to a Record `source_ref`.

### Production correction

`core/src/migration/bootstrap-proposals.js` now accepts the strict fixture-shaped source envelope:

```yaml
type: legacy_file
ref: state
locator: .pipeline/state.yaml
digest: sha256:<64hex>
```

Canonical proposals always retain exactly `{type, ref, locator, digest}`. The controlled `{type, ref, locator, sha256}` input alternative and the previous `{locator, sha256}` compatibility form are normalized into that same canonical shape before proposal hashing. The previous form is accepted only when its locator resolves to exactly one Record `source_ref`, from which `type/ref` can be bound without guessing.

The revised boundary also enforces:

- `type` is exactly `legacy_file`;
- `ref` is a contained, non-absolute, non-traversing logical provenance reference;
- raw-secret and hidden-context labels in `type/ref` fail closed;
- `locator` remains a repository-relative regular-file path validated by the Auditor;
- `digest` is exactly `sha256:<64 lowercase hex>`;
- unknown source fields are rejected rather than ignored;
- candidate sources and Record `source_refs` must match as complete `{type, ref, locator}` sets;
- Auditor and stage compare file bytes against the canonical prefixed digest;
- Recovery Pack evidence derives its path/digest from the canonical source while curation retains `type/ref` authority.

### Revision 1 production-only validation

The `/tmp/hw-m5-production-smoke.mjs` suite now additionally proves:

- fixture-shaped `{type,ref,locator,digest}` is accepted and retained canonically;
- controlled `sha256` input normalizes to the same canonical digest;
- an unknown source field is rejected;
- absolute and traversal locators are rejected;
- hidden `ref`, secret-like `ref`, and non-`legacy_file` hidden `type` are rejected;
- a valid-shaped but mismatched digest produces Auditor status `rejected` with `BOOTSTRAP_SOURCE_DRIFT`;
- proposal merge and curation remain byte/hash deterministic across completion order and repeated delivery.

The complete original activation/fault/recovery/rollback/fresh-process suite remained green:

```text
C21_M5_PRODUCTION_SMOKES_OK
M5_EXPORTS_OK 9
```

Production syntax passed for all scoped modules. Scoped trailing-whitespace, TODO/FIXME/console/environment, and credential-value scans remained clean.

Revision 1 modified only:

- `core/src/migration/bootstrap-proposals.js`
- `core/src/migration/bootstrap-workspace.js`
- `.pipeline/reviews/C21/M5/implementation-evidence.md`

No repository test, fixture, test evidence, audit artifact, protected Workflow state, Skill, command, adapter, package/config file, or live workspace authority was read, run, or modified.

## Revision 2 - Topology Authority And Invalid Candidate Preservation

### Main-thread input

Focused Attempt 2 remained `36 total / 7 pass / 29 fail`. The source envelope was no longer the blocker; a read-only production probe reduced the remaining failures to five topology contracts:

1. `support: observed` is direct evidence, while `support: inferred` must survive Extractor and be judged by Auditor.
2. Forbidden raw/tool/duplicate/obsolete/private candidates may use `sources: []` with `record_patch: null` and must produce category-specific sanitized exclusions.
3. Merge has exactly one canonical public candidate collection named `included`.
4. Curated records carry a derived boolean `active` and validate it against the supersedes graph.
5. Invalid Record Patches must survive as sanitized markers until Auditor rather than leak or disappear during extraction.

### Production corrections

#### Extractor support boundary

- `observed` is retained as sufficient direct evidence.
- `inferred` is also retained by Extractor; Auditor deterministically emits `BOOTSTRAP_UNSUPPORTED_INFERENCE` for that candidate.
- Extractor no longer silently excludes inference that requires independent review.

#### Forbidden source classes

The five forbidden classes now accept the exact empty payload boundary `sources: []` plus `record_patch: null`:

- `raw_chat`
- `full_tool_log`
- `duplicate_report`
- `obsolete_intermediate_state`
- `private_live_data`

Each exclusion keeps only `{key, source_class, reason}`. Its reason is category-specific (`<source_class>_not_imported`); no source or patch payload survives.

#### Canonical merge collection

`bootstrap_merge` now exposes only sorted `included`. The previous `candidates` collection was removed rather than retained as an alias. Curator consumes `merged.included`, so there is no duplicate collection that could become a second proposal authority.

#### Curated active projection

Every curation record now adds exact boolean `active`:

- the one current leaf for each dedupe key is `active: true`;
- every explicitly superseded history record is `active: false`.

Normalization recomputes the graph and rejects:

- zero or multiple active leaves;
- a non-current leaf marked active;
- `active_by_dedupe_key` drift;
- any record whose `active` flag differs from the derived graph, even when the caller recomputes the outer semantic hash.

#### Sanitized invalid Record markers

Except for caller-supplied `id` / `record_id`, which still fail immediately, invalid patches now become deterministic proposal markers:

```yaml
authority_role: invalid_candidate
invalid_reason: secret | hidden_reasoning | schema_invalid
dedupe_key: <safe logical key>
```

The marker contains no body, source refs, unknown fields, error message, raw secret, or hidden-context value. A safe original dedupe key is retained when possible; otherwise a deterministic candidate-key hash supplies an isolated invalid dedupe key.

Curator preserves these markers and derives their `active` state. Auditor converts them to exactly the relevant sanitized finding family:

- `BOOTSTRAP_RECORD_SECRET`
- `BOOTSTRAP_RECORD_HIDDEN_CONTEXT`
- `BOOTSTRAP_RECORD_SCHEMA_INVALID`

Hidden/secret classification runs before exact Record schema validation so an extra hidden field is not mislabeled as a generic schema error. Audit continues to verify source existence and digest for invalid markers, remains read-only, and never serializes the rejected payload.

### Revision 2 production-only validation

The expanded `/tmp/hw-m5-production-smoke.mjs` now proves:

- observed and inferred candidates both survive Extractor and remain sorted;
- only inferred receives `BOOTSTRAP_UNSUPPORTED_INFERENCE`;
- all five forbidden classes accept empty sources/null patch and produce distinct payload-free exclusions;
- merge exposes `included`, has no `candidates` alias, remains sorted, and deduplicates repeated delivery;
- two-generation history derives old `active: false` and current `active: true`;
- a caller-rehashed wrong active flag is rejected during curation normalization;
- secret, hidden-context, and schema-invalid patches all survive extraction/merge/curation as markers;
- Auditor emits all three expected finding codes;
- extraction and audit JSON contain neither seeded secret nor hidden-context value;
- audit leaves the complete workspace file inventory unchanged;
- caller-owned Record ID still throws `ERR_RECORD_CALLER_ID_FORBIDDEN` instead of becoming a marker;
- the complete stage/activation/four-fault/recovery/rollback/fresh-process suite remains green.

Final signals:

```text
C21_M5_PRODUCTION_SMOKES_OK
M5_EXPORTS_OK 9
```

Revision 2 modified only `core/src/migration/bootstrap-proposals.js`, this evidence file, and the non-repository `/tmp` production smoke. No tests, fixtures, test evidence, audit artifact, or protected Workflow files were read, searched, run, or modified.

## Revision 3 - Activation Candidate-to-Record Reference View

### Main-thread input

Focused Attempt 3 reached `36 total / 35 pass / 1 fail`. Proposal, audit, staging, single-writer behavior, all four transaction faults, pending exclusion, source drift, rollback, fresh child restore, and the 22-family legacy writer fence all passed. The only remaining public-envelope gap was the absence of a candidate-key lookup in the activation result.

### Production correction

`activateBootstrapWorkspace(...)` continues to return full `compiled_records` and now additionally returns sorted `records` references:

```yaml
records:
  - key: <curated candidate key>
    id: <deterministic writer-assigned Record ID>
    active: <derived curation boolean>
```

This is a reference view, not a second Record authority. It is rederived at activation completion from:

- `stage.curation.records` candidate keys and active flags;
- the deterministic candidate-key -> compiled patch/Record-ID graph;
- `stage.compiled_records` IDs;
- `stage.active_record_ids`, already bound to the Record machine index.

Before returning, production verifies:

- every curated candidate maps to a compiled Record ID;
- the mapping covers the complete compiled Record ID set exactly once;
- each mapping's `active` equals whether its ID is the dedupe key's active index ID;
- output is sorted by candidate key.

Any mismatch fails with `ERR_BOOTSTRAP_STAGE_INTEGRITY`; no guessed or partial mapping is returned.

### Revision 3 production-only validation

The `/tmp` production suite now additionally checks the two-generation `c21_context` history:

- `context-current` and `context-old` both appear in deterministic key order;
- they map to different writer-assigned IDs;
- current is `active: true` and superseded history is `active: false`;
- current mapping ID equals `.pipeline/memory/index.yaml` `active_by_dedupe_key.c21_context`.

The complete suite remained green:

```text
C21_M5_PRODUCTION_SMOKES_OK
M5_EXPORTS_OK 9
```

Revision 3 modified only `core/src/migration/bootstrap-workspace.js`, this evidence file, and the non-repository `/tmp` production smoke. No tests, fixtures, test evidence, audit artifact, or protected Workflow files were read, searched, run, or modified.

## Isolation Declaration

This implement worker did not read, search, modify, import, or execute any `core/test/**` file, M5 fixture, `.pipeline/reviews/C21/M5/test-evidence.md`, M5 audit evidence, or future audit artifact.

It did not run repository tests. It did not modify protected Workflow state/log/progress, live `.pipeline` manifest/runtime/memory/snapshots, Skills, commands, adapters, package/config files, legacy authority files, or target repositories. All behavior writes occurred only in self-created `/tmp` workspaces.
