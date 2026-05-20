# C16-M5 Implementation Evidence

worker: implement
scope: Maintenance Run Engine And Template Learning
date: 2026-05-19

## Modified Files

- `core/src/maintenance/index.js`
- `skills/maintain/SKILL.md`
- `references/commands-spec.md`
- `.pipeline/reviews/C16/M5/implementation-evidence.md`

## Implemented API

- `validateMaintenanceRun`
- `planMaintenanceRun`
- `discoverMaintenanceRunItems`
- `transitionMaintenanceRun`
- `applyMaintenanceRun`
- `learnMaintenanceTemplateCandidates`
- `validateMaintenanceTemplateCandidate`
- `reviewMaintenanceTemplateCandidate`

## Behavior Summary

- Maintenance runs use `kind: maintenance_run` and support `planned`, `discovering_items`, `in_progress`, `waiting_review`, `waiting_confirmation`, `applying`, `verifying`, `completed`, `paused`, and `failed`.
- Run validation rejects Feature/Cycle/Patch-shaped fields such as `cycle_id`, `patch_id`, `feature_id`, `milestones`, and `acceptance_criteria`.
- `planMaintenanceRun` turns generic `planned_items` into multiple `maintenance_operation` queue items without hard-coding the daily AI noon report.
- `discoverMaintenanceRunItems` flattens local docs folder and Notion child-page tree discovery fixtures into subitems and queue items, preserving `per_item` or `batch` review grouping.
- `transitionMaintenanceRun` supports `start`, `pause`, `resume`, `review`, `approve`, `verify`, and `complete`, preserving resumable cursor, resume token, and merged evidence refs.
- `applyMaintenanceRun` binds every planned item to `evaluateMaintenanceSideEffectGate`; blocked gates keep the run in `waiting_confirmation`, allowed gates advance the run to `applying`.
- Template learning emits non-authoritative pending-review `maintenance_template_candidate` records from recurring completed runs only.

## Safeguards

- Gate/backup: `local_document_write_with_backup` is blocked without backup metadata; `destructive_remote_write` requires confirmation and backup; `remote_write` and `external_action` require explicit confirmation. External notifications are treated as `external_action`.
- Ledger authority: `applyMaintenanceRun` does not forward user input `ledgerFile` into `appendMaintenanceLedgerEvent`; with `root`, it writes only `root/maintenance/ledger.yaml`.
- Template authority: learned candidates default to `authority: non_authoritative`, `status: pending_review`, and `authoritative: false`. `reviewMaintenanceTemplateCandidate` only approves/promotes when `actor: "user"` and `confirmed: true`.
- Redaction: run, item, ledger, gate, and template outputs continue to use shared `redactSecrets`; raw secret material is not persisted in ledger events.

## Validation

```bash
node --test core/test/maintenance-run.test.js core/test/maintenance-template-learning.test.js core/test/maintenance-backup-policy.test.js core/test/maintenance-queue.test.js core/test/maintenance-ledger.test.js
```

Result: PASS, 16/16.

```bash
node --test core/test/maintenance-command-map.test.js core/test/log-evidence.test.js
```

Result: PASS, 7/7.
