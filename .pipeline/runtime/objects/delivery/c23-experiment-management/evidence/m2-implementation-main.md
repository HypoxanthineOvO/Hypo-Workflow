# C23 M2 Experiment Knowledge Implementation Evidence

- Worker ID: `c23-m2-implementation-main`
- Role: `implement`
- Execution identity: main thread
- Date: 2026-07-18 (Asia/Shanghai)
- Verdict: `GREEN_FOCUSED`
- Workflow Runtime/Continuation advancement: none

## Task Assessment

- Complexity: `material`
- Uncertainty: `medium`
- Oracle strength: `strong`
- Blast radius: `cross_module`
- Reversibility: `reversible`
- Hazards: `authority_duplication`, `stale_knowledge`, `path_escape`, `secret_exposure`
- Semantic routing class: `critical`
- Reason codes: `architecture_authority`, `project_knowledge_integrity`, `semantic_code_mapping`

M2 introduces a new durable knowledge contract rather than a presentation-only helper. The implementation is isolated,
but it binds user-facing semantic answers to Record authority and repository bytes, so the architecture and integrity
hazards make the work critical even with a strong fixture oracle.

## Change Summary

The implementation adds a project-scoped Experiment Knowledge Store with four typed fact classes:
`principle`, `metric`, `module`, and `optimization`.

Each fact is persisted as one existing manifest-format Markdown Record. The fact key is the Record dedupe key suffix,
updates require an explicit `supersedes` edge, and historical Records remain readable. Record indexes remain derived;
the Store does not create a second knowledge authority or write legacy `.pipeline/knowledge` state.

The public Store exposes:

- `recordFact`: validates provenance, secrets, project/fact identity, exact code bytes, symlink/path safety, and commits
  one typed fact plus a rebuilt derived Record index.
- `list`: reads only the selected project's Record decision directory, marks active versus superseded history, and
  reports per-fact freshness.
- `resolve`: performs deterministic project-scoped candidate retrieval over fact keys, titles, aliases, summaries, and
  structured details. It returns structured facts and code locators for the host AI to interpret.
- `assessFreshness`: reads only registered code paths, compares their current SHA-256 with the fact binding, and reports
  missing or changed sources with the owning fact and semantic locator.

The NeRF fixture can therefore map an instruction about “RE acceleration” or “sampling acceleration” to occupancy-guided
ray marching even though neither the file nor symbol contains `sample`. Metric facts preserve meaning, unit, direction,
and comparison constraints. AceSim facts distinguish simulated metrics from host-resource metrics and locate the GPU
profile/configuration module.

## Modified Production Files

- `core/src/experiment/knowledge.js`
- `core/src/index.js`

The implementation identity did not create or edit M2 tests, fixtures, catalog entries, Hook files, Runtime,
Continuation, plugin metadata, cachebusters, or frozen legacy authority files.

## Test Design And Validation

Independent M2 contract after implementation:

- `node core/test/c23-m2-experiment-knowledge.test.js`: `11/11` PASS.
- Covers one-fact-per-Record, four fact types, NeRF semantic code mapping, metric meaning, AceSim mapping, digest-change and
  missing-file staleness, explicit supersedes/history, project isolation, and zero-write boundary rejection.

Shared regression checks:

- `node core/test/record-store.test.js`: `13/13` PASS.
- `node core/test/workspace-transaction.test.js`: `19/19` PASS.
- C23 M1 focused suites: `21/21` PASS.
- `secret-ref-projection.test.js` and `authority-nonduplication.test.js`: PASS.
- `node --check` for the new module and Core export: PASS.
- maintained catalog dry-run: valid, `54` selected, M2 included.
- `git diff --check`: PASS.

## Expected Result

An AI can retrieve a compact structured answer for a known project concept without scanning the repository, see what a
metric means and when it is comparable, locate semantically related code even when names differ, and know immediately
when a registered code binding has become stale. Knowledge changes remain explicit and reversible through Record
supersession rather than silent overwrite.

## Problems Encountered

The first production run passed `10/11`. The remaining boundary test correctly showed that a well-formed but incorrect
SHA-256 and a symlink source were accepted until freshness evaluation. The implementation was tightened so new facts
must bind the current regular-file bytes before any authority write; later file changes still become stale as intended.
The rerun passed `11/11`.

## Residual Risks / Follow-up

- `recordFact` commits the authoritative Record and rebuilds its derived index in two individually recoverable
  transactions, matching the existing Maintain pattern. A crash can leave a stale derived global Record index, but the
  fact authority remains intact and M2 project reads do not rely on that index. M5 should materialize restart-safe status
  projections explicitly.
- External paper/document version strings are durable provenance supplied by the caller; M2 does not fetch or validate
  remote content.
- `resolve` is deterministic candidate retrieval, not an autonomous semantic truth oracle. The host AI must explain and
  compare returned facts, and stale bindings must remain visible in its answer.
- Source freshness hashes whole registered files. More granular symbol hashes can be added later if a real pilot shows
  excessive staleness from unrelated edits in large files.

## Independent Audit Remediation

The first independent M2 audit remained `RED` after the initial `11/11` GREEN suite and identified four missing
authority boundaries:

1. exact replay of an already-superseded Record returned `active: true` even though history marked it inactive;
2. the project reader did not validate missing, cross-dedupe, cyclic, or multiple-active-leaf supersedes graphs;
3. nested forbidden-reasoning keys could be hidden inside the JSON body before the generic Record validator saw them;
4. Workflow-owned `.pipeline/**` files could be registered as experiment code sources.

Production remediation now resolves a committed/deduplicated Record back through project authority before returning its
active state, validates the complete per-project Knowledge supersedes graph before any list/resolve/freshness result,
checks forbidden-reasoning fields before JSON serialization, and rejects every `.pipeline/**` or `.git/**` code binding.
The independent test worker owns the corresponding maintained regressions; the initial audit report remains preserved
as RED evidence and requires a fresh independent reaudit.

Fresh reaudit then identified one more full-history integrity gap: active-only reads calculated the metadata graph and
skipped inactive Records before parsing their bodies. A content-valid Git merge could therefore leave a malformed
inactive Knowledge body or mismatched provenance hidden from `list`, `resolve`, and `assessFreshness`. The reader now
parses and validates every candidate Knowledge Record before deriving the active view, and it requires frontmatter
source references to equal the structured fact provenance. The independent test contract is now `14/14`; its full
M2/Record/transaction/M1 retest is `67/67` GREEN.
