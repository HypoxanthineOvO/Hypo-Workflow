---
authority_role: record
confidence: high
created_at: 2026-07-12T00:21:05+08:00
dedupe_key: project:c21:m1-accepted-kernel-baseline
id: decision-c4b2db75360785e04a5e0ee61100abf6
kind: decision
level: guideline
schema_version: '1'
scope:
  ref: project:hypo-workflow
  type: project
semantic_hash: c4b2db75360785e04a5e0ee61100abf6192ca626f12a6de3d887e3df631ee903
source_refs:
  - locator: .pipeline/reports/00-workspace-format-transaction-kernel-and-legacy-write-fence.report.md
    ref: >-
      .pipeline/reports/00-workspace-format-transaction-kernel-and-legacy-write-fence.report.md#Completion Narrative;
      Delivered Architecture; Test Results
    type: legacy_file
  - locator: .pipeline/reviews/C21/M1/final-audit.md
    ref: .pipeline/reviews/C21/M1/final-audit.md#Conclusion; Closure Matrix; Residual risk
    type: legacy_file
supersedes: []
updated_at: 2026-07-12T00:21:05+08:00
---
C21-M1 is accepted with final audit PASS. It delivered canonical YAML/frontmatter/hashing, six-class zero-write workspace detection, recoverable manifest-last transactions with staged/target hash validation and deterministic recovery, and a central fence covering 22 project mutation families. Final validation was focused 76/76 and full 752/752. Non-blocking limits remain: no cross-process transaction lock, no fsync-backed marker durability, and no generic typed path-ownership guarantee beyond the certified writer inventory.
