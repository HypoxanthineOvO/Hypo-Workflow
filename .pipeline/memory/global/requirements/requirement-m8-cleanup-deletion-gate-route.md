---
authority_role: record
confidence: high
created_at: 2026-07-11T20:39:36+08:00
dedupe_key: project:c21:m8-cleanup-deletion-gate-route
id: requirement-aec5ac2b5d0b0f1cf2bd5a0f66d544ae
kind: requirement
level: guideline
schema_version: '1'
scope:
  ref: project:hypo-workflow
  type: project
semantic_hash: aec5ac2b5d0b0f1cf2bd5a0f66d544ae57ffbd1e860e3261e5e0d1578b13d499
source_refs:
  - locator: .pipeline/prompts/07-surface-cleanup-deletion-gate-and-release-ready-regression.md
    ref: >-
      .pipeline/prompts/07-surface-cleanup-deletion-gate-and-release-ready-regression.md#Objective; Hard Gate;
      Requirements; Technical Route
    type: legacy_file
  - locator: .pipeline/reports/C21-core-cutover-bootstrap-scope.md
    ref: .pipeline/reports/C21-core-cutover-bootstrap-scope.md#仓库清理
    type: legacy_file
supersedes: []
updated_at: 2026-07-11T20:39:36+08:00
---
C21-M8 starts only after M7 by rescanning the live dependency graph and classifying each candidate as delete, retain_internal, or deferred_hidden. It may generate the complete Deletion Manifest but may not delete anything until the full decision context is shown in chat and the user issues a fresh exact deletion.execute Receipt. Any path hash or relevant Git-state drift invalidates the Receipt. The controlled batch must remove registry/generator sources before derived artifacts, prove regeneration cannot revive removed or deferred surfaces, preserve unrelated changes, update the Codex-facing package/docs, run behavior-based Skill evaluations and full regression, and finish with independent audit. C21 itself still closes through manual acceptance after M8; no Deletion Manifest approval can be inferred from general Cycle authorization.
