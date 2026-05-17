---
name: hw-help
description: "Hypo-Workflow Cursor skill for /hw-help; use when the user invokes /hw-help or canonical /hw:help."
---

# /hw-help

Canonical command: `/hw:help`
Cursor command: `/hw-help`
Route: `read`
Embedded authority source: `skills/help/SKILL.md`

## Cursor Execution

1. Treat this file as the command-specific Cursor Skill for the requested `/hw-*` command.
2. Read `.cursor/skills/hypo-workflow.md` when global routing, output-language, or shared runtime rules are needed.
3. Execute the canonical `/hw:help` semantics using the embedded command authority below and any user-provided arguments.
4. Before writes, inspect `.pipeline/config.yaml`, `.pipeline/cycle.yaml`, `.pipeline/state.yaml`, and `.pipeline/rules.yaml` when present.
5. Do not treat Hypo-Workflow as a runner; Cursor Agent performs the actual work and records evidence in project files when the active command owns those writes.
6. Cursor chooses the active model in the UI/session; treat provider-specific model defaults as non-Cursor examples and do not write or recommend them unless explicitly requested.

## Cursor Reference Resolution

- Local Cursor references live under `.cursor/skills/` and `.cursor/hypo-workflow/`.
- Source-repository paths mentioned by the embedded authority but absent from `.cursor/hypo-workflow/` are external/non-local for Cursor targets.
- Fallback: use the embedded command authority in this file first, then mirrored `.cursor/hypo-workflow/` resources; ask the user for source-repository context only if the missing external reference is required.

## Command Skill Authority

---
name: help
description: Show the full Hypo-Workflow command map when the user needs a quick reference or per-command usage details.
---

# /hypo-workflow:help
## 输出语言规则

📌 输出语言规则：
读取 config.yaml → output.language
- zh-CN / zh：所有用户可见的输出使用中文（PROGRESS、报告、状态提示、错误消息、交互提问）
- en：使用英文
- auto：跟随用户对话语言
内部日志（log.yaml、state.yaml）始终英文。

使用此技能来解释 41 个面向用户的 Hypo-Workflow 命令和内部 watchdog 技能。There are 41 user-facing Hypo-Workflow commands.

## 指令分组

- Setup:
  - `setup`
- Pipeline:
  - `start`, `resume`, `status`, `skip`, `stop`, `report`, `chat`, `analysis`
- Plan:
  - `/hw:plan`, `/hw:plan:deep`, `/hw:plan:discover`, `/hw:plan:decompose`, `/hw:plan:generate`, `/hw:plan:confirm`, `/hw:plan:extend`, `/hw:plan:review`
- Lifecycle:
  - `init`, `cycle`, `accept`, `reject`, `patch`, `patch fix`, `release`
- Analysis/Review:
  - `analysis`, `check`, `audit`, `debug`
- Utility:
  - `sync`, `docs`, `compact`, `knowledge`, `guide`, `showcase`, `rules`, `help`, `reset`, `log`, `setup`, `explore`
- Internal:
  - `watchdog`（仅 cron；除非明确请求，否则对正常快速帮助隐藏）

## 执行流程

1. 默认情况下，按类别分组列出所有 41 个面向用户的命令。
2. 对于特定命令，解释：
   - 何时使用它
   - 所需的输入或标志
   - 参考文件
3. 提及 `/hypo-workflow:setup` 创建 `~/.hypo-workflow/config.yaml`，并且项目配置覆盖全局默认值。
4. 包含简短的 subagent 提示：
   - Codex Subagents 是 Codex/GPT 运行时工作者，不得被描述为 Claude、DeepSeek、Mimo 或其他外部模型路由
   - Claude Code 和其他非 Codex 平台在配置时可以使用它们自己的原生委派表面
   - 混合模式只能在当前平台支持的边界内通过 `step_overrides` 委派单个步骤
5. 提及 Codex 仍然使用根 `SKILL.md` 和 `/hw:*` 兼容性路径。
6. 在正常帮助输出中包含 `/hw:cycle`、`/hw:patch`、`/hw:patch fix`、`/hw:compact`、`/hw:guide`、`/hw:showcase`、`/hw:rules` 和 `/hw:plan:extend`。
7. 仅在用户询问 watchdog 或自动恢复内部机制时提及 `/hw:watchdog`。

## 参考文件

- `SKILL.md` — 完整命令列表和系统上下文
- `references/commands-spec.md` — 解析细节
- `references/config-spec.md` — 全局配置和 subagent 回退规则
