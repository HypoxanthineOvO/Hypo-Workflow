---
name: reject
description: Reject the active Goal, Plan, or legacy Cycle at final manual acceptance with structured feedback. Use for /hw:reject or an explicit rejection of pending results.
---

# Reject Delivery

## 输出语言规则

用户可见内容遵循项目输出语言；缺失时跟随当前对话语言。内部 schema key 保持英文。

Require `pending_acceptance` and collect `problem`, `reproduce_steps`, `expected`, `actual`, and `context`. Issue a scoped `delivery.reject` Receipt, write one Feedback Record, and move the Delivery to `needs_revision`.

Import Core from the installed bundle, pass the target workspace as `root`, and create Delivery/Receipt stores with the same explicit zero-argument Clock. Show the complete Receipt binding first; only after explicit user confirmation issue it, then call `reject` with a unique safe mutation `{ id }`.

Rejection never edits product files, generates a replacement proposal by itself, or starts execution. Present a revised Goal Design or Plan. At the renewed gate, ordinary confirmation means `delivery.approve_and_start`; “确认但不开始” alone moves to `waiting_to_start`.
