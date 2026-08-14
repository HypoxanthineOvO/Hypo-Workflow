---
authority_role: record
confidence: confirmed
created_at: 2026-08-05T13:00:14.516Z
dedupe_key: project:hypo-workflow:requirement:human-readable-execution-records
id: requirement-03219cf1489b538bfb1f16efb2aab245
kind: requirement
level: constraint
schema_version: '1'
scope:
  ref: project:hypo-workflow
  type: project
semantic_hash: 03219cf1489b538bfb1f16efb2aab245f89df5294d3531114839454f599897cd
source_refs:
  - locator: user-confirmed importance and readability of execution records
    ref: conversation/human-readable-execution-records-2026-08-05
    type: user_turn
supersedes: []
updated_at: 2026-08-05T13:00:14.516Z
---

# 人类可读执行记录

Execution 以 checkpoint 追加人读进展；Progress 完整镜像 Plan 的全部 ID。记录是给人和后续 Session 读的，不是给机器对账的。
