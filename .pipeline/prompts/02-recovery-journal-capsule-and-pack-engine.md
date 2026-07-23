# C21-M3 Recovery Journal, Capsule, And Pack Engine

## Objective

Make long-running work recoverable from explicit state and evidence before connecting platform Hooks or migrating this repository.

## Requirements

- Use segmented object-level JSONL as Recovery Journal authority.
- Partition concurrent main/subagent writers by session and writer identity.
- Store large output as content-addressed blobs with summaries and refs.
- Incrementally update Context Capsule and support deterministic full rebuild.
- Seal Recovery Packs with schema, hashes, secret scan, refs, Git/worktree summary, and vector cursors.
- Restore from the newest valid Pack plus Journal delta; fall back to an older Pack when needed.
- Keep restore input size bounded and never require a full transcript.
- Persist explicit rationale summaries, never hidden chain-of-thought.

## Boundaries

In scope: `core/src/recovery/`, redaction/retention support, fault fixtures, and tests.

Out of scope: Codex Hook wrapper/config, aggregate telemetry, full transcript reinjection, public commands, and migration of live history.

## Technical Solution

Journal events are segmented by object/session/writer and replayed from vector cursors. Capsule is a rebuildable reducer over the previous Capsule, turn delta, Records, continuation, and important Receipts. Packs seal a validated recovery entry; the restore planner selects a valid Pack, replays only required deltas, and prunes context by scope, importance, and recency.

## Technical Route

1. Write RED tests for segmentation, truncated JSONL, concurrent writers, blob thresholding, reducer equivalence, corrupt Pack fallback, and restore budgets.
2. Define explicit events for turn, plan, tool, files, verification, workers, hooks, Receipts, compact, and restore.
3. Implement append/rotate/read/replay with tolerant final-line handling and stable cursor semantics.
4. Add redaction before persistence and content-addressed blobs for large output.
5. Implement Capsule incremental reducer and a full rebuild oracle.
6. Implement Pack seal/validate/select/link, including secret/reference integrity checks.
7. Implement restore planner, previous-Pack fallback, Journal delta replay, and size-budget pruning.
8. Add deterministic retention that never removes the last valid restore point.

## Research Required

Status: resolved.

Evidence: the confirmed Recovery design defines event/Pack semantics; official Codex docs say `transcript_path` is convenient but unstable; existing ledger/compact/codex-capture modules do not satisfy the required recovery contract.

## Risks And Alternatives

- Risk: event volume causes growth or append contention.
- Risk: a reducer bug silently omits context.
- Rejected: reinject full transcript; it is too large and depends on unstable format.
- Rejected: append to global `log.yaml`; it already rewrites a large shared file and mixes object scopes.
- Mitigation: segmentation, vector cursors, blobs, retention, reducer-vs-rebuild properties, Pack hash/ref validation.

## Test Specification

- Replay survives a truncated last line without losing previous events.
- Concurrent subagent streams do not contend on one file.
- Blob refs verify digest and load only on demand.
- Incremental Capsule equals full rebuild for generated event sequences.
- Latest Pack corruption falls back to the previous Pack and replays delta.
- A seeded secret never appears in Journal, Capsule, Pack, or blob metadata.
- Restored context stays below configured budget and contains the expected next action.

## Validation Commands

```bash
node --test \
  core/test/recovery-journal.test.js \
  core/test/context-capsule.test.js \
  core/test/recovery-pack.test.js \
  core/test/recovery-faults.test.js
```

Pass signal: all fault scenarios recover the expected continuation without transcript dependency, secret leakage, or budget overflow.

Pseudo-test rejection: unit-only reducers with no filesystem segments or corrupt-Pack fixtures are insufficient.

## Evidence Paths

- `.pipeline/reviews/C21/M3/test-evidence.md`
- `.pipeline/reviews/C21/M3/implementation-evidence.md`
- `.pipeline/reviews/C21/M3/audit.md`
- `.pipeline/reports/02-recovery-journal-capsule-and-pack-engine.report.md`

## Audit Focus

- No hidden reasoning capture.
- No transcript-format authority.
- Concurrent writer safety and stable cursor semantics.
- Retention cannot delete the last valid Pack.
- A Capsule never overwrites Record/runtime authority.

## Subworker Assignment Plan

Status: authorized, strict separation.

- `test`: owns property/fault/filesystem tests and RED/GREEN evidence.
- `implement`: owns `core/src/recovery/` only and cannot edit tests.
- `audit`: independently inspects persistence, redaction, concurrency, restore budgets, and role separation.
- Main agent: orchestration and lifecycle state only.

## Expected Artifacts

- Journal, blob, Capsule, Pack, and restore modules
- property/fault fixtures and tests
- evidence and completion reports
