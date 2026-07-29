# C21-M4 Implementation Evidence

## Verdict

`IMPLEMENTED`

C21-M4 now provides a manifest-based Init path for empty and unmanaged brownfield repositories, a raw read-only legacy inspector, a complete command exposure/availability inventory, runtime route/discovery APIs, and a concise progressive-disclosure Skill surface. No general migration/bootstrap job, Goal/Cycle delivery backend, CLI change, platform generator/adapter change, plugin manifest change, global registration, or destructive cleanup was added.

## Changed Modules And Rationale

- `core/src/init/index.js`: owns `initializeWorkspace(...)`, bounded brownfield evidence collection, initial Record/index/Capsule compilation, and the single manifest-last bootstrap transaction.
- `core/src/migration/legacy-inspector.js`: reads only the five declared legacy YAML evidence files, preserves raw decoded documents, emits SHA-256 evidence, and returns sanitized unreadable-source diagnostics.
- `core/src/migration/index.js`: exposes the focused read-only migration boundary without adding a general migration writer.
- `core/src/commands/index.js`: classifies every compatibility command by exposure and availability, adds `/hw:goal`, resolves the three supported namespaces with longest-command precedence, and verifies focused Child Skill backends on each route/discovery call.
- `core/src/index.js`: adds exactly four M4 root APIs: `initializeWorkspace`, `inspectLegacyWorkspace`, `resolveCommandRoute`, and `discoverableCommandMap`.
- `SKILL.md`: replaces the 1,044-line command manual with a 100-line / 6,779-byte compatibility router and direct progressive links to Init and Guide.
- `skills/init/SKILL.md`: describes only the new manifest-based adoption behavior, single no-input Ask, workspace-class outcomes, and safety/report boundaries.
- `skills/guide/SKILL.md`: recommends only actually discoverable routes and keeps Guide read-only.

## Init Transaction And Authority Shape

`initializeWorkspace(root, request = {}, options = {})` accepts only:

```text
request: { intent?, project_id?, workspace_id? }
options: { id?, faultInjector? }
```

Input shape, hidden-reasoning fields, raw secret patterns, bounded password/token seed identifiers, safe IDs, and fault-injector type are checked before project materialization or workspace writes. Per-call Clock/timestamp overrides are rejected as unsupported fields. Missing roots remain absent on the no-input path and are materialized only after a valid intent selects the write path.

Empty and brownfield initialization compile all bytes in memory, validate content-derived Records and the Capsule shape, then use one certified M1 transaction. The transaction stages:

- bootstrap Runtime and Continuation
- reference-only `runtime/active.yaml`
- content-derived `project_intent` and `adoption_brief` Markdown Records
- byte-rebuildable machine/human Record indexes
- a byte-rebuildable empty-Journal Context Capsule

The manifest activates last. Init returns `initial_snapshot: null` and does not fabricate a Goal/Cycle Snapshot, Receipt, Journal event, Recovery Pack, or delivery lifecycle.

The brownfield scanner considers a bounded set of root metadata plus `src`, `app`, `lib`, `test`, and `tests`, skips dependency/build directories, limits depth and selected files, rejects symbolic-link evidence, and never persists source bodies. It reports observed file/package metadata facts and one explicitly inferred brownfield classification fact. Every fact has `basis`, numeric confidence, and existing repository-relative source locators. Dependency keys are evidence only; no framework, database, monorepo, or deployment architecture is claimed.

## Workspace-Class Outcomes

- No input: returns `needs_input` with the required `init_outcome` question and performs zero writes.
- Current: returns `already_initialized` plus the validated on-disk manifest without mutation.
- Mixed current/legacy residue: returns `already_initialized_with_legacy_residue` plus the validated on-disk manifest without mutation.
- Legacy: returns `legacy_detected` plus `inspectLegacyWorkspace(...)` output and performs zero writes.
- Damaged current: throws `ERR_INIT_WORKSPACE_DAMAGED` with repair/restore guidance and never falls back to a legacy writer.
- Empty or unmanaged brownfield with intent: returns `initialized` with manifest, bootstrap refs/paths, two Record refs, traceable Adoption Brief facts, and `initial_snapshot: null`.

The legacy inspector raw-parses present `.pipeline/{state,cycle,config,continuation,log}.yaml` files without `loadConfig()` or default filling. Each readable or malformed regular file carries its content SHA-256. Malformed YAML has `status: unreadable`, a sanitized `{code}`, and no `document`. Symlink/non-regular evidence is rejected. Summary fields are derived only when the raw documents contain them.

## Command Exposure And Router

The compatibility inventory contains 54 commands. Every entry has one of `public|contextual|internal|deferred|removed` and one of `available|unavailable`; all unavailable entries include both the compatibility `reason` and explicit `availability_reason`.

- Public and available: `/hw:guide`, `/hw:init`.
- Public but unavailable: `/hw:goal`, `/hw:plan`, `/hw:cycle`, `/hw:maintain`, `/hw:resume`.
- Contextual but unavailable: `/hw:accept`, `/hw:reject`.
- Internal/unavailable: Chat, Explain, Status, Report, Log, Check, Compact, Knowledge, Sync, Debug, explicit Start, and Plan phases.
- Deferred/unavailable: Analysis, Audit, Quality, Explore, Docs, PR, Release, Optimize.
- Removed/unavailable: Setup, Rules, Stop, Skip, Reset, Showcase, Patch, Help, and legacy Maintain subcommands.

`resolveCommandRoute(...)` normalizes `/hw:*`, `/hypo-workflow:*`, and `$hypo-workflow:*`, accepts trailing arguments, and prioritizes the longest canonical/platform spelling. Known non-available routes return a concrete status/message and `writes: []`; they never expose an executable flag. Available routes return the canonical metadata and focused Child Skill path only after a fresh `lstat` walk proves every projected backend component is non-symlink and the final target is a regular file.

`discoverableCommandMap(...)` repeats the backend check and returns only public/contextual entries that are metadata-available and physically present. Codex keeps canonical names; OpenCode keeps the existing platform-name projection. A missing or symlinked Init/Guide backend is excluded rather than advertised.

## Production-Only Validation

All behavioral validation used production imports and self-created `/tmp` repositories. No `core/test/**`, M4 fixture, M4 test evidence, or audit artifact was read, modified, or executed by this worker.

- `C21_M4_PRODUCTION_SMOKES_OK`: empty and missing-root initialization; brownfield adoption; no-input zero-write Ask; raw legacy/malformed inspection; current/mixed/damaged behavior; injected `after_prepare` recovery; namespace aliases; longest-route precedence; backend-missing discovery; source byte/mtime preservation; absence of legacy/global/adapter outputs.
- M1-M3 reader/rebuild validation inside the same smoke: manifest classification, active pointer, Runtime/Continuation, both Records, Context Capsule, byte-identical derived Record index rebuild, and byte-identical empty-Journal Capsule rebuild all passed.
- `C21_M4_ADVERSARIAL_SMOKES_OK`: password/token/secret seed patterns in intent/project/workspace/transaction IDs, secret assignment text, traversal, extra fields, per-call time override, brownfield and legacy symlinks, raw legacy no-default parsing, and symlinked router backend all failed closed with zero unexpected writes.
- `C21_M4_REGISTRY_SKILL_SMOKE_OK`: exact 54-command classification matrix, two-command discovery, non-executable rejection envelopes, Root Skill limits/direct links, and Skill frontmatter/removed-guidance checks passed.
- `node --check`: Init, legacy inspector/barrel, command router, and Core root all passed.
- Core root dynamic import confirmed the four required M4 exports.
- Root Skill limit: 100 lines / 6,779 bytes, below 320 lines / 18,000 bytes.
- Scoped `git diff --check`: passed.
- Scoped trailing-whitespace, TODO/FIXME marker, and credential-pattern scans: no findings.

## Problems And Residual Risks

1. The initial Capsule first included explanatory scope/non-goal prose without a Journal source. Production rebuild falsification caught that authority-direction error; the final Capsule now uses the exact empty-Journal projection and rebuilds byte-for-byte through the certified M3 API.
2. Certified M1 recovery removes the prepared marker and every staged target but retains empty `.pipeline/runtime/transactions/` ancestor directories after a pristine `after_prepare` rollback. The M4 file-tree contract records files/symlinks/other entries rather than empty directories, so the original authority/data tree is restored. Exact empty-directory pruning remains an M1 filesystem residual and was not expanded into M4 or destructive cleanup.
3. Creating a genuinely missing project root is necessarily outside the inner `.pipeline` transaction. No-input and rejected-input paths do not materialize it; a valid write intent does. Files under the new workspace remain governed by manifest-last recovery.
4. Brownfield inference is deliberately shallow and finite. It preserves evidence quality and avoids unsupported stack claims, but it is not a substitute for later architecture discovery.
5. Init captures the host timestamp internally. It intentionally exposes no per-call Clock override, so deterministic callers should assert schema/relationships rather than fixed timestamp bytes.
6. The Skill Creator eval/benchmark loop was not run by this implement identity because M4 assigns Skill behavior tests and independent evaluation to the separate test/audit workers. The implementation applied its progressive-disclosure, trigger-description, lean-body, and explain-the-why principles directly.

## Expected Result

A user can now ask what to do, initialize a new or existing unowned repository into a current manifest-selected workspace, or inspect a legacy workspace without mutation. The resulting bootstrap state is readable and deterministically rebuildable through the certified M1-M3 boundaries. At the same time, the root Skill and runtime discovery expose only the two capabilities that actually exist, so planned, internal, deferred, removed, or physically missing backends cannot masquerade as executable commands.

## Revision 1 — Focused Production Envelope Corrections

### Input And Decision

Main-agent focused validation reported `18/25`. Two failures assumed new Record kinds named `project_intent` and `adoption_brief`; that conflicts with the certified M2 schema. Production therefore intentionally retains:

- project intent: `kind: requirement`, `dedupe_key: project_intent`
- Adoption Brief: `kind: decision`, `dedupe_key: adoption_brief`

No M2 schema or Record kind expansion was made. Revision 1 addresses only the remaining five published production envelope/security gaps.

### Corrections

1. All 52 unavailable compatibility entries are now constructed through one `unavailablePolicy(...)` helper. Each carries a non-empty `availability_reason`, while the existing `reason` remains as a compatibility alias with the same value. This covers public-planned, contextual, internal, deferred, and removed entries uniformly.
2. Current and mixed Init outcomes now include the manifest read and validated from disk through the certified current-manifest reader. Both paths remain read-only and preserve the complete file tree byte/mtime snapshot.
3. Init now performs an explicit `lstat` of the root `.pipeline` entry before workspace classification, brownfield scanning, or transaction preparation. A `.pipeline` symlink or non-directory fails closed with `ERR_INIT_WORKSPACE_PATH_FORBIDDEN`, a sanitized diagnostic, and no access-induced mutation of the link or external target.
4. Legacy evidence/root symlink rejection keeps `ERR_LEGACY_EVIDENCE_FORBIDDEN` but now uses stable `symlink/path forbidden` wording so hosts and users can identify the boundary without parser-specific text or external path disclosure.
5. Unknown route results now explicitly include `canonical: null`, a concrete message, `writes: []`, and no executable field.

### Production-Only Validation

- `C21_M4_REVISION1_SMOKE_OK`: verified every unavailable entry's `availability_reason`; exact current/mixed manifest envelopes and zero-write snapshots; root `.pipeline` symlink rejection with unchanged external bytes/mtime; stable legacy evidence symlink diagnostic; and unknown `canonical: null`/non-executable output.
- `C21_M4_PRODUCTION_SMOKES_OK`: previous empty/missing-root/brownfield/no-input/legacy/current/mixed/damaged/recovery/router and M1-M3 rebuild coverage remained green.
- `C21_M4_ADVERSARIAL_SMOKES_OK`: previous secrets, traversal, Clock override, and symlink gates remained green.
- `C21_M4_REGISTRY_SKILL_SMOKE_OK`: exact exposure matrix, two-route discovery, and progressive Skill constraints remained green.
- Syntax/import, scoped diff/whitespace, and credential-pattern checks remained clean.

No M4 test, fixture, test evidence, audit artifact, or protected Workflow state was read, run, or modified by this implement revision.

## Revision 2 — Legacy Projection And Skill Quality Compatibility

### Input And Boundary

Main-agent validation reported the M4 focused suite `25/25`, with M1 `76/76`, M2 `61/61`, M3 `47/47`, and lifecycle log `7/7`. The remaining full-regression differences were classified as legacy projection and Skill-quality compatibility, not new architecture or retired-test work.

Revision 2 keeps the complete new Registry and runtime availability model authoritative while restoring the old `commandMap()` physical-file contract used by platform generators.

### Corrections

1. `/hw:goal` remains in `CANONICAL_COMMANDS` as `public + unavailable`, retains `commandByCanonical(...)` and router behavior, and remains visible to compatibility diagnostics. It now has `legacy_inventory: false`. Only `commandMap()` filters this entry, so its legacy inventory returns the original 53 commands and every listed Skill path exists. No other unavailable legacy entry is filtered.
2. Root `SKILL.md` adds two narrow diagnostics without restoring the old command manual: `/hw:analysis` is `deferred` and its Child Skill is legacy semantic/diagnostic evidence only; `/hw:knowledge` is `internal` and its legacy Skill is reference material only. Both statements preserve the availability gate and explicitly avoid executable advertising.
3. Guide now states `一次只推荐一个 next path`. Historical phrases `deep Grill-Me`, `Plan long-running or multi-Feature work`, `do not force deep Grill-Me`, and `/hw:docs` are retained only as honest legacy diagnostic vocabulary and are explicitly forbidden as current recommendations/executable routes.
4. Init and Guide restore the canonical `## 输出语言规则` heading with a compact project-over-global `output.language` policy for `zh-CN`/`zh`, `en`, and `auto`. No legacy Init behavior, Setup, Rules, fixed rounds, registry writes, or adapter sync semantics returned.

### Production-Only Validation

- `C21_M4_REVISION2_SMOKE_OK`: confirmed Registry 54 vs legacy inventory 53, Goal canonical/route availability, two-command discovery, all 53 legacy Skill files as regular non-symlink files, Root diagnostics/size, exact Guide compatibility wording, and both canonical language sections.
- A real `writeCursorSkillBundle(...)` run in a self-created `/tmp` project succeeded. This generator reads every `commandMap()` Skill source; it produced neither a Goal Skill nor Goal command and therefore proves the missing planned backend is no longer read through the legacy artifact path.
- `checkSkillQuality({repoRoot})` returned `ok: true`, `0 issues across 45 Skill files`, `53 user-facing commands`, `43 unique user-facing Skill paths`, and one internal Skill.
- `C21_M4_REVISION1_SMOKE_OK`, `C21_M4_PRODUCTION_SMOKES_OK`, `C21_M4_ADVERSARIAL_SMOKES_OK`, and `C21_M4_REGISTRY_SKILL_SMOKE_OK` all remained green after updating the compatibility expectation to 53 legacy entries.
- Root Skill remains well below the routing limit at 105 lines / 7,183 bytes. Init is 75 lines / 4,048 bytes; Guide is 52 lines / 3,299 bytes.

The distinction is intentional: `CANONICAL_COMMANDS` and runtime routing describe current/planned semantics; `commandMap()` remains a backward-compatible physical artifact inventory until Goal has an actual Child Skill backend. Legacy Analysis/Knowledge files are diagnostic references only and do not bypass availability.

No repository test, fixture, test evidence, audit artifact, or protected Workflow state was read, modified, or executed by this implement revision. No CLI, generator, adapter, plugin manifest, package metadata, or unrelated Child Skill was modified. Production generator code was executed only through the isolated `/tmp` smoke described above.

## Revision 3 — Guide Single-Path Compatibility Phrase

Main-agent full regression reached `884/885`; the only remaining compatibility check did not recognize the existing Chinese instruction `一次只推荐一个 next path` as the historical English single-path contract.

The `Recommend one path` section now adds exactly:

```text
Recommend one next path, not a command chain.
```

This is a diagnostic compatibility anchor, not a behavior change. Guide still recommends only currently available routes, and `deep Grill-Me`, `Plan long-running or multi-Feature work`, `do not force deep Grill-Me`, and `/hw:docs` remain non-executable legacy diagnostic vocabulary.

Production-only validation:

- Exact phrase smoke returned `M4_R3_GUIDE_SMOKE_OK` and confirmed the legacy diagnostic restrictions remain present.
- `checkSkillQuality({repoRoot})` remained `0 issues across 45 Skill files`.
- Root Skill remained 105 lines / 7,183 bytes; Guide remained concise at 54 lines / 3,346 bytes.
- Scoped diff and trailing-whitespace checks passed.

No repository test, fixture, test evidence, audit artifact, or protected Workflow state was read, modified, or executed by Revision 3. No repository source or Skill outside `skills/guide/SKILL.md` and this implementation evidence was modified; the production Skill-quality checker performed its normal read-only scan.

## Revision 4 — Init And Read-Boundary Security Closure

### Audit Input And Scope

Independent focused review reported `44 total / 33 pass / 11 fail`; the original 25 focused cases remained green. The 11 failures grouped into four production-boundary defects rather than architecture or schema changes: Init accepted unsupported own fields too loosely, brownfield metadata could project sensitive/hidden labels into persisted facts, Skill backend discovery trusted a symlinked repository-root anchor, and direct legacy inspection did not validate the `.pipeline` directory before optional leaf reads.

Revision 4 changes only the three owning production modules. It does not change the certified M2 Record mapping, the 54-entry Registry, the 53-entry legacy `commandMap()`, the two-route discovery surface, any Skill text, any generator/adapter, or any repository test.

### Corrections

1. `initializeWorkspace(...)` now checks the exact own-field sets for both request and options before secret/hidden-field traversal or normalization. Unknown ordinary, secret-like, hidden-context, symbol, accessor, and non-enumerable fields all fail through one sanitized `ERR_INIT_REQUEST_INVALID` envelope with `Init request contains unsupported fields` or the matching options label. Neither an unknown key nor its value is reflected in the error.
2. Brownfield inspection now gates every repository-relative path component, root/package-derived project-ID candidate, package name, and recursively traversed mapping key from `package.json` before any transaction or `.pipeline` materialization. Secret-like identifiers fail with `ERR_RAW_SECRET_FORBIDDEN`; bounded hidden-context labels (`chain_of_thought`, `hidden_reasoning`, `private_reasoning`, and `scratchpad`) fail with `ERR_HIDDEN_REASONING_FORBIDDEN`. Normalization recognizes dot, underscore, hyphen, whitespace, camel-case, scoped package segments, and repeated file extensions while preserving ordinary names such as `password-policy.md` and `reasoning-summary.md`.
3. Skill backend inspection now `lstat`s the resolved repository root, requires an existing ordinary non-symlink directory, establishes a `realpath` anchor, and then rechecks every path component and the final Skill file for type, symlink use, and containment. A symlinked, missing, or non-directory `repoRoot` therefore yields an unavailable route or empty discovery result without following or disclosing an external target.
4. Direct `inspectLegacyWorkspace(...)` now validates `<root>/.pipeline` before reading any optional evidence leaf. A missing directory fails with `ERR_LEGACY_WORKSPACE_NOT_FOUND`; symlink, non-directory, or containment violations fail with `ERR_LEGACY_EVIDENCE_FORBIDDEN`. This also closes the empty external-directory symlink case without changing the raw read-only leaf contract.

All four gates execute before a workspace transaction can prepare or activate. Rejected cases leave the requested root, external targets, and existing evidence bytes unchanged.

### Production-Only Validation

- `C21_M4_REVISION4_SMOKE_OK`: exact-field rejection and sanitized errors; accepted ordinary metadata names; secret/hidden metadata variants across paths, root labels, package names, and nested package mappings; symlinked router roots; and missing/symlinked/non-directory legacy `.pipeline` roots all passed with zero unexpected writes.
- `C21_M4_ADVERSARIAL_SMOKES_OK`: the complete prior secret, traversal, Clock override, evidence-link, backend-link, and raw-legacy adversarial envelope remained green after updating only the superseded hidden-unknown-field expectation to the generic unsupported-field contract.
- `C21_M4_PRODUCTION_SMOKES_OK`: empty/missing-root/brownfield/no-input/current/mixed/damaged/recovery/router behavior and the M1-M3 manifest, pointer, Runtime, Continuation, Record/index, and Capsule byte-rebuild checks remained green.
- `C21_M4_REVISION1_SMOKE_OK`, `C21_M4_REVISION2_SMOKE_OK`, and `C21_M4_REGISTRY_SKILL_SMOKE_OK` remained green.
- Final runtime inventory check returned `54` Registry entries, `53` legacy `commandMap()` entries, and exactly `2` discoverable commands: `/hw:guide` and `/hw:init`.
- `checkSkillQuality({repoRoot})` returned `0 issues across 45 Skill files`.
- `node --check` passed for Init, commands, legacy inspector, and the Core root export surface.
- Scoped diff, trailing-whitespace, and high-confidence credential-pattern scans reported no findings.

The allowed-field values are still normalized by their declared scalar/function contracts. A nested object supplied where a string is required is rejected before writes without content reflection; no additional general recursive input schema was introduced.

No repository test, fixture, test evidence, audit artifact, or protected Workflow state was read, modified, or executed by Revision 4. Validation used production imports and self-created `/tmp` workspaces only.
