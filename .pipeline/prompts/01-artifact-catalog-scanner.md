# C16-M2 Artifact Catalog Scanner

## Goal

Build a read-only Artifact Catalog scanner that classifies project, legacy, pre-Workflow, skill, service, infrastructure, and publication artifacts with authority, freshness, parseability, sensitivity, projection, and provenance metadata.

## Technical Solution

Add an Artifact Catalog read model that scans configured workspace objects without mutating them. It emits normalized entries for canonical, legacy, pre-Workflow, derived, skill, service, infrastructure, and secret-ref artifacts.

Required metadata:

- `object_id`
- `artifact_id`
- `kind`
- `path_or_remote_ref`
- `authority`
- `freshness`
- `parseability`
- `sensitivity`
- `projection`
- `evidence_refs`

## Subworker Assignment Plan

Status: authorized. Worker Separation mode: recommended.

- `test`
  - Owns fixtures and tests for artifact classification, parse errors, missing artifacts, stale derived files, infrastructure facts, and secret-ref handling.
  - Evidence path: `.pipeline/reviews/C16/M2/test-evidence.md`.
- `implement`
  - Owns scanner implementation, safe readers, classifier docs, and integration with existing progress/log/knowledge/rules surfaces.
  - Must not create or rewrite tests owned by `test`.
  - Evidence path: `.pipeline/reviews/C16/M2/implementation-evidence.md`.
- `audit`
  - Reviews read-only behavior, secret path exclusion, stale-derived authority, and worker separation.
  - Evidence path: `.pipeline/reviews/C16/M2/audit.md`.
- Main agent
  - Coordinates workers, integrates outputs, updates lifecycle files, and writes the completion report.

## Technical Route

1. Read M1 workspace authority outputs and sample inventory research.
2. Implement artifact classifiers for state, progress, cycle, prompts, reports, archives, architecture, docs, knowledge, rules, logs, skills, service config refs, and infrastructure facts.
3. Add safe YAML/Markdown readers that report `parse_error` separately from `missing`.
4. Add staleness checks for derived summaries relative to authority files when evidence exists.
5. Add sensitivity filters that skip secret-bearing paths and record only secret refs.
6. Add fixtures shaped like Hypo-Info-V2/Hypo-Info, Hypo-Claw/Hypo-Agent, Hypo-GPU, Hypo-Writer, and hypo-image.

## Research Required

Status: resolved by Deep Research.

Evidence:

- `.pipeline/deep-plans/DP001-root-project-management-mode/sample-artifact-inventory.md`
- `.pipeline/deep-plans/DP001-root-project-management-mode/representative-notion-page-deep-read.md`

## Risks And Alternatives

Risks:

- Path filters could accidentally read secrets.
- Staleness detection can become heuristic-heavy.

Rejected alternative: scanning only `.pipeline` projects. First-version object model must cover pre-Workflow and skill/service objects.

## Validation

Run:

```bash
node --test core/test/artifact-catalog.test.js core/test/knowledge-ledger.test.js core/test/log-evidence.test.js core/test/progress-table.test.js
cd core && npm test
```

Pass signal: scanner marks stale, `parse_error`, missing, `not_applicable`, infrastructure, and secret-ref artifacts correctly without opening raw secret files.

## Audit Focus

- Scanner is read-only.
- Secret paths are excluded.
- Derived summaries never outrank state/continuation authority.

## Completion Report Requirements

Include classifier behavior, fixture coverage, secret-redaction evidence, validation output, and residual scanner limitations.
