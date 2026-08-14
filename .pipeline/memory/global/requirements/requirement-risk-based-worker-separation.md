---
authority_role: record
confidence: high
created_at: 2026-07-11T20:24:08+08:00
dedupe_key: project:execution:risk-based-worker-separation
id: requirement-4867abfc7866a9f8d11677e284c4375b
kind: requirement
level: guideline
schema_version: '1'
scope:
  ref: project:hypo-workflow
  type: project
semantic_hash: 4867abfc7866a9f8d11677e284c4375b18ece72be7a17f19498fbb6904c915af
source_refs:
  - locator: .pipeline/architecture.md
    ref: .pipeline/architecture.md#Worker Separation; Bootstrap Cutover
    type: legacy_file
  - locator: .pipeline/archives/C10-experience-optimizations/cycle.yaml
    ref: .pipeline/archives/C10-experience-optimizations/cycle.yaml#cycle.summary
    type: legacy_file
  - locator: .pipeline/archives/C11-workflow-experience-issues/cycle.yaml
    ref: .pipeline/archives/C11-workflow-experience-issues/cycle.yaml#cycle.lessons[2]
    type: legacy_file
  - locator: .pipeline/archives/C11-workflow-experience-issues/summary.md
    ref: .pipeline/archives/C11-workflow-experience-issues/summary.md#里程碑 M4
    type: legacy_file
  - locator: .pipeline/archives/C8-experience-rules-review-rtl-codex-plugin/summary.md
    ref: .pipeline/archives/C8-experience-rules-review-rtl-codex-plugin/summary.md#Milestones / M04-M06 and Review Evidence
    type: legacy_file
  - locator: .pipeline/prompts/05-goal-cycle-delivery-core-and-adaptive-plan.md
    ref: .pipeline/prompts/05-goal-cycle-delivery-core-and-adaptive-plan.md#Requirements; Technical Route item 8
    type: legacy_file
supersedes: []
updated_at: 2026-07-12T08:15:40+08:00
---

# 基于风险的 Worker 分离（历史）

曾按风险等级决定 test/implement/audit 角色分离；机器已随 C027 拆除，日常由主模型直接执行。
