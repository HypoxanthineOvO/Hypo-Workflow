# C21-M8 Post-M7 Dependency And Classification Scan

## Conclusion

M8 is not a simple "delete old Skills" change. The live tree still has three independent revival paths:

1. `.codex-plugin/plugin.json` points Codex at the whole `skills/` tree, so the host physically discovers 46 Child Skills even though the Registry exposes nine routes.
2. `core/src/commands/index.js` still carries the 54-entry compatibility inventory used by Claude/OpenCode/Cursor generators.
3. `runProjectSync` plus four public generator functions can recreate command wrappers, agents, Rules/Habits, TUI/status, and legacy authority files in a legacy workspace.

The cleanup therefore has to change source routing and writer reachability before deleting derived files. Deleting generated artifacts first would be temporary: the next generator run would recreate them.

This scan proposes 497 current files for later exact deletion across selected files and generated trees. That number is inventory evidence, not authorization. It includes 37 non-public Child Skills, 270 checked-in Claude/OpenCode/Cursor command and adapter files, retired Rules/CLI/Core/automation source, and obsolete tests/fixtures/scenarios. A fresh post-implementation Manifest must enumerate and hash every actual file again.

No repository deletion was performed. No Receipt was issued. This report and its JSON companion are not the exact Deletion Manifest.

## Inventory Correction

The correct live Skill count is **46**, not the earlier intermediate count of 45:

| Class | Count | Meaning |
|---|---:|---|
| Public/contextual | 9 | Physical Codex Child Skills that remain |
| Internal | 19 | Natural behavior; current Child Skill files must leave discovery |
| Deferred | 8 | Useful later; hidden and zero-write now |
| Removed | 10 | Permanently retired product surfaces |
| **Total** | **46** | Current `skills/*/SKILL.md` inventory |

The nine retained physical backends are `guide`, `init`, `goal`, `plan`, `cycle`, `maintain`, `resume`, `accept`, and `reject`.

The 19 internal capabilities are Chat, Explain, Status, Report, Log, Check, Compact, Knowledge, Sync, Debug, explicit Start, and eight Plan phases. The eight deferred capabilities are Analysis, Audit, Quality, Docs, PR, Release, Explore, and Optimize. The ten removed capabilities are Setup, Rules, Stop command, Skip, Reset, Showcase, Patch, Help, Watchdog, and plan-confirm.

## Live Dependency Graph

```text
core/src/commands/index.js (54 compatibility rows)
  |-- Root/Guide route and command tests
  |-- core/src/artifacts/claude.js ------> commands/ + .claude-plugin/ + .claude/ + monitors/
  |-- core/src/artifacts/opencode.js ----> .opencode/ + opencode.json
  `-- core/src/artifacts/third-party.js -> .cursor/ + Copilot + Trae

.codex-plugin/plugin.json (skills = ./skills/)
  `-- filesystem discovery -------------> all 46 Child Skills

CLI/core/bin/sync public entrypoints
  `-- call generators + Rules/TUI/legacy writers

Current C21 authority
  manifest -> Runtime/Continuation -> Records/Receipts -> Journal/Capsule/Pack
  `-- only nine public routes and Official Codex hooks should project this authority
```

The Registry's `discoverableCommandMap("codex")` is already nine-route correct. The defect is physical discovery and writer reachability, not the nine-route filter itself.

## Classification

### Delete

The following are permanently removed or current false-support artifacts:

- Ten removed command capabilities and their Skill/source/test/doc surfaces.
- Generic Rules tree and `core/src/rules` implementation.
- Patch, Watchdog/lease, and global TUI implementations.
- The install/setup CLI and `core/bin/hw-core` helper CLI.
- Unaccepted C16 generic automation/root-management implementation, JSONL ledger, Notion/storage adapters, scheduler and notification scripts. C16 archives remain evidence.
- Checked-in Claude, OpenCode, Cursor, Copilot, and Trae generated artifacts. Their generator source is classified separately as deferred.
- Obsolete tests and scenarios only after their current behavior replacement is present.

The exact selected paths, directory inventories, counts, scan hashes, dependencies, risks, and verification requirements are in `classification-proposal.json`.

### Retain Internal

- Chat/Explain/Debug become ordinary Agent behavior, not mode commands.
- Status/Report/Log/Check/Compact/Knowledge/Sync become natural read/consistency behavior over Manifest, Runtime, Records, Journal, Capsule, and Pack.
- Explicit Start remains contextual and non-discoverable; it requires a waiting Delivery and a scoped Receipt.
- Deep Plan and the seven other Plan phases stay inside `/hw:plan` rather than as physical Child Skills.
- Legacy Knowledge compatibility needed by accepted M5 evidence remains fenced: current manifest workspaces reject writes, while fixed legacy fixtures remain inspectable. It does not regain public discovery or current authority.
- Metadata-only secret reference projection remains useful; raw secret values do not become Workflow authority.

The current 19 internal `skills/*/SKILL.md` files still have to be physically removed from the plugin discovery tree. Their semantics move into Root/Plan guidance or retained Core/reference helpers before deletion.

### Deferred Hidden

- Analysis, Audit, Quality, Docs, PR, Release, Explore, and Optimize keep their distinct future contracts and Records, but explicit command diagnostics remain zero-write and their Child Skills leave discovery.
- OpenCode, Claude Code, Cursor, Copilot, Trae, and other adapter source may remain for later Cycles only if current public exports/writers cannot mutate or regenerate artifacts.
- Aggregate telemetry and command analytics remain deferred; pure metric helpers may stay isolated without collection, scheduling, or authority claims.

Deferred does not mean "currently supported." Current README/docs/package surfaces must say Codex is current and the other adapters are later work.

## Cleanup Batches

### Batch 1: Cut Revival At The Source

Modify before any deletion:

- `core/src/commands/index.js`: split nine route definitions from compatibility diagnostics; generator consumers must not see internal/deferred/removed entries.
- `core/src/index.js`: stop exporting retired writers and current public platform-generation entrypoints.
- `core/src/artifacts/claude.js`, `core/src/artifacts/opencode.js`, `core/src/artifacts/third-party.js`: in C21, fail before mutation or become unreachable; do not generate a reduced-but-still-current adapter package.
- `core/src/sync/index.js`: preserve `checkOnly` as read-only; standard platform sync must not write.
- `core/src/workspace-format/index.js`: update the legacy writer inventory only after source ownership changes, without weakening current-manifest fail-closed behavior.
- `core/src/skills/index.js`: validate Root plus the exact nine physical Child Skills; remove the Watchdog exception and old count assumptions.

The M8 RED test names five writer paths explicitly: `runProjectSync` standard mode, `writeOpenCodeArtifacts`, `writeClaudeCodePluginArtifacts`, `writeThirdPartyAdapterArtifacts(platform=cursor)`, and `writeCursorSkillBundle`. Each must be removed from the current public path, unreachable, or reject before its first mutation. `runProjectSync(checkOnly=true)` is already zero-write and should remain so.

### Batch 2: Consolidate Internal Semantics And Current Docs

Modify Root/public Skills and current Codex docs before removing their referenced children:

- `SKILL.md`, `skills/plan/SKILL.md`, `skills/init/SKILL.md`, and `skills/maintain/SKILL.md`.
- `README.md`, `README.en.md`, `PROJECT-SUMMARY.md`, current command references, user guides, Codex guides, generated-artifact docs, and platform matrices.
- `references/commands-spec.md`, `references/skill-spec.md`, `references/platform-codex.md`, `references/platform-capabilities.md`, and `references/state-contract.md`.
- `.agents/plugins/marketplace.json` must be updated from stale `12.3.0`; `.codex-plugin/plugin.json` remains the current package manifest.
- `AGENTS.md` must keep consultation-first, substantive completion reports, `.pipeline` awareness, and worker separation while dropping generic Rules and legacy state-as-current claims.

Root links must resolve to exactly the nine public Child Skills. M7 Hook facts must replace the stale "Hooks later/limited/notify-only" story.

### Batch 3: Fresh Exact Deletion Gate

After Batches 1-2, build a fresh file-by-file Deletion Manifest. Display its full paths, hashes, Git binding, replacements, and risks in chat. Only a dedicated `deletion.execute` Receipt authorizes execution. Any implementation drift invalidates that Receipt.

Source deletion order inside the authorized batch:

1. Registry/generator/CLI writer sources and imports.
2. Retired Core/Rules/automation source.
3. Non-public Child Skills and source specs.
4. Checked-in generated platform trees and wrappers.
5. Obsolete tests/fixtures/scenarios after replacement contracts exist.

### Batch 4: Regression And Independent Audit

Regenerate only the current Codex package, then prove that no removed/deferred surface reappears. Run M8 behavior tests, full maintained Core tests, current scenarios, plugin validation, Skill quality, syntax/JSON checks, and `git diff --check`. A fresh audit compares the authorized Manifest/Receipt against the actual diff.

## Physical Delete Inventory

The proposal groups exact repo-relative candidates as follows:

| Cluster | Files | Scan evidence |
|---|---:|---|
| Non-public Child Skills | 37 | `519a04...90024` |
| Generic Rules tree | 25 | `2e4f39...7d4a` |
| CLI + core helper CLI | 5 | CLI tree plus `core/bin/hw-core` |
| Rules/Patch/TUI/Lease Core | 4 | `7fb972...267ee` |
| C16 generic automation Core | 17 | `f4e751...d9c49` |
| Retired scripts + storage adapters | 12 | two bounded inventory hashes |
| Claude generated wrappers/package | 65 | 53 commands + plugin/agents/monitor |
| OpenCode tracked generated surface | 72 | `3a7533...3118` |
| Cursor/Copilot/Trae/root OpenCode | 138 | 135 Cursor + 3 files |
| Obsolete specs | 2 | Rules and consolidation specs |
| Obsolete unit tests + fixtures | 47 | 34 tests + 13 fixtures |
| Obsolete scenario directories | 73 files | 24 directories, `84955a...43f1` |
| **Provisional total** | **497** | Scan-only, must be recomputed |

For mixed directories, the exact selected paths are recorded in the JSON proposal. In particular, the OpenCode candidate includes only tracked generated files; untracked `.opencode/node_modules` and `.opencode/package-lock.json` are excluded. The Claude candidate excludes all `.claude/settings.local.json*` user files.

## Test Retirement And Replacement

The independent M8 TEST suite confirms the current tree is correctly RED: `32 tests / 9 pass / 23 fail`, with 21 leaf behavior failures. The passing cases already prove internal/deferred/removed diagnostics are zero-write, explicit Start is contextual, check-only sync is read-only, and all five deletion-drift/reuse attacks are blocked.

Mandatory replacement queue:

- `core/test/skill-spec.test.js`: replace 53/54 and "all compatibility Skills physical" assertions with actual nine-Skill plugin discovery.
- `core/test/skill-quality.test.js`: replace `>=35` and Watchdog exception with Root plus nine-Skill quality.
- `core/test/commands-rules-artifacts.test.js`: retire 54-command/Rules generation expectations; preserve reusable routing behavior separately.
- `core/test/knowledge-ledger.test.js`: retain only read-only legacy/migration protection required by M5; remove public Ledger/54-command expectations.
- `core/test/docs-governance.test.js`, `core/test/readme-update.test.js`, and `core/test/codex-subagent-discipline.test.js`: move to nine routes and current authority/Hook facts.
- `core/test/command-exposure.test.js`, `core/test/root-skill-router.test.js`, and `core/test/command-skill-root-routing.test.js`: retain trust, symlink, root-separation, and zero-write behavior; update only stale inventory fixtures.
- Claude/deep-plan/sync adapter tests are not evidence of current support. Defer them to adapter Cycles or rewrite them as zero-write/unreachable contracts.

Removing a failing test without one of these replacements is not acceptable M8 evidence.

## Protected And Excluded

Never include in the M8 deletion proposal:

- New C21 Manifest, Runtime, Records, Receipts, Journal, Capsule, Pack, or Snapshot authority.
- M1-M7 prompts, reports, reviews, tests, fixtures, and evidence.
- M5 Bootstrap acceptance/activation/migration tests, compatibility fixtures, legacy-freeze baselines, and `knowledge-opencode-gate.test.js`.
- Frozen legacy `.pipeline/state.yaml`, `cycle.yaml`, `log.yaml`, `PROGRESS.md`, or protected `.pipeline/rules.yaml`.
- Historical release notes and `docs/showcase/**`; they may truthfully describe old releases.
- `/home/heyx/Codex-VSP/**` and any target-owned VSP prompts/configuration.
- User/untracked `.claude/settings.local.json*`, `.opencode/node_modules`, `.opencode/package-lock.json`, `redskill-package/**`, `tests/results/**`, caches, and root `node_modules/**`.

`redskill-package/**` contains stale 53-command/multi-platform claims, but it is an untracked user/distribution artifact. This scan reports it as residual drift and does not claim authorization to alter it.

## Blockers And Residuals

No blocker prevents M8 implementation from starting with the existing RED tests. The hard blocker is only deletion execution: it requires the later exact Manifest plus a dedicated user Receipt.

Residuals to carry into implementation/audit:

- The proposed deletion of the unaccepted C16 automation cluster is high confidence but broad; confirm the final source list after imports are rewritten and before Manifest presentation.
- Legacy compatibility modules remain numerous. M8 only needs them hidden/fenced unless classified as permanently removed; do not expand cleanup into an ungated architecture rewrite.
- The six Skill eval cases are drafted but not run or scored. No quality-improvement claim exists until baseline/candidate evaluation is executed.
- A compatible current Official Codex installed-host Hook smoke remains unavailable; keep it `SKIP`, never `PASS`.
- Untracked platform/cache/distribution residue is excluded from the source-owned Manifest unless separately reviewed and authorized.

## Verification Boundary

Current M8 evidence:

- M8 RED suite: `32 total / 9 pass / 23 fail` (expected).
- Existing trust/deletion/Hook baseline: `39/39 pass`.
- Plugin manifest validator: pass, but this validates shape, not discovery cardinality.
- M7 full Core baseline: `1088/1088 pass`.
- Actual current discovery: `46` physical Child Skills versus `9` allowed.

Expected post-cleanup result:

- Actual Codex discovery equals Registry projection and both contain exactly nine routes.
- Five legacy writer entrypoints cannot mutate/revive old surfaces; check-only remains read-only.
- Current docs explain Manifest, Records, Receipts, Recovery, and current Codex Hooks.
- Removed/deferred explicit commands remain non-executable and zero-write.
- Protected M1-M7/M5 evidence is byte-preserved.
- The actual deletion diff exactly matches the later authorized Manifest.

## Artifact

Machine-readable proposal: `.pipeline/reviews/C21/M8/classification-proposal.json`.

It contains the exact selected paths, classification authority, generators, dependents, writer targets, replacements, risks, reversibility, preconditions, verification, protected patterns, exclusions, and source-before-derived order. It deliberately has status `scan_only_not_authorized_not_a_deletion_manifest`.
