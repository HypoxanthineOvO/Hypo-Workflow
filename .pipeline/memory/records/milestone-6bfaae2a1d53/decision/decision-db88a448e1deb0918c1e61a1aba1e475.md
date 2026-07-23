---
authority_role: record
confidence: confirmed
created_at: 2026-07-12T11:56:42+08:00
dedupe_key: c21:m5:bootstrap-activation-accepted
id: decision-db88a448e1deb0918c1e61a1aba1e475
kind: decision
schema_version: '1'
scope:
  ref: C21:M5
  type: milestone
semantic_hash: db88a448e1deb0918c1e61a1aba1e4754a0fe78d1ee282ae402da4bc8fb8ea4b
source_refs:
  - locator: .pipeline/reports/04-reference-repository-bootstrap-and-schema-activation.report.md
    ref: .pipeline/reports/04-reference-repository-bootstrap-and-schema-activation.report.md#m5-completion
    type: workflow_artifact
  - locator: .pipeline/reviews/C21/M5/architecture-plan-review.md
    ref: .pipeline/reviews/C21/M5/architecture-plan-review.md#impact
    type: workflow_artifact
  - locator: .pipeline/reviews/C21/M5/post-acceptance-regression-evidence.md
    ref: .pipeline/reviews/C21/M5/post-acceptance-regression-evidence.md#post-acceptance
    type: workflow_artifact
supersedes: []
updated_at: 2026-07-12T11:56:42+08:00
---
# C21-M5 Bootstrap activation accepted

The reference repository completed manifest-last activation and an explicit reconciliation acceptance. The immutable companion binds the sealed rollback checkpoint, verified Snapshot/File evidence, the four-file legacy freeze inventory, Manifest, and the coherent Recovery head. Post-acceptance focused and full regressions passed, the new writer path is active, and legacy lifecycle writers remain frozen.

M6 may start from the current Runtime and latest valid Recovery Pack. M7 and M8 must treat current authority plus Bootstrap acceptance, rollback, compatibility, and Pack evidence as protected unless a separately audited retention/replacement plan and fresh exact Receipt authorize a change.
