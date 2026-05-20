# C16-M2 Implementation Evidence - Artifact Catalog Scanner

## Changed Files

- `core/src/artifact-catalog/index.js`
- `core/src/index.js`
- `.pipeline/reviews/C16/M2/implementation-evidence.md`

## Implementation Summary

- Added `scanArtifactCatalog(workspaceAuthority, options)` as a read-only catalog scanner.
- Exported the API through `core/src/index.js`.
- Implemented normalized entries with required fields: `object_id`, `artifact_id`, `kind`, `path_or_remote_ref`, `authority`, `freshness`, `parseability`, `sensitivity`, `projection`, and `evidence_refs`.
- Scans current and legacy Workflow artifacts for state, progress, cycle, prompts, reports, archives, architecture, docs, knowledge, rules, runtime log, and project overview.
- Marks `PROJECT-SUMMARY.md` as stale when newer state/progress/log evidence exists.
- Reports malformed YAML as `freshness: parse_error` and `parseability: parse_error`.
- Treats pre-Workflow objects as `not_applicable` for missing `.pipeline` artifacts with `authority: manual_or_remote`.
- Scans skill `SKILL.md`, emits service config references as `secret_ref` metadata without opening the referenced raw secret file, and emits infrastructure metadata from workspace object records.

## Secret Handling

- `service_config_refs` are represented only by path/store metadata and workspace evidence references.
- The scanner does not read or parse service config ref files.
- Focused tests verified catalog output does not include the raw secret fixture value.

## Validation

Command:

```bash
node --test core/test/artifact-catalog.test.js core/test/knowledge-ledger.test.js core/test/log-evidence.test.js core/test/progress-table.test.js
```

Result: PASS.

Summary:

- 19 tests passed.
- 0 tests failed.
- Artifact Catalog RED coverage now passes together with focused neighboring regressions.

## Assumptions

- `options.now` is accepted for API compatibility but current freshness checks are file/evidence based.
- First-version directory catalog entries choose the first discovered file for prompt/report/archive/docs/knowledge presence evidence.
- The existing `core/src/index.js` worktree already included workspace export wiring; this implementation only needed to add the artifact catalog export.
