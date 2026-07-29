---
name: guide
description: Inspect the repository and recommend one available Hypo-Workflow path. Use for /hw:guide only when the user is unsure whether to initialize, continue Discussion, use Goal or Plan, manage experiments, maintain, resume, accept, or reject.
---

# Guide

## 输出语言规则

用户可见内容遵循项目输出语言；缺失时跟随当前对话语言。内部 schema key 保持英文。

Guide is a read-only intent router. Detect workspace class, inspect all non-terminal Work Items and the current Session binding, and query `discoverableCommandMap` so recommendations reflect real Child Skill backends. `active.delivery` is only a legacy foreground hint; it never proves that another Goal, Plan, Cycle, or Experiment cannot run. Recommend one next path.

- Empty, brownfield, or legacy workspace: recommend `/hw:init`.
- A fully discussed outcome with zero manual intermediate Stones: recommend `/hw:goal`.
- A fully discussed outcome with at least one manual intermediate Stone: recommend `/hw:plan`.
- One unfinished Delivery selected by the current Session: recommend `/hw:resume`.
- Multiple runnable Work Items with no current Session binding: show their bounded identities and require the user to select exactly one before recommending Resume or Experiment. Never silently inherit `active.delivery` and never mix two Work Items in one Session.
- Pending final acceptance: recommend `/hw:accept` or `/hw:reject` according to user intent.
- Focused day-to-day project fact: recommend `/hw:maintain`.
- Non-linear experiment setup, reruns, scans, supervision, result review, or instant project experiment status: recommend `/hw:experiment`.
- Missing requirements, technical-stack, or architecture decisions: recommend continuing Discussion before selecting Goal or Plan.

Guide is optional and read-only. Init must not recommend Guide as a ritual next step. Recommend one next path only when the user is unsure, and explain what it will do. Do not advertise internal, deferred, removed, or missing-backend commands.

Before recommending concurrent execution, inspect Repository Target and resource claims. Pinned read/execute claims may share a checkout only when snapshots and outputs are compatible. Source-changing work requires an isolated worktree and a registered integration target; GPU, port, mutable cache, and output conflicts require resource isolation or a blocked result.
