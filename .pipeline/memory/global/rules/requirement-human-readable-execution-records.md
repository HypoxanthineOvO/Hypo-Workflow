---
authority_role: record
confidence: confirmed
created_at: 2026-08-05T13:00:14.516Z
dedupe_key: project:hypo-workflow:requirement:human-readable-execution-records
id: requirement-03219cf1489b538bfb1f16efb2aab245
kind: requirement
level: constraint
schema_version: '1'
scope:
  ref: project:hypo-workflow
  type: project
semantic_hash: 03219cf1489b538bfb1f16efb2aab245f89df5294d3531114839454f599897cd
source_refs:
  - locator: user-confirmed importance and readability of execution records
    ref: conversation/human-readable-execution-records-2026-08-05
    type: user_turn
supersedes: []
updated_at: 2026-08-05T13:00:14.516Z
---
# Human-readable execution records

Execution records are a core Hypo-Workflow responsibility. They must let both the user and a future model understand what work was performed, how the plan changed, what evidence exists, where work is blocked, and what happens next.

Provide two human-readable surfaces:

- Progress is a compact current snapshot: objective, boundary, current status, completed work, active work, blockers, plan changes, verification state, and next action.
- Execution Log is a chronological semantic history explaining how the work reached its current state.

Record meaningful checkpoints rather than raw tool traffic. A useful execution entry includes the local time, actor or responsible role when relevant, intended step, action or change, result, evidence references with human labels, effect on the plan or progress, problems encountered, and next action. Do not expose bare test counts, UUIDs, hashes, Hook boundaries, or tool names without explanatory context.

Machine-readable Journal events, stable identifiers, and hashes may remain as internal recovery and integrity mechanisms. They must not be the primary reading surface. Human-readable execution records are first-class durable project information, not an optional stale projection. Final evidence reports complement the timeline but do not replace continuous progress and execution recording.
