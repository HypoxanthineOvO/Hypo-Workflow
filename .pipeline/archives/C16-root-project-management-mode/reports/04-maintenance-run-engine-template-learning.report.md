# C16-M5 Completion Report — Maintenance Run Engine And Template Learning

## Result

Status: completed

C16-M5 added Maintenance Run as a higher-level maintenance orchestration object over queue items, plus template candidate learning from recurring completed runs.

## What Changed

- Added Maintenance Run APIs in `core/src/maintenance/index.js`.
- Exported the new APIs through `core/src/index.js`.
- Updated `skills/maintain/SKILL.md` and `references/commands-spec.md` with run, apply, gate, backup, ledger, and template-learning semantics.
- Added M5 tests:
  - `core/test/maintenance-run.test.js`
  - `core/test/maintenance-template-learning.test.js`
  - `core/test/maintenance-backup-policy.test.js`
  - `core/test/fixtures/maintenance-run/*`

## Run Lifecycle Behavior

- Runs validate as `kind: maintenance_run`.
- Runs reject Feature/Cycle/Patch-shaped fields such as `cycle_id`, `patch_id`, `feature_id`, `milestones`, and `acceptance_criteria`.
- Supported states: `planned`, `discovering_items`, `in_progress`, `waiting_review`, `waiting_confirmation`, `applying`, `verifying`, `completed`, `paused`, and `failed`.
- `planMaintenanceRun` turns generic `planned_items` into `maintenance_operation` queue items without hard-coding the daily AI noon report.
- `discoverMaintenanceRunItems` flattens local docs folder and Notion child-page tree inputs into subitems and queue items, preserving `per_item` or `batch` review groups.
- `transitionMaintenanceRun` supports `start`, `pause`, `resume`, `review`, `approve`, `verify`, and `complete`, preserving resumable cursor, resume token, and evidence refs.

## Gates, Backups, And Ledger Authority

- `applyMaintenanceRun` evaluates every planned item with `evaluateMaintenanceSideEffectGate`.
- Blocked gates keep the run at `waiting_confirmation`; allowed gates advance the run to `applying`.
- `local_document_write_with_backup` requires backup metadata.
- `destructive_remote_write` requires explicit confirmation and backup metadata.
- `remote_write` and `external_action` require explicit confirmation; notifications are modeled as `external_action`.
- Run apply ignores user-controlled `ledgerFile`; ledger authority remains `root/maintenance/ledger.yaml`.

## Template Learning Safeguards

- `learnMaintenanceTemplateCandidates` only learns from recurring completed runs.
- Learned candidates are `kind: maintenance_template_candidate`, `authority: non_authoritative`, `status: pending_review`, and `authoritative: false`.
- `reviewMaintenanceTemplateCandidate` only approves or promotes when `actor: "user"` and `confirmed: true`.
- Run, gate, ledger, and template outputs use shared redaction.

## Worker Evidence

- Test evidence: `.pipeline/reviews/C16/M5/test-evidence.md`
- Implementation evidence: `.pipeline/reviews/C16/M5/implementation-evidence.md`
- Audit evidence: `.pipeline/reviews/C16/M5/audit.md`

## Validation

```bash
node --test core/test/maintenance-run.test.js core/test/maintenance-template-learning.test.js core/test/maintenance-backup-policy.test.js core/test/maintenance-queue.test.js core/test/maintenance-ledger.test.js
```

Result: 16/16 passing.

```bash
node --test core/test/maintenance-command-map.test.js core/test/log-evidence.test.js
```

Result: 7/7 passing.

```bash
cd core && npm test
```

Result: 555/555 passing.

```bash
git diff --check
```

Result: passing.

## Audit Result

Audit status: PASS, no blockers.

Non-blocking warning: backup metadata currently preserves `path`, `checksum_sha256`, and `created_at`, and accepted backup paths are merged into `run.evidence_refs`. It does not yet preserve a dedicated `backup.evidence_ref` field. This is acceptable for M5 but should be strengthened when M6/M8 verification evidence is wired end to end.

## Residual Risks

- Future user-facing command plumbing must continue to avoid exposing `appendMaintenanceLedgerEvent(..., options.ledgerFile)`.
- `transitionMaintenanceRun(... action: "approve")` records approval metadata but does not itself enforce a user actor. High-risk apply remains protected by side-effect gates; command handlers should not treat transition approval alone as sufficient authority for risky effects.
- Backup metadata is sufficient for M5 gating but not fully verify-ready until an explicit backup evidence reference is modeled.
