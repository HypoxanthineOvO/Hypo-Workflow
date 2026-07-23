---
name: cycle
description: Compatibility route for legacy Cycle requests. New work should use Goal for zero Stones or Plan for one or more manual Stones.
---

# Legacy Cycle Compatibility

## 输出语言规则

用户可见内容遵循项目输出语言；缺失时跟随当前对话语言。内部 schema key 保持英文。

`/hw:cycle` remains readable and executable for existing v14 Runtime objects and explicit compatibility requests. Do not recommend it for new work. Run Discussion, then route new work by Stone count: zero Stones to `/hw:goal`, one or more Stones to `/hw:plan`.

Use the Root Core Call Contract: import from the installed bundle, pass the target workspace as `root`, create the store with an explicit zero-argument Clock, and give every mutation a unique safe `{ id }`. Issue transition Receipts only after the host has shown the full binding and received explicit user confirmation.

1. Preserve existing Cycle plans with `compileCyclePlan` and their aggregate final acceptance behavior. Persist with `proposeCycle`; this compatibility path does not create Plan Stones.
2. Do not silently reinterpret an existing Cycle Milestone as a Stone.
3. For a newly requested manual checkpoint, generate a Plan with `compilePlan` instead of extending the legacy Cycle contract.
4. After topology is fixed and before each Worker starts, have the host Agent generate and show a bounded Task Assessment, validate it, and select a deterministic semantic Worker Routing class. Persist the decision in Runtime/Continuation and Worker Journal evidence; never persist the generating prompt.
5. Apply `execution.worker_routing.mode` without changing role separation: `off` omits hints, `advisory` records fallback, and `required` blocks an unsupported semantic handoff.
6. Verify each Milestone in order with the selected worker topology. Only after all Milestones verify may aggregate Cycle verification run.
7. Move only the aggregate Cycle to `pending_acceptance`, then route one Cycle-level manual gate to `/hw:accept` or `/hw:reject`.

Revision creates Feedback plus a superseding Plan Record, resets revised Milestones to pending, and requires renewed approval and explicit start.

Completion chat includes the change summary, technical approach, modified modules, test design, validation result, expected behavior, encountered problems, and remaining risks. New-format Records replace legacy Knowledge Ledger archival; never write or delete legacy `.pipeline/knowledge/` from this Skill.
