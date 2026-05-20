# C16-M2 Test Evidence - Artifact Catalog Scanner

## Changed Files

- `core/test/artifact-catalog.test.js`
- `.pipeline/reviews/C16/M2/test-evidence.md`

## Tests Added

- Added RED tests expecting public `scanArtifactCatalog` export from `../src/index.js`.
- Covered current `.pipeline` Workflow project artifacts: state, progress, cycle, prompt, report, archive, architecture, docs, knowledge, rules, runtime log, and project overview.
- Covered stale derived summary detection via older `PROJECT-SUMMARY.md` mtime relative to current state/progress/log evidence.
- Covered malformed YAML returning `freshness: parse_error` and `parseability: parse_error` instead of `missing`.
- Covered pre-Workflow/git-only project behavior where missing `.pipeline` artifacts are `not_applicable`, not broken.
- Covered skill/service object behavior for `SKILL.md`, `service_config_ref`, `infrastructure_fact`, and secret-ref handling.
- Covered required output fields: `object_id`, `artifact_id`, `kind`, `path_or_remote_ref`, `authority`, `freshness`, `parseability`, `sensitivity`, `projection`, and `evidence_refs`.
- Secret fixture writes a raw secret file with invalid YAML and restrictive permissions; expected behavior is to emit only a secret ref and never include raw secret content in catalog output.

## RED Result

Command:

```bash
node --test core/test/artifact-catalog.test.js core/test/knowledge-ledger.test.js core/test/log-evidence.test.js core/test/progress-table.test.js
```

Result: RED as expected.

Failure:

```text
SyntaxError: The requested module '../src/index.js' does not provide an export named 'scanArtifactCatalog'
```

Summary:

- 16 tests discovered across the focused command.
- 15 passed.
- 1 failed: `core/test/artifact-catalog.test.js` cannot load because the Artifact Catalog API is not implemented/exported yet.
- Existing `knowledge-ledger`, `log-evidence`, and `progress-table` tests passed in this focused run.

## Assumptions

- Public API should be `scanArtifactCatalog(workspaceAuthority, options)` exported from `core/src/index.js`.
- Scanner output should be an object with an `entries` array.
- Authority labels expected by tests are `local_workflow`, `legacy_workflow`, `manual_or_remote`, and `derived`.
- Parseability/freshness labels use the required set: `current`, `stale`, `unknown`, `parse_error`, `missing`, and `not_applicable`.
- Secret config refs are catalog metadata only: the scanner may represent the path/store ref but must not open or parse the raw secret file.
