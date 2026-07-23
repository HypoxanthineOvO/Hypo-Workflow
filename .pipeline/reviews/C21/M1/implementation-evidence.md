# C21-M1 Implementation Evidence

## Verdict

`IMPLEMENTED`

M1 production scope is implemented: canonical serialization, manifest schema, zero-write workspace classification, guarded workspace paths, recoverable manifest-last transactions, and a central legacy-writer fence wired to all 14 inventoried writer families. No Records, Receipts, Recovery Packs, public Skill changes, live workspace activation, migration, or deletion behavior was added.

## Changed Modules And Rationale

- `core/src/serialization/index.js`: owns the shared `js-yaml` CORE schema parser/dumper, frontmatter parsing, and canonical SHA-256 hashing.
- `core/src/config/index.js`: compatibility-imports and re-exports `parseYaml`/`stringifyYaml`; existing config callers retain the same YAML semantics.
- `core/src/manifest/index.js`: defines schema version `"1"`, format `hypo-workflow`, safe identity validation, timezone-bearing creation timestamps, and the exact runtime/memory/snapshots zones.
- `core/src/workspace-format/index.js`: classifies workspace format without writes, owns the 14-entry writer inventory, and implements the central read-only legacy fence.
- `core/src/workspace-store/path-guard.js`: rejects absolute/traversal/reserved-transaction paths, zone-root replacement, non-directory escapes, and existing symlink components with `ERR_WORKSPACE_PATH_FORBIDDEN`.
- `core/src/workspace-store/transaction.js`: implements staged prepare/install/manifest activation and deterministic recovery using staged/old hashes plus verified backups.
- `core/src/workspace-store/index.js`: explicit named exports for the store API.
- `core/src/index.js`: explicit named exports for serialization, manifest, format/fence, and store contracts; no wildcard or broad barrel was added.
- Legacy writer modules (`lifecycle`, `acceptance`, `continuation`, `log`, `compact`, `sync`, `rules`, `knowledge`, `patches`, `explore`, `deep-plan`, `pr`): call the central fence before their first mutation.
- `cli/bin/hypo-workflow`: `initProject` checks `legacy.cli.init-project` before creating `.pipeline`.
- `hooks/codex-notify.sh` and `scripts/log-append.sh`: the Hook passes `legacy.hook.codex-notify`; the shared append script invokes the JS fence, defaulting direct calls to `legacy.log`, before `mkdir` or append.

## Public API

- `createWorkspaceManifest(input)` is synchronous and performs no I/O. It requires safe `workspace_id` and `project_id`, emits a timezone-bearing `created_at`, and fixes the exact three zones.
- `detectWorkspaceFormat(root)` returns only `{ kind }` with one of `empty`, `unmanaged_brownfield`, `current`, `legacy`, `damaged_current`, or `mixed_current_with_legacy_residue`. Any existing but unreadable, parse-invalid, or schema-invalid manifest is damaged. A valid manifest selects current format; any non-current top-level `.pipeline` entry makes it mixed.
- `parseYaml`, `stringifyYaml`, `parseFrontmatter`, and `canonicalHash` are exported from `core/src/serialization/index.js`. Hashes are lowercase 64-character SHA-256, recursively key-order independent for objects and order preserving for arrays.
- `commitWorkspaceTransaction(root, { id, writes, manifest, faultInjector })` validates all paths before creating transaction state. `writes` cannot contain `.pipeline/manifest.yaml` and can target only descendants of runtime, memory, or snapshots.
- `recoverWorkspaceTransaction(root, { id? })` returns `rolled_back`, `rolled_forward`, `finalized`, or `none`. Repeating recovery after cleanup performs reads only and returns `none`.
- `assertLegacyWorkspaceWritable(root, writerId)` validates the inventory id before format detection. It permits legacy/empty/unmanaged workspaces, blocks current/mixed with `ERR_LEGACY_WORKSPACE_WRITE_BLOCKED`, and blocks damaged manifests with `ERR_WORKSPACE_MANIFEST_DAMAGED`.

## Transaction And Recovery Algorithm

1. Validate transaction id, manifest schema, unique write paths, allowed zones, reserved paths, existing symlink components, and damaged-manifest state before writing.
2. Create only `.pipeline/runtime/transactions/<id>/` private staging, backup, install-temp, and marker files.
3. Record staged and old SHA-256 hashes, plus a backup for every existing target and manifest; write the prepared marker only after this data is complete.
4. Atomically install each data file by renaming an install temp from the private transaction directory.
5. Activate `.pipeline/manifest.yaml` only after every data file is installed; record private `manifest_activated` status, invoke the final fault hook, then remove the transaction directory.
6. Recovery verifies every staged file and backup before target mutation. A target matching neither its old nor staged hash fails closed with `ERR_WORKSPACE_TRANSACTION_CONFLICT` and is not overwritten.
7. Partial or zero data installation restores verified backups/removes newly created targets; a complete data set with the old/absent manifest activates the staged manifest; an active matching manifest finalizes cleanup.
8. `faultInjector` is invoked only with phase metadata and is never stored. Its original thrown object/message is propagated unchanged.

## Legacy Writer Inventory And Fenced Entrypoints

| Writer id | Module | Fenced entrypoints |
|---|---|---|
| `legacy.lifecycle.commit` | `core/src/lifecycle/commit.js` | `commitWorkflowUpdate` |
| `legacy.acceptance` | `core/src/acceptance/index.js` | `markCyclePendingAcceptance`, `acceptCycle`, `rejectCycle` |
| `legacy.continuation` | `core/src/continuation/index.js` | `writeContinuationState` |
| `legacy.log` | `core/src/log/index.js`, shared shell adapter | `appendLifecycleLogEntry`, direct `scripts/log-append.sh` |
| `legacy.compact` | `core/src/compact/index.js` | `runEndOfRunCompact` |
| `legacy.sync` | `core/src/sync/index.js` | `runProjectSync` (non-check-only), `writeClaudeHookArtifacts`, `syncClaudeCodeSettings`, `repairDerivedArtifacts` |
| `legacy.rules` | `core/src/rules/index.js` | `writeConfirmedStructuredRule`, `writeStructuredHabitsDocument` |
| `legacy.knowledge` | `core/src/knowledge/index.js` | `appendKnowledgeRecord`, `rebuildKnowledgeIndexes`, `renderKnowledgeCompact`, `rebuildKnowledgeLedger` |
| `legacy.patches` | `core/src/patches/index.js` | `requestPatchAcceptance`, `acceptPatch`, `rejectPatch` |
| `legacy.explore` | `core/src/explore/index.js` | `createExploration`, `endExploration`, `archiveExploration`, `createExploreAnalysisContext` |
| `legacy.deep-plan` | `core/src/deep-plan/index.js` | `createDeepPlanPackage`, `updateDeepPlanPackage`, `recordDeepPlanAskRound`, `recordDeepPlanResearch`, `updateDeepPlanArchitectureMap`, `drillDeepPlanTopic`, `convertDeepPlanToPlanContext`, `archiveDeepPlanPackage` |
| `legacy.pr` | `core/src/pr/index.js` | `writeChangeRequestArchive`, `writeChangeRequestCreateProposal`, confirmed `executeChangeRequestCreatePlan`, `inspectChangeRequest`, `reviewChangeRequest`, `planChangeRequestFix`, `prepareChangeRequestMerge`, `prepareChangeRequestClose` |
| `legacy.cli.init-project` | `cli/bin/hypo-workflow` | `initProject` |
| `legacy.hook.codex-notify` | `hooks/codex-notify.sh` -> `scripts/log-append.sh` | both terminal and running notification log paths |

The inventory contains exactly 14 unique ids. Read-only `sync --check-only` and unconfirmed PR create planning remain read-only and therefore do not invoke a mutation fence until mutation would begin.

## Production Validation

- `node --check` on all 21 changed JS/CLI files: 21/21 passed.
- `bash -n hooks/codex-notify.sh` and `bash -n scripts/log-append.sh`: 2/2 passed.
- Root `core/src/index.js` dynamic import and required API presence smoke: passed.
- Inventory smoke: exactly 14 ids and 14 unique ids, passed.
- Manifest YAML round-trip through the compatibility serialization layer: passed.
- Temporary-directory production smoke: six format classes, canonical hash/frontmatter, normal transaction commit, injected partial rollback, before-manifest roll-forward, after-manifest finalize, repeated recovery `none`, current/damaged/unknown-writer fence errors, hash drift preservation, and symlink rejection: passed.
- Existing-current/same-manifest second transaction with partial installation: verified rollback restores the original file.
- Shell adapter smoke: direct legacy append succeeds; manifest-activated append is blocked before mutation.
- `node cli/bin/hypo-workflow --help`: import/startup smoke passed without mutation.
- Scoped `git diff --check`: passed.

Per worker separation, no M1 test, fixture, assertion, snapshot, or test evidence file was read, edited, or executed. GREEN test execution remains owned by the independent test worker/main agent.

## Deviations, Problems, And Risks

- No required production contract was intentionally omitted.
- CLI Init enforcement is resolved: it calls the shared JS fence before its first workspace mutation.
- Codex Hook enforcement is resolved: the shell chain calls the same shared JS fence before `mkdir`/append and carries its own writer id.
- No dependency was installed; the implementation uses Node standard APIs and the existing `js-yaml` dependency.
- The transaction protocol provides deterministic application-level recovery and fail-closed drift handling. As with filesystem transactions generally, host/filesystem durability still depends on the underlying rename/write guarantees; M1 does not add cross-filesystem or distributed locking semantics.
- No protected Workflow state was read or changed: `.pipeline/state.yaml`, `.pipeline/cycle.yaml`, `.pipeline/rules.yaml`, `.pipeline/log.yaml`, `.pipeline/PROGRESS.md`, and `.pipeline/.lock` were untouched by this worker.
- Existing dirty-worktree changes outside the authorized files were preserved and not reverted.

## Expected Result

A valid manifest now selects the new workspace format and blocks all inventoried legacy mutation paths. A damaged manifest fails closed. New multi-file workspace writes remain recoverable across each specified fault boundary, activate the manifest last, and refuse to overwrite external hash drift.

## GREEN Revision 1

Main-agent focused GREEN reported `50 pass / 2 fail` and supplied two sanitized public-contract gaps. This implement revision made only the corresponding production changes:

- `legacy.hook.codex-notify` now exposes the observable entrypoint string exactly as `hooks/codex-notify.sh#scripts/log-append.sh`.
- A successful `commitWorkspaceTransaction(...)` result now includes `ok: true`; transaction ordering, fault propagation, and recovery behavior are unchanged.

Production-only validation passed:

- `node --check core/src/workspace-format/index.js`
- `node --check core/src/workspace-store/transaction.js`
- Root import smoke asserting the exact Hook inventory entrypoint
- Temporary-directory transaction smoke asserting `result.ok === true` and `result.action === "committed"`

This worker did not read, modify, or execute tests, fixtures, assertions, snapshots, test evidence, or protected Workflow state during the revision. Revision verdict: `IMPLEMENTED`.

## GREEN Revision 2

### Root Causes And Changes

- `cli/bin/hypo-workflow`: `initProject` called the read-only format fence before a requested project root existed. The detector correctly attempted to inspect the root and surfaced `ENOENT` from `readdir`. The CLI now validates/normalizes its arguments, creates only the requested root directory, and immediately runs `assertLegacyWorkspaceWritable` before creating or writing `.pipeline`. This restores initialization of a new path without changing detector semantics.
- `core/src/log/index.js`: lifecycle validation uses an exact status taxonomy, but the active worker lifecycle state `requested` was absent. `requested` was added as one exact allowed status, so normalization preserves it and validation accepts it. Family validation and rejection of every other unknown status remain unchanged.

### Compatibility And Fence Semantics

- A not-yet-existing Init target is first materialized as an empty directory, then classified as `empty`; legacy Init can proceed and project registration completes as before M1.
- For an existing valid-current or damaged-current project, recursive root creation is a no-op. The same central fence still runs before any `.pipeline` mutation and rejects the workspace with `ERR_LEGACY_WORKSPACE_WRITE_BLOCKED` or `ERR_WORKSPACE_MANIFEST_DAMAGED` respectively.
- No workspace-format detector behavior, writer inventory, transaction behavior, dependency, or architecture boundary changed.

### Production Validation

- `node --check cli/bin/hypo-workflow`: passed.
- `node --check core/src/log/index.js`: passed.
- Self-created minimal lifecycle YAML with `type: worker_requested` and `status: requested`: validation passed and resolved to the `step` family.
- The same self-created source with `invented_state`: validation remained rejected with `status unsupported`.
- Real CLI smoke with an isolated temporary `HOME` and a project path that did not exist: `init-project --platform opencode` exited 0, wrote project config/adapters, and registered the project.
- Real CLI smoke against a self-created valid manifest: exited nonzero at the legacy fence before mutation.
- Real CLI smoke against a self-created damaged manifest: exited nonzero at the damaged-manifest fence before mutation.

This revision did not read, modify, or execute tests, fixtures, snapshots, assertions, test evidence, or protected Workflow state. No blocker or scope expansion was required. Revision verdict: `IMPLEMENTED`.

## GREEN Revision 3

### Input And Verdict

Independent audit reported `NEEDS_CHANGES`; the sanitized Revision 3 RED boundary was `73 tests: 54 pass / 19 fail`, with 17 intended failing leaves and two aggregate failures. This worker did not inspect the underlying tests, fixtures, assertions, snapshots, test evidence, or raw output.

Production revision verdict: `IMPLEMENTED`. Main/test roles still own the focused GREEN rerun and independent re-audit.

### Root Causes And Invariant

The transaction success path trusted prepared metadata without re-reading staged files or public targets. Recovery also treated `marker.status=manifest_activated` as authority even when the manifest no longer existed, and commit checked only its own transaction id. Separately, the original 14-entry inventory described known writers but did not cover all exported project mutation boundaries.

The repaired invariant is:

> A marker describes expected state; only verified private hashes and current target hashes determine whether data may be installed, rolled back, rolled forward, finalized, or cleaned up.

- Every install reads a regular private staged/backup file once, verifies that exact byte buffer against the recorded hash, and installs only those verified bytes.
- Each data target is checked against its old/staged precondition immediately before install.
- The complete data set is checked after all installs and again after `before_manifest_activation` returns.
- Manifest source and target preconditions are checked immediately before activation; the complete data+manifest set is checked before and after the final callback.
- Conflicts after prepare preserve the transaction directory and never replace detected external drift.
- Recovery finalizes only when every data target and the manifest match staged hashes. Marker status is a hint only.
- Complete staged data with an old or missing manifest re-verifies private evidence and disk facts, rolls the manifest forward, verifies authority, then cleans up.
- Partial data with an active staged manifest, missing former manifest, or unrelated hash drift fails closed. Ordinary partial data restores verified backups/removes new targets and verifies old state before cleanup.
- Commit enumerates all pending transaction directories before creating its own staging directory. Any same or different id returns `ERR_WORKSPACE_TRANSACTION_PENDING` while leaving the original transaction recoverable.

### Changed Production Files

- `core/src/workspace-store/transaction.js`: disk-fact commit/recovery validation and deterministic workspace pending-directory exclusion.
- `core/src/workspace-format/index.js`: zero-write missing-root `empty` result and exact 22-entry writer inventory.
- `core/src/config/index.js`: conditional fence for exact project `.pipeline/config.yaml` targets; global config remains unfenced.
- `core/src/artifacts/opencode.js`: `writeOpenCodeArtifacts` fence before first mutation.
- `core/src/artifacts/claude.js`: plugin and agent generator fences before first mutation.
- `core/src/artifacts/third-party.js`: adapter and Cursor bundle fences before first mutation.
- `core/src/docs/index.js`: `repairDocs` fence before generated documentation writes.
- `core/src/readme/index.js`: project README fence only when a changed preview will actually be written.
- `core/src/actions/index.js`: project-sync fence after read-only registry/project resolution and only before the project artifact branch.
- `core/src/tui/index.js`: project-target config fence before write; global-target edits remain allowed.

### Added Writer Mapping

| Writer id | Real public boundary | Project/global qualification |
|---|---|---|
| `legacy.config.project` | `writeConfig` | only exact `<project>/.pipeline/config.yaml` |
| `legacy.artifacts.opencode` | `writeOpenCodeArtifacts` | target project root derived before `mkdir`/`rm`/write |
| `legacy.artifacts.claude` | `writeClaudeCodePluginArtifacts`, `writeClaudeCodeAgentArtifacts` | target project root before writes |
| `legacy.artifacts.third-party` | `writeThirdPartyAdapterArtifacts`, `writeCursorSkillBundle` | target project root before writes/removals |
| `legacy.docs` | `repairDocs` | project root before generated files |
| `legacy.readme` | `updateReadme` | only actual project README writes; preview remains read-only |
| `legacy.actions.project-sync` | `syncSelectedProjectAction` | after read-only resolution, only before project artifact generation; registry-only updates remain global |
| `legacy.tui.project-config` | `applyConfigTuiEdit` | only `target.id=project`; global target remains allowed |

The inventory now contains exactly 22 unique ids. The qualified Hook entrypoint remains `hooks/codex-notify.sh#scripts/log-append.sh`, and the Revision 2 CLI Init ordering remains unchanged.

### Format And Compatibility

- `detectWorkspaceFormat(nonexistentRoot)` now returns exactly `{ kind: "empty" }` after read-only `lstat`; it does not create the root or parent entries.
- Existing `empty`, `unmanaged_brownfield`, `legacy`, `current`, `damaged_current`, and `mixed_current_with_legacy_residue` behavior otherwise remains unchanged.
- Legacy/unmanaged project writers remain allowed until manifest activation.
- Valid current/mixed and damaged current workspaces still fail closed before the first project mutation.
- Global config, global TUI config, project registry-only refresh, global maintenance/ledger, and notification queues are not newly fenced.

### Production-Only Validation

- `node --check` on all 10 Revision 3 production files: 10/10 passed.
- Root import plus exact inventory validation: 22 entries, 22 unique ids, all eight new ids present.
- Scoped `git diff --check`: passed.
- Self-created `/tmp` staged-tamper commit: returned `ERR_WORKSPACE_TRANSACTION_CONFLICT`; target and manifest remained absent; transaction evidence remained.
- Self-created `/tmp` non-throwing target drift at `before_manifest_activation`: drift bytes remained untouched; manifest stayed absent; evidence remained.
- Self-created `/tmp` different-id pending transaction: second transaction was rejected before its directory existed; first transaction recovered normally.
- Self-created `/tmp` marker-status lie: recovery used disk facts and rolled back instead of finalizing.
- Self-created `/tmp` deleted post-activation manifest: recovery rolled the verified staged manifest forward and a repeated recovery returned `none`.
- Normal commit, partial rollback, before-activation roll-forward, after-activation finalize, and idempotent recovery smokes passed after the changes.
- Missing-root detector smoke confirmed the root remained absent and its parent directory listing remained byte-for-byte equivalent.
- All eight real writer families were invoked against a self-created valid-current workspace and rejected with their own exact writer ids before any generated/config/docs/README artifact changed.
- Global `writeConfig`, global-target `applyConfigTuiEdit`, registry-only `syncSelectedProjectAction`, and README preview smokes remained allowed.

### Residual Risks And M2 Boundary

- Pending-directory enumeration and target-hash-check-to-rename still have filesystem TOCTOU windows across truly concurrent processes. Revision 3 provides deterministic exclusion for existing pending directories, not an OS-backed cross-process lease.
- Transaction marker updates are not fsync-backed or atomically replaced. An externally truncated/corrupted marker fails closed and retains evidence, but requires manual resolution.
- A target can theoretically change between its precondition read and rename, or after the last authority check and before cleanup. Addressing that fully requires stronger filesystem locking/durability policy beyond the current M1 contract.
- No Record Store, Receipt, Journal, Capsule, Snapshot, Recovery Pack, M2 authorization, or public Skill behavior was added. The private transaction marker remains only an M1 recovery mechanism.

No new dependency, remote side effect, protected state write, destructive cleanup, or out-of-scope file change was required.

## GREEN Revision 4

### Root Cause And Invariant

Revision 3 normalized and deduplicated each transaction write path independently, but it did not validate the write set as a whole. Because every current write entry represents a file, accepting both an ancestor path and one of its segment descendants would require the same target to be both a file and a directory. The eventual filesystem failure could occur only after transaction staging or an earlier target installation, violating zero-write rejection.

The new invariant is: after normalization and duplicate rejection, the complete file-write set must be prefix-free on path-segment boundaries before any filesystem access.

### Algorithm And File Change

- Changed only `core/src/workspace-store/transaction.js`.
- `normalizeWrites()` retains the existing normalization, manifest-path prohibition, duplicate rejection, and content checks.
- It then passes the normalized paths to a local prefix-free validator before returning to `commitWorkspaceTransaction()`.
- The validator builds the complete path set, walks paths in deterministic sorted order, enumerates only slash-delimited ancestors, and rejects the first matching ancestor/descendant pair.
- Rejection uses `ERR_WORKSPACE_PATH_FORBIDDEN` with a content-free message naming both conflicting normalized paths: `Workspace write-set path conflict: <ancestor> is an ancestor of <descendant>`.
- Segment enumeration does not treat lexical siblings such as `node` and `node-old` as related.

This validation runs before manifest normalization, format detection, pending-transaction enumeration, path guards, staging directories, backups, targets, or manifest activation. Both caller orders therefore produce the same error and perform no writes.

### Production-Only Validation

- `node --check core/src/workspace-store/transaction.js`: passed.
- Self-created `/tmp` ancestor-first write set: rejected with `ERR_WORKSPACE_PATH_FORBIDDEN`; both paths appeared in the deterministic conflict message.
- Self-created `/tmp` descendant-first write set: rejected with the same code and exact message.
- For both rejected calls, the project root remained absent, the parent directory listing was unchanged, and parent `mtime`/`ctime` were unchanged.
- Lexical sibling write set (`node`, `node-old`): committed successfully and both file contents matched.
- Normal multi-zone write set under distinct runtime, memory, and snapshots parents: committed successfully and detected as `current`.

The first normal-path smoke attempt used a nonexistent root and encountered the existing transaction path guard's root `realpath` precondition; the smoke fixture was corrected to create an empty root. No production behavior was changed for that unrelated condition.

### Compatibility And Residual Risks

- Exact duplicate rejection remains the pre-existing duplicate-path error because duplicate detection runs before prefix validation.
- Traversal, absolute, reserved transaction, symlink, pending transaction, hash-drift, recovery, 22-family writer fence, and M2 boundaries are unchanged.
- The Revision 3 filesystem TOCTOU, marker atomicity/fsync, and cross-process lease limitations remain; Revision 4 neither expands nor weakens them.
- No tests, fixtures, assertions, snapshots, test evidence, protected state, dependency, remote resource, or out-of-scope production file were read, run, or changed.

Revision 4 verdict: `IMPLEMENTED`.
