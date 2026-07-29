# C21-M5 Reference Repository Bootstrap And Schema Activation

## Objective

Convert only necessary Hypo-Workflow history into staged Records, activate this repository as the first new-format workspace, and resume C21 without dual writes.

## Requirements

- This is an internal Bootstrap Job, not a public `/hw:migrate` product capability.
- Extract only facts whose absence could cause a materially different wrong future decision.
- Preserve active requirements, architecture decisions, cross-Cycle constraints, accepted outcomes, important feedback/failures, supersedes relationships, and full current C21 context.
- Do not import raw chat, full tool logs, duplicate reports, secrets, or obsolete intermediate state.
- Extractors, Curator, and Auditor cannot write authoritative Record Store directly.
- One deterministic writer owns IDs, schema, dedupe, indexes, staging, and activation.
- Activate manifest last, freeze legacy writers, create rollback checkpoint, and resume C21 from new runtime/Pack.
- Derive a redacted fixed fixture for CI rather than testing against live `.pipeline` data.

## Boundaries

In scope: internal bootstrap job, bounded legacy sources, staged Record Patches, C21 runtime/continuation/Capsule/Pack, bootstrap Snapshot, reference fixture, activation and rollback evidence.

Out of scope: arbitrary repository migration, public migration command, raw transcript import, deletion of tracked legacy files, and implementation of later Delivery features.

## Technical Solution

Dispatch bounded read-only Extractors by Cycle/source group. A Curator resolves duplicates and superseded decisions. An independent Auditor verifies source coverage, confidence, unsupported inference, schema, and secrets. Only the deterministic writer stages new data. After full validation, the manifest is activated last; legacy files remain frozen residue until M8.

## Technical Route

1. Write RED tests for worker write denial, deterministic patch merge, missing-source/secret audit, activation interruption, rollback, and fresh-process Resume.
2. Freeze a source inventory and selection rubric; record included/excluded source classes.
3. Dispatch multiple read-only Extractors that return typed Record Patches with source refs and confidence.
4. Run Curator over all Patches to dedupe, build supersedes, and select active project-level facts.
5. Run independent Auditor for coverage, unsupported inference, Record type, privacy, and source integrity.
6. Let the deterministic writer allocate IDs, build staging Records/index/Capsule/Pack/Snapshot, and verify hashes.
7. Create a rollback checkpoint and execute schema activation through M1 transaction semantics.
8. Start a fresh process/session, restore C21 from the new Pack, and prove legacy `state.yaml`, `cycle.yaml`, and `log.yaml` remain unchanged.
9. Derive and inspect a redacted deterministic `tests/fixtures/vnext-workspace/` fixture.

## Research Required

Status: resolved.

Evidence: the user approved this repository as the reference workspace and extensive Subagent extraction; the confirmed cutover report defines Extractor/Curator/Auditor/deterministic-writer separation. The current collaboration API supports isolated workers but does not expose exact Terra model selection; role separation remains mandatory and model preference stays adapter-owned.

## Risks And Alternatives

- Risk: obsolete decisions are imported as current or active constraints are omitted.
- Risk: activation strands C21 between schemas.
- Risk: live private Records leak into CI fixture.
- Rejected: copy every old file; it preserves redundancy and contradictory authority.
- Rejected: finish all C21 work on legacy first; it defeats reference-workspace dogfood.
- Mitigation: source refs, confidence, supersedes, independent coverage audit, staging validation, rollback checkpoint, and explicit fixture redaction.

## Test Specification

- Unauthorized worker writes to Record Store are rejected.
- Patch merge is deterministic across worker completion order.
- Curator chooses the active decision while preserving superseded history.
- Auditor catches seeded secret, missing source, and unsupported inference.
- Activation interruption rolls back or rolls forward deterministically.
- Fresh-process Resume restores C21 and writes only new zones.
- Fixed fixture contains no live absolute paths, secrets, or unreviewed private Records.

## Validation Commands And Scenarios

```bash
node --test \
  core/test/bootstrap-migration.test.js \
  core/test/bootstrap-activation.test.js \
  core/test/new-format-single-writer.test.js \
  core/test/record-store.test.js \
  core/test/recovery-pack.test.js
```

Scenario: restart C21 from the activated workspace in a fresh process and compare hashes/mtimes for frozen legacy authority files.

Pass signal: activation occurs only after audit; C21 resumes from a valid Pack; all post-activation writes use new zones; rollback remains usable until the bootstrap checkpoint is accepted.

Pseudo-test rejection: simulated patch arrays with no actual staging/activation or fresh-process restore do not satisfy M5.

## Evidence Paths

- `.pipeline/reviews/C21/M5/test-evidence.md`
- `.pipeline/reviews/C21/M5/extraction-coverage.md`
- `.pipeline/reviews/C21/M5/curation-evidence.md`
- `.pipeline/reviews/C21/M5/audit.md`
- `.pipeline/reviews/C21/M5/implementation-evidence.md`
- `.pipeline/reports/04-reference-repository-bootstrap-and-schema-activation.report.md`

## Audit Focus

- No raw transcript, secret, duplicate authority, or unsupported inference is imported.
- Extractor and Curator outputs are proposals only.
- Activation does not delete or mutate protected legacy files beyond freezing writer access.
- Reference fixture is demonstrably detached and redacted.
- C21 continuation and next action match the pre-activation plan.

## Subworker Assignment Plan

Status: authorized, strict separation.

- `test`: owns migration/activation/fresh-process tests and RED/GREEN evidence; it cannot curate or write production Records.
- `implement`: owns bootstrap-job code and the deterministic writer integration; it cannot edit tests or perform the independent audit.
- `audit`: owns migration coverage/privacy/activation audit and cannot implement or write authoritative Records.
- Auxiliary `extractor` workers: read bounded source groups and return Record Patches only.
- Auxiliary `curator` worker: reads proposed Patches and returns a merged proposal only.
- Main agent: assigns bounded source groups, integrates approved outputs through the deterministic writer, performs protected lifecycle commits, and records all worker lifecycle evidence.
- Non-overlap: test, implement, and audit identities remain distinct; auxiliary workers never substitute for the deterministic writer.

## Expected Artifacts

- bootstrap migration implementation
- staged and activated reference workspace
- rollback checkpoint and redacted CI fixture
- complete extraction, curation, audit, implementation, and completion evidence
