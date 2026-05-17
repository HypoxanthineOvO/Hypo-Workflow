---
name: hw-init
description: "Hypo-Workflow Cursor skill for /hw-init; use when the user invokes /hw-init or canonical /hw:init."
---

# /hw-init

Canonical command: `/hw:init`
Cursor command: `/hw-init`
Route: `lifecycle`
Embedded authority source: `skills/init/SKILL.md`

## Cursor Execution

1. Treat this file as the command-specific Cursor Skill for the requested `/hw-*` command.
2. Read `.cursor/skills/hypo-workflow.md` when global routing, output-language, or shared runtime rules are needed.
3. Execute the canonical `/hw:init` semantics using the embedded command authority below and any user-provided arguments.
4. Before writes, inspect `.pipeline/config.yaml`, `.pipeline/cycle.yaml`, `.pipeline/state.yaml`, and `.pipeline/rules.yaml` when present.
5. Do not treat Hypo-Workflow as a runner; Cursor Agent performs the actual work and records evidence in project files when the active command owns those writes.
6. Cursor chooses the active model in the UI/session; treat provider-specific model defaults as non-Cursor examples and do not write or recommend them unless explicitly requested.

## Command Skill Authority

---
name: init
description: Initialize or rescan a Hypo-Workflow project when the user wants architecture-aware setup before planning or execution.
---

# /hypo-workflow:init
## 输出语言规则

📌 输出语言规则：
读取 config.yaml → output.language
- zh-CN / zh：所有用户可见的输出使用中文（PROGRESS、报告、状态提示、错误消息、交互提问）
- en：使用英文
- auto：跟随用户对话语言
内部日志（log.yaml、state.yaml）始终英文。

使用此技能来引导 `.pipeline/` 和架构基线。普通的 `/hw:init` 不需要 git。V8.1 还允许 init 将 Workflow 前的 Git 历史导入到关闭的 Legacy Cycle 中。

交互式 init 应该为 Cycle 级别的 `P0 Configure` 预发现阶段准备项目。`P0 Configure` 在 `cycle new` 之后、`P1 Discover` 之前运行；它可以从 `cycle_explicit`、`previous_cycle_snapshot`、`project_config`、`global_config` 或 `built_in_default` 重用现有设置，并且涵盖自动化、Subagent 授权、验收模式、PR/MR 远程写入策略、完整回归、分析边界和 worker separation。

## 前置条件

- 仓库为空、已包含源代码或已包含部分 pipeline
- Git 对于普通 init 是可选的。仅当存在 `--import-history` 时才需要。

## 支持的 Flags

- `--rescan`：刷新现有 pipeline 的架构。
- `--folder`：强制文件夹模式架构输出。
- `--single`：强制单文件架构输出。
- `--import-history`：扫描当前 Git 第一父历史并将其导入为 Cycle 0 Legacy。
- `--interactive`：与 `--import-history` 一起使用时，显示拆分计划并在写入归档文件之前等待明确确认。
- `--automation manual|balanced|full`：生成项目配置的非交互式自动化级别覆盖。

## 执行流程

1. 如果存在，读取 `~/.hypo-workflow/config.yaml`，以便生成的项目配置可以继承默认值而不重复它们。
2. 检测适用三种情况中的哪一种：
   - 空项目
   - 没有 `.pipeline/` 的现有项目
   - 现有 pipeline
3. 运行四个探索阶段：
   - 环境感知
   - 结构扫描
   - 需要时深度阅读
   - 输出生成
4. 在交互式上下文中请求自动化级别，然后将稳定键写入 `.pipeline/config.yaml`：
   ```text
   ⚙️ 自动化程度
     [1] 稳妥模式 (`manual`) — 多确认，适合高风险或探索任务
     [2] 自动模式 (`balanced`) — 普通执行自动继续，规划和高风险 Gate 保留确认
     [3] 全自动模式 (`full`) — 尽量自动推进，但规划、破坏性/外部副作用、发布仍需确认
   ```
   在非交互式上下文中，除非 `--automation` 提供 `manual`、`balanced` 或 `full`，否则使用 `balanced`。
5. 生成 `.pipeline/config.yaml`，仅包含与全局默认值不同的项目特定值和覆盖，包括在 init 期间选择的 `automation.level`。
6. 在交互式 init 中，请求项目本地 worker separation 模式并将其写入 `execution.worker_separation.mode`：
   - `off`
   - `recommended`
   - `strict`
7. 如果活跃的 Cycle 将进入规划，在 `P1 Discover` 之前移交给 `P0 Configure`；否则记录项目默认值已准备好供以后重用。`P0 Configure` 在 `cycle new` 之后、`P1 Discover` 之前运行，询问自动化、Subagent 授权、验收模式、PR/MR 远程写入确认、完整回归、分析边界和 worker separation，并且可以从 `cycle_explicit -> previous_cycle_snapshot -> project_config -> global_config -> built_in_default` 重用值。
8. 除非强制，否则根据项目大小以单文件或文件夹模式生成架构。
9. 除非用户明确跳过，否则初始化规则配置：
   - 在交互式上下文中显示预设选择：
     ```text
     📏 Rules 配置
       [1] recommended — 推荐规则集（默认）
       [2] strict — 严格模式
       [3] minimal — 最小化
       [4] 跳过（后续用 /hw:rules 配置）
     ```
   - 默认创建 `.pipeline/rules.yaml`，包含 `extends: recommended`
   - 创建 `.pipeline/rules/custom/` 用于未来自定义规则
   - 在 init 期间不要创建显式 Cycle 元数据
10. 创建 `.pipeline/` 目录后、初始化 `state.yaml` 之前，如果存在 `--import-history`，则分支到历史导入。
11. 使用 `--rescan` 刷新现有 pipeline 的架构。
12. 通过状态跟踪此命令时设置 `current.phase=lifecycle_init`。

## 历史导入

`/hw:init --import-history` 导入在 Hypo-Workflow 开始跟踪项目之前发生的提交。`/hw:init --import-history` 需要 git，但当标志不存在时不得更改正常的 init 行为。

### 模板语言

生成 Legacy 报告时，从项目 > 全局 > 默认值解析 `output.language`。

- `zh-CN` / `zh` -> 加载 `templates/zh/legacy-report.md`
- `en` / `en-US` -> 加载 `templates/en/legacy-report.md`
- 缺少本地化模板 -> 回退到 `templates/legacy-report.md`

PROJECT-SUMMARY 生成必须对标题、表头、状态标签和文本使用相同的语言。内部 `state.yaml` 和 `log.yaml` 保持英文。

### 前置条件

1. 检查当前目录是 Git 仓库：
   - 运行 `git rev-parse --is-inside-work-tree`
   - 如果失败，停止并显示 `❌ 当前目录不是 git 仓库，请先执行 git init`
2. 仅扫描当前分支的第一父历史：
   - 基本命令：`git log --format="%H|%aI|%s" --first-parent`
   - 如果 `.pipeline/config.yaml` 有 `project_root`，追加 `-- <project_root>` 进行 monorepo 过滤
3. 如果 `.pipeline/state.yaml` 已存在，读取最早的跟踪 `started` / `started_at` 时间戳，仅导入该截止时间之前的提交。
4. 在呈现或写入结果之前解析输出语言和时区。
5. 从项目 > 全局 > 默认值解析 `history_import.*`。

### 配置默认值

```yaml
history_import:
  split_method: auto
  time_gap_threshold: 24h
  max_milestones: 20
  keyword_patterns:
    - 'feat\(M(\d+)\):'
    - 'M(\d+)-'
    - 'milestone-(\d+)'
```

### 拆分信号

在 `split_method: auto` 中，按顺序尝试这些信号并选择第一个创建至少 2 个 milestone 的信号：

1. Tag：`git tag --sort=creatordate --format='%(refname:short)|%(creatordate:iso-strict)'`
2. Keyword：提交消息匹配配置的 `keyword_patterns`
3. Merge：`git log --merges --first-parent`
4. Time gap：相邻提交间隔超过 `history_import.time_gap_threshold`

如果配置了特定的 `split_method`，仅使用该方法，当无法拆分时回退到 `M0-legacy`。

### 拆分规则

- 如果少于 5 个提交符合条件，不要拆分；全部导入为 `M0-legacy`。
- Tag milestone 命名如 `M0-v1.0`。
- Keyword milestone 从编号和短消息 slug 命名，例如 `M0-scaffold`。
- Merge milestone 命名如 `M0-pr-1`。
- Time-gap milestone 以 `M0-initial` 开始，然后使用简洁的日期或消息 slug。
- 导入上限为 `history_import.max_milestones`，默认不超过 20 个 milestone。
- 当超过上限时，将其余合并到 `Mxx-remaining`。
- 对于超过 1000 个提交的历史，正常处理但每个报告仅列出前 50 个提交，后跟 `... and N other commits`。

### 交互模式

当存在 `--interactive` 时：

1. 在内存中完成扫描和拆分。
2. 显示摘要：

   ```text
   History Import split plan

   Detected 142 commits and split them by [tag] into 5 milestones:

     M0-scaffold   (12 commits, 2025-01-15 ~ 2025-01-20)
     M1-core-crud  (35 commits, 2025-01-21 ~ 2025-02-15)

   Confirm, or ask to merge, split, rename, or switch signal.
   ```

3. 停止并等待用户确认。
4. 如果用户要求合并、拆分、重命名或切换信号，修订计划，再次显示，并再次等待。
5. 在用户明确确认之前不要生成文件。

没有 `--interactive` 时，在计算拆分计划后立即生成文件。

### 生成文件

创建 `.pipeline/archives/cycle-0-legacy/`，包含：

```text
.pipeline/archives/cycle-0-legacy/
├── cycle.yaml
├── summary.md
└── M{x}-{name}/
    └── report.md
```

`cycle.yaml` 形状：

```yaml
name: "Legacy (pre-Workflow)"
id: 0
status: closed
started: "<earliest commit time in output.timezone>"
finished: "<init execution time in output.timezone>"
import_source: git
import_method: <tag | keyword | merge | time_gap>
total_commits: <total commit count>
total_milestones: <milestone count>
milestones:
  - name: <milestone name>
    commits: <commit count>
    started: "<first commit time>"
    finished: "<last commit time>"
```

`summary.md` 必须包含：

- 从最早到最新符合条件提交的项目概述
- 选择的拆分方法及其原因
- 每个 milestone 的一句话摘要
- 全局前 20 个更改文件热度排名

每个 milestone 报告必须使用 `templates/legacy-report.md` 并包含：

- milestone 名称、时间跨度、提交数、更改文件统计、添加/删除行总计
- 从提交消息和 diff 统计推断的 3-5 个主要更改
- 提交表：Hash | Time | Message，时间转换为 `output.timezone`
- 按行变动的前 15 个更改文件

Legacy 报告不得包含 TDD 字段，如 `write_tests`、`run_red` 或 `review_code`。

### 导入后的当前 Cycle

写入 Cycle 0 Legacy 后，创建或保留 `.pipeline/cycle.yaml` 作为活跃的 Cycle 1：

```yaml
cycle:
  number: 1
  name: "Current"
  type: feature
  status: active
  previous_cycle: 0
```

除非用户明确要求，否则不要覆盖现有的活跃 Cycle。

### 边界情况

- 非 Git 仓库：停止并显示 `❌ 当前目录不是 git 仓库，请先执行 git init`。
- 现有 `.pipeline/state.yaml`：仅导入最早跟踪的 pipeline 开始之前的提交。
- 空仓库或少于 5 个提交：导入为 `M0-legacy`。
- Monorepo：如果配置了 `project_root`，将 `git log` 过滤到该路径。
- 多个分支：仅使用当前分支的第一父历史。
- 超过 1000 个提交：报告提交表每个 milestone 上限为 50 个条目。

## 参考文件

- `references/init-spec.md` — init 行为和架构策略
- `references/commands-spec.md`
- `references/config-spec.md`
- `references/rules-spec.md`
- `rules/presets/recommended.yaml`
- `templates/legacy-report.md`
- `SKILL.md`
