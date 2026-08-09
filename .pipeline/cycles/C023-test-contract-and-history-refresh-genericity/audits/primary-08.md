# Primary Test Contract Audit - Shard 08

## Scope and method

- Repository: `/home/heyx/Workspace/Hypo/Hypo-Workflow`
- Rule: normalized path sort, zero-based index `% 10 == 8`.
- Core coverage: 18 files, 122 top-level cases. `routingTest` and `revisionTest` aliases are counted as cases.
- Scenario coverage: 7 catalog entries. The catalog has 76 normalized Scenario entries, so shard 8 contains indices 8 through 68; the similarly sorted physical-directory list is not authority.
- This was a read-only source/fixture audit. No production code, test, fixture, catalog, or runner was changed and no test was executed. Literal classification follows `METHODOLOGY.md`: `C` = stable contract, `F` = fixture-derived/sample input, `H` = repository/history/implementation hardcode.

## Covered files

| Index | Path | Cases |
| ---: | --- | ---: |
| 8 | `core/test/audit-baseline.test.js` | 2 |
| 18 | `core/test/c21-m8-regression-contract.test.js` | 8 |
| 28 | `core/test/c23-m7-worker-routing.test.js` | 21 |
| 38 | `core/test/claude-settings-sync.test.js` | 10 |
| 48 | `core/test/completion-report-contract.test.js` | 5 |
| 58 | `core/test/deep-plan-convert.test.js` | 8 |
| 68 | `core/test/docs-governance.test.js` | 8 |
| 78 | `core/test/final-assistant-output.test.js` | 5 |
| 88 | `core/test/init-automation-contract.test.js` | 4 |
| 98 | `core/test/lifecycle-policy.test.js` | 6 |
| 108 | `core/test/maintenance-template-learning.test.js` | 2 |
| 118 | `core/test/p2-technical-route-contract.test.js` | 6 |
| 128 | `core/test/profile-platform.test.js` | 8 |
| 138 | `core/test/readme-update.test.js` | 9 |
| 148 | `core/test/revision-start-boundary.test.js` | 5 |
| 158 | `core/test/session-source-discovery.test.js` | 3 |
| 168 | `core/test/utils.test.js` | 7 |
| 178 | `core/test/yaml-parser-unification.test.js` | 5 |

### Covered Scenario paths

| Index | Full catalog path | Classification |
| ---: | --- | --- |
| 8 | `tests/scenarios/v0.5/s07-full-hypo-todo` | quarantined |
| 18 | `tests/scenarios/v11/s63-init-automation-non-git` | quarantined |
| 28 | `tests/scenarios/v4/s14-multi-dim-scoring` | quarantined |
| 38 | `tests/scenarios/v6/s24-audit-report` | quarantined |
| 48 | `tests/scenarios/v8.1/s34-import-history-time-gap` | quarantined |
| 58 | `tests/scenarios/v8.3/s44-showcase-skeleton` | quarantined |
| 68 | `tests/scenarios/v9/s54-opencode-plugin-scaffold` | quarantined |

## Core case audit

In the tables, “yes” under sensitivity means a contract-preserving change can plausibly fail the test. Evidence uses source line anchors.

### `audit-baseline.test.js`

| Item | Contract | Hardcode | Valid-change sensitivity | Failure appropriate | Verdict | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| repository root exposes npm test | Root has a canonical runnable test entry. | C: `package.json`, `scripts.test`; H: regex requires `core` or `node --test`, `private:true`. | Yes: another runner or workspace setup fails. | Only partly; runnable equivalence is not exercised. | rewrite | L14-25 |
| C17 audit inventory exposes categories | Audit API returns structured debt categories. | H: C17 label, six implementation-era category keys, alias export. | Yes: categories can evolve or API can be renamed. | Failure may be unrelated to current audit usefulness. | rewrite | L5-12, L28-47 |

### `c21-m8-regression-contract.test.js`

| Item | Contract | Hardcode | Valid-change sensitivity | Failure appropriate | Verdict | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| catalog exactly partitions inventory | Every executable test/registered Scenario is classified once. | C: schema/classes; implementation path convention. | Low; adding a test correctly requires catalog classification. | Yes, this is the gate's purpose. | keep | L86-107, L341-376 |
| retired CLI dependents quarantined | A retired surface and direct dependents cannot enter maintained gate. | C while retirement holds: CLI and replacement routes; scanner is textual. | Yes: valid replacement route or indirect invocation changes fail/escape. | Partly; text scanning has false positives/negatives. | probe | L109-130, L405-443 |
| quarantine reason and replacement | Quarantine debt must be explained and linked to maintained coverage. | C: required metadata and resolvable replacement. | Low. | Yes. | keep | L132-153 |
| maintained Core anchors C21 M1-M8 | Current behavior lane remains represented. | H: 8 old milestone IDs and 31 exact test paths. | Yes: rename/split/reorganize any equivalent test fails. | No; it protects a historical implementation inventory. | rewrite | L24-73, L155-172 |
| maintained Scenario anchors thin C21 lane | Current end-to-end behaviors remain represented. | H: exact `c21/s70..s77` paths. | Yes: replacement Scenario fails despite same behavior. | No; directory identity is mistaken for behavior. | rewrite | L75-84, L174-189 |
| runners fail closed on invalid catalogs | Runner rejects missing, overlap and incomplete quarantine metadata. | F mutations; C error classes. | Low; wording regex is broad. | Yes. | keep | L191-253 |
| npm maintained/all/quarantine routing | Public npm test commands select catalog partitions and do not rewrite corpus. | C scripts; H: exact runner filename and output count formatting. | Yes: equivalent runner rename/output redesign fails. | Selection mismatch is valid; formatting failure is not. | split | L255-297 |
| Scenario maintained/all/quarantine routing | Scenario CLI selects partitions and dry-run is non-mutating. | C flags/sets if public; H output count formatting. | Yes: equivalent output redesign fails. | Selection/non-write failures valid; display regex weak. | split | L299-331 |

### `c23-m7-worker-routing.test.js`

| Item | Contract | Hardcode | Valid-change sensitivity | Failure appropriate | Verdict | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| routing API exports | Focused and root APIs expose routing functions. | C public exports; H milestone label only. | Low. | Yes. | keep | L88-96 |
| strict routing schema | One strict policy schema, defaults, modes, version and threshold. | C if v1 policy freezes these literals. | Medium: a valid v2/additive key fails intentionally only with contract revision. | Yes for v1; exact `$defs` count may overreach. | split | L98-153 |
| legacy seven-field classifications | Legacy inputs deterministically map to five routes/reasons. | F fixture values; C route/reason enums. | Low if compatibility is intended. | Yes. | keep | L155-171; `fixtures/c23-m7/worker-routing.json` |
| mechanical operations override size | Canonical mechanical kinds route mechanically absent stronger signals. | C operation/reason mapping. | Medium: adding a mechanical kind requires fixture update. | Appropriate when mapping contract changes. | keep | L173-185 |
| higher priority beats mechanical | Security/conflict/uncertainty precedence is invariant. | C precedence and reason codes. | Low. | Yes. | keep | L187-222 |
| full precedence ordering | Five routing classes obey deterministic priority. | C route order. | Medium if policy intentionally evolves. | Yes under v1 policy. | keep | L224-268 |
| approved semantic signal mapping | Ten semantic signals map to explicit route/reason. | C policy table. | Medium; adding signals is fine, changing mapping fails properly. | Yes. | keep | L270-339 |
| two distinct failures escalate | Only distinct execution-route failures count and threshold is two. | C threshold for v1; F route IDs. | Medium if threshold becomes configurable beyond frozen v1. | Yes under stated policy. | keep | L341-361 |
| assessment bounded/secret-safe | Assessment schema is bounded, visible, rejects prompt/reasoning/secrets. | C bounds (1024/16) and forbidden fields; F marker. | Low for security; copy changes do not matter. | Yes. | keep | L363-403 |
| identifiers 128-byte UTF-8 boundary | Semantic IDs are byte-bounded and error output does not echo input. | C security/protocol bound. | Low. | Yes. | keep | L405-484 |
| attempts 256 / route IDs 64 caps | Inputs and persisted failure state are bounded without residue. | C DoS/storage bounds. | Medium if bounds intentionally revised. | Yes under versioned contract. | keep | L486-548 |
| host capability modes | Off/advisory/required have explicit fallback/start semantics. | C mode state table. | Low. | Yes. | keep | L550-570 |
| config mode validation/default | Config defaults advisory, accepts three modes, rejects unknown. | C config API. | Low. | Yes. | keep | L572-595 |
| Resume preserves routing | Runtime/Continuation survive fresh-process resume. | F object IDs/times; C persisted fields. | Low. | Yes. | keep | L597-605; direct C23 fixture helpers |
| lifecycle write preserves routing | Delivery write does not erase routing. | F transaction IDs. | Low. | Yes. | keep | L607-626 |
| Journal/Recovery preserve routing | Recovery surfaces retain route and visible assessment. | C persisted recovery contract. | Low. | Yes. | keep | L628-657 |
| SubagentStart records/displays routing | Hook projection records semantic route without selecting host/model. | C event/output boundary. | Medium: exact display formatting may fail. | Persistence valid; presentation exactness may not be. | split | L659-683 |
| SubagentStop freezes started routing | Stop uses worker's start-time routing despite later Runtime changes. | C temporal consistency. | Low. | Yes. | keep | L685-726 |
| unrouted worker stays unrouted | Later Runtime routing cannot retroactively assign an open worker. | C temporal consistency. | Low. | Yes. | keep | L728-793 |
| routing orthogonal to topology/evidence/acceptance | Routing metadata cannot alter execution authority. | C architecture/safety boundary. | Low. | Yes. | keep | L795-814 |
| routing policy is pure/no host resolution | Equal inputs produce equal output and no model/provider fields/side effects. | C purity and ownership boundary. | Low. | Yes. | keep | L816 onward |

### `claude-settings-sync.test.js`

| Item | Contract | Hardcode | Valid-change sensitivity | Failure appropriate | Verdict | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| empty-project sync | Claude adapter creates valid settings and plugin metadata. | C paths/schema; F project values. | Medium: additive generated metadata can break deep equality. | Core files/shape valid; exact object may overfail. | split | L15-39 |
| merge/backup/idempotence | User settings survive, first mutation is backed up, rerun is stable. | F values; C ownership semantics. | Low. | Yes. | keep | L40-85 |
| project-local API env | Managed config projects configured API env. | C keys if public; F URLs/tokens. | Low. | Yes. | keep | L86-128 |
| user-owned API env conflict | Sync refuses overwrite of unowned env. | C ownership boundary. | Low. | Yes. | keep | L129-157 |
| replace managed API env | Previously managed env can be updated. | C ownership marker behavior. | Low. | Yes. | keep | L158-185 |
| replace managed hooks | Managed hook blocks are replaced while user blocks remain. | C ownership merge. | Medium if hook set legitimately changes; fixture should derive expected set. | Usually yes, but exact block inventory can overfail. | parameterize | L186-212 |
| managed-target conflict | User-owned target collision blocks write. | C non-overwrite boundary. | Low. | Yes. | keep | L213-237 |
| user-owned main model conflict | Unmanaged model selection is protected. | C target-owned boundary. | Low. | Yes. | keep | L238-252 |
| replace managed main model | Managed model value may be refreshed. | C ownership boundary; target-specific key. | Medium as model config ownership evolves. | Yes only while source owns field. | probe | L253-266 |
| CLI supports claude-code sync | Public sync route invokes adapter. | C command/platform. | Low. | Yes. | keep | L267 onward |

### `completion-report-contract.test.js`

| Item | Contract | Hardcode | Valid-change sensitivity | Failure appropriate | Verdict | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| shared response fields | Completion response retains and renders eight required meanings. | C semantic fields; H exact internal field names if rendering remains equivalent. | Medium. | Missing meaning is valid; internal rename is not. | split | L10-68, L93-132 |
| templates expose fields | Every report template carries required completion meanings. | H exact template path inventory; tolerant matchers. | Yes: new/reorganized templates escape or fail. | Partial; no discovery and cross-file matches can mask absence. | rewrite | L70-76, L134-142 |
| completion surfaces share fields | Report/milestone/cycle/debug/audit/patch expose all meanings. | H exact source paths; fields may be distributed across combined files. | Yes. | Can pass while an individual output lacks fields; can fail on moves. | rewrite | L78-91, L144-155 |
| forbids path-only responses | Final response must explain artifact substance. | C behavior; H exact English sentences/examples. | Yes: editorial rewrite fails. | No, prose regex is not behavioral verification. | rewrite | L157-167 |
| domain explanation for learning/research | Learning/research artifacts teach concepts/checkpoint in chat. | C behavior; H nine exact phrases. | Yes. | No, keyword presence is weak and brittle. | rewrite | L169-185 |

### `deep-plan-convert.test.js`

| Item | Contract | Hardcode | Valid-change sensitivity | Failure appropriate | Verdict | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| public convert exports | Four Deep Plan conversion APIs are public. | C API names. | Low. | Yes. | keep | L8-13 |
| targeted drilldown only | Drill updates selected track/card and preserves siblings. | F IDs/text/times. | Low. | Yes. | keep | L15-78 |
| ambiguous target rejected atomically | Non-unique title/topic cannot fan out or mutate. | F names; broad error semantics. | Low. | Yes. | keep | L80-136 |
| readiness depth gates | Directional, architecture and implementation depths enforce evidence. | C readiness semantics; F IDs. | Medium if additive readiness evidence changes exact gap text. | Allowed/blocked valid; gap keyword assertion may overfail. | split | L138-196 |
| conversion emits compact context | Ready package converts, persists useful context, omits raw transcript. | C privacy/contents; H English section headings and filename if not public. | Yes: localized/reformatted equivalent output fails. | Privacy/persistence failures valid; headings not. | split | L198-242 |
| no default directional conversion | Default conversion cannot bypass implementation readiness. | C safety gate. | Low. | Yes. | keep | L244-276 |
| archived conversion blocked | Archived direct/active references cannot convert. | C lifecycle gate. | Low. | Yes. | keep | L278-314 |
| package path escape rejected | Tampered package path cannot write outside package. | C security boundary; F `DP001` path. | Low. | Yes. | keep | L316-338 |

### `docs-governance.test.js`

| Item | Contract | Hardcode | Valid-change sensitivity | Failure appropriate | Verdict | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| exactly ten routes/docs deferred | Public route set and deliberate absence of docs route. | H exact count/list unless frozen release API. | Yes: valid command addition fails globally. | Only appropriate for an explicitly versioned surface. | parameterize | L18-32 |
| docs ownership map | Documents declare ownership/source/update policy. | H exact document paths including alpha.1 release note. | Yes: release bump/reorganization fails. | No for version/path churn. | rewrite | L34-61 |
| docs check rejects invalid README | Governance detects internals, stale derived count and missing license. | F deliberately bad README; C check categories. | Low. | Yes. | keep | L63-78 |
| repair preview is zero-write | Preview lists generated work and preserves narrative README. | C no-write; H exact nine planned paths. | Yes: valid doc addition/removal fails. | No for inventory drift; write invariant valid. | split | L80-112 |
| configuration reference coverage | User docs cover governed automation and safety settings. | C keys/safety concepts; H exact wording/platform list. | Medium. | Missing safety concept valid; editorial/platform evolution may overfail. | split | L114-140 |
| Chinese-body docs | Human-facing docs satisfy configured language policy. | C policy; H two spot-check paths. | Low. | Aggregate checker is appropriate; spot checks weak. | keep | L142-148 |
| alpha.1 release coverage | One historical release note is bilingual and linked. | H exact `v15.0.0-alpha.1` paths/headings/README links. | Yes: current release bump or entrypoint cleanup fails. | No as maintained gate; historical immutability belongs artifact validation. | reclassify | L150-164 |
| stale release claims rejected | Release fact checker detects stale count/platform denial. | F invalid claims; C categories. | Low. | Yes. | keep | L166-175 |

### `final-assistant-output.test.js`

| Item | Contract | Hardcode | Valid-change sensitivity | Failure appropriate | Verdict | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| parse exact last Codex output | Parser returns exact final assistant bytes and provenance without redaction/summarization. | F dated path/message/token-like strings; C exactness. | Low. | Yes. | keep | L9-48; direct JSONL fixture |
| capture explicit session path | Capture supports explicit local Codex path. | F fixture output/path. | Low. | Yes. | keep | L50-64 |
| resolve session ID | Capture finds a session in dated hierarchy by ID. | F date/ID; implementation directory convention may be compatibility contract. | Medium if Codex storage layout changes. | Appropriate as adapter compatibility; should version fixture. | keep | L66-82 |
| missing assistant fails closed | No assistant message yields no fabricated output. | F fixture; C fail-closed behavior. | Low. | Yes. | keep | L84-99 |
| OpenCode remains probe-only | Unsupported exact extraction cannot claim captured output. | H current capability state may become obsolete. | Yes: implementing verified extraction makes test fail. | Failure would represent a valid feature addition. | reclassify | L101-116 |

### `init-automation-contract.test.js`

| Item | Contract | Hardcode | Valid-change sensitivity | Failure appropriate | Verdict | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| non-git init with policy | Init works without Git, stores chosen level, retains safety defaults. | C CLI/config defaults; H retired CLI path per catalog. | Yes: Skill-first replacement can be valid but fails. | Legacy CLI behavior is quarantined elsewhere; maintained classification is suspect. | reclassify | L9-36 |
| default balanced/reject invalid | Default and enum validation are stable. | C levels; H retired CLI. | Medium. | Policy failure valid, invocation surface obsolete. | reclassify | L38-69 |
| shell validator rejects invalid | Validator enforces automation enum. | C enum/message meaning; H exact stdout wording and script path. | Yes. | Exit failure valid; exact sentence is not. | split | L71-95 |
| init docs distinguish non-git/import | Docs explain normal bootstrap vs git-bound import and modes. | C semantics; H broad collection/exact prose. | Yes: editorial rewrite fails. | Keyword presence weak. | rewrite | L97 onward |

### `lifecycle-policy.test.js`

| Item | Contract | Hardcode | Valid-change sensitivity | Failure appropriate | Verdict | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| kind derives defaults | Cycle-scoped workflow kind derives preset/lifecycle. | C enum/default mapping; F cycle number. | Low. | Yes. | keep | L18-55 |
| reject routes needs_revision | Rejection persists feedback reference and canonical next action. | C state transition; F IDs/times. | Low. | Yes. | keep | L57-101 |
| accept + continuation | Acceptance with planned continuation routes follow-up planning. | C state precedence. | Low. | Yes. | keep | L103-148 |
| completed follow-up does not override acceptance | Pending acceptance dominates stale completed continuation. | C state precedence. | Low. | Yes. | keep | L150-196 |
| execution beats stale accepted mirrors | Active execution wins over stale acceptance state. | C state precedence. | Low. | Yes. | keep | L198-214 |
| lifecycle docs contain contracts | Skills/references mention lifecycle concepts. | H exact old paths including removed `skills/status`; prose regex. | Yes. | Likely stale and text-only; fails on documentation reorganization. | rewrite | L216-235 |

### `maintenance-template-learning.test.js`

| Item | Contract | Hardcode | Valid-change sensitivity | Failure appropriate | Verdict | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| recurring runs create pending candidate | Three matching runs yield one non-authoritative review candidate with provenance. | F dates/IDs; C minimum occurrence/input option and authority state. | Low. | Yes. | keep | L10-39; `fixtures/maintenance-run/daily-ai-noon-report.json` |
| no implicit authority promotion | Validation cannot promote; explicit confirmed user review can. | C authority/security states; F local evidence path. | Low. | Yes. | keep | L41-93 |

### `p2-technical-route-contract.test.js`

| Item | Contract | Hardcode | Valid-change sensitivity | Failure appropriate | Verdict | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| fixture fields every milestone | P2 milestone artifacts contain six route-decision fields. | C fields if schema; H `C\d+-M\d+` raw indentation parser. | Yes: YAML formatting/ID evolution fails. | No for formatting; missing fields valid. | rewrite | L6-13, L25-41, L162-173 |
| docs gate proposed/P3 | Planning docs require solution/route/research before advancement. | C behavior; H four exact paths and prose ordering. | Yes. | Regex can both overfail editorial changes and pass scattered keywords. | rewrite | L43-69 |
| research-required hard gate | Unknown dependencies require research/user decision/explicit deferral. | C trigger taxonomy and safety gate; H prose regex. | Medium. | Behavior failure valid; text arrangement failure weak. | rewrite | L71-106 |
| challenge returns P2 to revision | User route challenge cannot silently advance. | C stage transition; H prose patterns. | Medium. | Same text-only weakness. | rewrite | L108-126 |
| P3 preserves P2 route fields | Generated prompts retain accepted technical route information. | C semantic fields; H exact fixture/path/heading tokens. | Medium. | Missing semantic data valid; headings/path changes not. | split | L128-148 |
| ordinary plan avoids Feature DAG | Single-feature planning remains simple. | C UX behavior; H precise sentences. | Yes. | Presence regex does not demonstrate actual Plan behavior. | rewrite | L150-160 |

### `profile-platform.test.js`

| Item | Contract | Hardcode | Valid-change sensitivity | Failure appropriate | Verdict | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| normalize known presets | Legacy profile names normalize expected behavior. | C compatibility names/fields. | Medium if profiles are retired. | Appropriate only while public. | keep | L12-16 |
| select config profile | Config selects strict profile. | C config behavior. | Low. | Yes. | keep | L18-22 |
| four profiles preserve gates | Every profile keeps high-risk confirmations. | C gates; H exact four-profile inventory and many internal settings. | Yes: adding a safe profile fails exact list. | Safety loop valid; exact list/internal checks overfail. | split | L24-50 |
| profile docs/yaml | Profile metadata is understandable and invalid name rejected. | H Chinese keywords/YAML text; C invalid lookup. | Medium. | Mixed. | split | L52-58 |
| config docs list profile choices | Docs list current profile registry and safety terms. | H duplicate exact list. | Yes: profile addition requires multiple edits. | No; derive from registry/check generated docs. | parameterize | L60-67 |
| OpenCode native primitives | Capability map exposes adapter affordances. | C adapter contract strings. | Medium if host terminology/capability evolves. | Appropriate under versioned adapter contract. | keep | L69-76 |
| third-party adapter targets | Cursor/Copilot/Trae map to generated target paths/routing. | C adapter paths if supported; H partial platform selection. | Medium. | Yes for broken installed layout; misses other platforms. | parameterize | L78-85 |
| Codex runtime assumptions | Codex delegation stays in host runtime and excludes external model routing. | C ownership/security boundary; exact strings partly implementation. | Medium. | External provider leak valid; terminology changes not. | split | L87-93 |

### `readme-update.test.js`

| Item | Contract | Hardcode | Valid-change sensitivity | Failure appropriate | Verdict | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| default README config | Default repair is loose/auto. | C if public config defaults. | Low. | Yes. | keep | L16-21 |
| render blocks from assets | Counts/platforms derive from sources. | H asserts retired `/hw:release`, `/hw:chat`, duplicate assertions, fixed watchdog count. | Yes: valid command removal already conflicts with current ten-command surface. | No; demonstrably stale contract. | rewrite | L23-41 |
| replace managed block only | Marker replacement preserves surrounding narrative. | C marker protocol; F text. | Low. | Yes. | keep | L43-64 |
| strict missing marker fails | Strict mode cannot silently append unmanaged content. | C write-safety behavior. | Low. | Yes. | keep | L66-71 |
| stale managed facts | Checker detects version/count mismatch from fixture sources. | F versions/counts; H fixture manually emulates parser source. | Medium. | Yes if derived dynamically; current fixture is acceptable negative sample. | keep | L73-99 |
| stale narrative count | Narrative count differing from actual registry is rejected. | F 36/37; expected `actual===37` couples diagnostic shape. | Medium. | Detection valid; exact diagnostic number is fixture-derived and reasonable. | keep | L101-126 |
| Chinese Quick Start and six platforms | README must include repository import, entrypoint, resume, subagent guidance and supported platforms. | H test name “six”, exact current platform identities; fixture count 36. | Yes: platform additions/removals or policy evolution fail. | Concepts valid; fixed inventory should derive from capability registry. | parameterize | L128-161 |
| reject English/external routing | Chinese-first entry and Codex no-external-routing policy. | F invalid prose/model; H exact platform/command list incidental. | Low for targeted failures. | Yes. | keep | L163-194 |
| update selected blocks | Writer changes only requested marker and reports it. | C API; count derived dynamically. | Low. | Yes. | keep | L196-224 |

### `revision-start-boundary.test.js`

| Item | Contract | Hardcode | Valid-change sensitivity | Failure appropriate | Verdict | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| separate revise/approve/start APIs | Approval never implies start and revision is separate. | C public authority operations. | Low. | Yes. | keep | L42-50 |
| feedback writes Records/no edits/start | Direction change records feedback/revised plan, invalidates stale start, preserves product. | F IDs/times/queue example; C atomic authority boundary. | Low. | Yes. | keep | L52-118; `fixtures/c21-m6/helpers.js` |
| executing revision stops/resets | Revision during execution stops work, resets milestones, needs approval and new start. | F M1-M3 IDs; C state behavior. | Medium: milestone-reset representation can evolve. | State/authority failure valid; exact arrays may overfail additive metadata only if deep-compared. | keep | L120-208 |
| missing proposal atomic rejection | Feedback alone cannot partially revise authority or start. | C schema/atomicity; broad error regex. | Low. | Yes. | keep | L210-229 |
| rejection then approval still no start | Manual rejection/revision/reapproval ends waiting-to-start. | C two-gate authorization. | Low. | Yes. | keep | L231-274 |

### `session-source-discovery.test.js`

| Item | Contract | Hardcode | Valid-change sensitivity | Failure appropriate | Verdict | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| safe probes for configured kinds | Configured local sources are discovered without network/write effects. | H exact four-source inventory despite wording “configured”; F roots/time. | Yes: adding a supported source fails exact equality. | No for additive source support. | parameterize | L9-36; `fixtures/global-consolidation/**` |
| normalize four fixture formats | Local readers normalize records without live paths. | H exactly 4 records and exact formats; F fixture content. | Yes: fixture gains records/format. | Contract can be asserted per requested kind without total count. | rewrite | L38-63 |
| redact sensitive input | Secrets are removed before consolidation and redaction evidence remains. | F secret markers; C security behavior. | Low. | Yes. | keep | L65-83 |

### `utils.test.js`

| Item | Contract | Hardcode | Valid-change sensitivity | Failure appropriate | Verdict | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| C17 utility exports | Shared utility module exposes six helpers. | H C17 label and `cloneJson || deepClone` implementation alias. | Yes: API cleanup fails. | Appropriate only if public compatibility is deliberate. | probe | L4-15 |
| plain-object predicate | Only ordinary objects pass. | F values; C semantics. | Low. | Yes. | keep | L17-26 |
| clone isolated deep copy | Clone has no nested aliasing. | F values; C semantics. | Low. | Yes. | keep | L28-40 |
| compact filesystem timestamp | Timestamp renders filename-safe compact local/UTC form. | F date; C accepted format. | Medium: equally safe delimiter/UTC format fails. | Exact format may be public compatibility; otherwise over-specific. | probe | L42-46 |
| stable stringify ordering | Equivalent objects stringify deterministically. | F object and exact JSON serialization. | Medium: another deterministic canonical encoding fails. | Appropriate only if byte format feeds hashes/protocol. | probe | L48-55 |
| hasText | Only nonblank strings pass. | F values; C semantics. | Low. | Yes. | keep | L57-66 |
| safeId normalization | Display text becomes allowed lowercase ID. | F C17 phrase; exact slug output. | Medium: alternate safe transliteration fails. | Appropriate only if slug compatibility is public/persisted. | probe | L68-74 |

### `yaml-parser-unification.test.js`

| Item | Contract | Hardcode | Valid-change sensitivity | Failure appropriate | Verdict | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| parse standard complex YAML | Parser supports block/folded strings, quotes, arrays, null and nesting. | F values; C YAML semantics. | Low. | Yes. | keep | L12-54 |
| deterministic round trip | Same value serializes deterministically and parses identically. | F values; no exact emitted bytes asserted. | Low. | Yes. | keep | L56-75 |
| config/knowledge same semantics | Knowledge loader uses shared YAML semantics on real record shape. | F C17/F001/M03/path/time; C normalized semantic equality. | Low. | Yes; sample IDs are not universal expectations. | keep | L77-133 |
| public YAML helpers | Root API exports parse/stringify. | C public API. | Low. | Yes. | keep | L135-138 |
| manifest declares js-yaml | Runtime dependency is explicitly declared in root or Core manifest. | H concrete implementation dependency. | Yes: valid parser replacement fails. | This is dependency governance, not behavioral correctness. | reclassify | L140-155 |

## Scenario audit

All seven entries are currently `quarantined`; verdict assesses whether their present assertions are valuable, not whether historical files should be deleted.

| Item | Contract | Hardcode | Valid-change sensitivity | Failure appropriate | Verdict | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| `v0.5/s07-full-hypo-todo` | Historical four-prompt TDD loop. | H: exactly 4 prompts, 24 logs, 16/18 tests, diff 3, old `state.yaml`. | Extreme; checklist has no runner and records one old execution. | No; it is historical evidence, not an executable oracle. | remove | `checklist.md` throughout |
| `v11/s63-init-automation-non-git` | Legacy CLI non-git init and automation validation. | C policy enum; H retired CLI and exact validator message. | High under Skill-first Init. | Policy failures useful, CLI failure obsolete; duplicates Core tests. | remove | `run.sh` L1-34; catalog replacement `c21/s70` |
| `v4/s14-multi-dim-scoring` | Historical adaptive scoring/TDD evaluation. | H: six dimensions, exact weights, prompts 00-02, threshold 3, old state/report shapes. | Extreme; no runner. | No as current gate. | remove | `checklist.md` throughout |
| `v6/s24-audit-report` | Old `/hw:audit` taxonomy/template/path. | H exact six codes, English severity headings, `.pipeline/audits/audit-NNN.md`, retired command. | High. | No; text presence and obsolete surface. | remove | `run.sh` L9-16 |
| `v8.1/s34-import-history-time-gap` | History import exposes a configurable 24h fallback. | C key/default if retained; H exact prose in two docs. | High: editorial rewrite fails. | Schema check useful, prose checks not; superseded by Init replacement. | remove | `run.sh` L9-13 |
| `v8.3/s44-showcase-skeleton` | Old Showcase command/files/interactive wording. | H retired command, exact paths, preset steps and sentences. | Extreme. | No; catalog correctly marks historical. | remove | `run.sh` L9-18 |
| `v9/s54-opencode-plugin-scaffold` | Old CLI generates OpenCode adapter scaffold. | H retired CLI, exact generated tree, implementation symbols/events/text. | Extreme; any adapter refactor fails widely. | Some ownership/schema checks matter but replacement Scenario owns them. | remove | `run.sh` L13-56; catalog replacement `c21/s77` |

## Findings

### High

1. **Historical repository topology is promoted to release authority.** `c21-m8-regression-contract.test.js` pins 31 exact C21 Core paths and eight exact `c21/s70..s77` directories. A behavior-preserving rename, split, consolidation, or replacement fails, while a weak test at the pinned path still passes. Replace these anchors with stable behavior IDs/capability coverage derived from catalog metadata and validate the referenced tests actually exercise those contracts.
2. **Maintained documentation tests pin one prerelease.** `docs-governance.test.js` requires `v15.0.0-alpha.1` paths, headings, and README links. A correct alpha.2/current-release update can fail solely because alpha.1 is no longer linked from entrypoints. Move immutable release-note validation to artifact/release-specific checks and derive the current version from the manifest for the maintained gate.
3. **README test asserts already-retired commands.** `readme-update.test.js` requires `/hw:release`, `/hw:chat`, and their old Skill paths, while `docs-governance.test.js` simultaneously asserts the current public surface is exactly ten routes without either command. This is an internally contradictory oracle, not useful protection.
4. **Text-presence tests substitute for user behavior.** Completion, P2 route, lifecycle docs, and several Docs/README cases search exact phrases across combined Markdown files. These can pass when no final response/Plan behavior implements the contract, and fail after harmless editorial or file-layout changes. They should be replaced by structured contract fixtures plus rendering/interaction tests; doc generation checks may remain secondary.

### Medium

1. Exact inventories recur in `docs-governance`, `profile-platform`, `session-source-discovery`, and README platform tests. Registries should be the input, not duplicated arrays/counts in tests.
2. `init-automation-contract.test.js` directly runs the catalog-retired installed CLI even though its replacement is Skill-first Init. Its maintained/quarantined classification must be reconciled.
3. `final-assistant-output` permanently asserts OpenCode cannot capture exact output. A successful implementation is a valid feature but would fail this test; model unsupported capability as a capability fixture/version or replace with “never claim capture unless verified.”
4. Several useful cases mix behavioral and presentation assertions (`c21` runner output counts, routing Hook display, Deep Plan headings, validator error prose, Codex capability strings). Split them so a UI/copy change does not invalidate state/safety coverage.

### Low

1. C17/C21/C23 labels in test names are mostly harmless, but exact legacy IDs/categories in assertions are not. Remove milestone-era labels when editing affected tests to clarify enduring contracts.
2. `readme-update.test.js` repeats the `/hw:release` and `/hw:chat` assertions, adding no coverage.
3. Utility exact formats need ownership decisions: compact timestamp, canonical stringify and safe IDs are legitimate constants only if persisted/public compatibility depends on their bytes.

## Probe candidates

| Candidate | Counterfactual probe | Expected useful result |
| --- | --- | --- |
| C21 Core/Scenario anchors | Rename one anchored test/Scenario while preserving catalog `covers` behavior ID and executable assertions. | Current test fails; demonstrates path hardcode rather than contract protection. |
| Retired CLI dependent scanner | Put retired CLI text in a comment and invoke it indirectly through a wrapper in separate candidates. | Detect false positive and false negative of textual scanning. |
| Completion/P2 prose contracts | Paraphrase required prose without changing structured semantics, then delete operational behavior while retaining keywords. | First should pass and second should fail; current regex likely does the reverse/permits false pass. |
| Docs release note | Point manifest/current docs at a successor prerelease while preserving alpha.1 historical note. | Maintained gate should pass; current alpha.1 link assertion likely fails. |
| README render blocks | Remove retired release/chat assets from the registry. | Renderer should remain correct; current test fails due fixed obsolete literals. |
| OpenCode final-output capability | Supply a verified exact extractor result. | Safety rule should accept captured output; current “never captured” assertion fails. |
| Source kinds | Add a fifth requested local fixture source. | Existing four sources should still work and new source be checked; current exact set/count fails. |
| Utility formats | Substitute an equally deterministic canonical encoding or safe timestamp form behind non-persisted API. | Determines whether exact bytes are genuine compatibility or accidental implementation. |

## Catalog and fixture issues

- All seven shard Scenarios are quarantined and have maintained replacements, but they remain executable/visible historical debt. Five runners assert obsolete CLI/command/doc implementation details; two are checklist-only frozen result narratives. Retaining these in `all` diagnostics is defensible only as explicitly historical evidence, not as meaningful regression signal.
- `c21-m8-regression-contract.test.js` requires every quarantine to point to a maintained replacement, which is good, but it does not prove the replacement covers the same behavior. The identical generic reason strings across many entries amplify this gap.
- `final-assistant-output` fixtures deliberately contain token-looking strings. That is valid for exact-output capture tests, but these fixture values must never be copied into durable Memory or logs outside test artifacts.
- `p2-technical-route` parses YAML milestone sections with indentation and `C\d+-M\d+` regex rather than the YAML object already loaded in the same test.
- `readme-update` constructs fake command source text rather than a structured registry fixture, coupling the test to source parsing syntax.

## Zero-omission self-check

- Recomputed sorted Core inventory: 179 files; selected indices `8,18,...,178` = 18 files.
- Parsed top-level `test`, `routingTest`, and `revisionTest` calls in selected files: 122/122 rows represented above.
- Recomputed catalog Scenario inventory from maintained + quarantined entries, normalized by path: 76 entries; selected indices `8,18,...,68` = 7/7 rows represented above.
- Direct fixtures/runners inspected: `tests/regression-catalog.json`, `tests/run_core_tests.mjs`, `tests/run_regression.py`, selected Scenario `checklist.md`/`run.sh`, and selected-test fixture families for C23 routing, C21 M6, final assistant output, maintenance runs, global consolidation, P2 route, README/Claude temporary fixtures, and YAML knowledge records.
- No production/test execution was used as evidence and no file other than this report was intentionally written.
