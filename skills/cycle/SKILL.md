---
name: cycle
description: Define and run a multi-stage Hypo-Workflow delivery with ordered Milestones and one final manual acceptance. Use for /hw:cycle or work whose stages have real dependency order.
---

# Cycle Delivery

## 输出语言规则

用户可见内容遵循项目输出语言；缺失时跟随当前对话语言。内部 schema key 保持英文。

A Cycle is a peer Main Delivery, not a wrapper around Goal.

Use the Root Core Call Contract: import from the installed bundle, pass the target workspace as `root`, create the store with an explicit zero-argument Clock, and give every mutation a unique safe `{ id }`. Issue transition Receipts only after the host has shown the full binding and received explicit user confirmation.

1. Resolve material ambiguity and compile an ordered non-empty plan with `compileCyclePlan`.
2. Milestones contain outcomes, dependencies, and verification criteria, but never user acceptance gates.
3. Persist with `proposeCycle`; approval moves only to `waiting_to_start`.
4. Require a separate start Receipt. Start only the first runnable Milestone.
5. Verify each Milestone in order with the selected worker topology. Only after all Milestones verify may aggregate Cycle verification run.
6. Move only the aggregate Cycle to `pending_acceptance`, then route one Cycle-level manual gate to `/hw:accept` or `/hw:reject`.

Revision creates Feedback plus a superseding Plan Record, resets revised Milestones to pending, and requires renewed approval and explicit start.

Completion chat includes the change summary, technical approach, modified modules, test design, validation result, expected behavior, encountered problems, and remaining risks. New-format Records replace legacy Knowledge Ledger archival; never write or delete legacy `.pipeline/knowledge/` from this Skill.
