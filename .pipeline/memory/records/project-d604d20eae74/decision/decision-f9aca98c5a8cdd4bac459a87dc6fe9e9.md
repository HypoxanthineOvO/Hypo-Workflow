---
authority_role: record
confidence: confirmed
created_at: 2026-08-05T13:13:10.409Z
dedupe_key: project:hypo-workflow:decision:minimal-model-facing-api
id: decision-f9aca98c5a8cdd4bac459a87dc6fe9e9
kind: decision
schema_version: '1'
scope:
  ref: project:hypo-workflow
  type: project
semantic_hash: f9aca98c5a8cdd4bac459a87dc6fe9e9aa9920cd996a85d06e8c6f0e13534ea1
source_refs:
  - locator: user-selected files-only Experiment records
    ref: conversation/minimal-model-facing-api-2026-08-05
    type: user_turn
supersedes: []
updated_at: 2026-08-05T13:13:10.409Z
---
# Minimal model-facing API

Routine model-facing Workflow APIs are limited to three semantic capabilities:

- Cycle lifecycle and focus management;
- atomic human-readable Progress and Execution checkpoint recording;
- scoped durable Memory recording and revision.

History Refresh is a one-time migration entry rather than a routine API.

Plan, Discover, Technical notes, Cycle Summary, Experiment definitions, Experiment Attempts, indexes, and Resume context are maintained through human-readable semantic Markdown or YAML files. Experiment uses files only and has no dedicated model-facing Core write API.

Receipts, hashes, transactions, Journal segments, Packs, routing, integrity metadata, and index refresh implementation remain internal and are not described in ordinary command prompts.
