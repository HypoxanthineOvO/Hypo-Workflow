# Primary Test Contract Audit 06/10

## Scope and baseline

- Shard rule: sorted `core/test/**/*.{test,spec}.*`, zero-based index `% 10 == 6`; sorted Scenario path, index `% 10 == 6`.
- Coverage: 18 executable test files, 106 source-declared top-level cases, 18 nested cases (124 logical cases total), and 7 catalog Scenarios.
- Baseline command: `node --test` over all 18 files. Result: 120 registered cases, 111 pass, 9 fail, 0 skip. The 5 Claude cases could not register because their file failed import, so Node reported one file-level failure instead; `106 + 18 - 5 + 1 = 120`.
- Baseline failures: Claude legacy adapter import (1 file-level), removed Maintenance APIs (3), stale Feature Queue guide assertion (1), retired Sync writes (3), and source-text barrel layout (1). These are predominantly obsolete-lane or implementation-shape failures, not current user-contract regressions.
- Direct support inspected: `fixtures/analysis/M06-analysis-ledger.yaml`, `fixtures/c23-m5/status-events.json`, fixture builders imported by the Delivery/security tests, current release manifests/bundles read by Host Contract tests, inline OpenCode/semantic fixtures, regression catalog entries, and all files in the seven Scenario directories.

Notation: `sample` means a literal is valid only as fixture input and expected values must be derived from it; `contract` means a stable protocol/safety/public API value; `incidental` means repository identity, count, wording, path layout, or implementation detail. Sensitivity describes whether a contract-preserving change can fail the test. “Appropriate” means a failure accurately signals the stated contract was broken.

## Executable cases

### `core/test/analysis-state-ledger.test.js` (quarantined)

| Item | Contract | Hardcode | Valid-change sensitivity | Failure appropriate | Verdict | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| fixture parses/evidence contract | Ledger schema accepts complete evidence. | `M06`, C3 commit, exact counts/text are sample facts duplicated in assertions. | Medium: fixture enrichment changes counts/text. | Partial: schema failure matters; fixture prose drift does not. | `parameterize` | Derive expected identity/counts from fixture metadata or a builder; keep required-field validation. |
| summary stays small/external | Summary references external ledger and excludes full arrays. | Path shape/summary fields are contract; exact M06, time, counts and conclusion are sample. | Medium: compatible summary fields or fixture edits fail exact object/count assertions. | Partial. | `split` | Keep omission/path/boundedness; derive values and use required subsets rather than exact count object. |
| explicit legacy ledger preserved | Caller-supplied legacy path remains unchanged. | Legacy path format is compatibility contract; M06 is sample. | Low. | Yes. | `keep` | Input is passed through and expected is derived from the same path helper. |
| docs define fields | Public docs mention the ledger contract. | Exact English phrases, headings, and file examples are incidental wording. | High: editorial rewrite fails with no behavior change. | No/partial. | `rewrite` | Validate schema/reference links structurally; do not grep prose sentences. |

### `core/test/c21-m7-adversarial.test.js` (maintained)

| Item | Contract | Hardcode | Valid-change sensitivity | Failure appropriate | Verdict | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| Maintain rejects secret before writes | Secret-like user content is rejected with byte-for-byte zero writes. | Secret/time/refs are adversarial samples; zero-write is safety contract. | Low. | Yes. | `keep` | Snapshot before/after plus rejection; no repository-specific expected output. |
| deletion manifest rejects protected descendants | Protected authority descendants never enter deletion manifests. | Two protected paths are explicit security boundary examples. | Low; adding protected roots needs new cases but does not break these. | Yes. | `keep` | Both exact and bootstrap authority descendants remain present. |
| deletion Receipt rejects crafted descendants | Rebinding a valid manifest cannot bypass protected-path checks. | Same security samples; hash algorithm is protocol helper. | Low. | Yes. | `keep` | Re-signs crafted bodies, so test exercises semantic validation rather than stale hashes. |

### `core/test/c23-m5-experiment-status.test.js` (maintained)

| Item | Contract | Hardcode | Valid-change sensitivity | Failure appropriate | Verdict | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| publishes status Store API | Public status store exposes append/rebuild/read. | API names are public contract. | Low; additive APIs do not fail. | Yes. | `keep` | Unconditional presence check prevents the conditional lane from silently skipping. |
| fixture captures experiment concepts | Fixture covers baseline/dataset/machine/scan/attempt/rerun concepts. | `acesim-qv100`, V100, IDs, exact event taxonomy/counts are sample facts embedded in test. | High for fixture evolution. | Partial. | `rewrite` | Test a builder/schema and derive sample expectations; do not make one fixture’s project facts universal. |
| immutable events/logical-key drift | Content-addressed append deduplicates exact repeats and rejects logical drift with zero writes. | Hash/path shape is contract; path hardcodes `acesim-qv100` instead of `fixture.project_id`. | Medium: changing sample project breaks path regex. | Mostly yes. | `parameterize` | Build expected path from `fixture.project_id`; retain hash, dedupe, conflict, zero-write checks. |
| rejects invalid event variants | Project drift, unsupported event type, and traversal reject before writes. | Variant strings are adversarial samples. | Low. | Yes. | `keep` | Nested cases `manifest-project-drift`, `unsupported-event-type`, `unsafe-source-reference` each assert zero-write. |
| project-scoped query mismatch | Rebuild/read must not probe another project. | `another-project` and limit 20 are samples. | Low. | Yes. | `keep` | Both nested actions reject and preserve tree. |
| bounded materialized read | Read works after event tree removal and returns bounded, complete status semantics. | Many qv100 IDs and exact outcome counts duplicate fixture; 64 KiB is an implicit bound. | High for fixture enrichment; low for core boundedness. | Partial. | `split` | Keep no-rescan/bound/digest/lineage behavior; derive IDs/counts from events and centralize the public size limit. |
| later query widens | Rebuild display limit must not discard materialized rows needed by a wider read. | Limits 1/20 are intentional boundary samples. | Low. | Yes. | `keep` | Expected row count derives from `total_rows` and requested limit. |
| complete view bounded/newest | Every collection obeys query limit and newest rows survive. | 250/200/5/64 KiB are boundary literals; `next/249` is derivable but manually duplicated. | Medium if product bound changes legitimately. | Mostly yes. | `parameterize` | Source row/materialization/byte limits from explicit contract constants; compute newest IDs from generated input. |
| persisted bounded validation | Re-signed projections cannot exceed row constraints. | 201/200/20 are boundary literals tied to an unexported maximum. | Medium. | Yes if limit is contract; otherwise internal-coupling. | `parameterize` | Nested cases: `more-than-maximum-rows`, `rows-exceed-declared-row-limit`, `total-rows-smaller-than-materialized-rows`; use named schema limits. |
| reject semantic/secret projection | Re-signing cannot legitimize unknown, inconsistent, secret, reasoning, unsafe-path, or oversized fields. | Secret/path payloads are adversarial samples; 70/64 KiB is boundary constant. | Low except duplicated size limit. | Yes. | `parameterize` | Seven nested variants all target distinct security/schema contracts; centralize size limit and keep non-echo check. |
| Attempt authoritative ID/alias | `payload.attempt_id` is authoritative; alias cannot substitute or create duplicate identity. | qv100 IDs/hash/time are samples. | Low. | Yes. | `keep` | Nested missing ID, mismatched alias, duplicate alias cases validate identity; optional exact alias permits either documented policy. |
| Attempt identity scoped by Experiment | Same local Attempt ID can exist in different Experiments. | Sibling IDs/time/hash are generated sample inputs. | Low. | Yes. | `keep` | Expected IDs derive from the two constructed events. |
| two-clone deterministic union | Event arrival order does not affect rebuilt derived status; no runner state leaks. | Fixture counts are sample but comparison is order-derived. | Low. | Yes. | `keep` | AB and BA projections are deep-equal; scheduler/process leakage explicitly absent. |
| Git-like merge/conflict | Immutable events merge across clones; same logical key with drift fails closed and preserves state. | Git identity and fixture values are samples. | Low. | Yes. | `keep` | Uses real temporary Git workspaces and zero-write conflict snapshot. |
| source and released surface expose Experiment | Source route and installed release include `/hw:experiment`. | Exact command count 10 and frozen release artifact are incidental to Experiment presence. | High: adding a valid command or source-only work fails. | Partial. | `split` | Keep route/skill presence in maintained source gate; move installed-release equality/count to explicit release validation derived from manifest. |
| guides describe current surface | Guides expose Experiment and reject retired commands/install advice. | Exact platform-name prose regex and wording are incidental. | High: editorial changes fail. | Partial. | `rewrite` | Use structured command/link lint and explicit forbidden command tokens; do not require prose containing particular host names. |

### `core/test/claude-plugin-alias.test.js` (quarantined)

| Item | Contract | Hardcode | Valid-change sensitivity | Failure appropriate | Verdict | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| renders `hw` namespace metadata | Claude adapter emits coherent plugin/command metadata. | Exact 54 count, monitor command, selected written files and prose are incidental/frozen inventory. | High: valid command addition or template refactor fails. | Partial. | `rewrite` | Derive command set/count from command authority; assert semantic mapping. Baseline cannot import removed `loadStructuredRulesAuthority`. |
| route guidance/DeepSeek rules | Route-specific generated commands carry intended guidance. | Exact English phrases and file selection are prompt implementation. | High. | No/partial. | `rewrite` | Validate declared capability/route metadata, not prose snippets. |
| removes legacy alias skills | Generator removes `skills/hw-*` while preserving canonical skill. | Paths/names are compatibility contract examples. | Low. | Yes. | `keep` | Explicit before/after filesystem behavior; additive skills do not fail. |
| platform docs explain namespace | Docs preserve `hw` namespace and native `/resume` boundary. | Exact English sentences are incidental. | High. | Partial. | `rewrite` | Check command tokens/links and native-vs-plugin ownership structurally. |
| project rule enforces namespace | Structured authority contains project/error namespace rule and audits cleanly. | Rule id/scope/severity are contract; exact hook list and rationale wording are incidental. | Medium. | Partial. | `split` | Keep rule identity/semantic instruction; assert required hook membership rather than exact array and avoid rationale prose regex. |

### `core/test/command-skill-root-routing.test.js` (maintained)

| Item | Contract | Hardcode | Valid-change sensitivity | Failure appropriate | Verdict | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| route separates target and skill roots | External target resolution reads installed skill root and performs zero writes. | `/hw:goal` and skill path are public contract; temp prefix is sample. | Low. | Yes. | `keep` | Target snapshot stays unchanged. |
| intent uses explicit skill root | Intent resolver keeps same authority/root separation. | Goal intent fields are public contract sample. | Low. | Yes. | `keep` | Status/canonical/authority checked; zero writes. |
| command discovery uses skill root | Discovery for external target comes from installed backend. | Exact ten-command array freezes whole public inventory. | High: valid command addition fails unrelated routing test. | Partial. | `rewrite` | Compare with canonical command authority or assert required subset plus no target reads/writes. |

### `core/test/deep-plan-architecture.test.js` (maintained)

| Item | Contract | Hardcode | Valid-change sensitivity | Failure appropriate | Verdict | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| public APIs exported | Five architecture APIs remain public. | API names are contract. | Low. | Yes. | `keep` | Additive exports do not fail. |
| normalize tracks | Legacy `kind` normalizes to `type`; relationship defaults preserved. | Exact key set forbids compatible additive fields; IDs are sample. | High for additive schema evolution. | Partial. | `rewrite` | Assert required subset, removal of legacy key, and input-derived relationships; drop exact `Object.keys`. |
| track relationship errors | Dangling, self, conflict, and all relationship classes are detected. | IDs are adversarial samples; issue kinds are protocol. | Low. | Yes. | `keep` | Assertions search semantic issue fields rather than exact issue array. |
| architecture edge errors | Dangling source/target and self-edge detected. | Component IDs/indexes are constructed inputs. | Low. | Yes. | `keep` | Failures map precisely to three invalid edges. |
| derive module tracks | Components derive deterministic module tracks with evidence/source relationships. | Exact evidence order and generated `MOD-` spelling couple output layout. | Medium. | Mostly yes. | `parameterize` | Derive expected refs/source IDs from fixture; compare sets unless ordering is documented. |
| render Markdown/Mermaid | Structured architecture is human-reviewable in Markdown/Mermaid. | English headings, raw Mermaid syntax, exact arrow and labels are renderer implementation/wording. | High: valid localization/renderer changes fail many assertions. | Partial. | `rewrite` | Assert semantic coverage via parsed/render model; keep only documented format markers. |
| persist artifacts | Update persists structured architecture, tracks, and human view. | Artifact filenames/status are contract; embedded prose/arrow are incidental. | Medium. | Mostly yes. | `split` | Keep files/schema/round-trip; reduce Markdown wording checks to parseable/reference coverage. |

### `core/test/delivery-proposal-preflight.test.js` (maintained)

The entire file uses `preflightTest = HAS_PREFLIGHT ? test : test.skip`; if any imported module/API disappears, all eight maintained cases silently skip. This is a high-severity gate defect even though the current baseline happened to execute them.

| Item | Contract | Hardcode | Valid-change sensitivity | Failure appropriate | Verdict | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| accepted Goal not overwritten by Goal | Accepted authority is immutable for same ref. | IDs/times are fixture inputs. | Low. | Yes. | `rewrite` | Preserve behavior but replace conditional skip with fail-closed API setup. |
| accepted Goal not overwritten by Cycle | Kind swap cannot replace accepted authority. | Goal/Cycle are protocol kinds. | Low. | Yes. | `rewrite` | Same fail-closed registration issue. |
| different ID coexists/pointer switches | Concurrent Delivery identities coexist; foreground pointer switches atomically. | Sample IDs only. | Low. | Yes. | `rewrite` | Same fail-closed registration issue. |
| concurrent same-ID proposals | Exactly one authority wins atomic race. | Exact storage count/path (`2` YAML files, record directory shape) is implementation detail. | Medium: storage refactor fails despite uniqueness. | Partial. | `split` | Keep one-success/one-reject and readable authority; move storage-shape checks to store-specific test. |
| accepted Goal allows new Goal | New identity can become active without mutating accepted history. | Sample IDs. | Low. | Yes. | `rewrite` | Same fail-closed registration issue. |
| accepted Goal allows new Cycle | Cross-kind new identity preserves old Runtime/Records. | Sample refs. | Low. | Yes. | `rewrite` | Same fail-closed registration issue. |
| rejection blocks approval until revision | Rejected plan cannot approve; persisted revision creates new authority/hash. | Times/transaction IDs are samples; lifecycle states are contract. | Low. | Yes. | `rewrite` | Same fail-closed registration issue; behavior otherwise precise and zero-write checked. |
| stale pre-rejection Receipt rejects | Old approval cannot be used after rejection and leaves no authority write. | Far-future expiry is sample. | Low. | Yes. | `rewrite` | Same fail-closed registration issue; snapshot makes failure meaningful. |

### `core/test/feature-queue-metrics.test.js` (quarantined)

| Item | Contract | Hardcode | Valid-change sensitivity | Failure appropriate | Verdict | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| batch planning defaults | Default config exposes old Feature Queue policy. | Exact defaults may be retired contract; additionally reads this repository’s `.pipeline/config.yaml`. | High: project config change fails library-default test. | No/partial. | `remove` | Lane is quarantined/superseded; never use live project data as universal fixture. |
| Feature Queue spec headings/phrases | Old spec documents entity/queue/DAG behavior. | Exact headings and prose are incidental. | High. | No. | `remove` | Superseded lane; grep test does not validate behavior. |
| metrics spec headings/phrases | Old metrics docs mention fallback semantics. | Exact headings/prose are incidental. | High. | No/partial. | `remove` | Retain any current telemetry contract in current schema tests, not retired prose. |
| unavailable telemetry normalization | Duration is computed; absent token/cost are explicit, not fabricated. | Dates/numbers are input-derived; sentinel values are contract. | Low. | Yes. | `reclassify` | Move this focused helper contract to current metrics tests if API remains supported. |
| telemetry rollup | Provider telemetry and partial rollups are accurate. | Numeric totals derive from inputs; USD is fixture input. | Low. | Yes. | `reclassify` | Valuable focused calculation independent of Feature Queue. |
| archived fixtures present | Reference repo C3 archive contains exact queue/metrics content. | Hardcodes Cycle C3 path, current repository data, statuses, and prose. | Very high. | No. | `remove` | This is precisely a reference-repository snapshot masquerading as general contract. |

### `core/test/host-contract-v1.test.js` (maintained)

| Item | Contract | Hardcode | Valid-change sensitivity | Failure appropriate | Verdict | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| release manifest/exactly ten commands | Manifest/version/hash shape and command mappings are coherent. | Exact ten-command inventory and `hypo-workflow:` prefix freeze one release. | High: legitimate public command evolution fails broad test. | Partial. | `rewrite` | Derive expected commands from authoritative manifest/registry; assert uniqueness/coherence, not count 10. |
| materialized release artifacts | A release bundle is checksummed, portable, dependency-complete, and excludes retired skills. | Reads committed current ZIP/checksums and exact hook/key/file inventory. | Very high for ordinary source edits; appropriate only at release freeze. | Partial. | `reclassify` | Move frozen artifact verification to explicit release gate; generate bundle from candidate source before comparing. |
| projection accepts lifecycle states | Parser accepts current/invalidated projection shapes. | Schema/contract versions and states are stable; fixture IDs/generation are sample. | Low. | Yes. | `keep` | Values come from fixture documents. |
| projection rejects secrets/private fields | Host projection is allowlisted and secret-safe. | Adversarial keys are security samples. | Low. | Yes. | `keep` | Failure directly means leakage/schema boundary regression. |
| invalidation monotonic/clears state | Invalidation increments generation and removes visible authority. | Reason/time are fixture input; state clearing is contract. | Low. | Yes. | `keep` | Expected generation derives from current input. |
| bundle verifier accepts/tamper rejects | Generic portable-bundle verifier enforces checksums. | Fixture file path is sample. | Low. | Yes. | `keep` | Uses isolated temporary bundle, not committed release artifact. |

### `core/test/legacy-workspace-inspection.test.js` (maintained)

The behavior wrappers conditionally skip when APIs are absent. The unconditional inspector-export case covers `inspectLegacyWorkspace`, but `initializeWorkspace` can disappear while its maintained integration case silently skips.

| Item | Contract | Hardcode | Valid-change sensitivity | Failure appropriate | Verdict | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| inspector API published | Focused legacy inspector imports and is public. | Module/API path is contract. | Low. | Yes. | `keep` | Unconditional fail-closed export check. |
| parse present evidence/read-only | Inspector reads only existing legacy files, hashes them, adds no defaults, preserves bytes/mtime. | Cycle 7/language values are fixture facts duplicated in expected output. | Medium for fixture edits. | Mostly yes. | `parameterize` | Derive summary expectations from fixture parse; retain source/path/hash and zero-write checks. |
| Init reports legacy/zero migration | Init detects legacy and creates no manifest/zones. | Zone/path list is authority contract. | Low, but API absence skips. | Yes when run. | `rewrite` | Make maintained integration fail if `initializeWorkspace` is absent. |
| reject symlink evidence | Inspector must not follow a symlinked authority leaf. | Paths/content are adversarial samples. | Low. | Yes. | `keep` | Both workspace and external trees remain byte-identical. |
| malformed evidence/no defaults | Malformed legacy source is reported without manufactured authority. | Error prefix/default names are compatibility implementation details but safety intent is stable. | Medium. | Mostly yes. | `rewrite` | Prefer structured error code/category and absence of fabricated fields over regex on implementation identifiers. |
| reject symlink `.pipeline` ancestor | Empty and populated external directory symlinks both fail closed. | Nested cases are security samples. | Low. | Yes. | `keep` | Covers `empty-external-pipeline` and `external-pipeline-with-legacy-and-internal-leaves`; both trees preserved. |
| tolerate missing optional leaves | Only present sources appear; no optional defaults created. | Cycle 9/phase are fixture inputs. | Low. | Yes. | `keep` | Expected source set derives directly from written leaves. |

### `core/test/maintenance-queue.test.js` (quarantined)

| Item | Contract | Hardcode | Valid-change sensitivity | Failure appropriate | Verdict | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| operation schema, not Feature work | Retired Maintenance Queue discriminates operation records from Feature/Cycle/Patch. | `hypo-workflow`, Notion ref, F001/M01 are samples. | Low for schema; API is removed. | No for current suite. | `remove` | Baseline fails because export is intentionally absent; catalog already says Records/Maintain supersede it. |
| queue lifecycle | Retired enum/transition graph handles approval/execution/terminal states. | Exact status/action enum is old contract. | High for legitimate lifecycle changes; API removed. | No for current suite. | `remove` | Three current baseline failures are obsolete surface noise, not regressions. |
| side-effect gates | High-risk actions need confirmation; document writes need backup. | Risk levels are potentially reusable contract; `~/.hypo-workflow` path/date are old samples. | Medium. | Partial. | `reclassify` | Port only the safety matrix to current side-effect/authority tests; remove old queue API dependency. |

### `core/test/opencode-status.test.js` (quarantined)

| Item | Contract | Hardcode | Valid-change sensitivity | Failure appropriate | Verdict | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| empty workspace | Status model degrades safely with empty inputs. | Status/sentinel fields are model contract. | Low. | Yes. | `keep` | No project identity coupling. |
| active status aggregation | Model aggregates state, queue, events, metrics, score, agents and UI surfaces. | C2/M08/F003, exact 10 events, model names, English section labels/text are sample/UI implementation. | Very high; one valid projection/UI change causes many failures. | Partial. | `split` | Separate structured aggregation from renderer assertions; derive values/counts from fixture. |
| active subtask not worker evidence | Runtime observation cannot be promoted to worker evidence. | Agent/model samples only. | Low. | Yes. | `reclassify` | Safety/authority contract remains valuable even if OpenCode UI is deferred. |
| confirm gate without current feature | Pending confirmation remains visible when queue pointer is null. | F003 is sample. | Low. | Yes. | `keep` | Structured gate/feature state, minimal text assertion. |
| DAG only when dependencies exist | DAG visibility/ready calculation is conditional. | Exact `Feature DAG`/`Ready:` renderer strings are incidental. | Medium. | Mostly yes. | `split` | Keep structured `dag.visible/ready_features`; drop exact sidebar prose. |
| compact analysis summary | UI shows bounded summary and not full analysis ledger. | M06/path/question/counts and English labels are sample; 16 KiB is implicit bound. | Medium. | Mostly yes. | `parameterize` | Derive fixture values; centralize size bound; assert excluded structured details. |
| malformed optional files | Required status remains usable; optional parse errors become warnings. | M99 and filenames are samples. | Low. | Yes. | `keep` | Warning/source status precisely identifies malformed metrics. |
| malformed lease guidance | Bad lease surfaces recovery action. | Exact `hw:check`/`Recovery` wording is presentation. | Medium. | Partial. | `rewrite` | Assert structured repair action/code; test rendered wording separately if public. |
| scalar milestone compatibility | Legacy YAML scalar alignment parses completed status. | Fixture values are input-derived. | Low. | Yes. | `keep` | Compatibility behavior, not repository state. |
| dash-only YAML items | Parser handles workflow-commit list syntax and preserves semantic fields. | M02 and warning text are fixture samples. | Low. | Yes. | `keep` | Expected values correspond to inline YAML. |
| completed pipeline summary | Completed 12/12 status and metrics aggregate. | Exact 12 and duration are fixture facts; renderer text is incidental. | Medium. | Mostly yes. | `parameterize` | Derive counts from fixture and separate structured status from sidebar/footer wording. |
| status spec prose | Docs mention official TUI/plugin baseline. | Exact headings/API words and `n/a` sentence are prose. | High. | No/partial. | `remove` | Quarantined adapter docs should not be an executable behavior gate. |

### `core/test/pr-manual-gates.test.js` (quarantined)

| Item | Contract | Hardcode | Valid-change sensitivity | Failure appropriate | Verdict | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| fix keeps push manual | Read-only PR inspection records local plan and never pushes before confirmation. | URLs/date/file names are samples; `/push/` prompt wording is incidental. | Medium. | Mostly yes. | `rewrite` | Assert structured remote-write gate/calls; remove natural-language prompt regex. |
| review blocks runtime files | PR review blocks authority runtime changes but permits report archive. | `.pipeline/log.yaml` and PR archive path encode legacy policy. | Medium as authority layout evolves. | Partial. | `reclassify` | Move current protected-path matrix to current authority tests; derive paths from policy. |
| merge blocked by checks/approval/conflict | Unsafe merge never contacts remote and reports all blockers. | Branch/check/user names are samples. | Low. | Yes. | `reclassify` | Useful remote safety contract independent of old planning lane. |
| ready merge still confirms | Passing checks still cannot merge without explicit confirmation. | GitLab URL and `/merge/` wording are samples/incidental. | Low/medium. | Mostly yes. | `rewrite` | Assert structured waiting gate and zero remote writes; drop prompt text. |
| close needs reason/confirmation | Close without reason rejects; valid reason is recorded, remote untouched. | Exact reason echoed is input-derived; `/close/` wording incidental. | Low/medium. | Mostly yes. | `rewrite` | Keep reason/structured gate, drop prompt text dependency. |

### `core/test/readme-feature-queue.test.js` (quarantined)

| Item | Contract | Hardcode | Valid-change sensitivity | Failure appropriate | Verdict | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| guide explains Feature Queue | Retired guide contains old commands/config options. | Entire exact token list is obsolete surface/prose. | Very high and already fails current guide. | No. | `remove` | Baseline failure confirms stale test; current guide intentionally teaches ten focused entries. |
| README spec keeps Feature Queue source | Retired readme template links old spec and `skills/start`. | Exact paths are obsolete implementation. | High. | No. | `remove` | Catalog replacement points to Records/Maintain; no current contract remains here. |

### `core/test/response-contract.test.js` (maintained)

| Item | Contract | Hardcode | Valid-change sensitivity | Failure appropriate | Verdict | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| human response has conclusion/explanation/next steps | User receives an understandable result, rationale, and next action. | Required semantic fields are contract; exact Chinese `##` headings are presentation. | Medium: valid renderer/localization change fails. | Partial. | `split` | Keep shape validation; test readability/content presence without exact heading wording. |
| completion includes operations/risks | Completion discloses manual actions and known risks. | Sample path/command are inputs; exact Chinese headings are presentation. | Medium. | Partial. | `split` | Keep structured sections and rendered inclusion of user-supplied values; drop exact titles. |
| intermediate update fields | Updates identify current work, findings, and next step. | Field names are contract; Chinese sample strings are input-derived. | Low. | Yes. | `keep` | No renderer/prose coupling. |

### `core/test/semantic-workflow-runtime.test.js` (maintained)

| Item | Contract | Hardcode | Valid-change sensitivity | Failure appropriate | Verdict | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| Plan/Progress IDs align | Semantic Cycle selection and exact Plan/Progress item alignment validate. | C001/M1/S1/M2 are local fixture inputs. | Low. | Yes. | `keep` | Fixture is constructed in-test; expected sequence defines the case. |
| stale Progress reported | Divergent item sets fail validation. | Exact English error sentence is implementation wording. | Medium. | Mostly yes. | `rewrite` | Expose/assert stable error code plus IDs; do not match full sentence. |
| Discussion append/redact/dedupe | Visible speakers persist, secrets redact, repeated turn dedupes, local ledger stays ignored. | Messages/turns are samples; exact `*\n` gitignore is storage implementation. | Medium. | Mostly yes. | `split` | Keep content/redaction/dedupe; assert ignore semantics rather than exact file bytes separately. |
| semantic resume bounded/readable | Resume includes selected Plan/Progress/Execution/Discussion and excludes internal protocol under bound. | Chinese/English section phrases and internal-word blacklist are prose heuristics; 16 KiB implicit limit. | High for valid wording. | Partial. | `rewrite` | Validate selected source refs/structured composition and named size bound; minimal leak denylist only. |
| Hooks resume/append speakers | SessionStart loads context; prompt/Stop append both visible messages. | Exact Chinese system messages are incidental. | Medium. | Mostly yes. | `rewrite` | Assert structured hook result and ledger side effects; drop prose snippets. |
| multiple Cycles need focus | Ambiguous sessions cannot write; explicit local focus routes to chosen Cycle. | C001/C002/session names are constructed samples. | Low. | Yes. | `keep` | Both unresolved and selected paths tested. |
| PreCompact no legacy recovery writes | PreCompact checks resumability and does not create legacy Recovery authority. | Exact Chinese message is incidental; forbidden recovery path is contract. | Medium. | Mostly yes. | `split` | Keep `continue` and ENOENT; drop exact message text. |

### `core/test/sync-standardization.test.js` (quarantined)

| Item | Contract | Hardcode | Valid-change sensitivity | Failure appropriate | Verdict | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| sync command/skill/artifact exposed | Retired installed-software Sync writes adapters. | Exact 54 count, old `/hw:sync`, paths and operation names freeze retired surface. | Very high. | No. | `remove` | Baseline fails with `ERR_HYPO_WORKFLOW_SYNC_RETIRED`, the intended current behavior. |
| light sync writes indexes | Retired Sync mutates registry/knowledge. | `~/.hypo-workflow`, projection phrases and operation names are old implementation. | Very high. | No. | `remove` | Baseline correctly rejects retired write; test expects obsolete behavior. |
| standard/deep/CLI share logic | Retired CLI generates adapters and scans dependencies. | CLI path, Ink version, operation list and compact file layout are implementation. | Very high. | No. | `remove` | Baseline correctly rejects standard write. |
| SessionStart drift/TUI action | Read-only check detects drift; hook surfaces context; old TUI exposes Sync. | Exact context phrases/action label/global files are mixed current/retired presentation. | High. | Partial. | `split` | Retain read-only no-write drift contract in current Hook test; remove retired CLI/TUI/global-projection pieces. |

### `core/test/workspace-module-split.test.js` (quarantined)

| Item | Contract | Hardcode | Valid-change sensitivity | Failure appropriate | Verdict | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| split modules/files/APIs exist | Historical C17 source decomposition exists. | Exact module filenames and API lists are internal layout. | Very high: valid refactor fails broadly. | No. | `remove` | Tests implementation organization, not user behavior. |
| barrel explicit named exports | Historical barrel syntax and no old namespace export. | Parses source text and demands a specific export form. | Very high; baseline currently fails although APIs can still be usable. | No. | `remove` | Concrete example of invalid structural test. |
| legacy entry absent/not shim | Historical cleanup prevents compatibility re-export. | Exact old file/content patterns are internal layout. | High. | Partial at most. | `remove` | Current surface cleanup tests should own public retirement, not source topology. |
| no stale legacy imports | Fixed list of runtime/tests/docs contains no old import. | File list and regex are incomplete internal implementation. | High and can miss new files. | No/partial. | `remove` | Use dependency/lint rule only if module boundary is still an explicit architecture contract. |
| focused behavior through split imports | Omnibus case covers authority, graph, stop event, final output, JSONL, notifications with hardcoded Hypo project graph. | Project IDs, exact seven-project order, paths, dates, messages, and direct modules are incidental. | Very high: unrelated change breaks one large case. | No/partial. | `split` | Move each surviving user contract to its owning module test with generic fixtures; remove duplicate historical checks. |

## Scenario cases

| Item | Contract | Hardcode | Valid-change sensitivity | Failure appropriate | Verdict | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| `c21/s76-deletion-drift` (maintained) | Receipt-bound deletion fails closed for auth/owner/expiry/content/Git drift. | `run.sh` selects another test by exact English test-name substring. | High: renaming/splitting that test breaks Scenario without behavior change. | Partial. | `rewrite` | Invoke a stable scenario entry/test ID or dedicated runner; checklist contract itself is sound. |
| `v1/s09-subagent-full-delegation` (quarantined) | Historical full TDD subagent orchestration. | Hello World, six steps, `state.yaml`, `log.md`, old config fields are retired implementation. | Very high. | No for current release. | `remove` | No runner; pending checklist only; replacement is current Cycle delivery Scenario. |
| `v3/s12-hook-stop-check` (quarantined) | Historical Stop hook blocked running pipeline. | `stop-check.sh`, legacy `state.yaml`, 60 seconds, exact JSON/prose are retired policy. | Very high. | No. | `remove` | Manual checklist has no runner and conflicts with current semantic Hook contract. |
| `v6/s22-init-empty-project` (quarantined) | Historical Init docs define empty-project artifacts. | Exact prose, old config/architecture baseline and root `SKILL.md`. | High. | No. | `remove` | `run.sh` is prose grep; replacement is current manifest Init Scenario. |
| `v8.1/s32-import-history-keyword` (quarantined) | Historical import split by commit regex. | Exact regex literals and Skill prose are old implementation. | High. | No for current release. | `remove` | Retired history-import behavior; not a generic current Init contract. |
| `v8.2/s42-guide-flow` (quarantined) | Historical Guide onboarding flow. | Exact line count, Chinese questions, retired commands and wording. | Very high. | No. | `remove` | `run.sh` is entirely prompt/prose matching; replacement is current Cycle delivery lane. |
| `v9/s52-core-config-artifacts` (quarantined) | Historical V9 helper CLI and OpenCode artifacts. | Runs every core test, exact internal files/commands/config keys and retired CLI. | Extreme: one valid change cascades through whole suite and Scenario. | No. | `remove` | Nested `node --test core/test/*.test.js` duplicates the full gate and amplifies unrelated failures. |

## Findings

### High

1. **Maintained conditional skip can erase the Delivery preflight gate.** `delivery-proposal-preflight.test.js` maps all eight cases to `test.skip` if any preflight module/API is absent. A destructive export/removal can therefore make the maintained safety suite green by not running. `legacy-workspace-inspection.test.js` has the same issue specifically for the Init integration case.
2. **Ordinary maintained tests freeze release snapshots and global command counts.** C23 Experiment and Host Contract tests assert exactly 10 commands and inspect committed release ZIP/checksums. A legitimate new command or ordinary source update creates wide failures unrelated to the changed behavior. Frozen artifacts belong in a candidate-release gate generated from the same source authority.
3. **Reference repository data is tested as product truth.** `feature-queue-metrics.test.js` reads `.pipeline/config.yaml` and the C3 archive directly. This is the same defect class as the reported History Refresh hardcoding.
4. **Internal source layout is treated as behavior.** `workspace-module-split.test.js` parses barrel source syntax, enumerates module files/APIs, scans a fixed file list, and bundles unrelated behaviors. It currently fails on export syntax while functional behavior remains available.
5. **Quarantined tests remain noisy in the full executable inventory.** The baseline’s 9 failures are all obsolete/deferred/structural lanes. Quarantine metadata alone does not prevent `node --test core/test/*.test.js` or legacy Scenario `s52` from executing them.

### Medium

1. Exact prose tests are widespread in analysis docs, Claude adapter docs/prompts, Experiment guides, Feature Queue docs, response rendering, semantic resume/Hooks, OpenCode UI, and Sync. They turn localization/editorial changes into false regressions.
2. Experiment status tests protect valuable boundedness/security contracts but repeat qv100 IDs, fixture counts, the 200-row materialization limit, and 64 KiB response limit instead of deriving sample values and naming contract limits.
3. Full command arrays/counts in command routing and Claude generation make a local addition fail unrelated tests. Compare against a single authoritative registry and use focused required-subset checks where inventory completeness is not the test’s contract.
4. Several safety cases mix semantic assertions with exact storage paths/file counts or natural-language prompts. Split them so storage/renderer changes do not mask authority behavior.

### Low

1. Dates, IDs, hashes, project names, and URLs used solely as isolated fixture inputs are acceptable; they become a defect only when the expected universal result is independently hardcoded or the fixture is the live reference repository.
2. C23/M5 labels in test names are traceability metadata, not by themselves a behavior hardcode. The harmful coupling is in expected paths/counts/release snapshots.

## Counterfactual probe candidates

1. Add one synthetic public command to the authoritative command map without changing `/hw:experiment`; confirm command-root, Claude count, C23 release count, and Host Contract inventory tests currently fail. Expected remediation: only registry coherence and deliberately regenerated release gates respond.
2. Remove/rename one Delivery preflight export in an isolated worktree; confirm the maintained file reports skips rather than failures. Expected remediation: unconditional setup failure.
3. Rename a source module or switch barrel export syntax while preserving root API behavior; confirm `workspace-module-split` fails. Expected remediation: delete source-text/layout assertions.
4. Change qv100 fixture project ID and add one event; measure failures in fixture/status/path/count assertions. Expected remediation: sample-derived expected values, with only actual semantic changes requiring updates.
5. Reword Chinese response/resume headings without removing any information; confirm response/semantic tests fail. Expected remediation: semantic shape/content tests separated from presentation snapshots.
6. Rename deletion-gate case title while retaining behavior; confirm Scenario `c21/s76` fails because of `--test-name-pattern`. Expected remediation: stable entry/ID.

## Catalog and fixture issues

- Catalog classification is directionally correct for the nine failing obsolete lanes, but a “full tests” invocation ignores classification. The runner/gate must consume catalog classification or physically isolate historical tests; Scenario `v9/s52` must not recursively invoke all tests.
- Maintained C23/Host Contract entries combine source behavior with frozen release artifact verification. Split catalog entries so ordinary maintained regression and explicit release-candidate validation have distinct failure meanings.
- `fixtures/c23-m5/status-events.json` is a valid rich sample, but tests should derive project identity, event taxonomy/counts, IDs, and outcome totals from it or build events programmatically.
- The analysis fixture is isolated and acceptable, but exact narrative/count assertions mostly verify fixture contents rather than validator behavior.
- Direct live paths `.pipeline/config.yaml` and `.pipeline/archives/C3-*` in Feature Queue tests are prohibited reference-workspace fixtures and should be removed.

## Zero-omission self-check

- Mechanical shard discovery rerun: 18/18 assigned executable files present.
- Source case enumeration: 106/106 top-level calls accounted for in the tables.
- Nested enumeration: 18/18 accounted for: C23 invalid event (3), bounded projection validation (3), semantic/secret projection (7), Attempt alias (3), legacy symlink ancestor (2).
- Scenario enumeration: 7/7 sorted catalog entries accounted for.
- Every item states a contract, hardcode classification, valid-change sensitivity, failure meaning, verdict, and evidence.
- Only this report was written; no production code, test, fixture, catalog, or Scenario was modified.
