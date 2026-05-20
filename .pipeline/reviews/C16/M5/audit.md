# C16-M5 Audit Report

worker: audit
scope: Maintenance Run Engine And Template Learning
timestamp: 2026-05-19T22:42:04+08:00
decision: PASS

## Conclusion

PASS. No blocker found in the audited C16-M5 implementation. Maintenance Run remains separate from Cycle/Patch/Feature shapes, apply orchestration is bound to side-effect gates, user-controlled `ledgerFile` is not exposed through `applyMaintenanceRun`, template learning remains non-authoritative until explicit user confirmation, and tested ledger/log surfaces redact raw secrets.

Findings:

- Critical: 0
- Warning: 1
- Info: 0

## Findings

### Warning: backup metadata lacks an explicit `evidence_ref` field

Files:

- `core/src/maintenance/index.js:555`
- `core/src/maintenance/index.js:945`
- `core/test/maintenance-backup-policy.test.js:26`

`normalizeBackup` currently requires `path`, `checksum_sha256`, and `created_at`, and `applyMaintenanceRun` merges accepted backup paths into `run.evidence_refs`. This is enough to prove a backup path and checksum were present, and it matches `skills/maintain/SKILL.md` lines 85-88. However, the audit checklist asks for backup evidence containing `path/checksum/created_at/evidence_ref` style fields that can support later verify. The implementation does not preserve an explicit `backup.evidence_ref` or backup-specific evidence record reference.

Impact: non-blocking for M5 because destructive/document apply is still blocked without backup metadata, but future verify tooling may need to infer backup evidence from `run.evidence_refs` instead of reading it directly from the backup metadata object.

Recommended follow-up: in a later patch, accept and persist optional `backup.evidence_ref` or `backup.evidence_refs` after redaction, and add a negative/positive test for verify-ready backup evidence shape.

## Evidence

- Run boundary: `FEATURE_QUEUE_FIELDS` includes `feature_id`, `cycle_id`, `patch_id`, `milestone_id`, `milestones`, and `acceptance_criteria`; `validateMaintenanceRun` rejects these fields and removes them from normalized output (`core/src/maintenance/index.js:64`, `core/src/maintenance/index.js:175`, `core/src/maintenance/index.js:209`).
- Apply gate binding: `applyMaintenanceRun` maps each planned item through `evaluateMaintenanceSideEffectGate` before advancing to `applying`; blocked gates return `ok: false` and `status: waiting_confirmation` (`core/src/maintenance/index.js:380`, `core/src/maintenance/index.js:403`, `core/src/maintenance/index.js:418`).
- Side-effect policy: local document writes require backup metadata; local authority writes, remote writes, destructive remote writes, and external actions require confirmation as applicable; destructive remote write also requires backup metadata (`core/src/maintenance/index.js:544`, `core/src/maintenance/index.js:555`, `core/src/maintenance/index.js:569`).
- Ledger authority: `appendMaintenanceLedgerEvent` still supports an internal `options.ledgerFile`, but `applyMaintenanceRun` calls it with only `(input.root, event)` and does not forward `input.ledgerFile` (`core/src/maintenance/index.js:441`, `core/src/maintenance/index.js:590`).
- Template learning: `learnMaintenanceTemplateCandidates` emits `kind: maintenance_template_candidate`, `status: pending_review`, `authority: non_authoritative`, and `authoritative: false`; `reviewMaintenanceTemplateCandidate` only approves/promotes when `actor === "user"` and `confirmed === true` (`core/src/maintenance/index.js:651`, `core/src/maintenance/index.js:670`, `core/src/maintenance/index.js:751`).
- Redaction: ledger normalization redacts event content and records `raw_secret_recorded: false`; ledger validation calls `validateSecretSafeEvidence` (`core/src/maintenance/index.js:636`, `core/src/maintenance/index.js:844`).
- Command/docs surface: `/hw:maintain` family is separated from `/hw:sync` and documented as maintenance queue/ledger/evidence authority, not a pipeline runner (`core/src/commands/index.js:23`, `references/commands-spec.md:270`, `skills/maintain/SKILL.md:18`).

## Tests

Executed:

```bash
node --test core/test/maintenance-run.test.js core/test/maintenance-template-learning.test.js core/test/maintenance-backup-policy.test.js core/test/maintenance-queue.test.js core/test/maintenance-ledger.test.js
```

Result: PASS, 16/16.

Executed:

```bash
node --test core/test/maintenance-command-map.test.js core/test/log-evidence.test.js
```

Result: PASS, 7/7.

## Test Coverage Assessment

Coverage is adequate for the M5 acceptance boundaries:

- Run schema rejects Feature/Cycle/Patch shaped fields and supports the expected run lifecycle statuses.
- Planning accepts non-noon-report orchestration shapes, reducing hard-coded fixture risk.
- Discovery covers local docs folders and Notion child-page tree fixtures with `per_item` and `batch` review grouping.
- Apply tests cover local document backup requirements, external notifications, remote/destructive/external confirmation gates, and the M4 `ledgerFile` override risk.
- Template tests cover pending non-authoritative learning and explicit user-confirmed approval.
- Ledger/log tests cover raw secret redaction and command-map separation.

Remaining test gap: no test currently asserts an explicit backup `evidence_ref` field because the implementation does not model that field yet.

## Residual Risks

- Backup metadata is verify-adjacent rather than fully verify-ready: `path`, `checksum_sha256`, and `created_at` are preserved, but an explicit backup evidence record reference is not.
- `appendMaintenanceLedgerEvent` remains a low-level helper with `options.ledgerFile`; this is acceptable for tests and internal use, but future user-facing command plumbing must continue to avoid exposing that option.
- `transitionMaintenanceRun(... action: "approve")` records approval metadata but does not itself enforce `actor: "user"` plus confirmation. Current apply gates still protect high-risk effects, but command handlers should not treat transition approval alone as sufficient authority for risky side effects.

## Reviewed Files

- `core/src/maintenance/index.js`
- `core/src/index.js`
- `core/src/commands/index.js`
- `skills/maintain/SKILL.md`
- `references/commands-spec.md`
- `core/test/maintenance-run.test.js`
- `core/test/maintenance-template-learning.test.js`
- `core/test/maintenance-backup-policy.test.js`
- `core/test/maintenance-queue.test.js`
- `core/test/maintenance-ledger.test.js`
- `core/test/maintenance-command-map.test.js`
- `core/test/log-evidence.test.js`
- `.pipeline/reviews/C16/M5/test-evidence.md`
- `.pipeline/reviews/C16/M5/implementation-evidence.md`
