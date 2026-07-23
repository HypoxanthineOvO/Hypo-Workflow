---
authority_role: record
confidence: high
created_at: 2026-07-12T02:42:16+08:00
dedupe_key: project:safety:high-impact-gates-and-scoped-automation
id: requirement-7d0c723bd96e2dc4b5cebd990e72be76
kind: requirement
schema_version: '1'
scope:
  ref: project:hypo-workflow
  type: project
semantic_hash: 7d0c723bd96e2dc4b5cebd990e72be76421d7e7ad60bafaa3dd88c5435704493
source_refs:
  - locator: .pipeline/archives/C10-experience-optimizations/summary.md
    ref: .pipeline/archives/C10-experience-optimizations/summary.md#Milestones M2
    type: legacy_file
  - locator: .pipeline/archives/C11-workflow-experience-issues/cycle.yaml
    ref: .pipeline/archives/C11-workflow-experience-issues/cycle.yaml#cycle.summary
    type: legacy_file
  - locator: .pipeline/archives/C11-workflow-experience-issues/summary.md
    ref: .pipeline/archives/C11-workflow-experience-issues/summary.md#里程碑 M3
    type: legacy_file
  - locator: .pipeline/archives/C12-workflow-deep-plan-discussion/summary.md
    ref: .pipeline/archives/C12-workflow-deep-plan-discussion/summary.md#关键数据 > 已知限制
    type: legacy_file
  - locator: .pipeline/archives/C9-configuration-governance-pr-explain-claude-resume/cycle.yaml
    ref: >-
      .pipeline/archives/C9-configuration-governance-pr-explain-claude-resume/cycle.yaml#cycle.lifecycle_policy.gates
      and cycle.lessons[1]
    type: legacy_file
  - locator: .pipeline/archives/C9-configuration-governance-pr-explain-claude-resume/cycle.yaml
    ref: .pipeline/archives/C9-configuration-governance-pr-explain-claude-resume/cycle.yaml#cycle.lifecycle_policy.gates
    type: legacy_file
  - locator: .pipeline/reports/01-runtime-records-receipts-and-snapshots.report.md
    ref: .pipeline/reports/01-runtime-records-receipts-and-snapshots.report.md#Completion Narrative; Delivered Architecture
    type: legacy_file
supersedes: []
updated_at: 2026-07-12T08:15:40+08:00
---
Destructive or external operations, plugin installation, user-level configuration writes, remote PR/MR writes, Release publication, and remote clone/download require explicit, scope-bound human authorization. Local preparation without remote effects may precede the gate. Durable automation preferences cannot silently waive these boundaries; current authorization is represented by exact, single-use, drift-sensitive Receipts rather than a broad whitelist flag.
