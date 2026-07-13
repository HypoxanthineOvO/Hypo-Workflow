---
name: guide
description: Inspect the repository and recommend one available Hypo-Workflow path. Use for /hw:guide or when the user is unsure whether to initialize, use Goal, use Cycle, maintain, resume, accept, or reject.
---

# Guide

## 输出语言规则

用户可见内容遵循项目输出语言；缺失时跟随当前对话语言。内部 schema key 保持英文。

Guide is a read-only intent router. Detect workspace class, inspect the active Delivery reference, and query `discoverableCommandMap` so recommendations reflect real Child Skill backends. Recommend one next path.

- Empty, brownfield, or legacy workspace: recommend `/hw:init`.
- One bounded outcome without meaningful stages: recommend `/hw:goal`.
- Ordered dependent stages with one final acceptance: recommend `/hw:cycle`.
- Active unfinished Delivery: recommend `/hw:resume`.
- Pending final acceptance: recommend `/hw:accept` or `/hw:reject` according to user intent.
- Focused day-to-day project fact: recommend `/hw:maintain`.
- Explicit request for design before choosing Goal/Cycle: recommend `/hw:plan`.

Recommend one next path and explain what it will do. Do not advertise internal, deferred, removed, or missing-backend commands.
