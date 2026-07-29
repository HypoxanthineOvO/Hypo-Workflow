---
authority_role: record
confidence: confirmed
created_at: 2026-07-23T14:58:18.865Z
dedupe_key: project:vspi:plan-binding-version-boundary
id: decision-2ac6733ee109b6f73b33d8627b7cac6d
kind: decision
schema_version: '1'
scope:
  ref: project:hypo-workflow
  type: project
semantic_hash: 2ac6733ee109b6f73b33d8627b7cac6dd6d2d9d748d4bb27abb11933c39fcc3e
source_refs:
  - locator: confirmed scope and model-group decision
    ref: conversation/vspi-workflow-symbiosis-2026-07-23
    type: user_turn
supersedes: []
updated_at: 2026-07-23T14:58:18.865Z
---
# VSPi Plan binding version boundary

VSPi 0.1.0 keeps its current Plan capability level. Workflow-backed Plan binding is designed for VSPi 0.2.0. The end state has one canonical Plan authority in Hypo-Workflow rather than permanent dual writes between a VSPi LocalPlanBackend and Workflow storage.

The file-backed context retrieval concept remains experimental and may be specified without being implemented in the first delivery.
