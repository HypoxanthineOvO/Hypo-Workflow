---
authority_role: record
confidence: 0.99
created_at: 2026-07-12T07:08:38+08:00
dedupe_key: project:hypo-workflow:decision:source-managed-target-owned-boundary
id: decision-7417f3deb203b117c5aaef25684c8533
kind: decision
level: guideline
schema_version: '1'
scope:
  ref: project:hypo-workflow
  type: project
semantic_hash: 7417f3deb203b117c5aaef25684c8533ab1287720362824ac30e40e6a4435716
source_refs:
  - locator: .pipeline/archives/C20-consultation-first-action-boundary/cycle.yaml
    ref: >-
      legacy-file:.pipeline/archives/C20-consultation-first-action-boundary/cycle.yaml#cycle.summary and
      cycle.continuations
    type: legacy_file
  - locator: .pipeline/archives/C20-consultation-first-action-boundary/summary.md
    ref: legacy-file:.pipeline/archives/C20-consultation-first-action-boundary/summary.md#改动摘要, C20-M4, and 风险与后续
    type: legacy_file
supersedes: []
updated_at: 2026-07-12T07:08:38+08:00
---

# 源端管理面与目标自有面的边界

源端 direct sync 只覆盖源自有管理面（共享指引、命令/agent 指令、适配器、文档合同、测试、release checklist）；目标自有面（每模型 prompt、运行时调优、提醒措辞）必须走目标本地 Cycle，源端不得直接写。
