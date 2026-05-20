# C16-M5 Test Evidence

worker: test
scope: RED tests only; no production implementation changed.
timestamp: 2026-05-19T22:35:00+08:00

## Changed files

- `core/test/maintenance-run.test.js`
- `core/test/maintenance-template-learning.test.js`
- `core/test/maintenance-backup-policy.test.js`
- `core/test/fixtures/maintenance-run/daily-ai-noon-report.json`
- `core/test/fixtures/maintenance-run/docs-folder-partition.json`
- `core/test/fixtures/maintenance-run/notion-child-page-tree.json`
- `.pipeline/reviews/C16/M5/test-evidence.md`

## Command

```bash
node --test core/test/maintenance-run.test.js core/test/maintenance-template-learning.test.js core/test/maintenance-backup-policy.test.js core/test/maintenance-queue.test.js core/test/maintenance-ledger.test.js
```

Result: RED as expected.

Summary:

- tests: 16
- pass: 6
- fail: 10
- duration: ~187 ms

The 6 passing tests are existing M4 queue/ledger/gate tests:

- `maintenance ledger append helper is append-only and redacts raw secrets`
- `maintenance evidence paths cover scan, dry-run, apply, verify, and backup surfaces`
- `maintenance status and log render Chinese user-visible summaries for zh-CN output`
- `maintenance queue item schema represents operations, not Feature/Cycle/Patch work`
- `maintenance queue lifecycle supports planned, approval, execution, and terminal decisions`
- `maintenance side-effect gates require confirmation for high-risk levels and backup metadata for document writes`

## RED failure points

The new M5 tests fail because the run engine and template-learning API is not implemented/exported yet.

- `maintenance-backup-policy.test.js`
  - `applyMaintenanceRun` is not exported.
  - Covers required backup metadata before system-initiated local document updates.
  - Covers notification/external actions through side-effect gate.
  - Covers remote/destructive/external side effects blocked without confirmation.
  - Covers M4 residual risk: user-provided `ledgerFile` override must be ignored or rejected by run/apply orchestration.

- `maintenance-run.test.js`
  - `validateMaintenanceRun` is not exported.
  - `planMaintenanceRun` is not exported.
  - `discoverMaintenanceRunItems` is not exported.
  - `transitionMaintenanceRun` is not exported.
  - Covers run states: `planned`, `discovering_items`, `in_progress`, `waiting_review`, `waiting_confirmation`, `applying`, `verifying`, `completed`, `paused`, `failed`.
  - Covers Run boundary against Cycle/Patch/Feature-shaped fields.
  - Covers orchestration fixture for daily AI noon report while requiring generic orchestration support.
  - Covers partitioned docs folder and Notion child-page tree discovery with `per_item` and `batch` review modes.
  - Covers pause/resume/review/approve/complete resumable state and evidence refs.

- `maintenance-template-learning.test.js`
  - `learnMaintenanceTemplateCandidates` is not exported.
  - `validateMaintenanceTemplateCandidate` is not exported.
  - `reviewMaintenanceTemplateCandidate` is not exported.
  - Covers recurring-run candidate learning.
  - Requires candidates to be `non_authoritative`, `pending_review`, and not silently authoritative.
  - Requires explicit user review/confirmation before promotion to authoritative template.

Representative failure:

```text
expected applyMaintenanceRun to be exported from ../src/index.js
+ actual - expected
+
+ 'undefined'
- 'function'
```

## Expected M5 API exports

Implementation should export these from `core/src/index.js` through the maintenance module:

- `validateMaintenanceRun`
- `planMaintenanceRun`
- `discoverMaintenanceRunItems`
- `transitionMaintenanceRun`
- `applyMaintenanceRun`
- `learnMaintenanceTemplateCandidates`
- `validateMaintenanceTemplateCandidate`
- `reviewMaintenanceTemplateCandidate`

## Fixture intent

- `daily-ai-noon-report.json`: orchestration run fixture that plans multiple queue operations and must not become the only hard-coded template.
- `docs-folder-partition.json`: local docs folder partition fixture with `per_item` review.
- `notion-child-page-tree.json`: Notion child-page tree partition fixture with `batch` review and nested subitems.

## Non-goals

- No production code was modified.
- No protected workflow state files were modified by this worker.
