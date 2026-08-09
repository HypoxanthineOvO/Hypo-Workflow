# Independent Review 09

## Scope and independent method

- Shard rule independently recomputed from normalized sorted paths: zero-based index `% 10 == 9`.
- Reviewed **17/17 executable-test files**, **87/87 primary case groups** (including every named nested/parameterized variant), and **7/7 Scenario paths**.
- Sources checked independently: test bodies, directly consumed fixtures/docs, `tests/regression-catalog.json`, Scenario `run.sh`/checklists, and current ten-route surface in `core/test/c21-m8-surface-cleanup.test.js`.
- Status meanings: `agree` accepts the primary contract/risk/verdict; `revise` changes the verdict or material rationale; `missing` records an issue the primary did not fully state.
- This review does not treat green execution as proof of value. It asks whether each failure corresponds to a real contract break and whether a valid product change causes only a proportionate failure.

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

## Per-case cross-review

| File | Item | Review | Independent conclusion and evidence |
| --- | --- | --- | --- |
| `audit-governance-contract` | reject before completion | agree | The `240`-character prose-distance regex can fail on harmless reorganization. Replace it with structured governance authority; prose presence may remain a non-authoritative lint. |
|  | rejection scopes | agree | Milestone/Feature/Cycle are policy values, but ordered proximity in concatenated Markdown is not the contract. |
|  | blocked governance authorities | agree | The two prose regexes test wording/layout, not an authoritative transition table. |
| `c21-m8-surface-cleanup` | discovery equals Registry | agree | The local `PUBLIC_ROUTES` list and “exactly ten” duplicate a release snapshot. Equality to one authoritative route registry is valuable; the duplicated list/count is not. |
|  | hidden/deferred/removed routes and contextual start | agree | Zero-write/non-advertisement is a valid invariant; the long retired/deferred taxonomy is historical data and causes broad churn. |
|  | legacy generators cannot revive surfaces | agree | Optional `return` when an export disappears creates silent coverage loss. A declared tombstone source is required. |
|  | read-only sync zero-write | agree | Tree equality is behavioral and fixture values are input-derived. |
|  | deletion drift/protection/reuse | **revise** | Keep the five behavioral subtests. They are already distinct `t.test` nodes (`path-hash-drift`, Git drift, manifest substitution, protected path, replay), so no structural split is needed; only preserve their independent reporting. |
|  | docs/replacement architecture | **revise** | Primary's hardcode diagnosis is right, but much of the case is already nested. Revise assertions to consume authoritative routes and narrow semantic lint; do not mechanically split already independent subtests. |
| `chat-hooks` | SessionStart restores chat | **revise** | Catalog already quarantines this file as legacy Chat authority. Do not “reclassify” it again: keep quarantined only with an explicit compatibility/removal date, otherwise archive/remove. Exact recovery copy is not worth preserving. |
|  | Stop blocks incomplete chat | **revise** | Structured block behavior would be meaningful only if legacy Chat remains supported. In the current catalog it is retired, so first decide retention; do not invest in new reason codes for an intentionally removed surface. |
| `claude-smoke-readiness` | manual checklist | agree | Model/profile names and exact phrases are release-era documentation data; one wording change currently causes unrelated readiness failure. |
|  | deterministic fixture | agree | The wrapper combines sync, backup, hooks, permissions, status, and routing. A model change should not invalidate hook/permission evidence. |
| `concurrent-work-host-integration` | unbound/selected behavior and status | agree | Selection and nonblocking behavior are real contracts; Chinese copy and literal `16_384` should come from structured output/host limits rather than prose assertions. |
|  | expired-only Placement | agree | Clock/TTL are controlled inputs and failure is local to expiry semantics. |
|  | auxiliary Hook fail-open | agree | `{}`/nonblocking behavior is authoritative; exact Chinese warning copy is not. |
| `deep-plan-handoff` | ordered queue conversion | agree | IDs and evidence references are fixture inputs; assertions protect ordering and attachment behavior. |
|  | global artifact inheritance | agree | Input-derived structured behavior with proportionate failure. |
|  | directional items parked | agree | Parking is a stable behavior; `reason` prose should become a code or be non-authoritative. |
|  | missing target-depth artifacts | agree | Blocking is correct, while matching English artifact phrases is brittle; assert gap kinds/codes. |
|  | pseudo-test rejection | agree | Both assertions depend on English/Chinese wording. Preserve a structured policy/rule ID instead. |
| `domain-pack` | RTL spec/manifest/checklist | agree | M07-M09, exact headings, and a frozen language list are historical/content snapshots mixed with legitimate metadata-only safety. |
|  | manifest validation | agree | Invalid ID/version/probe mode should fail; literal error sentences should not be the API. |
|  | project-local override | agree | Fixture-derived override behavior is valid. |
|  | external refs unsupported | agree | Structured unsupported/confirmation flags are contracts; human reason copy is not. |
|  | unsupported checklist evidence | agree | Rendering is overbound to headings and phrases; test a structured render model plus minimal readable output. |
|  | RTL selection/non-RTL quietness | agree | Selector behavior is useful; exact rendered heading should be separated from it. |
| `fixtures/.../brownfield/test/server` | Express app export | **revise** | It **must remain in the audit inventory** because METHODOLOGY includes every nested `*.test.*`. Classify it as `fixture-owned executable support`, not a Hypo-Workflow product contract. Exclude it from the product regression gate unless a fixture manifest explicitly runs it; do not exclude it from inventory/coverage accounting. |
| `init-bootstrap` | Init API exports | agree | Public API export is an intentional compatibility contract. |
|  | empty repo Init | agree | Required structure is valid; exact key equality can reject harmless additive fields and should become required-subset checks unless schema is closed. |
|  | brownfield adoption | agree | Source preservation/provenance matter; a blacklist of unrelated technology names is only an accidental sample oracle. |
|  | unsafe brownfield metadata | agree | Three variants are adversarial inputs and zero-write/sanitization failures are appropriate. |
|  | unknown Init keys | agree | Closed request schema and secret-safe errors are deliberate contracts. |
|  | legal security/reasoning docs | agree | This is a useful false-positive/bounded-scan boundary test; fixture basenames are not universal project facts. |
|  | no-input Ask | agree | Ask shape/no-write is stable; natural-language prompt regex is not. |
|  | repeated/damaged/mixed | agree | Three distinct compatibility branches should report separately; current bundling raises failure blast radius. |
|  | traversal/secret/reasoning validation | agree | Adversarial values are fixture inputs; security regression should fail. |
|  | symlink escape | agree | `.pipeline` containment is a real security boundary and snapshots verify zero-write. |
|  | interrupted transaction | agree | Fault phase/transaction recovery is protocol behavior; failure is proportionate. |
|  | isolated Init scope | agree | Forbidden global/adapter/legacy writes are explicit ownership boundaries. |
| `lifecycle-regression` | stale lease takeover | **revise** | Behavior is sound, but the entire file is already quarantined as legacy lifecycle. Keep only in a named legacy-compat lane with owner/removal criteria; it is not a current maintained contract. |
|  | compact authority | agree | Explicit legacy-compat only; `state.yaml` must not regain current authority. |
|  | stricter handoff | **revise** | Least-privilege merging is valuable but currently housed in a quarantined legacy file. Move the invariant to a current host-contract test before deleting this file. |
|  | reject/accept continuation | agree | Legacy branches are bundled and should remain quarantined or be replaced by current Delivery lifecycle tests. |
|  | derived repair | agree | Legacy-derived compatibility only, with removal criteria. |
|  | workflow kind resolution | **revise** | Pure policy behavior may still be current, but catalog quarantines the whole file. Move it to a maintained current-policy test if still authoritative; a per-case `keep` inside this file is insufficient. |
| `model-pool-actions` | role edit/backup | agree | Backup existence/content is contractual; timestamp filename formatting is not. |
|  | project actions | agree | One case spans discovery, registry projection, sync, legacy compact fields, and TUI actions, creating excess blast radius. |
|  | project override | **revise** | The behavior is well-formed but belongs to a deferred non-Codex adapter lane per catalog. `keep` means keep quarantined, not promote to maintained. |
| `patch-acceptance` | acceptance | **revise** | Catalog already quarantines Patch as removed. Archive/remove after replacement evidence; do not call for another reclassification. |
|  | rejection/escalation | **revise** | Filename/timestamp/threshold coupling is real, but rewriting is wasted unless Patch compatibility is explicitly retained. Current default should be archive/remove. |
|  | skill/docs roundtrip | agree | Requires a removed public Skill and legacy authority fence; remove from executable current inventory after archival accounting. |
| `progress-table` | parse tables | **revise** | Assertions are input-derived and behaviorally sound, but the file is already quarantined as a legacy projection parser. Keep only as an explicit migration reader with removal criteria; do not imply current authority. |
|  | redact secrets | **revise** | Security behavior is valuable. Move it to the current projection/parser boundary if that parser remains reachable; otherwise archived legacy code should not keep executable security theater. |
| `receipt-store` | public API | agree | Explicit public lifecycle surface. |
|  | issued persistence | agree | IDs/times are inputs and persistence fields are protocol; additive fields are not rejected by this case. |
|  | canonical scope hash | agree | Strong invariance and meaningful drift sensitivity. |
|  | own-property mappings | agree | Adversarial corpus probes canonicalization and prototype integrity. |
|  | host clock/no overrides | agree | Per-call clock injection is a security/authorization boundary; nested operations are independently visible. |
|  | single-use lifecycle | agree | Failure accurately signals owner/replay/state breakage. |
|  | concurrent reservation | agree | Exactly-one-winner is a direct race-condition contract. |
|  | drift invalidation | agree | Seven binding dimensions are threat fixtures and independently reported subtests. |
|  | terminal/malformed states | agree | State behavior is correct; error prose should be replaced by stable codes or predicates. |
|  | bare confirmation/secrets | agree | Authorization and non-leakage are stable security contracts. |
|  | transaction recovery | agree | Recovery seam and zero-Receipt rollback are behavioral. |
| `root-management-dry-run` | end-to-end bundle | **revise** | The file is already quarantined as unaccepted/superseded global management. It hardcodes `hypo-workflow`, `hypo-info`, global IDs, and section snapshots. Default disposition should be archive/remove, not rewrite, unless this feature is deliberately revived. |
|  | stable content hash | **revise** | The invariance test is technically good, but it protects a quarantined abandoned bundle. Retain only if the bundle remains a supported import format. |
|  | candidate classification | **revise** | Exact review keys and reference IDs are brittle; do not parameterize an obsolete feature by default. Archive/remove with the feature. |
|  | secret-safe serialization | **revise** | Non-leakage is valuable, but move equivalent coverage to current Records/Maintain paths rather than preserving `notion-main` bundle semantics. |
|  | raw block/action normalization | **revise** | Behavioral within this feature, but catalog says the feature is superseded. Replacement coverage must carry no-raw/no-write invariants. |
|  | no external writes | **revise** | Preserve this invariant in current Maintain/connector tests; do not keep an obsolete bundle solely to test it. |
|  | Chinese report content | agree | Exact `C16-M8` title and phrase inventory are unequivocal historical/prose hardcodes. Remove with the retired report or derive identity if feature revival is approved. |
| `showcase-report-refresh` | packaging | **revise** | Catalog already marks Showcase removed. Archive/remove rather than “reclassify”; private SSH URL and C2 layout are not current release contracts. |
|  | report narrative | agree | Named anecdotes and exact prose are editorial, not software regression evidence. |
|  | slide visual system | agree | Branding/model/narrative phrases are point-in-time content. |
| `vspi-workstream-contract` | Core API exports | agree | Current public surface; breaking rename should fail. |
|  | concurrent Deliveries | agree | IDs are fixture inputs and pointer independence is behavioral. |
|  | explicit resume | agree | Pointer independence is the contract; unconditional `recovery.degraded === true` freezes current fixture quality and should be conditional or removed. |
|  | Workstream isolation | agree | Structured isolation/no-secret assertions are proportionate. |
|  | stale generation/scope | agree | Conflict, zero-write, and claim release are current concurrency contracts. |
|  | cross-base overlap | agree | Different SHA inputs correctly probe scope ownership independent of Git base. |
|  | parallel ready claims | agree | Fixture DAG IDs are input-derived; scheduling failure is meaningful. |
|  | later ready verification | agree | Direct dependency-state contract. |
|  | concurrent verification | agree | Strong lost-update probe with localized failure. |
|  | stale Plan binding | agree | Revision binding and zero-write rejection are authoritative. |
|  | VSPi ownership/routing | agree | Exact enums/arrays are acceptable only as a versioned closed integration schema; document that compatibility boundary. |
|  | retrieval experiment | agree | Explicit experimental schema can intentionally break when graduated; that transition must be deliberate. |

## Scenario cross-review

| Scenario | Review | Independent conclusion and evidence |
| --- | --- | --- |
| `v0/s01-fresh-start` | agree | Quarantined legacy checklist with no runner; checked boxes/date/diff score cannot detect current Init regressions. Archive/remove from executable inventory, retaining provenance if desired. |
| `v11/s64-audit-governance-contract` | agree | Runner only delegates to the brittle prose-regex unit test. It adds no independent evidence and is already quarantined. |
| `v4/s15-architecture-drift` | agree | Manual legacy state/config fixture has no executable oracle; thresholds and prompts are frozen historical content. |
| `v6/s25-debug-flow` | agree | Shell prose checks for retired `/hw:debug`; docs edits fail without proving behavior. |
| `v8.1/s35-import-history-interactive` | **revise** | The old Scenario should remain quarantined/archive, not be rewritten in place. Add a **new current History Refresh Scenario/test** with arbitrary project identity, non-C022 Cycle IDs/counts, reviewed-mapping binding, root legacy C7 preservation, idempotence, and zero-write-before-approval. |
| `v8.3/s45-showcase-docs` | agree | Retired editorial surface; grep assertions have no current software-contract value. |
| `v9/s55-opencode-command-map` | agree | Confirmed contradiction: checklist requires **36**, runner requires **53**, while current public surface enumerates **10** routes (`guide/init/goal/plan/cycle/experiment/maintain/resume/accept/reject`). Runner also asserts retired agents, commands, `state.yaml`, and `rules.yaml`. Remove/archive; never execute in maintained or “all tests” CI. |

## Material disputes and missing findings

### High

1. **Inventory and gate are different sets.** Primary's proposed exclusion of `core/test/fixtures/**` from “global executable inventory” contradicts METHODOLOGY. Every nested executable test must remain inventoried and audited. The product gate may exclude fixture-owned tests through explicit classification, never by making them invisible.
2. **Catalog state must constrain verdicts.** Eleven shard files and all seven Scenarios are already quarantined. `reclassify`, `keep`, or `rewrite` without saying “quarantined versus maintained” can accidentally revive retired authority. Every retained legacy item needs an owner, reason, replacement mapping, and removal criterion.
3. **Root-management is not just a parameterization problem.** It embeds `/home/heyx`, `hypo-workflow`, `hypo-info`, `notion-main`, `C16-M8`, legacy paths, and fixed candidate IDs, but the catalog also says the entire feature is unaccepted/superseded. Default remediation is removal/archive plus migration of still-valid no-secret/no-write invariants to current Records/Maintain tests.
4. **`s55` has three incompatible sources of truth.** `36` in checklist, `53` in runner, and the current ten-route surface cannot all be contracts. This is direct evidence that historical scenarios must not be recursively executed by an “all tests” CI job.

### Medium

1. **Primary overuses `split` where nested tests already exist.** The deletion executor's five failure modes and parts of the docs case already use `t.test`; assertion redesign, not another wrapper split, is the needed change.
2. **Replacement links are not equivalence proofs.** `s77-codex-hook-process` intentionally represents the current Official Codex boundary, not semantic equivalence to the old 53-command OpenCode adapter. The catalog should say the old contract was retired, rather than imply behavioral replacement.
3. **Prose regex debt crosses maintained and quarantined lanes.** At least governance, hooks, Deep Plan, Domain Pack, Init errors, Receipt errors, root reports, Claude docs, and Showcase bind to human wording. For maintained behavior use codes/structured fields; for retired behavior remove the executable assertion rather than manufacture new schemas solely for tests.

### Low

1. Public schema arrays and protocol literals are legitimate only when their closed/versioned compatibility policy is explicit; otherwise additive evolution creates false failures.
2. Fixed IDs, clocks, paths, and secrets are acceptable adversarial/fixture inputs when expectations derive from them. The defect begins when the same values are asserted as universal product output.

## Probe review

| Probe | Review | Expected diagnostic value |
| --- | --- | --- |
| route evolution | agree | Demonstrates whether one added authoritative route causes only projection failures rather than historical-route cascades. |
| docs wording mutation | agree | High value for maintained prose-regex tests; replacements should stay green under semantic rephrasing. |
| reference identity | agree | Use arbitrary project/root/Cycle labels and counts. For root-management, run only if feature retention is approved; History Refresh needs this probe now. |
| Claude model change | agree | Should affect derived routing expectations only, not hooks/permissions/global-write safety. |
| fixture inventory | **revise** | Do not expect inventory count to drop. Assert the fixture test remains inventoried as `fixture-owned` while maintained product execution excludes it; separately prove Init still consumes the fixture. |
| error-copy mutation | agree | Maintained behavior should remain green when only human error wording changes. |
| Scenario gate | agree | Catalog/runner must reject quarantined entries in maintained selection; “all inventory” should inspect/classify, not recursively execute them. |

## Catalog, CI, and fixture requirements

- Maintain three mechanically distinct notions: `inventory` (everything auditable), `maintained executable gate`, and `quarantined/archive evidence`. Never use a recursive `node --test core/test` or recursive Scenario runner as the release gate without classification filtering.
- Add an inventory validator that fails when a discovered test/Scenario has no catalog classification, primary audit ID, reviewer audit ID, or final disposition. A fixture-owned executable test is a valid classification.
- Make CI prove both directions: every maintained catalog path exists and runs; every discovered executable path is classified. Quarantined paths must not run in maintained CI.
- For legacy compatibility tests, require `compatibility_contract`, `owner`, `replacement_or_retirement`, and `remove_when`. A broad replacement list alone is not proof of equivalent coverage.
- Current route projections must consume one authoritative route registry/manifest. Tests may assert baseline safety commands exist, but must not duplicate the entire ten-route snapshot or textual count.
- History Refresh needs non-reference inputs and root-legacy preservation tests, but those examples remain fixture data. Expectations must be derived from their inputs rather than asserting C022, `hypo-workflow`, 20, C7, or any other chosen sample universally.

## Zero-omission self-check

- Frozen-inventory binding: mechanically compared against `audits/INVENTORY.md` at frozen commit `cd829923957ba09d5d0f1d0aa7ec9b5eecab9d93`.
- Frozen shard-9 test paths: **17 expected, 17 reviewed, 0 missing, 0 extraneous**.
- Frozen shard-9 Scenario paths: **7 expected, 7 reviewed, 0 missing, 0 extraneous**.
- Independently enumerated executable tests: **179 files**; shard indices `9, 19, ..., 169` yield **17/17 reviewed**.
- Independently enumerated catalog Scenarios: **76 paths**; shard indices `9, 19, ..., 69` yield **7/7 reviewed**.
- Cross-reviewed primary case groups: **87/87** (`3+6+2+2+3+5+6+1+12+6+3+3+2+11+7+3+12`).
- Nested/parameterized variants checked: five legacy generators, five deletion modes, dynamic docs subtests, Init `3+2+3` adversarial variants, Receipt host clock plus three operations, six own-property keys, seven drift dimensions, and VSPi concurrency branches.
- No product, test, fixture, catalog, runner, or Scenario file was changed. This reviewer report is the only write.
