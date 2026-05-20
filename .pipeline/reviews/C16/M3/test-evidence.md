# C16-M3 Test Evidence - Storage Sync Template And Notion Merge Dry-Run

Worker: `test`
Scope: RED tests only. No production/runtime files under `core/src/**` were edited.

## Changed Files

- `core/test/storage-sync-template.test.js`
- `core/test/notion-project-home-dry-run.test.js`
- `.pipeline/reviews/C16/M3/test-evidence.md`

## Tests Added

`core/test/storage-sync-template.test.js` covers:

- Storage Sync Template as a backend-neutral projection model.
- Required Project Home slots in stable order:
  - `overview`
  - `progress`
  - `architecture`
  - `knowledge`
  - `docs`
  - `prompts_index`
  - `reports_index`
  - `legacy_links`
  - `sync_status`
- Slot authority/source metadata.
- No backend-specific Notion fields in the backend-neutral template.
- Redaction/omission of secret-looking metadata from projected template output.

Expected public API shape:

- `buildStorageSyncTemplate(input, options)`
- `validateStorageSyncTemplate(template, options)`

`core/test/notion-project-home-dry-run.test.js` covers:

- Notion Project Home dry-run emits only `discover`, `classify`, `bind`, `merge-plan`, and `dry-run` evidence phases.
- Dry-run capability flags disable writes: `write`, `create`, `update`, and `delete` are false.
- Injected Notion client write methods are assertion traps, and `writeCalls` must remain empty.
- Legacy Notion blocks are classified as `merge_input` before merge-plan evidence is produced.
- Merge operations must not use blind `append_only` legacy policy.
- Operation hashes must be deterministic across reordered template slots and reordered legacy input.
- Operation hashes must be stable SHA-256-style lowercase hex strings.
- Dry-run evidence and operations must redact/omit secret-looking template, client, and legacy metadata.

Expected public API shape:

- `planNotionProjectHomeDryRun(input, options)`

## Focused Test Command

```bash
node --test core/test/storage-sync-template.test.js core/test/notion-project-home-dry-run.test.js
```

## RED Result

Exit code: `1`

Exact command output summary:

```text
1..6
# tests 6
# suites 0
# pass 0
# fail 6
# cancelled 0
# skipped 0
# todo 0
# duration_ms 160.981249
```

Failure causes:

```text
not ok 1 - Notion Project Home dry-run emits evidence only and never calls write-capable client methods
error: expected planNotionProjectHomeDryRun to be exported from ../src/index.js

not ok 2 - legacy Notion content is classified as merge input before merge-plan operations are produced
error: expected planNotionProjectHomeDryRun to be exported from ../src/index.js

not ok 3 - dry-run operation hashes are deterministic when input order changes
error: expected planNotionProjectHomeDryRun to be exported from ../src/index.js

not ok 4 - Notion dry-run output redacts secret-looking metadata from evidence and operations
error: expected planNotionProjectHomeDryRun to be exported from ../src/index.js

not ok 5 - storage sync template is a backend-neutral Project Home projection model
error: expected buildStorageSyncTemplate to be exported from ../src/index.js

not ok 6 - storage sync template redacts or omits secret-looking metadata
error: expected buildStorageSyncTemplate to be exported from ../src/index.js
```

## RED Failure Points

- Missing root export: `buildStorageSyncTemplate`.
- Missing root export: `validateStorageSyncTemplate`.
- Missing root export: `planNotionProjectHomeDryRun`.

## Implementation Assumptions

- M3 implementation should export all public APIs through `core/src/index.js`.
- Storage Sync Template output should remain backend-neutral; Notion-specific page/block/property fields belong only in adapter dry-run evidence or bind/merge-plan records.
- Dry-run output should expose no remote write side effects and should be provable through capability flags plus injected client write-call assertions.
- Legacy Notion content is merge input and must be classified before operations are planned.
- Operation hash generation should canonicalize or stably sort semantically identical unordered inputs.
- All serialized outputs returned by these APIs must pass no-raw-secret projection checks.
