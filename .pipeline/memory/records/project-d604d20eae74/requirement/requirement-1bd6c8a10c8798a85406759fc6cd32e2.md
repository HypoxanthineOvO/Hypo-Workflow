---
authority_role: record
confidence: confirmed
created_at: 2026-07-23T15:13:36.548Z
dedupe_key: project:concurrency:multi-workstream-multi-model
id: requirement-1bd6c8a10c8798a85406759fc6cd32e2
kind: requirement
schema_version: '1'
scope:
  ref: project:hypo-workflow
  type: project
semantic_hash: 1bd6c8a10c8798a85406759fc6cd32e2fab9bc3da74686dd83ba4aa510cacedc
source_refs:
  - locator: multi-task concurrency and crash-safe lock requirements
    ref: conversation/vspi-workflow-symbiosis-2026-07-23
    type: user_turn
supersedes: []
updated_at: 2026-07-23T15:13:36.548Z
---
# Concurrent Workstreams and models

One project must support multiple active task contexts at the same time. Two or more VSPi Sessions may use different models to develop different parts concurrently, whether those contexts belong to one Delivery or separate Deliveries.

Each concurrent Workstream must isolate its Session binding, model or Auto Group resolution, continuation, evidence, recovery state, and declared code ownership. A single global active Delivery must not prevent independent work. Conflicting writes to the same authority object or overlapping code scope must be detected rather than silently overwritten.
