# C16-M7 Global Knowledge Rules And Secret Reference Projections

## Goal

Generate Global Knowledge, infrastructure facts, effective rules matrix, secret refs/capability projections, and Notion-projectable summaries without copying raw project records or raw secrets.

## Technical Solution

Build projections from compact/index surfaces, authored global records, infrastructure facts, accepted consolidation candidates, structured rules, and secret references. Raw project records and raw secret values remain outside projections.

Rule precedence:

```text
cycle > project > global > builtin
```

## Subworker Assignment Plan

Status: authorized. Worker Separation mode: recommended.

- `test`
  - Owns projection tests for Global Knowledge, infrastructure facts, rule precedence, secret refs, redaction, and accepted consolidation candidates.
  - Evidence path: `.pipeline/reviews/C16/M7/test-evidence.md`.
- `implement`
  - Owns projection implementation, knowledge/rules/secret docs, infrastructure fact schema, and Notion-projectable summary generation.
  - Must not create or rewrite tests owned by `test`.
  - Evidence path: `.pipeline/reviews/C16/M7/implementation-evidence.md`.
- `audit`
  - Reviews raw Knowledge copy prevention, raw secret leakage, rule override evidence, and worker separation.
  - Evidence path: `.pipeline/reviews/C16/M7/audit.md`.
- Main agent
  - Coordinates workers, integrates outputs, updates lifecycle files, and writes the completion report.

## Technical Route

1. Aggregate compact/index Knowledge surfaces and accepted global authored records.
2. Add infrastructure fact records with sensitivity, freshness, authority, and evidence fields.
3. Generate effective rules matrix with override evidence.
4. Generate secret capability projections with provider, allowed_for, health, and redaction policy.
5. Add Notion projection records for accepted summaries only.

## Research Required

Status: resolved by Deep Research and user Discover.

Evidence:

- `.pipeline/deep-plans/DP001-root-project-management-mode/global-knowledge-aggregation.md`
- `.pipeline/deep-plans/DP001-root-project-management-mode/global-rules-projection.md`
- `.pipeline/deep-plans/DP001-root-project-management-mode/global-secret-store-schema.md`
- `.plan-state/discover.yaml`

## Risks And Alternatives

Risks:

- Aggregation could copy too much project-local Knowledge.
- Secret health summaries could leak provider details.

Rejected alternative: treating Notion as Knowledge authority. Local structured sources remain authority.

## Validation

Run:

```bash
node --test core/test/global-knowledge-index.test.js core/test/rules-authority.test.js core/test/secret-ref-projection.test.js
node --test core/test/knowledge-ledger.test.js core/test/knowledge-hooks.test.js
cd core && npm test
```

Pass signal: projections include infrastructure facts and accepted candidates, preserve rule precedence, and never emit raw secrets.

## Audit Focus

- No raw Knowledge bulk copy.
- No raw secret leakage.
- Rule override evidence is explicit.

## Completion Report Requirements

Include projection inputs/outputs, infrastructure fact behavior, rule precedence evidence, secret redaction evidence, validation output, and residual projection risks.
