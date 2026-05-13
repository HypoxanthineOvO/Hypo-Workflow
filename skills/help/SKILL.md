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

Use this skill to explain the 40 user-facing Hypo-Workflow commands and the internal watchdog skill.

## 指令分组

- Setup:
  - `setup`
- Pipeline:
  - `start`, `resume`, `status`, `skip`, `stop`, `report`, `chat`
- Plan:
  - `/hw:plan`, `/hw:plan:deep`, `/hw:plan:discover`, `/hw:plan:decompose`, `/hw:plan:generate`, `/hw:plan:confirm`, `/hw:plan:extend`, `/hw:plan:review`
- Lifecycle:
  - `init`, `cycle`, `accept`, `reject`, `patch`, `patch fix`, `release`
- Analysis/Review:
  - `check`, `audit`, `debug`
- Utility:
  - `sync`, `docs`, `compact`, `knowledge`, `guide`, `showcase`, `rules`, `help`, `reset`, `log`, `setup`, `explore`
- Internal:
  - `watchdog` (cron-only; hidden from normal quick help unless explicitly requested)

## 执行流程

1. By default, list all 40 user-facing commands grouped by category.
2. For a specific command, explain:
   - when to use it
   - required inputs or flags
   - reference files
3. Mention that `/hypo-workflow:setup` creates `~/.hypo-workflow/config.yaml` and that project config overrides global defaults.
4. Include a short subagent hint:
   - Codex Subagents are Codex/GPT runtime workers and must not be described as Claude, DeepSeek, Mimo, or other external model routing
   - Claude Code and other non-Codex platforms may use their own native delegation surfaces when configured
   - mixed mode can delegate individual steps through `step_overrides` only within the current platform's supported boundary
5. Mention that Codex still uses the root `SKILL.md` and `/hw:*` compatibility path.
6. Include `/hw:cycle`, `/hw:patch`, `/hw:patch fix`, `/hw:compact`, `/hw:guide`, `/hw:showcase`, `/hw:rules`, and `/hw:plan:extend` in normal help output.
7. Mention `/hw:watchdog` only when the user asks about watchdog or auto resume internals.

## 参考文件

- `SKILL.md` — full command list and system context
- `references/commands-spec.md` — parsing details
- `references/config-spec.md` — global config and subagent fallback rules
