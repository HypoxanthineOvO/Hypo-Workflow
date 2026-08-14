---
authority_role: record
confidence: high
created_at: 2026-05-16T12:40:46+08:00
dedupe_key: project:c21:m6-goal-cycle-adaptive-plan-route
id: requirement-3586d0c048712ec796f9d90fb75be8f0
kind: requirement
level: guideline
schema_version: '1'
scope:
  ref: project:hypo-workflow
  type: project
semantic_hash: 3586d0c048712ec796f9d90fb75be8f0757922316536d5bc1a302f94d0ad32c0
source_refs:
  - locator: .pipeline/architecture.md
    ref: .pipeline/architecture.md#Delivery Lifecycle; Command Exposure
    type: legacy_file
  - locator: .pipeline/archives/C10-experience-optimizations/cycle.yaml
    ref: .pipeline/archives/C10-experience-optimizations/cycle.yaml#cycle.summary
    type: legacy_file
  - locator: .pipeline/archives/C10-experience-optimizations/summary.md
    ref: .pipeline/archives/C10-experience-optimizations/summary.md#Milestones M0
    type: legacy_file
  - locator: .pipeline/archives/C11-workflow-experience-issues/cycle.yaml
    ref: .pipeline/archives/C11-workflow-experience-issues/cycle.yaml#cycle.lessons[1]
    type: legacy_file
  - locator: .pipeline/archives/C11-workflow-experience-issues/summary.md
    ref: .pipeline/archives/C11-workflow-experience-issues/summary.md#里程碑 M2
    type: legacy_file
  - locator: .pipeline/archives/C12-workflow-deep-plan-discussion/summary.md
    ref: .pipeline/archives/C12-workflow-deep-plan-discussion/summary.md#里程碑 M0-M7 and 关键数据 > 最终决定
    type: legacy_file
  - locator: .pipeline/prompts/05-goal-cycle-delivery-core-and-adaptive-plan.md
    ref: >-
      .pipeline/prompts/05-goal-cycle-delivery-core-and-adaptive-plan.md#Objective; Requirements; Boundaries; Technical
      Route
    type: legacy_file
  - locator: .pipeline/archives/C19-workflow-core-content-and-plan-mode-optimization/cycle.yaml
    ref: >-
      legacy-file:.pipeline/archives/C19-workflow-core-content-and-plan-mode-optimization/cycle.yaml#cycle.summary and
      cycle.lessons
    type: legacy_file
  - locator: .pipeline/archives/C19-workflow-core-content-and-plan-mode-optimization/summary.md
    ref: >-
      legacy-file:.pipeline/archives/C19-workflow-core-content-and-plan-mode-optimization/summary.md#改动摘要 and Milestones
      C19-M1 through C19-M3
    type: legacy_file
  - locator: .pipeline/archives/C15-workflow-interaction-analysis-mode/cycle.yaml
    ref: 'legacy:C15/cycle#cycle.lessons: P2 technical route review'
    type: legacy_file
  - locator: .pipeline/archives/C15-workflow-interaction-analysis-mode/summary.md
    ref: 'legacy:C15/summary#Milestones: C15-M1 P2 Technical Route Gate'
    type: legacy_file
supersedes: []
updated_at: 2026-07-12T08:15:40+08:00
---
C21-M6 implements Goal and Cycle as peer Delivery kinds, adaptive planning, explicit start, separated execution, verification, Resume, manual Accept/Reject, and the exact nine-command surface. Goal uses one Design. Cycle uses ordered Milestones and one final acceptance. Plan first resolves configuration and inherited-state assumptions that materially affect discovery, abstracts user examples into general requirements, and shows the actual technical route and phase artifacts before a major gate. Depth is evidence-driven: concise Goal Design, standard Discover -> Technical Stack -> Architecture -> Decompose -> Generate for weaker models or complex work, and internal durable Deep Plan research when needed. Remove fixed min_rounds and stop asking when material ambiguity is resolved. Approval creates waiting_to_start; directional feedback creates needs_revision until explicit start. Maintain and Codex Hooks are M7, not M6.
