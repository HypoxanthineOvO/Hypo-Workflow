# C21-M1 Test Evidence

## Role

- Worker role: `test`
- Verdict: `RED_READY`
- Current validation: Revision 3 `RED` (`73` pass / `3` fail across `76` focused tests)
- Separation: this worker changed tests and this evidence file only. It did not edit production modules, manifests, Skills, config, adapters, package metadata, or protected Workflow state.

## Scope

The suite defines the pre-implementation contract for workspace classification, canonical serialization, manifest-last transactions, deterministic crash recovery, path containment, and the legacy-write fence. All behavioral storage checks use temporary real filesystems. No test accepts source-text or function-name scanning as proof of runtime behavior.

Test size:

- 3 new test files
- 28 top-level `test()` declarations
- 65 executable M1 test/subtest cases plus 11 focused compatibility cases
- 22 independently classified project-writer families in the executable inventory contract

## Changed Tests

- `core/test/workspace-format.test.js`
  - canonical YAML/frontmatter/hash contract and compatibility parity
  - all six workspace classes
  - byte/content/type/mtime zero-write snapshots
  - valid-manifest precedence and schema-invalid fail-closed classification
  - missing project root classified as `empty` without creating the directory
- `core/test/workspace-transaction.test.js`
  - writes to runtime, memory, and snapshots with manifest activation last
  - crashes after prepare, during the first install, immediately before activation, and immediately after activation
  - rollback, roll-forward, finalize, and idempotent second recovery
  - prepared-target hash drift, stale transaction-id reuse, lexical traversal, absolute escape, disallowed roots, symlink escape, and damaged-manifest rejection
  - non-throwing staged tamper and pre-activation target drift during commit
  - manifest missing/old recovery after activation and workspace-wide pending transaction exclusion
  - ancestor/descendant write-set rejection in both caller orders before any workspace mutation
- `core/test/legacy-write-fence.test.js`
  - machine-readable inventory for every writer family found by the C21 storage scan
  - original 14-id coverage plus 8 independently classified public project-writer families
  - fully qualified `hooks/codex-notify.sh#scripts/log-append.sh` observable chain
  - central fence execution for every inventory id in current, mixed, and damaged workspaces
  - direct execution of lifecycle, all acceptance, continuation, and log entrypoints
  - exact tree preservation on blocked writes and compatibility allowance for a true legacy workspace
  - real calls to 10 public project writers and process-level CLI/log-append entrypoints

## Coverage Matrix

| M1 requirement | Executable coverage |
|---|---|
| Preserve old YAML named imports and semantics | `canonical serialization preserves legacy YAML semantics...`; existing `yaml-parser-unification.test.js` in the focused command |
| Canonical hash is key-order independent and array-order preserving | `canonical serialization preserves legacy YAML semantics...` |
| Parse frontmatter, plain Markdown, and malformed input | `canonical serialization preserves legacy YAML semantics...` |
| Detect exactly six workspace classes | `detectWorkspaceFormat classifies all six workspace formats without writes` |
| Detector and legacy inspection perform zero writes | per-class full-tree snapshots in `workspace-format`; central-fence tree snapshots in `legacy-write-fence` |
| Missing root is a zero-write new-project classification | `a missing project root is classified as empty without creating it` |
| A valid manifest is authoritative | `valid manifest evidence takes precedence over unrelated brownfield files` |
| Invalid manifest never falls back to legacy | `a parseable but schema-invalid manifest is damaged_current, never legacy` |
| Allowed roots are manifest/runtime/memory/snapshots only | transaction success over all three data roots; disallowed-root table |
| Reject traversal and absolute escape | `transaction rejects traversal, absolute escapes...` |
| Reject symlink escape | `transaction rejects an allowed-looking path that escapes through a symlink` |
| Stage and prepare before installation | crash at `after_prepare`, followed by deterministic rollback |
| Recover from a partial rename | crash at first `after_install_file`, followed by restoration of every old file |
| Activate manifest last | ordered fault events in transaction success; crash at `before_manifest_activation` |
| Recover immediately before activation | all data files remain installed; recovery returns `rolled_forward` and creates a valid current workspace |
| Recover immediately after activation | recovery returns `finalized`; current bytes remain stable |
| Recovery is idempotent | a second recovery is asserted to make no filesystem change for every recoverable crash case |
| Prepared marker/backup hashes guard drift | `recovery fails closed when a prepared target drifts from its recorded hash` |
| Stale prepared state cannot be overwritten | `a stale prepared transaction cannot be overwritten by reusing its id` |
| Commit verifies staged bytes before install | `commit rejects staged bytes tampered after prepare without installing or activating them` |
| Commit revalidates every target before activation | `commit rejects target drift before manifest activation and preserves external bytes` |
| Marker status cannot replace on-disk manifest authority | `recovery rolls forward after an activated manifest is deleted or restored to its old hash` |
| One pending transaction per workspace | `a different transaction id cannot bypass another pending workspace transaction` |
| File write sets are prefix-free before staging | `transaction rejects ancestor and descendant file paths before any workspace mutation` |
| Damaged current blocks the new writer | `damaged current manifest blocks the new transaction path without mutation` |
| Valid current/mixed blocks every legacy writer id | central inventory loop plus direct high-risk entrypoint tests |
| Damaged current blocks every legacy writer id | central inventory loop plus six direct high-risk entrypoint tests |
| Legacy writer compatibility remains available before activation | `legacy workspace remains writable through the compatibility fence` |
| Inventory lifecycle/acceptance/continuation/log/compact/sync/rules/knowledge/patch/explore/deep-plan/PR/CLI/notify | `legacy writer inventory exposes every discovered family and observable entrypoint` |
| Config/platform/Docs/README/action/TUI public writers reject before partial mutation | `public project writers reject a current workspace before their first mutation` |
| CLI init and notify/log ordering are process-executable | `CLI init and the qualified notify log chain reject before process-level mutation` |
| Existing workflow commit behavior remains compatible | existing `workflow-commit.test.js` in the focused command |

## Commands And RED Evidence

Syntax check:

```bash
node --check core/test/workspace-format.test.js \
  && node --check core/test/workspace-transaction.test.js \
  && node --check core/test/legacy-write-fence.test.js
```

Result: exit `0`.

New-test RED command:

```bash
node --test \
  core/test/workspace-format.test.js \
  core/test/workspace-transaction.test.js \
  core/test/legacy-write-fence.test.js
```

Result: exit `1`; `0` pass, `3` fail. Each file fails during ESM loading because `core/src/manifest/index.js` does not exist yet. This is the expected pre-implementation failure, not an assertion, fixture, syntax, or environment failure.

Milestone focused command:

```bash
node --test \
  core/test/workspace-format.test.js \
  core/test/workspace-transaction.test.js \
  core/test/legacy-write-fence.test.js \
  core/test/yaml-parser-unification.test.js \
  core/test/workflow-commit.test.js
```

Result: exit `1`; `11` pass, `3` fail. All 11 existing YAML and workflow-commit tests pass. The three new files fail only on the expected missing M1 manifest module.

Post-implementation revision validation:

```bash
node --test \
  core/test/workspace-format.test.js \
  core/test/workspace-transaction.test.js \
  core/test/legacy-write-fence.test.js \
  core/test/yaml-parser-unification.test.js \
  core/test/workflow-commit.test.js
```

Result after reconciling the qualified notify-chain contract: exit `0`; `52` pass, `0` fail. All format, serialization, transaction, recovery, path, inventory, fence, and compatibility assertions execute.

Revision 2 audit-driven RED command:

```bash
node --test \
  core/test/workspace-format.test.js \
  core/test/workspace-transaction.test.js \
  core/test/legacy-write-fence.test.js \
  core/test/yaml-parser-unification.test.js \
  core/test/workflow-commit.test.js
```

Result: exit `1`; `73` tests, `54` pass, `19` fail. The count contains 17 failing leaf cases and two failed aggregate parents. Of the earlier 52 focused cases, the independently expanded inventory case is now RED and the other 51 remain GREEN. The two CLI/notify process subtests plus their parent add three new GREEN counts.

### Revision 2 RED Cases

| Case | Classification | Sanitized current failure |
|---|---|---|
| Expanded writer inventory | writer-surface | 8 required project-writer ids are absent |
| `writeConfig(.pipeline/config.yaml)` | conditional project config writer | creates legacy config in a current workspace |
| `writeOpenCodeArtifacts` | project platform writer | creates partial OpenCode artifacts before nested rejection |
| Claude plugin writer | project platform writer | writes plugin/monitor/command artifacts |
| Claude agent writer | project platform writer | writes `.claude` agent artifacts |
| Third-party adapter writer | project platform writer | writes managed adapter content |
| Cursor Skill bundle writer | project platform writer | creates/copies Cursor resources |
| `repairDocs` | project Docs writer | generates documentation files |
| `updateReadme(write=true)` | conditional project README writer | rewrites the managed block |
| `syncSelectedProjectAction` | cross-scope project orchestrator | reaches a nested project writer instead of rejecting at its public boundary |
| `applyConfigTuiEdit(project)` | conditional project TUI writer | reaches project config mutation instead of rejecting at its public boundary |
| Missing root detector | format detector | throws `ENOENT` instead of returning `empty` |
| Staged bytes tampered after prepare | transaction integrity | commit succeeds instead of returning a conflict |
| Target drift before activation | transaction integrity | commit succeeds and activates manifest over drift |
| Activated manifest deleted | recovery authority | recovery conflicts instead of validated roll-forward |
| Activated manifest restored to old hash | recovery authority | returns `finalized` without restoring staged manifest |
| Different id while transaction pending | transaction exclusion | second transaction installs data and activates a different manifest |

The existing current/mixed/damaged rejection, true-legacy compatibility, path guards, original crash recovery, serialization, YAML compatibility, workflow commit behavior, CLI init ordering, and qualified notify/log process checks remain GREEN.

Revision 2 post-implementation and re-audit baseline: the focused suite reached `73/73` GREEN before the independent prefix-collision falsification.

### Revision 3 Prefix-Collision RED

Command:

```bash
node --test \
  core/test/workspace-format.test.js \
  core/test/workspace-transaction.test.js \
  core/test/legacy-write-fence.test.js \
  core/test/yaml-parser-unification.test.js \
  core/test/workflow-commit.test.js
```

Result: exit `1`; `76` tests, `73` pass, `3` fail. The two failing leaf cases are ancestor-first and descendant-first orderings of `.pipeline/runtime/node` with `.pipeline/runtime/node/child.txt`; the third failure is their aggregate parent. All prior 73 focused cases remain GREEN.

Observed sanitized failure: each ordering reaches staging and partially installs one target before rejection, leaving transaction evidence and changing the workspace tree. This is the exact missing preflight invariant from `.pipeline/reviews/C21/M1/reaudit.md`.

Revision 3 changed only `core/test/workspace-transaction.test.js` and this evidence file. It added no fixture, production, config, Skill, adapter, report, audit, protected state, log, or progress write.

Whitespace check:

```bash
git diff --check
rg -n '[[:blank:]]+$' \
  core/test/workspace-format.test.js \
  core/test/workspace-transaction.test.js \
  core/test/legacy-write-fence.test.js \
  .pipeline/reviews/C21/M1/test-evidence.md
```

Result: `git diff --check` exits `0`; `rg` exits `1` with no matches, which is its clean signal for these untracked files.

## Public API Contract

The implementation worker needs these exact named contracts:

- `createWorkspaceManifest(input)` returns canonical manifest data and performs no write.
- `detectWorkspaceFormat(projectRoot)` resolves to `{ kind }`, where `kind` is exactly one of `empty`, `unmanaged_brownfield`, `current`, `legacy`, `damaged_current`, or `mixed_current_with_legacy_residue`.
- `assertLegacyWorkspaceWritable(projectRoot, writerId)` is read-only; it permits a true legacy workspace and rejects current, mixed-current, and damaged-current workspaces.
- `LEGACY_WORKSPACE_WRITER_INVENTORY` is an array of unique `{ id, module, entrypoints }` objects.
- JavaScript `entrypoints` are export names relative to `module`; a cross-script chain is already qualified and must be stored exactly as `hooks/codex-notify.sh#scripts/log-append.sh`, without adding the module prefix again when displayed.
- The original writer ids remain `legacy.lifecycle.commit`, `legacy.acceptance`, `legacy.continuation`, `legacy.log`, `legacy.compact`, `legacy.sync`, `legacy.rules`, `legacy.knowledge`, `legacy.patches`, `legacy.explore`, `legacy.deep-plan`, `legacy.pr`, `legacy.cli.init-project`, and `legacy.hook.codex-notify`.
- Independently required project-writer ids are `legacy.config.project`, `legacy.artifacts.opencode`, `legacy.artifacts.claude`, `legacy.artifacts.third-party`, `legacy.docs`, `legacy.readme`, `legacy.actions.project-sync`, and `legacy.tui.project-config`.
- Every public project writer rejects a valid current or mixed workspace before its first filesystem/registry mutation with `ERR_LEGACY_WORKSPACE_WRITE_BLOCKED`; the error message identifies that public writer id rather than only a nested writer.
- `writeConfig` is conditionally project-scoped when its target is inside a project's `.pipeline/`; global config paths remain outside this contract. `updateReadme` is mutation-scoped only when `write=true`. `applyConfigTuiEdit` is project-scoped only for a project target.
- `commitWorkspaceTransaction(projectRoot, { id, writes, manifest, faultInjector })`; each write is `{ path, content }`; success returns at least `{ ok: true }`.
- Commit revalidates staged hashes immediately before install and revalidates the complete target set immediately before manifest activation. A mismatch throws `ERR_WORKSPACE_TRANSACTION_CONFLICT`, leaves manifest inactive, preserves external bytes, and retains recoverable evidence.
- A workspace permits only one prepared/installing transaction regardless of id, manifest identity, or path overlap. A competing id throws `ERR_WORKSPACE_TRANSACTION_PENDING` before staging or mutation; the original transaction remains recoverable.
- Transaction file-write paths must form a prefix-free set after normalization. If one path is an ancestor of another at a `/` component boundary, either caller order throws `ERR_WORKSPACE_PATH_FORBIDDEN` with a write-set collision message before staging, directory creation, target installation, or manifest activation.
- Prefix-collision rejection leaves the initial workspace byte/type/mtime-identical and creates no transaction directory. The contract specifies observable preflight behavior, not a sorting or detection algorithm.
- `recoverWorkspaceTransaction(projectRoot, { id })` returns an `action` of `rolled_back`, `rolled_forward`, or `finalized` when work is pending. Repeated recovery is a zero-write no-op.
- The deterministic test seam calls `faultInjector({ phase, index?, path? })` at `after_prepare`, `after_install_file`, `before_manifest_activation`, and `after_manifest_activation`. The function or its properties must never be serialized.
- `parseYaml`, `stringifyYaml`, `parseFrontmatter`, and `canonicalHash` are explicit exports from `core/src/serialization/index.js`; config/root YAML imports preserve existing behavior.
- `parseFrontmatter(source)` returns `{ attributes, body }`; no-frontmatter input returns empty attributes and the original body; malformed delimiters throw clearly.
- `canonicalHash(value)` returns lowercase 64-character SHA-256 hex, ignores object key insertion order, and preserves array order.

Recovery policy fixed by the tests:

- no installed data file or a partial install -> rollback from verified backup evidence;
- every data file installed but manifest absent -> roll forward by activating the staged manifest;
- manifest already active -> validate and finalize;
- marker status alone never proves activation; `finalized` requires the on-disk manifest and every data target to match staged hashes;
- after an activation interruption, all data staged plus manifest old/missing -> validate all private and target evidence, restore the staged manifest, return `rolled_forward`, then clean evidence;
- target content matching neither the recorded old nor staged hash -> fail closed without overwriting the drift.

## Revision 2 Writer Classification

| Class | Surfaces | M1 treatment |
|---|---|---|
| Project authority/config | `writeConfig` targeting project `.pipeline`, project TUI apply | conditional outer fence |
| Project platform artifacts | OpenCode, Claude plugin/agents, third-party adapters, Cursor bundle | unconditional project-root outer fence |
| Project documentation | `repairDocs`, `updateReadme(write=true)` | outer fence before first generated/rewrite operation |
| Cross-scope orchestrator | `syncSelectedProjectAction` | fence selected project before project or registry mutation |
| Existing legacy runtime | original lifecycle/acceptance/log/etc. 14 families | retain current/mixed/damaged fence and legacy compatibility |
| Global-only by current contract | user config migration, migrated global config, project registry CRUD, global model-pool edits, maintenance/event/notification stores | not added as project writers in Revision 2 |
| Read-only/test-only | loaders, checks, renderers, probes, test fixture writes | no fence required |

Generic path-based ledger/config helpers and writers reached only through global maintenance/notification flows remain a residual classification risk. `writeConfig` is included because the repository directly uses it for project `.pipeline` state; generic ledger APIs were not added after the requested scope convergence and require a later caller/path-policy audit.

## Risks

- CLI `initProject()` and the qualified notify/log chain are now process-invoked in isolated temp workspaces and remain GREEN.
- The 10 audit-confirmed public project entrypoints are directly invoked; generic path writers and global maintenance/notification call graphs remain residual inventory uncertainty.
- Revision 2 contracts are now GREEN; broader repository/scenario validation remains implementation/audit work after the narrow Revision 3 production fix.
- Revision 3 retains all 73 prior focused cases and adds only the two-order prefix-collision contract; cross-process TOCTOU and fsync concerns remain outside this narrow deterministic invariant.
- Full repository and scenario regression are outside the RED worker boundary and remain implementation/audit validation work.

## Verdict

`RED_READY`

The initial RED and prior GREEN history remain intact. Revision 3 is `RED_READY`: `73` pass / `3` fail, with only the two prefix-collision orderings and their aggregate parent failing on the confirmed zero-write preflight invariant.
