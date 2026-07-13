---
name: maintain
description: Persist focused day-to-day project facts without opening a Goal or Cycle. Use for /hw:maintain and for ambient capture of requirements, preferences, decisions, or feedback in a current workspace.
---

# Maintain

Maintain records project facts; it does not create an ordered Delivery.

## 输出语言规则

用户可见内容遵循项目 `output.language`；缺失时跟随当前对话语言。Schema key、配置 key、命令和路径保持英文。

## Explicit Maintain

For `/hw:maintain`:

1. Confirm the concrete fact, source, scope, and whether it supersedes an active fact.
2. Classify it as `requirement`, `preference`, `decision`, or `feedback`.
3. Create a secret-safe `RecordPatch` with a stable dedupe key and explicit source references.
4. Persist through `commitRecordPatch` and refresh `.pipeline/memory/index.yaml` plus `INDEX.md`.
5. Explain the saved fact, scope, confidence, superseded fact if any, and Record reference in chat.

If the request has a bounded deliverable and final acceptance, route to Goal. If it has ordered dependent stages, route to Cycle.

## Ambient Maintain

The Official Codex `UserPromptSubmit` Hook may extract a clean durable semantic delta. `createAmbientMaintainStore` first appends a Recovery Journal event and stages a proposal under `.pipeline/memory/inbox/`. A staged Inbox item is not Record authority.

Only the main Agent may validate and promote the exact staged `RecordPatch`. A recorder Subagent may propose a patch, but cannot commit authority. Promotion verifies the proposal binding, writes the Markdown Record, and refreshes derived indexes. Duplicate semantic facts are deduplicated; changed facts require explicit `supersedes`.

`PostToolUse` records bounded evidence and emits only relevant, deduplicated documentation or Record reminders. It does not force a write after every tool call.

## Safety

Never persist raw passwords, tokens, credentials, hidden reasoning, or full transcripts. `secret_refs` may point to separately authorized secret locations, but secret values are not Workflow authority.

Write only through the current manifest-selected memory and recovery APIs. Never update legacy `state.yaml`, `cycle.yaml`, `log.yaml`, `PROGRESS.md`, `rules.yaml`, or `knowledge/`.
