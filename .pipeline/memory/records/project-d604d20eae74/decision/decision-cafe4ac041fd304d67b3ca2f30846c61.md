---
authority_role: record
confidence: confirmed
created_at: 2026-08-05T13:18:27.498Z
dedupe_key: project:hypo-workflow:decision:discussion-ledger-storage
id: decision-cafe4ac041fd304d67b3ca2f30846c61
kind: decision
schema_version: '1'
scope:
  ref: project:hypo-workflow
  type: project
semantic_hash: cafe4ac041fd304d67b3ca2f30846c61b75a10eb23db8033541139b20f472b41
source_refs:
  - locator: user-selected local verbatim ledger with Git-tracked summary
    ref: conversation/discussion-ledger-storage-2026-08-05
    type: user_turn
supersedes: []
updated_at: 2026-08-05T13:18:27.498Z
---
# Discussion Ledger storage

Each Cycle keeps a strict human-readable Discussion Ledger so later review can determine what the user said, what the assistant replied, what was authorized, and where misunderstanding or responsibility arose.

The complete visible user and assistant messages are stored locally in append-only Cycle- and Session-scoped Markdown files. Raw discussion files are ignored by Git by default. They include local timestamps, speaker labels, Session and turn references, and attachment references. Existing entries are never edited; corrections are appended. System and developer prompts, hidden reasoning, and raw tool output are excluded. Obvious credentials are redacted with an explicit marker rather than persisted.

Each Cycle also keeps a Git-tracked DISCUSSION-SUMMARY.md. It records confirmed requirements, decisions, disagreements, approvals, rejections, corrections, unresolved questions, and human-readable references to the local raw entries. Short relevant quotations may be included after secret-safe review.

Resume and ordinary context load the summary, not the full transcript. The raw ledger is opened only for dispute resolution, diagnosis, detailed historical recovery, or explicit user inspection. Cycle closure preserves the local raw ledger locally and archives the tracked summary with the Cycle.

Lightweight UserPromptSubmit and Stop capture are justified Hook responsibilities. If those Hooks are unavailable, the main Agent remains responsible for appending the visible exchange before relying on it as authority.
