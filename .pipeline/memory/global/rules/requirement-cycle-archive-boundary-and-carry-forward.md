---
authority_role: record
confidence: confirmed
created_at: 2026-08-05T13:02:36.977Z
dedupe_key: project:hypo-workflow:requirement:cycle-archive-boundary-and-carry-forward
id: requirement-9e85ffcb9852a0271e71c8167cc8c07a
kind: requirement
level: constraint
schema_version: '1'
scope:
  ref: project:hypo-workflow
  type: project
semantic_hash: 9e85ffcb9852a0271e71c8167cc8c07ae42ffa9e995954d35527493c0b423724
source_refs:
  - locator: user-confirmed Cycle motivation and archive continuity requirement
    ref: conversation/cycle-archive-boundary-2026-08-05
    type: user_turn
supersedes: []
updated_at: 2026-08-05T13:02:36.977Z
---

# Cycle 归档边界与显式继承

历史 Cycle 只读归档，绝不自动把旧任务带进新 Cycle；需要延续时通过 builds_on 显式引用并只选择性继承。放弃的 Cycle 也要保留可读原因。
