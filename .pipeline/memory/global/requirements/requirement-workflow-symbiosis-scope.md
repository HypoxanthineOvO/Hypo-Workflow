---
authority_role: record
confidence: confirmed
created_at: 2026-07-23T14:58:18.865Z
dedupe_key: project:vspi:workflow-symbiosis-scope
id: requirement-64814bf483a3132383329915eb163c58
kind: requirement
level: guideline
schema_version: '1'
scope:
  ref: project:hypo-workflow
  type: project
semantic_hash: 64814bf483a3132383329915eb163c581d991f0a4a10a2dbd8eccba481d4fcc3
source_refs:
  - locator: confirmed scope and model-group decision
    ref: conversation/vspi-workflow-symbiosis-2026-07-23
    type: user_turn
supersedes: []
updated_at: 2026-07-23T14:58:18.865Z
---
# VSPi and Hypo-Workflow collaboration scope

Hypo-Workflow remains the project record and Workflow state truth. It manages canonical Plan authority and preserves discussion, ideas, decisions, execution evidence, logs, architecture, and recovery context; it is not a project-process manager.

The collaboration has three product concerns:

1. Hypo-Workflow manages the canonical Plan while VSPi provides the primary interaction and presentation surface.
2. A later experimental file-backed context retrieval path may use bounded stored context and on-demand project reads to reduce compaction cost.
3. Workflow task difficulty signals cooperate with VSPi model groups so the concrete model can change without changing Workflow authority.

Generic process ownership, service supervision, and operating-system process control are outside this design.
