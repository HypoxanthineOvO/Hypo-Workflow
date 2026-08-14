---
authority_role: record
confidence: confirmed
created_at: 2026-07-23T15:41:38.768Z
dedupe_key: project:vspi:concurrent-workstream-crashsafe-architecture
id: decision-884fd919aa8a5fb6b64bdb00e7d2405e
kind: decision
level: guideline
schema_version: '1'
scope:
  ref: project:hypo-workflow
  type: project
semantic_hash: 884fd919aa8a5fb6b64bdb00e7d2405e8a0fe561b3956f3c88e9998eef99c851
source_refs:
  - locator: confirmed concurrent Workstream and crash-safe recovery architecture
    ref: conversation/vspi-workflow-symbiosis-2026-07-23
    type: user_turn
supersedes: []
updated_at: 2026-07-23T15:41:38.768Z
---
# Concurrent Workstream and crash-safe recovery architecture

Hypo-Workflow supports multiple non-terminal Deliveries and multiple independently recoverable Workstreams in one project. A Workstream reuses the activity authority kind and binds one VSPi Session to a parent Delivery or work item, model-selection state, Continuation, evidence, recovery context, and code-scope claim.

The global active pointer becomes a compatibility foreground rather than an exclusivity gate. Session bindings choose the current Workstream in VSPi. Delivery milestone scheduling follows the dependency DAG and may expose multiple ready claims.

Long Agent turns hold no global writer lock. Core commits use a short atomic writer lease with owner token, expiry or heartbeat, fencing validation, expected object revisions, and automatic pending-transaction recovery. A crash or forced kill cannot permanently block project entry or unrelated work. Ambiguous external drift fails closed only for conflicting writes and produces actionable evidence.

The initial implementation remains portable within Node.js and file-backed authority. It does not introduce process management, a native flock dependency, a daemon, or a database.
