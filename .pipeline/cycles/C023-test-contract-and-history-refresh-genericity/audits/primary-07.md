# Primary Test Contract Audit 07/10

## Scope

- Repository: `/home/heyx/Workspace/Hypo/Hypo-Workflow`
- Rule: normalized test path sort, zero-based index `% 10 == 7`; Scenario path sort, `% 10 == 7`.
- Covered: 18 executable test files, 117 top-level test cases, 7 Scenario entries.
- Method: `METHODOLOGY.md` five-question review; direct fixtures, catalog classification and runner scripts were also inspected. This is a read-only audit: no product or test source was changed.

### Files

1. `core/test/artifact-catalog.test.js` (4)
2. `core/test/c21-m7-audit-findings.test.js` (8)
3. `core/test/c23-m6-codex-hook-compatibility.test.js` (6)
4. `core/test/claude-resume-namespace.test.js` (4)
5. `core/test/compact-end-of-run.test.js` (4)
6. `core/test/deep-plan-ask.test.js` (8)
7. `core/test/delivery-receipts.test.js` (6; five may skip when prerequisite modules fail to import)
8. `core/test/feature-queue-ops.test.js` (8)
9. `core/test/hypo-claw-notification.test.js` (9)
10. `core/test/legacy-write-fence.test.js` (8)
11. `core/test/maintenance-run.test.js` (4)
12. `core/test/p0-configure-contract.test.js` (4)
13. `core/test/pr-readonly-flow.test.js` (4)
14. `core/test/readme-spec.test.js` (3)
15. `core/test/review-artifacts.test.js` (5)
16. `core/test/semantic-workflow-templates.test.js` (6)
17. `core/test/test-profile.test.js` (11)
18. `core/test/workspace-transaction.test.js` (15)

### Scenarios

1. `tests/scenarios/c21/s77-codex-hook-process` (maintained)
2. `tests/scenarios/v10/s62-analysis-preset-runtime` (quarantined)
3. `tests/scenarios/v3/s13-hook-session-start` (quarantined)
4. `tests/scenarios/v6/s23-init-existing-project` (quarantined)
5. `tests/scenarios/v8.1/s33-import-history-merge` (quarantined)
6. `tests/scenarios/v8.2/s43-v8-2-registration` (quarantined)
7. `tests/scenarios/v9/s53-global-cli-tui-setup` (quarantined)

## Per-case audit

Legend: **HC** distinguishes stable contract constants from accidental fixture/repository literals. **Sensitivity** asks whether a contract-preserving change fails. **Appropriate** asks whether such failure means the protected contract was actually broken.

### `artifact-catalog.test.js`

| Item | Contract | HC | Sensitivity | Appropriate | Verdict | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| scans current artifacts / stale summary | Known semantic artifact kinds are discovered and stale derived views are marked stale | Project/Cycle/time literals are fixture-derived; exact 12-kind list couples to current inventory | Adding a valid artifact kind passes, renaming/migrating a legacy path can fail broadly | Mostly; exact legacy path assertions overstate public contract | split | L24-69, fixture L229-267 |
| malformed YAML is parse_error | Present but malformed authority is not reported missing | Project/time are fixture inputs; statuses are protocol | Parser replacement should pass; terminology change fails | Yes if status vocabulary is public | keep | L71-88 |
| pre-Workflow git-only is not_applicable | Non-Workflow repositories are not diagnosed broken | Hypo-GPU/name/remote are fixture inputs; enumerated kinds couple inventory | New applicable kind may require unrelated update | Partly; one loop conflates classification with exhaustive kinds | split | L90-121 |
| secret refs without raw read | Secret files are neither read nor projected; refs/facts remain visible | Secret-looking text is adversarial fixture; kind/path contracts stable | Refactoring scanner should pass; secret-policy change should fail | Yes, though exact infrastructure kind can be separate | keep | L123-180 |

### `c21-m7-audit-findings.test.js`

| Item | Contract | HC | Sensitivity | Appropriate | Verdict | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| deletion manifest protects Recovery tree | Ordinary deletion cannot target Recovery ancestor/exact/descendant paths | Digest/path samples derive protected namespace; regex broad | Alternate error wording passes | Yes | keep | L24-40 |
| Receipt context rejects crafted Recovery binding | Receipt construction independently enforces protected namespace | Crafted digest/path are fixture inputs | Internal manifest shape changes could require fixture helper update | Yes; defense-in-depth contract | keep | L42-60 |
| UserPromptSubmit leaves persistence to Agent | Hook must not infer/persist semantic memory from prompt | 40 trace lines arbitrary fixture; Chinese context regex is wording-coupled | Equivalent reminder wording fails | File no-write assertion is appropriate; text checks are not | split | L62-79 |
| validator accepts documented output shapes | Supported event output schema accepts documented variants | Event/field names are protocol constants | Adding optional output fields does not fail | Yes | keep | L81-104 |
| validator rejects unsupported output fields | Event schemas remain closed | Forbidden fields are protocol probes | Legit protocol expansion intentionally fails and needs contract update | Yes | keep | L106-126 |
| PreToolUse rewrite bound to input | Rewrites obey tool-specific validated input shapes | Tool names/command field are host protocol; sample commands are fixture | New tool rewrite support should not affect existing cases | Yes | keep | L128-170 |
| PostToolUse targeted apply_patch reminder | Reminder derives actual changed path without host `changed_paths` | `src/live.js` is input-derived | Alternative user-facing reminder structure still passes path check | Yes | keep | L172-183 |
| PostToolUse effect dedupe | Identical effects dedupe; new content re-enables reminder | IDs and contents are fixtures | Hash/dedupe refactor should pass | Yes | keep | L185-210 |

### `c23-m6-codex-hook-compatibility.test.js`

| Item | Contract | HC | Sensitivity | Appropriate | Verdict | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| paired subagent context | `agent_id`/`agent_type` are paired optional host fields | Event list is protocol matrix | New supported event is silently untested | Existing failures meaningful, completeness needs generated matrix | parameterize | L32-44 |
| optional turn IDs omitted | Listed events accept absent `turn_id` | Event list duplicated from schema | Adding event does not fail, leaving gap | Failure meaningful per event; matrix drift is hidden | parameterize | L46-54 |
| optional tool-use ID omitted | Tool events accept absent `tool_use_id` | Two event names are protocol constants | New tool event untested | Yes for covered events | keep | L56-64 |
| wrapper accepts omissions repeatedly | Process wrapper emits one JSON object and exits zero | Only PreToolUse/Stop sample paths | Wrapper regressions in other event shapes can pass | Failure appropriate but coverage label overbroad | split | L66-78 |
| provided optional IDs validated | Unsafe, secret-like, non-string IDs rejected | Bad literals are adversarial fixture | Relaxing safe-ID syntax may fail despite remaining safe | Mostly; secret and traversal cases should be split from type | split | L80-99 |
| compatibility does not widen outputs | Input compatibility cannot loosen output schema | Forbidden fields are protocol constants | Legit output protocol change intentionally fails | Yes | keep | L101-116 |

### `claude-resume-namespace.test.js`

| Item | Contract | HC | Sensitivity | Appropriate | Verdict | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| registry does not claim `/resume` | Claude owns `/resume`; Hypo owns `/hw:resume` | Command literals are explicit public namespace | Namespace change should fail | Yes | keep | L12-15 |
| current plugin metadata safe | Packaged metadata contains no bare resume collision | Runs against `.` and expects particular incidental SessionStart finding | Unrelated repository/plugin layout changes can fail | No: repository self-snapshot mixed with invariant | rewrite | L17-27 |
| catches legacy bare skill | Audit detects isolated bare `resume` skill | Fixture metadata minimal and input-derived | Scanner refactor should pass | Yes | keep | L29-42 |
| report explains boundary in Chinese | Report communicates command ownership | Exact Chinese phrases and absence of incidental finding are wording/repo coupled | Copy edit fails | Not necessarily | rewrite | L44-50 |

### `compact-end-of-run.test.js`

| Item | Contract | HC | Sensitivity | Appropriate | Verdict | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| refresh dirty after success | Successful run refreshes dirty compact projections from authorities | Times/M01/text are fixture-derived; exact three targets current inventory | New compact target can pass; format wording change may fail regex | Mostly | keep | L12-51 |
| skip failed/disabled | Failure and explicit disable prevent writes | Reason strings look internal rather than public | Equivalent enum rename fails | Behavioral no-write is key; exact reasons are brittle | split | L53-68 |
| fresh untouched / no compact-of-compact | Dirty-only refresh uses authority and preserves fresh targets | mtime sleeps are environment-sensitive | Filesystem timestamp resolution can flake | Failure may be environmental | rewrite | L70-88 |
| target set compact-only | Every end-run target is a compact projection with refresh function | `length >= 5` is unexplained fixed count | Removing/merging a valid target fails | No, count is accidental | rewrite | L90-95 |

### `deep-plan-ask.test.js`

| Item | Contract | HC | Sensitivity | Appropriate | Verdict | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| public exports | Three public APIs remain exported | Names are API contract | API reorganization with compatible export passes | Yes | keep | L8-12 |
| first-principles challenges | Unclear package yields ordered substantive challenges and no default persona question | Exact first four challenge order and minimum 4 encode current policy | Valid reordering/new challenge fails | Not fully; intent is semantic coverage | rewrite | L14-54 |
| persisted next recommendation | Answered necessity advances default to persisted next challenge | Challenge IDs are workflow contract if documented | Alternative valid recommendation policy fails | Possibly policy-specific; prove spec authority | probe | L56-93 |
| answered challenge not default | Completed challenge is not re-asked as default | Expects exact next `falsifying_evidence` | Any valid other unanswered challenge fails | No | rewrite | L95-135 |
| user question contextual, not first | Persona can appear but is never default first ask | Bilingual wording matching is accidental output | Copy/paraphrase fails | No; assert structured challenge ID instead | rewrite | L138-163 |
| record iterative rounds | Ask rounds, decisions and open questions persist incrementally | Exact D001/D002 and Chinese question derive fixture inputs; next challenge exact policy | Schema-compatible ID generation change fails | Mixed; persistence is real, exact generated IDs/order too coupled | split | L165-240 |
| shallow gate rejects | Conversion blocked until required depth/challenges exist | Challenge IDs/readiness depth are domain contract | Valid challenge taxonomy change fails intentionally | Yes if versioned contract | keep | L242-294 |
| ready gate allows decomposition | Sufficient package permits decomposition | Fully specified fixture; empty gaps stable | Additional mandatory challenge intentionally fails | Yes | keep | L296-347 |

### `delivery-receipts.test.js`

| Item | Contract | HC | Sensitivity | Appropriate | Verdict | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| exports Receipt context API | Delivery and root modules expose builder | Module paths/exports are public surface | Internal module move fails import probe even if root API remains | Exact submodule export may be internal | probe | L35-41 |
| context binds authorization | Receipt binds actor/intent/object/scope/plan/revision/state | Exact key list and status/action names are protocol | Adding backward-compatible metadata key fails | No for exact key equality; binding assertions are right | split | L43-71 |
| wrong bindings invalidate | Actor, scope or plan drift cannot move Delivery and invalidates Receipt | Revision 99/hash fixture are adversarial | Refactor should pass | Yes | keep | L73-109 |
| consumed/expired/wrong intent | Receipt cannot replay or cross transition/time bounds | Fixed times are input-derived | Clock implementation refactor should pass | Yes | keep | L111-153 |
| revision drift stale | Changed Delivery state/plan invalidates earlier start authority | IDs/hashes derive fixture | Compatible metadata addition should pass | Yes | keep | L155-186 |
| object isolation | Receipt for one object cannot authorize another | Object refs are fixture inputs | Refactor should pass | Yes | keep | L188 onward |

### `feature-queue-ops.test.js`

| Item | Contract | HC | Sensitivity | Appropriate | Verdict | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| queue edits require confirmation | Proposed edits do not mutate until confirmed | F IDs/time fixture-derived; exact English summary is accidental | Copy change fails | Core failure appropriate; summary regex is not | split | L12-47 |
| operation coverage / guards | Insert/reprioritize/pause/update work; protected active move and duplicate block | Exact array IDs derive fixture | New metadata should pass | Yes, except internal English reasons | keep | L49-109 |
| auto-chain outcomes | Success advances, confirm pauses, skip defers failure | Status/action values are workflow protocol | Policy change should fail intentionally | Yes | keep | L111-149 |
| JIT decomposition | Only current feature materializes planned milestones | Exact generated `F002-M01/M02` couples naming algorithm | Alternative collision-safe naming fails | Partly | split | L151-170 |
| metric summary | Telemetry preserved and unavailable metrics become n/a | Exact result object couples optional fields | Adding metric field fails deep equality | No for compatible additions | rewrite | L172-191 |
| DAG board | Dependencies determine readiness/blockers/unlocks/parallel hints | Exact ordering and English reason may be incidental | Stable topological reorder fails | Partly; compare sets and structured status | rewrite | L193-217 |
| DAG cycle | Dependency cycle detected with evidence | Exact traversal path is algorithm-order dependent | Equivalent cycle rotation fails | No | rewrite | L219-233 |
| M07 docs phrases | Docs mention queue capabilities | M07 label and literal CLI/wording are historical | Copy/command docs restructuring fails | No; weak existence-by-regex test | rewrite | L235-251 |

### `hypo-claw-notification.test.js`

| Item | Contract | HC | Sensitivity | Appropriate | Verdict | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| format stop notification | Required event fields and exact final output are preserved | Hypo-Workflow/C16/local path are fixture input; ban on word `summary` is accidental | Adding a legitimate summary heading fails | No for negative wording regex | split | L45-58 |
| segment without truncation | Segments preserve exact ordered bytes within max size | 18/420 are boundary fixture values | Improved segment metadata should pass | Yes | keep | L60-81 |
| dry/test no external contact | Non-notify modes never spawn/contact external adapter | Local executable path is injected fixture | Refactor should pass | Yes | keep | L83-113 |
| notify CLI invocation | Confirmed notify uses only adapter CLI/stdin and required routing args | `/home/heyx/...` is fixture input, not discovered truth; exact args are adapter protocol | Adding harmless CLI arg fails | Partly; strict no-direct-contact is important | split | L115-161 |
| executable + prefix args | Configured executable/prefix args preserved | Machine paths and localhost are input-derived | Refactor should pass | Yes | keep | L163-194 |
| explicit confirmation | External notification cannot spawn without confirmation | Path fixture only | Refactor should pass | Yes | keep | L196-216 |
| long notify segments | Every ordered segment is delivered exactly once | 420 and payload fixture-derived | Alternate safe batching protocol fails | Appropriate if this adapter protocol is fixed | keep | L218-257 |
| clean exit without evidence retries | Exit zero without external evidence is not success | Exact English stderr is internal | Copy change fails | Behavioral retry appropriate; message equality not | split | L259-283 |
| failure retry preserves message | Failure queues complete original event and CLI replay context | Exact retry path/channel/status/args are internal serialization candidates | Configurable storage or added args fails | Mixed; preservation is contract, full shape is coupled | split | L285-319 |

### `legacy-write-fence.test.js`

| Item | Contract | HC | Sensitivity | Appropriate | Verdict | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| inventory completeness | Every known legacy writer family/entrypoint is inventoried | Exhaustive ID/module list is security registry, not sample project data | Adding a writer fails until fenced: desired | Yes | keep | L44-124, L126-150 |
| central fence all families/formats | Current/mixed/damaged workspaces reject every inventoried legacy writer read-only | Matrix derives inventory and format fixtures | Adding inventory entry expands test automatically | Yes | keep | L152-175 |
| high-risk entrypoints current | Lifecycle/continuation/log public entrypoints reject before mutation | Attempt list manually selected | Adding entrypoint can be missed | Existing failures right; completeness should derive inventory | parameterize | L177-225 |
| acceptance entrypoints residue | All acceptance paths fail closed with legacy residue | Entry list is a public security surface | New acceptance path can be missed | Existing failures right | parameterize | L227-249 |
| damaged manifest high-risk | Corrupt authority blocks lifecycle/log entrypoints without writes | Attempts manually selected | New entrypoint can be missed | Existing failures right | parameterize | L251-308 |
| legacy remains writable | Fence preserves legacy compatibility | `legacy_resume` and path are fixture input | Compatible writer refactor should pass | Yes | keep | L310-326 |
| public project writers current | Config/artifact/docs/readme/sync/TUI writers reject before first mutation | Exact writer IDs are security audit identities | Renaming ID fails even with equivalent fence | Desirable only if IDs are stable evidence keys | probe | L328-434 |
| CLI init and notify log chain | Process-level legacy chains fail before writes | CLI/fixture paths derived; env writer ID stable security hook | CLI layout move fails | Mostly; invoke public installed entry rather than source path if contract is packaging | probe | L436-490 |

### `maintenance-run.test.js`

| Item | Contract | HC | Sensitivity | Appropriate | Verdict | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| lifecycle schema, distinct kind | Maintenance Run supports lifecycle without impersonating Delivery types | Full RUN_STATUSES list is schema contract; forbidden keys stable boundary | Adding compatible status requires list update | Correct if status enum closed | keep | L10-53 |
| generic orchestration planning | Noon template and unrelated generic shape both plan valid queue items | Minimum item counts and template ref are fixture-derived | Planner may legitimately coalesce operations and fail count | Not necessarily | rewrite | L55-106 |
| partition discovery | Folder/tree sources flatten with per-item/batch review | Exact refs/counts derive fixture | Valid traversal ordering/aggregation changes fail | Mixed; validate sets and provenance | rewrite | L108-137 |
| resumable transitions | Pause/review/approve/verify/complete preserve cursor, token, evidence | Exact token/path generation and timestamps couple representation | Equivalent opaque token/storage ref change fails | Core state machine appropriate; representation not | split | L139-207 |

### `p0-configure-contract.test.js`

| Item | Contract | HC | Sensitivity | Appropriate | Verdict | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| default P0 gate | Cycle configuration gate exposes required decisions/defaults | Exact object deep equality/count likely couples config representation | Adding option/default fails broadly | Partly | split | L10-30 |
| inheritance/reuse | Cycle > snapshot > project > global > builtin provenance is recorded | Fixed time/value fixtures input-derived | Source label rename fails | Appropriate if labels serialized contract | keep | L32-60 |
| Progressive Discover order | P0 precedes Discover and emits configuration artifact | Exact path/question key are workflow contract candidates | Moving storage while preserving behavior fails | Verify documented ownership | probe | L62-72 |
| docs coverage | Guide/Init/Plan/spec collectively contain P0 concepts | One concatenated mega-regex allows wrong-file placement and breaks on copy edits | Documentation refactor easily fails or false-passes | No | rewrite | L74-91 |

### `pr-readonly-flow.test.js`

| Item | Contract | HC | Sensitivity | Appropriate | Verdict | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| inspect local archive only | Remote evidence is read, never remotely mutated, and archived locally | URLs/date/PR id are fixture-derived; exact archive `001` couples allocator | Different valid archive ID fails | Split allocation format from readonly behavior | split | L12-39 |
| review findings no remote writes | Review consumes diff/check/comment and writes local findings only | Exact call order and Chinese output wording are implementation/copy details | Parallel reads or copy edit fails | No for order/wording; remote-write absence is right | rewrite | L41-75 |
| redact reviewer secrets | Secret-like comment values never appear in notes/findings | Secret samples are adversarial fixtures | Redactor refactor should pass | Yes | keep | L77-96 |
| reject incapable provider | Required readonly provider capability is mandatory | Method name is interface contract | Alternative provider adapter shape fails intentionally | Yes | keep | L98-105 |

### `readme-spec.test.js`

| Item | Contract | HC | Sensitivity | Appropriate | Verdict | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| managed blocks/data sources | README specification declares managed regions and provenance | Exact heading list/order and seven blocks are document snapshot | Adding/renaming a valid section fails | No; parse structured marker declarations instead | rewrite | L8-36 |
| source paths explicit/exist | Every declared project source exists and mandatory authorities are listed | Required path list freezes repository layout; parser treats arbitrary inline code as paths | Legit file move fails widely | Partly; use machine-readable source schema and owner IDs | rewrite | L38-67 |
| full regen policy | Full regeneration obeys configured mode/permission/language/marker policy | Literal word regex is weak and copy-coupled | Copy edit fails; malformed policy can pass | No | rewrite | L69-81 |

### `review-artifacts.test.js`

| Item | Contract | HC | Sensitivity | Appropriate | Verdict | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| stable review paths | Valid segments map to owned review directory; traversal rejected | F002/M04 examples are fixture input; layout may be persisted contract | Storage migration fails intentionally if compatibility required | Yes, when persisted paths are compatibility surface | keep | L10-23 |
| valid schema/redaction | Supported verdict artifact normalizes and redacts secrets | Paths/round are fixture; schema fields stable | Compatible schema extension should pass | Yes | keep | L25-46 |
| invalid schema/reject secrets | Invalid verdict/missing refs/secret reject mode fail | Error field/code are structured contract | Validator internals can change without failure | Yes | keep | L48-66 |
| bounded retry/strict gate | Verdict drives bounded retry and strict blocking | Exact full objects, English reasons and default `3` couple policy/presentation | Added metadata or copy change fails | Core state transition right; full deep equality not | split | L68-104 |
| coverage checklist | All platform surfaces report checked/skipped evidence | Exact five-surface order freezes inventory | Adding platform surface fails deep equality | Failure could be desired only if closed schema; otherwise excessive | probe | L106-134 |

### `semantic-workflow-templates.test.js`

| Item | Contract | HC | Sensitivity | Appropriate | Verdict | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| templates complete/parseable/readable | Required semantic documents parse, have kind/title/Chinese content, exclude runtime protocol metadata | Ten-name exact list is template inventory contract; Chinese Unicode check is policy | New template passes, filename migration fails | Mostly | keep | L8-35 |
| continuous Progress/Execution | Plan linkage, mirrored status table and execution evidence fields are explicit | Exact Chinese headings/table syntax freeze presentation | Equivalent template redesign fails | No; should validate semantic sections via parser/schema | rewrite | L37-54 |
| session focus minimal | Session focus binds one Cycle and excludes runtime protocol metadata | Exact placeholder line/updated key are template contract | YAML formatting change fails | No; parse YAML and inspect keys | rewrite | L56-61 |
| example separates cycle roles | Example demonstrates closed/active/builds-on/parallel isolation | C001/C002/C003 names are fixture-local and input-derived | Example content rewrite may fail regex | Mostly; body prose regex brittle | split | L63-74 |
| Progress mirrors Plan | Example plan IDs/order/current are consistent | Cycle names fixture-local; table syntax parsed by regex | Markdown table formatting change fails | No; use semantic parser | rewrite | L76-86 |
| Experiment spans Cycles | Experiment references attempts across Cycles without owning tasks | Exact Attempt labels/Cycle IDs are example inputs | Copy/format change fails | Partly | split | L88-95 |

### `test-profile.test.js`

| Item | Contract | HC | Sensitivity | Appropriate | Verdict | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| spec compose + three scenarios | Specs/skills document profile composition and evidence rules | Exact headings/phrases and exactly three profiles freeze docs | Copy/new profile causes brittle updates | No | rewrite | L13-54 |
| selection composes / legacy | Preset-only remains compatible; profiles compose deterministically | `webapp+tdd` ordering is serialized contract candidate | Commutative representation change fails | Probe whether compose string is public | probe | L56-77 |
| workflow/preset not profiles | Known workflow/preset names are filtered from profiles | Exact ignored list freezes current workflows | Adding ignored workflow can be missed | Existing failure appropriate; derive names from registries | parameterize | L79-92 |
| analysis artifacts not analysis profile | Workflow kind stays distinct; inferred research profile retained | Fixture feature IDs irrelevant; structured fields stable | New profile inference may change expected list | Appropriate only if mapping is explicit policy | keep | L94-118 |
| contract merges requirements | Discover/runtime requirements union across selected profiles | Text regex for baseline/visual is wording-coupled | Prompt copy fails | Not fully; assert requirement IDs | rewrite | L120-131 |
| webapp requires browser evidence | Unit-only evidence blocks; browser/e2e passes | Evidence IDs are profile contract | Legit evidence alias fails unless normalized | Yes | keep | L133-151 |
| agent-service requirements | CLI/shared core/real run mandatory | Evidence IDs contract | Profile evolution fails intentionally | Yes | keep | L153-167 |
| agent-service rejects pseudo test | Declared real user scenario cannot be satisfied by pseudo method | Fixture plans explicit | New legitimate method type may fail | Mostly; normalization needed | keep | L169-216 |
| research baseline/script/delta | Research evidence requires executable comparison | `0.05` input-derived | Metric representation change may fail exact delta | Mostly | keep | L218-247 |
| batch artifact summaries | Rendered plan retains structured profiles next to category/verification | Markdown word matching is shallow/copy-coupled | Render redesign fails | Structured queue assertion enough; remove prose regex | split | L249-269 |
| default config controls | Default config enables automatic composed profiles | Exact defaults are product policy | Default policy change should fail intentionally | Yes | keep | L271-275 |

### `workspace-transaction.test.js`

| Item | Contract | HC | Sensitivity | Appropriate | Verdict | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| install zones / manifest last | Transaction installs allowed data then activates manifest, with no leaked staging text | Paths/data are fixture; action/kind stable | Internal staging layout can change and pass | Yes | keep | L37-65 |
| crash after prepare rolls back | Prepared-only interruption restores original state idempotently | Fault phase name is test seam contract | Phase rename fails test harness | Acceptable only if injector is supported testing API | probe | L67-81 |
| partial install restores all | Mid-install interruption rolls back every target | Index 0 is fixture boundary | Install order change may shift injected point but contract remains | Could false-pass/fail; inject after observed first install, not index | rewrite | L83-101 |
| all data before activation rolls forward | Fully installed data recovers forward and activates manifest | Phase name seam | Refactor phase naming fails | Probe seam stability | probe | L103-117 |
| after activation finalizes | Activated transaction recovery finalizes idempotently | Phase/action strings are state-machine contract | Refactor may fail if test seam/internal action renamed | Mostly | keep | L119-133 |
| prepared target drift fails closed | Concurrent external target drift is preserved and blocks recovery | Chosen first key is fixture | Write-set order change selects another path but still valid | Yes | keep | L135-160 |
| stale ID not overwritten | Pending transaction ID cannot be reused; recovery restores | IDs fixture-derived | Refactor should pass | Yes | keep | L162-182 |
| staged tamper rejected | Prepared bytes hash mismatch never installs/activates; evidence retained | Finds exact staged payload by scanning internal runtime | Staging encoding/encryption refactor fails | Contract valid, probe mutator is implementation-coupled | rewrite | L184-207 |
| pre-activation target drift | External mutation before activation is preserved and conflict retained | Fault phase seam/internal order | Commit algorithm refactor can fail harness | Contract valid; expose semantic drift hook | rewrite | L209-228 |
| activated manifest missing/old | Recovery restores staged authority after post-activation manifest drift | Exact old/missing matrix meaningful; phase seam | Internal phase rename fails | Mostly | keep | L230-281 |
| different ID recovers abandoned | New transaction first resolves abandoned pending transaction | Exact rollback policy is product safety contract | Alternative safe explicit-block policy would fail intentionally | Yes | keep | L283-298 |
| ancestor/descendant rejected prewrite | Prefix-colliding write set is rejected in either order without mutations | Paths/order matrix adversarial | Refactor should pass | Yes | keep | L300-334 |
| traversal/absolute/outside rejected | Owned-zone and traversal boundary fails before staging | `.pipeline/state.yaml` protected and path samples are security fixtures | Adding allowed zone may intentionally fail one case | Yes if zones are contract | keep | L336-362 |
| symlink escape rejected | Allowed-looking path cannot traverse symlink outside root | Fixture path adversarial | Refactor should pass | Yes | keep | L364-382 |
| damaged manifest blocks | Invalid current authority blocks transaction without mutation | Invalid YAML fixture | Parser refactor should pass | Yes | keep | L384-400 |

## Scenario audit

| Item | Contract | HC | Sensitivity | Appropriate | Verdict | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| c21/s77 Codex Hook Process | Real process lane resolves repo root and runs official hook contract | `c21`, `s77`, M7 labels historical only; runner targets one maintained test file | Renaming/splitting test file breaks runner despite behavior remaining | No for physical file dependency; catalog coverage is narrow | rewrite | `run.sh`, checklist |
| v10/s62 Analysis Preset Runtime | Historical analysis preset assets and auto-chain policy | Hardcodes `.pipeline/archives/C3-.../feature-queue.yaml`, exact `default_gate/auto_chain` text | Archive rename or semantic migration fails | No; direct reference-repository hardcode | remove | `run.sh` queue assignment |
| v3/s13 Hook Session Start | Historical shell hook behavior across startup/resume/compact/clear | Hardcodes legacy `state.yaml`, prompt fields and manual `/path/to/...`; no executable runner | Product changes do not fail because checklist is not run | No; non-test mislabeled Scenario | remove | checklist only, config fixture |
| v6/s23 Init Existing Project | Historical four-phase init documentation | Exact English headings in one Markdown file | Copy/structure change fails while behavior is unchanged | No | remove | `run.sh` four `rg` checks |
| v8.1/s33 Import History Merge | Historical merge-import documentation | Exact shell command, milestone name and prose duplicated across docs | Copy change fails; implementation regression passes | No | remove | `run.sh` regex checks |
| v8.2/s43 Registration | Historical command/version registration | Explicitly hardcodes obsolete `41 个用户指令`, command list and old checklist counts | Any valid command inventory evolution fails | No; direct fixed-count anti-contract | remove | `run.sh`, checklist |
| v9/s53 CLI/TUI Setup | Historical setup-only CLI flow | `qwen/kimi/team-strict` are fixture inputs; legacy `.opencode/commands` paths and exact help prose frozen | Adapter path evolution/copy changes fail in many unrelated assertions | Partly; useful CLI smoke should be rebuilt against current generated manifest | reclassify | `run.sh` |

## Findings

### High

1. **Quarantined Scenario contains direct reference-repository hardcode.** `v10/s62` reads `.pipeline/archives/C3-opencode-multi-agent-matrix-and-v10-analysis-preset/feature-queue.yaml`. This is exactly the class of project/Cycle-specific assertion that must not become a reusable test contract. Remove it rather than parameterizing the archive name.
2. **Historical command-count assertion is an accidental invariant.** `v8.2/s43` requires `41 个用户指令` while its checklist says 28. It cannot provide meaningful current regression evidence and should be removed.
3. **Current-repository self-snapshot in executable unit test.** `claude-resume-namespace` audits `.` and expects an incidental `sessionstart-resume-matcher` finding. It can fail because repository metadata changes even when namespace ownership remains correct. Replace with isolated positive/negative fixtures.
4. **Documentation-regex tests dominate several supposed behavior gates.** P0 docs, README spec, test-profile spec, feature M07 docs and semantic template presentation freeze headings, prose and physical paths. Valid copy/layout changes cause broad failures while runtime behavior can remain broken. Replace with structured contracts or remove from executable gate.

### Medium

1. `compact-end-of-run` contains unexplained `targets.length >= 5` and mtime sleeps. The count is accidental and the timestamp check can be filesystem-sensitive.
2. Deep Plan Ask tests encode one exact challenge order/default even when multiple unanswered questions would satisfy the interaction contract.
3. Feature DAG asserts one exact DFS cycle rotation and list order. Equivalent graph results can fail.
4. Maintenance Run tests bind opaque resume-token/evidence-path serialization and minimum operation counts to fixtures.
5. PR readonly tests assert serial provider call order and exact archive allocator output; parallelized reads or a safe allocator change would fail.
6. Hypo-Claw tests correctly inject machine-specific paths as fixture input, but several cases overassert full CLI/retry internal shape and exact error prose. These literals are not evidence of production hardcoding; the issue is excess coupling.
7. Workspace transaction fault injection uses internal phase names and install index. Safety contracts are valuable, but the probe interface should be explicitly supported or replaced by semantic fault points.
8. Delivery Receipt tests conditionally skip five security cases when modules fail to import. Import/export failure is caught by the first case, but the default test summary can understate lost behavioral coverage.

### Low

1. Several tests use broad bilingual error regexes; these are generally tolerant but can false-pass on unrelated failures. Prefer structured error codes when available.
2. Example semantic-workflow tests use concrete C001/C002/C003 values appropriately as fixture data, but prose regexes make them presentation-sensitive.
3. Artifact Catalog fixtures use project names, times, paths and Cycle IDs appropriately as inputs; exact inventory loops should be split from per-kind behavior so a new kind does not create unrelated failures.

## Counterfactual probe candidates

1. `claude-resume-namespace`: add an unrelated safe plugin metadata entry / move SessionStart matcher and confirm namespace audit still passes.
2. `compact-end-of-run`: merge/add a compact target without changing dirty-only semantics; current count assertion should not be authoritative. Test under coarse mtime resolution.
3. `deep-plan-ask`: return a different valid unanswered challenge and reorder non-default questions; verify contract remains satisfied.
4. `delivery-receipts`: add a backward-compatible context metadata field; current exact key equality will fail without authorization weakening.
5. `feature-queue-ops`: rotate a detected dependency cycle and reorder equally-ready nodes; current deep equality will fail despite equivalent graph evidence.
6. `maintenance-run`: coalesce queue items while preserving source coverage/provenance; current minimum counts may fail.
7. `pr-readonly-flow`: execute provider reads concurrently; exact call order fails although no remote write occurs.
8. `review-artifacts`: add a supported platform surface; exact surface list/order may fail despite improved coverage.
9. `test-profile`: add another workflow/preset name and prove registry-derived exclusion; manual ignored list currently leaves a gap.
10. `workspace-transaction`: change install order/staging representation while retaining atomicity; index/content-scanning probes expose internal coupling.

## Fixture and catalog observations

- `tests/regression-catalog.json` correctly marks six of this shard's seven historical Scenarios quarantined, but quarantine is not a reason to preserve valueless fixed-count/archive-path assertions indefinitely. Recommended catalog actions are recorded above.
- Maintained `c21/s77` is a thin wrapper over one physical test file. It verifies that file rather than the declared cross-event contract independently; a registry-driven maintained process suite would survive test-file refactors.
- `core/test/fixtures/c21-m6` and `c21-m7` centralize time, actor, hook payload and store setup. Their concrete values are legitimate fixture inputs. Exact output assertions must still derive from those inputs rather than treat names/times as universal truth.
- `maintenance-run` fixture files are useful heterogeneous inputs; assertions based on minimum item counts should instead prove source-item coverage and provenance.
- No shard evidence indicates that `/home/heyx/Hypo-Claw/...` is read as a universal production default: it is passed into the function by the test. It should not be reported as production hardcoding without a source audit.

## Zero-omission self-check

- Inventory command yielded 18 paths at global indices 7, 17, ..., 177.
- Top-level declarations recounted: `4+8+6+4+4+8+6+8+9+8+4+4+4+3+5+6+11+15 = 117`; every declaration has exactly one row above.
- Scenario sort/modulo selection yielded indices 7, 17, 27, 37, 47, 57 and 67; all seven have exactly one row.
- Direct fixtures/catalog/runners checked for every item that reads them.
- Verdict total for executable cases: keep 55, split 21, rewrite 26, parameterize 6, probe 9, remove 0, reclassify 0 (sum 117).
- Scenario verdict total: keep 0, split 0, rewrite 1, parameterize 0, probe 0, remove 5, reclassify 1 (sum 7).
