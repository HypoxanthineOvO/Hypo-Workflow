# Primary Test Contract Audit - Shard 04

## Scope and method

- Repository: `/home/heyx/Workspace/Hypo/Hypo-Workflow`
- Partition: normalized path sort, zero-based index `% 10 == 4`.
- Method: `METHODOLOGY.md`; read every assigned test body and its directly consumed fixture/checklist/runner surface. This is a static contract audit only: no production or test files were edited and no mutation was applied.
- Inventory: 18 executable test files (89 top-level/dynamically declared `node:test` cases; parameter-loop variants are called out in Evidence) and 8 catalog Scenarios.

## Coverage checklist

### Executable tests

- [x] `core/test/analysis-preset.test.js`
- [x] `core/test/bootstrap-activation.test.js`
- [x] `core/test/c23-m3-experiment-runs.test.js`
- [x] `core/test/claude-hooks.test.js`
- [x] `core/test/codex-subagent-discipline.test.js`
- [x] `core/test/cycle-lifecycle-vnext.test.js`
- [x] `core/test/deletion-gate.test.js`
- [x] `core/test/explore-contract.test.js`
- [x] `core/test/guide-router.test.js`
- [x] `core/test/layered-config-integration.test.js`
- [x] `core/test/maintenance-command-map.test.js`
- [x] `core/test/opencode-model-matrix-docs.test.js`
- [x] `core/test/pr-create-execution.test.js`
- [x] `core/test/project-notifications.test.js`
- [x] `core/test/reference-contract.test.js`
- [x] `core/test/secret-ref-projection.test.js`
- [x] `core/test/subagent-separation-contract.test.js`
- [x] `core/test/workspace-concurrency-recovery.test.js`

### Catalog Scenarios

- [x] maintained `tests/scenarios/c21/s74-resume-recovery`
- [x] quarantined `tests/scenarios/v0/s06-custom-sequence`
- [x] quarantined `tests/scenarios/v2.5/s10-progressive-disclosure`
- [x] quarantined `tests/scenarios/v6/s20-help-init`
- [x] quarantined `tests/scenarios/v6/s30-init-rescan`
- [x] quarantined `tests/scenarios/v8.2/s40-compact-session-start`
- [x] quarantined `tests/scenarios/v8.4/s50-rules-system`
- [x] quarantined `tests/scenarios/v9/s60-progress-board-format`

## Per-case audit

### `analysis-preset.test.js`

| Item | Contract | Hardcode | Valid-change sensitivity | Failure appropriate | Verdict | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| analysis spec defines preset chain... | Analysis is a preset with a declared taxonomy/step contract, not a test profile. | Six step identifiers are public configuration values; English headings and exact prose are document layout/wording. | Heading rename or equivalent prose fails despite unchanged behavior. | Only field/step absence is meaningful; heading/prose failure is not. | split | L20-45 mixes schema tokens with five prose/heading regexes. |
| preset step sequences include analysis... | Preset compiler returns ordered steps; custom sequence passes through. | Exact step arrays are explicit preset contracts; `one/two` are fixture inputs. | Legitimate preset contract changes should require focused update; unrelated refactor should pass. | Yes, if sequence contract changes. | keep | L49-70 calls public API and compares all four outputs. |
| discover taxonomy normalizes... | Alias normalization and batch artifact propagation. | `F301`, `C9`, title are fixture inputs; expected aliases are stable enum contracts. Markdown column labels are incidental rendering text. | Renaming table headers fails only two loose matches; structured checks remain sound. | Structured failures appropriate; header wording is not. | split | L87-107 verifies objects, then `/Workflow/` and `/Analysis Kind/`. |
| project config validation accepts analysis preset | CLI validator accepts valid `execution.steps.preset: analysis`. | Temporary name is fixture input. | Additive config support does not fail. | Yes. | keep | L110-134 uses generated config and exit status. |

### `bootstrap-activation.test.js`

| Item | Contract | Hardcode | Valid-change sensitivity | Failure appropriate | Verdict | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| M5 publishes activate... APIs | Activation/recovery APIs remain public from migration and root modules. | API names are public; `M5` is narrative only. | Public rename intentionally fails; internal relocation with preserved exports passes. | Yes. | keep | L35-45,55-68. |
| manifest-last activation installs complete C21 authority... | Atomic cutover installs all authority, preserves legacy bytes, creates usable recovery surfaces. | **Problem:** fixed project id, `C21/M5/M6`, literal `c21` paths, minimum 10 writes, exactly 7 records/6 dedupe keys and a particular architecture record. Values originate in one reference fixture but expectations are hand-copied. | Adding a valid migrated record, changing fixture cycle, or adding an authority file causes unrelated failure. | Security/state assertions are valid; counts/paths produce fixture-maintenance cascades. | parameterize | L75-160; derive identity/count/path expectations from fixture input and returned refs, not C21 literals. |
| activation faults... recover deterministically | Manifest-last recovery direction for prepare/install/pre/post-manifest faults. | Four fault phases are internal transaction hook contracts used by fault injection; expected outcome mapping is intentional. | Renaming internal phases breaks test even if atomic guarantee remains; however the injector API exposes these phases to tests. | Mostly appropriate; probe whether phase names are supported testing API. | probe | L163-208; subcases `after_prepare`, `after_install_file`, `before_manifest_activation`, `after_manifest_activation`. |
| pending activation blocks parallel Bootstrap... | Single-writer/exclusive activation before staging side effects. | IDs are fixture inputs; broad error regex is tolerant. | Implementation refactor passes if exclusivity/zero-write remain. | Yes. | keep | L211-244 snapshots tree and legacy authority. |
| activation revalidates audited source digests... | Audited source drift fails before all writes. | One fixture source path is legitimate attack input, but ties test to fixture layout. | Renaming the fixture source requires test edit; algorithm changes pass. | Appropriate for fixture, but source should be selected from audited input. | parameterize | L246-265 writes a fixed accepted-outcome path. |
| rollback checkpoint is usable... | Pre-acceptance rollback restores legacy content and removes new authority only. | `.pipeline/manifest/memory/snapshots` are product surfaces; exclude `runtime` is implementation-shaped. | Legitimate new retained runtime evidence or directory rearrangement may fail broadly. | Byte preservation is meaningful; directory nonexistence is over-broad. | split | L267-295 mixes protected-byte contract with exact cleanup layout. |
| fresh child process restores... | Fresh-process recovery selects latest valid pack, rejects corrupt head, stays read-only, ignores legacy/transcript. | **Problem:** object ref `{delivery,c21}`, pack path `/delivery/c21`, M5/M6, byte budget 32768 and old fixture strings are copied constants. | Any generic fixture identity change fails even when recovery is correct. | Corrupt-pack/read-only failures are valid; identity literals are not generic. | parameterize | L297 onward builds child script with hard-coded `c21`; expected refs should come from `DELIVERY_REF`/fixture. |

### `c23-m3-experiment-runs.test.js`

| Item | Contract | Hardcode | Valid-change sensitivity | Failure appropriate | Verdict | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| publishes pure run compilation... | Required Experiment run APIs are exported. | API names are public contract. | Only public API removal fails. | Yes. | keep | L25-30. |
| fixtures describe uv, snapshots... | Direct fixtures cover required execution provenance dimensions. | Fixture ids/files are examples; exact sample attributes are fixture-owned. | Adding compatible fixture structure passes; renaming example files fails. | Mostly appropriate as fixture validation. | keep | L32-54 reads `nerf.json` and `acesim.json`. |
| compiles one canonical reproducible run... | Canonical run identity is deterministic and compilation avoids machine/local-data probes. | Exact fixture-derived argv/hash/id may be copied expectations. | Equivalent canonical representation improvements could fail many fields. | Determinism failure valid; representation coupling needs probe. | probe | L56-87 compiles the same input twice and checks no external probe. |
| materializes argv and readable output layout... | Structured bindings produce safe argv and output refs. | Example args/path values are fixture inputs. | New optional output fields should pass unless deep equality is used. | Appropriate if assertions select required fields. | keep | L89-108. |
| expands a NeRF chair screen... all eight scenes | Selected method is promoted across declared scenes. | **Problem:** “eight scenes” and expected scene values duplicate fixture data. | Adding/removing a declared scene legitimately breaks the test. | Failure can mean fixture evolution, not compiler defect. | parameterize | L110-132; expected count/order should derive from scan declaration. |
| expands AceSim single frequency axis... | Declared one-axis scan expands in stable declaration order. | Frequency/trace samples belong to fixture; copied expected list risks drift. | Fixture expansion changes fail despite correct compiler. | Ordering contract is valid; copied sample truth is not. | parameterize | L134-150. |
| expands AceSim L1/L2 cross scans... | Cartesian expansion and stable axis ordering. | L1/L2 labels and values are fixture inputs, not universal axes. | New axis/value causes expected count cascade. | Algorithm failure valid; literal matrix failure ambiguous. | parameterize | L152-174. |
| records deterministic host-memory exhaustion... | Failed attempt is structured, persisted and linked to run identity. | Error/timestamp/id are supplied fixture evidence. | Additive fields pass if selective asserts. | Yes. | keep | L176-205. |
| requires same-identity rerun parents... | Rerun lineage cannot cross run identities; a different scene is distinct. | Scene names are attack fixtures. | Identity algorithm changes appropriately demand review. | Yes. | keep | L207-264. |
| rejects non-uv, unbound snapshots, raw secrets, unsafe paths | Execution provenance and secret/path safety boundaries. | Concrete bad strings are attack vectors, not universal expected output. | More accepted safe forms should only affect corresponding variant. | Broad regex can mask wrong rejection reason. | split | L266-360; preserve zero-write checks, replace broad shared error regex with per-class codes. |
| rejects ambiguous scan axes... collisions | Scan declaration ambiguity and readable-id collisions fail closed. | Duplicate values/axis examples are fixture attack inputs. | New valid scan syntax might be rejected by old expectations. | Broad error regex weakly attributes failures. | split | L362-400; assert structured error code per variant. |
| recordRun revalidates compiled identity... | Store distrusts caller-supplied compiled identity and is zero-write on invalid evidence. | Output path variants derive from run spec; raw marker is attack input. | Adding output kinds may require updating “all declared output” construction. | Correct boundary, but hand-built output list risks omission. | parameterize | L402-471 explicitly enumerates log/config/metrics output refs. |
| stores run facts without creating scheduler... | Experiment Store records facts but is not runner/scheduler authority. | Regex over `scheduler|jobs?|tmux|pids?|processes` is incidental filename policing. | A legitimate evidence filename containing `process` can falsely fail. | No-authority contract is important, but arbitrary path substring is not proof. | rewrite | L473 onward scans every created file by name; assert allowed authority schema/types instead. |

### `claude-hooks.test.js`

| Item | Contract | Hardcode | Valid-change sensitivity | Failure appropriate | Verdict | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| SessionStart and compact hooks inject resume context | Resume packet contains current work, next step, anti-replay and recent evidence. | **Problem:** exact `M04/F001`, `write_tests` and English prose are one legacy fixture/output wording. | Equivalent localized or semantic output fails. | Missing context is valid; wording mismatch is not. | rewrite | L18-31; assert structured context/source refs or stable markers. |
| Stop blocks missing critical evidence... | Critical missing Progress blocks; metrics gap warns only. | Filenames are current hook contract. | Replacing legacy Progress with semantic Runtime would fail, potentially intentionally during migration. | Appropriate only while legacy hook contract is supported. | reclassify | L33-47 tests legacy `.pipeline/PROGRESS.md`/metrics policy. |
| PermissionRequest follows safety profiles | Developer/standard/strict yield allow/ask/deny for scoped risks. | Profile/decision enum values are public; paths/commands are attack fixtures. | Policy change should focus failure to affected profile. | Yes. | keep | L49-70. |
| tool and progress hooks emit parseable refresh | Tool/file events expose Progress refresh metadata. | Fixed Progress path is the selected fixture input. | Other file support does not fail. | Yes for legacy compatibility. | keep | L72-89. |
| generated settings register initial hook events | Generated Claude config registers supported wrapper events. | **Problem:** exact nine-event list is copied inventory; adding/removing a supported event does not necessarily update test source coherently. | Event deprecation causes broad failure; additive events are not checked for parity. | Partial inventory check can both over- and under-constrain. | rewrite | L91-99; derive expected events from canonical hook registry/schema. |
| wrapper returns valid JSON | CLI wrapper emits parseable host output. | Resume wording assertion is incidental. | Localization fails valid wrapper. | JSON parse is meaningful; prose is not. | split | L101-108. |

### `codex-subagent-discipline.test.js`

| Item | Contract | Hardcode | Valid-change sensitivity | Failure appropriate | Verdict | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| shared guidance encourages Codex subagents... | Codex subagents are local runtime workers and no external routing is required. | Four exact English phrases are prose. | Translation/rewording fails wholesale. | No; it proves wording, not behavior/projection. | rewrite | L42-51. |
| start/resume platform-neutral language | Generated guidance avoids Claude-as-orchestrator and identifies main agent. | Regex phrase blacklist/whitelist. | Equivalent wording fails or forbidden concept evades regex. | Weak signal. | rewrite | L53-62. |
| policy separates implementation/validation... | Separation, identity, authorization and evidence contract. | Large phrase inventory and aliases `codex/claude/auto`; concepts stable, prose not. | Editorial change fails many assertions. | Contract omission matters; literal phrasing does not. | rewrite | L64-81; validate structured policy projection. |
| strict separation hides test source... | Implementer cannot see tests and degraded mode requires confirmation/evidence. | Regex spans concatenated docs/templates and can be satisfied in wrong file. | Moving policy ownership fails/false-passes unpredictably. | No precise source attribution. | rewrite | L83-95. |
| patch lane preserves lightweight scope... | Patch worker authorization/role/lifecycle contracts. | **Severe:** 20+ exact bilingual regexes duplicate a whole policy document. | Any valid wording edit creates a failure wall; one matching paragraph can mask missing local projection. | Failure blast radius is disproportionate and hard to diagnose. | rewrite | L97-118+; replace with structured source plus projection equivalence tests. |
| topology selects strict/solo/migration/custom | Pure policy selection returns required roles and constraints. | Enum/role arrays are explicit product policy constants. | Policy contract edits correctly require focused update. | Yes. | keep | L120-153. |
| evidence enforces coverage/distinct identities | Readiness rejects role collision/missing roles. | Worker ids are fixtures; role enums are contract. Error prose regex is incidental. | Error wording change causes one irrelevant failure. | Behavioral checks valid; message check should use code/structured collision. | split | L155-194. |
| Plan/Resume reference topology lifecycle... | Skill projections preserve lifecycle/degraded constraints. | Seven exact English sentences. | Localization/editorial changes fail. | Projection drift matters, prose does not. | rewrite | L196-207. |
| legacy phrases do not remain in repository | Retired policy terminology is absent. | **Problem:** blacklist scans nearly entire repo, including archives/user data, and encodes incidental phrases. | Adding historical docs or audit reports can fail unrelated implementation changes. | Unbounded cascade and false positives. | rewrite | L209-263; scope to generated active surfaces or structured projection IDs. |
| setup/help do not route Codex to external providers | User docs do not claim Claude provider routing. | **Problem:** exact “53 user-facing commands” is an accidental count; positive prose is wording. | Adding one command fails unrelated routing test. | Count failure is plainly unrelated. | split | L265-275; remove count and test canonical routing config/absence. |

### `cycle-lifecycle-vnext.test.js`

| Item | Contract | Hardcode | Valid-change sensitivity | Failure appropriate | Verdict | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| Cycle compiler/store available | Public peer Delivery APIs exported. | API names public. | Only public break fails. | Yes. | keep | L43-54. |
| proposal persists ordered Milestones, no gates | Cycle proposal stores ordering and keeps acceptance cycle-level. | M1/M2 are fixture input; expected list should ideally derive from plan. | Adding a fixture milestone fails by design of current fixture. | Focused and reasonable. | keep | L56-80. |
| enforces Milestone order... aggregate acceptance | Earlier milestone required; per-milestone verification cannot request acceptance. | Two milestones/roles are fixture/policy inputs. | Alternative valid plan size not covered but additions do not fail. | Yes. | keep | L82-144. |
| real two-Milestone Cycle survives revision... | Full approve/start/verify/reject/revise/accept/resume state machine and product isolation. | Many C21/M6 fixture ids/times and two product files; all are supplied inputs, not universal truth. | Additive state fields pass; transition changes fail at relevant step. | Mostly appropriate, though long case has broad blast radius and diagnosis cost. | split | L146-302; split transitions/recovery while retaining one thin E2E. |

### `deletion-gate.test.js`

| Item | Contract | Hardcode | Valid-change sensitivity | Failure appropriate | Verdict | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| Manifest binds hashes/Git and excludes protected set | Protected authority/evidence cannot enter ordinary deletion; manifest binds content and HEAD. | **Problem:** protected list hard-codes `c21`, M5, reference migration and exact legacy paths. | New generic object ids or new protected surface may be untested; path migration breaks old assertions. | Current paths are examples, not proof of general protection classification. | rewrite | L15-52; construct protected paths from multiple object refs and protected-surface classifier. |
| no Receipt/wrong owner/expiry/content/Git drift | Five independent fail-closed preconditions preserve target. | Scenario labels and dates are attack fixtures. | Policy extension should not affect existing cases. | Yes; broad error regex is minor weakness. | keep | L54-93; loop covers missing, owner, expired, content, git. |
| controlled executor... deletes once | Authorized exact deletion consumes Receipt and writes evidence. | Target is fixture input; report path regex is loose. | New report layout passes broadly. | Yes. | keep | L95-123. |
| repository deletion separates authority/target | Receipt authority may be in a distinct repository and evidence remains authority-owned. | Paths are fixture inputs. | Refactor passes if behavior preserved. | Yes. | keep | L125-151. |

### `explore-contract.test.js`

| Item | Contract | Hardcode | Valid-change sensitivity | Failure appropriate | Verdict | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| creates metadata and isolated worktree | Exploration identity, branch/worktree isolation and metadata persistence. | **Problem:** exact `E001`, slug, `main`, YAML/log/knowledge paths and `.hypo-workflow` layout combine public format with implementation layout. | Configurable default branch/path or metadata store evolution causes many failures. | Isolation failures valid; exact layout cascade is excessive. | split | L18-47. |
| dirty main requires explicit decision | Dirty source cannot write metadata without explicit override. | Topic/path are fixtures. | Equivalent implementation passes. | Yes. | keep | L49-70. |
| command map/skill/OpenCode/path exposed | Public route and generated artifact are present. | **Problem:** exact `/repo/project`, `/home/hw`, E123, skill wording and unrelated `batch.default_gate=auto`. | Batch default change fails explore test; path policy edits fail multiple concerns. | Contains unrelated assertion. | split | L72-86; remove batch assertion, separate route/projection/path contracts. |

### `guide-router.test.js`

| Item | Contract | Hardcode | Valid-change sensitivity | Failure appropriate | Verdict | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| recommends one path for lifecycle/intents | Router maps workspace state and intent to a single next workflow. | **Problem:** legacy `state/cycle C5`, exact command arrays and old sync/docs/setup routes are copied examples. | Valid route modernization fails many examples. | If public routing changes intentionally, focused fixture updates are reasonable; old authority shape should be quarantined. | reclassify | L11-65 appears pre-semantic lifecycle. |
| covers plan/deep/batch/patch/explore | Intent classification distinguishes lanes. | English phrases are fixture inputs; exact route IDs/flows are public-ish result schema. | NLP synonym improvements pass; route redesign fails. | Mostly appropriate. | keep | L67-77. |
| adaptive Discover escalates design risk | Only architecture/source-of-truth risk escalates. | Exact first question list hard-codes choreography/order. | Adding a useful discovery question breaks unrelated risk-classification test. | Mode/reason failure valid; question array failure is over-coupled. | split | L79-95. |
| concept artifacts separate concepts/glossary/index | Structured artifacts keep ownership boundaries. | `.pipeline/cycle.yaml` and state transition strings are fixture content echoed through output. | Fixture changes require matching expected echo; okay, but obsolete protected path is suspicious. | Mostly appropriate. | keep | L97-130. |
| routing and artifact layering connected | Natural-language guide resolution and docs expose layered artifacts. | **Problem:** exact Chinese prompt, doc headings/paths and skill prose in one test. | Editorial docs change fails behavior test. | Mixed failure attribution. | split | L132-151. |

### `layered-config-integration.test.js`

| Item | Contract | Hardcode | Valid-change sensitivity | Failure appropriate | Verdict | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| project > user > defaults and sources | Layer precedence and provenance. | Temp paths/timezones/project ids are fixture inputs; authority order is product contract. | Additive config passes. | Yes. | keep | L16-56. |
| defaults cover local projects without `/home/heyx` | Defaults are portable and include integration registry. | **Problem:** requires product-specific `hypo-workflow`/`hypo-writer` defaults while claiming generic local coverage. | Removing bundled project examples or adding generic registry breaks intent mismatch. | `/home/heyx` rejection valid; named project presence is not portability. | split | L58-81. |
| migration plan dry-run and prompt | Migration never writes silently and presents explicit next action. | Legacy named integrations are fixture input; prompt regex is prose. | Equivalent prompt wording fails. | Dry-run/file absence valid; prose only weakly valid. | split | L83-111. |
| only explicit migration API writes; sync does not | External write boundary requires explicit API confirmation. | Retired CLI path/platform and prompt wording tie to implementation. | CLI retirement/adapter change fails despite preserved authority API. | Core write boundary meaningful; CLI portion should be separate/quarantined. | split | L113-146. |
| runtime contains no forbidden `/home/heyx` | Shipping runtime/scripts contain no developer-machine path. | The forbidden path is the known defect signature; scope prefixes are intentional. | Another user path is not caught; moving runtime directories changes scope. | Useful regression but incomplete hardcode detector. | rewrite | L148-158; scan machine-absolute-path classes with allowlist, not one username. |

### `maintenance-command-map.test.js`

| Item | Contract | Hardcode | Valid-change sensitivity | Failure appropriate | Verdict | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| maintain family exposed | Canonical root/subcommands and route/skill ownership. | Eight subcommands and route identifiers are public command contract. | Adding subcommands passes; removing/renaming intentionally fails. | Yes. | keep | L5-33. |
| maintain remains separate from sync | Maintenance and sync map to distinct routes/surfaces. | OpenCode colon mapping is adapter contract. | Compatible alias addition passes. | Yes. | keep | L35-52. |

### `opencode-model-matrix-docs.test.js`

| Item | Contract | Hardcode | Valid-change sensitivity | Failure appropriate | Verdict | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| command/parity docs use matrix agents | Docs projections agree on role agents. | Exact Markdown table rows and three legacy commands/agents. | Formatting or command-map regeneration change fails. | No behavioral attribution. | rewrite | L5-15; derive docs from canonical map or snapshot structured rows. |
| guide documents matrix defaults/boundaries | Published model/context defaults and host ownership are documented. | **Problem:** model names `deepseek-v4-*`, target 900000 and Chinese prose are target/config values copied into test. | Valid model/default tuning fails source test. | Such change may be intentional and target-owned, not a Core regression. | reclassify | L17-28; validate generated docs against canonical config if this remains supported. |
| sync scenario exists and covers artifacts | Scenario checks generated model-matrix files. | Exact artifact names are adapter surfaces; grep terms are implementation text. | Artifact restructuring fails this meta-test and scenario together. | Duplicative and weak. | rewrite | L30-40 reads another scenario's source instead of executing it. |

### `pr-create-execution.test.js`

| Item | Contract | Hardcode | Valid-change sensitivity | Failure appropriate | Verdict | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| no provider writes before confirmation | Remote side effects are zero before confirmation. | Provider/branch labels are fixture inputs. | Additive planning passes. | Yes. | keep | L8-25 checks empty provider call ledger. |
| provider writes deterministic order after confirmation | Push precedes create, reviewers and labels. | Four provider methods are the explicit operation contract. | Optimizing reviewer/label calls in parallel would fail and needs safety review. | Yes if ordering is required; otherwise overspecified. | probe | L27-48. |
| worktree summary teaches decisions | Summary identifies dirty/default branch and file scope. | **Problem:** suggested branch `feature/pr-create` is unrelated fixed output rather than derived from title/input; guidance prose is exact language. | Better branch naming or localization fails. | Dirty/scope failure valid; branch/prose failure not. | split | L50-69. |

### `project-notifications.test.js`

| Item | Contract | Hardcode | Valid-change sensitivity | Failure appropriate | Verdict | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| enqueue writes pending evidence without QQ | Enqueue is local-only and append authority/summary are coherent. | Example project `/home/heyx/Hypo-Workflow` is input, but exact global queue layout is product storage contract. | Project input variation should pass; storage migration fails many asserts. | Safety assertions appropriate; exact layout should be centralized. | parameterize | L12-40 and base fixture L143-165. |
| dispatch only with confirmed dispatcher | Unconfirmed dispatch has zero external contact; confirmed dispatch records result. | Executable name and QQ result shape are adapter contract fixtures. | Provider replacement fails this retired integration test broadly. | Test describes a feature later declared retired, so catalog relevance is questionable. | reclassify | L42-92. |
| Claude Stop reports retired path | Stop does not externally notify and explains replacement. | Exact replacement prose `Hermes Codex completion watch`. | Renaming replacement fails despite zero-side-effect guarantee. | Safety part valid; prose is not. | split | L94-111. |
| Codex notify no longer enqueues QQ | Hook script excludes retired dispatch commands. | Grep strings/variable name are implementation text. | Shell refactor fails positive `workflow_root`/comment matches. | Negative command checks valid; positive wording not. | split | L113-121. |
| dispatcher wrapper retired | Wrapper cannot dispatch and contains portable PATH. | Exact PATH fragments and retirement prose. | Safe PATH refactor fails. | No-dispatch is meaningful; path/prose overfit. | split | L123-132. |
| CLI exposes status/dispatch commands | Retired notification command remains exposed. | Exact help fragment is public CLI contract but contradicts retirement direction. | Removing retired command causes failure, likely a valid cleanup. | Current test protects obsolete surface. | remove | L134-141. |

### `reference-contract.test.js`

| Item | Contract | Hardcode | Valid-change sensitivity | Failure appropriate | Verdict | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| references document response/audit/whitelist | Required planning fields and automation classes are specified. | Field/config names are schema contracts; `conclusion/explanation/next steps/manual` are unscoped prose tokens. | Editorial changes or unrelated “manual” occurrence can false fail/pass. | Field omissions valid; generic prose tokens are not. | split | L5-34. |

### `secret-ref-projection.test.js`

| Item | Contract | Hardcode | Valid-change sensitivity | Failure appropriate | Verdict | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| metadata-only refs with health/redaction | Projection preserves allowed metadata and removes all raw secrets/auth excerpts. | Secret/provider/project ids and timestamps are attack fixture inputs; forbidden-key set and metadata mode are security contracts. | Additive safe metadata passes; adding a forbidden raw field correctly fails. | Yes. | keep | L5-96 recursively checks keys and raw markers. |
| rejects raw fields in supplied refs | Preprojected refs are sanitized too. | Raw marker literals are attack inputs. | Safe projection enhancement passes. | Yes. | keep | L98-126. |

### `subagent-separation-contract.test.js`

| Item | Contract | Hardcode | Valid-change sensitivity | Failure appropriate | Verdict | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| spec defines authorization/hidden tests/degraded | Separation and degraded-mode requirements exist. | Seven exact prose regexes. | Rewording/localization fails. | Concept omission matters, wording does not. | rewrite | L6-16. |
| prompt assembly defines two layers | Mandatory host envelope/task fields and stop rule. | Field names are template protocol contracts; heading/prose regexes are not. | Heading edit fails. | Fields valid; prose not. | split | L18-40. |
| templates carry envelope/injection fields | Each projection template contains all protocol fields. | Template field names/headings are current projection grammar. | Equivalent template syntax change fails all three. | Field loss should fail; heading wording is avoidable. | split | L42-70. |
| execution skills carry same contract | All active execution skills project isolation/degraded policy. | Concatenation permits one file to satisfy all; bilingual mega-regex is wording. | One skill can silently lose policy while combined still passes. | False confidence and editorial sensitivity. | rewrite | L72-93; check each owned projection against structured source. |

### `workspace-concurrency-recovery.test.js`

| Item | Contract | Hardcode | Valid-change sensitivity | Failure appropriate | Verdict | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| concurrent commits have one atomic writer | At most one prepares; one stale expected-hash writer fails closed. | 150ms scheduling delay and broad error code regex are test mechanics. | Slower CI may flake; lock algorithm refactor should preserve outcome. | Outcome valid, timing probe needed. | probe | L28-62. |
| next writer recovers prepared transaction | Ordinary failure leaves recoverable transaction and successor commits. | Content/ids are fixture inputs. | Refactor passes. | Yes. | keep | L64-86. |
| forged far-future expiry cannot block | Dead/stale owner cannot forge unbounded lease. | PID/date and 3s/5s timeouts are attack fixtures/test bounds. | Slower hosts may false fail. | Security failure valid, timing flake possible. | probe | L88-115. |
| writer killed with SIGTERM recovers | Process death is recovered before next write. | Signal is attack dimension. | Platform without POSIX signals fails environment, not product. | Appropriate on supported Linux lane. | keep | Dynamic test L117-143. |
| writer killed with SIGKILL recovers | Same hard-death contract for uncatchable kill. | Signal is attack dimension. | Same platform condition. | Appropriate on supported Linux lane. | keep | Dynamic test L117-143. |
| stale stopped writer fenced after takeover | Renewally stale owner cannot activate after lease takeover. | 10/15s timings and SIGSTOP/CONT/USR1 are mechanics. | Timing changes can flake; fencing behavior is essential. | Behavior valid; deterministic clock/lease seam preferable. | probe | L145-174. |
| fencing revalidated before rename | Old owner is fenced at final target rename boundary. | Internal fault phase is a deliberate concurrency test seam; timings/signals are mechanics. | Phase rename breaks test even if equivalent boundary remains. | Critical atomicity check; retain with stable test seam. | keep | L176-202. |

## Scenario audit

| Item | Contract | Hardcode | Valid-change sensitivity | Failure appropriate | Verdict | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| `c21/s74-resume-recovery` | Fresh-process Resume falls back to Runtime/Continuation without Pack. | C21/S74 and M6 labels are catalog metadata; runner delegates to name-pattern `Resume`. | Renaming test title can make runner execute zero tests and still exit 0. | False pass is possible. | rewrite | `run.sh` lacks assertion that a test matched; invoke stable file/case API or inspect TAP count. |
| `v0/s06-custom-sequence` | Historical custom sequence omitted tests. | Exact two-step sequence and legacy `state.yaml/log.md`; checklist is prechecked prose only. | No code change can make it fail because there is no runner. | Not an executable test. | remove | Only `checklist.md`, all boxes claim PASS. Preserve as archive outside regression catalog if desired. |
| `v2.5/s10-progressive-disclosure` | Historical progressive disclosure/manual agent behavior. | Exact file counts (6 references, 4 scripts), TDD six steps and legacy outputs. | No runner; cannot detect regressions. | Not executable. | remove | Unchecked checklist only. |
| `v6/s20-help-init` | Legacy help/init documentation contains options. | Greps exact Markdown headings/options. | Formatting change fails though command behavior may remain. | Docs text failure, not command failure. | reclassify | Quarantined correctly; retire or replace with canonical command map test. |
| `v6/s30-init-rescan` | Legacy rescan docs describe baseline diff. | Exact English sentence and three file locations. | Wording/file ownership change fails. | Not behaviorally attributable. | remove | Quarantined runner only greps prose. |
| `v8.2/s40-compact-session-start` | Legacy compact-first SessionStart policy and skill mentions. | Exact shell function, log prose, config strings across skills. | Implementation refactor causes a large grep cascade. | Protects retired hook implementation details. | remove | Quarantined; runner is all source greps. |
| `v8.4/s50-rules-system` | Rules assets/routing/summary/SessionStart integration. | **Severe:** exactly 17 builtin, 3 presets, “41 个用户指令”, `Summary: 17/20`, exact named rules/output lines and legacy protected state. | Adding a valid rule/command fails several unrelated assertions. | Failure blast radius is wrong and validates repository snapshot rather than contract. | rewrite | Parameterize from registry/schema; execute behavior assertions without counts/prose. |
| `v9/s60-progress-board-format` | Human Progress retains board structure. | **Problem:** exact archived C3 path and headings/Chinese metadata; tests one historical artifact. | Archiving/moving/removing C3 fails current product test; alternative valid presentation fails. | Historical snapshot drift is not a current contract break. | remove | Quarantined runner points at `.pipeline/archives/C3-.../PROGRESS.md`. |

## Findings

### High

1. **Policy documentation is being tested as duplicated prose, not as a structured contract.** `codex-subagent-discipline`, `subagent-separation-contract`, and parts of `claude-hooks` contain dozens of exact/bilingual regexes. A harmless editorial change can fail many cases, while concatenating several files can let a missing projection pass because another file contains the phrase. Replace these with one structured policy authority plus per-surface projection/equivalence validation.
2. **Bootstrap genericity is hidden behind a C21 reference fixture.** The core activation test hand-copies `C21/M5/M6`, `/delivery/c21`, project id, minimum write count, exactly 7 records and 6 dedupe keys. These assertions must be derived from fixture input/returned refs, and the same suite must run against at least two independently named fixtures.
3. **Quarantined Scenarios still contain actively misleading snapshot gates.** `s50` hard-codes counts and `s60` a C3 archive path; three other entries have no runner or only prose greps. Keeping them in the regression catalog creates apparent coverage without a trustworthy failure meaning.

### Medium

1. `c23-m3-experiment-runs` duplicates fixture cardinalities (“eight scenes”, scan matrices) and proves “no scheduler authority” through arbitrary filename substrings. Derive cases from declarations and inspect authority schema/types.
2. `deletion-gate` protects a fixed C21/M5 path set. The safety policy should classify protected surfaces across varying object refs rather than bless one repository snapshot.
3. `layered-config-integration` has a one-user hardcoded-path detector and simultaneously requires product-specific named defaults. Generalize absolute-machine-path detection and separate bundled-example behavior from portability.
4. `project-notifications` simultaneously tests retired behavior and protects its CLI exposure. The obsolete dispatch command test should be removed; retain only zero-side-effect compatibility where still required.
5. Several long E2E cases (`cycle-lifecycle-vnext`, activation, concurrency) have valid contracts but poor failure locality; preserve a thin E2E and split transition/fault cases.

### Low

1. Broad error-message regexes in run/deletion/concurrency tests can accept the wrong rejection reason. Prefer stable error codes and per-variant assertions.
2. Timing-based writer tests may fail on slow CI. They need deterministic clock/lease probes or an explicitly supported Linux timing lane.
3. `s74` can pass when `--test-name-pattern=Resume` matches zero tests; assert executed test count or use a stable test entry point.

## Counterfactual probe candidates

1. Add one valid memory record to the bootstrap fixture without changing activation semantics; current `records.length === 7` / dedupe `=== 6` should fail, demonstrating accidental fixture coupling.
2. Rename/reorder a non-contract heading in `references/subagent-spec.md` and skills while retaining structured meaning; count the resulting unrelated failures across both prose suites.
3. Add a ninth declared NeRF scene and derive expected scan output from the fixture; current literal-eight test should fail although compiler behavior remains correct.
4. Add a benign evidence filename containing `process` to an Experiment run; current no-runner regex may falsely report scheduler authority.
5. Add one builtin Rule and one public command; `s50` should fail at fixed counts/summary/README wording despite valid additive functionality.
6. Run writer concurrency under injected scheduling latency to distinguish genuine lease defects from 3/10/15-second environmental failures.
7. Alter PR provider implementation to set reviewers/labels concurrently after create; confirm whether deterministic serial order is a documented safety contract or an implementation preference.

## Catalog and fixture issues

- Catalog entries with no executable runner: `v0/s06`, `v2.5/s10`.
- Catalog runners that only grep source/prose: `v6/s20`, `v6/s30`, `v8.2/s40`, substantial parts of `v8.4/s50`, `v9/s60`.
- Runner false-pass risk: `c21/s74` uses a name pattern without checking matched count.
- Direct fixtures that need expectation derivation: `fixtures/c21-m5/reference-workspace`, `fixtures/c23-m3/{nerf,acesim}.json`, protected deletion paths in `fixtures/c21-m7`.
- Fixed historical/project identifiers are acceptable as sample inputs, but tests currently repeat them in expected outputs instead of deriving expectations from those inputs.

## Zero-omission self-check

- Recomputed sorted executable inventory and confirmed all 18 paths satisfy index `% 10 == 4`.
- Recomputed combined maintained/quarantined Scenario inventory, sorted by normalized `path`, and confirmed all 8 assigned entries satisfy index `% 10 == 4`.
- Accounted for every declared test in the 18 files. Dynamic subcases explicitly covered: activation's four fault phases; deletion's five rejection scenarios; workspace `SIGTERM` and `SIGKILL`; run validation parameter variants are addressed in their enclosing cases.
- Read all eight assigned Scenario checklists and every available `run.sh`.
- No production, executable test, fixture, catalog, or scenario file was changed.
