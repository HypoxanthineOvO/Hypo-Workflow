---
authority_role: record
confidence: 0.99
created_at: 2026-07-12T07:08:38+08:00
dedupe_key: project:hypo-workflow:decision:integration-sync-internal-release-gate
id: decision-7a63d8b82a42e5fbae1f8462542de1da
kind: decision
schema_version: '1'
scope:
  ref: project:hypo-workflow
  type: project
semantic_hash: 7a63d8b82a42e5fbae1f8462542de1da90fd2a971f5db30ada1a030d755173f5
source_refs:
  - locator: .pipeline/archives/C18-instruction-quality-review-and-integration-sync-plan/cycle.yaml
    ref: legacy-file:.pipeline/archives/C18-instruction-quality-review-and-integration-sync-plan/cycle.yaml#cycle.summary
    type: legacy_file
  - locator: .pipeline/archives/C18-instruction-quality-review-and-integration-sync-plan/summary.md
    ref: >-
      legacy-file:.pipeline/archives/C18-instruction-quality-review-and-integration-sync-plan/summary.md#C18-M4 through
      C18-M6 and 完成说明
    type: legacy_file
supersedes: []
updated_at: 2026-07-12T07:08:38+08:00
---
**Integration-sync boundary.** Treat downstream adapter synchronization as an internal development and release gate after source changes, not as a public user command. Target adaptation must be explicitly scoped, validated in the target, and recorded on the target side.
