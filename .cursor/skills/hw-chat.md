---
name: hw-chat
description: "Hypo-Workflow Cursor skill for /hw-chat; use when the user invokes /hw-chat or canonical /hw:chat."
---

# /hw-chat

Canonical command: `/hw:chat`
Cursor command: `/hw-chat`
Route: `lifecycle`
Embedded authority source: `skills/chat/SKILL.md`

## Cursor Execution

1. Treat this file as the command-specific Cursor Skill for the requested `/hw-*` command.
2. Read `.cursor/skills/hypo-workflow.md` when global routing, output-language, or shared runtime rules are needed.
3. Execute the canonical `/hw:chat` semantics using the embedded command authority below and any user-provided arguments.
4. Before writes, inspect `.pipeline/config.yaml`, `.pipeline/cycle.yaml`, `.pipeline/state.yaml`, and `.pipeline/rules.yaml` when present.
5. Do not treat Hypo-Workflow as a runner; Cursor Agent performs the actual work and records evidence in project files when the active command owns those writes.
6. Cursor chooses the active model in the UI/session; treat provider-specific model defaults as non-Cursor examples and do not write or recommend them unless explicitly requested.

## Command Skill Authority

---
name: chat
description: Enter lightweight append conversation mode when the user wants to continue discussing or make small follow-up changes without opening a new Milestone or Patch immediately.
---

# /hypo-workflow:chat
## 输出语言规则

📌 输出语言规则：
读取 config.yaml → output.language
- zh-CN / zh：所有用户可见的输出使用中文（PROGRESS、报告、状态提示、错误消息、交互提问）
- en：使用英文
- auto：跟随用户对话语言
内部日志（log.yaml、state.yaml）始终英文。

当用户调用 `/hw:chat` 或 `/hypo-workflow:chat` 时使用此技能。

## Prerequisites

- `.pipeline/state.yaml` 存在
- 存在可重新加载的现有 Workflow 上下文

## Steps

1. 读取 `.pipeline/state.yaml`、`.pipeline/cycle.yaml`、`.pipeline/PROGRESS.md` 以及最新的报告（如果存在）。
2. 进入轻量级追加对话模式，不打开新的 Milestone。
3. 将讨论和小编辑保留在聊天日志中，而不是 Milestone 报告中。
4. 在 `/hw:chat end` 时，根据需要写入摘要或保持最小的聊天条目持久化。
5. 当聊天范围不再轻量级时，建议升级到 `/hw:patch`。

## References

- `references/chat-spec.md` — 聊天模式契约
- `references/commands-spec.md` — 命令语义
- `references/state-contract.md` — `chat:` 状态形状
- `references/log-spec.md` — `chat_entry` 和 `chat_session`
- `references/progress-spec.md` — `💬 Chat` 时间线行
- `SKILL.md` — 更广泛的系统上下文
