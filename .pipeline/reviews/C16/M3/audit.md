# C16-M3 Audit - Storage Sync Template And Notion Merge Dry-Run

verdict: PASS

Worker: `audit`
Scope: read-only audit of M3 implementation, tests, and worker evidence.
Reviewed at: 2026-05-19T21:55:00+08:00

## Findings

- no blockers

## Evidence

- Prompt scope requires a backend-neutral Storage Sync Template, Notion discover/classify/bind/merge-plan/dry-run evidence only, legacy content as merge input, stable hashes, and no remote writes: `.pipeline/prompts/02-storage-sync-template-notion-dry-run.md:5`, `.pipeline/prompts/02-storage-sync-template-notion-dry-run.md:42`, `.pipeline/prompts/02-storage-sync-template-notion-dry-run.md:45`, `.pipeline/prompts/02-storage-sync-template-notion-dry-run.md:47`.
- Worker separation is explicitly assigned in the prompt: `test` owns `.pipeline/reviews/C16/M3/test-evidence.md`, `implement` owns `.pipeline/reviews/C16/M3/implementation-evidence.md`, and `audit` owns this report path: `.pipeline/prompts/02-storage-sync-template-notion-dry-run.md:23`.
- Test worker evidence states RED tests only and no production/runtime edits: `.pipeline/reviews/C16/M3/test-evidence.md:3`.
- Implementation worker evidence lists only `core/src/storage-sync/index.js` and root export changes, with API/no-write/redaction claims and focused test pass summary: `.pipeline/reviews/C16/M3/implementation-evidence.md:3`, `.pipeline/reviews/C16/M3/implementation-evidence.md:26`, `.pipeline/reviews/C16/M3/implementation-evidence.md:31`.
- `planNotionProjectHomeDryRun` calls only `discoverProjectHome` through `discoverProjectHome(notion.client, notion.target_ref)` and constructs evidence/operations in memory; no write-capable client methods are called in the implementation: `core/src/storage-sync/index.js:99`, `core/src/storage-sync/index.js:255`.
- Dry-run output is forced to `mode: "dry-run"` and `remote_writes_enabled: false`; operations use `action: "dry-run"` and `remote_write: false`: `core/src/storage-sync/index.js:172`, `core/src/storage-sync/index.js:324`.
- Legacy blocks are sorted, classified, emitted as `classification: "merge_input"`, then merge-plan evidence is generated with `legacy_policy: "classify_then_merge"` and no `append_only` policy in implementation: `core/src/storage-sync/index.js:107`, `core/src/storage-sync/index.js:120`, `core/src/storage-sync/index.js:141`.
- Operation hashes are generated from canonical JSON with sorted object keys and SHA-256, excluding `generated_at` from the hash payload: `core/src/storage-sync/index.js:182`, `core/src/storage-sync/index.js:345`, `core/src/storage-sync/index.js:431`.
- Backend-neutral template guard removes and validates forbidden Notion-specific keys such as `notion_*`, `page_id`, `block_id`, `rich_text`, `property_id`, and `database_id`: `core/src/storage-sync/index.js:23`, `core/src/storage-sync/index.js:90`, `core/src/storage-sync/index.js:392`.
- Redaction covers secret-looking keys and values recursively before returning templates, evidence, and operations: `core/src/storage-sync/index.js:24`, `core/src/storage-sync/index.js:403`.
- Focused tests cover no-write traps, forced dry-run output, legacy classification before merge-plan, no append-only operations, hash stability under reordered input, backend-neutral template fields, and secret redaction: `core/test/notion-project-home-dry-run.test.js:13`, `core/test/notion-project-home-dry-run.test.js:49`, `core/test/notion-project-home-dry-run.test.js:88`, `core/test/notion-project-home-dry-run.test.js:119`, `core/test/storage-sync-template.test.js:17`, `core/test/storage-sync-template.test.js:54`.

## Verification

Command:

```bash
node --test core/test/storage-sync-template.test.js core/test/notion-project-home-dry-run.test.js
```

Result: PASS, 6 tests passed, 0 failed.

## Residual Risks

- M3 is a dry-run planner only; real Notion apply must remain blocked until the M9 final gated apply review.
- Current no-write assurance is scoped to the injected client boundary and focused tests; M9 should re-check any real adapter method names before enabling writes.
- Redaction is pattern-based and should be revalidated against real Notion/page metadata before final apply evidence is published.
- Target binding is still user-deferred; M9 must verify explicit target selection and avoid blind search or wrong-page binding.
