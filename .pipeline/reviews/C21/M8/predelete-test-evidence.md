# C21-M8 Independent Pre-Deletion Test Evidence

## Verdict

`READY_FOR_EXACT_MANIFEST`

Revision 2 已关闭首次独立测试发现的 Docs/README source-revival blocker。非破坏性 M8 实现现已满足预删除条件：正式 suite 只剩一个预期的 filesystem-discovery failure，Codex Plugin 当前发现 46 个物理 Child Skills，而目标为 9 个，差异恰好是待删除的 37 个路径；生产 Skill checker 也只报告这 37 个 `unexpected-physical-skill`，没有其他质量问题。

Docs/README 的直接模块入口现在具备明确的零写边界：preview 返回计划或渲染结果但不改变 workspace；write-enabled 调用在任何 mutation 前以稳定错误码拒绝。Registry、Router、contextual Start、adapter/sync writer、当前文档合同和 Deletion gate 继续保持 GREEN。

本结论只表示可以生成并向用户完整展示 exact Deletion Manifest。它不构成删除授权，也不能用于跳过 fresh explicit approval、Receipt 绑定或执行前 drift revalidation。

本 worker 未删除任何文件、未签发 Receipt、未修改 Runtime/Journal/Capsule、未触碰 VSP，也未运行 full `npm test`。

## Revision 2 Retest

### Formal and focused suites

```text
M8 surface cleanup: 32 tests / 31 pass / 1 fail
Focused baseline:   39 tests / 37 pass / 2 fail
```

M8 唯一失败仍是 46-vs-9 filesystem discovery，leaf diff 精确对应下文列出的 37 个 physical Child Skills。Focused baseline 的两处失败仍严格限定为旧 compatibility-in-`CANONICAL_COMMANDS` inventory 断言与 `54` command count 断言；没有出现第三个 failure。

### Direct Docs/README module probes

所有 probe 均使用带 legacy `.pipeline/state.yaml` 的 disposable workspace，并在每次调用前后比较完整 tree snapshot：

| Entry | Revision 2 behavior | Tree |
| --- | --- | --- |
| `repairDocs(root, { write: false })` | 返回 `status: preview`, `write: false`, `generated: []` 和 25 个 `planned_files` | unchanged |
| `repairDocs(root, { write: true })` | 拒绝：`ERR_HYPO_WORKFLOW_DOCS_DEFERRED`, `status: deferred` | unchanged |
| `updateReadme(..., { write: false })` | 返回 preview content 与 `changedBlocks: ["command-reference"]` | unchanged |
| `updateReadme(..., { write: true })` | 拒绝：`ERR_HYPO_WORKFLOW_README_WRITE_RETIRED`, `status: removed` | unchanged |

因此首次测试发现的 25-file docs revival 和 write-enabled README mutation 均已关闭。只读 preview 可保留，因为它只返回内存结果，不创建或修改目标文件。

### Production Skill checker

直接调用：

```js
await checkSkillQuality({ repoRoot })
```

结果：

```text
37 issues across 10 Skill files
unexpected-physical-skill: 37
other issues: 0
expected public Child Skills: 9
physical Child Skills: 46
extra physical Child Skills: 37
```

这与正式 M8 discovery failure 完全一致，没有 frontmatter、reference、symlink、missing backend 或其他 Skill quality blocker。

### Revision 2 static revalidation

- Plugin Creator validator：PASS。
- Pre-M8 `FILES.sha256`：49/49 payload PASS。
- Pre-M8 `SNAPSHOT.sha256`：PASS。
- Snapshot writable-path scan：0 paths。
- 7 个 M8/Plugin/Hook JSON：全部可解析。
- `git diff --check`：PASS。

## Test Design

验证分为六层：

1. 重新运行正式 M8 surface cleanup suite，精确核对 leaf failure。
2. 重新运行 TEST evidence 指定的 39 项 focused baseline，并区分旧 inventory/count 断言与真实 regression。
3. 从生产模块直接 import Registry、Router、sync 和各 adapter writer，在 disposable 临时目录验证 exact-nine、zero-write 与 contextual Start。
4. 绕过 Root API，直接 import docs/readme 模块，在 disposable legacy workspace 验证写入口是否能复活旧表面。
5. 复验 pre-M8 baseline snapshot 的 checksum 与只读属性。
6. 验证 Plugin、JSON、九个公开 Skill、主 Markdown 本地链接和 diff whitespace。

所有 mutation probe 只写 `/tmp` 下的 disposable workspace；仓库内唯一新增文件是本证据报告。

## 1. Formal M8 Suite

Command:

```bash
node --test core/test/c21-m8-surface-cleanup.test.js
```

Result:

```text
32 tests
31 pass
1 fail
0 skip
exit 1
```

唯一 leaf failure：

```text
Codex Plugin filesystem discovery and Registry projection expose exactly the same nine routes
```

Registry projection已经是目标九路由；失败仅来自 `.codex-plugin/plugin.json` 的 `skills: "./skills/"` 实际递归发现 46 个物理 Skill。多出的 37 个路径精确为：

### Internal: 19

- `skills/chat/SKILL.md`
- `skills/check/SKILL.md`
- `skills/compact/SKILL.md`
- `skills/debug/SKILL.md`
- `skills/explain/SKILL.md`
- `skills/knowledge/SKILL.md`
- `skills/log/SKILL.md`
- `skills/plan-architecture/SKILL.md`
- `skills/plan-decompose/SKILL.md`
- `skills/plan-deep/SKILL.md`
- `skills/plan-discover/SKILL.md`
- `skills/plan-extend/SKILL.md`
- `skills/plan-generate/SKILL.md`
- `skills/plan-review/SKILL.md`
- `skills/plan-technical-stack/SKILL.md`
- `skills/report/SKILL.md`
- `skills/start/SKILL.md`
- `skills/status/SKILL.md`
- `skills/sync/SKILL.md`

### Deferred: 8

- `skills/analysis/SKILL.md`
- `skills/audit/SKILL.md`
- `skills/docs/SKILL.md`
- `skills/explore/SKILL.md`
- `skills/optimize/SKILL.md`
- `skills/pr/SKILL.md`
- `skills/quality/SKILL.md`
- `skills/release/SKILL.md`

### Removed: 10

- `skills/help/SKILL.md`
- `skills/patch/SKILL.md`
- `skills/plan-confirm/SKILL.md`
- `skills/reset/SKILL.md`
- `skills/rules/SKILL.md`
- `skills/setup/SKILL.md`
- `skills/showcase/SKILL.md`
- `skills/skip/SKILL.md`
- `skills/stop/SKILL.md`
- `skills/watchdog/SKILL.md`

同一 suite 的其余合同全部 GREEN：

- internal/deferred/removed Router diagnostics 与 contextual Start：PASS。
- 5 个 sync/adapter writer zero-write：PASS。
- `runProjectSync(checkOnly=true)` zero-write：PASS。
- path hash drift、Git drift、extra-path substitution、protected Recovery path、Receipt reuse：5/5 PASS。
- Root Skill、Plugin metadata、README、Commands Reference、Codex guides：16/16 PASS。

## 2. Focused Baseline

Command:

```bash
node --test core/test/command-exposure.test.js core/test/root-skill-router.test.js core/test/command-skill-root-routing.test.js core/test/deletion-gate.test.js core/test/skill-spec.test.js core/test/codex-hooks-vnext.test.js core/test/codex-hook-process.test.js
```

Result:

```text
39 tests
37 pass
2 fail
0 skip
exit 1
```

两处失败均是预期 stale inventory/count assertion，不是真实 regression：

1. `core/test/command-exposure.test.js` 的 `current exposure taxonomy...` 仍要求 `/hw:status` 等 compatibility diagnostics 直接存在于 `CANONICAL_COMMANDS`。M8 当前合同将 `CANONICAL_COMMANDS` 限定为九个公开/上下文路由；旧命令只通过 private compatibility diagnostic routing 返回 zero-write 分类。
2. `core/test/skill-spec.test.js` 的 `current command map...` 仍硬编码 `54` 个 command 与 `44` 个 Skill path；生产 `commandMap()` 现在按批准设计返回 9 个。

其余 37 项全部通过，包括 Hook process、command discovery trust/symlink boundary、Root routing 和 Deletion executor。没有观察到额外 leaf failure。

## 3. Independent Production API Probes

直接 import `core/src/commands/index.js` 的结果：

```text
CANONICAL_COMMANDS:       exact 9
commandMap("codex"):     exact 9
discoverableCommandMap:  exact 9
```

三者的集合均为：

```text
/hw:guide
/hw:init
/hw:goal
/hw:plan
/hw:cycle
/hw:maintain
/hw:resume
/hw:accept
/hw:reject
```

Router probe：

- 18 个非 Start internal route 全部返回 `internal` 且 `writes: []`。
- 8 个 deferred route 全部返回 `deferred` 且 `writes: []`。
- 10 个 removed route 全部返回 `removed` 且 `writes: []`。
- unknown route 返回 `unknown` 且 `writes: []`。
- 整个目标临时目录 byte-for-byte unchanged。
- natural Start 在 `waiting_to_start` 时返回 internal `delivery.start`、`discoverable: false`、`writes: []`。
- 非 `waiting_to_start` 的显式 Start 返回 unavailable、`discoverable: false`、`writes: []`。

Writer probe 在各自独立的空临时目录中运行，全部在首次 mutation 前拒绝：

| Entry | Result | Tree |
| --- | --- | --- |
| `runProjectSync` non-checkOnly | `ERR_HYPO_WORKFLOW_SYNC_RETIRED` | unchanged |
| `writeOpenCodeArtifacts` | `ERR_HYPO_WORKFLOW_ADAPTER_DEFERRED` | unchanged |
| `writeClaudeCodePluginArtifacts` | `ERR_HYPO_WORKFLOW_ADAPTER_DEFERRED` | unchanged |
| `writeClaudeCodeAgentArtifacts` | `ERR_HYPO_WORKFLOW_ADAPTER_DEFERRED` | unchanged |
| `writeThirdPartyAdapterArtifacts` | `ERR_HYPO_WORKFLOW_ADAPTER_DEFERRED` | unchanged |
| `writeCursorSkillBundle` | `ERR_HYPO_WORKFLOW_ADAPTER_DEFERRED` | unchanged |

`runProjectSync(checkOnly=true)` 返回 `check_only: true`，只执行 `external_change_detection` 与 `derived_check`，目录保持 unchanged。

## 4. Blocking Direct-Module Finding

### `repairDocs()` revives retired surfaces

直接 import `core/src/docs/index.js`，对带 `.pipeline/state.yaml` 的 disposable legacy workspace 调用：

```js
await repairDocs(root, { write: false });
```

实际结果：

- 调用成功，没有拒绝。
- 创建 25 个文件和 6 个目录，共 31 个新增 tree entries。
- `{ write: false }` 只控制后续 README managed-block 路径；`writeGenerated()` 仍无条件 `mkdir` + `writeFile`。
- `assertLegacyWorkspaceWritable()` 只阻止 current/damaged-current，允许 legacy workspace，因此不能充当 M8 retirement gate。

10 个生成文件复活 deferred/removed 命令：

| Generated file | Revived routes |
| --- | --- |
| `README.en.md` | `/hw:analysis`, `/hw:docs`, `/hw:pr` |
| `docs/user-guide.md` | `/hw:audit`, `/hw:docs`, `/hw:pr` |
| `docs/en/user-guide.md` | `/hw:audit`, `/hw:docs`, `/hw:pr` |
| `docs/en/developer.md` | `/hw:docs` |
| `docs/platforms/opencode.md` | `/hw:pr` |
| `docs/en/platforms/opencode.md` | `/hw:pr` |
| `docs/reference/generated-artifacts.md` | `/hw:docs`, `/hw:pr` |
| `docs/en/reference/generated-artifacts.md` | `/hw:docs`, `/hw:pr` |
| `docs/reference/configuration.md` | `/hw:setup`, `/hw:rules` |
| `docs/en/reference/configuration.md` | `/hw:setup`, `/hw:rules` |

Relevant implementation points:

- `core/src/docs/index.js:234`: exported `repairDocs()` remains write-capable.
- `core/src/docs/index.js:238`: `write` flag does not guard generated writes.
- `core/src/docs/index.js:239`: unconditional generated writes begin.
- `core/src/docs/index.js:1492`: `writeGenerated()` always mutates.

### `updateReadme()` remains a legacy writer

直接 import `core/src/readme/index.js`，对含 managed command block 的 legacy README 调用：

```js
await updateReadme(readmePath, {
  projectRoot: root,
  write: true,
  blocks: ["command-reference"],
});
```

调用成功并修改 README。生成的 command block 本身只有九路由，没有复活 deferred/removed route；但 M8 要求 write-enabled legacy docs/readme entry 在 mutation 前 retired/deferred，因此“仍可写任何文件”本身就是 source-revival blocker。

`checkDocs()` 与 `checkReadmeFreshness()` 在相同类型的 legacy fixture 中均保持 byte-for-byte zero-write，可继续保留。

## 5. Snapshot And Static Validation

### Pre-M8 baseline snapshot

- `sha256sum -c FILES.sha256`: all 49 payload files PASS。
- `sha256sum -c SNAPSHOT.sha256`: `FILES.sha256` PASS。
- `find . -perm /222 -print`: no output；整个 snapshot tree 无 owner/group/other write bit。
- Snapshot payload、checksum 和权限均未被本 worker 修改。

### Plugin / Skills / JSON / Markdown

- Plugin Creator validator: PASS。
- 9 个 public `skills/*/SKILL.md`：全部 ordinary file、非 symlink、frontmatter `name`/`description` 非空、name 唯一。
- JSON parse：7/7 PASS：
  - `.codex-plugin/plugin.json`
  - `.agents/plugins/marketplace.json`
  - `hooks/hooks.json`
  - `hooks/claude/hooks.json`
  - `.pipeline/reviews/C21/M8/classification-proposal.json`
  - `.pipeline/reviews/C21/M8/skill-eval/evals.json`
  - `.pipeline/reviews/C21/M8/skill-eval/assertion-metadata.json`
- Primary Markdown local links：检查 7 个主文件、29 个本地链接，missing `0`。
  - `SKILL.md`
  - `README.md`
  - `README.en.md`
  - `docs/reference/commands.md`
  - `docs/en/reference/commands.md`
  - `docs/platforms/codex.md`
  - `docs/en/platforms/codex.md`
- `git diff --check`: PASS。

## Modified Files

本 worker 只新增：

- `.pipeline/reviews/C21/M8/predelete-test-evidence.md`

没有修改 production、Skills、docs、existing tests、fixtures、snapshots、Plugin metadata 或 Workflow authority。

## Revision 1 Required Remediation — Closed In Revision 2

首次测试要求在 exact Deletion Manifest 生成前，让以下 write-enabled 入口在任何 mutation 前 fail closed，或从可调用模块 surface 移除：

- `repairDocs()`；保留 `checkDocs()` 等只读检查即可。
- `updateReadme(..., { write: true })`；可保留纯 preview/read-only 形态和 `checkReadmeFreshness()`。

Revision 2 已重新运行 direct-module probes：两类 write-enabled 入口均 fail closed，preview 均 zero-write，正式 M8 suite 仍只剩精确 37 个待删物理 Child Skills 导致的 discovery failure。因此结论已更新为 `READY_FOR_EXACT_MANIFEST`。

## Problems Encountered

没有工具或环境阻塞。正式 M8 suite 的 failure output 很长，但 leaf 原因单一且可精确归因。Focused baseline 的两处失败来自已知旧 inventory/count 合同，已通过当前 API 和正式 behavior suite 交叉验证为 stale，而非新 regression。

## Risks And Follow-up

- Revision 1 的 `repairDocs()` revival 与 `updateReadme()` legacy write surface 已在 Revision 2 复测关闭。
- Plugin validator 只证明 manifest shape 合法，不证明 filesystem discovery cardinality；46-versus-9 必须通过授权删除后再验证。
- Full Core regression 和 `tests/run_regression.py` 按任务要求未在预删除阶段运行；应在正式删除、旧断言 retirement 与最终审计阶段执行。
- 本报告不构成删除授权，不得用于签发 `deletion.execute` Receipt。
