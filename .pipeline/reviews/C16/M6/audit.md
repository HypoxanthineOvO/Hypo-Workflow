# C16-M6 Audit - Scheduled Global Consolidation And Chat Backfill

审计时间：2026-05-19T23:01:42+08:00  
审计 worker：C16-M6 independent audit worker  
结论：PASS

## Scope

Reviewed files:

- `core/src/maintenance/session-sources.js`
- `core/src/maintenance/consolidation.js`
- `core/src/maintenance/index.js`
- `references/global-consolidation-spec.md`
- `core/test/global-consolidation.test.js`
- `core/test/session-source-discovery.test.js`
- `core/test/maintenance-backfill.test.js`
- `.pipeline/reviews/C16/M6/test-evidence.md`
- `.pipeline/reviews/C16/M6/implementation-evidence.md`

Write boundary honored: this audit only writes `.pipeline/reviews/C16/M6/audit.md`.

## Findings

No blocker findings.

Info:

- The implementation satisfies the safe-local-only boundary for the reviewed APIs. Source discovery uses `fs/promises` local reads and directory traversal only, rejects `safe_local_only:false`, and returns `network_enabled:false` / `remote_writes_enabled:false`.
- Redaction is applied before records leave discovery. Records are classified with `raw_secret_seen`, force `raw_secret_recorded:false`, and current code additionally exports `scrubConsolidationSecretMarkers` to collapse redacted assignment markers such as `password=[REDACTED]`, `api_key=[REDACTED]`, and `Authorization: Bearer [REDACTED]` to plain `[REDACTED]`.
- The latest redaction revision is wired through all reviewed consolidation surfaces: discovery records, generated outputs, and Notion dry-run projection.
- The scheduled global consolidation plan is a system-initiated `maintenance_run`, not a pipeline runner, and explicitly reports no service restart and no remote writes.
- Historical backfill shards are deterministic for daily and weekly modes, use start-inclusive/end-exclusive metadata, and canonicalize source kind order.
- Resume state stores run/shard/cursor/completed IDs and canonical last record refs only; no raw `content`, `messages`, or `blocks` are stored by the API.
- Chinese consolidation outputs include the five expected candidate groups and keep candidates `authority:"non_authoritative"` / `status:"pending_review"`.
- Notion projection is dry-run only and does not call client write/apply methods.

## Evidence

- Safe local source discovery: `discoverConsolidationSources` rejects unsafe mode and records `side_effect:"local_read"` plus `safe_local_only:true` in `core/src/maintenance/session-sources.js:19-65`.
- Local file traversal only: `readFile`, `stat`, and `readdir` are the only source discovery I/O in `core/src/maintenance/session-sources.js:101-140`; the required scan found no `fetch`, `http`, `child_process`, `exec`, `spawn`, or Notion write/apply usage in the reviewed maintenance files.
- Redaction/classification before return: `classifyAndRedactRecord` detects leaks, redacts, calls `scrubConsolidationSecretMarkers`, and sets `raw_secret_recorded:false` in `core/src/maintenance/session-sources.js:75-99`.
- Secret marker scrub helper: `scrubConsolidationSecretMarkers` is exported and recursively collapses `Authorization: Bearer [REDACTED]`, `cookie: [REDACTED]`, and secret assignment markers including `api_key=[REDACTED]`, `token=[REDACTED]`, and `password=[REDACTED]` in `core/src/maintenance/session-sources.js:89-99`.
- Schedule/run contract: `planGlobalConsolidationRun` sets `kind:"maintenance_run"`, `initiated_by:"system"`, `pipeline_runner:false`, `service_restart_required:false`, and `remote_writes_enabled:false` in `core/src/maintenance/consolidation.js:20-55`.
- Backfill contract: `planHistoricalBackfillShards` canonicalizes source kinds, emits deterministic cursors, and writes `boundary:"start_inclusive_end_exclusive"` in `core/src/maintenance/consolidation.js:58-99`.
- Resume state safety: `buildConsolidationResumeState` only emits run/shard/cursor/completed IDs and sanitized record refs in `core/src/maintenance/consolidation.js:102-114`.
- Candidate output contract: `generateGlobalConsolidationOutputs` emits Chinese summary and five candidate arrays with sensitivity metadata, then applies `scrubConsolidationSecretMarkers(redactSecrets(...))` before returning in `core/src/maintenance/consolidation.js:117-158`; `candidate` fixes `language:"zh-CN"`, `authority:"non_authoritative"`, and `status:"pending_review"` in `core/src/maintenance/consolidation.js:216-229`.
- Notion dry-run boundary: `projectConsolidationToNotionDryRun` scrubs input outputs, builds payload/operations only, and returns a scrubbed dry-run object with `mode:"dry-run"`, `remote_writes_enabled:false`, and `apply_required:false` in `core/src/maintenance/consolidation.js:161-190`.
- Public export path is present through `core/src/maintenance/index.js` and `core/src/index.js`.
- Test evidence documents RED intent and fixture coverage in `.pipeline/reviews/C16/M6/test-evidence.md:3-30` and boundary intent in `.pipeline/reviews/C16/M6/test-evidence.md:96-104`.
- Implementation evidence matches the observed APIs and boundary statement in `.pipeline/reviews/C16/M6/implementation-evidence.md:11-44`.

## Tests

Executed:

```bash
node --test core/test/global-consolidation.test.js core/test/session-source-discovery.test.js core/test/maintenance-backfill.test.js
```

Result: PASS, 9/9 tests passing.

```bash
node --test core/test/knowledge-ledger.test.js
```

Result: PASS, 8/8 tests passing.

```bash
node --input-type=module - <<'NODE'
import { generateGlobalConsolidationOutputs, projectConsolidationToNotionDryRun, scrubConsolidationSecretMarkers } from './core/src/index.js';
// Builds outputs/projection with raw and already-redacted secret assignment markers, then scans serialized output.
NODE
```

Result: PASS, custom serialization leak probe printed `secretLeak=false`.

```bash
rg -n "fetch\\(|http|appendBlock|updateBlock|createPage|deleteBlock|apply\\(|child_process|exec\\(|spawn\\(|service_restart|required|remote_writes_enabled|safe_local_only|raw_secret_recorded" core/src/maintenance/consolidation.js core/src/maintenance/session-sources.js
```

Result: PASS for prohibited-call review. Matches were expected field names, regex literals, and safety flags only; no network, process execution, service restart, dependency install, or Notion write/apply call was found.

```bash
git diff --check
```

Result: PASS.

## Residual Risks

- Tests are strong for the new contract but mostly fixture-driven. They do not exhaustively exercise real-world Codex/OpenCode/Claude session variants, malformed JSON/JSONL, very large transcripts, symlinked directories, or unusual Notion export layouts.
- Secret detection relies on the shared regex-based redaction helper plus consolidation marker scrubbing. It covers the requested token/password/api_key/authorization patterns, but novel secret formats may still require future pattern expansion.
- `planHistoricalBackfillShards` defaults `end_date` from the host UTC date. Explicit date inputs are deterministic and covered; scheduler integration should pass explicit dates if Asia/Shanghai day-boundary behavior becomes user-visible.

## Final Verdict

PASS. No blocker found for C16-M6 acceptance under the requested audit scope.
