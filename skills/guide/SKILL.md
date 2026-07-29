---
name: guide
description: Inspect the repository and recommend one available Hypo-Workflow path. Use for /hw:guide only when the user is unsure whether to initialize, continue Discussion, use Goal or Plan, manage experiments, maintain, resume, accept, or reject.
---

# Guide

## 输出语言规则

用户可见内容遵循项目输出语言；缺失时跟随当前对话语言。内部 schema key 保持英文。

Guide is a read-only intent router. Detect workspace class, inspect the active Delivery reference, and query `discoverableCommandMap` so recommendations reflect real Child Skill backends. Recommend one next path.

- Empty, brownfield, or legacy workspace: recommend `/hw:init`.
- A fully discussed outcome with zero manual intermediate Stones: recommend `/hw:goal`.
- A fully discussed outcome with at least one manual intermediate Stone: recommend `/hw:plan`.
- Active unfinished Delivery: recommend `/hw:resume`.
- Pending final acceptance: recommend `/hw:accept` or `/hw:reject` according to user intent.
- Focused day-to-day project fact: recommend `/hw:maintain`.
- Non-linear experiment setup, reruns, scans, supervision, result review, or instant project experiment status: recommend `/hw:experiment`.
- Missing requirements, technical-stack, or architecture decisions: recommend continuing Discussion before selecting Goal or Plan.

Guide is optional and read-only. Init must not recommend Guide as a ritual next step. Recommend one next path only when the user is unsure, and explain what it will do. Do not advertise internal, deferred, removed, or missing-backend commands.
