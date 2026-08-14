---
authority_role: record
confidence: high
created_at: 2026-07-11T20:39:36+08:00
dedupe_key: project:c21:m5-reference-bootstrap-cutover-contract
id: requirement-0b44d0a7bf7713ab3abf4290cb265b6c
kind: requirement
level: guideline
schema_version: '1'
scope:
  ref: project:hypo-workflow
  type: project
semantic_hash: 0b44d0a7bf7713ab3abf4290cb265b6c6f462c5bc72eeab8fcc31d9f1df79772
source_refs:
  - locator: .pipeline/prompts/04-reference-repository-bootstrap-and-schema-activation.md
    ref: >-
      .pipeline/prompts/04-reference-repository-bootstrap-and-schema-activation.md#Objective; Requirements; Technical
      Route; Audit Focus
    type: legacy_file
  - locator: .pipeline/reports/C21-core-cutover-bootstrap-scope.md
    ref: .pipeline/reports/C21-core-cutover-bootstrap-scope.md#兼容策略; Bootstrap 顺序; 本仓库历史提炼; 激活本仓库
    type: legacy_file
supersedes: []
updated_at: 2026-07-11T20:39:36+08:00
---
C21-M5 converts only history whose absence could materially change a future decision. It is an internal Bootstrap Job for this repository, not a public migration command. Extractors, Curator, and Auditor produce proposals only; an independent audit checks coverage, inference, schema, sources, and privacy; one deterministic writer owns IDs, dedupe, supersedes compilation, indexes, staging, Capsule, Pack, Snapshot, and activation. Activate the manifest last, freeze all legacy writers, retain a usable rollback checkpoint until the Bootstrap checkpoint is accepted, resume C21 in a fresh process from a valid Pack, prove all post-activation writes use only new zones, and prove legacy state.yaml, cycle.yaml, and log.yaml are unchanged. Do not import raw chat/tool logs/secrets, delete tracked legacy files, dual-write, or migrate arbitrary repositories. Derive only a redacted fixed CI fixture from the reference workspace.
