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

Use this skill when the user invokes `/hw:chat` or `/hypo-workflow:chat`.

## 前置条件

- `.pipeline/state.yaml` exists
- there is an existing Workflow context to reload

## 执行流程

1. Read `.pipeline/state.yaml`, `.pipeline/cycle.yaml`, `.pipeline/PROGRESS.md`, and the most recent report when present.
2. Enter lightweight append conversation mode without opening a new Milestone.
3. Keep discussion and small edits in chat log rather than Milestone report.
4. On `/hw:chat end`, write a summary when needed or keep minimal chat entry persistence.
5. When the chat scope stops being lightweight, recommend upgrading to `/hw:patch`.

## 参考文件

- `references/chat-spec.md` — chat mode contract
- `references/commands-spec.md` — command semantics
- `references/state-contract.md` — `chat:` state shape
- `references/log-spec.md` — `chat_entry` and `chat_session`
- `references/progress-spec.md` — `💬 Chat` timeline rows
- `SKILL.md` — broader system context
