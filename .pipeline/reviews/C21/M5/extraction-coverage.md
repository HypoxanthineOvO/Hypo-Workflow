# C21-M5 Extraction Coverage Audit

- Generated: `2026-07-12T07:40:26+08:00`
- Role: independent extraction coverage compiler
- Scope: six proposal artifacts, the M5 prompt, and digest-only re-open of every outer `sources[].locator`
- Authority effect: none
- Verdict: **`PROPOSAL_ONLY`**

## Conclusion

The six Extractor outputs form a complete proposal set for Curator intake: all six machine-readable arrays parse, all C1-C21 source groups are represented, the required M5 fact classes are present, and the exact M6 -> M7 -> M8 route is preserved. The combined set contains **66 candidates**, **115 outer source references**, and **57 unique candidate source locators**.

All **57/57** unique outer locators were independently re-opened and rehashed. Every declared SHA-256 digest matches. Candidate provenance is repository-relative, regular-file only, and free of path traversal or symlink indirection. The proposal payload contains no detected secret value or private absolute path.

This result does **not** select the final Records and does **not** authorize Record Store writes or schema activation. The Curator must still reconcile 22 current-but-unreviewed candidates, four non-current candidates, and the semantic conflict clusters identified below. The outer Stash supersedes edge is intentionally proposal-level; the deterministic writer must compile it to Record IDs after allocation.

There is **no extraction-coverage blocker for Curator handoff**. Activation remains gated on curation, independent audit, deterministic staging, and the M5 activation protocol.

## Method And Boundary

The compiler independently parsed the machine-readable candidate array in each proposal. It did not curate, rewrite, promote, or reject any candidate fact. It did not read production code, tests, fixtures, state, log, PROGRESS, chat, transcript, or tool-output surfaces. Source files named by outer candidate locators were opened only to recompute SHA-256 digests and path properties.

The distinction used throughout this report is:

- **inventory source**: a file the Extractor declared it inspected;
- **candidate source reference**: one occurrence in an outer candidate's `sources[]`;
- **unique candidate locator**: a deduplicated file path reached from outer `sources[].locator`;
- **proposal**: non-authoritative candidate data awaiting Curator and Auditor decisions.

## Source-Group Inventory

| Source group | Proposal artifact | Declared inventory | Candidate locators | Inventory-only | Candidates | Source refs |
|---|---|---:|---:|---:|---:|---:|
| C1-C4 | `extractors/c01-c04.json` | 9 | 5 | 4 | 6 | 11 |
| C5-C8 | `extractors/c05-c08.json` | 12 | 9 | 3 | 6 | 12 |
| C9-C12 | `extract-c09-c12.md` | 12 | 8 | 4 | 13 | 23 |
| C13-C16 | `extract-c13-c16.md` | 10 | 8 | 2 | 11 | 19 |
| C17-C20 | `extract-c17-c20.md` | 12 | 9 | 3 | 14 | 20 |
| Current C21 | `extract-c21-current.md` | 18 | 18 | 0 | 16 | 30 |
| **Total** | **6 proposals** | **73** | **57** | **16** | **66** | **115** |

The 16 declared inventory files that intentionally produced no candidate source reference are:

```text
C1-C4
.pipeline/archives/C1-v9-opencode-native-adapter/cycle.yaml
.pipeline/archives/C1-v9-opencode-native-adapter/summary.md
.pipeline/archives/C2-new-cycle/cycle.yaml
.pipeline/archives/C3-opencode-multi-agent-matrix-and-v10-analysis-preset/cycle.yaml

C5-C8
.pipeline/archives/C5-hypo-workflow-c5-follow-up-ai-coding-workflow-redesign/knowledge-summary.md
.pipeline/archives/C7-codex-service-effectiveness-and-workflow-governance/summary.md
.pipeline/archives/C7-codex-service-effectiveness-and-workflow-governance/knowledge-summary.md

C9-C12
.pipeline/archives/C9-configuration-governance-pr-explain-claude-resume/knowledge-summary.md
.pipeline/archives/C10-experience-optimizations/knowledge-summary.md
.pipeline/archives/C11-workflow-experience-issues/knowledge-summary.md
.pipeline/archives/C12-workflow-deep-plan-discussion/knowledge-summary.md

C13-C16
.pipeline/archives/C15-workflow-interaction-analysis-mode/knowledge-summary.md
.pipeline/archives/C16-root-project-management-mode/knowledge-summary.md

C17-C20
.pipeline/archives/C17-audit-remediation-and-architecture-debt-reduction/knowledge-summary.md
.pipeline/archives/C18-instruction-quality-review-and-integration-sync-plan/knowledge-summary.md
.pipeline/archives/C19-workflow-core-content-and-plan-mode-optimization/knowledge-summary.md
```

The proposal narratives explain these omissions as stale lifecycle metadata, superseded platform detail, duplicate Knowledge Compact material, or evidence that did not meet the future-decision-risk threshold. The four C9-C12 Knowledge Compacts are byte-identical; the C17-C20 group likewise treats repeated compacts as one latest-observed source rather than independent confirmation. Under this assignment, the 16 uncited inventory files were not independently re-opened; digest verification below covers the exact 57 outer candidate locators required by the M5 coverage contract.

## Exact Distributions

### Per Group

| Group | Requirement | Decision | Preference | Feedback | Current true/false | Reviewed true/false |
|---|---:|---:|---:|---:|---:|---:|
| C1-C4 | 3 | 3 | 0 | 0 | 6 / 0 | 6 / 0 |
| C5-C8 | 0 | 5 | 1 | 0 | 6 / 0 | 6 / 0 |
| C9-C12 | 4 | 6 | 1 | 2 | 13 / 0 | 0 / 13 |
| C13-C16 | 5 | 2 | 0 | 4 | 9 / 2 | 5 / 6 |
| C17-C20 | 1 | 10 | 0 | 3 | 13 / 1 | 8 / 6 |
| Current C21 | 5 | 11 | 0 | 0 | 15 / 1 | 16 / 0 |
| **Total** | **18** | **37** | **2** | **9** | **62 / 4** | **41 / 25** |

### Source Class

The Extractors used 28 proposal-level `source_class` labels. Exact aggregate counts are:

```text
accepted_cycle_continuation                 1
accepted_cycle_decision                     4
accepted_cycle_follow_up                    1
accepted_cycle_lesson                       2
accepted_cycle_outcome                      1
accepted_cycle_requirement                  1
accepted_milestone_outcome                  4
accepted_outcome                            2
approved_next_route                         3
archived_cycle_lesson_and_summary           2
archived_cycle_lifecycle_and_summary        1
archived_cycle_summary                      4
archived_cycle_summary_and_cycle_lesson     1
archived_failure_and_correction_summary     1
archived_follow_up_risk_summary             1
archived_unaccepted_architecture_summary    1
architecture_decision                       7
confirmed_constraint                        1
confirmed_deferred_design                   1
confirmed_deferred_scope                    1
confirmed_design                            4
cross_cycle_constraint                      2
current_milestone_contract                  1
important_feedback_failure                  1
knowledge_compact_decision                  3
knowledge_compact_pitfall                   1
legacy_cycle_archive                       13
superseded_design                           1
```

These labels are extraction provenance, not a final Record taxonomy. The Curator must map them to the four allowed Record kinds without using a label such as `legacy_cycle_archive` as evidence that a candidate is current or accepted.

### Confidence Representation

Confidence is also proposal metadata and is heterogeneous by Extractor: 39 candidates use string values and 27 use numeric values.

```text
string confirmed: 6
string high:     32
string medium:    1
number 1.00:      2
number 0.99:     14
number 0.98:      4
number 0.95:      1
number 0.94:      1
number 0.92:      1
number 0.90:      2
number 0.88:      1
number 0.86:      1
```

This is not an extraction blocker, but the Curator/deterministic-writer boundary must normalize it to the target schema rather than persisting mixed representations by accident.

## Required M5 Fact-Class Coverage

| Required class | Exact proposal evidence | Coverage result |
|---|---|---|
| Active requirements | 18 `requirement` candidates; all 18 have `current=true` | Covered |
| Architecture decisions | 37 `decision` candidates in total, 34 current; includes 7 explicit `architecture_decision` and 4 current-C21 `confirmed_design` candidates | Covered, requires curation of old authority |
| Cross-Cycle constraints | 2 explicit `cross_cycle_constraint` plus 1 current-C21 `confirmed_constraint` | Covered |
| Accepted outcomes | 2 `accepted_outcome`, 1 `accepted_cycle_outcome`, and 4 `accepted_milestone_outcome` candidates | Covered |
| Important feedback/failures | 9 `feedback` Records plus 1 `important_feedback_failure` preference | Covered |
| Supersedes relationships | One duplicate dedupe pair and one exact outer candidate-key edge for the Stash replacement | Covered at proposal level |
| Full current C21 context | 16 candidates: 15 current and 1 explicitly superseded historical draft | Covered |

The current-C21 package is internally complete at the intended decision level:

- candidates 1-5 preserve the confirmed architecture, lifecycle, command exposure, worker separation, and recovery model;
- candidates 6-9 preserve accepted M1-M4 outcomes and their residual limits;
- candidate 10 preserves the M5 bootstrap/cutover invariant;
- candidates 11-13 preserve the exact M6-M8 route;
- candidate 14 preserves deferred scope;
- candidates 15-16 preserve the Stash draft and its confirmed replacement.

Coverage here means the fact class is represented. It does not mean every represented candidate should become a final active Record.

## Exact M6 -> M7 -> M8 Route

| Milestone | Candidate / dedupe key | Required route | Explicit boundary |
|---|---|---|---|
| M6 | `c21-current-m6-goal-cycle-adaptive-plan-route` / `project:c21:m6-goal-cycle-adaptive-plan-route` | Goal and Cycle as peer Deliveries; Goal has one Design; Cycle has ordered Milestones and one final acceptance; adaptive Plan; explicit start; role-separated execution; verification; Resume; scoped Accept/Reject; exact nine-command surface | Maintain and Codex Hooks are not M6 scope |
| M7 | `c21-current-m7-maintain-codex-hook-route` / `project:c21:m7-maintain-codex-hook-route` | Ambient Maintain; proposal-only recorder workers; primary Codex adapter; bounded SessionStart/UserPromptSubmit/PreToolUse/PermissionRequest/PostToolUse/PreCompact/PostCompact/SubagentStart/SubagentStop/Stop hooks; context/evidence/Pack/reminder behavior; hashed deletion manifest and Receipt boundary | OpenCode/Claude adapters, telemetry, cleanup execution, generic scheduling, and quota automation are not M7 scope |
| M8 | `c21-current-m8-cleanup-deletion-gate-route` / `project:c21:m8-cleanup-deletion-gate-route` | Post-M7 live dependency rescan; classify `delete`, `retain_internal`, or `deferred_hidden`; complete Deletion Manifest; fresh exact `deletion.execute` Receipt; drift invalidation; controlled source-before-derived batch; regeneration non-revival; Skill evaluations; full regression; independent audit; final manual Cycle acceptance | The prompt and general Cycle authorization do not authorize deletion |

The three route candidates are distinct, current, reviewed, and source-backed. Their bodies preserve the handoff boundaries that prevent Maintain/Hooks from leaking into M6, cleanup from leaking into M7, or M8 deletion from inheriting an earlier approval.

## Duplicate Keys And Supersedes

- Exact duplicate candidate `key` values: **0**.
- Exact duplicate `record_patch.dedupe_key` values: **1 key / 2 candidates**.
- Outer candidate supersedes edges: **1**.
- Patch-level supersedes edges before ID allocation: **0**, intentionally.

The only exact dedupe pair is:

```text
dedupe_key: project:stash:implementation-model

old: c21-current-stash-git-snapshot-draft
     current=false, reviewed=true

new: c21-current-stash-suspend-reconciliation
     current=true, reviewed=true
     outer supersedes -> c21-current-stash-git-snapshot-draft
```

The replacement candidate's outer `supersedes` contains the candidate key while `record_patch.supersedes` remains empty. This is the correct proposal-to-writer boundary: proposal workers cannot allocate authoritative Record IDs, so the deterministic writer must compile the preserved candidate-key edge into the allocated Record-ID edge. The edge must not be lost during merge.

No other Extractor asserted a supersedes edge. That absence must not be interpreted as proof that the remaining candidates are semantically independent.

## Curator Reconciliation Queue

### Non-Current Candidates

Exactly four candidates have `current=false`:

```text
c16-local-authority-and-gated-remote-adapters       reviewed=false
c16-maintain-architecture-debt-requires-revalidation reviewed=false
c17-c20.rules.structured-authority-legacy          reviewed=false
c21-current-stash-git-snapshot-draft               reviewed=true
```

The Stash draft has an explicit replacement. The other three do not; the Curator must explicitly exclude, reframe, or connect them to a current replacement rather than letting `current=false` candidates become active leaves.

### Current But Not Reviewed

Exactly **22** candidates have `current=true` and `reviewed=false`:

```text
C9-C12 (13)
c09-c12-high-impact-human-gates
c09-evidence-redaction-before-storage-and-rendering
c09-claude-command-namespace-safety
c10-plan-configure-before-discover
c10-c11-subagent-governance-and-two-layer-context
c10-command-registry-derived-surface-sync
c10-remote-pr-validation-gap
c11-zh-cn-canonical-skill-headings
c11-plan-examples-require-abstraction
c11-user-visible-response-contract
c09-c11-durable-automation-whitelist-boundary
c12-deep-plan-durable-discussion-package
c12-archive-status-authority-conflict

C13-C16 (4)
c13-opencode-native-command-registration-contract
c14-command-tests-dynamic-and-bilingual
c16-delivery-complete-does-not-equal-cycle-accepted
c16-real-delivery-evidence-for-external-notifications

C17-C20 (5)
c17-c20.debt.unresolved-architecture-quality-followups
c17-c20.targets.c20-local-adaptation-continuations
c17-c20.docs.platform-neutral-readme
c17-c20.adapters.interface-map-and-hook-semantics
c17-c20.runtime.state-prompt-coherence-pitfall
```

Three additional unreviewed candidates are the non-current C16/C17 entries listed above, producing the aggregate `reviewed=false` count of 25.

### Semantic Conflict And Overlap Clusters

The following are Curator questions, not final selection decisions:

1. **Rules and constraint authority.** `c08-structured-rules-habits-authority` says Structured Rules/Habits are current authority; `c17-c20.rules.structured-authority-legacy` marks that model non-current; `c21-current-nine-command-surface` places Rules among M8 removal candidates. Preserve or supersede the underlying user-constraint/authorization semantics explicitly without reviving the generic Rules command by accident.

2. **Maintain.** `c16-maintain-architecture-debt-requires-revalidation` is non-current and warns against reusing C16 maintenance components. `c21-current-delivery-lifecycle-manual-acceptance` defines Maintain as ambient, while `c21-current-m7-maintain-codex-hook-route` defines the new implementation route. Do not carry C16 implementation authority into the M7 design without revalidation.

3. **Command exposure versus capability semantics.** Historical candidates cover `/hw:sync`, Claude namespace safety, command-registry visibility, OpenCode native registration, bilingual/dynamic command tests, Audit/Quality/Optimize separation, named Plan phases, and internal integration-sync. `c21-current-nine-command-surface` is the current exposure contract. Curate durable behavior separately from public discoverability and platform registration.

4. **Old authority after cutover.** `protected-workflow-state-transition-only` treats legacy `state.yaml`, `cycle.yaml`, and `rules.yaml` as protected state. C21 instead makes the new manifest/Records/Runtime authority and freezes legacy writers. Reframe the historical protection rule as a no-write/frozen-residue constraint if retained; do not preserve legacy authority after activation. Also reconcile `c16-local-authority-and-gated-remote-adapters`, `c17-c20.runtime.state-prompt-coherence-pitfall`, `c21-current-skill-first-single-authority`, and the M1/M5 cutover contracts.

5. **Plan, Deep Plan, and Analysis.** `c10-plan-configure-before-discover` puts Configure before Discover; C19 records `Discover -> Technical Stack -> Architecture -> Decompose -> Generate`; C21 makes depth adaptive. `c12-deep-plan-durable-discussion-package` calls Deep Plan first-class, while C21 keeps it internal. `c15-analysis-recoverable-first-class-lane` preserves the capability, while C21 keeps Analysis deferred and non-discoverable. Curate the durable semantics without reintroducing removed public commands or fixed phase overhead.

6. **Acceptance and continuation.** `acceptance-is-distinct-lifecycle-gate` includes Cycle and Patch, while C21 makes Patch a removal candidate and introduces Goal/Cycle peer Deliveries. `c05-authorized-execution-auto-continuation` favors uninterrupted authorized execution; C21 requires explicit start and one final manual acceptance. Preserve auto-continuation only after the explicit start boundary and for the selected Delivery scope.

7. **Historical adapters.** C6, C9, C13, and C17-C20 retain useful Claude/OpenCode namespace, registration, and hook-semantics lessons, but C21 defers non-Codex adapters. Exact platform schemas and hook behavior require future adapter-local verification; historical proposals must not advertise those adapters as current C21 backends.

8. **Potentially stale follow-ups.** C10's remote PR smoke gap, C17's architecture/quality follow-ups, and C20 target-local continuations may remain useful feedback, but later C21 work or target-local records may already resolve part of them. Verify closure before activating them as current leaves.

9. **Repeated compact knowledge.** Several Knowledge Compact sources are byte-identical and carry older C4/C6/C8 facts into later Cycle archives. Their later file location is not independent confirmation. Avoid giving repeated compact projections extra evidentiary weight.

10. **Lifecycle conflicts.** C12, C13, and C14 have archive lifecycle conflicts; C16 is delivered but not accepted. Preserve the conflict or gate status as feedback rather than silently promoting the associated implementation summaries to accepted architecture.

## Explicit Excluded Classes

The six proposals and M5 prompt explicitly exclude or decline to promote these classes:

- raw chat, transcripts, hidden reasoning, scratchpads, full tool logs, session-provider artifacts, and raw private narrative;
- secrets, credential values, environment values, authorization headers, recipient data, private payloads, user-home paths, and machine-specific absolute paths;
- current or archived `state.yaml`, `log.yaml`, `PROGRESS.md`, continuation files, compact runtime views, and event streams, except the explicitly inventoried current C21 `cycle.yaml` and bounded historical Cycle metadata;
- per-Milestone prompts outside C21 M5-M8, intermediate reports/reviews/audits/worker evidence, and duplicate reports outside the bounded current-C21 inventory;
- production code, tests, fixtures, generated adapters, package metadata, Git diffs, live workspace content, existing/proposed Record Store files, indexes, manifest, Runtime, Capsules, Packs, Snapshots, Receipts, staging, and rollback data;
- old platform command maps, provider/model IDs, installation paths, exact external links, narrow adapter implementation details, and other target-owned or fast-changing platform data;
- routine versions, timestamps, commit identifiers, test totals, release readiness narration, transient authentication/toolchain failures, and milestone-by-milestone summaries when they do not change a future decision;
- duplicate Knowledge Compact entries inherited from earlier Cycles and broad architecture snapshots outside the source group's allowlist;
- obsolete intermediate lifecycle state, old Batch Plan/queue defaults, narrow TUI details, unaccepted C16 feature/layout/schedule details, and unsupported claims that local/dry-run execution proves a remote side effect;
- arbitrary-repository migration, public `/hw:migrate` or `/hw:bootstrap`, tracked legacy-file deletion, later Delivery implementation, and raw live-workspace fixture capture.

These exclusions are consistent with the M5 rule: retain only a fact whose absence could materially cause a different wrong future decision.

## Source Integrity, Path, Privacy, And Schema Results

### Source And Digest

- Proposal artifacts parsed: **6/6**.
- Candidates parsed: **66/66**.
- Outer source-reference occurrences: **115**.
- Unique outer locators re-opened: **57/57**.
- Declared digest format valid: **115/115**.
- Unique locator SHA-256 matches: **57/57**.
- Missing sources: **0**.
- Conflicting declared digests for the same locator: **0**.
- Outer `sources[]` to `record_patch.source_refs[]` correspondence: **115/115** in count, type, ref, locator, and order.

### Path And Privacy

- Repository-relative `.pipeline/` locators: **57/57 unique**.
- Regular files: **57/57**.
- Symlink locators: **0**.
- Parent traversal: **0**.
- Paths outside `.pipeline/`: **0**.
- Unix or Windows private-home absolute paths in candidate payload: **0**.
- OpenAI/GitHub/AWS/Slack token patterns: **0**.
- JWT, bearer credential, private-key header, or credential-bearing URL patterns: **0**.
- Raw chat/transcript/tool-log payloads retained as candidates: **0 observed**.

SHA-256 evidence strings are integrity metadata and were not classified as credentials.

### Proposal Schema

- Required outer candidate fields present: **66/66**.
- `current` and `reviewed` are booleans: **66/66**.
- Non-empty outer sources: **66/66**.
- Project scope exactly `{type: "project", ref: "project:hypo-workflow"}`: **66/66**.
- Allowed Record kinds only: **66/66**.
- Non-empty Record bodies: **66/66**.
- Parseable `created_at` and `updated_at`: **66/66**.
- Unique candidate keys: **66/66**.
- Exact duplicate dedupe handling: one intentional two-candidate Stash chain.
- Outer supersedes format: one valid candidate-key edge.
- Patch supersedes before Record-ID allocation: empty on **66/66**, as required by the proposal-to-deterministic-writer boundary.

The 28 `source_class` values and mixed confidence representations require deterministic normalization, but neither is authoritative Record data yet. No proposal schema issue blocks Curator intake.

## Verdict And Next Gate

**Verdict: `PROPOSAL_ONLY` / coverage ready for Curator.**

The proposal set has complete source-group coverage, valid provenance, exact current route coverage, and no digest, path, privacy, or structural intake blocker. It remains non-authoritative. The Curator must:

1. resolve the four non-current and 22 current-but-unreviewed candidates;
2. merge semantic overlaps without treating repeated compact projections as independent evidence;
3. preserve the Stash candidate-key supersedes edge for deterministic Record-ID compilation;
4. produce one merged proposal with explicit active leaves and excluded candidates;
5. submit that proposal to an independent coverage/privacy/schema Auditor before any deterministic writer stages or activates Records.

This report does not decide the final curated set.
