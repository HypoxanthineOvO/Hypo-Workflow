---
authority_role: record
confidence: confirmed
created_at: 2026-08-03T10:49:11.049Z
dedupe_key: goal.experiment-protocol-hooks-simplification.plan
id: decision-7522350fd2ff83aefca8abe125106027
kind: decision
level: reference
schema_version: '1'
scope:
  ref: experiment-protocol-hooks-simplification
  type: goal
semantic_hash: 7522350fd2ff83aefca8abe125106027bcc310a1c78fe91c1008724d71bcd1ab
source_refs:
  - locator: compiled-plan
    ref: goal:experiment-protocol-hooks-simplification:revision:0
    type: delivery_plan
supersedes: []
updated_at: 2026-08-03T10:49:11.049Z
---

# 实验记录与 Hooks 非阻塞化计划

实验以普通文件协议可运行可记录，不依赖 Hook；未绑定 Session 不得被 Hook 阻塞。已落地：hooks 精简为四类提醒事件。
