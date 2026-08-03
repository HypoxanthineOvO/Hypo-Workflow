---
name: reject
description: Reject the active Goal, Plan, or legacy Cycle at final manual acceptance with structured feedback. Use for /hw:reject or an explicit rejection of pending results.
---

# Reject Delivery

## 输出语言规则

用户可见内容遵循项目输出语言；缺失时跟随当前对话语言。内部 schema key 保持英文。

Require `pending_acceptance` and collect `problem`, `reproduce_steps`, `expected`, `actual`, and `context`. Issue a scoped `delivery.reject` Receipt, write one Feedback Record, and move the Delivery to `needs_revision`.

Import Core from the installed bundle, pass the target workspace as `root`, and create Delivery/Receipt stores with the same explicit zero-argument Clock. An explicit `/hw:reject` or unmistakable rejection statement is the authority for this action; do not ask the user to confirm rejection again. Validate and report the Receipt binding, then call `reject` with a unique safe mutation `{ id }`. If the correction feedback is incomplete, ask about the substantive mismatch rather than opening a Receipt gate.

Rejection never edits product files, generates a replacement proposal by itself, or starts execution.

Before presenting any revised Goal Design or Plan, discuss the rejection in chat:

1. Restate what is wrong and what the user expected instead.
2. Explain the current implementation or result, including relevant constraints.
3. Identify why the prior understanding or plan failed and which assumptions must change.
4. Describe the intended correction and its acceptance impact.
5. Show the affected Discover, Technical, and Architecture deltas, including an updated diagram when architecture changes.
6. Ask only unresolved questions that could materially change the correction. Do not replace this discussion with a Receipt or confirmation card.

If the feedback already contains an explicit correction and directs the Agent to apply it, further questions may be unnecessary, but the explanation and affected artifact deltas must still be shown. After the revised Proposal is visible, offer one choice: 确认并开始 / 确认但不开始 / 继续讨论. Do not ask for another ordinary execution confirmation after 确认并开始.
