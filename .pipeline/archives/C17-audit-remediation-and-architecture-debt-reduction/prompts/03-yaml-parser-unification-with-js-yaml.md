# C17-M3 YAML Parser Unification With js-yaml

## Goal

Replace split partial YAML parsers with a single `js-yaml` backed parser/dumper for config and knowledge behavior.

## Technical Solution

- Add `js-yaml` as an explicit dependency where package ownership requires it.
- Update `parseYaml` / `stringifyYaml` public API to delegate to `js-yaml` with stable dump options.
- Update knowledge parsing to use the shared parser and remove `parseKnowledgeYaml` custom parser behavior.
- Add fixtures for multiline strings, colons, arrays, nested objects, nulls, and existing knowledge records.

## Subworker Assignment Plan

Status: authorized. Worker Separation mode: recommended.

- `test`
  - Owns YAML compatibility tests for config, knowledge, complex YAML, and existing `.pipeline` fixtures.
  - Evidence path: `.pipeline/reviews/C17/M3/test-evidence.md`.
- `implement`
  - Owns dependency manifest/lockfile changes, shared YAML wrapper, config/knowledge migration, and parser deletion.
  - Must not create or rewrite tests owned by `test`.
  - Evidence path: `.pipeline/reviews/C17/M3/implementation-evidence.md`.
- `audit`
  - Reviews dependency scope, formatting churn, parser removal, and worker separation.
  - Evidence path: `.pipeline/reviews/C17/M3/audit.md`.
- Main agent
  - Coordinates workers, integrates outputs, updates lifecycle files, and writes the completion report.

## Technical Route

1. Check whether `js-yaml` is already transitive; add explicit dependency to the correct package manifest.
2. Add compatibility tests for complex YAML and existing knowledge/config fixtures.
3. Build shared YAML wrapper with stable dump options such as no refs and controlled line width.
4. Migrate config and knowledge modules.
5. Remove independent parser implementations where possible.

## Research Required

Status: local dependency check required.

Evidence:

- Audit says local `node_modules` exists, but package manifests must declare `js-yaml` explicitly.

Remaining:

- Confirm dependency location before editing package manifests.

## Risks And Alternatives

Risks:

- Dump formatting changes can affect snapshots or generated config diffs.
- Legacy parser may have accepted invalid YAML that `js-yaml` rejects.

Rejected alternative: maintaining a shared internal parser. User approved `js-yaml`.

## Validation

Run:

```bash
node --test core/test/global-config-registry.test.js core/test/knowledge-ledger.test.js core/test/knowledge-opencode-gate.test.js
npm test
git diff --check
```

Pass signal: config and knowledge YAML behavior is consistent and full root tests pass.

## Audit Focus

- No remaining independent YAML parser in config/knowledge.
- No silent parse failures for complex YAML.
- Dependency and lockfile changes are minimal and justified.

## Completion Report Requirements

Include dependency changes, parser migration details, compatibility fixture coverage, validation output, expected behavior, and residual risks.
