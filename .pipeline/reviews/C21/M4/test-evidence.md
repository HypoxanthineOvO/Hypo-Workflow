# C21-M4 Test Evidence

## Verdict

- Role: independent `test`
- Status: `TEST_REVISION_3_READY`
- Recorded at: `2026-07-12T06:13:02+08:00`
- Test revision: `3`
- Focused current result: `44 total / 44 pass / 0 fail / 0 skip`
- Certified compatibility: M1 `76/76`, M2 `61/61`, M3 `47/47`

Revision 3 aligns two basename fixtures with the bounded adoption scanner's actual collection scope.
All metadata that can enter facts, source refs, Records, indexes, Capsules, or returns remains gated;
metadata outside the bounded scan is proven absent from those surfaces rather than turning Init into
an unrelated full-repository secret crawler. All 44 focused cases now pass with no skips.

## Public API And Data-Shape Handoff

### Init

Focused module and Core root export:

```js
initializeWorkspace(root, request = {}, options = {})
```

Accepted request fields:

```js
{
  intent?: string,
  project_id?: string,
  workspace_id?: string,
}
```

Accepted options follow the M1 transaction seam:

```js
{
  id?: string,
  faultInjector?: async ({ phase, index?, path? }) => void,
}
```

Successful initialization returns the following stable projection. Extra non-authoritative fields
are allowed, but these fields and meanings are required:

```js
{
  status: "initialized",
  classification: "empty" | "unmanaged_brownfield",
  manifest: ValidWorkspaceManifest,
  bootstrap: {
    object_ref: { kind: "bootstrap_job", id: SafeId },
    runtime_path: RepoRelativePath,
    continuation_path: RepoRelativePath,
    capsule_path: RepoRelativePath,
  },
  records: [{ id: RecordId, kind: RecordKind, path: RepoRelativePath }],
  adoption_brief: {
    record_id: RecordId,
    facts: [{
      statement: string,
      basis: "observed" | "inferred",
      confidence: "low" | "medium" | "high" | "confirmed" | number,
      source_refs: [{ type: string, ref: string, locator: RepoRelativePath }],
    }],
  },
  initial_snapshot: null,
}
```

M4 semantic subtypes do not expand the certified M2 `RECORD_KINDS` authority:

```js
ProjectIntentRecord.attributes = {
  kind: "requirement",
  dedupe_key: "project_intent",
}

AdoptionBriefRecord.attributes = {
  kind: "decision",
  dedupe_key: "adoption_brief",
}
```

`result.records[*].kind` is the persisted M2 `attributes.kind`; it is never a synthetic subtype.
The Project Intent body contains the supplied intent. `result.adoption_brief.record_id` points
exactly to the `decision + adoption_brief` Record, whose body contains every returned fact.

`initial_snapshot` is explicitly `null` during M4 bootstrap. The certified M2 Snapshot contract
accepts a Goal or Cycle delivery object, not a `bootstrap_job`; Init must not manufacture an invalid
Snapshot before a delivery checkpoint exists.

No-input result:

```js
{
  status: "needs_input",
  classification: WorkspaceClassification,
  ask: {
    kind: "question",
    id: "init_outcome",
    prompt: string,
    required: true,
  },
}
```

Current-workspace results are `already_initialized` or
`already_initialized_with_legacy_residue`. Legacy is `legacy_detected` with the inspector result.
A damaged manifest throws `ERR_INIT_WORKSPACE_DAMAGED` with repair guidance. None of those paths may
fall back to a legacy writer.

### Legacy Inspector

Focused internal export:

```js
inspectLegacyWorkspace(root)
```

Result shape:

```js
{
  classification: "legacy",
  read_only: true,
  sources: [{
    kind: "state" | "cycle" | "config" | "continuation" | "log",
    path: RepoRelativePath,
    sha256: HexDigest,
    document?: RawParsedDocument,
    status?: "unreadable",
    error?: { code: "ERR_LEGACY_..." },
  }],
  summary: {
    current_phase?: string,
    active_cycle?: number,
    safe_resume_command?: string,
    log_events: number,
  },
}
```

`document` is the parsed file as present. It must not be passed through `loadConfig()` or enriched
with defaults. Malformed evidence is reported as `unreadable`; symlinked evidence is rejected.

### Compatibility Router And Discovery

Command module and Core root exports:

```js
resolveCommandRoute(input, { repoRoot } = {})
discoverableCommandMap(platform = "codex", { repoRoot } = {})
```

Every `CANONICAL_COMMANDS` entry declares:

```js
{
  exposure: "public" | "contextual" | "internal" | "deferred" | "removed",
  availability: "available" | "unavailable",
  availability_reason?: string,
}
```

At the M4 bootstrap boundary, only `/hw:guide` and `/hw:init` are `public + available`. The router
normalizes `/hw:*`, `/hypo-workflow:*`, and `$hypo-workflow:*` compatibility input and returns one of
`available`, `unknown`, `removed`, `deferred`, `internal`, or `unavailable`. Non-available results
must contain a concrete user-facing `message`, must not claim execution, and perform zero writes.

`discoverableCommandMap()` is the generator-facing filtered API. Legacy `commandMap()` may remain a
compatibility inventory, but platform discovery must not consume it as an unfiltered capability
list. Discovery also re-checks that the projected child Skill exists under `repoRoot`.

## Test Matrix

| Contract | Real evidence |
| --- | --- |
| Empty repo with intent | Runs Init in a real temp directory; validates manifest, reference-only active pointer, bootstrap Runtime/Continuation, `requirement + project_intent`, `decision + adoption_brief`, derived Capsule, and absence of legacy authority |
| Brownfield adoption | Copies a real Node/Express fixture; requires source files and mtimes unchanged; every fact has basis, confidence, existing repo-relative source refs, and persisted Record text |
| Brownfield metadata preflight | Dynamically creates a secret-like `src/` basename, hidden-reasoning `src/` basename, and hidden-reasoning package key inside actual scan scope; each must reject before transaction/path/write with sanitized errors and byte/mtime identity |
| Unknown request metadata | Dynamically creates sensitive and ordinary unknown request keys; both reject schema input without echoing key/value or changing disk |
| Metadata overblocking control | Legal `src/password-policy.md` and `src/reasoning-summary.md` initialize; adversarial-like `notes/` metadata outside scan scope is absent from return, Records, index, and Capsule |
| Unsupported inference | Adoption Record must not claim Next.js, Python, Django, PostgreSQL, monorepo, or Kubernetes without fixture evidence |
| No-input Init | Requires a concrete `init_outcome` Ask and byte-identical zero-write tree; rejects `min_rounds` and false completion |
| Repeated current | Reopens the first manifest, returns `already_initialized`, and keeps the full file/mtime snapshot identical |
| Damaged current | Invalid manifest rejects with `ERR_INIT_WORKSPACE_DAMAGED`, repair guidance, and zero writes |
| Mixed current + residue | Returns explicit mixed status and preserves both new authority and legacy residue byte-for-byte |
| M1 transaction fault | Injects `after_prepare`, proves no manifest activation, observes the prepared marker, and recovers to an empty file tree |
| Traversal/secret/reasoning | Rejects unsafe IDs, secret-like intent, and hidden-reasoning fields before authority creation; sensitive input is not echoed |
| Symlink escape | Symlinked `.pipeline` rejects while both root link and external sentinel remain unchanged |
| Old Setup/registry/adapter calls | Executes Init in an isolated child process with a temporary HOME; HOME, adapter roots, and legacy authority stay empty |
| Legacy inspection | Parses fixture state/cycle/config/continuation/log as raw documents and compares the complete tree bytes plus nanosecond mtimes |
| Malformed/symlinked legacy evidence | Reports malformed YAML without defaults and rejects a symlinked state file without external mutation |
| Legacy ancestor trust | Direct inspector rejects `.pipeline` when the ancestor itself is a symlink to empty or populated external storage; both trees remain unchanged |
| Legacy compatibility controls | Ordinary legacy, missing optional leaves, malformed leaves, and leaf symlinks retain their established outcomes |
| Compatibility router | Resolves actual aliases against a temporary Root/Init/Guide Skill bundle and returns focused child paths, not embedded manuals |
| Honest unavailable routes | Unknown, removed, deferred, internal, and future routes return explicit zero-write results |
| Backend drift | Removing projected Guide Skill makes resolver/discovery return unavailable while Init remains discoverable |
| Root trust anchor | A symlink passed as `repoRoot` makes resolver unavailable and discovery advertise neither Guide nor Init, without target-path disclosure or writes |
| Router compatibility controls | Ordinary root remains available; missing backend, child directory/file symlinks, and near-prefix directories remain unavailable while Init stays discoverable |
| Exposure taxonomy | Every registry entry has an allowed exposure and availability; selected confirmed/future/internal/deferred/removed routes have exact classifications |
| Root progressive disclosure | Resolver behavior is primary; a secondary scale guard requires Root Skill at most 18,000 bytes / 320 lines |

## Fixtures

- `core/test/fixtures/c21-m4/brownfield/`: package metadata, README, real source entry point,
  and test file. There is deliberately no evidence for the unsupported technologies asserted
  against in the test.
- `core/test/fixtures/c21-m4/legacy/`: five necessary legacy authority/evidence files and a README.
  The config contains only `output.language` so default filling is observable.
- `core/test/fixtures/c21-m4/helpers.js`: isolated temp directories, timestamp-preserving fixture
  copy, byte/hash/mtime/symlink tree snapshots, and temporary Skill-bundle projection.

## Initial Focused RED

This is the historical pre-implementation result retained for provenance.

Command:

```bash
node --test \
  core/test/init-bootstrap.test.js \
  core/test/legacy-workspace-inspection.test.js \
  core/test/root-skill-router.test.js \
  core/test/command-exposure.test.js
```

Result: exit `1`; `25 total / 0 pass / 7 fail / 18 skip`.

Failure clusters:

1. `core/src/init/index.js` is missing and `initializeWorkspace` is not a Core root export.
2. `core/src/migration/legacy-inspector.js` is missing.
3. `resolveCommandRoute` is missing from command module/Core root.
4. `discoverableCommandMap` is missing from command module/Core root.
5. Existing registry entries have no exposure or availability metadata.
6. The confirmed bootstrap taxonomy, including future `/hw:goal`, is absent.
7. Root `SKILL.md` is 52,362 bytes, above the secondary 18,000-byte routing limit.

All skips have one of three explicit reasons: the focused Init module is wholly absent, the focused
legacy-inspector module is wholly absent, or the router/discovery API is wholly absent. When an API
appears, its behavior cases automatically execute. Registry metadata and Root Skill assertions are
already executable and RED, so an implementation cannot make the suite pass by adding empty module
stubs alone.

## Test Revision 1

### Trigger

The first implementation run reached `18/25`. Two failures came from test-only assumptions that
used `project_intent` and `adoption_brief` as Record `kind` values. Certified M2 fixes
`RECORD_KINDS` to:

```text
requirement | preference | decision | feedback
```

M4 requires both concepts to be Records but does not authorize an M2 schema expansion. Changing
production to accept new kinds would create architecture drift and weaken cross-milestone authority.

### Correction

- Project Intent is asserted as `kind: requirement`, `dedupe_key: project_intent`, with the exact
  supplied intent present in its body.
- Adoption Brief is asserted as `kind: decision`, `dedupe_key: adoption_brief`.
- `result.adoption_brief.record_id` must resolve exactly to that persisted Adoption Brief Record.
- Every returned Record ref retains `ref.kind === persisted attributes.kind`; no synthetic subtype
  is accepted.
- Empty and brownfield Adoption Brief bodies still contain every returned fact.
- Brownfield source refs, confidence, unsupported-inference rejection, and source bytes/mtime checks
  are unchanged.

This is a contract correction, not a relaxation: semantic identity is now tested through the M2
authority fields that are designed to represent it.

### Current Focused Result

Command:

```bash
node --test \
  core/test/init-bootstrap.test.js \
  core/test/legacy-workspace-inspection.test.js \
  core/test/root-skill-router.test.js \
  core/test/command-exposure.test.js
```

Result: exit `1`; `25 total / 20 pass / 5 fail / 0 skip`.

Both corrected Record behaviors pass. Remaining failures are:

1. Unavailable command entries omit required `availability_reason` (`/hw:start` is the first
   reported entry).
2. Repeated Init returns `already_initialized` but omits the existing manifest from its result
   envelope.
3. Init accepts a symlinked `.pipeline` instead of failing closed before touching an escape path.
4. Legacy inspector correctly rejects the symlink, but its error envelope says `symbolic links`
   while the compatibility assertion accepts `symlink|forbidden|regular file|escape|path`.
5. Unknown-route envelope omits `canonical: null` and returns `undefined`.

These failures do not involve M2 Record kinds, Adoption evidence, or brownfield inference.

### Revision Validation And Scope

- M1 certification: `76/76`.
- M2 certification: `61/61`.
- M3 certification: `47/47`.
- `node --check core/test/init-bootstrap.test.js`: exit `0`.
- `git diff --no-index --check` emitted no whitespace diagnostics for the two authorized files;
  exit `1` is the expected untracked-content difference.
- Scoped trailing-whitespace and credential-pattern scans returned no matches.
- Revision 1 modified only `core/test/init-bootstrap.test.js` and this evidence file.
- No M4 production source, implementation evidence, or audit artifact was read or modified during
  the revision. The only production source inspected was the authorized M2 Record schema.

## Audit-Driven Test Revision 2

### Input Boundary

Revision 2 was implemented from the main-thread audit handoff only. This worker did not read M4
production source, implementation evidence, or the audit report. No production, Skill, protected
Workflow, package, adapter, or lifecycle file was modified.

### Added Contracts

Brownfield metadata preflight now runs three independent `/tmp` cases:

1. A high-entropy secret-like basename assembled at runtime from non-credential fragments.
2. A hidden-reasoning-like basename assembled from separate words.
3. A hidden-reasoning-like `package.json` key and synthetic value assembled at runtime.

Every case requires rejection before a result, transaction, path write, Record/index/Capsule write,
or source mutation. Errors must not contain the generated basename, key, or value. The complete
workspace snapshot binds file bytes, SHA-256, mode, size, symlink target, and nanosecond mtime.

Request schema tests likewise generate a sensitive unknown key and an ordinary unknown key at
runtime. Both must reject without echoing untrusted metadata. A separate positive control adds
ordinary security/reasoning documentation filenames and proves Init still scans and initializes the
brownfield repository without keyword-only overblocking.

Router trust tests create a real temporary Skill bundle and pass a directory symlink to it as
`repoRoot`. Resolver and discovery run as separate leaf tests so one failure cannot hide the other.
The resolver must return unavailable with `writes: []` and no target path; discovery must return an
empty list. Trusted-root controls cover ordinary files, missing Guide, Guide directory symlink,
Guide file symlink, and a `guide-copy` near-prefix directory.

Direct legacy-inspector tests symlink `.pipeline` to both an empty external directory and a populated
external directory containing known, optional, and internal leaves. Both root and external trees
must remain byte/mtime-identical. Ordinary legacy, missing optional leaves, malformed YAML, and a
leaf symlink are retained as positive/fail-closed controls.

### Focused RED

```bash
node --test \
  core/test/init-bootstrap.test.js \
  core/test/legacy-workspace-inspection.test.js \
  core/test/root-skill-router.test.js \
  core/test/command-exposure.test.js
```

Result: exit `1`; `44 total / 33 pass / 11 fail / 0 skip`.

Exact failing-node accounting:

| Cluster | Failing leaves | Aggregate parent | Total failed nodes |
| --- | ---: | ---: | ---: |
| Brownfield metadata accepted instead of preflight rejection | 3 | 1 | 4 |
| Ordinary unknown request key echoed in the schema error | 1 | 1 | 2 |
| Empty external `.pipeline` ancestor symlink accepted | 1 | 1 | 2 |
| Symlinked `repoRoot` accepted by resolver and discovery | 2 | 1 | 3 |
| **Total** | **7** | **4** | **11** |

The sensitive unknown request key already rejects without echo. Populated external `.pipeline`
storage already rejects because evidence resolves outside the workspace. Those controls pass, while
the empty ancestor case proves the trust-anchor check cannot depend on encountering a leaf.

### Preserved Behavior

- Empty and ordinary brownfield Init, Record authority, Adoption facts, no-input Ask, repeated,
  damaged, mixed, transaction recovery, and isolated-HOME cases pass.
- Legal security/reasoning filenames pass without source mutation.
- Legacy ordinary, missing-optional, malformed-leaf, and leaf-symlink cases pass.
- Router ordinary root, missing backend, child directory/file symlink, near-prefix, aliases,
  compatibility statuses, and Root routing scale pass.
- Command exposure and discovery taxonomy pass.
- No test is skipped.

### Revision Validation

- M1 certification: `76/76`.
- M2 certification: `61/61`.
- M3 certification: `47/47`.
- `node --check` passed for all four M4 test files.
- Scoped trailing-whitespace and credential-pattern scans returned no matches.
- No new static fixture was needed; all adversarial metadata and symlink layouts are generated under
  isolated temporary directories.
- Revision 2 changed only the authorized M4 Init, legacy-inspector, Root-router tests and this
  evidence file. `command-exposure.test.js` and existing fixtures remain unchanged.

## Test Revision 3

### Trigger And Contract Correction

After production Revision 4, the focused suite reached `41/44`. The only failing leaves were the
secret-like and hidden-reasoning basenames plus their aggregate parent. Those fixtures placed the
filenames under `notes/`, but M4 deliberately bounds adoption scanning to root allowlisted files and
the `src`, `app`, `lib`, `test`, and `tests` trees.

An unscanned filename cannot enter Adoption facts/source refs, Records, indexes, Capsules, or the
return projection. Requiring rejection for every filename anywhere in the repository would expand
Init into a full-repository secret crawler and would not test the audit finding, which concerns
metadata that can be persisted.

Revision 3 therefore:

- moves the dynamically assembled secret-like and hidden-reasoning basenames from `notes/` to
  `src/`, an actual bounded scan scope;
- retains the package metadata-key case unchanged;
- moves legal near-keyword controls to `src/password-policy.md` and `src/reasoning-summary.md`;
- keeps dynamically generated adversarial-like filenames under unscanned `notes/` and proves they
  are absent from the Init return, every persisted Record, the derived index when present, and the
  Context Capsule;
- retains complete source bytes/mtime preservation.

This is a fixture correction, not a weaker secret gate. Any metadata collected for persistence must
still reject before transaction/path/write with a sanitized error. Metadata outside the collection
boundary is required to remain unobserved and unpersisted.

### Focused Result

```bash
node --test \
  core/test/init-bootstrap.test.js \
  core/test/legacy-workspace-inspection.test.js \
  core/test/root-skill-router.test.js \
  core/test/command-exposure.test.js
```

Result: exit `0`; `44 total / 44 pass / 0 fail / 0 skip`.

The three in-scope metadata cases reject, the two legal `src/` filenames initialize, and the two
unscanned `notes/` basenames do not appear on any tested authority or derived surface.

### Revision Validation

- M1 certification: `76/76`.
- M2 certification: `61/61`.
- M3 certification: `47/47`.
- `node --check core/test/init-bootstrap.test.js`: exit `0`.
- Revision 3 modifies only `core/test/init-bootstrap.test.js` and this evidence file.
- No M4 production source, implementation evidence, audit artifact, other test, or Workflow state
  was read or modified.

## Certified Compatibility

M1:

```bash
node --test \
  core/test/workspace-format.test.js \
  core/test/workspace-transaction.test.js \
  core/test/legacy-write-fence.test.js \
  core/test/yaml-parser-unification.test.js \
  core/test/workflow-commit.test.js
```

Result: exit `0`; `76 pass / 0 fail / 0 skip`.

M2:

```bash
node --test \
  core/test/runtime-store.test.js \
  core/test/record-store.test.js \
  core/test/receipt-store.test.js \
  core/test/snapshot-store.test.js \
  core/test/authority-nonduplication.test.js
```

Result: exit `0`; `61 pass / 0 fail / 0 skip`.

M3:

```bash
node --test \
  core/test/recovery-journal.test.js \
  core/test/context-capsule.test.js \
  core/test/recovery-pack.test.js \
  core/test/recovery-faults.test.js
```

Result: exit `0`; `47 pass / 0 fail / 0 skip`.

## Syntax, Scope, And Hygiene

- `node --check` passed for all four tests and `fixtures/c21-m4/helpers.js`.
- `git diff --no-index --check /dev/null <test>` produced no whitespace diagnostics for each of the
  four new untracked test files; exit `1` is the expected content-difference status.
- Scoped trailing-whitespace scan across all M4 tests and fixtures returned no matches.
- Scoped credential-pattern scan returned no matches. Secret-like test data is synthesized at
  runtime from string fragments and is not a real credential.
- Fixture copy helper was executed independently; hidden legacy `.pipeline` files landed at the
  intended paths rather than under a nested fixture directory.
- Scoped status contains only the four authorized tests, `core/test/fixtures/c21-m4/`, and this
  evidence file.
- No `core/src/**`, Skill, registry, generator, adapter, documentation, package, protected state,
  lifecycle log, PROGRESS, implementation evidence, audit, or completion report was modified.

## Pseudo-Test Rejection And Self-Review

- Root line/byte limits and two child-path text anchors are explicitly secondary guards.
- Primary routing proof invokes `resolveCommandRoute()` and `discoverableCommandMap()` against a
  temporary projected bundle, then removes a child backend and observes the changed result.
- Primary Init proof opens and validates emitted files through certified M1-M3 readers and compares
  real filesystem bytes/mtimes. It does not accept returned success text as initialization proof.
- Legacy zero-write proof snapshots content, mode, symlink target, size, SHA-256, and nanosecond
  mtime for every file before and after inspection.
- Tests do not inspect production implementation source or require a particular internal helper
  decomposition.

## Deliberately Unfixed

- This worker did not add production modules or rewrite existing Skills/registry.
- General migration remains out of scope; Legacy Init only reports evidence.
- Experiment project management remains deferred.
- Platform adapter redesign remains deferred; the discovery API is tested as a platform-neutral
  projection boundary without changing any adapter.
