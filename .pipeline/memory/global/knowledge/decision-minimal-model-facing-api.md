---
authority_role: record
confidence: confirmed
created_at: 2026-08-05T13:13:32.287Z
dedupe_key: project:hypo-workflow:decision:minimal-model-facing-api
id: decision-1f7e3053d8cb524eb82f5767729de8fe
kind: decision
level: reference
schema_version: '1'
scope:
  ref: project:hypo-workflow
  type: project
semantic_hash: 1f7e3053d8cb524eb82f5767729de8fe9c1a95f89c94cb8bdc8ec7537a3edf52
source_refs:
  - locator: user-selected Markdown and YAML templates instead of model-facing write APIs
    ref: conversation/template-first-recording-2026-08-05
    type: user_turn
supersedes:
  - decision-f9aca98c5a8cdd4bac459a87dc6fe9e9
updated_at: 2026-08-05T13:13:32.287Z
---
# Template-first recording without routine write APIs

Hypo-Workflow exposes no routine model-facing write API for Cycle, Plan, Progress, Execution, Memory, or Experiment records. Capable models maintain these records directly through ordinary file operations using concise Markdown templates with YAML frontmatter and semantic paths.

Markdown contains the human-readable purpose, reasoning, progress, result, evidence labels, and next action. YAML frontmatter contains only the small structured fields needed for indexing and relationships, such as kind, semantic name, status, dates, scope, Cycle or Experiment relationship, and supersession.

Core may provide optional validation, semantic index rebuilding, conflict detection, and one-time History Refresh. These helpers check or derive structure but do not replace the model as the ordinary record writer. Internal hashes or transaction details remain invisible implementation metadata when retained.

Templates must be short enough that a capable model can understand and write them without a specialized API. Hooks remind the model to update the relevant file after meaningful checkpoints; they do not require a tool call.
