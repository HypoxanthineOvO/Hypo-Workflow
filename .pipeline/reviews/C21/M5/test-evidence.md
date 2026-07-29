# C21-M5 Test Evidence: Reference Bootstrap And Schema Activation

## Verdict

- Worker: `/root/m5_test`
- Role: strict independent `test`
- Test revision: `3`
- Verdict: `RED_READY`
- Focused RED: `24 total / 3 pass / 3 fail / 18 skip`
- Full regression RED: `928 total / 907 pass / 3 fail / 18 skip`
- Compatibility: M1 `76/76`, M2 `61/61`, M3 `47/47`, M4 `44/44`
- Failure classification: exactly three missing-API publication gates covering nine new M5 APIs; no syntax, fixture, baseline, dependency, environment, or unrelated assertion failure

The tests define an internal Bootstrap Job, not a generic migration product. They require proposal-only
Extractor/Curator/Auditor roles, a deterministic single writer, manifest-last activation, a delivery-shaped
C21 checkpoint, immutable legacy authority, and fresh-process restoration from a valid Recovery Pack.

## Test Revision 1

Revision 1 corrects only the staged continuation route. The initial fixture assigned the wrong later-stage
capability set to C21-M6. The authoritative M6 prompt defines M6 as Goal/Cycle Delivery Core with Adaptive Plan.
Ambient Maintain and the Codex Hook adapter belong to M7.

The exact restored continuation now states that M5 finishes bootstrap validation and M6 starts Goal/Cycle
Delivery Core with Adaptive Plan. The proposed current-C21 Record and its source document carry the same route.
The fresh-process contract remains M5 -> M6 and still rejects stale legacy M4 state. No API shape, behavior
coverage, fixture privacy boundary, production file, or Workflow authority changed.

Revision 1 validation:

- focused M5: `24 total / 3 pass / 3 fail / 18 skip`;
- full regression: `928 total / 907 pass / 3 fail / 18 skip`;
- M1 `76/76`, M2 `61/61`, M3 `47/47`, M4 `44/44`;
- syntax, JSON, diff, trailing-whitespace, credential, unfinished-marker, and route-consistency checks passed.

## Test Revision 2

Revision 2 closes HIGH-01 in the post-activation single-writer scenario. The production pending gate now
correctly blocks new Record authority until Bootstrap activation receives explicit strict acceptance. The test
therefore saves the activation result, proves all 22 legacy writer families are frozen, then calls
`acceptBootstrapActivation(...)` with the activation rollback checkpoint and its checkpoint Snapshot evidence.

The `beforeNewWrite` tree snapshot is deliberately captured after acceptance. This keeps acceptance-owned
runtime changes outside the later Record/index diff, whose original contract remains unchanged: the new writer
may change only `.pipeline/memory/**`, while legacy state/cycle/log bytes and mtimes remain exact.

Revision 2 validation:

```bash
node --test core/test/new-format-single-writer.test.js
```

Result: `10 total / 10 pass / 0 fail / 0 skip`.

## Test Revision 3: Shared Reference Fixture Progress

Revision 3 closes the shared fixture failure exposed by the stricter Bootstrap source inventory. The redacted
legacy fixture omitted `.pipeline/PROGRESS.md`, so staging correctly failed closed before activation. The same
missing fixture caused all 13 failures in the prior M5/full runs; it was fixture drift rather than a production
or transaction defect.

The fixture now includes a minimal portable `legacy-pipeline/PROGRESS.md` that describes only synthetic C21-M4
verification, pending C21-M5 Bootstrap, and new Runtime/Pack restoration. Existing recursive fixture copy already
maps `legacy-pipeline` to temporary `.pipeline`, so the helper was not changed. The fixed inventory assertion now
includes `legacy-pipeline/PROGRESS.md`, and the clone test reads the copied `.pipeline/PROGRESS.md` directly.

The strict rollback checkpoint binds legacy file metadata. For the cross-completion-order determinism scenario,
the test assigns the same synthetic mtime to the two copies of `PROGRESS.md`, `state.yaml`, `cycle.yaml`, and
`log.yaml` before comparing stage bytes/hash. This keeps the fixture metadata deterministic without weakening
source-drift, rollback, redaction, or legacy byte/mtime preservation checks.

Revision 3 validation:

```bash
node --test \
  core/test/bootstrap-migration.test.js \
  core/test/bootstrap-activation.test.js \
  core/test/new-format-single-writer.test.js \
  core/test/record-store.test.js \
  core/test/recovery-pack.test.js
```

Result: `64 total / 64 pass / 0 fail / 0 skip`.

```bash
node --test \
  core/test/bootstrap-activation.test.js \
  core/test/new-format-single-writer.test.js
```

Result: `21 total / 21 pass / 0 fail / 0 skip`. The individual single-writer suite is `10/10`.

Syntax checks passed for all three M5 tests and the fixture helper; `fixture.json`, `git diff --check`, scoped
trailing-whitespace, credential/absolute-path, unfinished-marker, and focused-only scans all passed. Per task
boundary, acceptance Revision 2 tests and the complete Core suite were not run by this worker.

## Authorized Scope

Changed only:

- `core/test/bootstrap-migration.test.js`
- `core/test/bootstrap-activation.test.js`
- `core/test/new-format-single-writer.test.js`
- `core/test/fixtures/c21-m5/**`
- `.pipeline/reviews/C21/M5/test-evidence.md`

No production implementation, M1-M4 test/fixture, Skill, package/config, live `.pipeline` authority/runtime/
Record, implementation/audit evidence, report, or protected Workflow file was modified. No dependency was
installed, no network or remote operation ran, and no cleanup/reset/revert/destructive repository command ran.

## Public API Handoff

M5 extends `core/src/migration/index.js` and the Core root barrel with nine explicit APIs. This is a code API
for an internal Job; it must not create `/hw:migrate` or `/hw:bootstrap`.

### Proposal Topology

1. `createBootstrapProposal(input)`
   - Input: `{ bootstrap_job_ref, worker: { role: "extractor", id }, candidates }`.
   - Each candidate carries `key`, `source_class`, `future_decision_risk`, `current`, `reviewed`, `support`,
     digest-bound `sources`, candidate-key `supersedes`, and either a proposed `record_patch` or `null`.
   - Output: canonical `authority_role: "proposal"`, `proposal_kind: "bootstrap_extraction"`, sorted
     `included`, sanitized `excluded`, and a 64-hex `semantic_hash`.
   - Caller-supplied Record `id`/`record_id` is forbidden. Excluded raw/private classes do not retain payload.

2. `mergeBootstrapProposals(proposals)`
   - Accepts only validated extraction proposals.
   - Deduplicates duplicate worker delivery and returns the same bytes/hash for every completion order.
   - Output remains `authority_role: "proposal"`, `proposal_kind: "bootstrap_merge"`.

3. `curateBootstrapProposals(merged, { worker: { role: "curator", id } })`
   - Preserves superseded candidate history, resolves candidate-key supersedes relationships, and selects
     exactly one active leaf per `dedupe_key`.
   - Output remains `authority_role: "proposal"`, `proposal_kind: "bootstrap_curation"`, with sorted
     `records`, `active_by_dedupe_key`, and `semantic_hash`.
   - Multiple active leaves, a non-proposal input, or a non-Curator worker fail closed.

4. `auditBootstrapProposal(root, curation, { worker: { role: "auditor", id } })`
   - Reads real repository-relative sources, verifies existence and digest drift, and checks unsupported
     inference, Record schema, raw secret/sensitive data, and hidden context.
   - Output remains `authority_role: "proposal"`, `proposal_kind: "bootstrap_audit"`, with `status`,
     `curation_hash`, sanitized `findings`, and `semantic_hash`.
   - Rejected values are never echoed. The operation is read-only. A non-Auditor worker fails closed.

### Deterministic Writer And Cutover

5. `stageBootstrapWorkspace(root, input, { id })`
   - Requires matching approved curation/audit proposals and revalidates their source digests.
   - Input binds manifest identity, C21 Delivery Runtime/Continuation, a delivery-shaped checkpoint contract,
     and fixed Recovery worktree evidence.
   - The deterministic writer alone allocates Record IDs, compiles supersedes IDs, validates schema/dedupe,
     builds indexes/Capsule/Pack/Snapshot, and writes real staging under
     `.pipeline/runtime/migrations/<bootstrap-job>/`.
   - Output has `status: "staged"`, `bootstrap_job_ref`, canonical `write_set`, compiled `records`, and
     `semantic_hash`. It is portable and byte-identical across clone roots and worker completion order.

6. `activateBootstrapWorkspace(root, stage, { id, faultInjector? })`
   - Revalidates source/audit/stage binding, then uses the M1 transaction with manifest activated last.
   - Output has `status: "activated"`, `transaction_id`, `manifest`, C21 `object_ref`, compiled `records`,
     `pack_ref`, checkpoint `{ path, semantic_hash }`, and a durable `rollback_checkpoint_ref`.

7. `recoverBootstrapActivation(root, { bootstrap_job_ref, transaction_id })`
   - Projects M1 disk-fact recovery as deterministic `rolled_back`, `rolled_forward`, or `finalized` action
     plus Bootstrap `status: "rolled_back" | "activated"`.

8. `rollbackBootstrapActivation(root, { bootstrap_job_ref, checkpoint_ref }, { id })`
   - Is usable after successful activation and before acceptance.
   - Removes only new-format cutover authority needed to return to legacy selection; it must preserve every
     tracked legacy file and legacy bytes/mtime. The successful M1 transaction cleanup cannot erase this
     rollback capability.

9. `restoreBootstrapWorkspace(root, { object_ref, budget_bytes })`
   - Read-only fresh-process resume wrapper over M3 Pack selection/restore plus M2 Runtime/Continuation read.
   - Output has `status: "ready"`, `object_ref`, `runtime`, `continuation`, `selected_pack_ref`,
     `rejected_packs`, and `next_action`.
   - It must select the latest valid Pack, report corrupt candidates, and never consult raw transcript or
     frozen legacy state for the current step.

## Executable Data Contract

The fixed fixture is synthetic and lives under `core/test/fixtures/c21-m5/reference-workspace/`; it is not a
copy of the live `.pipeline`. Its `legacy-pipeline/state.yaml` intentionally points to stale C21-M4, while the
new Delivery input points to M5 with M6 Goal/Cycle Delivery Core and Adaptive Plan as the next Milestone. Its
seven reviewed source facts cover:

- active requirement;
- accepted outcome;
- current and superseded architecture decisions;
- cross-Cycle constraint;
- important feedback/failure;
- full current C21 context.

The executable selection rubric also supplies `raw_chat`, `full_tool_log`, `duplicate_report`,
`obsolete_intermediate_state`, and `private_live_data` candidate classes and requires all five to be excluded.
Only candidates whose absence could materially change a future decision become proposed Records.

The checkpoint is deliberately shaped as C21 Main Delivery:

```text
object_ref: { kind: delivery, id: c21 }
object_type: cycle
snapshot_kind/state: checkpoint
```

It does not use `bootstrap_job` as a fake accepted Delivery. This reuses the certified M2 Snapshot contract.
After activation, `runtime/active.yaml` points only to the C21 Delivery object; the completed Bootstrap Job is
not the Main Delivery.

## Coverage Matrix

| Requirement | Executable evidence |
|---|---|
| Internal Job, no public migration command | All three namespaces of `migrate` plus `bootstrap` route to `unknown`; command inventory has no such canonical route |
| Proposal-only workers | Extractor, merge, Curator, and Auditor outputs all declare proposal authority; direct `commitRecordPatch` attempts reject without writes; wrong worker roles reject |
| Bounded history selection | Seven required source classes include; five raw/redundant/obsolete/private classes exclude through returned rubric decisions |
| Deterministic merge and writer | Reversed worker completion, duplicate delivery, and two clone roots produce deep/byte/hash-identical merge and staging outputs |
| Supersedes and active leaf | Earlier architecture decision remains; current decision explicitly supersedes it; conflict with two active leaves rejects |
| Auditor gates | Real-file approved case plus missing source, source drift, unsupported inference, generated secret, and hidden-context cases; errors are sanitized and zero-write |
| Writer ownership | Caller Record IDs reject; activated IDs are content-derived; seven Records, six dedupe leaves, schema hashes, indexes, and supersedes IDs are checked on disk |
| Complete activation | Reads actual manifest, active pointer, Runtime, Continuation, Records/index, Capsule, Pack, and checkpoint Snapshot after one manifest-last cutover |
| Activation interruption | Injects `after_prepare`, first `after_install_file`, `before_manifest_activation`, and `after_manifest_activation`; expects rollback, rollback, roll-forward, finalize respectively |
| Exclusive Bootstrap | A prepared transaction blocks a second stage before any second write and requires recovery |
| Stage-to-activate drift | A source changed after deterministic staging rejects activation before manifest/write |
| Legacy freeze and no dual write | Legacy state/cycle/log bytes plus nanosecond mtime remain exact through stage, activation, recovery, later new Record/index writes, rollback, and fresh restore; all 22 legacy writer families reject |
| Rollback checkpoint | Successful activation exposes a checkpoint usable before acceptance; rollback restores legacy selection and does not delete tracked legacy files |
| Fresh restore | A real `spawnSync(process.execPath, --eval)` process imports only the migration API, rejects a corrupt Pack head, restores C21 M5/M6 and exact next action, and performs zero writes |
| Transcript independence | Fresh process receives no transcript input; returned JSON excludes stale M4 state, corrupt bytes, transcript/raw-chat/tool-log fields |
| Fixture safety | Exact allowlisted files, no repository `.pipeline` copy, no machine-local path, credential pattern, raw chat/tool log, hidden reasoning, or private live data; independent clones hash-identical |
| Future scope exclusion | No M6 Goal/Cycle Delivery Core, Adaptive Plan, public migration command, tracked-file deletion, generic repository migration, or later-Milestone behavior is required |

M7 owns ambient Maintain and the Codex Hook adapter; both remain outside the M5 contract.

## RED Results

Focused command:

```bash
node --test \
  core/test/bootstrap-migration.test.js \
  core/test/bootstrap-activation.test.js \
  core/test/new-format-single-writer.test.js
```

Result: expected exit `1`; `24 total / 3 pass / 3 fail / 18 skip`.

Per-file registration:

- `bootstrap-migration.test.js`: `10 total / 1 pass / 1 fail / 8 skip`.
- `bootstrap-activation.test.js`: `7 total / 0 pass / 1 fail / 6 skip`.
- `new-format-single-writer.test.js`: `7 total / 2 pass / 1 fail / 4 skip`.

The three exact failure families are:

1. proposal publication gate: `createBootstrapProposal`, `mergeBootstrapProposals`,
   `curateBootstrapProposals`, and `auditBootstrapProposal` are absent from migration/Core root;
2. deterministic writer publication gate: `stageBootstrapWorkspace` is absent from migration/Core root;
3. cutover publication gate: `activateBootstrapWorkspace`, `recoverBootstrapActivation`,
   `rollbackBootstrapActivation`, and `restoreBootstrapWorkspace` are absent from migration/Core root.

The three current PASS cases are intentional non-production guards: no public migrate/bootstrap route, fixed
fixture redaction/bounds, and cross-clone fixture byte identity. Behavior tests skip behind the aggregate API
gates so the initial RED is stable rather than a cascade of `undefined is not a function` failures.

Full command:

```bash
npm test
```

Result: expected exit `1`; `928 total / 907 pass / 3 fail / 18 skip`. M4 ended with `904/904`; all 904
existing tests still pass, the three new independent guards pass, and the only failures are the three M5 API
gates above.

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

Result: `76 pass / 0 fail / 0 skip`.

M2:

```bash
node --test \
  core/test/runtime-store.test.js \
  core/test/record-store.test.js \
  core/test/receipt-store.test.js \
  core/test/snapshot-store.test.js \
  core/test/authority-nonduplication.test.js
```

Result: `61 pass / 0 fail / 0 skip`.

M3:

```bash
node --test \
  core/test/recovery-journal.test.js \
  core/test/context-capsule.test.js \
  core/test/recovery-pack.test.js \
  core/test/recovery-faults.test.js
```

Result: `47 pass / 0 fail / 0 skip`.

M4:

```bash
node --test \
  core/test/init-bootstrap.test.js \
  core/test/legacy-workspace-inspection.test.js \
  core/test/root-skill-router.test.js \
  core/test/command-exposure.test.js
```

Result: `44 pass / 0 fail / 0 skip`.

## Syntax, Scope, And Hygiene

- `node --check` passed for all three tests and `core/test/fixtures/c21-m5/helpers.js`.
- `fixture.json` parsed through `JSON.parse`.
- `git diff --check` passed for the existing tracked diff; scoped trailing-whitespace scan across all new tests
  and fixture files returned no matches, covering the untracked files explicitly.
- Scoped credential scan returned no matches for repository absolute paths, local-file URI schemes, common token prefixes,
  AWS access-key shape, or private-key header. The secret Audit case assembles a synthetic value at runtime.
- Scoped unfinished-marker and focused-only scan returned no matches.
- Scoped pseudo-test scan found no production-source reads or source phrase/function-name assertions.
- Scoped status shows only the three authorized tests, `fixtures/c21-m5/`, and this evidence file.

## Pseudo-Test Self-Review

The API publication checks are only stable RED gates; they are not claimed as behavioral proof. The substantive
contracts use:

- real temporary directories and copied synthetic legacy trees;
- real source bytes and SHA-256 drift;
- real proposal/curation/audit calls;
- real staging files and cross-clone tree hashes;
- actual M1 transaction fault callbacks and disk recovery;
- actual M2 Record/index/Runtime/Snapshot readers;
- actual M3 Capsule/Pack validation and restore;
- all 22 real legacy writer fence identifiers;
- a new Node child process for Resume.

No test passes by scanning production source for a function name or expected sentence. Pure proposal arrays are
appropriate only for the deterministic selection/merge contract; they are followed by real filesystem staging,
activation, recovery, and fresh-process tests. The fixture has no live private Record or raw transcript, and no
test reads the repository's active `.pipeline` as migration input.

Residual test-phase limitation: the 18 behavior tests cannot execute until the aggregate APIs exist. The
implement worker must rerun the focused command without skips, then run full regression and all four compatibility
suites. The rollback checkpoint is intentionally a material implementation obligation rather than a mocked M1
marker: a successful M1 transaction removes its private marker, so M5 must retain its own audited pre-acceptance
rollback evidence.

## Changed Files

- 3 test files listed above.
- `core/test/fixtures/c21-m5/helpers.js`.
- 13 files under `core/test/fixtures/c21-m5/reference-workspace/`: fixture metadata, README, four frozen
  legacy context/authority files, and seven reviewed synthetic source documents.
- This evidence file.
