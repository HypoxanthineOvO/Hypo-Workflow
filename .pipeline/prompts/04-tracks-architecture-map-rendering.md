# M4 - Requirement Tracks、Architecture Map 与人读渲染

## Objective

Support mixed Deep Plan tracks and architecture mapping: requirement/theme tracks first, then architecture-derived module tracks with machine-readable graph source and Mermaid/Markdown rendering.

## Scope

- Track fields include id, title, type, status, questions, decisions, risks, and relationships.
- Relationship fields include `depends_on`, `blocks`, `conflicts_with`, and `feeds_into_plan`.
- Architecture source includes components, edges, open questions, module cards, and evidence refs.
- Render human-readable Markdown and Mermaid from structured source.

## Validation

- Tests map theme tracks into module tracks.
- Graph tests validate components, edges, and relationships.
- Snapshot tests prove Mermaid/Markdown are generated from source-of-truth structure.

## Subworker Assignment Plan

- `test`: owns graph/model/snapshot tests and malformed relationship fixtures. Handoff: `.pipeline/reviews/C12/M4/test-evidence.md`.
- `implement`: owns track graph helpers and renderers. Must not edit test-owned snapshots except through approved update after red/green review. Handoff: `.pipeline/reviews/C12/M4/implementation-evidence.md`.
- `audit`: reviews source-of-truth boundaries and rendering consistency. Handoff: `.pipeline/reviews/C12/M4/audit.md`.

## Audit Fields

- `audit_target`: tracks, architecture map, and renderers.
- `risk_hypotheses`: Markdown becomes source of truth; module mapping loses requirement context; graph relationships are ambiguous.
- `test_scenarios`: mixed tracks, module mapping, relationship errors, Mermaid rendering.
- `evidence_required`: tests, sample DP architecture files, rendered Markdown/Mermaid.
- `independent_validator`: audit worker.
- `manual_checks`: read rendered architecture for clarity.
- `known_limits`: no graphical UI.
