---
name: guide
description: Interactive onboarding guide that senses the current project state and recommends a short Hypo-Workflow command path.
---

# /hypo-workflow:guide
## 输出语言规则

📌 输出语言规则：
读取 config.yaml → output.language
- zh-CN / zh：所有用户可见的输出使用中文（PROGRESS、报告、状态提示、错误消息、交互提问）
- en：使用英文
- auto：跟随用户对话语言
内部日志（log.yaml、state.yaml）始终英文。

当用户调用 `/hw:guide` 或 `/hypo-workflow:guide` 时使用此技能。

Guide 是一个交互式意图路由器，适用于不确定接下来运行哪个 Hypo-Workflow 命令路径的用户。它感知项目状态和用户意图，推荐一个下一步路径，请求确认，然后仅在用户同意时执行第一个推荐的命令。

在为新的或活跃的 Cycle 推荐 `/hw:plan` 之前，当 `P0 Configure` 预发现阶段尚未完成或明确重用时，Guide 应该将其显示出来。`P0 Configure` 在 `cycle new` 之后、Discover 之前运行；它确认自动化、Subagent 授权、验收模式、PR/MR 远程写入策略、完整回归、分析边界和 worker separation。用户可以选择重用先前的配置，解析顺序为：`cycle_explicit`、`previous_cycle_snapshot`、`project_config`、`global_config`、`built_in_default`。

## Step 1: 简短介绍

最多打印 5 行：

- Hypo-Workflow 是一个用于 AI 开发工作的序列化 Pipeline 执行引擎。
- 它管理规划、执行、Cycle 归档、轻量级 Patch、审计、发布流程和自动化。
- 本指南将检查当前项目并建议下一个命令路径。

不要在介绍中列出所有命令。

## Step 2: 感知项目状态

检查当前工作目录：

- 如果 `.pipeline/` 缺失，说明此项目未初始化。
- 如果 `.pipeline/` 存在：
  - 读取 `.pipeline/state.yaml` 或 `.pipeline/state.compact.yaml` 获取当前阶段、提示、步骤和状态
  - 读取 `.pipeline/cycle.yaml` 获取活跃的 Cycle 编号/名称（如果存在）
  - 从 Cycle 验收、继续和状态事实中推导规范的生命周期阶段和下一步操作
  - 扫描 `.pipeline/patches/` 仅计算打开的 Patch 数量
  - 检测 `.pipeline/derived-refresh.yaml` 警告
  - 检测 `.pipeline/.lock` 或未来的租约元数据以及是否需要恢复/修复
  - 用一个简短的句子总结，例如：`你在 C3/M2 implement 步骤，有 2 个 open patch`

在感知期间不要修改任何文件。

## Step 3: 询问用户目标

问一个开放性问题：

```text
你现在想做什么？
```

等待用户的回答。

## Step 4: 意图路由

当可用时，使用在 `core/src/guide/index.js` 中暴露的确定性 guide 路由器形状 `routeGuideIntent`。将答案匹配到一个支持的场景，并推荐恰好一个 1-3 个命令路径。如果答案模糊，问 1-2 个后续问题，例如：

- 项目现在是刚开始、开发中，还是准备发布？
- 你是想修 Bug、规划新功能、查看进度，还是减少上下文占用？

## 场景表

| 用户意图 | 推荐命令流 |
| --- | --- |
| 从零开始新项目 | `/hw:init` → `/hw:plan` → `/hw:start` |
| 继续现有受管项目 | 中断时使用 `/hw:resume`，或为新 Cycle 使用 `/hw:cycle new` |
| 被拒绝的 Cycle 修订 | `/hw:resume` |
| 已接受的 Cycle 带后续继续 | `/hw:plan --context follow_up` → `/hw:plan:generate` → `/hw:start` |
| 派生刷新警告或过期租约恢复 | `/hw:sync --light` → `/hw:check` |
| 修复 Bug | `/hw:patch "描述"` → `/hw:patch fix P<N>` |
| 探索风险方法 | `/hw:explore "主题"` → `/hw:plan --context explore:E001` |
| 规划长期运行或多 Feature 工作 | `/hw:plan --batch` → `/hw:start` |
| 架构、工作流语义或真实来源风险 | `/hw:plan` 配合深度 Grill-Me Discover → `/hw:start` |
| 审查代码质量 | `/hw:audit` → `/hw:plan --context audit` |
| 检查当前进度 | `/hw:status` 或 `/hw:dashboard` |
| 文档意图 | `/hw:docs` |
| 配置意图 | `/hw:setup` |
| 将遗留 Git 项目纳入管理 | `/hw:init --import-history` |
| 减少 token/上下文使用 | `/hw:compact` |
| 发布已完成的项目 | `/hw:release` |

`/hw:docs` 是文档工作流路由目标。用于文档检查、修复、生成引用和 README/docs 信息架构工作。

对于进入规划的流程，除非用户明确表示要重用已解析的配置，否则在第一个 Discover 问题之前推荐 `P0 Configure`。`P0 Configure` 在 `cycle new` 之后、Discover 之前运行，询问自动化、Subagent 授权、验收模式、PR/MR 远程写入确认、完整回归、分析边界和 worker separation，并且可以从 `cycle_explicit -> previous_cycle_snapshot -> project_config -> global_config -> built_in_default` 重用值。

## Step 5: 确认并执行

推荐流程后，询问：

```text
要我帮你开始吗？
```

如果用户明确确认，执行推荐流程中的第一个命令。在第一个命令完成且用户或命令流允许继续之前，不要执行后续命令。

如果用户拒绝，保持推荐命令流可见并停止。

## 安全规则

- 推荐命令流，而不是单个隔离的命令，除非场景自然只有一个命令
- 在用户确认之前不要初始化、规划、恢复、压缩、审计、发布或补丁修复
- 不要从 Guide 本身写入 `.pipeline/state.yaml`
- 不要将 Guide 用作运行器；它只推荐并启动第一个确认的命令
- 仅对架构、工作流语义、产品 UX、真实来源或长期运行协调风险路由深度 Grill-Me
- 仅对长期运行、批处理、多 Feature、AFK 或 HITL 协调路由 Feature DAG 概念
- 不要对低风险补丁或小型增量任务强制深度 Grill-Me
- 不要对普通单功能规划暴露 Feature DAG 概念
- 当配置可用时，对所有 guide 文本使用 `output.language`

## 参考文件

- `skills/init/SKILL.md`
- `skills/plan/SKILL.md`
- `skills/start/SKILL.md`
- `skills/resume/SKILL.md`
- `skills/patch/SKILL.md`
- `skills/compact/SKILL.md`
- `skills/audit/SKILL.md`
- `skills/release/SKILL.md`
- `references/progressive-discover-spec.md`
- `SKILL.md`
