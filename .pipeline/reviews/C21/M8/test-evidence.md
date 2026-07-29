# C21-M8 TEST Evidence

## Conclusion

M8 的独立 TEST 合同已经建立，当前结果为预期 RED。新测试从 Codex Plugin 的实际 `skills` 发现目录、Core Registry 投影、临时 legacy 工作区中的生成器行为、临时 Git 仓库中的 exact Deletion Manifest/Receipt，以及当前 Codex 文档结构出发，而不是只检查命令数量常量。

当前遗留树有三个明确阻断面：

1. `.codex-plugin/plugin.json` 指向整个 `skills/`，因此实际发现 `46` 个 Child Skills，而不是确认的 `9` 个；Registry 的九路由投影本身已经正确。
2. `runProjectSync` 和四个公开 legacy generator 仍会在临时 legacy 工作区重建 OpenCode/Claude/Cursor command、agent、TUI/status、Rules/Habits 等旧表面。
3. Root Skill、README、Commands Reference 和 Codex Guides 仍引用 internal/deferred/removed Child Skills、53 命令、六平台、generic Rules authority、legacy authority files，且 Codex Guide 仍把 Hooks 写成 `limited`。

Deletion gate 的 M8 攻击矩阵全部通过：路径内容 hash drift、Git baseline drift、额外路径 Manifest 替换、protected Recovery 路径和 Receipt reuse 都不能越过 exact authorization。没有删除本仓库文件；唯一成功删除发生在 disposable `/tmp` Git fixture 中，用于证明 single-use Receipt，随后同字节重建目标并验证 Receipt reuse 被拒绝。

## Test Design

### 1. Actual Codex discovery

测试读取真实 `.codex-plugin/plugin.json`，按其 `skills` 字段递归发现 ordinary non-symlink `SKILL.md`，解析 frontmatter，再与 `discoverableCommandMap("codex", { skillRoot })` 的 Registry 投影比较。

期望的唯一物理后端是：

```text
skills/guide/SKILL.md
skills/init/SKILL.md
skills/goal/SKILL.md
skills/plan/SKILL.md
skills/cycle/SKILL.md
skills/maintain/SKILL.md
skills/resume/SKILL.md
skills/accept/SKILL.md
skills/reject/SKILL.md
```

当前多出 `37` 个物理 Skill：

- internal `19`: chat, explain, status, report, log, check, compact, knowledge, sync, debug, start，以及 8 个 Plan phase Skills。
- deferred `8`: analysis, audit, quality, docs, pr, release, explore, optimize。
- removed `10`: setup, rules, stop, skip, reset, showcase, patch, help, watchdog, plan-confirm。

### 2. Internal/deferred/removed routing

所有 internal、deferred、removed 显式命令在临时目标工作区运行 Router diagnostics：

- 不得进入 Codex discovery；
- 不得返回 executable/available public route；
- 返回 `internal|deferred|removed|unknown` 的兼容诊断；
- `writes` 为空且目标工作区 tree hash 不变。

显式 start 另行验证：只有 active Delivery 为 `waiting_to_start` 时，natural intent 才返回 internal `delivery.start`，并保持 `discoverable: false`。

### 3. Regeneration non-revival

每个 writer 使用独立 disposable legacy workspace，运行后比较完整 tree canonical hash。允许的 GREEN 形态是：入口从 public Core 移除，或在任何 mutation 前返回 retired/deferred/unsupported；不允许生成九命令之外的兼容 artifacts。

覆盖入口：

```text
runProjectSync(mode=standard, platform=opencode)
writeOpenCodeArtifacts
writeClaudeCodePluginArtifacts
writeThirdPartyAdapterArtifacts(platform=cursor)
writeCursorSkillBundle
```

`runProjectSync(checkOnly=true)` 单独证明保持 read-only，当前已 GREEN。

### 4. Deletion exactness

所有 executor 场景只使用 disposable current-format Git repos：

- Receipt 后改写目标内容，拒绝 hash drift；
- Receipt 后提交无关文件，拒绝 HEAD/tree baseline drift；
- 用仅授权单路径的 Receipt 替换为双路径 Manifest，拒绝 extra path；
- `.pipeline/runtime/recovery` 在 Manifest build 前 fail closed 且零写；
- exact Manifest 首次成功后重建相同目标，复用 consumed Receipt 仍拒绝且目标保留。

### 5. Codex-facing documentation

测试不是单纯 phrase count：

- Root Skill 的所有 Child Skill links 必须等于九个真实可发现后端；
- README 和 Commands Reference 的 Markdown command tables 必须结构化投影同一九路由集合；
- 非 Codex 平台行只有明确标为 deferred/planned/later 才能出现；
- README 必须介绍 `manifest.yaml`, Records, Receipts, Recovery 四个 replacement authority；
- Codex Guides 必须描述至少 `SessionStart`, `PreCompact`, `SubagentStart` 和 Receipt boundary；
- setup/dashboard/watchdog/generic Rules/53 commands/six-platform 不得以 current capability 形式出现，明确的 removed/deferred 历史说明允许保留。

### 6. Skill behavior eval draft

已起草六个未运行、未评分案例：Guide+Init brownfield onboarding、Goal、Cycle、Maintain、Resume、Reject。每个案例包含 disposable fixture contract、客观 authority/filesystem/conversation expectations 和 `human_review` 字段。Reject 明确使用两阶段 gate；Resume 明确用 stale Pack 与 conflicting frozen legacy sentinel 检查 Runtime/Continuation authority。

这些 eval 后续必须从同一 fixture 分别运行 post-M8 candidate 与 pre-M8 snapshot；本 TEST 角色没有运行、评分或生成 benchmark。

## Files Added

- `core/test/c21-m8-surface-cleanup.test.js`
- `.pipeline/reviews/C21/M8/skill-eval/evals.json`
- `.pipeline/reviews/C21/M8/skill-eval/assertion-metadata.json`
- `.pipeline/reviews/C21/M8/test-evidence.md`

没有修改 production、Skills、generator、docs、config、Plugin、Hook、Workflow authority 或现有 tests。

## Exact Results

### New M8 RED suite

Command:

```bash
node --test core/test/c21-m8-surface-cleanup.test.js
```

Result:

```text
32 tests
9 pass
23 fail
0 skip
exit 1 (expected RED)
```

`23` 包含 Node test runner 的 `2` 个 failed aggregate parents。Leaf failures 为 `21`：

- `1` actual Plugin discovery mismatch: `46 actual / 9 expected`。
- `5` regeneration writers mutate disposable workspaces。
- `15` Root/public docs failures：Root links `2` extra internal/deferred Skills；六份 current docs 的 legacy claims；四份 command tables 不等于九路由；中英文 README 把五个 deferred adapters 当 current；中英文 Codex Guide 缺少 current Hook/Receipt contract。

GREEN portions in the same suite:

- internal/deferred/removed Router diagnostics: zero-write PASS。
- explicit start contextual/internal boundary: PASS。
- `runProjectSync(checkOnly=true)`: zero-write PASS。
- deletion path hash drift: PASS。
- deletion Git baseline drift: PASS。
- deletion extra-path substitution: PASS。
- deletion protected Recovery path: PASS。
- deletion single-use Receipt: PASS。
- current Plugin metadata capability text: PASS。

### Existing focused baseline

Command:

```bash
node --test core/test/command-exposure.test.js core/test/root-skill-router.test.js core/test/command-skill-root-routing.test.js core/test/deletion-gate.test.js core/test/skill-spec.test.js core/test/codex-hooks-vnext.test.js core/test/codex-hook-process.test.js
```

Result:

```text
39 tests / 39 pass / 0 fail / 0 skip
exit 0
```

This establishes that M4-M7 Registry/Router trust checks, Hook process behavior, compact/Subagent behavior, and prior Deletion gate remain intact before cleanup. It also demonstrates why some legacy tests need retirement: `skill-spec.test.js` still passes by requiring the 54-entry/physical compatibility inventory.

### Static/Plugin validation

```text
M8 test JavaScript syntax: PASS
evals.json jq parse: PASS
assertion-metadata.json jq parse: PASS
Plugin validator: PASS
git diff --check for TEST-owned files: PASS
```

The Plugin validator PASS is not evidence of correct discovery cardinality; it validates manifest shape while the new filesystem behavior test exposes the 46-Skill leak.

## Expected GREEN

After authorized M8 implementation:

1. Actual Plugin discovery and Registry projection both return the exact nine routes.
2. Internal behavior remains natural/contextual with no advertised Child Skill; deferred and removed commands are diagnostic/zero-write only.
3. Legacy generator public entry points are removed or fail before writing, while maintained check-only behavior remains read-only.
4. Root Skill and current Codex docs explain the manifest/Records/Receipts/Recovery architecture and current Hooks without legacy product claims.
5. All five Deletion exactness cases remain GREEN unchanged.
6. Skill evals remain drafts until the separate IMPLEMENT/eval role captures the pre-M8 snapshot and runs candidate/baseline comparison.

## Existing Test Retirement / Behavior Replacement Queue

This is a review queue, not deletion authorization. The following assertions encode the old inventory and should be retired or rewritten only alongside replacement behavior evidence:

- `core/test/skill-spec.test.js`: requires 53-command prose, 54 Registry entries, and every compatibility Skill backend to remain physical. Replace with actual Plugin discovery and nine-route Registry agreement.
- `core/test/skill-quality.test.js`: requires at least 35 local/user-facing Skills. Replace with frontmatter quality over exactly the discoverable nine plus Root Skill.
- `core/test/commands-rules-artifacts.test.js`: requires 54 commands and Rules artifacts. Retire removed Rules/generator expectations; retain any reusable Router behavior separately.
- `core/test/claude-plugin-alias.test.js`, `core/test/deep-plan-integration.test.js`, `core/test/sync-standardization.test.js`: current-platform generator expectations conflict with C21 Codex-only scope. Defer adapter behavior to later adapter Cycles; do not silently relabel old generated outputs as current.
- `core/test/knowledge-ledger.test.js`: 54-command and legacy Knowledge Ledger surface conflicts with Records authority. Retain only behavior that still validates read-only legacy evidence or explicit migration boundaries.
- `core/test/docs-governance.test.js`, `core/test/readme-update.test.js`, `core/test/codex-subagent-discipline.test.js`: update generated/current documentation assertions from old count/help prose to the nine-route and replacement-authority contracts.
- `core/test/command-exposure.test.js`, `core/test/root-skill-router.test.js`, `core/test/command-skill-root-routing.test.js`: retain the trust, symlink, root-separation, and zero-write behavior; update stale bootstrap/physical-inventory fixture expectations rather than deleting these tests wholesale.

## Problems Encountered

The first RED run used complete `snapshotTree` equality in failure output. Legacy generators created many large files, causing a multi-megabyte TAP diff. The assertion was tightened to compare canonical tree hashes, preserving byte-for-byte zero-write semantics while keeping failures readable. No production defect or fixture mutation resulted.

## Risks And Follow-up

- The regeneration test intentionally treats old standard platform writers as zero-write/retired in C21. If implementation retains reusable adapter code, it must be unreachable from current public writer/export paths; later adapter Cycles can introduce new contracts rather than reviving these legacy ones.
- Historical release notes may retain truthful old behavior; this suite targets Root/current README/current Commands Reference/current Codex Guides, not historical archives.
- Full Core regression was not run during RED authoring, per the scoped TEST handoff. The relevant baseline is `39/39`; IMPLEMENT/independent TEST must run full maintained regression after intentional retirements.
- No Official installed-host Skill eval or Hook smoke was rerun here. M7's honest host limitation remains unchanged.
- No Skill eval was executed or graded, so no quality improvement claim exists yet.
- No deletion of repository paths was performed or authorized by this work.
