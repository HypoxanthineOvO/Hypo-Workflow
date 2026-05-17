---
name: hw-cycle
description: "Hypo-Workflow Cursor skill for /hw-cycle; use when the user invokes /hw-cycle or canonical /hw:cycle."
---

# /hw-cycle

Canonical command: `/hw:cycle`
Cursor command: `/hw-cycle`
Route: `lifecycle`
Embedded authority source: `skills/cycle/SKILL.md`

## Cursor Execution

1. Treat this file as the command-specific Cursor Skill for the requested `/hw-*` command.
2. Read `.cursor/skills/hypo-workflow.md` when global routing, output-language, or shared runtime rules are needed.
3. Execute the canonical `/hw:cycle` semantics using the embedded command authority below and any user-provided arguments.
4. Before writes, inspect `.pipeline/config.yaml`, `.pipeline/cycle.yaml`, `.pipeline/state.yaml`, and `.pipeline/rules.yaml` when present.
5. Do not treat Hypo-Workflow as a runner; Cursor Agent performs the actual work and records evidence in project files when the active command owns those writes.
6. Cursor chooses the active model in the UI/session; treat provider-specific model defaults as non-Cursor examples and do not write or recommend them unless explicitly requested.

## Cursor Reference Resolution

- Local Cursor references live under `.cursor/skills/` and `.cursor/hypo-workflow/`.
- Source-repository paths mentioned by the embedded authority but absent from `.cursor/hypo-workflow/` are external/non-local for Cursor targets.
- Fallback: use the embedded command authority in this file first, then mirrored `.cursor/hypo-workflow/` resources; ask the user for source-repository context only if the missing external reference is required.

## Command Skill Authority

---
name: cycle
description: Manage Hypo-Workflow Cycles with independent milestone sequences, state, progress, reports, archives, and summaries.
---

# /hypo-workflow:cycle
## 输出语言规则

📌 输出语言规则：
读取 config.yaml → output.language
- zh-CN / zh：所有用户可见的输出使用中文（PROGRESS、报告、状态提示、错误消息、交互提问）
- en：使用英文
- auto：跟随用户对话语言
内部日志（log.yaml、state.yaml）始终英文。

当用户调用 `/hw:cycle` 或 `/hypo-workflow:cycle` 时使用此技能。

Cycle 是项目级交付容器。每个 Cycle 拥有自己的 Milestone 序列、`.pipeline/state.yaml`、`.pipeline/PROGRESS.md`、`.pipeline/prompts/` 和 `.pipeline/reports/`。Milestone 编号在每个 Cycle 内从 `M0` 重新开始。跨 Cycle 文件保持原位。

## 路径

所有路径相对于 `.pipeline/`，除非明确指定项目根路径：

- 活跃 Cycle：`.pipeline/cycle.yaml`
- 归档：`.pipeline/archives/C{N}-{slug}/`
- Patch：`.pipeline/patches/`
- 项目摘要：项目根目录 `PROJECT-SUMMARY.md`
- 持久文件：`.pipeline/architecture.md`、`.pipeline/config.yaml`、`.pipeline/log.yaml`、`.pipeline/patches/`
- 持久知识：`.pipeline/knowledge/`

## 指令列表

支持的格式：

- `/hw:cycle new "名称" [--type feature|bugfix|refactor|spike|hotfix] [--context audit,patches,deferred,debug]`
- `/hw:cycle list`
- `/hw:cycle view C{N}` 或 `/hw:cycle view 0`
- `/hw:cycle close [--reason "..."] [--paused]`
- `/hw:accept`
- `/hw:reject "<反馈>"`

## Cycle 文件

创建 `.pipeline/cycle.yaml`，格式如下：

```yaml
cycle:
  number: 1
  name: "初始开发"
  type: feature
  status: active
  started: "2026-04-28T12:00:00+08:00"
  preset: tdd
  context_sources: []
  previous_cycle: null
  summary: null
  lessons: null
```

使用带时区的 ISO-8601 时间戳。从 `output.timezone` 解析时区；默认为 `Asia/Shanghai`。

## 类型与 Preset 映射

- `feature` -> `tdd`
- `refactor` -> `tdd`
- `bugfix` -> `implement-only`
- `spike` -> `implement-only`
- `hotfix` -> `implement-only`

用户可以编辑 `.pipeline/cycle.yaml` 来覆盖 `cycle.preset`。除非用户明确要求，否则不要覆盖用户的设置。

## `/hw:cycle new`

1. 读取 `.pipeline/config.yaml` 和可选的 `~/.hypo-workflow/config.yaml`。
2. 如果 `.pipeline/cycle.yaml` 存在且 `cycle.status=active`，在创建新 Cycle 前先运行此技能的归档流程。
3. 通过扫描确定下一个编号：
   - 现有的活跃 `.pipeline/cycle.yaml`
   - `.pipeline/archives/C*/cycle.yaml`
   - 匹配 `C{N}-*` 的归档目录名称
4. 如果没有 Cycle 文件存在，将第一个显式 Cycle 创建为 `C1`。
5. 需要时将名称转换为 slug 格式用于归档路径。
6. 解析 `--type`；如果省略则默认为 `feature`。
7. 解析 `--context`；将支持的值存储在 `cycle.context_sources` 中。
8. 创建 `.pipeline/cycle.yaml`。
9. 重置 Cycle 本地运行时：
   - 从共享根资产 `../../assets/state-init.yaml` 重置 `.pipeline/state.yaml`
   - 删除 `.pipeline/prompts/` 下的文件
   - 删除 `.pipeline/reports/` 下的文件
   - 如果 `.pipeline/PROGRESS.md` 属于前一个 Cycle，则删除它
10. 保留：
    - `.pipeline/architecture.md`
    - `.pipeline/config.yaml`
    - `.pipeline/log.yaml`
    - `.pipeline/patches/`
    - `.pipeline/archives/`
11. 报告新 Cycle 的编号、名称、类型、Preset 和上下文源。

兼容性：没有 `.pipeline/cycle.yaml` 的项目仅在显示和迁移上下文中被视为隐式 `C1`。`/hw:init` 不得创建 `.pipeline/cycle.yaml`。

## `/hw:cycle close`

关闭活跃 Cycle 并归档其本地产物。

Cycle 0 Legacy 根据定义已经关闭。如果用户要求关闭 Cycle 0，停止并报告 Legacy 历史不能再次关闭。

状态规则：

- 无标志 -> `completed`
- `--reason "..."` -> `abandoned` 并将原因记录为 `cycle.lessons`
- `--paused` -> `paused`
- 手动验收模式 -> `pending_acceptance` 直到 `/hw:accept` 或 `/hw:reject`

执行步骤：

1. 要求 `.pipeline/cycle.yaml` 存在。如果缺失，说明没有显式活跃 Cycle，并保持旧项目不变。
2. 如果存在，读取 `.pipeline/state.yaml`。
3. 更新 `cycle.status`、`cycle.summary`、`cycle.lessons` 和完成时间戳。
4. 如果 `compact.auto=true`，在归档前重新生成紧凑视图，以便最新的活跃 Cycle 上下文得到体现。
5. 运行归档流程。
6. 更新项目根目录的 `PROJECT-SUMMARY.md`。
7. 如果 `compact.auto=true`，在归档后再次重新生成紧凑视图，以便持久文件和已关闭的 Patch 有新的摘要。
8. 生成归档摘要和最终用户回应时，必须按 `references/completion-report-contract.md` 覆盖改动摘要、技术思路、修改文件/模块、测试设计、验证结果、预期结果、遇到的问题、风险/后续。
9. 使 `.pipeline/` 仅包含持久文件和任何新生成的摘要。

## 归档流程

创建 `.pipeline/archives/C{N}-{slug}/` 并按如下方式移动或复制文件：

- 移动 `.pipeline/PROGRESS.md` -> `archives/C{N}-{slug}/PROGRESS.md`
- 移动 `.pipeline/state.yaml` -> `archives/C{N}-{slug}/state.yaml`
- 移动 `.pipeline/cycle.yaml` -> `archives/C{N}-{slug}/cycle.yaml`
- 移动 `.pipeline/prompts/` -> `archives/C{N}-{slug}/prompts/`
- 移动 `.pipeline/reports/` -> `archives/C{N}-{slug}/reports/`
- 复制 `.pipeline/architecture.md` -> `archives/C{N}-{slug}/architecture-snapshot.md`
- 当存在时，从 `.pipeline/knowledge/knowledge.compact.md` 写入 `.pipeline/archives/C{N}-{slug}/knowledge-summary.md`

移动目录后，仅在立即创建新 Cycle 时才重新创建空的 `.pipeline/prompts/` 和 `.pipeline/reports/`。对于仅关闭操作，除非项目工具需要空目录，否则不要创建它们。

不要归档或删除：

- `.pipeline/architecture.md`
- `.pipeline/config.yaml`
- `.pipeline/log.yaml`
- `.pipeline/patches/`
- `.pipeline/knowledge/`
- `.pipeline/archives/`
- 项目根目录 `PROJECT-SUMMARY.md`
- 由 `/hw:compact` 重新生成的 `.pipeline/*.compact.*`

不要归档、移动或删除 `.pipeline/knowledge/`。它是持久的跨 Cycle 记忆。归档可能仅包含生成的 `knowledge-summary.md` 快照。

## Cycle 验收

当验收模式为手动时，已完成的 Cycle 进入 `pending_acceptance` 而不是立即归档。在 `timeout` 模式下，状态显示可以在 `acceptance.timeout_hours` 后确定性地显示自动验收；这是一个读取/检查决策，不能作为后台状态变更实现。

权威状态位于 `.pipeline/cycle.yaml`：

```yaml
cycle:
  status: pending_acceptance
  acceptance:
    mode: manual
    state: pending
    requested_at: "2026-05-03T00:10:00+08:00"
```

`state.yaml` 可以仅镜像紧凑状态：

```yaml
acceptance:
  scope: cycle
  state: pending
  cycle_id: C4
  updated_at: "2026-05-03T00:10:00+08:00"
```

`/hw:accept` 标记 `cycle.status: completed`、`cycle.acceptance.state: accepted`，更新 `state.yaml`，写入 `cycle_accept` 日志条目，并更新 `PROGRESS.md`。

`/hw:reject` 将 Cycle 重新打开为 `active`，在 `.pipeline/acceptance/` 下写入结构化反馈，仅在 `state.yaml` 中存储 `feedback_ref`，写入 `cycle_reject` 日志条目，并更新 `PROGRESS.md`。反馈文件应包括 `problem`、`reproduce_steps`、`expected`、`actual`、`context`、`iteration` 和 `created_at`。

## 延后事项

关闭时，在移动 `.pipeline/state.yaml` 前扫描它。对于每个状态为 `status: in_progress` 或 `status: pending` 的 Milestone，向 `.pipeline/archives/C{N}-{slug}/deferred.yaml` 添加条目：

```yaml
- milestone: "M3"
  name: "..."
  reason: "cycle closed"
```

同时，在可行时将归档的 `state.yaml` Milestone 状态标记为 `deferred` 并设置 `deferred_reason: cycle closed`。

## 归档摘要

生成 `.pipeline/archives/C{N}-{slug}/summary.md`。

摘要必须包括：

- Cycle 编号、名称、类型、状态、开始时间、结束时间和 Preset
- 每个 Milestone 一句话描述
- 可用时的关键数据：测试、评分、最终决定、警告
- 延后事项计数和名称
- 对于放弃的 Cycle，包括 `lessons`
- 当 `.pipeline/archives/C{N}-{slug}/knowledge-summary.md` 存在时的知识摘要路径
- 完成说明：改动摘要、技术思路、修改文件/模块、测试设计、验证结果、预期结果、遇到的问题、风险/后续

使用 `output.language` 编写摘要；默认语言为英语。

## `/hw:cycle list`

列出所有 Cycle，来自：

- `.pipeline/archives/cycle-0-legacy/cycle.yaml`
- `.pipeline/archives/*/cycle.yaml`
- 当前 `.pipeline/cycle.yaml`（如果存在）

显示编号、名称、类型、状态、开始/结束日期和单行摘要。仅在没有显式 Cycle 元数据且旧项目有 `.pipeline/state.yaml` 或 prompts 时才包含隐式 `C1`。

当 `.pipeline/archives/cycle-0-legacy/cycle.yaml` 存在时，首先显示为：

```text
C0 [Legacy] Legacy (pre-Workflow) — closed — <total_commits> commits / <total_milestones> milestones
```

## `/hw:cycle view C{N}`

在当前元数据或归档中查找 Cycle。显示：

- Cycle 元数据
- 归档路径
- 摘要摘录
- 延后事项
- 报告列表
- 存在时的架构快照路径

如果 Cycle 缺失，列出可用的 Cycle 编号。

对于 `/hw:cycle view 0` 或 `/hw:cycle view C0`，读取 `.pipeline/archives/cycle-0-legacy/cycle.yaml` 并显示：

- Legacy 导入方法
- 总提交数和 Milestone 数量
- 带提交计数和日期范围的已导入 Milestone 列表
- 摘要路径
- 每个 Milestone 的报告路径

## 项目摘要

每次关闭或归档后，使用 `/hypo-workflow:status` 和此技能中的规则重新生成项目根目录的 `PROJECT-SUMMARY.md`。此文件是跨 Cycle 的项目上下文，不应移入 Cycle 归档。

`PROJECT-SUMMARY.md` 必须遵循 `output.language` 用于：

- 标题和介绍文本
- 表格标题，如 Cycle、Milestone、Status、Time 和 Highlights
- 状态标签，如 Done、In Progress、Paused、Abandoned 和 Deferred
- Open Patches 和 Deferred Items 部分名称

当 `output.language` 缺失时，为了向后兼容默认使用英语。

## 参考文件

- `references/commands-spec.md` — 命令解析和未知命令行为
- `references/completion-report-contract.md` — Cycle 完成汇报必需字段
- `references/state-contract.md` — Milestone 状态字段
- `references/progress-spec.md` — PROGRESS 关系
- `references/config-spec.md` — 输出语言和时区默认值
- `SKILL.md` — 完整系统上下文
