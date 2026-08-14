---
authority_role: record
confidence: high
created_at: 2026-07-12T00:21:05+08:00
dedupe_key: project:lifecycle:transaction-and-derived-coherence
id: decision-795ced1ac2116be9b101b6abea1eb41f
kind: decision
level: guideline
schema_version: '1'
scope:
  ref: project:hypo-workflow
  type: project
semantic_hash: 795ced1ac2116be9b101b6abea1eb41fe8b16070e9c08168d476c83783166f03
source_refs:
  - locator: .pipeline/archives/C5-hypo-workflow-c5-follow-up-ai-coding-workflow-redesign/summary.md
    ref: >-
      .pipeline/archives/C5-hypo-workflow-c5-follow-up-ai-coding-workflow-redesign/summary.md#Milestone 摘要 / M03, M07,
      M08
    type: legacy_file
  - locator: .pipeline/reports/00-workspace-format-transaction-kernel-and-legacy-write-fence.report.md
    ref: >-
      .pipeline/reports/00-workspace-format-transaction-kernel-and-legacy-write-fence.report.md#Completion Narrative;
      Delivered Architecture; Test Results
    type: legacy_file
  - locator: .pipeline/reports/02-recovery-journal-capsule-and-pack-engine.report.md
    ref: >-
      .pipeline/reports/02-recovery-journal-capsule-and-pack-engine.report.md#Completion Narrative; Delivered
      Architecture; Architecture Plan Review
    type: legacy_file
  - locator: .pipeline/archives/C20-consultation-first-action-boundary/knowledge-summary.md
    ref: >-
      legacy-file:.pipeline/archives/C20-consultation-first-action-boundary/knowledge-summary.md#Pitfalls: C4-M05
      state/prompt_state drift
    type: legacy_file
supersedes: []
updated_at: 2026-07-12T08:15:40+08:00
---
Lifecycle mutations use deterministic transaction and invariant checks, and every derived active, prompt, or continuation pointer must be regenerated coherently with the authoritative object update. Resume must reject or repair a mismatched authority/projection pair and use validated Recovery Packs for bounded restoration. Historical lease, watchdog, and platform-handoff details are not promoted as current authority.
