# Independent Reviewer Audit 01

## Scope and independent inventory

- Method: recomputed the normalized `core/test/**/*.{test,spec}.*` inventory and reviewed zero-based index `% 10 == 1`; did not treat `primary-01.md` as evidence. Mechanically reconciled the result against frozen inventory commit `cd829923957ba09d5d0f1d0aa7ec9b5eecab9d93` in `audits/INVENTORY.md`.
- Test files: **18/18** assigned files, covering the same **107 declared/generated top-level cases** reported by Primary (including generated canonical-example cases and nested/table-driven cases).
- Scenarios: recomputed the combined catalog inventory by normalized path and reviewed **8/8** assigned paths.
- Shared surfaces: independently reviewed `tests/regression-catalog.json`, `tests/run_regression.py`, and the previously omitted package test runner `tests/run_core_tests.mjs`.
- Supporting evidence: read every assigned Scenario's checklist and available `run.sh`/config, plus directly relevant fixtures and source assertions.
- Reviewer labels: `agree` accepts Primary's contract/verdict; `revise` changes its reasoning or disposition; `missing` records a material item absent from Primary.

## Complete test-file review

| File | Primary items covered | Review | Independent conclusion / correction |
| --- | --- | --- | --- |
| `adaptive-plan.test.js` | exports; Goal/Plan structure; Stone selection; final Proposal replies | agree | All four protect public Delivery/authority contracts. `可以` is safe only when the immediately preceding, persisted `awaiting_authority_intent` is the explicit start question; the unscoped negative case is essential. |
| `audit-regression-canonical-examples.test.js` | fixture existence; four generated prose/link checks; fixed command inventory | agree | Exact files, historical Scenario IDs, commands and prose are documentation snapshots. Rewrite semantic/link integrity checks and remove the fixed s64-s68 inventory assertion. |
| `c23-m1-experiment.test.js` | exports; attempt precedence; rerun identity; supersede; trash/restore; baseline | agree | All six groups derive identities from fixtures and protect observable history/Receipt behavior rather than repository-specific truth. |
| `chat-runtime.test.js` | session start; recovery paths; chat entry; persistence threshold; Patch escalation | agree | Session ID format, legacy recovery file layout and heuristic thresholds need parameterization/reclassification/probes as Primary states; `chat_entry` is a stable record type. |
| `codex-continuation-preflight.test.js` | roundtrip; priority; unsafe command; preflight matrix; notify warning; documentation | agree, with one refinement | Split security assertions from README/prose freshness and retire legacy state fallback when authority migrates. The `codex-notify` identifier may remain an explicit platform contract if centralized; do not merely loosen it to accept arbitrary hook names. |
| `config.test.js` | YAML; merge/write; model defaults/override; automation/safety; worker separation/authorization | agree | Exact target-owned model names and prose are invalid source-level gates. Protocol fields, safety gates, authorization routes and negative fixtures are legitimate constants. |
| `deep-plan-package.test.js` | creation layout; lifecycle; compact exclusion; protected writes | agree | Split versioned artifact-layout compatibility from behavior; retain input-derived IDs, content exclusion and protected-authority byte checks. |
| `execution-topology.test.js` | API plus generated policy/evidence matrix | agree | Public roles/statuses and separation policy are legitimate contracts. Probe the high-coupling heuristic point; do not weaken identity/evidence fail-closed behavior. |
| `global-consolidation.test.js` | plan; scheduler evidence; retired CLI; Chinese/redaction; Notion dry run | agree | Reclassify retired CLI coverage and replace exact presentation vocabulary/prefix coupling with structured result, redaction and zero-remote-write assertions. |
| `knowledge-hooks.test.js` | session compact; strict ledger; documentation boundary | agree | The first two exercise obsolete Knowledge/legacy authority and must not remain current gates; prose scans need semantic replacement. |
| `maintain-ambient.test.js` | semantic staging; noise; proposal-only recorder | agree | All three use concrete values as fixture inputs and correctly verify no unauthorized pointer/Record write. |
| `notion-apply-gate.test.js` | preflight; bound approval; hash; unsafe/raw input; subset; failed/success verification | revise | Agree with the first six. Do **not** broadly loosen exact write/read call sets in the final two: extra remote calls are observable side effects and should fail. Queue status values are lifecycle protocol unless explicitly redesigned. Prefer subset assertions only for extensible evidence metadata, while preserving exact approved write targets/count. |
| `platform-adapters.test.js` | conservative output; managed blocks; selection; Cursor projection; stale pruning | agree | Tests mix real ownership/safety rules with exact file/prose/model/command inventories. Derive expected adapter resources from canonical registries and keep user-owned-content preservation explicit. |
| `project-link-graph.test.js` | seed edges; invalid relations; metadata; inverse/drift | agree | Hypo names are self-contained fixture input, not universal truth; schema, direction and workspace authority are the protected contracts. |
| `recovery-faults.test.js` | exports; truncation/corruption; blob drift; transaction rollback; protected bytes | revise | Agree except `truncated_final_line`: this is already a structured public warning code and should remain exact, not be weakened. Rewrite only the tests that reconstruct private blob/transaction paths; retain fail-closed and authority-byte assertions. |
| `rules-authority.test.js` | normalization; invalid enum; precedence; source loading; override; opt-in; matrix | agree | Fixture project/Cycle names are derived inputs. Only rendered legacy-summary formatting is overcoupled; structured precedence/evidence assertions are sound. |
| `skill-spec.test.js` | sections/counts; command traceability; audit references | agree | Fixed 45/43/53 and 54/44 counts, headings, product-name bibliography and release prose are repository snapshots. Retain discovered command-to-file traceability without fixed totals. |
| `worker-separation-spawn-enforcement.test.js` | identity; lifecycle; ownership/scope; readiness; no-op evidence | agree | Preserve required blocker codes as structural subsets so additive diagnostics do not cause unrelated failures; exact safety outcome and distinct identities remain required. |

## Complete Scenario review

| Scenario | Review | Independent conclusion / correction |
| --- | --- | --- |
| `c21/s71-goal-delivery` | revise | Primary correctly requests rewrite but misstates the failure mode. A renamed/nonmatching title does **not** fail: `node --test --test-name-pattern='__C023_NO_MATCH_SENTINEL__' core/test/goal-lifecycle.test.js` returned `exit=0` with no matching cases. This is a high-severity false green. Use a dedicated test file or verify nonzero matching/executed test count. |
| `v0/s03-diff-score-blocks` | agree | Runner checks only literal config text; checklist's historical PASS claims are never executed. Keep quarantined only until removal/replacement, not as behavioral evidence. |
| `v11/s67-worker-separation-spawn-enforcement` | revise | The wrapper runs the full valid focused test, but adds no contract beyond the already maintained core file. Do not reclassify this duplicate Scenario as maintained merely because its target is maintained; remove the duplicate wrapper or document a distinct Scenario-level contract first. |
| `v5/s17-plan-review` | agree | Obsolete paths, C3 archive and exact headings; remove. |
| `v6/s27-reset-modes` | agree | Documentation grep does not execute reset behavior; remove or replace with an actual current lifecycle test. |
| `v8.1/s37-import-history-existing-pipeline` | agree | Legacy authority/path prose only; remove. |
| `v8.3/s47-showcase-lifecycle` | agree | Exact version/prose/command grep without lifecycle execution; remove. |
| `v9/s57-opencode-events-auto-continue-file-guard` | agree | Retired CLI plus generated-source grep is both brittle and behaviorally weak; keep quarantined pending replacement/removal. |

## Shared catalog and runner review

| Surface | Item | Review | Independent conclusion / correction |
| --- | --- | --- | --- |
| catalog | schema version | agree | `schema_version: "1"` is a valid protocol constant. |
| catalog | core inventory/reasons | agree | Exact inventory classification is useful, but `covers` and templated historical reasons are not contract evidence. Require behavior-specific rationale; keep historical milestone labels optional. |
| catalog | Scenario inventory/reasons | agree | One generic reason is reused by **37** quarantined Scenarios; it cannot establish individual obsolescence or replacement equivalence. |
| catalog | retired surfaces | agree | Explicit retired routes and public `/hw:*` replacements are legitimate compatibility metadata. |
| catalog | classification partition | revise | Allow an empty quarantine set. However, exact `core`/`scenarios` and `maintained`/`quarantined` keys can remain a closed **v1 schema**; schema-compatible extensions require either an explicit extension policy or version bump, not blanket acceptance. |
| Python runner | core discovery | agree | Confirmed false green: methodology finds **179** tests, while top-level `*.test.js` discovery sees **178** and misses `core/test/fixtures/c21-m4/brownfield/test/server.test.js`; catalog dry-run still succeeds. Use shared recursive discovery for `*.test.*` and `*.spec.*`. |
| Python runner | Scenario discovery | revise | The name/checklist convention is undocumented and brittle, but discovering only catalog-declared entries would hide unclassified directories. Define an executable Scenario schema, discover it independently, then demand exact catalog coverage. |
| Python runner | partition/path/selection/report | agree with refinement | Path traversal protection and selection/reporting are sound. Remove only the forced nonempty quarantine rule; closed schema keys are not inherently harmful hardcoding. |
| Python runner | `run()`/common validation | agree | Replace `shell=True` string construction with argv; separate repository-layout lint (`results/.gitkeep`) from behavior and move named exceptions into declared metadata. |
| Python runner | `scenario_specific()` | agree | Central switch hardcodes s01-s15 counts, prose, files and thresholds, while later Scenarios own scripts. Move behavior to executable/declarative per-Scenario contracts and keep runner generic. |
| Python runner | later `run.sh` execution | agree | `bash` plus validated path as argv is sufficient; execution/result propagation is the useful contract. |
| `tests/run_core_tests.mjs` | entire package test runner | missing | Primary did not audit the actual `npm test` runner. It duplicates catalog validation and the same nonrecursive top-level `*.test.js` discovery (`readdir`, lines 189-193), so `npm test` also omits the nested methodology test. It safely uses `spawnSync` argv and correctly runs selected paths, but must share one catalog schema/discovery implementation with the Python runner to prevent fixes drifting between CI surfaces. |

## Disagreements and missing findings

### High

1. **Missing CI/package runner audit:** `package.json` maps `npm test` to `tests/run_core_tests.mjs --set maintained`; Primary reviewed only the Python Scenario runner. Both runners independently duplicate the flawed inventory validator, so fixing only one leaves CI false-green.
2. **`s71` silently passes with zero matched tests:** the observed `1..0` nested test result still exits 0. Any maintained Scenario using `--test-name-pattern` must prove that the intended case actually executed; the same risk should be audited in `s70`, `s72`, `s74`, `s75`, and `s76` by their owning shards.
3. **Inventory mismatch is concrete, not hypothetical:** 179 methodology files versus 178 runner-discovered files; the missed nested `server.test.js` is outside catalog enforcement and `npm test` selection.

### Medium

1. `s67` should not become maintained solely because it wraps a maintained test; duplicate wrappers inflate apparent independent coverage.
2. Exact Notion write targets/counts are valuable remote-side-effect boundaries. Parameterizing them too broadly would allow unexpected writes to pass.
3. Exact structured diagnostic/warning codes are not equivalent to prose hardcoding. If documented as machine-readable output (`truncated_final_line`, blocker codes), preserve them while allowing additive metadata.
4. Catalog schema strictness and historical-data hardcoding are separate issues. Removing `quarantined.length > 0` is necessary; accepting arbitrary keys under schema v1 is not.

## Required counterfactual probes

| Probe | Current expected result | Corrected expected result |
| --- | --- | --- |
| Add/note nested `*.spec.mjs` or current nested `server.test.js` | Both runners accept catalog without classifying it | Both runners reject it as unclassified until cataloged |
| Run `s71` pattern against a guaranteed nonexistent title | **Observed:** exit 0 / green | Scenario fails because executed-match count is zero |
| Remove the final quarantine item in a temporary catalog | Both duplicated validators reject a healthier zero-debt state | Catalog remains valid with nonempty maintained and empty quarantined |
| Change one target-owned model while preserving config shape | Exact source test fails | Generic source contract passes; target-owned validation covers model choice |
| Add one valid diagnostic reason | Exact-array cases may fail | Required blocker subset remains green; unexpected safety outcome still fails |
| Add an extra Notion write outside the approved operation set | Must fail | Must continue to fail; do not loosen this while parameterizing metadata |

## Disposition summary

- Primary is substantially correct on brittle prose, fixed counts/models, obsolete Scenarios, legacy authority tests, and the Python runner's central `scenario_specific()` design.
- Required revisions: correct `s71` from false failure to false green; remove rather than promote duplicate `s67`; retain exact remote-write boundaries and public diagnostic codes; distinguish closed schema from accidental data hardcoding.
- Required missing work: audit and repair `tests/run_core_tests.mjs` together with `tests/run_regression.py`, preferably via one shared catalog/discovery authority used by local and CI execution.

## Zero-omission self-check

- Assigned test paths recomputed: **18**; reviewed: **18**; omissions: **0**.
- Frozen shard-1 test rows: **18**; Primary paths missing/extraneous: **0/0**; Reviewer paths missing/extraneous: **0/0**.
- Primary test groups reviewed: **all rows**, including generated/table-driven/nested cases; no test group was accepted by filename alone.
- Assigned Scenario paths recomputed: **8**; reviewed: **8**; checklist/run/config surfaces inspected: **8/8**.
- Frozen shard-1 Scenario rows: **8**; Primary paths missing/extraneous: **0/0**; Reviewer paths missing/extraneous: **0/0**.
- Shared requested surfaces: catalog, Python Scenario runner, and package/CI core runner reviewed.
- Writes made by reviewer: this report only; no product, test, fixture, catalog or runner edits.
