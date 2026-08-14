---
authority_role: record
confidence: confirmed
created_at: 2026-08-09T03:33:00.248Z
dedupe_key: project:hypo-workflow:requirement:plan-discussion-scope-gate
id: requirement-f5aec7e7196c5c58f19143b8a139f1f1
kind: requirement
level: constraint
schema_version: '1'
scope:
  ref: project:hypo-workflow
  type: project
semantic_hash: f5aec7e7196c5c58f19143b8a139f1f1ca019ff1300503f79fd536dec3cd0f8a
source_refs:
  - locator: user-confirmed Plan discussion and Proposal transition semantics
    ref: conversation/plan-discussion-scope-gate-2026-08-09
    type: user_turn
supersedes: []
updated_at: 2026-08-09T03:33:00.248Z
---

# Plan 讨论范围门

Plan 默认是引导式规划讨论。除非用户明确要求直接从需求生成 Plan，否则必须先按范围相关主题讨论。写 Proposal 前必须：1) 建立用户可见的讨论范围；2) 逐项讨论每一项；3) 复盘并明确询问是否已充分讨论、可否开始写 Proposal。只有用户在该检查点明确确认才授权写 Proposal；"可以/对"只确认对应内容，不关闭讨论、不授权写 Proposal、不授权执行。Proposal 批准与执行授权是后面的独立 gate，绝不把四步折叠成一次推断。
