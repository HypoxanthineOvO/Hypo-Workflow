# Primary Test Contract Audit 03

## Scope and method

- Shard rule: normalized sorted test/scenario path, zero-based index `% 10 == 3`.
- Covered: 18 executable test files and 8 catalog Scenarios. Inventory is recursive under `core/test/`; fixtures, scripts, command catalog, and documents read by these items were inspected with their consumers.
- Read-only execution probe: `node --test` over all 18 files reported **150 tests: 136 pass, 14 fail**. This was diagnostic only; no production/test source was changed.
- Legend used below: **contract literal** is allowed; **fixture literal** is allowed only when expectations derive from that input; **incidental literal** is repository/version/layout/copy coupling and should not be protected.

## Coverage inventory

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

### Inventory correction

The first revision used a non-recursive `readdirSync("core/test")` inventory and missed `core/test/fixtures/c21-m4/brownfield/test/server.test.js`. That omitted file sits before index 83 and shifts every later modulo assignment.

- Extraneous in the first revision: `guide-router`, `layered-config-integration`, `maintenance-command-map`, `opencode-model-matrix-docs`, `pr-create-execution`, `project-notifications`, `reference-contract`, `secret-ref-projection`, `subagent-separation-contract`, `workspace-concurrency-recovery`.
- Missing in the first revision and added below: `goal-lifecycle`, `knowledge-opencode-gate`, `maintenance-backup-policy`, `opencode-hooks`, `pr-create-contract`, `project-linkage-registry`, `recovery-pack`, `runtime-store`, `storage-sync-template`, `workspace-authority`.

### Scenarios

1. `tests/scenarios/c21/s73-maintain-ambient` (maintained)
2. `tests/scenarios/v0/s05-implement-only` (quarantined)
3. `tests/scenarios/v11/s69-audit-regression-canonical-examples` (quarantined)
4. `tests/scenarios/v6/s19-help-list` (quarantined)
5. `tests/scenarios/v6/s29-plan-review-migration` (quarantined)
6. `tests/scenarios/v8.2/s39-compact-generator` (quarantined)
7. `tests/scenarios/v8.3/s49-showcase-bootstrap` (quarantined)
8. `tests/scenarios/v9/s59-v9-regression-bundle` (quarantined)

## Per-case audit

### `analysis-interaction.test.js`

| Item | Contract | Hardcode | Valid-change sensitivity | Failure appropriate | Verdict | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| defaults are hybrid and boundary-aware | Default permission policy and effective normalization | `hybrid/deny/confirm/allow/ask` are contract literals | Intended policy change requires one focused update | Yes for policy regression | keep | Direct config/API assertions |
| mode controls code-change permission | Manual/hybrid/auto permission mapping | Mode and permission enums are contract | Only policy/schema change fails | Yes | keep | Pure mapping table |
| project config overrides boundaries | Project precedence and independent safety boundaries | Temp paths/values are fixture inputs | Alternate parser/refactor should pass | Yes | keep | Loads YAML then checks effective values |
| OpenCode artifacts expose boundaries | Generated adapter carries effective policy | Exact generated paths and prose regex are incidental layout/copy | Adapter relocation or wording change fails despite same semantics | Partly; current probe fails at import because retired `writeOpenCodeArtifacts` export is absent | rewrite | Replace retired writer dependency with current adapter projection/check API; assert structured metadata, minimally assert human guidance |

### `bootstrap-acceptance.test.js`

The `C21`, `M5`, fixed time, job/delivery refs, and marker values come from the reference fixture. They are acceptable inputs only because assertions are derived from the activated fixture; they must never become production defaults.

| Item | Contract | Hardcode | Valid-change sensitivity | Failure appropriate | Verdict | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| API publication | Acceptance API imports from migration and Core root | Export name is public/internal API contract; `M5` title incidental | Export redesign breaks callers and test | Yes while API remains supported | keep | Import probe and type assertion |
| activation seals four freeze files | Rollback checkpoint covers all legacy authority files | Exact four legacy paths are a migration-format contract, not arbitrary project data | Adding another protected legacy authority would require intentional update | Yes, but exact list should come from the migration schema | parameterize | Compare against exported/schema freeze inventory rather than duplicate array |
| pending Bootstrap writer matrix (parent) | One pending gate consistently protects every new-format write surface while preserving reads | Child surface list is an API inventory contract | Adding a writer can escape unless matrix derives from registry | Partly | parameterize | Generate child matrix from authoritative writer inventory |
| pending/readers and restore | Pending gate leaves reads/restore read-only | `M5`, 32768, refs are fixture inputs | Storage refactor should pass | Yes | keep | Tree snapshot before/after |
| pending/Runtime writer | Pending blocks runtime mutation with zero writes | Marker/id are fixture inputs; error code contract | Refactor should pass | Yes | keep | Error code plus whole-tree equality |
| pending/Journal writer | Pending blocks direct journal mutation | Event fields are protocol fixtures | Event implementation refactor should pass | Yes | keep | Error and zero-write check |
| pending/Capsule incremental writer | Pending blocks capsule updates | Case name/path derived from fixture | Refactor should pass | Yes | keep | Shared zero-write oracle |
| pending/Capsule rebuild writer | Pending blocks capsule rebuild | Fixture-derived | Refactor should pass | Yes | keep | Shared zero-write oracle |
| pending/Recovery Pack writer | Pending blocks pack sealing | Fixture-derived | Refactor should pass | Yes | keep | Shared zero-write oracle |
| pending/Record writer | Pending blocks Record commits | Fixture-derived | Refactor should pass | Yes | keep | Shared zero-write oracle |
| pending/generic transaction writer | Gate cannot be bypassed via generic transaction | `delivery/c21/...` is fixture path; dangerous if copied as general expectation | Different fixture identity should pass if path derives from fixture | Yes | parameterize | Generate path from `DELIVERY_REF`, add non-C21 probe |
| pending rollback | Pending activation can roll back without legacy drift | Refs are fixture inputs | Storage internals may change | Yes | keep | Format plus bytes/mtime equality |
| fresh restore then accept | One immutable checkpoint-bound acceptance; repeat is idempotent | `strict`, ids are protocol/fixture literals | Layout refactor should pass except exact ref path helper | Mostly | keep | Repeated tree equality and immutable snapshot |
| accepted refuses rollback/reopens writers | Acceptance permanently closes rollback and reopens normal writes | Error code/state strings contract | Internal refactor should pass | Yes | keep | Positive writer plus zero-write rejection |
| reconciliation matrix (parent) | Reconciliation accepts only coherent descendants and rejects extra authority | Two children are representative, not exhaustive | New authority type could alter coverage | Mostly | probe | Add schema-derived known/unknown authority corpus |
| reconciliation/coherent descendant | A coherent historical descendant may be reconciled | Fixture-specific refs | Different identity should pass | Yes | keep | Restored head and acceptance binding |
| reconciliation/unexpected Record, Receipt, Snapshot | Extra authority fails closed | `project-extra`, `c21` paths are adversarial fixture literals | A new legitimate authority kind/path could cause a false failure | Partly | parameterize | Derive authoritative namespaces/schema; separately test unknown extras |
| freeze drift mode/case matrix (parent) | Both strict and reconciliation enforce the same frozen legacy baseline | Exact 2x4 matrix duplicates mode/file inventory | New protected file can escape; mode addition needs manual update | Partly | parameterize | Derive paths/modes from schema |
| freeze drift/strict: state bytes | Frozen legacy bytes cannot drift | Protected path contract | Format migration changes require contract update | Yes | keep | Mutation + zero-write rejection |
| freeze drift/strict: cycle mtime | Mtime-only drift is detected | `+2000ms` fixture mutation | Filesystem timestamp policy change could make this invalid | Mostly | probe | Probe coarse-mtime filesystems and document mtime as contract |
| freeze drift/strict: PROGRESS missing | Missing frozen file rejected | Legacy filename contract | Yes only if legacy format changes | Yes | keep | Missing-file mutation |
| freeze drift/strict: PROGRESS bytes | Changed frozen progress rejected | Marker fixture | No incidental coupling | Yes | keep | Byte mutation |
| freeze drift/reconciliation: state bytes | Same freeze rule in reconciliation | Same as strict | Same | Yes | keep | Mode cross-product |
| freeze drift/reconciliation: cycle mtime | Same mtime rule in reconciliation | Same as strict | Same risk | Mostly | probe | Mode cross-product |
| freeze drift/reconciliation: PROGRESS missing | Same missing-file rule in reconciliation | Contract path | Same | Yes | keep | Mode cross-product |
| freeze drift/reconciliation: PROGRESS bytes | Same byte rule in reconciliation | Fixture marker | Same | Yes | keep | Mode cross-product |
| evidence strict-union matrix (parent) | Every invalid evidence variant rejects before writes | Variant list is a security corpus | Additive evidence type requires intentional update; new path attack may escape | Mostly | parameterize | Maintain typed adversarial corpus per evidence schema |
| evidence/missing Snapshot | Evidence refs must resolve | Missing path fixture | Refactor should pass | Yes | keep | Zero-write failure |
| evidence/wrong Snapshot hash | Semantic hash must verify | 64 zeroes adversarial input; hash format contract | Hash algorithm change would be explicit protocol change | Yes | keep | Digest mismatch |
| evidence/unknown type | Strict evidence union rejects unknown type | `unverified_claim` adversarial input | Adding a supported type intentionally updates test | Yes | keep | Fail closed |
| evidence/absolute Snapshot path | Workspace evidence cannot be absolute | Machine-independent generated temp path | No | Yes, security boundary | keep | Absolute path rejection |
| evidence/traversal Snapshot path | Traversal is rejected | `../` adversarial input | No | Yes, security boundary | keep | Traversal rejection |
| evidence/symlink Snapshot path | Symlink escape/alias is rejected | Fixture link path | Filesystem implementation refactor should pass | Yes, security boundary | keep | Symlink case |
| evidence/missing file | File evidence must exist | Fixture path | No | Yes | keep | Missing-file rejection |
| evidence/wrong file digest | File evidence digest verifies | 64 zeroes adversarial input | Explicit hash protocol change only | Yes | keep | Digest mismatch |
| evidence/absolute file path | File refs stay workspace-relative | Temp absolute path | No | Yes, security boundary | keep | Absolute rejection |
| evidence/traversal file path | File refs reject traversal | `../` adversarial | No | Yes | keep | Traversal rejection |
| evidence/symlink file path | File refs reject symlinks | Fixture link | No | Yes | keep | Symlink rejection |
| success hash-binding modes (parent) | Both acceptance modes bind verified evidence and freeze inventory | Two modes are protocol enum | New mode needs coverage | Yes | parameterize | Iterate exported acceptance modes |
| success binds hashes/strict | Acceptance binds evidence and freeze inventory hashes | 64-hex regex and schema fields are protocol contract | Hash implementation/field rename is contract change | Yes | keep | Structured acceptance assertions |
| success binds hashes/reconciliation | Same binding under reconciliation | Same | Same | Yes | keep | Mode cross-product |

### `c23-m2-experiment-knowledge.test.js`

| Item | Contract | Hardcode | Valid-change sensitivity | Failure appropriate | Verdict | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| publishes Store API | Root factory and required methods exist | Method names are API contract; `C23 M2` only title | API redesign intentionally fails | Yes | keep | Export/method type assertions |
| fixture code locators bind bytes | Code refs carry version, digest, typed locator and point to fixture bytes | `nerf/acesim`, fact types and fixture refs are fixture data; expected hash derives from bytes | Adding facts works; changing fixture bytes correctly requires fixture metadata update | Yes | keep | Recomputes SHA-256 |
| persists typed facts/lists active project knowledge | One Record per fact, active project isolation, durable index | Exact id regex/path suffix and fixture fact count mix protocol with layout | Record path/layout evolution may fail while behavior holds | Partly | split | Separate protocol identity from storage-layout checks |
| resolves NeRF RE semantics | Alias/semantic resolution reaches implementation without name matching | Exact aliases/module keys and prose regex are fixture expectations | Better terminology or equivalent module decomposition fails | Partly | probe | Mutation: rename aliases/details while preserving semantic tags |
| explains metric meaning/direction/unit/limits | Metric response exposes comparison semantics | Fixture contract drives direction/unit; English prose regex incidental | Wording improvement fails | No for prose portion | rewrite | Assert structured meaning/comparability fields, not sentence fragments |
| resolves AceSim ownership/metrics | Cross-domain semantic lookup and ownership | Exact domain modules/phrases are fixture expectations | Domain fixture evolution fails broadly | Partly | split | Separate resolver behavior from fixture-content conformance |
| changed registered code stale/unrelated ignored | Only registered code refs affect freshness | `unregistered-result` is adversarial fixture | Refactor should pass | Yes | keep | Registered digest mutation versus unrelated file |
| missing registered code stale/actionable | Missing referenced symbol/path yields typed stale evidence | Exact `instructions_per_cycle` and `metric.ipc` fixture data | Fixture ref rename fails as expected only if metadata not updated | Yes | keep | Typed `missing` findings |
| explicit supersedes/history | Replacement requires explicit edge and preserves history | Exact count 2 derives from two fixture commits | Storage layout refactor should pass | Yes | keep | Zero-write implicit replacement and active/history views |
| replay superseded fact | Dedup replay returns persisted inactive state | Record IDs fixture-derived | Refactor should pass | Yes | keep | No third Record |
| all read APIs fail on invalid graph | Corrupt/missing/cyclic supersedes graph fails closed across reads | Graph-kind matrix is adversarial protocol input | New read API could be omitted silently | Partly | parameterize | Export authoritative read API inventory and iterate it |
| active-only reads validate inactive semantics/provenance | Invalid inactive predecessor cannot be hidden by active-only reads | `body_dedupe/provenance` are corruption classes | Schema evolution may make hand-edited fixture stale | Mostly | keep | Whole-tree unchanged on reads |
| isolates projects | Project query never leaks facts from another project | NeRF/AceSim IDs are fixture inputs | More projects should pass | Yes | keep | Negative cross-project assertions |
| rejects secrets/reasoning/private paths/malformed provenance | Write validation and redaction fail closed, zero-write | Secret markers are adversarial; forbidden absolute path is intentionally machine-like | New valid metadata fields may trip broad forbidden-key heuristics | Partly | split | Split schema validation, path safety, redaction; each variant already checks zero-write |

### `claude-codex-plugin.test.js`

| Item | Contract | Hardcode | Valid-change sensitivity | Failure appropriate | Verdict | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| detects installed plugin | Capability requires command plus recognized plugin identity/version/path evidence | Official package IDs and minimum version are contract; `/usr/local`, `/home/u`, `0.4.1` fixture inputs | Alternate install path/version passes if detection response follows fixture | Yes | keep | Mocked command responses |
| distinguishes unavailable/missing/unsupported | Typed capability states resist generic/spoofed plugins | Official identities/min version contract | Adding official aliases requires update | Yes | keep | Includes display-name spoof and package alias |
| install proposal confirmation | Proposal is non-executing and slash-command based | Exact markdown copy is incidental; command tokens are public contract | Copy edit fails several assertions | Partly | split | Assert structured action/commands; one minimal rendered semantic check |
| planning profiles gate delegation | Capability controls implementation delegation | Exact three profile names/role mapping are config contract if public | Adding profile fails `Object.keys` despite compatibility | Partly | parameterize | Validate required profiles, allow additive profiles |
| ownership rejects overlap/fallback | Cross-worker ownership is disjoint across POSIX/Windows normalization | Paths are adversarial fixtures | Refactor should pass | Yes | keep | Multiple overlap encodings |
| routing does not synthesize capability | Configuration alone cannot claim installed capability | `balanced` fixture; delegate values contract | No | Yes, safety | keep | Missing evidence case |
| routing delegates only with evidence | Installed evidence enables configured delegation | Source label fixture | No | Yes | keep | Explicit capability evidence |
| reference documents safety | Human reference mentions states, confirmation, profiles, ownership | English sentence regexes are incidental copy | Editorial changes fail | No | rewrite | Prefer structured docs/schema parity or heading/link checks |

### `codex-hooks-vnext.test.js`

| Item | Contract | Hardcode | Valid-change sensitivity | Failure appropriate | Verdict | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| official event surface/payloads | Dispatcher accepts exactly supported official events | Event enum/schema fixtures are protocol contract | New official event intentionally updates fixture | Yes | keep | Official hook fixture plus unknown-event rejection |
| output restrictions | Event-specific output schema rejects forbidden fields | Allowed/forbidden matrices are protocol contract | Schema evolution intentionally fails | Yes | keep | Validator matrix |
| operation-id requirements | Read-only hooks do not require operation id; write-capable hooks do | Exact event partition is lifecycle contract | Reclassifying event intentionally changes test | Yes | keep | Both positive/negative matrices |
| SessionStart/prompt semantics | Context is bounded/user-facing; prompt reminder does not stage writes | Exact `PLAN.md/PROGRESS.md` and Chinese wording are legacy/copy coupling | Semantic index/runtime migration or copy edit fails | Partly | rewrite | Assert no internal authority leakage and no writes; derive visible sources from current workspace format |
| compact seals/restores | PreCompact seals valid pack; PostCompact restores bounded verified context | `pre_compact`, 16 KiB are explicit protocol/resource contract | Internal storage refactor should pass | Yes | keep | Selects pack and checks bounded/no transcript |
| terminal Delivery without Capsule | Compact hooks no-op rather than fabricate context | Delivery fixture literal | Refactor should pass | Yes | keep | Both compact events return continue |
| subagent streams/reminder dedupe | Worker identities remain distinct; equivalent reminders dedupe; retired chat/inbox absent | Exact count 4 and Chinese reminder regex may overfit fixture/copy | Adding legitimate worker event or copy edit fails | Partly | split | Assert per-input event correspondence; assert reminder semantic code instead of message text |

### `cycle-acceptance.test.js`

| Item | Contract | Hardcode | Valid-change sensitivity | Failure appropriate | Verdict | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| manual cycle pending before archive | Manual acceptance gate preserves pending state | Legacy `state/cycle/log` fields and footer copy are format contract only for legacy path | New semantic runtime implementation could fail despite equivalent gate | Partly | reclassify | Move to legacy compatibility lane; add current Runtime acceptance test |
| accept/reject state without full feedback | Feedback stored by ref; rejection reopens work; acceptance completes | Exact C4 timestamped path is derived from fixed fixture time/Cycle | Timestamp format change could fail even if safe | Mostly | parameterize | Assert relative feedback ref schema and content, not full filename |
| accept clears stale continuation | Completed acceptance has no runnable continuation | Exact legacy fields | Current semantic transition may differ | Mostly | reclassify | Legacy compatibility only |
| blocks missing audit coverage | Required worker role evidence gates acceptance | Role names/error semantics contract | Worker evidence schema evolution may fail | Yes | keep | Negative acceptance |
| recommended blocks collapsed implement/test | Implement/test separation remains mandatory | Fixture worker IDs | No | Yes, safety | keep | Negative topology case |
| recommended permits audit degradation | Explicit unavailable evidence permits only audit degradation | Reason strings/IDs fixture inputs | No | Yes | keep | Positive topology case |
| blocks audit degradation without evidence | Degradation must be justified | Fixture values | No | Yes | keep | Negative case |
| prefers persisted runtime mirror | Authority prefers persisted worker evidence | Legacy mirror location may change | Authority migration can fail test although behavior equivalent | Partly | probe | Probe current Placement/Runtime authority |
| rejects Codex internal subtask observation | Host subtask observation cannot satisfy independent worker evidence | Platform name is contract | New trusted attestation mechanism would intentionally change | Yes | keep | Negative provenance case |
| blocks no worker evidence | Required evidence cannot be absent | No incidental literals | No | Yes | keep |
| blocks failed/close_failed lifecycle | Failed workers cannot satisfy acceptance | Status enums contract | Additive failure statuses could be omitted | Partly | parameterize | Iterate exported terminal failure statuses |
| blocks authorization waiting | Unstarted worker authorization is not completed work | Status/scope enums contract | No | Yes | keep |
| command map/docs exposed | Public command mapping and acceptance docs remain consistent | Reads retired `skills/cycle/SKILL.md` expectations and exact legacy docs | Currently fails after valid skill simplification | No; unrelated docs assertion blocks runtime suite | split | Runtime command-map contract separate; regenerate/current-source docs parity test replaces regex bundle |

### `deep-plan-research.test.js`

| Item | Contract | Hardcode | Valid-change sensitivity | Failure appropriate | Verdict | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| APIs exported | Three public research APIs exist | Names are API contract | API break correctly fails | Yes | keep |
| persists local read-only evidence | Research remains researching and persists bounded typed evidence | `F001/U001`, paths are fixture inputs | Layout/render copy changes can fail markdown regex | Mostly | split | Structured persistence strong; rendered context check should be semantic |
| appends entries | Append preserves status/order | IDs derive from two inputs | Refactor should pass | Yes | keep |
| allows local read-only actions | Default allowlist for repository/docs/tests/archive reads | Action enum is safety contract | New safe action omitted until intentional update | Yes | keep |
| gates non-local/side effects | Remote/edit/restart/destructive actions need confirmation | Action matrix is safety contract; reason regex incidental | Copy edit fails reason match | Partly | rewrite | Assert typed reason code, not prose regex |
| allowed_actions cannot bypass remote confirmation | Generic allowlist cannot authorize remote clone | `remote_clone` safety contract | No | Yes | keep |
| explicit confirmed remote action | Network confirmation alone insufficient; action scope required | Action/config keys contract | No | Yes | keep |
| local trusted remote action | Local trusted config may authorize; external default stays gated | Exact config key contract | No | Yes | keep |
| confirmed clone needs bounded cache/code refs | Remote evidence must remain bounded and traceable | Required ref types contract | Alternative equivalent evidence representation may fail | Mostly | probe | Mutation/probe alternate bounded ref representation |
| side effects require action-scope confirmation | Network confirmation cannot authorize local edits/restart/destructive action | Safety enum contract | No | Yes | keep |
| compact knowledge refs | Indexed refs omit discussions/transcripts/secrets and bound summary | `DP777` fixture; 320 is resource contract if documented | Better summarization passes; limit change intentionally fails | Yes | keep | Negative leakage markers and size bound |

### `explain-subagent.test.js`

| Item | Contract | Hardcode | Valid-change sensitivity | Failure appropriate | Verdict | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| handoff read-only/evidence scoped | Explain delegation cannot mutate and has typed evidence packet | Schema fields are contract; exact English prompt phrases incidental | Prompt copy edit fails | Partly | split | Assert structured policy fields; minimal rendered guidance check |
| unavailable fallback | Missing subagent yields evidence-first self fallback | Exact reason string is fixture input | No | Yes | keep |
| packet validation | Required evidence/unknown/risk fields enforced | Field names are contract | Schema change intentional | Yes | keep |
| final answer cites evidence/unknowns | Rendering preserves refs and uncertainty | Exact `confidence:` formatting incidental | Formatting improvement fails | Partly | rewrite | Assert values/sections rather than punctuation |
| redacts secrets | Secret-like packet text never renders | Markers are adversarial inputs | No | Yes, security | keep |

### `goal-lifecycle.test.js`

| Item | Contract | Hardcode | Valid-change sensitivity | Failure appropriate | Verdict | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| publishes Goal store/API | Goal store, receipt context and required methods are exported | `M6`, helper module URLs and method list are historical/API contract | Internal module move fails import probe despite root API stability | Partly | split | Public root API versus internal module publication |
| proposal persists Design/no fake Milestone | Goal proposal stores one Design Record, pointer refs only, no Milestones/receipts | `goal-alpha`, body prose and queue example are fixture inputs | Copy change in fixture body can fail regex | Mostly | keep | Structured state/Record/pointer assertions |
| full accepted lifecycle | Explicit approve/start/verify/manual accept transitions; Core does not edit product before start | Fixed refs/times/statuses are fixture/protocol inputs | State-name evolution intentionally fails; product file implementation irrelevant | Yes | keep | End-to-end positive and before-start rejection |
| fresh-process reject/revise/restart/accept | Persistence survives processes and revision needs renewed approval/start | Queue implementation, transaction IDs and exact flow are fixture inputs | Broad case fails at many steps for one local regression | Failure valid but diagnosis/blast radius poor | split | Split rejection/revision authorization from fresh-process persistence |
| Resume without Pack degrades | Runtime/Continuation resume works without Recovery Pack and does not mutate product | Fixed Goal ref/statuses fixture | Refactor should pass | Yes | keep |
| stale Pack cannot override Runtime | Runtime remains lifecycle authority over older Pack | Alternate object id fixture; error prose regex broad | Error wording change fails | Partly | rewrite | Assert typed mismatch code and authority result |

### `knowledge-opencode-gate.test.js`

| Item | Contract | Hardcode | Valid-change sensitivity | Failure appropriate | Verdict | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| F001 record/generated context | Knowledge rendering is write-fenced in mixed workspace and can render in a clean legacy root | **Reads live repository and requires C4/M05/F001 record, exact categories/tags/files/index source** | Any archive cleanup, rename or History Refresh breaks an unrelated renderer contract | No | rewrite | Build a temporary arbitrary-project fixture; separate write fence, render and indexing tests |
| F001 OpenCode smoke | OpenCode policy projection supports safe auto-continue and protects authority semantics | Reads generated `.opencode` live files and F001-era policy surfaces | Adapter regeneration/removal fails independently of Core policy | Partly | reclassify | Current adapter integration lane only; Core policy should use input fixtures |

### `maintenance-backup-policy.test.js`

| Item | Contract | Hardcode | Valid-change sensitivity | Failure appropriate | Verdict | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| system document backup | System document writes require verifiable backup metadata | Dates/ids/paths are fixture inputs; exact `applyMaintenanceRun` API is retired | All behavior unreachable now because export is absent | No in maintained lane | reclassify | Preserve only if legacy Maintenance apply remains supported |
| external action confirmation | External notification cannot advance without explicit user confirmation | Notification target is fixture input | Retired orchestration makes failure unrelated to safety policy | No | rewrite | Test current generic side-effect gate directly |
| remote/destructive/external matrix | High-risk effects all bind the gate | Side-effect enums are safety contract; maintenance run wrapper is old implementation | Wrapper retirement fails all three together | No for wrapper failure | split | Parameterize current gate API, separately test orchestration if maintained |
| ledger override ignored | User input cannot redirect authority ledger | Exact dated event id regex is incidental; no-write malicious path is security contract | Timestamp/id format change fails | Partly | rewrite | Assert path containment/no attacker file and event semantics, not exact event id |

### `opencode-hooks.test.js`

| Item | Contract | Hardcode | Valid-change sensitivity | Failure appropriate | Verdict | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| file guards informational under YOLO | Native OpenCode YOLO permissions always allow while recording info | `/home/heyx` paths are fixture inputs but only one home shape | Different home/platform untested | Mostly | parameterize | Add arbitrary POSIX/Windows home fixtures |
| all permissions allowed/auto-continue | Tool permission always allow; continuation still observes workflow gates | Exact commands/statuses are contract fixtures | New command category should still allow | Yes | keep |
| bash classification/allows | Classification records risk without blocking | Command strings are adversarial fixtures | Parser enhancement should pass/add cases | Yes | keep |
| permission event redaction | Serialized events redact secret keys/values | Secret markers are adversarial | No | Yes, security | keep |
| generated plugin imports helpers | Generated adapter wires runtime helpers | Hardcodes retired `writeOpenCodeArtifacts`, file layout and emitted source fragments | Entire file currently fails import, hiding four valid policy cases | No | split | Move generator test to adapter legacy lane; do not import retired API in policy suite |

### `pr-create-contract.test.js`

| Item | Contract | Hardcode | Valid-change sensitivity | Failure appropriate | Verdict | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| proposals for ask/worktree/plan | Proposal mode guides user without remote writes | Exact Chinese question/copy and retired `/hw:start` flow are incidental/versioned | Copy or command lifecycle update fails | No for wording/old command | rewrite | Assert typed next decision and current catalog-derived flow |
| archive confirmation/actions | Durable proposal records one confirmation scope and enumerates remote writes | Date-based `PR-20260509-001`, paths and prose are format/copy details; action set is contract | ID format/editorial change fails despite same safety | Partly | split | Structured safety/action contract separate from renderer/storage layout |

### `project-linkage-registry.test.js`

| Item | Contract | Hardcode | Valid-change sensitivity | Failure appropriate | Verdict | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| exactly seven canonical projects | Registry contains project inputs | **Hardcodes exactly seven personal projects as universal product truth** | Adding/removing/renaming any legitimate project fails | No | remove | Registry must load workspace/user data, not ship this expected list |
| identities/roles/notifications | Registry preserves configured metadata | **Hardcodes `/home/heyx/*`, personal roles and enables all notifications** | Any machine/user/project change fails | No | rewrite | Arbitrary fixture workspace; expectations derived from fixture inputs |
| legacy predecessor relations | Configured successor relations do not activate predecessors | **Hardcodes `hypo-agent`, `hypo-claw`, `hypo-info-v2` personal graph** | Legitimate graph evolution fails | No | rewrite | Parameterized arbitrary graph with active/inactive nodes |
| metadata-only/no remote actions | Registry construction has no side effects | Personal registry fixture incidental; empty effects is valid contract | Refactor should pass if generic builder remains | Yes | keep after generic fixture | Current probe fails because old builder export is absent |

### `recovery-pack.test.js`

| Item | Contract | Hardcode | Valid-change sensitivity | Failure appropriate | Verdict | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| publishes recovery APIs | Recovery store/Pack/select/restore/retention APIs exist | Method names are API contract | API break correctly fails | Yes | keep |
| seal binds authorities/cursor | Pack is sealed projection with refs, continuation, worktree and no transcript/journal | Exact `delivery/goal-alpha` path and `pre_compact` are fixture/protocol literals; `/home/` scan is incomplete | Windows/Users absolute path could leak undetected | Mostly | rewrite | Generic absolute-path/leak detector; derive storage path from object ref |
| invalid refs fail closed | Missing/drifted/local/mismatched refs and secrets reject before write | `/tmp` only covers POSIX; error regex broad | Equivalent error wording fails; Windows absolute path missing | Partly | parameterize | Cross-platform path corpus and typed errors |
| corrupt newest falls back/replays | Selection rejects corrupt newest, uses previous valid, replays delta | Event summaries are fixture inputs | Summary wording changes in fixture follows input | Yes | keep |
| timezone absolute ordering | Selection compares instants, not timestamp strings | Chosen timestamps are purposeful counterexample fixtures | Refactor should pass | Yes | keep |
| equal instant uses ancestry | Equal instant tie resolves by chain | Purposeful offset fixtures | No | Yes | keep |
| equal-clock ancestry matrix (parent) | Digest lexical order must never decide equal-clock ancestry | Two children cover both lexical relations | Comparator change correctly fails; bounded fixture search can fail first | Mostly | probe | Deterministic ids for the matrix |
| equal clock/digest lower | Descendant wins regardless of lexical digest; corrupt descendant falls back | Bounded 16-attempt search is test implementation and could rarely fail | Hash distribution/environment can make fixture construction fail | Partly | probe | Inject deterministic pack ids/tie comparator |
| equal clock/digest higher | Same invariant for opposite digest ordering | Same bounded-search risk | Same | Partly | probe | Deterministic ids |
| restore budget | Restore stays within bytes and retains authoritative next action | 8192, 30 events, summary size are resource fixture/contract | Serialization changes can cross boundary without behavior regression | Mostly | parameterize | Test multiple budgets and minimal required content |
| retention deterministic/keeps last | Plan deterministic and never removes sole valid Pack | `keep_valid_packs: 0` adversarial contract | No | Yes, safety | keep |
| retention integrity matrix (parent) | Any plan mutation or disk drift rejects before first deletion | Child list is integrity corpus | New mutable plan section might escape | Mostly | parameterize | Derive bound plan fields from schema |
| retention/delete tamper | Altered delete set rejects before removal | Fixture label | No | Yes | keep |
| retention/retained tamper | Altered retained set rejects before removal | Fixture label | No | Yes | keep |
| retention/post-plan drift | Disk drift invalidates plan before removal | Fixture label/path | No | Yes | keep |

### `runtime-store.test.js`

| Item | Contract | Hardcode | Valid-change sensitivity | Failure appropriate | Verdict | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| publishes Runtime API | Normalize/read/write/pointer APIs exist | `M2` title incidental; method names contract | API break correctly fails | Yes | keep |
| deterministic object-kind matrix (parent) | Every supported object kind gets isolated idempotent runtime/continuation files | Exact three-kind map duplicates supported-kind authority | Adding a kind can escape | Partly | parameterize | Iterate exported object-kind registry |
| deterministic files/delivery | Delivery owns separate runtime/continuation and repeat is idempotent | Exact path format is storage protocol; ref is fixture | Layout migration intentionally fails | Yes | keep |
| deterministic files/activity | Same for Activity | Same | Same | Yes | keep |
| deterministic files/bootstrap_job | Same for Bootstrap Job | Same | Same | Yes | keep |
| active pointer refs only | Legacy fallback pointer contains refs, no lifecycle copies | Exact `active.yaml` path/schema is legacy compatibility contract | Placement registry migration can make default gate stale | Partly | reclassify | Legacy fallback lane; current Placement tests own primary authority |
| invalid pointer zero-write | Lifecycle payload/schema/collision rejected before write | Schema versions/enums contract | Schema evolution intentional | Yes | keep in compatibility lane |
| ref normalization safety | Traversal/absolute/aliases/inconsistent keys rejected | `/tmp` only one platform; allowed kinds contract | New object kind requires intentional update | Mostly | parameterize | Windows/UNC absolute paths and exported kind inventory |
| cross-object refs | Outer/runtime/continuation refs must agree | Fixture refs | No | Yes | keep |
| object isolation | Updating one object cannot mutate another | Fixture refs/statuses | No | Yes | keep |
| recoverable transaction seam | Runtime writes prepare atomically and recover | Exact `after_prepare` fault phase is internal seam | Transaction refactor fails even if atomicity holds | Partly | probe | Retain white-box test plus black-box crash invariant |
| invalid schemas zero-write | Invalid version/status/action/ref rejected | Matrix is protocol adversarial input | Add schema version intentionally changes | Yes | keep |
| nested authority duplication | Runtime/Continuation cannot embed each other's authority | Exact forbidden field names are schema contract | Schema extension could trip broad recursive guard | Mostly | probe | Verify exported schema ownership map |

### `storage-sync-template.test.js`

| Item | Contract | Hardcode | Valid-change sensitivity | Failure appropriate | Verdict | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| backend-neutral projection | Storage projection has required slots and excludes Notion-specific fields | Project/home/C15/artifact paths are fixture inputs, but required slot array duplicates schema | Additive slot or backend-neutral metadata may fail exact equality/regex | Partly | parameterize | Derive required slots from schema and allow additive slots |
| redacts secret metadata | Projection omits raw secrets from workspace/project/catalog metadata | Secret markers are adversarial; personal project fixture incidental | No | Yes, security | keep after restoring/generic API | Both cases currently fail because retired builder export is absent |

### `workspace-authority.test.js`

| Item | Contract | Hardcode | Valid-change sensitivity | Failure appropriate | Verdict | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| full v1 sections | Workspace v1 requires all authority sections | Schema version/section names contract; personal fixture content incidental | Schema v2 intentionally changes | Yes | keep in versioned compatibility lane |
| unique ids/aliases | Object identities and aliases are globally unique | Personal ids are fixture inputs | No | Yes | keep |
| raw secrets forbidden | Workspace accepts secret refs, never raw values | Markers are adversarial | No | Yes, security | keep |
| derived registry cannot override identity | Compatibility view cannot override workspace authority | `/home/heyx/Hypo-Workflow` expected is correctly derived from fixture, not universal | Alternate fixture identity should pass but is not probed | Mostly | parameterize | Add arbitrary project/home fixture |
| derived view strips secrets | Compatibility projection strips nested secret fields | Adversarial markers | No | Yes | keep |
| derived authority declaration | `projects.yaml` must declare workspace authority | Authority enum contract | Architecture migration intentional | Yes | keep in legacy/version lane |
| workspace loads before compatibility | Workspace authority wins over projects compatibility file | Exact home/project identity derives from fixture | Refactor should pass | Yes | keep | Current file cannot import because retired root exports are absent; reclassify until compatibility support decision |

## Scenario audit

| Item | Contract | Hardcode | Valid-change sensitivity | Failure appropriate | Verdict | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| c21/s73 maintain ambient | Ambient Maintain captures durable facts, suppresses noise, avoids retired CLI | `C21/M7` only label; run target is maintained behavioral suite | Refactor passes if behavior API remains | Yes | keep | `run.sh` resolves root and runs `maintain-ambient.test.js` |
| v0/s05 implement-only | Historical three-step preset | **No `run.sh`; checklist fixes exactly 3 steps and protected legacy files** | Any workflow evolution cannot be evaluated and checklist becomes stale | No executable signal | remove | Quarantined, non-runnable, legacy authority |
| v11/s69 audit examples | Canonical negative examples cover role separation and audit gates | Scenario IDs s64-s68 and fixture paths are historical references | Renumbering/layout changes can fail docs rather than behavior | Partly | reclassify | Quarantined; runner targets focused fixture test |
| v6/s19 help list | Help documentation enumerates current commands/groups | Checklist says 36 while runner requires **41**; exact count and long command list are incidental | Adding/removing one valid command causes broad failure | No | rewrite | Generate help/docs from command catalog and compare sets, never fixed count |
| v6/s29 plan-review migration | Historical alias migration messaging | Hardcodes retired paths and exact Chinese copy | Removing expired compatibility fails | Appropriate only for versioned legacy lane | reclassify | Quarantined compatibility artifact |
| v8.2/s39 compact generator | Historical compact artifacts/defaults | Exact old skill path, five filenames, schema keys | Current Recovery Pack architecture makes it obsolete | No current relevance | remove | Quarantined legacy resume/compact lane |
| v8.3/s49 showcase bootstrap | Reference showcase exists | **Hardcodes C2 archive, Hypo-Workflow, 31 commands, missing API-key text and poster layout** | Any unrelated docs/archive change fails | No; pure reference-repository coupling | remove | Directly reproduces prohibited hardcoding pattern |
| v9/s59 regression bundle | Historical scenario registry completeness/offline property | Hardcodes scenario number threshold, s61-63 names, V9 directory, **41 commands**, README links | One valid scenario/command/docs change cascades | Mostly no | split | Keep generic offline scanner; replace enumerations/count/docs bundle with catalog-derived checks |

## Findings

### High

1. **`project-linkage-registry.test.js` explicitly turns one user's machine into product truth:** it requires exactly seven named Hypo projects, `/home/heyx/*` paths, personal roles, successor edges and notification settings. This is the same class of non-generic hardcoding as the reported activator bug and should not be a maintained test.
2. **`knowledge-opencode-gate.test.js` tests the live repository's C4/M05/F001 historical Record and generated files:** archive cleanup, semantic migration or a different project breaks the test without breaking Knowledge rendering/policy.
3. **Reference showcase Scenario is pure hardcoding:** `s49-showcase-bootstrap` fixes C2, project name, command count, artifact layout and incidental failure copy. It has no portable product contract.
4. **Fourteen current failures expose retired-surface blast radius:** adapter generation, Cycle docs, Maintenance apply, project linkage builder, storage projection builder and workspace compatibility exports fail or prevent otherwise independent behavior from running.
5. **Quarantined help/regression scripts encode exact command counts (41; checklist still says 36):** these are duplicated snapshots of catalog data and fail on valid additive/removal changes.

### Medium

1. Claude plugin reference and several rendering tests validate prose/layout with regex rather than source-backed semantics.
2. C23 Experiment Knowledge tests combine storage layout, fixture-domain truth, semantic rendering, safety validation and graph integrity in large cases. A single valid fixture/schema evolution can fail unrelated assertions; split contracts before mutation testing.
3. Hook tests assert legacy `PLAN.md/PROGRESS.md` context and exact Chinese reminder fragments rather than current authority selection and typed reminder causes.
4. Goal end-to-end tests and Recovery Pack tests protect important contracts but combine many transitions/storage assertions; split them so a valid local change does not obscure the exact broken contract.
5. Runtime `active.yaml`, workspace authority, Maintenance apply, storage sync and OpenCode adapter generation are legacy/retired compatibility surfaces still present in the default executable inventory rather than an explicit compatibility profile.
6. Recovery path rejection covers `/tmp`/`/home` but not Windows drive, UNC or `/Users` forms, allowing platform-specific hardcodes/leaks to escape.

### Low

1. Many titles retain Cycle/Milestone labels (`C21`, `C23`, `M5`, `M6`, `F001`); harmless as names, but they obscure reusable contracts.
2. Fixed times, ids and marker strings are generally legitimate fixture inputs in this shard because outputs are derived from them. They should remain visibly fixture-scoped.
3. Broad error-message regexes in research/ownership tests are copy-sensitive or can accept the wrong error; typed error/reason codes are preferable.

## Counterfactual / mutation probe candidates

1. Feed arbitrary projects/homes/relations into linkage and workspace fixtures (`project-a`, `/home/other`, `/Users/name`, drive/UNC) and verify outputs derive only from inputs.
2. Remove C4/M05/F001 live records and generated `.opencode` artifacts while supplying equivalent temporary fixtures; Knowledge/Core behavior should remain testable.
3. Rename/restructure OpenCode adapter generation while preserving structured output to prove analysis/policy cases do not depend on retired `writeOpenCodeArtifacts`.
4. Replace human-facing wording in Claude/Explain/Hook/PR output without changing structured contracts; editorial changes should not be release failures.
5. Add an optional planning profile and a new safe research action; existing required behavior should remain green without exact-array failure.
6. Rename C23 fixture aliases/prose while preserving semantic tags and structured metric direction/unit; resolver behavior should remain green.
7. Change Record/Pack storage layout while preserving public Store/restore results; storage conformance and user behavior should fail independently.
8. Run Recovery/Runtime path safety against POSIX, macOS, Windows drive and UNC absolute paths.
9. Inject deterministic Pack ids to exercise both lexical digest relations without bounded hash-search fixtures.
10. Retire Maintenance/linkage/storage/workspace compatibility exports in a catalog-consistent build; compatibility-only tests must not block maintained gates.
11. Generate command help with 40, 41, and 42 valid catalog entries; docs set equality should pass without a fixed count literal.

## Catalog and fixture issues

- Catalog classifications correctly mark seven of eight shard Scenarios quarantined, but quarantine is not sufficient if full test orchestration still treats their static scripts/results as current release evidence. `s49`, `s39`, and non-runnable `s05` should be removed from executable expectations; `s19/s59` should be rewritten before any promotion.
- `s69` checklist boxes remain unchecked despite a runnable focused test; generated historical result state should not be treated as present evidence.
- `bootstrap-acceptance` fixture helpers appropriately centralize fixed refs/time, but the test duplicates the four-file freeze inventory instead of consuming schema authority.
- C23 knowledge fixtures are good examples of input-derived hashes, but semantic prose expectations and storage path expectations need separation from Store behavior.
- C21 Goal/Recovery/Runtime helpers centralize fixed identity/time well; those literals remain fixture inputs as long as outputs are derived rather than generalized.
- `project-linkage-registry` does not use a fixture boundary at all: the expected personal registry is duplicated in the test and production builder. Replace both with workspace-supplied data.
- Retired API tests are not classified separately in the executable inventory, causing failures before the intended behavioral assertions run.

## Diagnostic validation result

The read-only shard execution produced:

```text
tests 150
pass 136
fail 14
```

Failures and audit interpretation:

1. `analysis-interaction.test.js`: stale retired adapter export prevents all four defined cases from loading.
2. `cycle acceptance command map and docs are exposed`: stale Cycle skill copy expectation; 12 runtime acceptance cases remain green.
3. All four `maintenance-backup-policy` cases: retired `applyMaintenanceRun` root export; gate behavior never runs.
4. `opencode-hooks.test.js`: stale retired adapter export prevents all five policy/generator cases from loading.
5. All four `project-linkage-registry` cases: retired builder export; independently, their personal seven-project expectations are invalid as generic contracts.
6. Both `storage-sync-template` cases: retired builder export.
7. `workspace-authority.test.js`: retired compatibility exports prevent all seven defined cases from loading.

## Zero-omission self-check

- Inventory was recomputed recursively with `rg --files core/test` from **179** sorted executable files: selected indices `3, 13, ..., 173`, exactly 18 paths, all listed above.
- The recursive fixture test that caused the former offset was explicitly included in the global sort; the 10 former extraneous and 10 formerly missing paths are listed in `Inventory correction`.
- Scenario inventory was recomputed from the 76 sorted maintained+quarantined catalog paths: selected indices `3, 13, ..., 73`, exactly 8 paths, all listed above.
- Every defined top-level test case in all 18 files has a row. All runner-generated nested Bootstrap cases (7 pending writer/read cases, 2 reconciliation cases, 8 freeze-drift cases, 11 invalid-evidence cases, 2 success modes) are individually named and assessed.
- Generated Runtime kind cases (`delivery`, `activity`, `bootstrap_job`), Recovery digest-order cases (lower/higher), and retention integrity cases (delete tamper, retained tamper, disk drift) are individually assessed.
- Parameter matrices inside non-`t.test` cases are called out in their owning rows and probe/parameterization recommendations; they are assertions inside one runner case, not omitted runner cases.
- Associated fixtures, shell runners, catalog classifications and directly-read documentation/templates were inspected.
- Only this report file was added; production code, tests, fixtures, catalog and Scenario files were not modified.
