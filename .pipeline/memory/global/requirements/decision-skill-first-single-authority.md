---
authority_role: record
confidence: high
created_at: 2026-07-11T20:24:08+08:00
dedupe_key: project:architecture:skill-first-single-authority
id: decision-3e48a8089466f514641d26f4a9c6a94c
kind: decision
level: guideline
schema_version: '1'
scope:
  ref: project:hypo-workflow
  type: project
semantic_hash: 3e48a8089466f514641d26f4a9c6a94cfe894d17c9f059c34558b42b952055ef
source_refs:
  - locator: .pipeline/architecture.md
    ref: .pipeline/architecture.md#Product Boundary; Physical Layout
    type: legacy_file
  - locator: .pipeline/reports/C21-unified-architecture-design.md
    ref: .pipeline/reports/C21-unified-architecture-design.md#核心原则; 权威分配
    type: legacy_file
supersedes:
  - decision-4ecdd3bbde809617de5ad30b081373f2
updated_at: 2026-07-11T20:24:08+08:00
---
Hypo-Workflow is a Skill-first protocol and control layer, not a runner. The host Agent performs reasoning, implementation, testing, and review; deterministic Core owns schema, transactions, Records, Receipts, recovery, lifecycle transitions, adapter payloads, and mechanical gates. Every fact has one authority. Platform adapters only project behavior. Runtime and memory are local/ignored; accepted or explicit checkpoint Snapshots may enter Git. A valid new manifest selects the new writer, while a damaged manifest fails closed and never falls back to legacy writers.
