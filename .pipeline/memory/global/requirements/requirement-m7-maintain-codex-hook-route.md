---
authority_role: record
confidence: high
created_at: 2026-07-11T20:49:59+08:00
dedupe_key: project:c21:m7-maintain-codex-hook-route
id: requirement-0718546aea18774ae04dbee96cef9c50
kind: requirement
level: guideline
schema_version: '1'
scope:
  ref: project:hypo-workflow
  type: project
semantic_hash: 0718546aea18774ae04dbee96cef9c5009a8a2a81eeafd5312771b154c9dcc64
source_refs:
  - locator: .pipeline/architecture.md
    ref: .pipeline/architecture.md#Codex Adapter Boundary
    type: legacy_file
  - locator: .pipeline/prompts/06-ambient-maintain-and-codex-hook-adapter.md
    ref: >-
      .pipeline/prompts/06-ambient-maintain-and-codex-hook-adapter.md#Objective; Requirements; Boundaries; Technical
      Solution
    type: legacy_file
supersedes: []
updated_at: 2026-07-11T20:49:59+08:00
---
C21-M7 implements ambient Maintain and the primary Codex adapter. Maintain records meaningful Journal/Inbox/Record deltas without taking a workflow pointer; optional cheap recorder workers return proposals only. Thin adapters cover SessionStart, UserPromptSubmit, PreToolUse, PermissionRequest, PostToolUse, PreCompact, PostCompact, SubagentStart, SubagentStop, and Stop; they inject bounded context, collect evidence, seal/restore Packs, and emit targeted deduplicated documentation/Record reminders. Hooks never infer authority or become the sole deletion boundary. Deletion requires a hashed Manifest, scoped Receipt, controlled executor and drift revalidation. OpenCode/Claude adapters, aggregate telemetry, cleanup execution, generic scheduling, and quota automation are out of M7 scope.
