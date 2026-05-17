---
name: hw-plan-extend
description: "Hypo-Workflow Cursor skill for /hw-plan-extend; use when the user invokes /hw-plan-extend or canonical /hw:plan:extend."
---

# /hw-plan-extend

Canonical command: `/hw:plan:extend`
Cursor command: `/hw-plan-extend`
Route: `plan`
Embedded authority source: `skills/plan-extend/SKILL.md`

## Cursor Execution

1. Treat this file as the command-specific Cursor Skill for the requested `/hw-*` command.
2. Read `.cursor/skills/hypo-workflow.md` when global routing, output-language, or shared runtime rules are needed.
3. Execute the canonical `/hw:plan:extend` semantics using the embedded command authority below and any user-provided arguments.
4. Before writes, inspect `.pipeline/config.yaml`, `.pipeline/cycle.yaml`, `.pipeline/state.yaml`, and `.pipeline/rules.yaml` when present.
5. Do not treat Hypo-Workflow as a runner; Cursor Agent performs the actual work and records evidence in project files when the active command owns those writes.
6. Cursor chooses the active model in the UI/session; treat provider-specific model defaults as non-Cursor examples and do not write or recommend them unless explicitly requested.

## Cursor Reference Resolution

- Local Cursor references live under `.cursor/skills/` and `.cursor/hypo-workflow/`.
- Source-repository paths mentioned by the embedded authority but absent from `.cursor/hypo-workflow/` are external/non-local for Cursor targets.
- Fallback: use the embedded command authority in this file first, then mirrored `.cursor/hypo-workflow/` resources; ask the user for source-repository context only if the missing external reference is required.

## Command Skill Authority

---
name: plan-extend
description: Append new milestones to an active Cycle without closing or reopening the Cycle.
---

# /hypo-workflow:plan:extend
## 输出语言规则

📌 输出语言规则：
读取 config.yaml → output.language
- zh-CN / zh：所有用户可见的输出使用中文（PROGRESS、报告、状态提示、错误消息、交互提问）
- en：使用英文
- auto：跟随用户对话语言
内部日志（log.yaml、state.yaml）始终英文。

当用户调用 `/hw:plan:extend` 或 `/hypo-workflow:plan:extend` 时使用此 skill。

此命令使用附加 Milestone 扩展当前活动 Cycle。它绝不能重新编号现有 Milestone 或重写已执行的提示。

## 前置条件

- `.pipeline/cycle.yaml` 存在且 `cycle.status=active`
- `.pipeline/state.yaml` 存在
- `.pipeline/prompts/` 存在或可以创建

如果没有活动 Cycle，停止并告诉用户首先运行 `/hw:cycle new "名称"`。如果 `state.yaml` 缺失，停止并要求用户在扩展之前初始化或规划 Cycle。

## 执行流程

1. 读取 `.pipeline/config.yaml`、`.pipeline/cycle.yaml` 和 `.pipeline/state.yaml`。
2. 显示当前 Cycle 元数据：
   - Cycle 编号和名称
   - preset
   - 当前 Milestone 计数
   - 已完成、进行中、延迟和待处理的 Milestone
3. 从 `state.yaml` 和提示文件名中列出现有 Milestone。
4. 使用 M0 规则进入交互式提问：
   - 至少 1 轮提问
   - 询问 2-3 个有针对性的问题
   - 总结收集的意图
   - 在用户明确确认之前不继续
5. 提出附加 Milestone 拆分。
6. 等待用户确认拆分。
7. 在 `.pipeline/prompts/` 下生成新的提示文件。
8. 将新的 Milestone 记录附加到 `.pipeline/state.yaml`。
9. 如果 `.pipeline/PROGRESS.md` 存在则更新它：刷新顶部元数据、Milestone 表和时间线表，而不是附加一行松散的事件。
10. 将生命周期事件附加到 `.pipeline/log.yaml`。

## 编号规则

- 从以下位置找到当前最高 Milestone 编号：
  - 现有 `state.yaml` Milestone
  - `.pipeline/prompts/` 下的提示文件名
- 新 Milestone 从最大值 + 1 开始。
- 不要重新编号现有 Milestone。
- 不要重新排序现有 Milestone。
- 提示文件名应遵循现有的本地命名约定，例如 `03-new-scope.md` 在 `02-existing.md` 之后。

## 交互规则

`/hw:plan:extend` 使用更轻量级的 M0 交互门控版本，因为 Cycle 已经存在：

- 至少询问 1 轮有针对性的问题
- 使用轻量级 Progressive Discover：先询问任务类别、期望效果和验证方法
- 不要静默推断缺失的范围细节
- 总结将要附加的内容
- 在写入文件之前需要明确确认
- 如果用户只说"确认一下"，将其视为总结请求，而不是写入许可

## Prompt 生成

每个附加的提示必须包括：

- 目标
- 实现范围
- 测试或验证规范
- 当 Worker Separation 为 `recommended` 或 `strict`，或附加工作需要独立验证时，包含 `Subworker Assignment Plan`
- 该计划中恰好三个工作器角色：`test`、`implement` 和 `audit`，包含范围、预期证据、不重叠规则和生命周期要求
- 当 Codex 执行子工作器未授权时，包含 `blocked_until_authorized` 加上启动/恢复授权门控
- 预期产物
- 对先前 Milestone 的依赖
- 解决的 Patch ID 或延迟项（如相关）

除非用户明确要求自定义每 Milestone 流程，否则使用活动 Cycle preset。

## 状态更新

附加 Milestone 条目而不重写现有记录。如果旧状态缺少 `status`，请保留其形状并为新条目添加所需的最小字段。

示例附加条目：

```yaml
- name: "M4: 增量报表"
  status: pending
  deferred_reason: null
  prompt_file: "04-incremental-report.md"
```

当该字段存在时，更新 `pipeline.prompts_total` 以包含附加的提示。

## 安全边界

- 从此命令绝不创建新 Cycle
- 绝不归档当前 Cycle
- 绝不删除或截断 `.pipeline/prompts/`
- 除非用户明确要求并确认确切文件，否则绝不重写已完成的提示文件

## 参考文件

- `skills/plan/SKILL.md` — M0 交互规则
- `skills/plan-decompose/SKILL.md` — P2 检查点行为
- `plan/assets/prompt-template.md` — 提示形状
- `references/state-contract.md` — Milestone 字段
- `SKILL.md` — 命令路由
