# C21-M8 Independent Post-Delete Test Evidence

## Verdict

`NEEDS_TEST_CURATION`

Phase A cleanup is correct and the maintained C21 product boundary tested here has no identified implementation regression. Official Codex discovery is exactly nine Child Skills, M8 behavior contracts pass `32/32`, M5-M7 current delivery/storage/Hook/deletion suites pass, Plugin and Skill validation pass, and the controlled deletion matches its exact Manifest and consumed Receipt.

The repository cannot yet claim a clean release regression because the default root `npm test` still executes the undifferentiated historical test inventory. It reports `936 total / 769 pass / 167 fail / 0 skip`, spanning `79` failing test files. Of these, `31` files fail during module loading because they import deliberately retired exports. The remaining failures predominantly assert deleted Child Skills, old 54-command inventory, generic Rules/TUI/automation, or deferred adapters. The legacy scenario runner similarly reports `31/68` pass and `37/68` fail.

Failure taxonomy for this run:

- Current product regression: `0` identified in the tested C21 boundary.
- Stale retired inventory or deferred adapter tests: all `167` root failure nodes and all `37` failed legacy scenarios, subject to the split-first caveats below for tests that mix current assertions with stale imports.
- Environment SKIP: current Official Codex real-host Hook delivery, because `/usr/local/bin/codex` is `codex-cli 0.128.0` and exposes no verifiable Hook surface.

This verdict does not mean every failing test can be hidden. Seven load-failing files contain current assertions mixed with legacy imports and must be split before the original file is quarantined. The transparent inventory proposal below makes that distinction enforceable.

## Change Summary

This worker made no production, Skill, documentation, test, Runtime, Journal, Capsule, Receipt, or deletion change. The only added file is this independent evidence report.

The tested product change was the already-applied Phase A deletion of 37 non-public Child Skill directories. The expected result is a nine-command Official Codex surface while internal/deferred/removed compatibility intents remain zero-write and generators cannot revive the old surface.

## Technical And Test Method

Validation was layered so stale historical tests could not obscure current behavior:

1. Run the post-delete M8 behavior suite over actual Plugin filesystem discovery, Registry projection, zero-write compatibility routing, generator non-revival, deletion attacks, and current docs.
2. Re-run the accepted M1-M7 focused groups, including M5 Bootstrap acceptance/single-writer protection and M7 Hook/deletion adversarial suites.
3. Run root `npm test` to completion and retain every failure instead of stopping at the first stale test.
4. Run `tests/run_regression.py` against a byte-for-byte `/tmp` mirror of the current worktree. This preserves the repository's `tests/` read-only boundary because that script always creates `tests/results/*.json`.
5. Run Plugin validation, production `checkSkillQuality`, Root plus nine Child Skill quick validation, synthetic and real-host Hook smokes, JSON parsing, production JavaScript syntax checks, and `git diff --check`.
6. Independently recompute Manifest and Receipt bindings, compare the reported and actual deletion sets, and verify the immutable pre-M8 snapshot.

## Focused Validation Results

| Boundary | Result | Interpretation |
|---|---:|---|
| M8 surface cleanup | `32/32` | Exact nine discovery, zero-write diagnostics, non-revival, deletion drift/reuse defenses, and current Codex docs are GREEN. |
| M1-M4 accepted group | `196/198` | Two stale failures only: old `/hw:status` membership in `CANONICAL_COMMANDS`, and `legacy-write-fence.test.js` importing retired `applyConfigTuiEdit`. |
| M5 Bootstrap protected group | `107/107` | Migration, activation, explicit acceptance, single-writer gate, Record, Pack, and post-activation Knowledge fence are GREEN. |
| M6 Delivery/Plan group | `64/64` | Goal, Cycle, adaptive Plan, revision/start, Receipt, topology, proposal preflight, and Skill-root routing are GREEN. |
| M7 Maintain/Hook/Deletion/Recovery group | `115/115` | Ambient Maintain, ten-event Hook behavior, process wrapper, deletion gate, R1/R2 adversarial cases, Receipt, Journal, Capsule, and Pack are GREEN. |
| Root `npm test` | `769/936`, `167` fail | Not a current release gate: `79` files fail, including `31` module-load failures from retired exports. |
| Legacy scenario runner | `31/68`, `37` fail | Failed scenarios target removed commands, old CLI/generators, legacy import workflows, Showcase/Rules, or deferred OpenCode behavior. |

The focused groups use real temporary filesystems and Git repositories where defined by their accepted contracts. No focused current suite failed on a current product assertion.

## Package, Skill, Hook, And Static Results

- Codex Plugin validator: PASS.
- Production `checkSkillQuality({ repoRoot })`: PASS, `0 issues across 10 Skill files`, exactly nine physical Child Skills and no extras.
- Skill Creator quick validation: Root plus all nine public Child Skills PASS (`10/10`).
- Synthetic/process Codex Hook smoke: PASS for all ten input schemas plus valid and invalid wrapper paths.
- Official Codex real-host Hook smoke: environment `SKIP` (`codex-cli 0.128.0`; no verifiable Hook surface).
- Repository JSON parse: PASS for all `47` source-owned/non-ignored JSON files selected by Git inventory.
- Production JavaScript `node --check`: PASS for `109` files under Core, Hooks, Scripts, CLI, and Core CLI paths.
- `git diff --check`: PASS.
- Tests did not create or modify repository `tests/results/`.

Quick validation and `checkSkillQuality` prove structure and references, not end-to-end model behavior. The pre-M8 behavior-eval inputs and baseline remain available, but this worker did not run a candidate-versus-baseline model benchmark and makes no comparative Skill-quality claim.

## Exact Deletion Evidence

Manifest and Receipt binding are coherent:

- Manifest: `.pipeline/reviews/C21/M8/deletion-manifest.yaml`.
- Stored and independently recomputed Manifest hash: `2bbfa6ff4d1354bcdef2543c4d44bb8b844e7dd266fbc5f95cb5f6d1372176ac`.
- Receipt: `receipt-11f1630faba84b0bb53630fd2ee5c1df`.
- Receipt state: `consumed`.
- Stored and independently recomputed scope hash: `77f98ba2ed55f2dfe1faa2f6a577c65fb616b4b020ce878477ebac1501ebdd79`.
- Final execution report outcome: `applied`.
- Final report digest: `sha256:2b33ed699b2099306f525881f4bae25afda0d1551efc2baa9a21bc76b66be377`, equal to the digest recorded in the C21 M8 event stream.
- Manifest entries, report `deleted_paths`, and actual deleted Skill directories: exact ordered equality at `37/37`.
- Every Manifest path is absent; `git diff --diff-filter=D -- skills` contains exactly 37 files, so there is no 38th Skill deletion.
- Four unrelated pre-existing deleted C20 prompt files remain visible in the overall dirty worktree. They are outside the Phase A Manifest and were not attributed to this executor.

The executor writes the report as `prepared` before the filesystem deletion and then replaces the same path with `applied` after Receipt consumption. The code path and deletion suites validate that transition ordering; the live successful run durably retains only the final `applied` document. There is no separate immutable prepared document after success, which is a residual observability limitation rather than a deletion-set mismatch.

The pre-M8 baseline snapshot is intact:

- `FILES.sha256`: all `49/49` payload entries PASS.
- `SNAPSHOT.sha256`: PASS.
- Total files including the two checksum manifests: `51`.
- Writable payload/checksum files: `0`.
- Symlinks: `0`.

## Thirty-One Load-Failure Classifications

`obsolete-only` means the file validates a removed capability or a deferred platform/lane and can enter explicit quarantine now. `mixed-current/legacy` means current assertions must first be extracted into a maintained test; quarantining the entire file without that split would hide useful coverage. No load-failing file is classified `real-regression`.

| Test file | Classification | Current replacement test or evidence |
|---|---|---|
| `acceptance-policy-status.test.js` | `mixed-current/legacy` (`split-first`) | Current manual Delivery acceptance and worker independence are covered by `goal-lifecycle`, `cycle-lifecycle-vnext`, `delivery-receipts`, and `execution-topology`; split any still-current readiness assertions from retired global TUI/auto-timeout checks. |
| `analysis-command-entry.test.js` | `obsolete-only` | Analysis is deferred; M8 asserts explicit deferred routing is non-discoverable and zero-write. |
| `analysis-interaction.test.js` | `obsolete-only` | Analysis execution mode is deferred; current safety boundaries live in Root guidance/Core gates, while M8 proves the old route cannot execute or write. |
| `artifact-catalog.test.js` | `obsolete-only` | The unaccepted generic automation catalog is retired; current persistence is covered by `record-store`, `maintain-ambient`, Journal/Capsule/Pack suites, and the M8 classification evidence. |
| `c20-consultation-boundary.test.js` | `mixed-current/legacy` (`split-first`) | Root `SKILL.md` still contains Consultation-First behavior and C20 evidence remains archived; extract the contract/shared-guidance assertions before quarantining OpenCode/Claude projection checks. |
| `claude-model-routing.test.js` | `obsolete-only` | Claude adaptation is deferred; M8 generator non-revival is the current negative contract. |
| `claude-plugin-alias.test.js` | `obsolete-only` | Claude plugin generation is deferred; current package evidence is the Codex Plugin validator and exact-nine discovery. |
| `claude-settings-sync.test.js` | `obsolete-only` | Claude settings mutation is deferred; M8 proves retired writers reject before mutation. |
| `commands-rules-artifacts.test.js` | `obsolete-only` | M8 replaces 54-command/Rules/adapter expectations with exact-nine discovery, zero-write compatibility diagnostics, and Record/Receipt authority. |
| `deep-plan-contract.test.js` | `mixed-current/legacy` (`split-first`) | Deep Plan remains an internal `/hw:plan` phase; retain behavior through `adaptive-plan` and the passing deep-plan architecture/ask/convert/handoff/package/research suites, then rewrite path assertions against `skills/plan/SKILL.md`. |
| `deep-plan-integration.test.js` | `obsolete-only` | Its OpenCode/Claude 54-command integration is deferred; current internal Plan behavior is covered by `adaptive-plan` and M8 Root/Plan contracts. |
| `docs-governance.test.js` | `mixed-current/legacy` (`split-first`) | The public Docs command/writer is deferred, but current docs remain important; M8's 16 current-doc assertions and Plugin docs validation replace the active surface. Extract any language/link checks not already covered. |
| `execution-lease.test.js` | `obsolete-only` | Watchdog/lease is removed; restart safety is covered by Runtime/Continuation, Recovery Pack, Resume, and M6 Delivery suites. |
| `explore-contract.test.js` | `obsolete-only` | Explore is deferred; M8 proves the explicit old route is non-discoverable and zero-write. |
| `global-config-registry.test.js` | `obsolete-only` | Installed software setup/global registry is retired; current onboarding is covered by `init-bootstrap`, manifest tests, and Plugin metadata validation. |
| `ink-tui.test.js` | `obsolete-only` | Dashboard/TUI is not in this release; hosts provide plan UI and current Workflow behavior is covered by Skills/Core tests. |
| `legacy-write-fence.test.js` | `mixed-current/legacy` (`split-first`) | Preserve the fence through `workspace-format`, `new-format-single-writer`, Bootstrap protected suites, and M8's five writer non-revival contracts; rewrite the writer inventory so it no longer imports retired TUI/docs/adapter exports. |
| `lifecycle-regression.test.js` | `obsolete-only` | Old lease/OpenCode/status/legacy acceptance flows are superseded by M6 Goal/Cycle/Revision/Receipt suites and M3 Recovery suites. |
| `model-pool-actions.test.js` | `obsolete-only` | Global project actions/TUI model pool are retired; execution-role selection is covered by `execution-topology` and host configuration remains outside this release. |
| `opencode-hooks.test.js` | `obsolete-only` | OpenCode is deferred; current Hook evidence is `codex-hooks-vnext`, `codex-hook-process`, M7 adversarial tests, and synthetic Codex smoke. |
| `opencode-panels.test.js` | `obsolete-only` | OpenCode panels/model matrix are deferred; M8 prevents generator revival and the Codex Plugin is the current package. |
| `patch-acceptance.test.js` | `obsolete-only` | Patch is removed; trivial work uses `solo-verified`, material work uses Goal/Cycle, covered by M6 topology and Delivery suites. |
| `platform-adapters.test.js` | `obsolete-only` | Non-Codex adapters are deferred; M8 writer non-revival plus current Codex package validation is the replacement boundary. |
| `progressive-discover.test.js` | `mixed-current/legacy` (`split-first`) | Discover is an internal Plan phase; preserve deterministic Plan/readiness assertions through `adaptive-plan` and rewrite removed child-path/Rules assertions against the consolidated Plan Skill. |
| `project-link-graph.test.js` | `obsolete-only` | Unaccepted generic root-project automation is retired; current workspace identity/containment is covered by Manifest and workspace-format tests. |
| `rules-authority.test.js` | `obsolete-only` | Generic Rules authority is removed; Requirements/Preferences/Feedback Records, scoped Receipts, Root guidance, and Hook/Core gates are covered by Record/Receipt/M7/M8 suites. |
| `rules-capture-habits.test.js` | `obsolete-only` | Rule capture/Habits writers are removed; user constraints persist as Records and deterministic guidance/gates. |
| `skill-quality.test.js` | `mixed-current/legacy` (`split-first`) | Production `checkSkillQuality` is current and passed Root+9 with zero issues; extract its generic malformed/reference fixture tests and retire the Rules/Watchdog/`>=35` assertions. |
| `sync-derived-map.test.js` | `obsolete-only` | Legacy derived-state repair is retired; M8 verifies check-only sync is read-only and all write-enabled legacy generators reject before mutation. |
| `sync-standardization.test.js` | `obsolete-only` | Public sync/OpenCode/TUI/Knowledge generation is retired or deferred; current consistency uses Manifest-selected Records/Recovery and M8 non-revival. |
| `workspace-authority.test.js` | `obsolete-only` | C16 global workspace/project registry authority is unaccepted and retired; current per-repository Manifest/Runtime authority is covered by M1-M6 suites. |

Summary: `24 obsolete-only`, `7 mixed-current/legacy`, `0 real-regression` among module-load failures.

The full root result has `79` failing files, not only these 31. The other 48 load successfully and then fail assertions that read deleted Skill paths, require 54 commands, or exercise retired automation/adapters. They require the same explicit inventory treatment; the most important mixed-current groups are Plan phase documentation, consultation/reporting, worker separation, Skill quality, README/current docs, and legacy-write protection.

## Legacy Scenario Failures

All 37 scenario failures are stale retired inventory or deferred adapter coverage, not environment failures:

- Removed/deferred command or old Child Skill scenarios: `s16`, `s19`, `s24`, `s27`, `s38`, `s39`, `s40`, `s44`, `s45`, `s46`, `s47`, `s48`, `s50`.
- Legacy migration/import/registration/CLI scenarios: `s29`, `s30`, `s31`, `s32`, `s33`, `s34`, `s35`, `s36`, `s37`, `s41`, `s42`, `s43`, `s52`, `s53`, `s59`, `s60`, `s63`.
- Deferred OpenCode adapter scenarios: `s51`, `s54`, `s55`, `s56`, `s57`, `s58`, `s61`.

Many fail because the still-tracked legacy CLI imports the intentionally removed `buildGlobalTuiModel`; this does not make the CLI a current product surface. The M8 classification explicitly retires the installed software CLI, but Phase A did not authorize its physical deletion.

## Transparent Test Inventory Proposal

Create one source-controlled `core/test/test-inventory.yaml` and a parallel `tests/scenarios/scenario-inventory.yaml`. Every physical test file and scenario must appear exactly once. There is no implicit default classification.

Each entry should include:

```yaml
- path: core/test/example.test.js
  lane: maintained # maintained | deferred | quarantine | historical
  product_scope: c21-current
  reason: current behavior contract
  decision_refs: []
  replacement_tests: []
  evidence_refs: []
  expected_status: pass # pass | known_fail
  owner: core
  review_after: C22
```

Required runner behavior:

1. `npm run test:inventory` fails if any of the current 163 `core/test/*.test.js` files is missing, duplicated, points to a missing file, or uses a non-maintained lane without reason plus replacement/evidence.
2. Default `npm test` reads the inventory and runs only `lane: maintained` with strict nonzero failure behavior. It must not use a filesystem glob directly.
3. `npm run test:quarantine` runs `quarantine`, `deferred`, and `historical` explicitly and preserves their raw nonzero exit. A separate report command may aggregate known failures, but it must not relabel them PASS.
4. `npm run test:all-report` runs both lanes and prints separate current and quarantine verdicts. Release acceptance depends only on the strict maintained verdict plus required environment/manual checks.
5. A new unclassified test or scenario fails inventory validation before any tests run. No path-pattern auto-classification is allowed.
6. Quarantine entries record an expected failure fingerprint. Disappearing, new, or materially changed failures are surfaced as drift rather than silently swallowed.
7. `mixed-current/legacy` is not a permanent lane. Split current assertions into maintained files first, then move only the obsolete remainder to quarantine.
8. Physical removal of quarantined tests remains a separate exact Deletion Manifest decision; classification is not deletion authority.

This keeps old evidence runnable without letting it define the current release contract.

## Minimal Test-Curation Queue

1. Add the two exact-coverage inventory files and a read-only selector/validator; classify all 163 Core tests and all 68 scenarios.
2. Split the seven mixed module-load files listed above. Also migrate current assertions from the 48 assertion-failing files, especially Plan phases, worker separation, current docs, Report completion, and README contracts.
3. Put the 24 obsolete-only load failures, retired C16 automation tests, deleted command tests, and deferred adapter tests into explicit quarantine with decision and replacement refs.
4. Rewrite retained current assertions to target Root/Plan consolidated semantics and the nine-command Registry rather than deleted Child Skill files or 54-command counts.
5. Add a maintained C21 scenario lane for Init, Goal, Cycle, Maintain, Resume, Accept/Reject, exact deletion drift, and current Codex Hook process behavior; quarantine the 37 failed legacy scenarios.
6. Run strict maintained `npm test`, maintained scenarios, full quarantine report, Plugin/Skill validators, and an independent audit before calling M8 release-ready.

No test should be deleted merely to turn the count green. Current assertions need behavioral replacements; obsolete tests remain visible and separately runnable until a later authorized cleanup.

## Expected Result After Curation

- Default `npm test` is a strict, meaningful gate for the current C21 product and passes only when maintained behavior is green.
- Deferred and historical tests remain inspectable and runnable with an honest failing/quarantine report.
- Future regressions cannot hide behind 167 expected failures or behind broad exclusion globs.
- Current Plan, consultation, worker separation, docs, Skill quality, and legacy-fence contracts retain executable coverage after their mixed files are split.

## Problems Encountered

- Root test output is large because removed exports cause cascaded module-load and CLI failures. The complete run was retained and classified rather than truncated at the first error.
- The legacy regression script writes a timestamped JSON result by design. It was run from a `/tmp` mirror with the repository `node_modules` mounted read-only by symlink so the source `tests/` tree remained untouched.
- The successful deletion report overwrites its transitional `prepared` state with `applied`; post-hoc disk inspection cannot show both documents simultaneously.
- A compatible current Official Codex host with trusted project Hooks was unavailable.

## Risks And Follow-Up

- Until the maintained inventory exists, root `npm test` is not a reliable release gate. A real new regression could be buried among known historical failures.
- Quick Skill validation is structural. Representative candidate-versus-pre-M8 model behavior evaluation remains separate work.
- The tracked legacy CLI is intentionally outside the current product but currently fails at module import. It must remain explicitly quarantined until a future exact cleanup authorization removes or archives it.
- The actual real-host ten-event Hook path remains unverified; synthetic/process coverage is strong but does not replace host trust/discovery evidence.
- Prepared deletion evidence is transitionally enforced but not retained as a second immutable artifact after success.
