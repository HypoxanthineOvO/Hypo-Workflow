---
authority_role: record
confidence: confirmed
created_at: 2026-08-09T03:33:00.248Z
dedupe_key: project:hypo-workflow:requirement:plan-discussion-scope-gate
id: requirement-f5aec7e7196c5c58f19143b8a139f1f1
kind: requirement
level: constraint
schema_version: '1'
scope:
  ref: project:hypo-workflow
  type: project
semantic_hash: f5aec7e7196c5c58f19143b8a139f1f1ca019ff1300503f79fd536dec3cd0f8a
source_refs:
  - locator: user-confirmed Plan discussion and Proposal transition semantics
    ref: conversation/plan-discussion-scope-gate-2026-08-09
    type: user_turn
supersedes: []
updated_at: 2026-08-09T03:33:00.248Z
---
# Plan discussion scope gate

Plan defaults to a guided planning discussion. Unless the user explicitly asks the Agent to generate a Plan directly from the supplied requirements, the Agent must first discuss the work through relevant Discover, Technical, Architecture, and other scope-specific topics.

Before writing a Proposal, the Agent must:

1. establish a clear, user-visible discussion scope;
2. discuss every item in that scope;
3. recap the scoped items and explicitly ask the user whether they have all been discussed sufficiently and whether Proposal writing may begin.

Only the user’s explicit confirmation at that checkpoint authorizes Proposal writing. Statements such as “可以”, “对”, agreement with an idea, or positive feedback on an intermediate recommendation confirm that content only; they do not close Discussion, authorize Proposal writing, or authorize execution.

Proposal approval and execution authorization remain a later, separate gate. The Agent must never collapse discussion completion, Proposal writing, Proposal approval, and execution start into one inferred transition.
