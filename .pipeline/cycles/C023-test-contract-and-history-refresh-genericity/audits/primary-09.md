# Primary Audit 09

## Scope and method

- Shard rule: normalized sorted path, zero-based index `% 10 == 9`.
- Audited: 17 executable-test files and 7 Scenario paths.
- Method: every top-level Node test (including wrapper-defined tests) and every Scenario is evaluated against the five questions in `METHODOLOGY.md`. Parameterized subtests are called out in Evidence; they are variants of the containing case, not omitted cases.
- This is a read-only audit. No production code, tests, fixtures, catalog, or Scenario was changed.

## Complete coverage

### Test files

1. `core/test/audit-governance-contract.test.js`
2. `core/test/c21-m8-surface-cleanup.test.js`
3. `core/test/chat-hooks.test.js`
4. `core/test/claude-smoke-readiness.test.js`
5. `core/test/concurrent-work-host-integration.test.js`
6. `core/test/deep-plan-handoff.test.js`
7. `core/test/domain-pack.test.js`
8. `core/test/fixtures/c21-m4/brownfield/test/server.test.js`
9. `core/test/init-bootstrap.test.js`
10. `core/test/lifecycle-regression.test.js`
11. `core/test/model-pool-actions.test.js`
12. `core/test/patch-acceptance.test.js`
13. `core/test/progress-table.test.js`
14. `core/test/receipt-store.test.js`
15. `core/test/root-management-dry-run.test.js`
16. `core/test/showcase-report-refresh.test.js`
17. `core/test/vspi-workstream-contract.test.js`

### Scenarios

1. `tests/scenarios/v0/s01-fresh-start`
2. `tests/scenarios/v11/s64-audit-governance-contract`
3. `tests/scenarios/v4/s15-architecture-drift`
4. `tests/scenarios/v6/s25-debug-flow`
5. `tests/scenarios/v8.1/s35-import-history-interactive`
6. `tests/scenarios/v8.3/s45-showcase-docs`
7. `tests/scenarios/v9/s55-opencode-command-map`

## Per-case audit

### `audit-governance-contract.test.js`

| Item | Contract | Hardcode | Valid-change sensitivity | Failure appropriate | Verdict | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| reject before completion | Audit may intervene before Milestone completion. | Concepts are stable policy; prose-distance regex (`240`) is incidental. | Equivalent wording/reorganization can fail. | Failure may be prose drift, not policy loss. | rewrite | Assert a structured rule/contract projection; keep a light docs presence check separately. |
| rejection scopes | Audit rejection supports Milestone, Feature, and Cycle scope. | Scope enum is stable; ordered prose-distance regex is incidental. | Reordering the three scopes fails despite unchanged contract. | Not reliably appropriate. | rewrite | Parse/compile the structured governance rule and compare the enum set. |
| blocked governance authorities | Implement proposes blocked transition and Audit approves it. | Role/transition names are stable; regex spellings and distance are incidental. | Clear wording changes can fail. | Policy loss should fail, wording drift should not. | rewrite | Assert structured transition authorities, not concatenated Markdown. |

### `c21-m8-surface-cleanup.test.js`

| Item | Contract | Hardcode | Valid-change sensitivity | Failure appropriate | Verdict | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| Plugin discovery equals Registry | Filesystem discovery and registry expose the same public routes. | Route identifiers are public contract, but local `PUBLIC_ROUTES` duplicates the registry and “exactly ten” is a release snapshot. | Adding/renaming an approved route fails until this duplicate list is edited. | Equality failure is right; count/list duplication obscures the source of truth. | parameterize | Derive expected routes from one authoritative manifest and separately assert required baseline routes. |
| hidden/deferred/removed routes and contextual start | Non-public routes are not advertised or directly writable; contextual start remains internal. | Large historical route lists and C21-specific status wording are release-era snapshots. | Retiring/introducing internal behavior causes broad unrelated failures. | Security/no-write failures are right; taxonomy-list churn is not. | split | Split no-advertisement/no-write invariant from versioned route-classification fixtures. |
| maintained sync and legacy generators cannot revive surfaces | Deprecated writers must reject or remain byte-for-byte zero-write. | Function names are historical implementation entry points, intentionally sampled but optional (`return` when absent). | Removing an old export silently skips that subcase; new legacy entry points are missed. | Existing mutation failure is appropriate, coverage failure is silent. | rewrite | Discover deprecated entry points from an explicit tombstone registry; assert every declared entry is absent or zero-write. Five subtests audited. |
| read-only sync check is zero-write | `checkOnly` sync must not mutate workspace. | Mode/platform fixture values are ordinary inputs. | Internal refactor should not fail if tree remains unchanged. | Appropriate. | keep | Tree hash provides behavioral evidence. |
| deletion executor drift/protection/reuse | Authorized deletion is exact-scope, Git/path-bound, protected-path safe, and single use. | File names/IDs are fixture inputs; protected recovery path and receipt semantics are stable safety contracts. | Legitimate internals do not fail; changing safety policy correctly fails. | Appropriate, but five independent failure modes share one parent result. | split | Preserve five audited subtests: path hash, Git baseline, manifest substitution, protected path, receipt replay. Report them independently. |
| docs/replacement architecture | Root Skill, plugin metadata, and current docs agree on public surface and authority model. | Exact ten routes, selected phrases, forbidden words such as `dashboard`, and platform rows encode a point-in-time documentation snapshot. | Legitimate docs wording or a new public route causes many subtest failures. | Some failures mean stale docs, many mean only wording/layout change. | split | Separate machine-readable route equality from semantic docs lint; parameterize current public route set; avoid unqualified forbidden-word regex. All dynamic per-file subtests audited. |

Associated fixtures/helpers: `core/test/fixtures/c21-m2/helpers.js`, `core/test/fixtures/c21-m7/helpers.js`, `.codex-plugin/plugin.json`, public Skill/docs files. The fixture literals are inputs; the duplicated route taxonomy is the hardcode risk.

### `chat-hooks.test.js`

| Item | Contract | Hardcode | Valid-change sensitivity | Failure appropriate | Verdict | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| SessionStart restores chat | Legacy active chat state yields recovery guidance. | `state.yaml`, `12-chat.md`, and exact phrases are legacy/sample details. | Moving recovery to current Runtime/Continuation or changing language fails. | Could fail despite preserved recovery behavior. | reclassify | Chat is an internal/retired C21 surface; keep only if legacy compatibility is explicitly maintained, then assert structured hook output. |
| Stop blocks incomplete active chat | Missing summary/chat entry blocks stop. | Exact English phrases and Patch escalation wording are incidental. | Equivalent reason text fails. | Decision failure is appropriate; wording failure is not. | rewrite | Assert block decision plus machine-readable reason code; optional loose human-message check. |

### `claude-smoke-readiness.test.js`

| Item | Contract | Hardcode | Valid-change sensitivity | Failure appropriate | Verdict | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| manual smoke checklist coverage | Release docs enumerate required Claude validation actions and limitations. | Fixed model names, profile names, file names, and phrase list are release snapshot details. | Model/profile/wording evolution fails unrelated readiness coverage. | Broad failure gives poor diagnosis. | rewrite | Generate checklist expectations from supported platform/profile/model metadata and split capability checks. |
| deterministic smoke fixture | Fixture sync is isolated, creates backup/hooks, and enforces permissions/recovery. | `M01`, exact model IDs, operation IDs, and many output fields are over-specified; permission values/namespace may be contract. | Valid model routing or status-shape evolution breaks the full test. | One assertion fails the entire smoke without isolating the changed contract. | split | Separate global-settings safety, sync artifacts, hook behavior, permissions, and model routing; expected models come from fixture input/config. |

### `concurrent-work-host-integration.test.js`

| Item | Contract | Hardcode | Valid-change sensitivity | Failure appropriate | Verdict | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| unbound/selected Session behavior and status | Unbound sessions receive nonblocking choices; selected Experiment drives prompts/status, not legacy foreground Delivery. | IDs are fixture inputs; Chinese snippets and `16_384` output cap are presentation/host constants. | Translation/copy change fails; Work Item semantics changes correctly fail. | Mixed: semantic failures appropriate, copy failures not. | split | Assert structured selection/status separately from localized message content; source byte cap from host contract. |
| expired-only Placement | Expired claims do not deadlock Session management tools. | Times/IDs are controlled inputs. | Valid refactor remains green. | Appropriate. | keep | Expiration is derived from fixture clock/TTL. |
| auxiliary Hook state fail-open | Corrupt auxiliary placement state warns but does not block prompts/tools. | Exact Chinese warning text is incidental. | Localization change fails despite fail-open behavior. | Tool result assertion is appropriate; message wording is not. | rewrite | Assert warning code/category and absence of block; keep minimal message-presence check. |

Associated fixtures: `fixtures/c21-m2/helpers.js`, `fixtures/c21-m6/helpers.js`; IDs and times are input-derived and acceptable.

### `deep-plan-handoff.test.js`

| Item | Contract | Hardcode | Valid-change sensitivity | Failure appropriate | Verdict | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| ordered Feature Queue conversion | Conversion preserves order and attaches risks/tests/acceptance/unknowns. | FQ/TM/A/R/U IDs are fixture inputs and expectations derive from them. | Extra compatible fields do not fail; changing order/attachment correctly fails. | Appropriate. | keep | Structured assertions protect the handoff contract. |
| global artifact inheritance | Ready Features inherit omitted global evidence sets. | Fixture IDs only. | Valid refactor remains green. | Appropriate. | keep | Assertions are input-derived. |
| directional items are parked | Directional items cannot become executable Features. | Status names are stable workflow vocabulary; reason regex is incidental. | Reason rewording alone can fail. | Mostly appropriate. | parameterize | Keep structured queue/parking assertions; replace reason prose with a stable code. |
| missing target-depth artifacts reject | Implementation-ready handoff blocks without tests or acceptance depth. | Artifact-kind names are stable; error wording is incidental. | Copy changes fail. | Blocking behavior is right, prose match is weak. | rewrite | Assert structured gap codes for both variants. |
| pseudo-test rejection carried to Plan | Handoff preserves no-pseudo-test policy. | Regex across English/Chinese wording is presentation coupling. | Wording change fails with policy intact. | Not reliably appropriate. | rewrite | Expose/assert a structured policy flag or rule ID. |

### `domain-pack.test.js`

| Item | Contract | Hardcode | Valid-change sensitivity | Failure appropriate | Verdict | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| RTL spec/manifest/checklist coverage | RTL pack declares safe metadata-only probes and relevant HDL planning evidence. | `M07-M09`, exact headings, languages, and prose are historical/content snapshots; some manifest enums are contract. | Adding a language or reorganizing docs fails. | Safety failure is right; content expansion failure is not. | split | Validate manifest schema/safety separately; replace historical docs phrase inventory with link/section lint. |
| manifest validation | Required fields and metadata-only probe safety are enforced. | Error strings are incidental; ID/version/probe rules are stable. | Error copy change fails. | Rejection is appropriate, exact messages are not. | rewrite | Assert validation error codes/paths. |
| project-local override | Project pack overrides built-in pack. | `rtl` and names are fixture inputs. | Valid refactor remains green. | Appropriate. | keep | Output is derived from constructed manifests. |
| external refs unsupported without confirmation | External pack refs require confirmed installation. | GitHub sample is fixture input; state fields are product contract. | Valid refactor remains green except reason copy. | Mostly appropriate. | parameterize | Assert structured state; remove reason prose dependency. |
| unsupported checklist evidence | Rendered checklist surfaces unsupported/ref/confirmation evidence. | Exact headings/copy are incidental. | Presentation rewrite fails. | Not fully appropriate. | rewrite | Test a structured render model plus a small accessibility/content smoke. |
| RTL selection and non-RTL quietness | Trigger matching selects relevant pack and emits nothing for unrelated tasks. | Trigger list and prompts are fixture inputs; exact heading is incidental. | Copy rewrite can fail; selection behavior correctly fails. | Mostly appropriate. | split | Separate selector from renderer wording. |

### `fixtures/c21-m4/brownfield/test/server.test.js`

| Item | Contract | Hardcode | Valid-change sensitivity | Failure appropriate | Verdict | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| fixture exports Express app | The brownfield sample appears to be a runnable Express service. | Express and `listen` belong to a sample repository, not Hypo-Workflow product behavior. | Any valid fixture redesign breaks a globally inventoried test. | Failure does not indicate a Hypo-Workflow contract regression. | reclassify | Exclude nested fixture tests from executable inventory, or run only inside the brownfield adoption fixture contract that consumes it. |

### `init-bootstrap.test.js`

| Item | Contract | Hardcode | Valid-change sensitivity | Failure appropriate | Verdict | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| Init API exports | Focused and root API publish `initializeWorkspace`. | Public API name is stable contract. | Rename should be an explicit breaking change. | Appropriate. | keep | Also ensures missing module cannot be hidden by skips. |
| empty repo initialization | Init creates current manifest/runtime/records/capsule and no legacy/adapters. | Project IDs/intent are inputs; exact capsule path and ref keys are schema contracts. | Compatible extra result keys would fail exact key sets. | Some exact-shape failures may reject additive evolution. | parameterize | Assert required keys/subsets; keep forbidden legacy-surface checks. |
| brownfield adoption | Source is preserved; facts are traceable and confidence-bounded without unsupported guesses. | Package/source paths are fixture evidence; forbidden technology list is an incidental sample. | Adding valid facts/technologies could trip prose blacklist. | Preservation/provenance failures are right; technology-name failure is weak. | rewrite | Validate every fact has source support; remove fixed unsupported-tech blacklist. |
| unsafe brownfield metadata | Sensitive/hidden-reasoning basenames/keys reject zero-write without echo. | Three generated variants are threat fixtures, not project constants. | Security relaxation correctly fails. | Appropriate. | keep | Audited subtests: secret basename, hidden-reasoning basename, hidden-reasoning package key. |
| unknown Init keys | Unknown sensitive and ordinary request keys reject sanitized/zero-write. | Two generated variants are schema/security fixtures. | Supporting a new field would require deliberate contract update. | Appropriate. | keep | Audited both parameterized subtests. |
| legal security/reasoning docs | Ordinary public docs are accepted while out-of-scan unsafe names are not projected. | Basenames are boundary examples. | Scan-bound changes may fail even if new boundary is valid. | Boundary change should require review; failure is useful. | keep | Checks false-positive and bounded-scan behavior together. |
| no-input Ask | Missing intent returns one explicit question and writes nothing. | Ask field names are public host contract; exact prompt regex is incidental. | Copy changes fail. | Structured failure right; copy failure weak. | parameterize | Keep required fields/status/no-write, reduce prose matching. |
| repeated/damaged/mixed workspaces | Current, residue-mixed, and damaged workspaces fail closed distinctly. | Status/classification enums are stable compatibility contract; sample IDs are inputs. | New compatible classification can require explicit test update. | Appropriate but three behaviors are bundled. | split | Make repeated, mixed, and damaged separate cases for precise failures. |
| traversal/secret/reasoning validation | Unsafe Init input rejects sanitized and zero-write. | Three values are adversarial fixtures. | Security behavior change correctly fails. | Appropriate. | keep | All three loop variants audited. |
| symlink escape | `.pipeline` symlink escape rejects without external writes. | `.pipeline` is stable authority root; paths are fixtures. | Security-preserving internals stay green. | Appropriate. | keep | Root and external tree snapshots prove zero-write. |
| interrupted transaction recovery | Fault after prepare leaves recoverable transaction and rolls back to pre-state. | Fault phase and transaction path are M1 transaction protocol contracts. | Transaction protocol revision should intentionally update test. | Appropriate. | keep | Fault-injection evidence is behavioral. |
| isolated Init scope | Init does not write global home, adapters, Setup, or legacy authority. | Surface names are explicit forbidden boundaries; sample project IDs are inputs. | Adding Init-owned adapter generation would fail, as intended unless contract changes. | Appropriate. | keep | Child process isolates HOME and snapshots both roots. |

Associated fixture: `core/test/fixtures/c21-m4/brownfield/**`. Its package/source paths are legitimate evidence inputs; its nested `test/server.test.js` should not independently enter the global product inventory.

### `lifecycle-regression.test.js`

| Item | Contract | Hardcode | Valid-change sensitivity | Failure appropriate | Verdict | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| stale lease takeover | Expired lease permits takeover and status exposes recovery evidence. | Times/C12 are fixture inputs; action/reason enums are contract. | Valid internals remain green. | Appropriate. | keep | Expiry is derived from input clock. |
| compact context authority | Compact derived state cannot override authoritative state. | Legacy file names are compatibility contract. | Migration away from legacy authority can fail despite current semantics. | Appropriate only while legacy compatibility is supported. | reclassify | Place in explicit legacy-compat suite with removal criteria. |
| stricter platform handoff | Cross-host handoff preserves stricter permission/network/destructive boundaries. | Boundary enum values are public safety contract. | Adding a new boundary field would expose missing coverage rather than necessarily fail. | Existing failure is appropriate. | keep | Inputs deliberately conflict and expected result is least privilege. |
| reject/accept continuations | Rejection reopens revision; acceptance follows declared continuation. | Cycle 13/14 IDs are inputs; phase/action enums are lifecycle contract. | Legitimate new continuation semantics should intentionally update. | Appropriate, but accept/reject are bundled. | split | Two independent lifecycle branches deserve separate failures. |
| derived repair | Repair refreshes stale compact progress without authority writes. | Paths are legacy derived-artifact contract; text/times are fixture inputs. | New derived format can fail. | Appropriate while compatibility exists. | reclassify | Keep in legacy-derived compatibility lane. |
| workflow kind resolution | Analysis forces analysis preset; build forces TDD and clears analysis kind. | Enum/preset values are stable current contract. | New preset policy should deliberately update. | Appropriate. | keep | Structured pure-function assertion. |

### `model-pool-actions.test.js`

| Item | Contract | Hardcode | Valid-change sensitivity | Failure appropriate | Verdict | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| role edit/backup | Role edits dedupe fallback, validate inputs, persist, and back up. | Role names are contract; exact backup timestamp is derived from injected `now`; model names are inputs. | Backup naming format change fails despite equivalent backup behavior. | Mostly appropriate; filename format may be implementation detail. | parameterize | Assert one backup exists and contains prior config; keep fallback semantics. |
| project actions | Registry add/scan/refresh/sync and TUI projections work end-to-end. | Project names/counts/status are fixture-derived; exact action IDs and legacy compact paths over-specify surfaces. | Adding discovered projects/actions or changing derived storage breaks broad case. | One case spans many independent contracts. | split | Separate registry discovery, refresh projection, sync artifact, and TUI actions. |
| project override | Project-local model selection overrides global config during sync. | Agent/file/model names are fixture inputs; `hw-build.md` path is adapter contract. | Valid internals remain green. | Appropriate. | keep | Expected model derives from project config. |

### `patch-acceptance.test.js`

| Item | Contract | Hardcode | Valid-change sensitivity | Failure appropriate | Verdict | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| Patch acceptance | Legacy Patch acceptance changes Patch/log/progress but never state authority. | P001, timestamps and text are fixture inputs; `state.yaml` is legacy boundary. | Removal/migration of Patch or log format breaks test. | Not a current public surface under C21. | reclassify | Move to legacy migration compatibility or remove with Patch retirement evidence. |
| Patch rejection/escalation | Rejection increments iteration, persists feedback refs, and recommends escalation after repetition. | Exact timestamped filename and threshold are implementation/release policy details unless explicitly specified. | Valid filename/threshold change breaks the whole case. | Mixed. | rewrite | Assert structured feedback linkage and configured escalation policy, not literal path/time. |
| Patch skill/docs roundtrip | Legacy Patch Markdown roundtrips and skill documents commands/state fence. | `/hw:patch`, exact metadata lines, and Skill path are retired-surface hardcodes. | Current surface cleanup correctly breaks it. | Failure is expected after retirement, not a current regression. | remove | Catalog/runner should not maintain a test that requires a removed public Skill. |

### `progress-table.test.js`

| Item | Contract | Hardcode | Valid-change sensitivity | Failure appropriate | Verdict | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| parse progress tables | Parser extracts metadata/current/settings/milestones/timeline from supported Markdown format. | M05/M06, 5/7, Chinese text are fixture inputs and expected values derive from them. | Additive parser changes remain green; format contract changes intentionally fail. | Appropriate. | keep | Structured expected row matches input. |
| redact secrets | Rendered table values redact secret-looking content. | Secret samples are adversarial fixtures. | Security regression correctly fails. | Appropriate. | keep | Both settings and timeline are covered. |

### `receipt-store.test.js`

| Item | Contract | Hardcode | Valid-change sensitivity | Failure appropriate | Verdict | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| public API | Receipt module publishes scoped single-use lifecycle operations. | API names are public contract. | Breaking rename correctly fails. | Appropriate. | keep | Required API list is explicit contract. |
| issued Receipt persistence | Receipt binds actor/intent/object/scope/plan/expiry/state without raw mutable plan or bare confirmation. | Runtime path/schema fields are persistence protocol contract; IDs/times are inputs. | Additive fields generally pass; path schema change fails intentionally. | Appropriate. | keep | Canonical hash is derived from input. |
| canonical scope hash | Mapping order is irrelevant; path/content drift changes binding. | Sample paths/content are inputs. | Valid hash internals remain green. | Appropriate. | keep | Tests both invariance and sensitivity. |
| own-property mappings | Special own keys remain distinct without prototype mutation. | Key list is adversarial fixture corpus. | Security/canonicalization regression correctly fails. | Appropriate. | keep | Covers six variants and Object prototype integrity. |
| standalone clock overrides | Decisions use host clock and reject per-call time override. | 2000/2099 are controlled fixture bounds; operation list is public API. | New authorized clock API would require explicit security review. | Appropriate, but four subcases should remain visible. | keep | Audited host default plus validate/reserve/consume subtests. |
| single-use lifecycle | Issued → reserved(owner) → consumed; replay/wrong owner fail. | State names/tool IDs are protocol/input. | Contract-preserving internals stay green. | Appropriate. | keep | Exercises owner and replay boundaries. |
| concurrent reservation | Exactly one concurrent reservation wins and persists stable owner. | Two contender IDs are inputs. | Correct synchronization refactor stays green. | Appropriate. | keep | Behavioral concurrency assertion. |
| drift invalidation | Actor/intent/object/scope/plan drift invalidates future use. | Seven drift variants are threat fixtures; binding dimensions are stable. | Adding a binding dimension needs new coverage but need not break old cases. | Appropriate. | keep | Audited actor, intent, object, path, content, broadened action, and plan variants. |
| fail-closed terminal/malformed states | Expired, invalidated, revoked, and malformed Receipts reject. | State names are protocol; timestamps/text are inputs; error regex is incidental. | Error-copy change can fail. | State failures appropriate; message failures less so. | parameterize | Assert error codes and on-disk states. |
| bare confirmation/secrets | Boolean confirmation cannot authorize; secrets/hidden reasoning never leak to errors/disk. | Seeded values are adversarial fixtures. | Security regression correctly fails. | Appropriate. | keep | Three unsafe-scope shapes audited. |
| transaction recovery seam | Interrupted issuance is recoverable and writes no Receipt. | `after_prepare` and transaction path are transaction protocol. | Protocol revision should deliberately update. | Appropriate. | keep | Snapshot recovery proves rollback. |

Associated fixture: `core/test/fixtures/c21-m2/helpers.js`. Fixed clocks, IDs, and values are properly injected inputs rather than universal project truths.

### `root-management-dry-run.test.js`

| Item | Contract | Hardcode | Valid-change sensitivity | Failure appropriate | Verdict | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| end-to-end review bundle | Dry-run aggregates required sections and exposes reviewable evidence. | `hypo-workflow`, `hypo-info`, exact section set, M1-M7 language, and specific global IDs encode one reference workspace. | Adding a section/object or using another project breaks exact assertions. | Not reliably appropriate. | rewrite | Build expectations from input fixture and assert required capability categories, not reference identities. |
| stable content hash | Hash ignores generation time/output path while retaining content sensitivity. | Dates/paths are two inputs; hash format is protocol. | Correct alternate hash scheme may be breaking contract. | Appropriate. | keep | Strong invariance test. |
| candidate classification | Inputs classify into local/remote/external/conflict/confirmation buckets. | Candidate IDs are fixture inputs, but expected keys use exact whole-object key set. | Additive review fields fail. | Classification failure right; additive schema failure wrong. | parameterize | Assert required keys/subsets and derive IDs from fixture. |
| secret-safe serialization | Raw values/records are omitted while metadata refs survive. | Marker corpus is adversarial fixture; `notion-main` is a reference-workspace ID directly asserted. | Renaming fixture ID requires scattered edits. | Secret failures appropriate; identity failure not. | parameterize | Generate assertions from fixture secret refs/markers. |
| raw block removal/action normalization | Raw containers are removed; upstream write-looking actions become dry-run. | Notion/project IDs are fixture inputs. | Valid refactor remains green if behavior preserved. | Appropriate. | keep | Security and no-write behavior are behavioral. |
| no external writes | Dry-run never invokes Notion/publication/external writes. | Backend names are capability classes; candidate values are inputs. | New backend requires coverage but does not break. | Appropriate. | keep | Throwing clients and call counters provide direct evidence. |
| Chinese report content | Human report states hash, redaction/no-write evidence, candidates/conflicts/gates. | Exact `# C16-M8 ...` title is historical hardcode; bilingual phrase regex and project hash are presentation coupling. | Any valid title/rewording fails. | Content omission should fail; exact historical title should not. | rewrite | Assert language, semantic sections, and injected bundle identity; remove C16/M8. |

Fixture review: this file embeds `/home/heyx`, project names, C16/M8, Notion IDs and fixed raw markers. Most are legitimate scenario inputs only if all expected identities are derived from the fixture; several assertions instead elevate them to universal output, so parameterization is required.

### `showcase-report-refresh.test.js`

| Item | Contract | Hardcode | Valid-change sensitivity | Failure appropriate | Verdict | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| showcase packaging | Historical C2 source/vendor/gitignore packaging remains present. | C2 archive path, exact private-style SSH URL, vendor name and build extensions are repository-history specifics. | Moving docs/vendor or changing packaging fails despite no current product regression. | Not appropriate for current complete gate. | reclassify | Archive as historical showcase verification; do not maintain in current regression gate. |
| report narrative | Report includes named anecdotes/products/people and narrative phrases. | “3 accounts”, Bill, product names, and prose are editorial content hardcodes. | Any legitimate editorial rewrite fails. | Not a software contract regression. | remove | Use document lint/build/link checks if showcase remains shipped. |
| slide visual system | Slides mention GPT Image 2, exact artifact categories, and narrative sequence. | Model/branding/content phrases are point-in-time editorial choices. | Visual redesign/model upgrade fails. | Not appropriate. | remove | Replace with compilability/assets/licenses checks, if still released. |

### `vspi-workstream-contract.test.js`

| Item | Contract | Hardcode | Valid-change sensitivity | Failure appropriate | Verdict | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| Core API exports | Workstream/host APIs and milestone claim operations are public. | API names are stable contract. | Breaking rename correctly fails. | Appropriate. | keep | Explicit public surface check. |
| concurrent Deliveries | Multiple non-terminal Deliveries coexist; foreground pointer is only a pointer. | Goal IDs are inputs. | Correct internal changes stay green. | Appropriate. | keep | Reads both objects and pointer. |
| explicit resume | Resuming explicit Delivery does not rewrite foreground pointer. | IDs are inputs; degraded recovery expectation may be implementation-specific. | Improving recovery from degraded to complete would fail. | Not entirely appropriate. | parameterize | Assert selected object/pointer independence; only assert degradation when fixture deliberately lacks required recovery evidence. |
| Workstream isolation | Session/routing/evidence/rebind/recovery are isolated; model/provider secrets absent. | Session/routing IDs are inputs; forbidden-key regex is safety contract. | Additive safe fields remain green. | Appropriate. | keep | End-to-end structured evidence. |
| stale generation/scope conflict | Overlap and stale generation fail zero-write; close releases claim. | Scope paths are fixtures; generation/scope rules are concurrency contract. | Correct refactor remains green. | Appropriate. | keep | Snapshot proves stale rejection zero-write. |
| cross-base overlap | Overlapping active scopes fail even on different Git bases. | SHA strings/paths are inputs. | Policy change should require explicit review. | Appropriate. | keep | Protects scope ownership boundary. |
| parallel ready claims | Independent ready milestones can be claimed concurrently; dependent join waits. | M-A/B/C are fixture graph IDs. | Scheduler internals stay green. | Appropriate. | keep | Expected state derives from graph. |
| later ready verification | Later independent milestone can verify without advancing unmet join. | IDs are fixture graph. | Correct scheduler refactor stays green. | Appropriate. | keep | Dependency states directly asserted. |
| concurrent verification | Both successful concurrent verifies persist and release claims. | Two IDs are inputs. | Synchronization regressions correctly fail. | Appropriate. | keep | Strong lost-update probe. |
| stale Plan binding | Workstream bound to old revision cannot claim revised Milestone. | Revision/IDs are fixture inputs; binding invariant is contract. | Correct internals remain green. | Appropriate. | keep | Zero-write rejection verifies stale binding. |
| VSPi ownership/routing contract | Plan authority is singular; host owns model resolution; routing/session fields are portable and secret-free. | Exact tier/filter/session field arrays are public integration schema if versioned; `hypo-workflow`/`vspi` owner IDs are product identities. | Adding a tier/capability breaks exact arrays. | Appropriate only as a versioned schema contract. | keep | Retain with explicit schema version and compatibility policy. |
| context retrieval experiment | Retrieval is opt-in/disabled by default with bounded source/fallback/metrics and rejects provider leakage. | Exact metric/source names are integration schema. | Graduating experiment intentionally breaks test. | Appropriate as an explicit experimental contract gate. | keep | Parse rejection verifies closed schema. |

Associated fixtures: `fixtures/c21-m6/helpers.js`, `fixtures/c21-m2/helpers.js`. IDs, hashes, paths and clocks are controlled inputs and generally not problematic.

## Scenario audit

| Item | Contract | Hardcode | Valid-change sensitivity | Failure appropriate | Verdict | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| `v0/s01-fresh-start` | Historical standard TDD fresh-start workflow. | Six fixed steps, `state.yaml`, `log.md`, diff score 3, dated PASS result. | Any current Init/runtime schema change invalidates checklist. | No executable runner; checked boxes cannot detect regression. | remove | Already quarantined with replacement `c21/s70-init-current`; retain only as archive evidence outside executable inventory. |
| `v11/s64-audit-governance-contract` | Audit transition policy exists. | “M01” is historical; runner only calls the brittle prose-regex unit test. | Wording changes fail. | Duplicate wrapper adds no independent evidence. | remove | Already quarantined with replacement `c21/s72-cycle-delivery`; structured governance tests should carry contract. |
| `v4/s15-architecture-drift` | Architecture drift threshold controls continuation. | Fixed prompts, dependencies, endpoints, thresholds, legacy state, blank manual result. | Legitimate scoring/model changes fail; no runner enforces checklist. | Not executable evidence. | remove | Quarantined and replaced by `c21/s72-cycle-delivery`; archive only. |
| `v6/s25-debug-flow` | Debug docs define audit distinction, five steps, auto-fix validation. | Exact Markdown headings and retired `/hw:debug` surface. | Docs restructuring fails; implementation behavior is not tested. | Not appropriate for current gate. | remove | Quarantined; shell `rg` checks only prose. |
| `v8.1/s35-import-history-interactive` | History import requires explicit confirmation and supports reviewed mapping edits. | Exact English/Chinese sentences and old `--import-history --interactive` command layout. | Wording/command architecture changes fail; activator genericity is not exercised. | Current critical behavior deserves a real test, but this one is ineffective. | rewrite | Replace with current history-refresh preview/activation integration using non-reference project/Cycle/count inputs and structured confirmation binding; keep quarantined until replaced. |
| `v8.3/s45-showcase-docs` | Retired Showcase docs targets/readership/artifact list. | Exact file names/phrases and removed Skill. | Editorial/architecture change fails. | No current product contract. | remove | Already quarantined; shell only greps retired docs. |
| `v9/s55-opencode-command-map` | Historical OpenCode adapter emitted command map. | Checklist says 36 while runner requires 53; dozens of retired routes, exact agents, `state.yaml`, `rules.yaml`, docs rows. | Any valid command-surface cleanup causes a huge failure blast radius. | Demonstrably internally inconsistent and stale. | remove | Already quarantined/replaced by `c21/s77-codex-hook-process`; must never return to maintained CI. |

## Findings

### High

1. **Global inventory wrongly includes a fixture's own test.** `core/test/fixtures/c21-m4/brownfield/test/server.test.js` validates the sampled Express app, not Hypo-Workflow. Running it as a product test couples the suite to a fixture implementation.
2. **Historical Scenario `s55` is internally contradictory and massively hardcoded.** Its checklist says 36 commands, runner requires 53, and both conflict with the current ten-route public surface. It would create exactly the unrelated failure cascade the user rejected.
3. **Current-gate candidates retain retired surfaces.** `patch-acceptance`, chat hooks, showcase content, and several quarantined Scenario runners assert removed/internal/legacy commands and authorities. They need explicit legacy classification or removal, never silent inclusion in a current complete gate.
4. **Reference-workspace identity leaks into root-management expectations.** Project names, absolute `/home/heyx` roots and `C16-M8` are fixture data, but several expectations elevate them into fixed output contracts.

### Medium

1. **Docs/prose regex tests confuse meaning with wording.** Audit governance, domain pack, hook messages, pseudo-test policy, Claude readiness, and human reports can fail on harmless rephrasing.
2. **Monolithic cases create excessive blast radius.** C21 docs surface, Claude smoke, root management, project actions, deletion modes, and Init classification cases combine independent contracts and obscure whether a failure is expected.
3. **Point-in-time release data is asserted as evergreen behavior.** Fixed Claude model IDs, exact route count, C2/C16/M8 labels, named editorial anecdotes, and GPT Image 2 branding should be generated from release inputs or removed from product tests.
4. **Legacy compatibility is not consistently labeled.** Lifecycle compact/repair and Patch/chat tests may be valuable migration checks, but without a dedicated suite/removal criterion they look like current architecture authority.

### Low

1. Several good behavioral tests still match human error/reason prose; stable error/reason codes would reduce false failures.
2. Exact object-key equality in Init/root-management rejects harmless additive schema evolution; required-subset assertions are safer unless schemas explicitly forbid additions.
3. Backup filename timestamp format is tested instead of backup existence/content.

## Probe candidates

1. **Route evolution probe:** add one synthetic public route through the authoritative registry in an isolated copy. Expected: discovery/docs contract tests identify only missing projections, not dozens of historical-route failures.
2. **Docs wording probe:** semantically rephrase audit, hook, domain, and report text without changing structured policy. Current regex tests are expected to fail; replacements should remain green.
3. **Reference identity probe:** run root-management dry-run with arbitrary project IDs, roots, Cycle/Milestone labels, and object counts. Output must derive identities/counts exclusively from input.
4. **Claude model probe:** change fixture-selected models while preserving role capabilities. Isolation/permissions/hooks should stay green; only routing expectations derived from input should change.
5. **Fixture inventory probe:** run the canonical complete-test enumerator after excluding `core/test/fixtures/**`; verify product coverage count changes only by the fixture test and brownfield Init tests still consume the fixture.
6. **Error-copy mutation probe:** alter only human error/reason strings for Receipt, Init, Domain and Hook paths. Behavior tests should rely on codes/structured fields and remain green.
7. **Scenario gate probe:** deliberately include each quarantined Scenario in maintained selection; CI/catalog validation should reject stale replacements and especially `s55`, rather than execute them.

## Catalog and fixture issues

- All seven shard Scenarios are quarantined, but quarantine alone is insufficient if “complete tests” or ad-hoc CI recursively executes `run.sh`; catalog/runner must prove maintained-only selection and reject stale duplicate coverage.
- Quarantine replacement links are broad (`s72-cycle-delivery`) and do not prove equivalent behavior for audit governance, architecture drift, or debug. Either map to a focused current test or mark the historical contract intentionally retired.
- `s35` contains a still-important confirmation concept but no current activator genericity test. It needs replacement, not simple resurrection.
- `core/test/fixtures/**` must be excluded from global executable test discovery unless a manifest explicitly promotes a fixture test.
- Root-management fixture should be a parameterized builder whose expected identities, candidate IDs and labels are computed from its inputs. Absolute machine paths must not appear in universal assertions.
- `c21-m8-surface-cleanup` duplicates public-route authority in test constants. A single versioned route manifest should feed registry, projection tests and docs generation/checks.

## Zero-omission self-check

- Recomputed sorted executable inventory: **179 files**; selected indices `9, 19, ..., 169`: **17/17 audited**.
- Recomputed sorted Scenario inventory from maintained + quarantined catalog: **76 paths**; selected indices `9, 19, ..., 69`: **7/7 audited**.
- Top-level/wrapper Node cases audited: **87** total (`3+6+2+2+3+5+6+1+12+6+3+3+2+11+7+3+12`).
- Parameterized/nested variants explicitly reviewed within their parent cases: C21 legacy generators (5), deletion modes (5), docs per-file checks, Init unsafe metadata (3), unknown keys (2), invalid inputs (3), Receipt clock operations (4 including host default), Receipt drift dimensions (7), and VSPi concurrency branches.
- Every listed test file has an associated table section; every selected Scenario has one table row.
- No production/test/fixture/catalog file was edited; this report is the sole write.
