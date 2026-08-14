---
authority_role: record
confidence: high
created_at: 2026-07-11T20:24:08+08:00
dedupe_key: project:authority:user-directives-and-grants
id: decision-286fab099f28f9b92312fd13c0cc1a91
kind: decision
level: constraint
schema_version: '1'
scope:
  ref: project:hypo-workflow
  type: project
semantic_hash: 286fab099f28f9b92312fd13c0cc1a91062ea698010218fb16eda54330f7de54
source_refs:
  - locator: .pipeline/architecture.md
    ref: .pipeline/architecture.md#Command Exposure
    type: legacy_file
  - locator: .pipeline/reports/01-runtime-records-receipts-and-snapshots.report.md
    ref: .pipeline/reports/01-runtime-records-receipts-and-snapshots.report.md#Completion Narrative; Delivered Architecture
    type: legacy_file
  - locator: .pipeline/reports/C21-core-cutover-bootstrap-scope.md
    ref: .pipeline/reports/C21-core-cutover-bootstrap-scope.md#兼容策略
    type: legacy_file
  - locator: .pipeline/reports/C21-unified-architecture-design.md
    ref: .pipeline/reports/C21-unified-architecture-design.md#核心原则; 权威分配
    type: legacy_file
supersedes:
  - decision-7db62ec48d26f0a932ca534723106305
updated_at: 2026-07-12T08:15:40+08:00
---

# 用户指令与授权是执行边界

用户的明确指令与授权决定执行边界和动作范围；模型推断必须明确标记为推断，不能伪装成用户授权。接受/拒绝等动作只由用户明确表达触发。
