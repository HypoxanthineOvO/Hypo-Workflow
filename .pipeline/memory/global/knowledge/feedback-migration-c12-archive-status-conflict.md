---
authority_role: record
confidence: 0.99
created_at: 2026-07-12T07:07:51+08:00
dedupe_key: migration/c12-archive-status-conflict
id: feedback-8442e50a859a28f7393182f66666ac79
kind: feedback
level: reference
schema_version: '1'
scope:
  ref: project:hypo-workflow
  type: project
semantic_hash: 8442e50a859a28f7393182f66666ac791e59065bbb21d5b4782a5f2f4b061fce
source_refs:
  - locator: .pipeline/archives/C12-workflow-deep-plan-discussion/cycle.yaml
    ref: >-
      .pipeline/archives/C12-workflow-deep-plan-discussion/cycle.yaml#cycle.status, cycle.finished absence,
      cycle.summary, and cycle.lessons
    type: legacy_file
  - locator: .pipeline/archives/C12-workflow-deep-plan-discussion/summary.md
    ref: .pipeline/archives/C12-workflow-deep-plan-discussion/summary.md#基本信息 > 状态/结束时间 and 里程碑
    type: legacy_file
supersedes: []
updated_at: 2026-07-12T07:07:51+08:00
---

# 教训：归档迁移的状态冲突要显式解决

经验：迁移时新旧归档状态冲突要显式处理，不能静默覆盖。
