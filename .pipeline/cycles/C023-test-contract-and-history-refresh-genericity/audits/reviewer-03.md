# Independent Test Contract Review 03

## Scope and basis

- Authority: frozen `audits/INVENTORY.md`, test rows whose shard is `3`, plus the eight Scenario rows whose shard is `3`.
- Coverage: 18 executable test files and 8 Scenarios. Direct fixtures, generated adapters, catalog entries and Scenario runners were inspected with their consumers.
- Comparison baseline: corrected `primary-03.md` as read at `2026-08-09 12:12:40+08:00`. Its first revision covered the first eight authoritative files but substituted ten files from other shards; the corrected revision now covers all frozen shard-03 paths. The coverage drift remains an audit-process finding, while item labels below compare against the corrected revision.
- Read-only diagnostic: the 18 authoritative files produced `150 tests: 136 pass, 14 fail`. Several failures are file-load or shared retired-API failures, so the failed count is not the number of independently broken contracts.
- Review labels: `agree` accepts the primary conclusion, `revise` changes or materially qualifies it, and `missing` supplies a conclusion absent from the primary.

## Frozen coverage inventory

### Test files

1. `core/test/analysis-interaction.test.js`
2. `core/test/bootstrap-acceptance.test.js`
3. `core/test/c23-m2-experiment-knowledge.test.js`
4. `core/test/claude-codex-plugin.test.js`
5. `core/test/codex-hooks-vnext.test.js`
6. `core/test/cycle-acceptance.test.js`
7. `core/test/deep-plan-research.test.js`
8. `core/test/explain-subagent.test.js`
9. `core/test/goal-lifecycle.test.js`
10. `core/test/knowledge-opencode-gate.test.js`
11. `core/test/maintenance-backup-policy.test.js`
12. `core/test/opencode-hooks.test.js`
13. `core/test/pr-create-contract.test.js`
14. `core/test/project-linkage-registry.test.js`
15. `core/test/recovery-pack.test.js`
16. `core/test/runtime-store.test.js`
17. `core/test/storage-sync-template.test.js`
18. `core/test/workspace-authority.test.js`

### Scenarios

1. `tests/scenarios/c21/s73-maintain-ambient`
2. `tests/scenarios/v0/s05-implement-only`
3. `tests/scenarios/v11/s69-audit-regression-canonical-examples`
4. `tests/scenarios/v6/s19-help-list`
5. `tests/scenarios/v6/s29-plan-review-migration`
6. `tests/scenarios/v8.2/s39-compact-generator`
7. `tests/scenarios/v8.3/s49-showcase-bootstrap`
8. `tests/scenarios/v9/s59-v9-regression-bundle`

## Per-case review

### `analysis-interaction.test.js`

| Item | Review | Contract / hardcode judgment | Valid-change and failure judgment | Verdict |
| --- | --- | --- | --- | --- |
| defaults are hybrid and boundary-aware | agree | Default policy and boundary enums are product constants. | Policy change should fail this focused case. | keep |
| mode controls code-change permission | agree | `manual/hybrid/auto` mapping is a policy contract. | Internal normalization changes should pass. | keep |
| project config overrides boundaries | agree | YAML values and paths are fixture inputs, not universal identity. | Precedence regression should fail locally. | keep |
| OpenCode artifacts expose boundaries | agree | Exact `.opencode` paths and prose are implementation/copy coupling. | Adapter relocation or equivalent wording wrongly fails. | rewrite/split |
| whole-file load behavior | revise | Retired root export `writeOpenCodeArtifacts` is statically imported. | One retired adapter case prevents the preceding three policy cases from running; this blast radius is inappropriate. | split file; use current adapter API |

### `bootstrap-acceptance.test.js`

| Item | Review | Contract / hardcode judgment | Valid-change and failure judgment | Verdict |
| --- | --- | --- | --- | --- |
| API publication | agree | Supported factory/export names are API constants; `M5` is only a title. | Supported API removal should fail. | keep |
| seal four freeze files | agree | Freeze coverage is a migration-format contract, but the duplicated list is not its authority. | New protected authority should require one source-backed update, not divergent arrays. | parameterize |
| pending readers and restore | agree | Refs and budget are fixture/resource inputs. | Writer refactors should not affect read-only/zero-write behavior. | keep |
| pending Runtime, Journal, Capsule update/rebuild, Pack and Record writers | agree | Error/status fields are protocol; ids and markers are fixtures. | Any gate bypass should fail its own subcase. | keep |
| pending generic transaction writer | agree | Fixed `delivery/c21/...` promotes one fixture path into the oracle. | Arbitrary delivery refs should exercise the same gate. | parameterize from `DELIVERY_REF` |
| pending rollback | agree | Frozen bytes/mtime preservation is the rollback contract. | Storage refactor may pass if observable freeze remains. | keep |
| fresh restore then accept | agree | Explicit, checkpoint-bound, immutable and idempotent acceptance is stable behavior. | Contract break should fail locally. | keep |
| accepted refuses rollback/reopens writers | agree | State/error values are protocol constants. | Correctly detects gate direction regression. | keep |
| reconciliation coherent descendant | agree | Historical refs are fixture inputs. | Equivalent descendant logic should pass. | keep |
| unexpected Record/Receipt/Snapshot | agree | Unknown authority is adversarial input, but namespace knowledge should come from schema. | Legitimate new authority kinds should not become false positives. | parameterize |
| freeze drift: state bytes, PROGRESS missing/bytes in strict and reconciliation | agree | Legacy protected paths are an explicit compatibility format. | Drift should fail the corresponding mode. | keep |
| freeze drift: cycle mtime in strict and reconciliation | agree | The timestamp mutation is a probe, not project identity. | Filesystem precision can create environmental failures. | probe/document |
| evidence: missing/wrong hash/unknown type/absolute/traversal/symlink for Snapshot and file | agree | `../`, absolute paths, symlinks and invalid digests are security examples, not prohibited project hardcoding. | Each correctly represents a union/path/digest violation. | keep |
| success hash binding: strict and reconciliation | agree | Hash shape and evidence/freeze fields are protocol. | Explicit protocol change should update these cases only. | keep |

### `c23-m2-experiment-knowledge.test.js`

| Item | Review | Contract / hardcode judgment | Valid-change and failure judgment | Verdict |
| --- | --- | --- | --- | --- |
| Store API publication | agree | Factory/method names are API; `C23 M2` is title text. | Supported API break should fail. | keep |
| fixture code locators bind bytes | agree | NeRF/AceSim are declared fixture domains and digests are recomputed from input bytes. | Fixture metadata must move with fixture changes. | keep |
| persists typed facts/lists active knowledge | agree | Record identity regex and storage suffix mix protocol with layout. | Storage re-layout can wrongly fail public Store behavior. | split |
| resolves NeRF semantics | agree | Semantic lookup is valuable; exact aliases, module keys and prose are fixture content. | Equivalent fixture vocabulary can cause broad false failures. | probe/split |
| explains metric semantics | agree | Direction/unit/comparability are structured contract; English fragments are not. | Copy improvements should pass. | rewrite |
| resolves AceSim ownership/metrics | agree | Cross-domain resolution is behavior; exact phrases/keys are fixture conformance. | Domain fixture evolution should not fail unrelated resolver logic. | split |
| registered code stale/unrelated ignored | agree | Registered digest behavior derives from fixture. | Correctly isolates freshness. | keep |
| missing registered code actionable | agree | Symbol/fact names are fixture metadata. | Missing typed locator is a real failure. | keep |
| explicit supersedes/history and replay | agree | Count derives from two writes; explicit edge/history/idempotence are contracts. | Internal storage changes should pass. | keep |
| invalid graph across all read APIs | agree | Corruption classes are adversarial protocol inputs. | Static read-API enumeration can miss an additive API. | parameterize from authoritative API inventory |
| inactive predecessor semantics/provenance | agree | Hand-built corruption is schema fixture. | Failure is appropriate while inactive history remains authoritative. | keep |
| project isolation | agree | Domain/project ids are inputs. | Cross-project leakage should fail. | keep |
| secret/reasoning/path/digest/provenance rejection matrix | agree | Attack strings are legitimate security samples. | Split only for diagnosis; zero-write failures are appropriate. | split |

### `claude-codex-plugin.test.js`

| Item | Review | Contract / hardcode judgment | Valid-change and failure judgment | Verdict |
| --- | --- | --- | --- | --- |
| installed detection | agree | Official identities/minimum version are integration contract; paths/versions are fixtures. | Alternate valid install evidence passes. | keep |
| unavailable/missing/spoof/unsupported | agree | Recognition states and spoof rejection are security contract. | New official identity requires focused update. | keep |
| install proposal | agree | Confirmation/no execution and public commands are contract; Markdown copy is incidental. | Copy edits currently over-fail. | split |
| planning profiles | agree | Required role behavior is contract; exact `Object.keys === 3` blocks additive profiles. | Compatible profile addition should pass. | parameterize required subset |
| worker ownership | agree | POSIX/Windows overlap paths are adversarial fixtures. | Ownership regression should fail. | keep |
| routing without/with capability evidence | agree | Evidence gate is a safety contract. | Config alone must not synthesize capability. | keep |
| reference documentation | agree | Sentence regexes protect editorial text. | Equivalent documentation changes wrongly fail. | rewrite to generated/schema parity |

### `codex-hooks-vnext.test.js`

| Item | Review | Contract / hardcode judgment | Valid-change and failure judgment | Verdict |
| --- | --- | --- | --- | --- |
| official event surface/payloads | agree | Host event enum/schema is protocol. | Official event change should be focused and intentional. | keep |
| output restrictions | agree | Event-specific allowed/forbidden fields are protocol. | Correct failure scope. | keep |
| operation-id partition | agree | Read/write event classification is lifecycle contract. | Reclassification should update this matrix. | keep |
| SessionStart/prompt semantics | agree | Bounded/no-write behavior is contract; `PLAN.md/PROGRESS.md` and Chinese text are legacy/copy. | Authority migration or copy edit wrongly fails. | rewrite |
| compact seal/restore | agree | Trigger and 16 KiB budget are protocol/resource contract. | Storage internals may change without failure. | keep |
| terminal Delivery without Capsule | agree | No fabricated context is stable behavior. | Correct local failure. | keep |
| subagent streams/reminder dedupe | revise | Four events derive from two worker start/stop inputs; the Chinese reminder regex is incidental. | Keep correspondence/dedupe, replace copy oracle with semantic cause/code. | split |

### `cycle-acceptance.test.js`

| Item | Review | Contract / hardcode judgment | Valid-change and failure judgment | Verdict |
| --- | --- | --- | --- | --- |
| manual cycle pending before archive | agree | Gate is valid; legacy state/cycle/log representation is compatibility-only. | Current Runtime implementation could satisfy semantics while failing legacy shape. | reclassify + current Runtime case |
| accept/reject ref-only feedback | agree | Full C4/timestamp filename is fixture/layout coupling. | Assert relative ref schema/content. | parameterize |
| clears stale continuation | agree | No runnable continuation is contract; representation is legacy. | Semantic migration should not fail maintained lane. | reclassify |
| worker separation cases: missing audit, collapsed implement/test, allowed/blocked degradation, internal subtask, no evidence, authorization waiting | agree | Roles/statuses are topology/security contract; ids are fixtures. | These are appropriate focused failures. | keep |
| persisted runtime mirror | agree | Authority precedence is contract but mirror location can migrate. | Probe against current Placement/Runtime authority. | probe |
| failed/close_failed lifecycle | agree | Failure states are protocol, but static enumeration may omit additive terminal failures. | Derive matrix from lifecycle authority. | parameterize |
| command map/docs exposed | agree | Registry structure and free-text skill/docs are mixed. | Current failure is only removed `pending_acceptance` prose after valid Cycle skill simplification. | split; keep registry, replace prose regex |

### `deep-plan-research.test.js`

| Item | Review | Contract / hardcode judgment | Valid-change and failure judgment | Verdict |
| --- | --- | --- | --- | --- |
| APIs exported | agree | Public names are API contract. | Correct failure. | keep |
| persists local read-only evidence | agree | IDs/times/paths are fixtures; rendered English fragments are copy. | Persistence and rendering should fail independently. | split |
| appends entries | agree | Counts/order derive from inputs. | Correct failure. | keep |
| allows local read-only actions | agree | Action enum is security policy. | Adding another safe action does not invalidate required cases. | keep |
| gates non-local/side effects | agree | Action matrix is policy; reason prose is incidental. | Replace message regex with typed reason. | rewrite |
| allowed actions cannot bypass remote gate | agree | `remote_clone` is a safety category. | Correct failure. | keep |
| explicit remote action confirmation | agree | Action-scope authorization fields are contract. | Correct failure. | keep |
| local trusted remote action | agree | Local trust precedence is contract. | Correct failure. | keep |
| clone needs bounded cache/code refs | agree | Paths are fixture; one evidence representation may be over-prescribed. | Probe alternate bounded representation. | probe |
| side effects require action scope | revise | Safety matrix is valid, but reason prose has same brittleness as the earlier gate case. | Preserve behavior, remove prose oracle. | rewrite |
| compact refs omit transcript/secrets | agree | `DP777`, limit and secret markers are fixture/resource/security inputs. | Leakage or bound regression should fail. | keep |

### `explain-subagent.test.js`

| Item | Review | Contract / hardcode judgment | Valid-change and failure judgment | Verdict |
| --- | --- | --- | --- | --- |
| read-only handoff | agree | Policy and required fields are contract; exact English prompt/full array are copy/additive coupling. | Prompt edit or optional field addition should pass. | split/required subset |
| unavailable fallback | revise | Mode/input-derived reason are contract; `/self evidence/` is prose. | Copy edit should not fail. | keep behavior, remove prose oracle |
| packet validation | agree | Required evidence/unknown/risk fields are schema contract. | Correct failure. | keep |
| final answer preserves evidence/unknowns | agree | Refs/unknown/confidence are semantics; exact `confidence:` format is copy. | Formatting evolution should pass. | rewrite |
| redacts secret-like packet text | agree | Secret markers are adversarial input. | Security failure is appropriate. | keep |

### `goal-lifecycle.test.js`

| Item | Review | Contract / hardcode judgment | Valid-change and failure judgment | Verdict |
| --- | --- | --- | --- | --- |
| API/store publication | revise | API/method names are public contract; M6 is title. Internal module probes should not fail when the supported root API remains stable. | Correct public failure; split internal compatibility as primary recommends. | split public/internal API |
| proposal persists Design Record/no fake Milestone | agree | Goal/queue data are fixture inputs; status/hash/scope are protocol. | Storage/render concerns could be split, but behavior is valid. | keep |
| complete lifecycle | agree | State, receipt, zero-product-write and recovery behavior are contract. | Large case has broad diagnosis but related transitions. | keep/split for locality |
| fresh-process reject/revise/reapprove | agree | Times, ids and project are fixture inputs. | Fresh-process and “revision is not edit authorization” are valuable; split for diagnosis. | split |
| Resume without Pack degrades to Runtime | agree | Recovery authority and degraded status are protocol. | Correct failure. | keep |
| stale Pack cannot replace newer Runtime | agree | Staleness/mismatch/replay state is authority contract; prose matching is incidental. | Authority failure is valid; typed mismatch code avoids copy coupling. | rewrite typed assertion |
| conditional `goalTest` wrapper | missing | `HAS_GOAL` is implementation availability detection. | Missing planning/topology dependencies silently skip five core cases while the publication case can still pass: false green. | rewrite to fail setup explicitly |

### `knowledge-opencode-gate.test.js`

| Item | Review | Contract / hardcode judgment | Valid-change and failure judgment | Verdict |
| --- | --- | --- | --- | --- |
| F001 Knowledge record/generated context | revise | Directly binds current cwd, C4/F001/M05, exact categories/tags/files, legacy residue and prose. | History cleanup or file migration fails although generic Knowledge behavior may be correct. | remove from maintained/reclassify historical; add arbitrary fixture behavior test |
| checked-in OpenCode smoke | agree | Mixes checked-in derived artifacts, C4 path, legacy paths, function-source regex and policy. | Adapter relocation/copy changes over-fail; source drift can under-test generation. | rewrite from arbitrary generated fixture + separate parity check |

### `maintenance-backup-policy.test.js`

| Item | Review | Contract / hardcode judgment | Valid-change and failure judgment | Verdict |
| --- | --- | --- | --- | --- |
| backup required before system document write | agree | Backup/confirmation is safety contract; ids/times/path are fixtures. | Current root API is retired, so assertion never runs. | current internal API if supported; otherwise reclassify/remove |
| notification/external side-effect gate | agree | External gate is safety contract. | Same retired API causes non-behavior failure. | current API or reclassify |
| orchestration binds remote/destructive/external gate | agree | Side-effect matrix is contract. | Integration coverage is useful only against an active engine. | current API or reclassify |
| ledger override confinement | agree | User cannot redirect authority writes; exact ledger filename/event-id shape may be layout. | Keep confinement/zero-malicious-write separate from format. | split |

### `opencode-hooks.test.js`

| Item | Review | Contract / hardcode judgment | Valid-change and failure judgment | Verdict |
| --- | --- | --- | --- | --- |
| YOLO informational file guards | agree | Allow/info policy is project rule; `/home/heyx` is only fixture context but should be arbitrary. | Correct behavior case, currently blocked by unrelated import. | keep/parameterize home |
| permission allow and auto-continue/stop | agree | Mode/status fields are policy contract. | Correct focused failures if isolated. | keep |
| command classification with allow | agree | Commands are representative/adversarial inputs. | Policy classification regression should fail. | keep |
| permission event redaction | agree | Secret markers are adversarial. | Correct security failure. | keep |
| generated plugin imports helpers | agree | Retired root writer plus exact generated paths/function-source regex are implementation layout. | Static retired import prevents all preceding cases from executing. | remove/rewrite current structured generation and split file |

### `pr-create-contract.test.js`

| Item | Review | Contract / hardcode judgment | Valid-change and failure judgment | Verdict |
| --- | --- | --- | --- | --- |
| ask/worktree/plan proposals | agree | Modes are contract; exact Chinese question, `dirty worktree`, and retired `/hw:start` flow are copy/version coupling. | Equivalent guidance or command simplification wrongly fails. | split structured modes/authorization from rendered guidance; current route registry |
| archives confirmation and remote-write actions | agree | Provider/request/confirmation/effect set are contract; date-derived ID, exact file layout and summary prose mix format/copy. | Proposal storage refactor causes broad failure. | split protocol/effects, persistence schema and rendering |

### `project-linkage-registry.test.js`

| Item | Review | Contract / hardcode judgment | Valid-change and failure judgment | Verdict |
| --- | --- | --- | --- | --- |
| exactly seven canonical projects | agree | Hardcodes one user's seven projects, absolute home paths and fixed count. | Any valid project addition/removal fails; generic code changes may not be exercised because API is retired. | remove from generic suite; project-data fixture only |
| identities/roles/notification flags | agree | Entire oracle is reference workspace data and prose. | Legitimate metadata change creates wide failure. | remove/reclassify data migration check |
| legacy predecessor relations | agree | Fixed Hypo project graph is user data; relation schema itself is contract. | Split generic graph semantics from this snapshot if feature remains. | remove snapshot; generic arbitrary graph test |
| metadata-only/no external action | agree | No-write behavior is valuable, but tied to retired hardcoded registry builder. | Test active generic planner or remove retired surface. | reclassify/rewrite |

`core/src/project-linkage/index.js` contains the same seven project records and two fixed relations behind a no-argument builder. The test and production seed therefore validate each other's reference-workspace constants; this is direct evidence of a test protecting the hardcoding defect rather than deriving expectations from arbitrary input.

### `recovery-pack.test.js`

| Item | Review | Contract / hardcode judgment | Valid-change and failure judgment | Verdict |
| --- | --- | --- | --- | --- |
| API publication | missing | Pack/selection/restore/retention API is contract. | Correct failure. | keep |
| seal binds Capsule/continuation/refs/worktree/vector | missing | IDs/times/content are fixtures; binding fields are protocol. The no-home-path oracle only recognizes `/home/...`. | Internal storage changes should pass; macOS, Windows and URI absolute paths currently escape that oracle. | keep + generic absolute-path detector |
| missing/drifted/local/path-mismatched refs | missing | Adversarial refs are security/authority fixtures. | Each invalidity should fail closed, preferably as nested cases with typed reasons. | split/parameterize |
| corrupt newest falls back/replays delta | missing | Pack chain and Journal replay are recovery contract. | Correct failure. | keep |
| absolute instant across offsets | missing | Fixed timestamps are comparison inputs. | Timezone-format refactor should pass if instant ordering holds. | keep |
| equal instant falls through to ancestry | missing | Offsets/digests are adversarial ordering fixtures. | Correct failure. | keep |
| equal Clock selects descendant, not lexical digest | missing | Lower/higher digest variants deliberately disprove incidental lexical ordering, but use bounded brute-force digest search. | Ancestry failure is valid; candidate-construction failure after serialization/hash evolution is not. | keep oracle; deterministic candidate injection/probe |
| restore budget retains next action | missing | Budget is resource contract when supplied; payload is fixture. | Core budget/action failure is valid; exact `journal_delta` representation can over-fail. | split behavior from representation |
| deterministic retention/last valid Pack | missing | Counts derive from created Pack set. | Correct retention invariant. | keep |
| retention rejects delete/retain tamper and disk drift | missing | Tamper variants are adversarial inputs. | Each correctly fails before removal. | keep |

### `runtime-store.test.js`

| Item | Review | Contract / hardcode judgment | Valid-change and failure judgment | Verdict |
| --- | --- | --- | --- | --- |
| API publication | missing | Runtime and active-pointer APIs are protocol surface, but the duplicated method list is not its authority. | A missing method may cascade into many later cases because readiness only checks import success. | source-backed readiness or remove redundant publication list |
| Delivery/Activity/Bootstrap paths | missing | Kinds and deterministic ownership paths are format contract; ids are fixtures. Exact count `3` and kind mapping duplicate product knowledge. | Additive kinds are untested; storage-layout migration over-fails mixed behavior. | parameterize from kind authority; split layout/idempotence |
| active refs-only round-trip | missing | No lifecycle duplication is authority contract. Exact key/slot sets duplicate schema. | Additive metadata can over-fail unless forbidden/allowed fields come from schema. | keep, schema-derived keys |
| invalid active lifecycle/schema zero-write | missing | Invalid payloads are adversarial protocol inputs. | Correct safety failure. | keep |
| ref normalization rejects traversal/absolute/alias/key mismatch | missing | Path samples are adversarial, not project hardcode; literal `unknown` is only safe if derived as an unsupported kind. | A newly supported kind should not make an adversarial fixture accidentally valid. | parameterize from allowed-kind authority |
| outer/runtime/continuation cross-object mismatch | missing | Authority identity consistency is contract. | Correct zero-write failure. | keep |
| object update isolation | missing | Fixture ids derive from input. | Cross-object mutation should fail. | keep |
| recoverable transaction seam | missing | `after_prepare` is an internal fault seam. | White-box seam may change while atomic recovery remains; retain with black-box invariant. | probe/split |
| invalid runtime/continuation schemas zero-write | missing | Schema-invalid samples are protocol fixtures. | Correct failure; nested typed subcases improve locality. | keep/parameterize |
| nested authority non-duplication | missing | Runtime/Continuation ownership is contract; hand-written forbidden fields duplicate ownership schema. | Legitimate schema evolution can over-fail a broad rule. | parameterize from ownership schema/split |

### `storage-sync-template.test.js`

| Item | Review | Contract / hardcode judgment | Valid-change and failure judgment | Verdict |
| --- | --- | --- | --- | --- |
| backend-neutral Project Home model | missing | Required slots/backend-neutrality may be schema contract; Hypo identity/home and exact slot order are one fixture. | Root API is retired, so current failure says nothing about behavior; additive slot/order evolution may over-fail. | decide retirement; current API + arbitrary identity and schema-derived slots, or remove |
| redacts secret-looking metadata | missing | Secret markers are adversarial and security-valid; Notion-specific fixture is acceptable input. | Security assertion never runs because builder export is absent. | preserve against active projection API, otherwise reclassify |

### `workspace-authority.test.js`

| Item | Review | Contract / hardcode judgment | Valid-change and failure judgment | Verdict |
| --- | --- | --- | --- | --- |
| full v1 sections | missing | Schema version/required sections are protocol. | Correct if workspace authority remains supported. | keep via current API or reclassify |
| duplicate ids/aliases | missing | Duplicate fixture ids are adversarial. | Correct schema failure. | keep via current API |
| raw secrets forbidden | missing | Secret markers are security samples. | Correct failure. | keep via current API |
| derived projects cannot override identity | missing | Derivation precedence is contract, but all expected identity/path values use one reference workspace. | Add arbitrary identities/homes; exact Hypo values must derive only from fixture. | parameterize |
| derived projects strip raw secrets | missing | Security behavior is valid. | Correct if active. | keep |
| derived view declares workspace authority | missing | Authority declaration is protocol. | Correct failure. | keep |
| workspace loads before compatibility view | missing | Source precedence is contract; exact Hypo path is fixture. | Current static missing export prevents every case from running. | use current API or reclassify whole retired suite |

## Scenario review

| Item | Review | Contract / hardcode judgment | Valid-change and failure judgment | Verdict |
| --- | --- | --- | --- | --- |
| c21/s73 maintain ambient | agree with qualification | Runner delegates to a real behavior suite; C21/M7 is label only. Runtime/inbox paths need explicit format ownership. | Semantic capture/noise/no-authority-write regressions fail locally; diagnostic run passed 3/3. | keep |
| v0/s05 implement-only | revise | No `run.sh`; runner only parses config/text and never proves three-step execution. | Production can break while Scenario passes; fixed three steps also freeze a preset implementation. | remove if retired; otherwise rewrite behavior/capability-set test |
| v11/s69 audit examples | revise | Tests Markdown phrases, historical paths and s64-s68 commands rather than audit behavior. | Production behavior can break while it passes; doc relocation causes false red. | remove prose oracle; behavioral replacement |
| v6/s19 help list | agree | Runner hardcodes 41 while checklist says 36, plus exact command/doc lists. | Current failure occurs before count because old root table is gone; valid command evolution causes broad red. | rewrite registry-derived set/no fixed count, or delete retired surface |
| v6/s29 plan-review migration | agree | Requires retired `/hw:plan:review`, old alias and migration prose. | Current first assertion fails after expected retirement. | delete expired migration Scenario |
| v8.2/s39 compact generator | agree | Requires retired skill path, five legacy compact files and old schema keys. | Current first file check fails; it never executes generator behavior. | delete or rewrite current Recovery Pack behavior |
| v8.3/s49 showcase bootstrap | agree | Hardcodes C2 archive, `Hypo-Workflow`, 31 commands, poster and API-key text. | It currently passes solely because old reference archive exists; any production break can remain green. | remove; replace with arbitrary-project generated behavior only if capability remains |
| v9/s59 regression bundle | revise | Parses retired runner variable, fixes s61-63, V9 numbering and 41 commands. Offline glob `v9/*.*/run.sh` matches no Scenario files. | Current runner parse fails; offline contract has never actually been exercised. | delete bundle; catalog-driven inventory/offline validator |

## Disputes and omissions

### Primary coverage error

The primary's zero-omission statement was false against the subsequently frozen inventory. It omitted these ten shard-03 files:

- `goal-lifecycle.test.js`
- `knowledge-opencode-gate.test.js`
- `maintenance-backup-policy.test.js`
- `opencode-hooks.test.js`
- `pr-create-contract.test.js`
- `project-linkage-registry.test.js`
- `recovery-pack.test.js`
- `runtime-store.test.js`
- `storage-sync-template.test.js`
- `workspace-authority.test.js`

It instead reviewed ten out-of-shard files beginning with `guide-router.test.js` and ending with `workspace-concurrency-recovery.test.js`. This is not only a reporting defect: it demonstrates that modulo assignment without a frozen manifest cannot support a two-reviewer completeness claim. `INVENTORY.md` now fixes the assignment authority.

### Primary conclusions revised

1. The stale `writeOpenCodeArtifacts` import does not cause one adapter assertion to fail; it prevents every case in both `analysis-interaction.test.js` and `opencode-hooks.test.js` from loading. Failure locality is therefore worse than primary reported.
2. `goal-lifecycle.test.js` can silently skip five critical cases when one dependency import is absent. A missing contract implementation must not become a green skip.
3. `knowledge-opencode-gate.test.js` is a maintained-looking repository-history snapshot, not a generic Knowledge/OpenCode gate.
4. The retired Maintenance, project registry, Storage Sync and Workspace Authority root APIs create repeated failures before their behavioral assertions. Restoring exports only to satisfy tests would preserve retired architecture rather than contracts.
5. Attack samples and protocol constants must not be conflated with reference-project hardcoding. Traversal paths, invalid hashes, event/status fields and schema versions are legitimate test inputs; project names, Cycle numbers, fixed command counts, home paths and incidental prose are not universal outputs.

## Findings

### High

1. **Frozen inventory was necessary:** primary claimed complete shard coverage while omitting ten authoritative files. Coverage verification must compare report item IDs to `INVENTORY.md`, not recompute a mutable sorted list.
2. **Shared stale imports destroy unrelated coverage:** two OpenCode files lose nine declared cases because one retired writer is imported statically. Adapter compatibility must be isolated from policy/security tests.
3. **Retired APIs dominate failures:** Maintenance (4 cases), project linkage (4), Storage Sync (2) and Workspace Authority (whole-file load) fail before contract assertions. CI must not interpret these as independent product regressions or restore obsolete APIs blindly.
4. **Reference data masquerades as generic gates:** Knowledge/OpenCode binds C4/F001/M05; project linkage fixes seven Hypo projects and `/home/heyx`; s49 binds C2/Hypo-Workflow/31 commands.
5. **False-green tests exist:** Goal lifecycle skips five core cases on missing dependencies; s05 and s49 can pass without exercising production; s59's offline glob matches no files.

### Medium

1. Cycle acceptance runtime remains green while one free-text skill regex makes the suite red. Registry parity and documentation prose need separate lanes.
2. PR Create, Explain, Claude plugin, hooks and Experiment Knowledge combine structured contracts with human prose/layout, expanding legitimate-change failures.
3. Quarantine replacement validation checks maintained membership but not equivalent contract coverage. s69/s49/s59 replacements can therefore be nominal rather than behavioral.
4. Exact command counts in s19/s59 and retired paths in s29/s39 encode version snapshots, not stable contracts.
5. Recovery/Runtime are substantially stronger than the retired suites, but some checks duplicate schema/kind lists, inspect only Linux home paths, or bind internal transaction/hash-fixture seams.

### Low

1. C/M/F labels in titles are harmless when they do not drive expected behavior, but should not be mistaken for reusable identity.
2. Fixed ids, times and attack strings are acceptable when outputs derive from those explicit inputs.

## Counterfactual / mutation probes

1. Remove the current OpenCode artifact writer export while retaining policy APIs: all policy/security cases must still execute.
2. Run Workspace Authority, Storage Sync, project derivation and Knowledge rendering with random project ids and Linux/macOS/Windows-style homes; no Hypo identity may appear unless supplied.
3. Remove planning/topology Goal APIs: Goal tests must fail setup, never report skips.
4. Change only human-facing Chinese/English wording in Cycle, PR, Explain, Hook and Claude docs; structured behavior lanes must stay green.
5. Add a legitimate command/profile/slot: set/parity tests should derive from the authority and avoid fixed counts.
6. Break Maintain backup/side-effect behavior behind the current supported API; exactly the relevant safety cases should fail, not a retired export gate.
7. Break Pack ancestry while retaining timestamps, then break timestamp comparison while retaining ancestry; Recovery cases should fail independently.
8. Execute s59 offline validation over catalog-selected `run.sh` files and seed one network call; prove the detector observes it.
9. Generate absolute-path leak fixtures for `/Users/name`, drive-letter paths, UNC paths and `file:` URIs; Recovery redaction/confinement must reject all of them.

## Catalog and fixture issues

- Seven of eight Scenarios are quarantined, but `--set all` still executes known-obsolete scripts. Historical documentation and executable regression evidence should not share one state.
- Catalog replacement validation proves only that a path is maintained, not that it protects the retired Scenario's contract.
- `s19` and `s59` duplicate command inventory with conflicting fixed totals. Command docs must be projected from the command authority.
- `s05` has no runner; its fallback check cannot support checklist claims.
- Reference identities in Storage/Workspace fixtures are acceptable only as inputs. Add a non-Hypo second fixture before treating either test as generic evidence.

## Diagnostic validation

Authoritative 18-file run:

```text
tests 150
pass 136
fail 14
```

Observed failure classes:

1. `analysis-interaction.test.js`: retired static root export; four declared cases do not load.
2. `cycle-acceptance.test.js`: exact Cycle skill prose no longer contains `pending_acceptance`; runtime cases pass.
3. `maintenance-backup-policy.test.js`: four cases fail at missing retired `applyMaintenanceRun` root export.
4. `opencode-hooks.test.js`: retired static writer export; five declared cases do not load.
5. `project-linkage-registry.test.js`: four cases fail at missing retired builder root export.
6. `storage-sync-template.test.js`: two cases fail at missing retired builder root export.
7. `workspace-authority.test.js`: retired static derivation export prevents seven declared cases from loading.

Scenario diagnostic evidence: s73 behavior suite passed; s05, s69 and s49 also passed but do not establish their claimed production contracts; s19, s29, s39 and s59 failed on retired layout/command/runner assumptions.

## Zero-omission self-check

- All 18 test paths assigned shard `3` in frozen `INVENTORY.md` are listed and reviewed.
- Every declared top-level case is represented; Bootstrap evidence/freeze/writer matrices, Recovery tamper/ancestry matrices and Runtime object-kind matrices are explicitly covered by their owning rows.
- All 8 assigned Scenario paths are listed and reviewed with runner/catalog implications.
- Ten primary omissions and ten out-of-shard substitutions are explicitly identified rather than silently credited.
- Only this reviewer report was added; no production code, test, fixture, catalog or Scenario was modified by this reviewer.
