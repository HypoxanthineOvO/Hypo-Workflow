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
**Source/target ownership boundary.** The Hypo-Workflow source repository may own shared behavior contracts, common guidance, managed source adapters, documentation contracts, tests, and handoff matrices. Per-model prompts, runtime prompt tuning, provider behavior, and target-local reminder wording remain target-owned and require a separately scoped target-local Cycle; source closure must not silently write them.
