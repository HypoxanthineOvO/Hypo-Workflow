---
name: maintain
description: Persist one focused day-to-day project fact without opening a Goal or Cycle. Use for /hw:maintain when the user wants a bounded writing, maintenance, decision, preference, requirement, or feedback record stored in the current workspace.
---

# Focused Maintain

## 输出语言规则

用户可见内容遵循项目输出语言；缺失时跟随当前对话语言。内部 schema key 保持英文。

This release supports explicit focused recording only. It does not provide ambient Hooks, background capture, global queues, remote writes, or automation.

1. Confirm the concrete fact and its source.
2. Classify it as requirement, preference, decision, or feedback.
3. Create one scoped Markdown Record with `createRecordPatch` and persist it with `commitRecordPatch`.
4. Write only under the current manifest-based `.pipeline/memory/` authority. Never update legacy `state.yaml`, `cycle.yaml`, `log.yaml`, `PROGRESS.md`, or `knowledge/`.
5. Report the substance of the saved fact in chat.

If the request is actually a deliverable with acceptance, route to Goal or Cycle. Automatic session recording and Hook reminders are deferred to the adapter milestone.
