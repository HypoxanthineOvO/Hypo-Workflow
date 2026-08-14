---
authority_role: record
confidence: confirmed
created_at: 2026-08-05T13:02:36.977Z
dedupe_key: project:hypo-workflow:requirement:cycle-archive-boundary-and-carry-forward
id: requirement-9e85ffcb9852a0271e71c8167cc8c07a
kind: requirement
level: constraint
schema_version: '1'
scope:
  ref: project:hypo-workflow
  type: project
semantic_hash: 9e85ffcb9852a0271e71c8167cc8c07ae42ffa9e995954d35527493c0b423724
source_refs:
  - locator: user-confirmed Cycle motivation and archive continuity requirement
    ref: conversation/cycle-archive-boundary-2026-08-05
    type: user_turn
supersedes: []
updated_at: 2026-08-05T13:02:36.977Z
---
# Cycle archive boundary and carry-forward

Cycle is the human-readable iteration and archive boundary for a project. It prevents milestones from distinct rounds of work, such as a demo and a later production implementation, from becoming one confusing continuous plan while preserving the complete history of each round.

Cycle is orthogonal to delivery planning: a project contains sequential Cycles, and a Cycle contains the Goal or Plan used for that round. Goal and Plan must not replace Cycle's archival responsibility.

Each Cycle should have a stable location from creation through closure. Closing a Cycle changes its lifecycle state, freezes its human-readable Plan, Progress, Execution Log, evidence, reports, decisions, and artifacts, and generates a concise Summary. Archival should not require moving active files to new paths or breaking references.

The project provides a human-readable Cycle index showing purpose, status, outcome, dates, relationship to other Cycles, and the Summary path. Default context loads project-level durable facts plus the active Cycle. Closed Cycles contribute only their Summary and explicitly relevant durable facts unless the user or model drills into their full record.

Starting a new Cycle creates a fresh objective, boundary, verification target, Plan, Progress, Execution Log, and Milestone namespace. Previous Milestones never carry forward automatically. The new Cycle may declare builds_on relationships and explicitly import selected accepted decisions, reusable artifacts, risks, lessons, deferred items, or follow-up candidates. Unselected historical detail stays archived.

Cycle closure must preserve:

- the round's purpose and execution boundary;
- final outcome and verification evidence;
- Plan and meaningful Plan changes;
- human-readable Progress and Execution Log;
- Milestone or task results;
- accepted decisions, lessons, failures, and abandoned approaches;
- deferred and follow-up candidates;
- links to relevant commits, reports, artifacts, and successor Cycles.

This structure keeps the active working context short without losing the project's historical reasoning or execution evidence.
