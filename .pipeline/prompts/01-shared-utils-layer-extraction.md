# C17-M1 Shared Utils Layer Extraction

## Goal

Create `core/src/utils/index.js` as the shared utility authority and remove duplicated low-level helper implementations.

## Technical Solution

- Export shared helpers such as `isPlainObject`, JSON clone/deep clone, `compactTimestamp`, YAML read/write wrappers, `stableStringify`, `hasText`, `safeId`, and JSONL helpers where appropriate.
- Migrate repeated helper call sites in small behavior-preserving batches.
- Keep YAML semantics stable until C17-M3 replaces parser internals with `js-yaml`.

## Subworker Assignment Plan

Status: authorized. Worker Separation mode: recommended.

- `test`
  - Owns tests for utility semantics: null/object/array detection, clone isolation, timestamp compaction, stable stringify ordering, safe id behavior, and YAML write compatibility.
  - Evidence path: `.pipeline/reviews/C17/M1/test-evidence.md`.
- `implement`
  - Owns `core/src/utils/index.js`, import migrations, and removal of duplicated local helper definitions.
  - Must not create or rewrite tests owned by `test`.
  - Evidence path: `.pipeline/reviews/C17/M1/implementation-evidence.md`.
- `audit`
  - Reviews semantic equivalence, circular import risk, duplicate helper reduction, and worker separation.
  - Evidence path: `.pipeline/reviews/C17/M1/audit.md`.
- Main agent
  - Coordinates workers, integrates outputs, updates lifecycle files, and writes the completion report.

## Technical Route

1. Add `core/test/utils.test.js` with RED coverage for shared helper semantics.
2. Implement `core/src/utils/index.js`.
3. Migrate duplicated helpers in workspace-adjacent, maintenance, project-events, project-notifications, evidence, reviews, storage-sync, sync, rules, and lifecycle modules.
4. Remove local helper definitions when unused.
5. Run duplicate-helper inventory to prove reduction.

## Research Required

Status: none.

Evidence:

- Audit found `isPlainObject` 14 times, clone 6 times, `compactTimestamp` 8 times, `writeYaml` 4 times, `stableStringify` 3 times.

## Risks And Alternatives

Risks:

- Similar helper names may have subtly different semantics.
- Utilities can create circular imports if they depend on domain modules.

Rejected alternative: delaying utils until after workspace split. That would increase churn in later module moves.

## Validation

Run:

```bash
node --test core/test/utils.test.js
npm test
rg 'function isPlainObject|function compactTimestamp|function stableStringify|async function writeYaml' core/src
git diff --check
```

Pass signal: shared utils tests pass, full root tests pass, duplicate helper inventory is reduced or each remaining local helper is justified.

## Audit Focus

- No semantic regression in timestamp formatting, clone behavior, or YAML writes.
- No utils-to-domain circular dependency.
- No broad unrelated refactor mixed into helper extraction.

## Completion Report Requirements

Include migrated helper list, remaining helper exceptions, validation output, expected behavior, and residual risks.
