---
name: hw-plan-deep
description: "Hypo-Workflow Cursor skill for /hw-plan-deep; use when the user invokes /hw-plan-deep or canonical /hw:plan:deep."
---

# /hw-plan-deep

Canonical command: `/hw:plan:deep`
Cursor command: `/hw-plan-deep`
Route: `plan`
Embedded authority source: `skills/plan-deep/SKILL.md`

## Cursor Execution

1. Treat this file as the command-specific Cursor Skill for the requested `/hw-*` command.
2. Read `.cursor/skills/hypo-workflow.md` when global routing, output-language, or shared runtime rules are needed.
3. Execute the canonical `/hw:plan:deep` semantics using the embedded command authority below and any user-provided arguments.
4. Before writes, inspect `.pipeline/config.yaml`, `.pipeline/cycle.yaml`, `.pipeline/state.yaml`, and `.pipeline/rules.yaml` when present.
5. Do not treat Hypo-Workflow as a runner; Cursor Agent performs the actual work and records evidence in project files when the active command owns those writes.
6. Cursor chooses the active model in the UI/session; treat provider-specific model defaults as non-Cursor examples and do not write or recommend them unless explicitly requested.

## Command Skill Authority

---
name: plan-deep
description: Run a durable Deep Plan discussion package before ordinary Hypo-Workflow planning.
---

# /hypo-workflow:plan:deep

## 输出语言规则

读取 `.pipeline/config.yaml` -> `output.language`。

- `zh-CN` / `zh`：用户可见的讨论笔记、readiness 报告和摘要使用中文。
- `en`：使用英文。
- `auto`：跟随用户的对话语言。
- 内部 YAML key 保持英文。

当用户调用 `/hw:plan:deep` 或 `/hw:plan --deep` 时使用此 Skill。

Deep Plan 是一个持久化的 pre-plan 讨论生命周期。适用于需求、产品形态、架构、模块边界或长期开发顺序尚未准备好进行普通 `/hw:plan` 分解的场景。

## Boundary

- Deep Plan 不是 `/hw:guide`；`/hw:guide` 仍然是引导和路由入口，而 Deep Plan 是一个显式的 discussion package 生命周期。
- Deep Plan 不是 `/hw:explore`；`/hw:explore` 仍然是有界的假设验证和代码库探索，而 Deep Plan 捕获需求、架构推理、决策和 readiness。
- Deep Plan is not `/hw:explore`; `/hw:explore` remains bounded codebase exploration while Deep Plan owns durable discussion packages.
- Deep Plan 不得直接执行 implementation milestones。
- Deep Plan 不得绕过普通 `/hw:plan` 的 P1-P4 gates。Conversion 创建 Plan 输入；普通 Plan 仍然控制 decomposition、generation 和 confirmation。

## Durable Discussion Package

创建并维护一个持久化的 discussion package：

```text
.pipeline/deep-plans/DP001-slug/
```

该 package 是 discussion cycle 的 source of truth。使用下一个可用的 `DPxxx` 编号，从用户标题 slugify 而来。

推荐的 package 文件：

- `deep-plan.yaml`：机器可读的 source of truth，包含 status、target depth、tracks、decisions、open questions、risks 和 conversion state。
- `summary.md`：紧凑的人类可读讨论摘要。
- `architecture.yaml`：机器可读的 components、edges、relationships、assumptions 和未解决的架构问题。
- `architecture.md`：从机器可读源渲染的 Mermaid 和 Markdown 视图。
- `tracks.yaml`：活跃的 requirement 和 module tracks，包括 dependencies 和 conflicts。
- `readiness.md`：readiness 报告和 blockers。
- `plan-context.md`：`convert` 后用于普通 `/hw:plan` 的紧凑上下文。

机器可读的源文件是 authoritative。Mermaid/Markdown 视图是为人类生成的派生内容，应尽可能从结构化源刷新。

## Operations

支持的操作：

- `new`：创建新的持久化 discussion package 并初始化 `drafting`。
- `ask`：继续 first-principles questioning 并更新 tracks、decisions、risks 和 open questions。
- `research`：执行本地只读研究并将证据添加到 package。
- `map`：生成或刷新 architecture components、relationships 和 Mermaid/Markdown 视图。
- `drill`：进入一个 requirement、theme、component 或 module 进行聚焦提问。
- `readiness`：评估 package 是否准备好进行 directional、architecture-ready 或 implementation-ready conversion。
- `convert`：创建紧凑的普通 Plan 输入，同时保留 readiness blockers 和未解决的问题。

## Lifecycle States

允许的 lifecycle states：

- `drafting`：初始问题框架、first-principles questioning 和粗略 tracks。
- `researching`：本地只读证据收集正在进行中。
- `architecture_mapping`：结构化的 architecture components 和 relationships 正在形成。
- `module_drilldown`：一个或多个 tracks 或 modules 正在进行聚焦 drilldown。
- `ready_for_plan`：所选 target depth 的 readiness 标准已满足或被有意识地放弃。
- `converted`：已为普通 `/hw:plan` 生成紧凑的 Plan context。
- `archived`：discussion package 已关闭供将来参考。

## Target Depth

Readiness 基于 target depth：

- `directional`：方向、问题地图、核心假设和未知数已明确；细节可能仍然开放。
- `architecture-ready`：需求、核心组件、relationships 和主要风险已足够清晰，可以进行架构推理。
- `implementation-ready`：需求、架构、module cards、testing matrix、执行顺序和风险处理已准备好输入普通 Plan。

缺失的字段仅在所选 target depth 要求时才是 blockers。一个 package 可以有意保持 directional 状态，稍后返回 `ask`、`research`、`map` 或 `drill`。

## First-Principles Questioning

Deep Plan 应在分解之前对不明确的需求进行压力测试：

- 什么真正的痛点或约束使这成为必要
- 为什么提议的形态现在是必要的
- 最小可行的闭环是什么
- 什么证据会推翻这个方向
- 哪些陈述是实现习惯而非本质需求
- 什么验收信号证明讨论已为所选深度做好准备

除非用户要求进行 persona 分析，否则不要使用固定的 "who is the user" 检查清单。

## Convert Contract

`convert` 是从 discussion state 到普通 Plan 输入的显式可审计边界。

转换前：

1. 运行 `readiness`。
2. 展示 blockers、有意识的放弃、未解决的问题和所选 target depth。
3. 请求用户确认。
4. 写入 `plan-context.md` 并将 `deep-plan.yaml` 更新为 `converted`。

转换后，调用或推荐使用生成的上下文运行普通 `/hw:plan`。普通 `/hw:plan` 仍然必须运行 P0/P1/P2/P3/P4 gates，不得仅因为上下文来自 Deep Plan 就跳过 Discover、Decompose、Generate 或 Confirm。
