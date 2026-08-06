---
authority_role: record
confidence: confirmed
created_at: 2026-08-05T12:58:12.830Z
dedupe_key: project:hypo-workflow:requirement:model-tiered-plan-and-progress
id: requirement-d05a9d83934ed8ea84a5adc6664808da
kind: requirement
schema_version: '1'
scope:
  ref: project:hypo-workflow
  type: project
semantic_hash: d05a9d83934ed8ea84a5adc6664808dab4fbd4fc6383447a8670c295b0c1bfd0
source_refs:
  - locator: user-confirmed minimal Plan contract and detailed worker handoff
    ref: conversation/model-tiered-plan-and-progress-2026-08-05
    type: user_turn
supersedes: []
updated_at: 2026-08-05T12:58:12.830Z
---
# Model-tiered Plan and progress contract

A Plan for a capable lead model should be minimal and outcome-oriented. Its essential contents are:

- a clear execution objective;
- a clear execution boundary;
- a verifiable completion target;
- an explicit progress record location that the model keeps current throughout execution.

Creating a Plan without updating its progress is a Workflow failure. Progress updates must remain visible and useful to the user, not merely exist as internal lifecycle metadata.

Detailed execution instructions belong in a task-specific Handoff, not in every Plan. When a capable lead model delegates to a less capable worker model, the lead should generate the additional detail that worker needs, including bounded scope, relevant context, concrete inputs and outputs, constraints, ordered actions when necessary, and verification evidence. The detail level should adapt to worker capability.

Journal exists to help the model find relevant prior conversation and work context. Models should retrieve Journal context semantically by current work, topic, and recency. Hashes and integrity structures may remain internal implementation details, but should not burden ordinary planning, progress updates, or resume behavior.
