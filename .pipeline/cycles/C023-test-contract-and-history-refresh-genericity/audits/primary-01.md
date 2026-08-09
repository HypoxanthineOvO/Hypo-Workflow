# Primary Test Contract Audit 01

## Scope and method

- Shard rule: all normalized `core/test/**/*.{test,spec}.*` paths sorted, zero-based index `% 10 == 1`.
- Covered test files: 18/18 assigned files, 107 declared/generated top-level cases (table-driven variants inspected within their parent case).
- Scenario rule: all maintained and quarantined catalog Scenario paths sorted, zero-based index `% 10 == 1`.
- Covered Scenarios: 8/8 assigned paths.
- Shared surfaces additionally audited: `tests/regression-catalog.json`, `tests/run_regression.py`.
- Direct fixtures inspected where used: C21 M2/M3/M6/M7 helpers, C23 M1 JSON fixtures, global-consolidation fixture tree, canonical audit example Markdown, and each assigned Scenario checklist/run script/config.

Verdict meanings follow `audits/METHODOLOGY.md`. A literal derived from the fixture input is not classified as harmful hardcoding; a repository identity, historical count/path, exact prose, model choice, or implementation layout promoted to universal truth is.

## Coverage inventory

### Test files

1. `core/test/adaptive-plan.test.js`
2. `core/test/audit-regression-canonical-examples.test.js`
3. `core/test/c23-m1-experiment.test.js`
4. `core/test/chat-runtime.test.js`
5. `core/test/codex-continuation-preflight.test.js`
6. `core/test/config.test.js`
7. `core/test/deep-plan-package.test.js`
8. `core/test/execution-topology.test.js`
9. `core/test/global-consolidation.test.js`
10. `core/test/knowledge-hooks.test.js`
11. `core/test/maintain-ambient.test.js`
12. `core/test/notion-apply-gate.test.js`
13. `core/test/platform-adapters.test.js`
14. `core/test/project-link-graph.test.js`
15. `core/test/recovery-faults.test.js`
16. `core/test/rules-authority.test.js`
17. `core/test/skill-spec.test.js`
18. `core/test/worker-separation-spawn-enforcement.test.js`

### Scenarios

1. `tests/scenarios/c21/s71-goal-delivery` (maintained)
2. `tests/scenarios/v0/s03-diff-score-blocks` (quarantined)
3. `tests/scenarios/v11/s67-worker-separation-spawn-enforcement` (quarantined)
4. `tests/scenarios/v5/s17-plan-review` (quarantined)
5. `tests/scenarios/v6/s27-reset-modes` (quarantined)
6. `tests/scenarios/v8.1/s37-import-history-existing-pipeline` (quarantined)
7. `tests/scenarios/v8.3/s47-showcase-lifecycle` (quarantined)
8. `tests/scenarios/v9/s57-opencode-events-auto-continue-file-guard` (quarantined)

## Case audit

### `adaptive-plan.test.js`

| Item | Contract | Hardcode | Valid-change sensitivity | Failure appropriate | Verdict | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| stable Delivery compiler exports | Public compiler API is reachable from focused and root modules | Function names are public API constants | Renames correctly fail; internal refactor does not | Yes | keep | `planning` and root export checks |
| Goal/Plan structural contracts | Goal has no Stones; Plan requires at least one manual Stone | Status/kind fields are protocol; error wording regex is broad | New compatible fields survive; renamed error wording likely survives | Yes | keep | fixture-derived designs, hash shape |
| Stone presence selects mode | Selection is based on manual checkpoint presence | `goal`, `plan`, reason tokens are protocol | A legitimate extra mode would require contract revision | Mostly | keep | exact result object |
| final Proposal authority replies | Explicit/context-bound start differs from unscoped agreement and continued discussion | Chinese phrases are fixture inputs; authority intents are protocol | New paraphrases do not break; changing authority semantics should | Yes | keep | critically verifies bare `可以` is not authority absent awaited intent |

### `audit-regression-canonical-examples.test.js`

| Item | Contract | Hardcode | Valid-change sensitivity | Failure appropriate | Verdict | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| four example files exist | Durable examples exist | Exact filenames and count are historical documentation layout | Renaming/splitting examples breaks despite equivalent guidance | No | rewrite | `CANONICAL_EXAMPLES` fixed array |
| mid-flight rejection prose/commands | Example mentions intended concepts and executable evidence | Exact test and `s68` paths plus prose fragments | Test consolidation/path changes fail documentation-only test | No | rewrite | seven regexes over Markdown |
| audit-approved blocked prose/commands | Self-approval remains forbidden | Exact `s64` and focused test paths | Equivalent safety docs fail on rename | Partly | rewrite | regex-based prose test |
| cross-role rejection prose/commands | Cross-role ownership is rejected | Exact `s67` path | Equivalent executable coverage at another path fails | Partly | rewrite | regex-based prose test |
| missing audit question prose/commands | Required audit planning question blocks transition | Exact `s66` path and P1/P2 vocabulary | Phase vocabulary evolution causes false failure | No | rewrite | historical choreography strings |
| all s64-s68 commands cited | Examples link to runnable evidence | Fixed contiguous historical range and nine commands | Any valid replacement/removal creates broad irrelevant failure | No | remove | `REQUIRED_COMMANDS` is an inventory snapshot, not behavior |

### `c23-m1-experiment.test.js`

| Item | Contract | Hardcode | Valid-change sensitivity | Failure appropriate | Verdict | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| Experiment API exports | Store and Receipt context API surface exists | Method names are public contract | API removal correctly fails | Yes | keep | root exports + required methods |
| old failure does not override current success | Attempts are retained while current status follows newest attempt | NeRF IDs/statuses come from fixture | New metadata/order-preserving changes survive | Yes | keep | fixture-derived IDs and ordered attempt history |
| rerun identity | Rerun requires parent and preserves logical experiment identity | AceSim values are fixture data | Compatible extra fields survive | Yes | keep | missing-parent negative + fixture-derived identity |
| supersede preserves history | Replacement supersedes without deleting original history | Replacement ID/title literal is local input | Different implementation storage survives observable API | Yes | keep | old lifecycle/history and active list |
| trash/restore Receipt gate | Destructive lifecycle actions require Receipt and retain history | Intent strings are protocol | Safety relaxation correctly fails | Yes | keep | byte snapshot before rejected write; consumed Receipt |
| baseline change Receipt/history | Baseline updates are authorized, append history, preserve attempt baseline | Fixture baselines and status are derived | Compatible implementation changes survive | Yes | keep | negative no-write snapshot and history |

### `chat-runtime.test.js`

| Item | Contract | Hardcode | Valid-change sensitivity | Failure appropriate | Verdict | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| startChatSession state | Starting chat records active/session/recovery inputs | Timestamp/C2/path are fixture-derived | Alternative session ID scheme breaks despite same recovery behavior | Partly | parameterize | exact `chat-${now}` asserts implementation format |
| recoverChatContext file set | Legacy chat recovery returns authority/progress/report locations | Exact four legacy paths are implementation layout | Semantic workspace migration legitimately changes paths and fails | No | reclassify | tests protected legacy `state.yaml/cycle.yaml` as default context |
| appendChatLogEntry type | Chat uses `chat_entry`, not milestone report | Field/type names are API contract | Compatible added fields survive | Yes | keep | direct returned record assertions |
| endChatSession persistence mode | Material chats get summary; small chats minimal | Threshold examples are fixture inputs | Threshold tuning can fail with no public contract evidence | Partly | probe | 1/12 vs 4/180 exact boundary assumptions |
| patch escalation | Lightweight discussion stays chat; material bugfix suggests patch | Numeric examples assume internal heuristics | Legitimate heuristic tuning fails | No unless thresholds specified | probe | 1/24/2 and 6/240/8 fixtures |

### `codex-continuation-preflight.test.js`

| Item | Contract | Hardcode | Valid-change sensitivity | Failure appropriate | Verdict | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| continuation roundtrip | Active continuation persists a safe resume route and context | `/hw:resume` is public command; timestamp/path are fixture | Storage refactor survives API; command change should fail | Yes | keep | write/read roundtrip |
| continuation priority | Active continuation outranks generic state | Legacy state fields are fixture fallback | Removal of legacy fallback would fail even if new authority replaces it | Partly | reclassify | explicitly tests legacy state fallback |
| unsafe resume rejection | Resume route cannot contain shell chaining | Attack string is negative fixture | Validator refactor survives | Yes | keep | `&& rm -rf` rejected |
| preflight block/warn classification | Protected writes and secrets block; stale docs warn; secret values are redacted | README phrase and exact file list are repository-era fixtures | README wording/count changes can add irrelevant warning but does not fail `ok` beyond intended blocks | Mostly | split | combines security contract with brittle README freshness heuristic |
| missing optional notify warning | Optional notification absence warns, does not block | Hook name/path is platform contract | Replacement notification mechanism fails old test | Partly | parameterize | exact `codex-notify` ID |
| docs describe continuation, not runner | Guidance preserves runner boundary | Exact phrase `observability, not a runner` across five docs is prose hardcode | Clear rewording fails | No | rewrite | regex scans docs rather than runtime behavior |

### `config.test.js`

| Item | Contract | Hardcode | Valid-change sensitivity | Failure appropriate | Verdict | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| YAML nested objects/arrays | Parser handles common YAML nesting | Values are fixture-derived | Parser evolution survives | Yes | keep | parsed fixture |
| merge/write config | Defaults merge and YAML roundtrips | Default fields are product policy; raw phrase is serialization detail | YAML emitter formatting change may fail raw regex | Mostly | parameterize | retain semantic reload; remove raw formatting assertion |
| OpenCode model matrix defaults | Current exact provider models are defaults | Exact model names/context target are target-owned, time-sensitive | Any valid model refresh breaks source tests | No | remove | eight exact model assertions |
| project model overrides | Overrides win while unspecified defaults remain | `mimo-v2.5-pro` exact fallback is target-owned | Default model update breaks unrelated override test | No | rewrite | assert custom overrides and inherited presence, not exact model |
| automation levels/safe gates | Automation tiers and hard gates/default local actions exist | Labels are presentation prose; action names/gates are product policy | Label translation breaks unrelated safety test | Partly | split | separate safety invariants from UI labels/default inventory |
| bash hard gates | Only supported mode accepted; gates preserved | `allow_local` and gate fields are policy contract | New supported mode should not break this input | Yes | keep | invalid `bypass` explicitly forbidden |
| full automation preserves gates | Automation cannot bypass planning/external/release confirmation | Stable safety constants | Safety relaxation correctly fails | Yes | keep | normalized result |
| whitelist tiers | Local actions can run; external/unknown remain gated | Action IDs are fixture inputs/default examples | Adding actions survives | Yes | keep | input-derived tier outcomes |
| invalid automation level | Unsupported level rejected | `reckless` is negative fixture | New level named reckless unlikely; test contract sound | Yes | keep | rejection regex |
| worker separation resolution | Project policy/authorization and collision gate normalize correctly | Provider names and routes are fixture inputs | Added policy fields survive | Yes | keep | input-derived result |
| schema worker fields | Schema documents worker/bash/whitelist fields | Exact prose `never write bypass...` and example actions are brittle | Equivalent schema descriptions fail | Partly | rewrite | test schema keys structurally, not prose |
| recommended implement/test degradation | Separation cannot silently degrade unless capability unavailable | Roles/reason tokens are protocol | Compatible new reasons may break exact arrays | Mostly | keep | safety gate matrix |
| recommended audit degradation | Audit degradation needs evidence | Exact reason IDs are protocol-ish | New diagnostic details survive if containment used | Mostly | keep | evidence/no-evidence branches |
| Codex authorization scope | Missing/unknown authorization blocks separated start/resume | Exact public commands are contract | Adding authorized routes survives | Yes | keep | scope and platform gate |
| non-Codex authorization | OpenCode/Claude are not subject to Codex-only gate | Platform IDs are contract | New platforms require new cases, existing behavior stable | Yes | keep | platform matrix |

### `deep-plan-package.test.js`

| Item | Contract | Hardcode | Valid-change sensitivity | Failure appropriate | Verdict | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| package creation | Next ID derives from existing package and core artifacts are durable | `DP002` derives from seeded `DP001`; exact seven-file layout/lifecycle list is implementation-heavy | Adding/removing a compatible artifact fails full list | Partly | split | assert required subset and input-derived next ID; separately version layout contract |
| read/list/update/archive | Lifecycle updates and active pointer behave consistently | IDs/times are fixture inputs | Added statuses/metadata survive | Yes | keep | two created packages and pointer behavior |
| compact context excludes raw transcript | Summary/decisions persist while raw marker/roles do not leak | Marker is negative fixture | Different compaction implementation survives | Yes | keep | length and leak assertions |
| no worktree/protected writes | Deep Plan does not mutate protected authority or Explore worktrees | Protected paths are explicit safety boundary | Architecture change touching protected files should fail | Yes | keep | byte snapshots and absent semantics |

### `execution-topology.test.js`

| Item | Contract | Hardcode | Valid-change sensitivity | Failure appropriate | Verdict | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| topology API exports | Focused/root topology APIs exist | Public names are contract | API break correctly fails | Yes | keep | import probe + exports |
| trivial reversible solo | Solo profile needs implement and verification | Role/profile tokens are protocol | Added metadata survives | Yes | keep | fixture policy |
| material strict separation | Material parallelizable work uses distinct test/implement/audit | Exact three roles are explicit policy | Policy evolution intentionally changes test | Yes | keep | strict fixture |
| high-coupling material stays solo | No demonstrated delegation value means solo | Policy inputs are fixture | Heuristic tuning could fail without explicit contract | Partly | probe | exact decision at one point |
| auto uses independent workers when justified | Independent oracle/parallelism select audit/strict | Policy matrix is intended contract | Changes should be deliberate | Yes | keep | two contrastive inputs |
| migration role topology | Migration uses extractor/curator/auditor/writer separation | Role names are policy contract | Renaming roles is contract change | Yes | keep | exact roles |
| custom roles preserved | Custom topology is not coerced | Custom roles are fixture input | Compatible changes survive | Yes | keep | input-derived result |
| missing/shared roles block | Missing role and identity collision prevent readiness | Role names are contract | Added diagnostics survive | Yes | keep | contrastive evidence |
| incomplete/failed evidence | Only completed worker evidence counts | Status tokens are protocol | Safety weakening fails correctly | Yes | keep | running/failed negative inputs |
| Delivery verify waits for complete byte-valid evidence | Missing role and digest drift fail closed; valid evidence verifies | Timestamp/IDs are fixture inputs | Storage refactor survives public store | Yes | keep | three-stage integration |

### `global-consolidation.test.js`

| Item | Contract | Hardcode | Valid-change sensitivity | Failure appropriate | Verdict | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| daily consolidation planning | Scheduled maintenance is local, system-initiated, non-runner, no remote writes | `04:00 Asia/Shanghai` and backfill date are input-derived requirement fixtures | Different input schedule survives | Yes | keep | explicit input and derived result |
| scheduler evidence/ledger | Run emits local evidence and one sanitized event | Filename date derives from `now`; exact prefix is format contract | Alternate evidence naming breaks though behavior may remain | Partly | parameterize | check path existence/type plus date derivation, avoid full prefix |
| CLI cron dry-run | CLI invokes safe local dry run | Retired installed CLI path conflicts with catalog retired surface | Legitimate Skill-first removal breaks | No | reclassify | directly executes `cli/bin/hypo-workflow` |
| Chinese redacted outputs | Configured Chinese candidate groups are non-authoritative, reviewed and redacted | Five Chinese substrings and fixed secrets are fixture probes | Equivalent Chinese wording can fail | Partly | rewrite | validate language/classification/redaction structurally; one Unicode check is enough |
| Notion projection remains dry-run | Projection never invokes write methods and emits reviewable categories | Exact Chinese headings are prose hardcode | Clear heading rename fails | Partly | rewrite | primary contract is zero writes/capabilities, not five phrases |

### `knowledge-hooks.test.js`

| Item | Contract | Hardcode | Valid-change sensitivity | Failure appropriate | Verdict | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| session-start compact only | Hook loads compact/indexes and excludes raw records/secrets | Legacy `.pipeline/knowledge` layout is explicit migration fixture | New Records-based context correctly makes test obsolete | No for current gate | reclassify | legacy compact-only hook behavior |
| strict ledger self-check | Legacy strict rule blocks missing ledger record | C4/M03 derive from fixture; legacy rule is obsolete path | Current Record authority can work while test fails | No for current gate | reclassify | stop hook + legacy Cycle files |
| docs preserve legacy/current boundary | Docs distinguish legacy Knowledge Ledger from current Records | Exact sentences across six docs are brittle | Rewording fails; behavior unchanged | No | rewrite | prose regex suite |

### `maintain-ambient.test.js`

| Item | Contract | Hardcode | Valid-change sensitivity | Failure appropriate | Verdict | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| semantic delta stages Journal/Inbox/Patch | Durable semantic delta is staged without creating active pointer or direct Record | Paths/kind/status are storage protocol; body derives from input | Additional files could break negative broad scans only if forbidden namespaces | Yes | keep | exact allowed/disallowed authority boundaries |
| noise creates no semantic artifacts | Non-delta prompt causes zero semantic writes | `Thanks.` is fixture input | Classifier tuning could change one phrase, but null delta is decisive | Yes | keep | explicit `semantic_delta:null` |
| recorder is proposal-only until main promotion | Subagent cannot authority-write; main promotion can | Actor IDs are fixture data | Implementation refactor survives tree snapshot | Yes | keep | zero-write snapshot + promoted Record |

### `notion-apply-gate.test.js`

| Item | Contract | Hardcode | Valid-change sensitivity | Failure appropriate | Verdict | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| missing confirmation/dry-run fields rejected | Remote apply requires all reviewed authority inputs before writes | Field names are protocol | Safety/API change must update deliberately | Yes | keep | table covers five missing inputs, zero writes |
| false/casual/mismatched approval rejected | Only bound explicit approval authorizes apply | English phrases are adversarial fixtures; IDs/hash derived | Adding accepted explicit phrasing does not affect negatives unless ambiguity introduced | Yes | keep | eight negative variants |
| stale/mutated bundle rejected | Reviewed hash binds exact bundle | `hypo-workflow` target is fixture-local and hash derived | Compatible internals survive | Yes | keep | mutation after hash, zero writes |
| unsafe review/actions rejected | Unresolved, unconfirmed, publication/external actions do not apply | IDs are fixture inputs; side-effect tokens are protocol | New safe operation types may require focused additions | Yes | keep | five unsafe variants, zero writes |
| raw secrets/Knowledge rejected | Raw sensitive payloads never project | Markers are deliberate negative fixtures | Redaction implementation changes survive | Yes | keep | six injection locations |
| approved subset/drift | Only selected operation hashes execute | Operation IDs/target are fixture-derived | Added unapproved operations survive; drift correctly fails | Yes | keep | positive subset + negative hash drift |
| failed verification not complete | Post-write reread failure leaves queue incomplete and sanitized evidence | Exact status `verifying` may overconstrain retry state | Alternate explicit failure state would falsely fail | Mostly | parameterize | assert not completed + failure evidence, loosen exact intermediate state |
| successful apply completes after verification | Applied subset, reread, sanitized ledger then completion | IDs/pages are fixture-derived | Compatible extra reads/metadata could fail exact arrays | Mostly | parameterize | assert required calls/IDs, not exact entire call sequence if batching allowed |

### `platform-adapters.test.js`

| Item | Contract | Hardcode | Valid-change sensitivity | Failure appropriate | Verdict | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| conservative adapters | Generated adapters include required commands/safety and exclude target-owned models/internal bundle | Exact repo URL, full output file list, many English phrases and negative model versions are brittle | Rewording, adding adapter file, or model refresh fails despite same contract | No | split | separate structural output, command availability, safety semantics; generate model exclusion set dynamically |
| preserve user-owned blocks | Managed block replacement preserves surrounding user text | Marker strings are format contract; prose is fixture | Generator wording change only hits repo-name regex | Mostly | rewrite | assert new managed marker/content differs, not brand phrase |
| platform selection | `trae` sync writes only Trae adapter | Paths/operation ID are public adapter layout | Adding shared harmless metadata file could fail negatives | Mostly | keep | bounded platform output |
| Cursor flat skills/commands | Cursor sync exposes rule, flat skills, commands, resolvable refs, excludes nested source Skill | Exact selected command paths and model blacklist brittle | Adding/renaming public command legitimately changes many asserts | Partly | parameterize | derive expected command files from command map; keep no target model config invariant |
| prune stale managed resources | Sync removes files proven managed and retains current command files | `hw-pr` exact current commands are inventory snapshot | Command evolution falsely fails cleanup behavior | No | rewrite | assert stale removed and generated manifest/current map reconciled dynamically |

### `project-link-graph.test.js`

| Item | Contract | Hardcode | Valid-change sensitivity | Failure appropriate | Verdict | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| required replaced_by edges | Typed confirmed relations become graph edges/inverses | Hypo project names/home/date are fixture data and expected values derive from them | Different workspace fixture works if parameterized; current test is self-contained | Yes | keep | input-derived graph |
| invalid endpoints/type/direction | Relation validator fails closed | Invalid values are negative fixtures | New supported type named exact negative would require update | Yes | keep | three independent negatives |
| required metadata | Typed edge requires identity/status/authority/direction | Field names are schema contract | Schema contract change should fail | Yes | keep | deliberately incomplete relation |
| inverse links ignore derived authority drift | `workspace.yaml` is authority; projects view drift is reported | Exact edge/project IDs derive from fixture | Internal graph refactor survives | Yes | keep | wrong predecessor contrast |

### `recovery-faults.test.js`

| Item | Contract | Hardcode | Valid-change sensitivity | Failure appropriate | Verdict | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| Recovery root exports | Complete public recovery API is exported | Names/event array are protocol | API break correctly fails | Yes | keep | explicit export inventory |
| truncated final line | Only final truncated JSONL record may be ignored with warning | Event count/sequence derive from seeded three events | Different warning code breaks despite same handling | Mostly | parameterize | assert typed truncation warning category, avoid exact token if not public |
| earlier corruption | Non-tail corruption fails closed and does not rewrite | Corruption fixture is deliberate | Refactor survives broad error regex/tree snapshot | Yes | keep | nested subtest |
| blob drift | Content-addressed blob rejects modified bytes | Digest path is protocol; payload is fixture | Storage layout change can fail constructed path | Partly | rewrite | expose test helper/descriptor-resolved path instead of reimplementing blob path |
| Pack after-prepare fault rollback | Recoverable transaction rolls back partial Pack | `after_prepare` is fault-injection API; path is internal layout | Transaction directory relocation falsely fails | Partly | split | assert recovery action/authority bytes; test layout only if format public |
| M2/legacy authority byte preservation | Recovery writes do not mutate M2 or protected legacy authority | Exact protected paths are safety boundary | New protected authorities need additions, existing behavior stable | Yes | keep | byte maps and allowed file list |

### `rules-authority.test.js`

| Item | Contract | Hardcode | Valid-change sensitivity | Failure appropriate | Verdict | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| normalize rule | Rule IDs normalize; structured fields persist | Content values are fixture-derived | Added metadata survives | Yes | keep | semantic output |
| invalid fields rejected | Scope/severity/hook/check kinds are closed enums | Invalid examples are negative fixture | Expanding an enum intentionally requires update | Yes | keep | four rejection cases |
| precedence resolution | Cycle > project > global > builtin with override evidence | C8/instructions are fixture data; precedence is contract | Added evidence fields survive | Yes | keep | all scopes same ID |
| load legacy/structured/Markdown | Loader combines configured sources and legacy summary | Exact legacy summary prose/tab format is brittle | Summary formatting change fails behavior test | Partly | parameterize | keep parsed rules; move rendered summary to format-specific test |
| legacy severity override | Config override changes effective severity | Paths/severity are protocol | Refactor survives | Yes | keep | input-derived rule |
| global opt-in | Global habits load only when explicitly configured | Paths/ID are fixtures | Correct security/scope behavior | Yes | keep | absent vs configured contrast |
| effective matrix evidence | Matrix records winner, overrides, source refs and conflicts | `project_id:hypo-workflow`, C16, home path are fixture values | Values derive from input; internal refactor survives | Yes | keep | full scope matrix |

### `skill-spec.test.js`

| Item | Contract | Hardcode | Valid-change sensitivity | Failure appropriate | Verdict | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| spec sections/counts | Skill spec has useful structure | `45`, `43`, `53` counts and exact headings/phrases are repository snapshots | Any valid Skill addition/removal or editorial rewrite fails | No | rewrite | derive inventory; validate required semantic sections with parser |
| command map traceability | Every exposed command resolves to ordinary Skill backend | Exact `54` commands, `44` paths, selected goal fields, legacy prose are snapshots | Valid command addition fails before traceability checks | No | rewrite | remove exact counts; retain loop over discovered map and goal public contract |
| audit references | Spec mentions historical external references/findings | Exact product names, Showcase, V7 prose is bibliography snapshot | Documentation curation fails tests without behavior regression | No | remove | pure prose-presence test |

### `worker-separation-spawn-enforcement.test.js`

| Item | Contract | Hardcode | Valid-change sensitivity | Failure appropriate | Verdict | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| implement/test identities distinct | Recommended and strict reject shared implement/test worker | Collision token is diagnostic contract | Safety weakening correctly fails | Yes | keep | both policy modes |
| strict audit distinct | Strict requires three distinct identities | Exact collision IDs are diagnostic tokens | New diagnostics could break exact arrays | Mostly | parameterize | assert collision role pairs structurally |
| runtime-only observations excluded | Host observations are not acceptance evidence | Source labels are protocol fixtures | Compatible sources survive if same scope semantics | Yes | keep | mirror filters two runtime sources |
| lifecycle closure required | Missing/failed closure blocks evidence | Lifecycle/status tokens are protocol | Safety weakening fails | Yes | keep | two closure negatives |
| ownership/scope mismatch | Cross-role file ownership and out-of-scope changes block | Exact file paths are fixture-derived; exact five reason strings couple diagnostics | Adding another valid diagnostic can break exact array | Partly | parameterize | assert required violations as subset/structured codes |
| missing scope/file evidence | File-changing roles require persisted scope and file evidence | Exact reasons are diagnostic internals | Better diagnostics/order can falsely fail | Partly | parameterize | assert categories/roles structurally |
| readiness exposes missing evidence | Acceptance surfaces separation blockers | Exact reason prose regex broad; arrays exact | New reason can break array | Mostly | parameterize | required subset |
| explicit empty changed files valid | No-op evidence is valid when scope is persisted | Role/path fixtures are input | Correctly protects against false blocking | Yes | keep | both modes |

## Scenario audit

| Item | Contract | Hardcode | Valid-change sensitivity | Failure appropriate | Verdict | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| `c21/s71-goal-delivery` | Current thin Goal lifecycle runs from any cwd without retired CLI | `run.sh` selects exact test title and historical M6 file | Rename/split of equivalent lifecycle test fails Scenario | Partly | rewrite | invoke stable behavioral entry/tag, not `--test-name-pattern='Goal runs proposed'` |
| `v0/s03-diff-score-blocks` | Historical strict diff fixture documents a blocked outcome | Runner only checks literal `max_diff_score: 1`; checklist claims PASS without execution | Config formatting or policy migration fails; behavior can break while runner passes | No | reclassify | quarantined; metadata check is not executable contract |
| `v11/s67-worker-separation-spawn-enforcement` | Focused worker separation suite passes | Wrapper hardcodes file path but that is its explicit target | Renaming test breaks wrapper; behavior mapping should be catalog-driven | Mostly | keep | executable full focused suite; quarantined classification is questionable because underlying test is maintained |
| `v5/s17-plan-review` | Historical Plan Review documentation/assets exist | Exact old files, C3 archive path and English headings | Any legitimate architecture/docs evolution fails many unrelated lines | No | remove | checklist unchecked; run script is obsolete string/file inventory |
| `v6/s27-reset-modes` | Historical reset modes documented | Exact command/prose and root `SKILL.md` layout | Skill-first removal/evolution fails documentation grep | No | remove | no runtime reset behavior exercised |
| `v8.1/s37-import-history-existing-pipeline` | Legacy import behavior remains documented | Exact legacy paths, Cycle 0 wording and plan-discover Skill | Rewording/migration fails; actual import can break while test passes | No | remove | grep-only obsolete scenario |
| `v8.3/s47-showcase-lifecycle` | Historical Showcase docs mention reuse/history/review | `version: 3`, exact phrases/commands are incidental docs | Version evolution causes false failure; no lifecycle executes | No | remove | grep-only unchecked checklist |
| `v9/s57-opencode-events-auto-continue-file-guard` | Generated OpenCode plugin enforces event/file guard policy | Executes retired CLI, exact generated filenames/functions/events/modes and legacy authority paths | Adapter/API refactor creates broad failure; behavior assertions are text grep | No | reclassify | quarantine is correct; replace with current adapter behavioral tests if feature remains |

## Shared catalog audit: `tests/regression-catalog.json`

| Item | Contract | Hardcode | Valid-change sensitivity | Failure appropriate | Verdict | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| `schema_version: "1"` | Catalog has versioned machine-readable schema | Stable protocol constant | Schema upgrade intentionally fails old loader | Yes | keep | top-level schema |
| core inventory entries | Every executable core test is explicitly maintained/quarantined with rationale | `covers` values heavily freeze C21/C22/M labels; many reasons are generic copy rather than per-test contract | Rename/add test requires catalog update (appropriate), but milestone relabeling causes churn | Partly | rewrite | require behavior-contract rationale; make historical trace optional metadata |
| scenario inventory entries | Every Scenario is classified and replacement is known | Most quarantined reasons use one generic historical sentence; replacement arrays can point broadly | Feature-specific status cannot be inferred; useful maintained underlying suites may stay quarantined accidentally (e.g. s67) | No | rewrite | require concrete obsolescence and replacement contract per Scenario |
| retired surfaces | Retired CLI has explicit replacement routes | `C21` in reason is historical explanation, acceptable metadata | Release renumbering need not change behavior | Yes | keep | replacements are public `/hw:*` routes |
| classification partition | No overlap and complete explicit inventory | Requiring both maintained and quarantined to be nonempty hardcodes perpetual technical debt | Removing last quarantined item makes healthy repository fail | No | rewrite | allow empty quarantined; require maintained nonempty only |

## Shared runner audit: `tests/run_regression.py`

| Item | Contract | Hardcode | Valid-change sensitivity | Failure appropriate | Verdict | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| core discovery | Catalog exactly covers executable core tests | Only `core/test/*.test.js` is discovered, contradicting methodology's recursive `*.test.*`/`*.spec.*` inventory | Adding `.spec.js`, `.test.mjs`, or nested test silently escapes gate | No (false pass) | rewrite | use recursive normalized patterns shared with audit inventory |
| Scenario discovery | Catalog covers checklist-bearing Scenario dirs | Assumes name starts `s`, excludes names containing `placeholder`, checklist presence defines executability | Valid naming/layout changes silently disappear | No | rewrite | discover declared catalog entries and validate executable contract, or define schema explicitly |
| partition validation | Classification and replacement metadata are internally consistent | Exact keys and forced nonempty quarantine are overconstraint | New metadata/healthy zero-quarantine fail | No | rewrite | validate required keys while permitting schema-compatible extensions |
| path canonicalization | Catalog cannot escape repository | Uses platform separator normalization and rejects absolute/traversal | Legitimate safe relative paths pass | Yes | keep | security boundary |
| `run()` | Runs local regression helpers with fixture bin | `shell=True` and string interpolation increase coupling/injection risk; catalog paths are validated but scenario scripts/config paths still enter shell strings | Spaces/quoting/platform evolution can fail unrelated tests | No | rewrite | use argv lists and `shell=False`; shell only for explicit `bash run.sh` argv |
| common validation | Scenario has checklist/results and valid config | `results/.gitkeep` is repository hygiene, not behavior; special-cases s12/s13 by name | Removing empty-dir sentinel fails all behavior; renamed hooks lose exemption | No | split | move layout lint out; encode validator mode as Scenario metadata |
| scenarios s01-s15 | Old cases receive in-runner custom checks | Giant name switch hardcodes counts, prose, internal files, exact thresholds and skips; each new scenario needs code change | Valid code/docs evolution causes arbitrary failures; behavior can break while text remains | No | rewrite | each Scenario owns executable `run.sh` or declarative assertions; runner stays generic |
| later Scenario execution | If `run.sh` exists, execute it | This generic branch is sound, but shell string construction is unnecessary | Script path rename is catalog/layout change only | Mostly | keep | use `subprocess.run(["bash", path])` |
| set/name selection | Maintained/quarantined/all and explicit names select deterministically | Class names are schema contract | New class requires schema upgrade | Yes | keep | stable selection payload |
| sequential execution/report | Results include check status/duration and exit nonzero on failures | Exact JSON schema version inherited; sequential is not a correctness issue | Parallelism implementation could change without test impact | Yes | keep | structured payload and exit code |

## Findings

### High

1. **The regression runner does not enumerate the stated complete test inventory.** `discover_core_tests()` only sees top-level `*.test.js`, so nested tests, `*.spec.*`, and other JS module extensions can be completely absent from catalog enforcement. This is a false-green gate, not merely brittle testing.
2. **`scenario_specific()` is a centralized hardcoded compatibility museum.** Scenario names select exact counts, prose, thresholds, paths, and special exemptions. It makes harmless changes fail and allows real behavior regressions to pass when the checked string remains.
3. **Exact repository statistics are tested as product behavior.** `skill-spec.test.js` hardcodes 45/43/53 and 54/44. Any valid Skill/command change fails for the wrong reason.
4. **Target-owned model configuration is frozen by source tests.** `config.test.js` asserts exact OpenCode models and context target. Routine provider/model updates create unrelated release failures.

### Medium

1. Canonical audit examples and multiple quarantined Scenarios test historical filenames/prose instead of safety behavior.
2. Adapter tests mix true safety invariants with exact output inventories, English phrasing, specific model blacklists, and current command snapshots, causing broad failures from a single legitimate adapter change.
3. Catalog forces a nonempty quarantined set and supplies generic rationales, making quarantine permanence structurally mandatory and obscuring why individual items are excluded.
4. Several tests exercise retired CLI or legacy `.pipeline/state.yaml`/Knowledge surfaces while remaining adjacent to the current maintained gate (`global-consolidation`, chat/continuation, knowledge hooks).
5. Diagnostic arrays are often asserted exactly. Adding a useful independent diagnostic can fail tests even though all required blockers remain present.

### Low

1. Some file naming/layout assertions (Recovery blob/transaction paths, exact Deep Plan artifact list) couple behavior tests to storage implementation and should be split into explicitly versioned format tests.
2. Chinese-output tests overfit exact vocabulary; structural `language`, redaction, status, and Unicode checks provide a stronger contract with less prose coupling.
3. Time and project literals are generally valid fixture data in this shard because expected results derive from those inputs; they should not be removed merely for being literals.

## Required counterfactual probes

1. Add a temporary nested `*.spec.mjs` sentinel and confirm the current runner/catalog incorrectly passes; then confirm rewritten discovery reports it unclassified.
2. Change only the exact counts in `references/skill-spec.md` after deriving actual inventory; current tests should demonstrate false failure, rewritten tests should use computed values.
3. Override one default OpenCode model while preserving configuration shape and project override behavior; current exact-default tests should fail and rewritten source tests should pass.
4. Reword a canonical audit example without changing linked executable contract; current regex test should fail, replacement behavior/link-integrity test should pass.
5. Add one extra valid diagnostic code to worker scope assessment; exact-array tests should expose false failure, subset/structured assertions should remain green.
6. Rename the focused Goal lifecycle test while preserving behavior; `s71` should expose its name-pattern coupling.
7. Remove the final quarantine entry in a temporary catalog; current validator should fail solely because the debt set became empty.

## Catalog and fixture disposition

- Keep concrete IDs, dates, project names, secrets, and paths when they are explicit fixture inputs and expectations are derived from them.
- Remove repository-wide counts and target model names from fixed expected values.
- Replace generic quarantine reasons with item-specific obsolete contract and maintained replacement evidence.
- Reclassify or remove grep-only historical Scenarios; do not make old prose pass a release gate.
- Preserve malicious/raw secret marker fixtures: these are high-value negative inputs, not accidental hardcoding.
- Preserve protocol constants such as schema version, authority intent, Receipt fields, lifecycle states, safety side-effect classes, and public command names where the product contract explicitly exposes them.

## Zero-omission self-check

- Assigned sorted file paths: 18; reported: 18; omissions: 0.
- Declared/generated top-level cases from assigned files: 107, including the four generated canonical-example cases; every named case is covered above. Table-driven variants were inspected within their parent case, and the nested Recovery corruption cases are separately distinguished.
- Assigned catalog Scenario paths: 8; reported: 8; omissions: 0.
- Direct Scenario checklists/run scripts/configs: 8/8 inspected.
- Shared surfaces requested by task: catalog and runner both audited.
- No production code, test, fixture, catalog, or runner was modified by this primary audit.
