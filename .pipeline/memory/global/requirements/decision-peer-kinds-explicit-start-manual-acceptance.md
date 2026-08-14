---
authority_role: record
confidence: high
created_at: 2026-07-11T20:24:08+08:00
dedupe_key: project:delivery:peer-kinds-explicit-start-manual-acceptance
id: decision-c4e0960f0e66eb2d26b63e12a1def59f
kind: decision
level: guideline
schema_version: '1'
scope:
  ref: project:hypo-workflow
  type: project
semantic_hash: c4e0960f0e66eb2d26b63e12a1def59f09dda02d010ae0009980fa89d17a451c
source_refs:
  - locator: .pipeline/archives/C4-knowledge-ledger-global-tui-acceptance-loop-explore-mode/summary.md
    ref: .pipeline/archives/C4-knowledge-ledger-global-tui-acceptance-loop-explore-mode/summary.md#L25-L27
    type: legacy_file
  - locator: .pipeline/archives/C5-hypo-workflow-c5-follow-up-ai-coding-workflow-redesign/cycle.yaml
    ref: .pipeline/archives/C5-hypo-workflow-c5-follow-up-ai-coding-workflow-redesign/cycle.yaml#cycle.lessons
    type: legacy_file
  - locator: .pipeline/archives/C6-claude-code-adapter-plugin-and-full-workflow-takeover/cycle.yaml
    ref: >-
      .pipeline/archives/C6-claude-code-adapter-plugin-and-full-workflow-takeover/cycle.yaml#cycle.lifecycle_policy.auto_continue
    type: legacy_file
  - locator: .pipeline/archives/C7-codex-service-effectiveness-and-workflow-governance/cycle.yaml
    ref: >-
      .pipeline/archives/C7-codex-service-effectiveness-and-workflow-governance/cycle.yaml#cycle.lifecycle_policy.auto_continue
    type: legacy_file
  - locator: .pipeline/archives/C8-experience-rules-review-rtl-codex-plugin/cycle.yaml
    ref: .pipeline/archives/C8-experience-rules-review-rtl-codex-plugin/cycle.yaml#cycle.lifecycle_policy.auto_continue
    type: legacy_file
  - locator: .pipeline/cycle.yaml
    ref: .pipeline/cycle.yaml#cycle.acceptance; cycle.lifecycle_policy
    type: legacy_file
  - locator: .pipeline/reports/C21-unified-architecture-design.md
    ref: .pipeline/reports/C21-unified-architecture-design.md#对象模型; Delivery 生命周期; 端到端场景
    type: legacy_file
supersedes: []
updated_at: 2026-07-12T08:15:40+08:00
---
Goal and Cycle are peer Main Delivery kinds. A Goal has one Design and no user-visible Milestone sequence; a Cycle has ordered Milestones, internal verification at Milestone boundaries, and one final Cycle-level manual acceptance gate. Maintain is ambient. Approval creates waiting_to_start, and only explicit start intent begins work. After that start, authorized execution may continue across ordinary internal Milestone boundaries without repeated approval, but scope, risk, remote-effect, revision, and acceptance gates remain binding. Direction-changing feedback creates needs_revision and a revised proposal rather than edit authorization. Successful Delivery ends only after a scoped acceptance Receipt.
