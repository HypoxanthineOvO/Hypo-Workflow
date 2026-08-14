---
authority_role: record
confidence: confirmed
created_at: 2026-07-23T15:09:27.927Z
dedupe_key: project:vspi:uninitialized-plan-requires-explicit-init
id: decision-d95fcf9dbd4704b7cf3aba5a0735bfb7
kind: decision
level: guideline
schema_version: '1'
scope:
  ref: project:hypo-workflow
  type: project
semantic_hash: d95fcf9dbd4704b7cf3aba5a0735bfb77cc1f2f844da877873deb06cb575c78c
source_refs:
  - locator: restored answer for uninitialized Plan behavior
    ref: conversation/vspi-workflow-symbiosis-2026-07-23
    type: user_turn
supersedes: []
updated_at: 2026-07-23T15:09:27.927Z
---

# 未初始化时 Plan 需要显式 init

项目未初始化时 Plan 不得静默创建结构；必须先显式 /hw:init。
