# Primary Audit 02

## Scope

- Rule: normalized path sort, zero-based index `% 10 == 2`.
- Executable files: 18/18 assigned files.
- Top-level cases: 94 after expanding the two `phase` cases and three malformed-lineage cases in `c23-m1-recovery-remediation.test.js`.
- Scenario entries: 8/8 assigned catalog entries.
- Read-only production/test audit. This report is the only file written.

### Covered executable files

1. `core/test/analysis-command-entry.test.js` (5)
2. `core/test/authority-nonduplication.test.js` (2)
3. `core/test/c23-m1-recovery-remediation.test.js` (5)
4. `core/test/claude-adapter-config.test.js` (5)
5. `core/test/codex-hook-process.test.js` (2)
6. `core/test/context-capsule.test.js` (8)
7. `core/test/deep-plan-real-scenario.test.js` (2)
8. `core/test/explain-contract.test.js` (7)
9. `core/test/global-knowledge-index.test.js` (3)
10. `core/test/knowledge-ledger.test.js` (9)
11. `core/test/maintenance-backfill.test.js` (3)
12. `core/test/notion-project-home-dry-run.test.js` (4)
13. `core/test/pr-contract.test.js` (5)
14. `core/test/project-linkage-e2e.test.js` (2)
15. `core/test/recovery-journal.test.js` (12)
16. `core/test/rules-capture-habits.test.js` (5)
17. `core/test/snapshot-store.test.js` (9)
18. `core/test/workflow-commit.test.js` (6)

### Covered Scenario paths

1. `tests/scenarios/c21/s72-cycle-delivery`
2. `tests/scenarios/v0/s04-skip-step`
3. `tests/scenarios/v11/s68-rejection-rework-blocked-runtime-loop`
4. `tests/scenarios/v5/s18-template-library`
5. `tests/scenarios/v6/s28-log-filters`
6. `tests/scenarios/v8.2/s38-patch-fix-flow`
7. `tests/scenarios/v8.3/s48-i18n-templates`
8. `tests/scenarios/v9/s58-opencode-full-v84-parity`

## Case Audit

Legend: `contract` = stable product/protocol constant; `fixture` = input-derived example; `incidental` = repository datum, implementation detail, exact prose, or count. Sensitivity is to a valid change that preserves the stated contract.

### analysis-command-entry.test.js (catalog: quarantined)

| Item | Contract | Hardcode | Valid-change sensitivity | Failure appropriate | Verdict | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| canonical/OpenCode entry | Analysis route is discoverable and generated | `/hw:analysis` is contract; repeated doc paths/prose are incidental | High: docs may reorganize without route loss | Mixed; registry/generation failure is valid, prose/path failure is not | split | L16-40 reads four docs and applies the same path regex to all |
| investigation semantics | Analysis keeps hypothesis/experiment evidence separate from chat | mode words are contract; English/Chinese phrases and ledger filename regex are incidental | High under copy or layout changes | Only semantic loss should fail | rewrite | L43-67 scans whole Markdown for loose words and negative phrases |
| status/report summary | Compact state plus ledger pointer, no full hypotheses in state | field names are protocol; source function names are implementation | Medium | Source-symbol rename is not a contract break | split | L70-94 checks `buildAnalysisStateSummary` text in source |
| debug promotion | Sustained debug can route into Analysis | exact vocabulary is incidental | High | Loose word absence does not prove routing break | rewrite | L97-105 only regex-scans two documents |
| generated command/metadata | Generator emits command metadata and interaction mode | paths/keys are contract; heading prose is incidental | Low-medium | Mostly localized and appropriate | keep | L108-129 executes `writeOpenCodeArtifacts` in temp root |

### authority-nonduplication.test.js (catalog: maintained)

| Item | Contract | Hardcode | Valid-change sensitivity | Failure appropriate | Verdict | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| root exports | Public M2 object APIs are available from explicit modules/root | exported names are public API contract | Medium if API intentionally evolves | Appropriate when compatibility contract changes | keep | L15-61 imports root/runtime/records/receipts/snapshots and checks functions |
| emitted authority separation | pointer/runtime/Record/Receipt/Snapshot each own distinct data; legacy untouched | sentinel values are fixture-derived; exact global occurrence counts are brittle implementation expectations | Medium: adding a legitimate projection or metadata mention can fail counts | Mostly valid, but count failure can overreach | probe | L162-208 checks both parsed roles and `countOccurrences(allText, ...) === 1/2` |

### c23-m1-recovery-remediation.test.js (catalog: maintained)

| Item | Contract | Hardcode | Valid-change sensitivity | Failure appropriate | Verdict | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| recovery retry: after_prepare | Recovery-of-recovery is retryable, cleans descendants, consumes Receipt, is idempotent | C23/M1/AceSim strings are fixture labels; phases are transaction protocol | Low | Appropriate and localized | keep | L19-90 injects phase fault and checks state/tree |
| recovery retry: after_manifest_activation | Same contract after activation fault | same classification | Low | Appropriate | keep | parameterized phase loop L19-90 |
| malformed rerun parent: unknown | Persisted read rejects missing rerun parent | fixture IDs are input; lineage rule is contract | Low | Appropriate | keep | L93-160 mutates persisted attempt graph |
| malformed rerun parent: self | Persisted read rejects self parent | fixture IDs are input | Low | Appropriate | keep | same parameterized corruption path |
| malformed rerun parent: forward | Persisted read rejects forward parent | fixture IDs are input | Low | Appropriate | keep | same parameterized corruption path |

### claude-adapter-config.test.js (catalog: quarantined)

| Item | Contract | Hardcode | Valid-change sensitivity | Failure appropriate | Verdict | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| default Claude config | Config has a usable Claude profile/settings/hooks/roles | exact third-party model names and every default are release-policy data | High for valid model refresh | A model refresh should not break an unrelated adapter-structure test | split | L15-27 pins `deepseek-v4-*` and `mimo-v2.5-pro` |
| profile normalization | developer/standard/strict map to permissions and continuation policy | profile names/policies are contract | Medium when policy intentionally changes | Expected only for policy change | keep | L30-47 |
| role model mapping | explicit role overrides beat pool defaults | sample model strings are fixture-derived | Low | Appropriate | keep | L50-80 expectations derive from supplied pool/override |
| capability declaration | Claude adapter declares commands/hooks/settings/model routing | capability keys are contract; exact value labels can be incidental | Medium | Mostly appropriate | keep | L82-89 |
| schema/docs coverage | Public fields are documented | exact prose (`DeepSeek`, `Mimo`) is incidental | High | Documentation wording/model refresh causes unrelated cascade | rewrite | L92-114 whole-document regex assertions |

### codex-hook-process.test.js (catalog: maintained)

| Item | Contract | Hardcode | Valid-change sensitivity | Failure appropriate | Verdict | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| Hook registration/process schema | Codex registers the intended supported events with command hooks and second-based bounded timeouts | exact `EVENTS` set is a current host contract, not project data | High for intentional Hook addition, but localized | Appropriate: registration contract changed and this one test should be updated | keep | L7-30 parses `hooks/hooks.json`, explicitly excludes Claude event |
| wrapper fail-open output | Wrapper emits exactly one JSON object on stdout, diagnostics on stderr, invalid input fails open | `{}` and stream separation are host protocol contracts | Low | Appropriate security/compatibility failure | keep | L33-46 runs real wrapper with valid/invalid stdin |

### context-capsule.test.js (catalog: maintained)

| Item | Contract | Hardcode | Valid-change sensitivity | Failure appropriate | Verdict | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| API exports | Recovery store exposes Capsule operations | names are public API contract | Medium under deliberate API versioning | Appropriate | keep | L39-43 |
| incremental/full byte equivalence | Same semantic events yield byte-identical Capsule | object IDs/actions are fixture inputs | Low | Appropriate | keep | L46-100 compares parsed and serialized outputs |
| generated sequence/chunk equivalence | Equivalence holds over three deterministic seeds/chunkings | seed/chunks are fixture coverage, not universal truth | Low; algorithms can refactor freely | Appropriate | keep | L103-149; subtests seeds 3/7/11 |
| validated cursor delta | Incremental path need not reread inaccessible prior segments | segment count `4` is implementation-sensitive | Medium if segmentation evolves | Core behavior failure valid; exact segment count may not be | split | L152-217 includes exact Journal segment count |
| bad cursor fail-closed | Tampered and stale-valid-shape cursors reject without writes | mutation magnitudes/IDs are fixture | Low | Appropriate | keep | L220-276; two subtests |
| derived authority boundary | Capsule cannot overwrite Runtime/Continuation/Record/Receipt | schema/authority keys are contract | Low | Appropriate | keep | L278-331 compares authority bytes and forbidden overrides |
| reduction checkpoints | Reducer carries explicit goal/scope/verification/workers, never transcripts | expected strings are seeded inputs | Low | Appropriate | keep | L334-389 derives expected content from seeded events |
| secret/hidden reasoning fail-closed | Sensitive or hidden-reasoning projections reject before persistence | marker strings are seeded probes | Low | Appropriate | keep | L391-438 checks sanitized errors/tree/no residue |

### deep-plan-real-scenario.test.js (catalog: quarantined)

| Item | Contract | Hardcode | Valid-change sensitivity | Failure appropriate | Verdict | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| Deep Plan lifecycle | ask/research/map/drill/readiness/convert preserves evidence and explicit ordinary-Plan handoff | C12, FQ IDs, exact plan-context headings and command string are historical fixture details | High | A valid terminology/ID evolution fails many assertions | rewrite | L8-229 pins `F001`, `FQ-research-code`, `C12`, heading vocabulary |
| research-code playbooks | Remote actions require confirmation; cache bounded; inspect implementation | exact repository playbook paths and bilingual prose regex are incidental | High | Text edits can fail without safety regression | rewrite | L231-253 scans `.pipeline/playbooks/C12-*` |

### explain-contract.test.js (catalog: quarantined)

| Item | Contract | Hardcode | Valid-change sensitivity | Failure appropriate | Verdict | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| command map | Explain compatibility route metadata | exact retired agent/skill path may be legacy contract only | Medium | Appropriate only while compatibility route remains | reclassify | L12-18; catalog already says public Explain removed |
| evidence packet | Answer cites selected evidence and is read-only | Chinese section headings are incidental; packet fields are contract | High for renderer copy changes | Mixed | split | L20-39 |
| framework inference | Entry-point question selects package/source evidence | exact two paths are sample-specific | Medium if project layout support broadens | Exact list can reject valid additional evidence | parameterize | L42-56 |
| recent-change inference | Progress/log evidence and diff refs are surfaced | legacy `.pipeline/log.yaml` and exact wording are historical | High | Not current Runtime/Continuation contract | reclassify | L58-72 |
| read-only files | Explain does not mutate legacy authority | protected file names are stable safety boundary | Low | Appropriate | keep | L75-85 byte-compares state/log |
| redaction | Secret-like evidence is redacted | markers are fixture | Low | Appropriate | keep | L88-105 |
| unknowns | Missing evidence yields `needs_context`, no invention | exact Chinese prose/heading is incidental | Medium | Semantic assertions valid; prose assertion not | split | L108-120 |

### global-knowledge-index.test.js (catalog: quarantined)

| Item | Contract | Hardcode | Valid-change sensitivity | Failure appropriate | Verdict | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| safe global projection | Only accepted compact/index/global summaries project; raw records/secrets do not | project names and markers are fixture inputs | Low | Appropriate for superseded surface, but not release gate | reclassify | L5-113; catalog replaces with Records/Maintain |
| infrastructure projection | Metadata survives while raw credentials do not | IDs/path are fixture-derived | Low | Appropriate but superseded | reclassify | L116-154 |
| Notion-safe summary | Accepted summaries and secret refs only; no raw data/remote writes | Notion IDs/markers are fixture | Low | Appropriate but external-storage surface is superseded | reclassify | L157-226 |

### knowledge-ledger.test.js (catalog: quarantined)

| Item | Contract | Hardcode | Valid-change sensitivity | Failure appropriate | Verdict | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| fixture schema | Historical Knowledge record validates | `C4/M01` and categories are fixture values | Medium if old schema is intentionally migrated | Appropriate only as compatibility fixture | reclassify | L24-35 reads `M01-milestone-record.yaml` |
| recursive redaction | Common secret keys redact recursively | markers are fixture | Low | Appropriate | keep | L38-69 |
| SessionStart load defaults | Compact/index-only load boundary | exact six category list and legacy paths are old product layout | High for Records migration | Wrong gate for current product | reclassify | L72-98 |
| project relevance | Only accepted project-scoped facts/refs project | `hypo-workflow`, machine path and related project are fixture input | Low | Appropriate for superseded projection | reclassify | L101-189 |
| docs semantics | Historical Knowledge docs contain required headings/phrases | exact headings/prose/paths are incidental | Very high | Fails on harmless docs edits | rewrite | L192-231 |
| internal route | Knowledge remains unavailable internal route | exact `commands.length === 54` is unrelated global count | Very high: any command addition/removal fails | Inappropriate cascade | rewrite | L234-244; assert command membership/properties, never total count |
| normalization | IDs/source refs/categories normalize deterministically and redact | C4/M02/P006/E001 are fixture-derived | Low | Appropriate compatibility test | keep | L247-292 |
| append/index/compact | Historical helpers produce deterministic records/indexes/compact | exact six keys and 80-line cap couple policy/layout | Medium | Core determinism valid; exact inventory/line cap can fail valid additions | split | L295-370 |
| no raw records in state | Legacy state does not embed raw Knowledge records | fallback to `.pipeline/archives/C4-*` hardcodes repository history | High outside reference repo | Inappropriate and non-generic | rewrite | L373-389 reads current protected state or fixed C4 archive |

### maintenance-backfill.test.js (catalog: quarantined)

| Item | Contract | Hardcode | Valid-change sensitivity | Failure appropriate | Verdict | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| daily shards | Date planner emits contiguous deterministic intervals | `2026-03-01` global start and exact 76 count are repository/history data | Very high as time/start changes | Inappropriate outside this snapshot | parameterize | L5-38 pins start/end/count |
| weekly shards | Weekly partition covers same injected interval | dates are fixture inputs; boundary derivation is behavioral | Low | Appropriate | keep | L40-60 |
| resume state | Completed shards advance cursor without raw content | dates/project IDs are fixture inputs | Low | Appropriate but superseded feature | reclassify | L62-104 |

### notion-project-home-dry-run.test.js (catalog: quarantined)

| Item | Contract | Hardcode | Valid-change sensitivity | Failure appropriate | Verdict | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| dry-run no writes | Dry-run emits evidence and never calls write methods | five ordered phases are an internal pipeline layout | Medium if safe phase added/reordered | Exact evidence sequence can fail a valid enhancement | split | L7-46 compares unique phase order exactly |
| classify before merge | Legacy blocks are classified before merge planning | block/slot IDs are fixture-derived | Low | Appropriate | keep | L49-85 |
| deterministic hashes | Input order does not affect operation hashes | time/page/slot values are fixture | Low | Appropriate | keep | L88-116 |
| secret redaction | Template/client/block secrets never reach result | markers are fixture probes | Low | Appropriate | keep | L119-160 |

### pr-contract.test.js (catalog: quarantined)

| Item | Contract | Hardcode | Valid-change sensitivity | Failure appropriate | Verdict | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| command map | `/hw:pr` maps to manual-gated archive flow | command and route are compatibility contract | Medium | Appropriate only while retained | reclassify | L14-19 |
| source normalization | GitHub/GitLab/local archive refs normalize; unsupported host rejects | host/path formats are protocol contracts; org/repo/numbers are fixture | Low | Appropriate | keep | L22-60 |
| local archive contract | Archive is local authority and remote writes require confirmation | exact six-file list and Chinese/English prose are incidental presentation/layout | High | Safety flag failure valid; copy/file-layout failure may not be | split | L62-90 |
| existing ID input | Local archive IDs round-trip | ID is fixture input | Low | Appropriate | keep | L93-102 |
| stable non-overwrite/redaction | Sequential archives do not overwrite and evidence redacts | date/sequence values derive from injected input | Low | Appropriate | keep | L105-138 |

### project-linkage-e2e.test.js (catalog: quarantined)

| Item | Contract | Hardcode | Valid-change sensitivity | Failure appropriate | Verdict | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| public orchestration export | Dry-run bundle builder is exported | function name is public API | Medium | Appropriate for superseded API only | reclassify | L12-18 |
| full dry-run bundle | Registry/capture/notification/summary cause no external side effects | project IDs, channel, timestamp and output are fixture-derived; exact section inventory/prose is coupled | Medium-high | Safety failures valid; added section/copy changes can cascade | split | L20-130 and `fixtures/project-linkage-e2e/scenario.json` |

### recovery-journal.test.js (catalog: maintained)

| Item | Contract | Hardcode | Valid-change sensitivity | Failure appropriate | Verdict | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| API/taxonomy export | Journal/blob API and explicit event taxonomy are public | names/types are protocol contract | Medium on versioned API change | Appropriate | keep | L63-69 |
| stream partitioning | Object/session/writer isolate streams and rotate by configured limit | exact paths encode persisted format contract; count derives from events/limit | Low | Appropriate | keep | L71-124 |
| vector cursor delta | Replay returns per-stream delta and stable cursor | schema version/fields are protocol | Low | Appropriate | keep | L127-179 |
| append cursor stability | Append returns immutable cursor; later cross-stream replay deterministic | fixture IDs are input | Low | Appropriate | keep | L181-222 |
| same-process concurrency | Same writer serializes; distinct writers retain streams | count 24 is load fixture, assertions derive from it | Low | Appropriate | keep | L224-267 |
| multiprocess concurrency | Independent Hook processes serialize same stream | count 12 is load fixture | Low, though environment-sensitive | Appropriate but probe flake rate | probe | L269-300 and child fixture `recovery-journal-append-child.mjs` |
| stale reaper | Abandoned stale lock/reaper cannot permanently block append | `180_000` fixture assumes production stale threshold below 3m | Medium if threshold policy changes | Could fail valid timeout tuning | parameterize | L302-329 |
| blob contention | 32 writers converge on one redacted content-addressed blob | 32/524288 are stress inputs; test title only promises >=16 | Low; possible CI resource flake | Semantically appropriate; probe stability | probe | L331-377 |
| taxonomy/hidden reasoning | Required types explicit; rationale persists; hidden reasoning rejects zero-write | taxonomy constants are protocol; markers are probes | Low | Appropriate safety failure | keep | L379-414 |
| sensitive routing metadata | Secret-like object/session/writer/turn IDs reject pre-path with no echo | field list is security boundary | Low | Appropriate | keep | L416-446; four subtests |
| redaction before persistence | Redact before Journal/blob hash/write | thresholds/markers are fixtures | Low | Appropriate | keep | L448-479 |
| large blob/on-demand read | Large output externalizes, validates, deduplicates | descriptor key list/media type/storage are persisted protocol | Medium on compatible descriptor extension: exact key list fails | Exact keys reject additive compatibility | parameterize | L481-524 uses `Object.keys(...).sort()` exact equality |

### rules-capture-habits.test.js (catalog: quarantined)

| Item | Contract | Hardcode | Valid-change sensitivity | Failure appropriate | Verdict | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| remember proposal | Command flags parse and ordinary capture requires confirmation | IDs/text are fixture; command fields are legacy protocol | Low | Appropriate for removed surface only | reclassify | L18-30 |
| candidate nonblocking | Ambient rule detection does not block current discussion | exact Chinese confirmation copy is incidental | High | Copy failure is not behavior failure | rewrite | L33-40 |
| force write/effective habits | Forced structured rule persists and projects | paths/fields are old authority format; content is fixture | Medium | Appropriate only as compatibility | reclassify | L43-70 |
| nested directories | Writers create requested parent paths | IDs/path are fixture input | Low | Appropriate | keep | L73-85 |
| adapter projection | Active rules appear in generated managed surfaces | exact headings and Chinese prose are incidental; presence is behavior | Medium | Mostly valid, but copy assertion brittle | split | L88-107 |

### snapshot-store.test.js (catalog: maintained)

| Item | Contract | Hardcode | Valid-change sensitivity | Failure appropriate | Verdict | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| API exports | Snapshot projection/write/read APIs are public | names are API contract | Medium | Appropriate | keep | L36-39 |
| Goal/Cycle reconstruction | Accepted Goal/checkpoint Cycle preserve portable semantic content and Record identity | C21 IDs are fixture input; path classes/schema fields are protocol | Low | Appropriate | keep | L41-99; two subtests |
| clone stability | Clone-local workspace/time/runtime changes do not affect semantic Snapshot | `m2-fixture-project` derives from fixture manifest | Low | Appropriate | keep | L102-131 |
| portable sources | Portable locators survive; absolute/file locators reject/exclude | local path samples are fixture probes | Low | Appropriate | keep | L133-173; nested cases derive expectations from input |
| semantic change hash | Durable semantic changes alter bytes/hash | changed body is fixture | Low | Appropriate | keep | L176-190 |
| exclusion/security | Runtime/Journal/Receipt/locks/secrets/hidden reasoning never project; invalid input zero-write | sentinel strings are probes; forbidden keys are protocol boundary | Low | Appropriate | keep | L192-285 |
| prepared transaction recovery | Fault after prepare leaves recoverable transaction and no Snapshot | phase name is transaction protocol | Low | Appropriate | keep | L287-306 |
| schema/path safety | Invalid schemas and escape paths reject pre-write | schema/path constraints are protocol/security | Low | Appropriate | keep | L308-329 |
| derived contained path | Valid Snapshot copied elsewhere cannot be read as authoritative projection | exact derived-root rule is contract | Low | Appropriate | keep | L331-346 |

### workflow-commit.test.js (catalog: maintained)

| Item | Contract | Hardcode | Valid-change sensitivity | Failure appropriate | Verdict | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| legacy atomic commit | Deprecated helper atomically writes `cycle.yaml`/`state.yaml` plus derived view | C3 values are fixture, but protected legacy files are obsolete authority | High for current manifest/Runtime architecture | Wrong maintained gate; protects writes now forbidden by project rules | reclassify | L25-61 directly writes protected files |
| legacy invalid state | Deprecated helper rejects invalid legacy state before write | exact validator prose is incidental | High | Wrong current gate and brittle message | reclassify | L63-92 |
| legacy derived failure | Authority stays committed and repair marker records derived failure | exact `.pipeline/PROGRESS.md`/`hw:sync` are legacy contract | High | Wrong current gate | reclassify | L94-136 |
| legacy revision pointer | Legacy rejected state permits revision step pointer | C12 and legacy schemas are fixture/obsolete format | High | Wrong current gate | reclassify | L138-166 |
| legacy accept/reject warning | Legacy accept/reject writes log/feedback despite derived failure | exact event/prose and protected files are legacy behavior | High | Wrong current gate; causes broad failures during migration | reclassify | L168-226 |
| current Delivery transaction | Current mutations require transaction IDs, expose phases, require Receipt/start, resume read-only | transaction states/phases are protocol; final skill prose regex is incidental | Low-medium | Core transaction failures appropriate; doc wording failures are not | split | L228-311 combines current behavior with legacy-doc wording |

## Scenario Audit

| Item | Contract | Hardcode | Valid-change sensitivity | Failure appropriate | Verdict | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| `c21/s72-cycle-delivery` (maintained) | Cycle enforces Milestone order and aggregate acceptance | `C21/S72` labels are fixture; exact test-name phrase is incidental | Very high: test rename can result in all tests skipped while command exits success | False green is possible; failure signal is not trustworthy | rewrite | `run.sh` uses `--test-name-pattern='Cycle enforces Milestone order'` without asserting a matched/pass count |
| `v0/s04-skip-step` (quarantined) | Historical skip-step behavior | V0 prompt/step names, legacy `state.yaml`/`log.md`, max score are historical | High | Checklist is already FAIL/blocked and has no runner | remove | only checklist/config; replacement is current Cycle scenario |
| `v11/s68-rejection-rework-blocked-runtime-loop` (quarantined) | Historical rejection/rework loop | exact role names and legacy lifecycle are historical | High | Runner can still execute obsolete test but is correctly quarantined | keep | runner invokes one legacy test; catalog points to s75 |
| `v5/s18-template-library` (quarantined) | Historical template library inventory | exactly five template names, >=3 prompts, fixed C2 archive path and old commands | Very high | Repository-history dependency makes result non-generic | remove | `run.sh` reads `.pipeline/archives/C2-new-cycle/...` |
| `v6/s28-log-filters` (quarantined) | Historical log filter docs | exact English prose `newest 10`, `.pipeline/log.yaml` | Very high | Copy/current-workspace changes dominate result | remove | pure `rg`/existence shell checks against superseded log |
| `v8.2/s38-patch-fix-flow` (quarantined) | Historical Patch Fix docs/six-step lane | P001, exact steps/prose/commit format and protected-state wording | Very high | Harmless doc edits fail; old command surface | remove | pure string scans; replacement s72 does not specifically cover Patch, so catalog replacement is also weak |
| `v8.3/s48-i18n-templates` (quarantined) | Historical bilingual template completeness | exact file inventory, emoji heading, legacy-report paths | Very high | Template refactor/copy changes fail broadly | remove | shell existence/string checks only |
| `v9/s58-opencode-full-v84-parity` (quarantined) | Historical V8.4 OpenCode parity | exact 14-command inventory, eight-step prose, old CLI init and V8.4 docs | Very high | Valid command/template evolution yields wide failures | remove | generated artifact grep suite; catalog replaces with Codex Hook scenario |

## Direct Fixture And Support Audit

| Surface | Assessment | Action |
| --- | --- | --- |
| `core/test/fixtures/c21-m2/helpers.js` | `m2-fixture-*`, timestamps and legacy sentinels are legitimate generated inputs. Helpers derive expectations from them. `LEGACY_SENTINELS` is valid for preservation tests, not authorization to mutate protected files. | keep; do not use it to justify maintained legacy-writer tests |
| `core/test/fixtures/c21-m3/helpers.js` | Goal IDs, next action, event strings, limits and timestamps are injected fixture data. Persisted paths/schema/event types are explicit recovery contracts. | keep; parameterize timeout/descriptor extension assertions in callers |
| `core/test/fixtures/c21-m3/recovery-journal-append-child.mjs` | Real second-process writer is necessary to exercise cross-process locking; fixed session/writer IDs are fixture input. | keep |
| `core/test/fixtures/c21-m6/helpers.js` | Goal/Cycle IDs and time are fixture data; method inventory is public store API. No reference-repository truth is inferred. | keep |
| `core/test/fixtures/c23-m1/acesim-like.json` | Concrete project/attempt values are input to lineage and transaction recovery tests; expectations derive from the fixture. | keep |
| `core/test/fixtures/knowledge/M01-milestone-record.yaml` | Historical C4 schema fixture is valid only for compatibility/quarantine, not current Records authority. | reclassify with caller |
| `core/test/fixtures/project-linkage-e2e/scenario.json` | Project names/channel/timestamp are explicit scenario input. The problem is caller over-assertion/current classification, not concrete fixture values. | keep with quarantined caller |
| `tests/regression-catalog.json` | Correctly quarantines most retired surfaces, but keeps `workflow-commit.test.js` as one maintained unit, pulling five legacy authority tests into the release gate. Scenario replacement mappings are sometimes only generic (s72) and do not preserve the retired behavior. | split catalog entry/file or add case-level runner boundary; correct misleading replacements |

## Findings

### High

1. **Maintained legacy authority writes:** `workflow-commit.test.js` is maintained, but five of six cases directly create/mutate protected `.pipeline/state.yaml` and `.pipeline/cycle.yaml`. This makes the current gate protect an obsolete write architecture and guarantees noise during valid Runtime/Continuation migration. Split current Delivery transaction coverage from legacy compatibility and quarantine/remove the legacy part.
2. **Maintained Scenario can pass with zero matching tests:** `c21/s72-cycle-delivery/run.sh` filters by an exact test title and does not verify that a test ran. Renaming the test can produce a green scenario composed only of skipped tests. Replace title matching with a dedicated executable/test file or parse/assert nonzero pass count.
3. **Repository-history dependence:** Knowledge boundary fallback reads a fixed `C4` archive, maintenance backfill pins a global `2026-03-01` and exact count, and s18 reads a fixed C2 archive. These are reference-repository data, not universal behavior contracts.

### Medium

1. `knowledge remains ... map` asserts global `commands.length === 54`; any valid command addition fails an unrelated compatibility-route test. Assert only the target command and uniqueness.
2. Numerous quarantined tests use whole-document regex and exact prose/headings (`analysis`, Deep Plan, Claude docs, Explain, Rules, old Scenarios). They diagnose copy/layout drift, not behavior. Quarantine prevents release blast radius today, but full-suite failures remain noisy and misleading.
3. `recovery-journal` rejects additive descriptor evolution with exact `Object.keys` equality and couples stale-reaper success to an implicit timeout. Assert required subset and inject/configure the stale threshold.
4. `context-capsule` otherwise sound incremental test asserts an exact Journal segment count. Keep the unreadable-history invariant but derive segment expectations from configured/event inputs or avoid the count.
5. `authority-nonduplication` combines strong parsed authority assertions with all-tree literal occurrence counts. A legitimate new explicit projection could fail the count even when ownership remains unambiguous; mutation probe before retaining.

### Low

1. C23/M1/C21/AceSim/NeRF labels in maintained recovery/snapshot tests are fixture identities, not universal expected output; no production hardcode finding follows from their presence alone.
2. Concurrency counts (12/24/32) are useful deterministic load parameters, but multiprocess/blob tests should be observed for CI flake/resource sensitivity.
3. Exact default model names in the quarantined Claude adapter test are policy snapshots. If revived, isolate a deliberate defaults test from structural adapter behavior.

## Counterfactual Probe Candidates

1. Rename the Cycle-order test selected by s72 without changing its assertions; verify whether s72 exits 0 with zero passes. Expected result: demonstrates a false green and justifies rewrite.
2. Add an unrelated canonical command in a temporary mutation; verify only `commands.length === 54` fails in `knowledge-ledger.test.js`. Expected: inappropriate unrelated failure.
3. Add an optional backward-compatible field to a blob descriptor; verify the exact-key recovery test fails while read/write/digest behavior remains valid. Expected: parameterize to required-key subset.
4. Add a legitimate explicitly labeled projection containing `pending_acceptance` to the authority fixture; determine whether occurrence-count failure reflects a real duplicate authority or a valid projection. Expected: replace literal counts with structured ownership assertions if valid.
5. Change Journal stale-lock threshold while injecting a correspondingly stale lock. Expected: current fixed 180-second fixture may fail despite preserved recovery contract; expose threshold or derive age.
6. Split `workflow-commit.test.js` temporarily into legacy/current runner inputs and compare maintained-gate blast radius under a Runtime-only change. Expected: only current transaction case should participate.
7. Rename/rephrase headings in one quarantined Markdown-backed feature without changing command metadata/behavior. Expected: multiple regex failures demonstrate prose coupling.

## Zero-Omission Self-Check

- Assigned executable path count: **18**; audited: **18**.
- Declared/parameter-expanded top-level case count: **94**; table rows: **94**.
- Dynamic nested coverage inspected: Context Capsule seeds `3/7/11`, cursor mutations `tampered-hash/stale-valid-shape`; Snapshot kinds `accepted-goal/checkpoint-cycle` and nested locator cases; Recovery sensitive metadata four fields.
- Assigned Scenario count: **8**; audited: **8**.
- Direct fixture/support surfaces inspected: C21-M2, C21-M3, C21-M6 helpers; recovery multiprocess child; C23-M1 fixture; Knowledge fixture; project-linkage fixture; catalog classifications/replacements.
- Production/test files modified: **none**.
