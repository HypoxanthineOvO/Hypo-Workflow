---
authority_role: record
confidence: confirmed
created_at: 2026-08-05T13:08:12.374Z
dedupe_key: project:hypo-workflow:requirement:semantic-index-and-history-refresh
id: requirement-9f3deb08ca6dde37fac5a1607e55d3c9
kind: requirement
schema_version: '1'
scope:
  ref: project:hypo-workflow
  type: project
semantic_hash: 9f3deb08ca6dde37fac5a1607e55d3c9dee852cfb9cffb8902c49ab45bcc305e
source_refs:
  - locator: user-confirmed semantic naming and one-time model-assisted history refresh
    ref: conversation/semantic-index-history-refresh-2026-08-05
    type: user_turn
supersedes: []
updated_at: 2026-08-05T13:08:12.374Z
---
# Semantic indexes and one-time history refresh

Workflow storage must be primarily understandable through human-readable semantic directory names, filenames, Markdown documents, and layered INDEX.md files. Visible paths and references should describe the project concept, Cycle, Experiment, decision, or artifact. UUIDs, hashes, event segments, and integrity metadata may remain internal but must not be the normal navigation interface for users or models.

Provide a one-time model-assisted History Refresh for adopting the new format from an existing .pipeline history. The refresh:

- inventories legacy Cycles, Plans, Progress, logs, Journal events, reports, Records, Experiments, evidence, and archives;
- asks a capable model to synthesize Cycle purposes, outcomes, relationships, durable project memory, Experiment identities, Attempts, lessons, deferred work, and unresolved ambiguities;
- generates semantic directories, human-readable records, layered INDEX.md files, Cycle summaries, Experiment indexes, and a migration coverage report;
- presents the proposed mapping, uncertain classifications, conflicts, omissions, and preserved source references before activation;
- writes the new structure side by side and does not destroy or rewrite legacy history;
- validates that every selected historical source is represented, intentionally excluded with a reason, or listed for user review;
- switches the workspace to the new structure only after explicit user approval and successful validation;
- is idempotent and can be rerun safely after correcting classifications.

After activation, ordinary context uses the new semantic indexes and summaries. Legacy files remain a read-only evidence archive and are opened only for drill-down or migration verification.
