---
authority_role: record
confidence: confirmed
created_at: 2026-08-05T12:54:28.481Z
dedupe_key: project:hypo-workflow:requirement:semantic-first-recording-and-progress
id: requirement-8343e82c13849f464f84a7c4b452649c
kind: requirement
level: constraint
schema_version: '1'
scope:
  ref: project:hypo-workflow
  type: project
semantic_hash: 8343e82c13849f464f84a7c4b452649c155f6a91d19e5fc5dff5c86dba828506
source_refs:
  - locator: user-confirmed command purposes and workflow responsibility
    ref: conversation/prompt-cleanup-semantics-2026-08-05
    type: user_turn
supersedes: []
updated_at: 2026-08-05T12:54:28.481Z
---
# Semantic-first Workflow responsibility

Hypo-Workflow exists to help the model understand the user's work, keep accurate durable records, remind the model to update plans and progress, and make the model's current understanding and progress visible to the user. Workflow mechanisms must support that purpose rather than become user-facing ceremony.

Command purposes:

- Guide is used only when the user does not know which Workflow path to choose.
- Init builds a useful understanding of the project and initializes the project record.
- Plan is primarily a guided conversation for discovering what the user wants. Its questions adapt to the work type, such as a software project, research task, or experiment. Discover and Technical discussions remain valuable when they help the user understand a personal project, but they are not mandatory fixed-form questions for every task. Generated prompts are optional execution aids rather than Plan's purpose.
- Experiment manages experiment purpose, design, data, runs, and interpretation without exposing unnecessary engineering machinery.
- Resume reads the relevant conversation context and Pipeline records so work can continue after interruption or damaged compaction; recovery implementation details should remain internal.
- APIs may help the model write consistent memory and records, but should remain proportionate and mostly hidden.

Hooks should be quiet reminders for durable recording and plan/progress updates. Core and APIs may enforce storage integrity and recovery, but command prompts should lead with user intent and task semantics.
