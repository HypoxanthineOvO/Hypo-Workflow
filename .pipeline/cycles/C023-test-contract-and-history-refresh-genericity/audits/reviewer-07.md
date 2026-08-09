# Independent Reviewer Test Contract Audit 07/10

## Scope and method

- Rebuilt the normalized executable-test inventory independently and confirmed the 18 paths at global indices `7, 17, ..., 177` (`% 10 == 7`).
- Rebuilt Scenario inventory from catalog object `path` fields (not JSON text lines) and confirmed seven paths at indices `7, 17, ..., 67`.
- Re-read all 117 top-level executable cases, the seven Scenario runners/checklists, their directly used fixtures, and relevant specifications before comparing with `primary-07.md`.
- Review labels: `agree` accepts the primary contract analysis and disposition; `revise` changes it; `missing` records a material issue absent from the per-case primary conclusion.
- This was a read-only product/test review. Only this reviewer report was written.

## Coverage

### Executable files

1. `core/test/artifact-catalog.test.js` (4)
2. `core/test/c21-m7-audit-findings.test.js` (8)
3. `core/test/c23-m6-codex-hook-compatibility.test.js` (6)
4. `core/test/claude-resume-namespace.test.js` (4)
5. `core/test/compact-end-of-run.test.js` (4)
6. `core/test/deep-plan-ask.test.js` (8)
7. `core/test/delivery-receipts.test.js` (6)
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

## Per-case independent review

The “Final” column is the reviewer recommendation after re-reading the source. An `agree` row still represents an independent check of hardcoding, contract-preserving change sensitivity, and failure meaning; it is not acceptance by default.

### `artifact-catalog.test.js`

| Item | Review | Final | Independent rationale |
| --- | --- | --- | --- |
| scans current artifacts / stale summary | **revise** | keep | `assertKinds` checks required membership, not exact equality. New kinds pass. Project/Cycle/time values are fixture inputs, and the asserted legacy paths are the behavior this legacy scanner supports. No split is justified by the cited “exact 12-kind list.” |
| malformed YAML is parse_error | agree | keep | Malformed input must be distinguished from absence; status vocabulary is structured output. |
| pre-Workflow git-only is not_applicable | **revise** | keep | The eight-kind loop proves representative Workflow-only kinds are classified correctly; it is not exhaustive and does not fail when a new kind is added. Hypo-GPU and remote refs are input-derived. |
| secret refs without raw read | agree | keep | Concrete secret-looking values are adversarial inputs; non-reading and non-projection are stable security contracts. |

### `c21-m7-audit-findings.test.js`

| Item | Review | Final | Independent rationale |
| --- | --- | --- | --- |
| deletion manifest protects Recovery tree | agree | keep | Ancestor/exact/descendant matrix is a security boundary, not repository sample data. |
| Receipt context rejects crafted Recovery binding | agree | keep | Independent defense-in-depth check; crafted hashes and paths are inputs. |
| UserPromptSubmit leaves persistence to Agent | agree | split | Preserve zero-write assertion; replace Chinese prose checks with a structured reminder signal or a narrower semantic assertion. |
| validator accepts documented output shapes | agree | keep | Event output fields are host protocol constants. |
| validator rejects unsupported output fields | agree | keep | Closed event-specific schemas should fail intentionally when protocol changes. |
| PreToolUse rewrite bound to input | agree | keep | Tool names and input field shapes are host compatibility contracts. |
| PostToolUse targeted apply_patch reminder | agree | keep | Path is derived from the supplied change and the assertion tolerates prose changes. |
| PostToolUse effect dedupe | agree | keep | IDs/content are fixtures; the observed dedupe behavior is the contract. |

### `c23-m6-codex-hook-compatibility.test.js`

| Item | Review | Final | Independent rationale |
| --- | --- | --- | --- |
| paired subagent context | agree | parameterize | Event coverage should derive from schema capability metadata so newly supported events cannot be silently omitted. |
| optional turn IDs omitted | agree | parameterize | Duplicated event list can drift from the validator schema. |
| optional tool-use ID omitted | agree | keep | Covered tool-event pair is a stable current host contract. |
| wrapper accepts omissions repeatedly | agree | split | Real process assertion is valuable, but the present two-event sample does not substantiate a general wrapper label. |
| provided optional IDs validated | agree | split | Separate type/shape validation from secret/traversal safety so a valid identifier-policy evolution has a localized failure. |
| compatibility does not widen outputs | agree | keep | Input relaxation must not weaken output schema. |

### `claude-resume-namespace.test.js`

| Item | Review | Final | Independent rationale |
| --- | --- | --- | --- |
| registry does not claim `/resume` | agree | keep | `/resume` and `/hw:resume` are explicit public namespace ownership. |
| current plugin metadata safe | agree | rewrite | Auditing `.` and requiring the incidental `sessionstart-resume-matcher` finding makes unrelated repository metadata part of the expected output. Use isolated safe/conflict fixtures. |
| catches legacy bare skill | agree | keep | Isolated positive conflict fixture protects the intended scanner behavior. |
| report explains boundary in Chinese | agree | rewrite | Exact copy and absence of incidental findings are not the ownership contract; render from structured owner/command fields. |

### `compact-end-of-run.test.js`

| Item | Review | Final | Independent rationale |
| --- | --- | --- | --- |
| refresh dirty after success | agree | keep | The test checks three required projections and their derived content; it does not prohibit additional targets. |
| skip failed/disabled | agree | split | Zero-write behavior is essential; reason strings should only remain if declared stable result codes. |
| fresh untouched / no compact-of-compact | agree | rewrite | `mtime` sleeps can fail on filesystem resolution without a contract breach; use an injected clock/freshness seam. |
| target set compact-only | agree | rewrite | `length >= 5` is an unexplained fixed inventory count; validate every returned target by properties and require named mandatory targets from an authority registry. |

### `deep-plan-ask.test.js`

| Item | Review | Final | Independent rationale |
| --- | --- | --- | --- |
| public exports | agree | keep | Export names are the public API. |
| first-principles challenges | agree | rewrite | Exact first-four ordering and minimum count freeze one policy realization; validate required challenge coverage and permitted default instead. |
| persisted next recommendation | agree | probe | Persisted recommendation precedence is plausible policy, but no specification found that makes this exact challenge the sole valid next choice. |
| answered challenge not default | agree | rewrite | Any eligible unanswered challenge can satisfy the stated contract; exact `falsifying_evidence` is overconstrained. |
| user question contextual, not first | agree | rewrite | Structured challenge IDs should be asserted instead of bilingual question copy. |
| record iterative rounds | agree | split | Persistence and linkage are real; generated IDs, exact next ordering, and prose are representation details. |
| shallow gate rejects | agree | keep | Required depth/challenge taxonomy is a gate contract and must fail on intentional taxonomy change. |
| ready gate allows decomposition | agree | keep | A complete package must cross the gate; added mandatory criteria are an intentional contract update. |

### `delivery-receipts.test.js`

| Item | Review | Final | Independent rationale |
| --- | --- | --- | --- |
| exports Receipt context API | **revise** | rewrite | The gate must fail on import failure of Delivery, Planning **or** Topology and assert the stable root export. Currently it only fails explicitly for Delivery; the other two can disable all five behavior tests without failing this case. |
| context binds authorization | agree | split | Binding fields are required, but exact top-level key equality rejects backward-compatible metadata. |
| wrong bindings invalidate | agree | keep | Actor/scope/plan drift must invalidate authorization. |
| consumed/expired/wrong intent | agree | keep | Replay, expiry and cross-intent rejection are security contracts. |
| revision drift stale | agree | keep | State/plan revision drift must invalidate old authority. |
| object isolation | agree | keep | Cross-object authorization is prohibited. |
| prerequisite failure behavior | **missing** | rewrite gate | `receiptTest = HAS_RECEIPT_DELIVERY ? test : test.skip` permits Planning/Topology import or API regressions to produce five skips and an otherwise passing file. Prerequisite unavailability must be a hard setup failure, not a skip. |

### `feature-queue-ops.test.js`

| Item | Review | Final | Independent rationale |
| --- | --- | --- | --- |
| queue edits require confirmation | agree | split | Mutation gate is stable; English summary copy is not. |
| operation coverage / guards | agree | keep | IDs are fixture inputs and state/guard outcomes are the behavior. |
| auto-chain outcomes | agree | keep | Status/action values are workflow protocol. |
| JIT decomposition | agree | split | Current-only materialization is stable; exact generated milestone naming is separable. |
| metric summary | agree | rewrite | Whole-object equality rejects compatible metric additions; assert required telemetry and `n/a` semantics. |
| DAG board | agree | rewrite | Compare structured sets/statuses rather than incidental topological ordering and English reasons. |
| DAG cycle | agree | rewrite | Equivalent cycle rotations are valid evidence; normalize cycle representation. |
| M07 docs phrases | **revise** | remove | This historical-label/prose regex adds no behavior protection beyond the seven functional cases in the same file. Do not replace one prose snapshot with another executable docs regex. |

### `hypo-claw-notification.test.js`

| Item | Review | Final | Independent rationale |
| --- | --- | --- | --- |
| format stop notification | agree | split | Exact final output preservation is stable; banning the ordinary word `summary` is accidental. |
| segment without truncation | agree | keep | Boundary sizes are injected inputs; ordered byte preservation is the contract. |
| dry/test no external contact | agree | keep | Injected machine path is not a production default; no-spawn behavior is the safety contract. |
| notify CLI invocation | agree | split | Required routing/stdin and absence of direct contact are stable; full argument equality should be isolated from compatible CLI additions. |
| executable + prefix args | agree | keep | Paths and prefix args are supplied inputs and must be preserved. |
| explicit confirmation | agree | keep | External notification cannot spawn without authorization. |
| long notify segments | agree | keep | Exact-once ordered delivery protects loss/duplication. |
| clean exit without evidence retries | agree | split | Retry behavior is stable; exact English synthetic stderr is not. |
| failure retry preserves message | agree | split | Preserve original event/message and replay essentials without freezing the entire internal queue record. |

### `legacy-write-fence.test.js`

| Item | Review | Final | Independent rationale |
| --- | --- | --- | --- |
| inventory completeness | agree | keep | Exhaustive writer IDs are a security registry. Adding a writer must fail until inventoried/fenced. |
| central fence all families/formats | agree | keep | Inventory-driven matrix gives the correct desired failure scope. |
| high-risk entrypoints current | agree | parameterize | Derive attempts from the security registry to avoid silent gaps. |
| acceptance entrypoints residue | agree | parameterize | Same registry-derived completeness requirement. |
| damaged manifest high-risk | agree | parameterize | Same registry-derived completeness requirement. |
| legacy remains writable | agree | keep | Compatibility behavior is explicit; fixture path/value is input. |
| public project writers current | **revise** | keep | Writer IDs are deliberate audit identities already required by the inventory contract; asserting the structured error code, writer ID, and zero writes is appropriate. A rename is a security-registry contract change, not an innocent implementation refactor. |
| CLI init and notify log chain | **revise** | keep | These invoke canonical repository/package entrypoints and assert process-level fail-closed behavior. Source entry paths are necessary invocation surfaces, not reference-project data. Split only if packaging declares a different canonical public launcher. |

### `maintenance-run.test.js`

| Item | Review | Final | Independent rationale |
| --- | --- | --- | --- |
| lifecycle schema, distinct kind | agree | keep | Closed statuses and forbidden Delivery keys are schema boundaries. |
| generic orchestration planning | agree | rewrite | Minimum item counts freeze current decomposition; prove complete source coverage/provenance instead. |
| partition discovery | agree | rewrite | Compare discovered identities/provenance as sets, not count/order/aggregation choices. |
| resumable transitions | agree | split | State transitions and resumability are stable; opaque token/path/timestamp representation is not. |

### `p0-configure-contract.test.js`

| Item | Review | Final | Independent rationale |
| --- | --- | --- | --- |
| default P0 gate | agree | split | Closed policy defaults are legitimate, but whole-array/object coupling should be separated by concern. |
| inheritance/reuse | agree | keep | Precedence and provenance are explicitly specified in `progressive-discover-spec.md`. |
| Progressive Discover order | **revise** | keep | The specification explicitly requires P0 after `cycle new`, before Discover, and requires auditable `.plan-state/p0-configure.yaml` or equivalent. These are not incidental implementation details. |
| docs coverage | agree | rewrite | Concatenated mega-regex can pass with content in the wrong owner and fails on harmless copy edits; use owner-specific structured declarations or a docs generator source. |

### `pr-readonly-flow.test.js`

| Item | Review | Final | Independent rationale |
| --- | --- | --- | --- |
| inspect local archive only | agree | split | Remote-readonly/local-write boundary is stable; one allocator result should not be mixed into it. |
| review findings no remote writes | agree | rewrite | Assert required reads and absence of write methods without serial call order or Chinese copy. |
| redact reviewer secrets | agree | keep | Secret values are adversarial fixture input. |
| reject incapable provider | agree | keep | Required readonly provider interface is the contract. |

### `readme-spec.test.js`

| Item | Review | Final | Independent rationale |
| --- | --- | --- | --- |
| managed blocks/data sources | agree | rewrite | Exact headings/order/count freeze a document snapshot; validate machine-readable marker ownership/source declarations. |
| source paths explicit/exist | agree | rewrite | Arbitrary inline-code path inference and fixed repository layout create unrelated failures; consume an authoritative source manifest. |
| full regen policy | agree | rewrite | Literal word regex is both copy-sensitive and capable of false passing; assert structured policy fields. |

### `review-artifacts.test.js`

| Item | Review | Final | Independent rationale |
| --- | --- | --- | --- |
| stable review paths | agree | keep | Persisted review path and traversal protection are explicit in `review-artifacts-spec.md`. |
| valid schema/redaction | agree | keep | Schema and redaction behavior are stable. |
| invalid schema/reject secrets | agree | keep | Structured errors and reject mode are stable validation behavior. |
| bounded retry/strict gate | agree | split | Default `max_rounds=3` and transitions are specified; full objects and English reasons are overasserted. |
| coverage checklist | **revise** | keep | The exact five surfaces are enumerated in `review-artifacts-spec.md` and mirrored by exported `REVIEW_SURFACES`. Adding a surface should intentionally require spec and test changes. Order should be asserted only if serialized order is public. |

### `semantic-workflow-templates.test.js`

| Item | Review | Final | Independent rationale |
| --- | --- | --- | --- |
| templates complete/parseable/readable | agree | keep | Required template inventory and Chinese-output policy are explicit product assets; additions do not fail. |
| continuous Progress/Execution | agree | rewrite | Exact Markdown headings/table syntax and bold labels freeze presentation; validate semantic roles/schema. |
| session focus minimal | agree | rewrite | Parse YAML and inspect allowed/forbidden semantic keys instead of exact lines. |
| example separates cycle roles | agree | split | Status/build relation is stable; explanatory Chinese prose is not. |
| Progress mirrors Plan | agree | rewrite | Plan/Progress ID equivalence is valuable, but current regex only recognizes one Markdown table rendering. |
| Experiment spans Cycles | agree | split | Cross-Cycle references are stable; exact Attempt prose/format is not. |

### `test-profile.test.js`

| Item | Review | Final | Independent rationale |
| --- | --- | --- | --- |
| spec compose + three scenarios | agree | rewrite | Exact headings/phrases/profile count are docs snapshots; validate structured profile registry and generated docs coverage. |
| selection composes / legacy | **revise** | keep | `normalizeTestProfileSelection` exposes serialized `compose` and legacy compatibility through the public Core API; exact ordering is current output contract. An intentional representation change should update the contract. |
| workflow/preset not profiles | agree | parameterize | Ignore set should derive from workflow/preset registries so new names cannot leak into profiles. |
| analysis artifacts not analysis profile | agree | keep | Workflow kind/profile separation is explicit in `config-spec.md`. |
| contract merges requirements | agree | rewrite | Assert stable requirement IDs, not prompt wording. |
| webapp requires browser evidence | agree | keep | Evidence fields are policy contract. |
| agent-service requirements | agree | keep | CLI/shared-core/real-run requirements are contract. |
| agent-service rejects pseudo test | agree | keep | Real-method mismatch and pseudo-test rejection are explicit policy. |
| research baseline/script/delta | agree | keep | Numeric values are input-derived and the resulting delta is behavior. |
| batch artifact summaries | agree | split | Keep structured queue profile assertion; replace/remove shallow rendered-word regex. |
| default config controls | agree | keep | Defaults are deliberate product policy. |

### `workspace-transaction.test.js`

| Item | Review | Final | Independent rationale |
| --- | --- | --- | --- |
| install zones / manifest last | agree | keep | Activation ordering and owned-zone writes are atomicity contract. |
| crash after prepare rolls back | agree | probe | Safety behavior is valuable; establish whether named fault phases are a supported test interface. |
| partial install restores all | agree | rewrite | Index `0` binds the test to install ordering; inject after an observed semantic install event. |
| all data before activation rolls forward | agree | probe | Same named-fault-seam authority question. |
| after activation finalizes | agree | keep | Persisted transaction phase/action are recovery state-machine behavior. |
| prepared target drift fails closed | agree | keep | Selected path is fixture-derived; external bytes must be preserved. |
| stale ID not overwritten | agree | keep | Transaction identity/recovery semantics are stable. |
| staged tamper rejected | agree | rewrite | Tamper contract is essential, but locating bytes by scanning internal staging representation breaks on encoding/storage refactors. |
| pre-activation target drift | agree | rewrite | Use a semantic target-drift injection seam rather than internal phase/order coupling. |
| activated manifest missing/old | agree | keep | Missing/old authority matrix is meaningful recovery behavior. |
| different ID recovers abandoned | agree | keep | Automatic abandoned-transaction recovery is current safety policy. |
| ancestor/descendant rejected prewrite | agree | keep | Path-prefix collisions are adversarial inputs and must remain zero-write failures. |
| traversal/absolute/outside rejected | agree | keep | Owned zones and protected legacy authority paths are security contract. |
| symlink escape rejected | agree | keep | Symlink escape is a security boundary. |
| damaged manifest blocks | agree | keep | Damaged current authority must fail closed without mutation. |

## Scenario independent review

| Scenario | Review | Final | Independent rationale |
| --- | --- | --- | --- |
| c21/s77 Codex Hook Process | **revise** | keep | A Scenario runner invoking the canonical maintained process-test entry is normal executable composition, not reference-project hardcoding. Renaming the test file requires updating its runner but does not make the behavioral failure scope wrong. Historical `M7` checklist wording can be cleaned without changing the runner. |
| v10/s62 Analysis Preset Runtime | agree | remove | The C3 archive path and its queue policy are reference-repository facts. Current unit tests already cover runtime/ledger behavior; delete this obsolete archive assertion. |
| v3/s13 Hook Session Start | agree | remove | Checklist-only manual instructions target retired `state.yaml` and a nonexistent generic path; it cannot fail on current regressions. |
| v6/s23 Init Existing Project | agree | remove | Four exact English headings test prose, not existing-project Init behavior. |
| v8.1/s33 Import History Merge | agree | remove | Exact command/milestone prose is not executable import behavior. |
| v8.2/s43 Registration | agree | remove | `41 个用户指令` conflicts with its own checklist count and freezes obsolete commands/version-era facts. |
| v9/s53 CLI/TUI Setup | **revise** | remove | Catalog already classifies this as legacy and points to s70. Reclassifying would preserve retired CLI, `.opencode/commands`, model/profile names and help copy. Remove it; add current behavior tests separately if required. |

## Material findings and disputes

### High

1. **Receipt security tests can disappear behind skips without failing the shard.** A Planning or Topology import/API regression makes `HAS_RECEIPT_DELIVERY` false, skips five authorization tests, while the lone unconditional case only checks Delivery imports. This must become a hard prerequisite failure. This is a false-green problem, not merely reduced reporting clarity.
2. **Real-repository audit remains an accidental expected result.** `claude-resume-namespace.test.js` audits `.` and requires the current repository to contain one incidental SessionStart matcher finding. Isolated safe/conflict fixtures should replace it.
3. **C3 archive and command-count scenarios have no reusable contract.** The primary `remove` conclusions for v10/s62 and v8.2/s43 are confirmed.
4. **Catalog replacement claims are not behaviorally equivalent.** `s70-init-current` only runs the `empty repo Init transaction` case. It does not replace v6 existing-project discovery, v8.1 merge-history import, v8.2 registration, or v9 setup/profile/doctor behavior. Removing obsolete scenarios is still correct, but the catalog must not imply that those behaviors remain covered unless current tests are added or the features are explicitly retired.

### Medium

1. Primary overclassified `artifact-catalog` membership tests as exact lists. Both disputed cases permit new kinds; fixture project names and Cycle IDs are correctly input-derived.
2. `legacy-write-fence` writer IDs are deliberate security audit identities, not accidental implementation strings. Their addition/rename should have a localized intentional failure.
3. P0 order/artifact and review surface literals have direct specification authority. They should not be removed merely for being literals.
4. Maintained s77 is a thin process-suite entrypoint but still tests real current behavior. Physical test-file delegation alone is not an invalid contract.
5. Feature Queue M07 prose test should be removed rather than rewritten as another prose-presence gate; the file already has functional coverage of the claimed features.

### Low

1. Primary correctly distinguishes injected `/home/heyx/...` Hypo-Claw paths from production defaults. The excess coupling is in full argument/retry-record assertions, not the fixture literals themselves.
2. Broad error/prose regexes across the shard can both false-fail after copy edits and false-pass on the wrong error. Prefer structured codes/fields where present.

## Counterfactual probes required

1. Break only the Planning or Topology import used by `delivery-receipts`; current behavior should demonstrate five skips and no unconditional failure. The repaired gate must fail.
2. Add an unrelated safe Claude plugin metadata entry and remove/rename the incidental SessionStart matcher; namespace safety should remain green.
3. Add a new Artifact Catalog kind to the fixture output; both disputed membership tests should remain green, confirming they are not exact inventories.
4. Change compact registry cardinality while every returned target remains a valid compact projection; the unexplained `>= 5` assertion should not define correctness.
5. Reorder an equally valid Deep Plan unanswered challenge, DAG ready set, and cycle rotation; semantic results should remain green after normalization.
6. Coalesce Maintenance Run operations while preserving source coverage/provenance; count-based assertions should cease to govern behavior.
7. Run PR readonly provider reads concurrently; absence of remote writes and complete evidence should remain green.
8. Change transaction staging representation/install order while retaining atomicity; semantic fault/tamper probes should continue to detect real corruption.

## Fixture and catalog review

- Concrete project IDs, Cycle IDs, timestamps, paths, actor IDs, tokens, hashes and commands used as supplied inputs are generally legitimate fixtures in this shard. They become defects only when expected independently of those inputs or when they freeze a repository snapshot.
- The `maintenance-run` fixtures are useful heterogeneous source data; expected coverage should be derived from source identities/provenance, not minimum queue-item counts.
- The six quarantined legacy scenarios should not remain indefinitely merely because they are quarantined. Quarantine is classification, not evidence value.
- Before deleting v6/v8.1/v9, record whether their old behaviors are retired or add current behavior-level coverage; the existing `replacement: s70` entries do not prove equivalence.

## Zero-omission check

- Executable inventory: 18/18 files, 117/117 top-level cases reviewed.
- Scenario inventory: 7/7 entries reviewed.
- Primary per-case conclusions: 113 agreed, 11 revised across executable cases and Scenarios (executable: 108 agree / 9 revise; Scenario: 5 agree / 2 revise).
- Additional material issue: 1 missing Receipt prerequisite-failure case/gate defect.
- Revised executable dispositions: two Artifact Catalog cases to `keep`; Receipt export/gate to `rewrite`; Feature Queue docs to `remove`; two Legacy Fence cases to `keep`; P0 ordering to `keep`; review surfaces to `keep`; Test Profile compose to `keep`.
- Revised Scenario dispositions: maintained s77 to `keep`; legacy v9/s53 to `remove`.
- Product source and test source changes made by this reviewer: none.
