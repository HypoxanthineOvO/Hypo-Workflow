---
name: goal
description: Discuss and deliver one bounded outcome autonomously with no manual intermediate Stone. Use for /hw:goal when a capable model can execute the full requirement contract after confirmation.
---

# Goal Delivery

## 输出语言规则

用户可见内容遵循项目输出语言；缺失时跟随当前对话语言。内部 schema key 保持英文。

A Goal is selected after Discussion when execution needs no manual intermediate Stone. It may still be complex, span many modules, and contain many acceptance criteria. Complexity and acceptance count never force Plan.

Use the Root Core Call Contract: import from the installed bundle, pass the target workspace as `root`, create the store with an explicit zero-argument Clock, and give every mutation a unique safe `{ id }`. Issue transition Receipts only after the host has shown the full binding and received explicit user confirmation.

1. Run Discussion in order: Discover requirements, resolve material Technical Stack choices, then resolve Architecture changes. Show each real artifact before moving on; skip a phase only with evidence that no decision exists.
2. Gather the complete outcome, scope, non-goals, acceptance criteria, constraints, repository evidence, risks, and Agent decision boundaries. Use `assessPlanReadiness`; ask only unresolved material questions.
3. Confirm that the proposed Stone list is empty, then compile with `compileGoalDesign`. Do not add `milestones` merely to represent internal implementation steps.
4. Select execution topology from coupling, parallel value, oracle strength, and risk. Default to the main Agent when delegation does not create clear value.
5. For each selected Worker, have the host Agent generate and show a bounded Task Assessment, validate it with `validateTaskAssessment`, and call `selectWorkerRouting`. Persist only the semantic decision and assessment, never the generating prompt.
6. Apply `execution.worker_routing.mode`: `off` omits the hint, `advisory` records an explicit unsupported-host fallback, and `required` blocks that Worker start when the semantic handoff is unavailable. Routing does not change topology or acceptance.
7. Persist the proposal with `createDeliveryStore(...).proposeGoal`; report the full requirement Design in chat.
8. Offer 确认并开始 / 确认但不开始 / 不确认. Plain affirmative replies mean 确认并开始: issue `delivery.approve_and_start` and call `approveAndStart` in the same authorized transition. 确认但不开始 uses `delivery.approve` and `waiting_to_start`.
9. After start, execute the full Goal continuously through the host's built-in Goal mechanism (`/Goal` where available), stopping only for a newly discovered material decision or a separately gated high-impact side effect.
10. Verify real file-bound evidence, request final acceptance, then use `/hw:accept` or `/hw:reject`.

Revision feedback writes Feedback plus a revised Design Record and returns to `needs_revision`; it never authorizes product edits or auto-starts.
