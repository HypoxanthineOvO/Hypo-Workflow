---
authority_role: record
confidence: confirmed
created_at: 2026-08-05T13:03:43.472Z
dedupe_key: project:hypo-workflow:requirement:concurrent-cycle-semantics
id: requirement-435705add0ce2146eb6606977c1a3474
kind: requirement
level: constraint
schema_version: '1'
scope:
  ref: project:hypo-workflow
  type: project
semantic_hash: 435705add0ce2146eb6606977c1a34745e01bda59057c1ab5c8a24f59adf32e8
source_refs:
  - locator: user-confirmed parallel Cycle use case
    ref: conversation/concurrent-cycles-2026-08-05
    type: user_turn
supersedes: []
updated_at: 2026-08-05T13:03:43.472Z
---

# 并发 Cycle 语义

允许多个 active Cycle 并存；源码修改需要 worktree 隔离和明确集成目标；资源冲突需要隔离或暂停。一个 Session 只聚焦一个 Cycle。
