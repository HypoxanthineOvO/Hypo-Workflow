# C16-M7 Completion Report — Global Knowledge Rules And Secret Reference Projections

## Result

Status: completed

C16-M7 added safe global projection helpers for Global Knowledge, infrastructure facts, effective rules, metadata-only secret capabilities, and Notion-projectable summaries.

## What Changed

- Added `core/src/knowledge/projections.js`.
- Exported projection APIs through `core/src/knowledge/index.js` and `core/src/index.js`.
- Added `core/src/secrets/index.js` for metadata-only secret capability projection.
- Added `buildEffectiveRulesMatrix` in `core/src/rules/index.js`.
- Updated projection specs in `references/knowledge-spec.md`, `references/rules-spec.md`, and `references/secret-store-spec.md`.
- Added M7 tests:
  - `core/test/global-knowledge-index.test.js`
  - `core/test/secret-ref-projection.test.js`
  - `core/test/rules-authority.test.js`

## Projection Behavior

- `buildGlobalKnowledgeProjection` reads compact surfaces, Knowledge index entries, global authored records, and accepted consolidation candidates.
- Pending or rejected consolidation candidates do not become authoritative projection entries.
- Raw project records, details, messages, raw blocks, and raw secret store payloads are not copied into projections.
- `buildInfrastructureFactProjection` preserves review metadata such as `sensitivity`, `freshness`, `authority`, and `evidence_refs` while omitting raw details.
- `buildNotionProjectableGlobalSummary` emits accepted safe summaries, metadata-only secret refs, and safe block-shaped payloads for later dry-run/apply stages.

## Rules And Secrets

- `buildEffectiveRulesMatrix` records `cycle > project > global > builtin` precedence, the effective winner, and override evidence.
- `buildSecretCapabilityProjection` emits provider, capability, allowed usage, health metadata, redaction policy, and `local_secret:*` store refs only.
- Raw fields such as `raw_value`, `value`, `token`, `api_key`, `password`, and `authorization` are stripped from projection surfaces.

## Audit Resolution

Audit status: PASS after warning resolution.

Two non-blocking audit warnings were fixed before milestone close:

- Evidence-only compact surfaces now preserve `evidence_refs` even when no `path` is present.
- Safe Notion `blocks` produced by `buildNotionProjectableGlobalSummary` are preserved for M8/M9 payload assembly; raw blocks remain filtered through raw containers.

## Worker Evidence

- Test evidence: `.pipeline/reviews/C16/M7/test-evidence.md`
- Implementation evidence: `.pipeline/reviews/C16/M7/implementation-evidence.md`
- Audit evidence: `.pipeline/reviews/C16/M7/audit.md`

## Validation

```bash
node --test core/test/global-knowledge-index.test.js core/test/rules-authority.test.js core/test/secret-ref-projection.test.js
```

Result: 12/12 passing.

```bash
node --test core/test/knowledge-ledger.test.js core/test/knowledge-hooks.test.js
```

Result: 11/11 passing.

```bash
node --input-type=module - <<'NODE'
# custom projection serialization probe
NODE
```

Result: `leak=false`, `evidenceRefs=["probe:evidence"]`, `safeBlocks=true`.

```bash
cd core && npm test
```

Result: 570/570 passing.

```bash
git diff --check
```

Result: passing.

## Residual Risks

- M8 should cover end-to-end review pack serialization from assembled artifacts, not only helper-level in-memory fixtures.
- Consolidation candidates should continue to provide explicit review status before promotion into authoritative Global Knowledge.
