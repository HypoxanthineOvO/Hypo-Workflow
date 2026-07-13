---
name: goal
description: Define and run one bounded Hypo-Workflow delivery outcome without fake Milestones. Use for /hw:goal or when the user wants one explicit acceptance target that a capable model can execute after approval.
---

# Goal Delivery

## 输出语言规则

用户可见内容遵循项目输出语言；缺失时跟随当前对话语言。内部 schema key 保持英文。

A Goal is a peer of Cycle: one Design, one execution boundary, and one final manual acceptance.

Use the Root Core Call Contract: import from the installed bundle, pass the target workspace as `root`, create the store with an explicit zero-argument Clock, and give every mutation a unique safe `{ id }`. Issue transition Receipts only after the host has shown the full binding and received explicit user confirmation.

1. Gather outcome, acceptance criteria, constraints, and repository evidence. Use `assessPlanReadiness`; ask only unresolved material questions.
2. Compile with `compileGoalDesign`. Do not add `milestones`.
3. Select execution topology from task size and policy.
4. Persist the proposal with `createDeliveryStore(...).proposeGoal`; report the Design in chat.
5. Approval uses a scoped `delivery.approve` Receipt and moves only to `waiting_to_start`.
6. Begin work only after a separate explicit-start intent and `delivery.start` Receipt.
7. Verify real file-bound worker evidence, request final acceptance, then use `/hw:accept` or `/hw:reject`.

Revision feedback writes Feedback plus a revised Design Record and returns to `needs_revision`; it never authorizes product edits or auto-starts.
