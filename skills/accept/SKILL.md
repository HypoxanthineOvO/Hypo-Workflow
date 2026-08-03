---
name: accept
description: Accept the active Goal, Plan, or legacy Cycle at its final pending acceptance gate. Use for /hw:accept or an explicit user acceptance statement.
---

# Accept Delivery

## 输出语言规则

用户可见内容遵循项目输出语言；缺失时跟随当前对话语言。内部 schema key 保持英文。

Require the active Delivery to be `pending_acceptance`. Build the exact `delivery.accept` Receipt context from current Runtime, issue the user-scoped Receipt, then call `store.accept`.

Import Core from the installed bundle, pass the target workspace as `root`, and create Delivery/Receipt stores with the same explicit zero-argument Clock. An explicit `/hw:accept` or unmistakable acceptance statement is the authority for this action; do not ask the user to confirm acceptance again. Validate and report the Receipt binding, then call `accept` with a unique safe mutation `{ id }`. Stop only if the active object, scope, result, or acceptance meaning is ambiguous or has changed since the user's statement.

Reject stale plan, state, scope, actor, object, or reused Receipt bindings. Acceptance changes only final Delivery state to `accepted`; Plan Stones have already been accepted at their scoped intermediate gates, while ordinary Milestones remain verification-only.

Explain the delivered result, verification evidence, remaining risks, and acceptance effect directly in chat.
