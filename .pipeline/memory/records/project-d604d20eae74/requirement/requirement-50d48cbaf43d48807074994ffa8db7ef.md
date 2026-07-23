---
authority_role: record
confidence: confirmed
created_at: 2026-07-23T15:13:36.548Z
dedupe_key: project:concurrency:crash-safe-nonblocking-coordination
id: requirement-50d48cbaf43d48807074994ffa8db7ef
kind: requirement
schema_version: '1'
scope:
  ref: project:hypo-workflow
  type: project
semantic_hash: 50d48cbaf43d48807074994ffa8db7efd0a3529467dff061f561d2aafbc6a1e5
source_refs:
  - locator: multi-task concurrency and crash-safe lock requirements
    ref: conversation/vspi-workflow-symbiosis-2026-07-23
    type: user_turn
supersedes: []
updated_at: 2026-07-23T15:13:36.548Z
---
# Crash-safe coordination cannot permanently block a workspace

No lock, lease, pending transaction, or active-session marker may permanently block a Hypo-Workflow workspace after terminal failure, host crash, forced kill, or abandoned process.

Coordination must distinguish a live owner from stale residue, support deterministic recovery or safe takeover, and prevent a stale prior owner from committing after takeover. Long-running Agent turns must not hold a global writer lock. Recovery should occur automatically at startup or before the next write when it is objectively safe; ambiguous drift must fail closed with actionable evidence rather than requiring blind lock deletion.
