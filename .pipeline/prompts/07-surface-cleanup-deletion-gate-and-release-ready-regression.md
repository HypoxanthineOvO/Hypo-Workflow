# C21-M8 Surface Cleanup, Deletion Gate, And Release-ready Regression

## Objective

Remove obsolete public/product surfaces only after the new system is proven, ensure generators cannot revive them, and close C21 with audited Skills, plugin, docs, and regression evidence.

## Hard Gate

This prompt is authorized to scan and generate the Deletion Manifest. It is not authorized to delete any candidate until the complete Manifest has been shown in chat and the user has issued a fresh exact `deletion.execute` Receipt.

Any path content hash or relevant Git-state drift after approval invalidates the Receipt and returns this prompt to the gate.

## Requirements

- Rescan the post-M7 dependency graph; do not reuse stale deletion paths from Decompose.
- Classify every candidate as `delete`, `retain_internal`, or `deferred_hidden`.
- Record path, kind, reason, decision refs, generators, dependents, writer targets, replacement, risk, expected SHA-256, reversibility, preconditions, and verification.
- Delete registry/generator sources before derived artifacts so regeneration cannot revive removed commands.
- Preserve reusable internal code only when it has no active legacy writer/discovery path.
- Public/contextual Codex discovery must equal the confirmed nine commands.
- Deferred capabilities must be non-discoverable and zero-write.
- Update Codex-facing docs and remove obsolete notify-only claims.
- Evaluate representative new Skills against the pre-C21 Skill snapshot.
- Retire obsolete tests intentionally and replace them with behavioral contracts; do not change tests merely to hide regressions.

## Boundaries

In scope: Deletion Manifest/gate/execution report, source and generated surface cleanup, command/Skill/plugin/docs/tests, behavior evaluations, full regression, final audit.

Out of scope: Git history rewrite; implementation of deferred adapters/commands; telemetry; Docs/PR/Release redesign; Dashboard/TUI/general automation replacement.

## Technical Solution

Generate cleanup from the post-cutover dependency graph, hash every item, and stop for user authorization. After exact revalidation, execute one controlled batch. Regenerate only the Codex-supported bundle, replace count-based/phrase-only assertions with behavior tests, compare representative Skill routes to the old snapshot, and run final regression plus independent audit.

## Technical Route

1. Write RED negative tests for public exposure, deferred/removed zero-write, regeneration non-revival, and deletion drift.
2. Scan source, generated, test, docs, config, runtime, and tracked legacy candidates after M7.
3. Produce complete Deletion Manifest with dependency graph, hashes, replacements, and blockers.
4. Present the Manifest's full decision context in chat and request a dedicated user Receipt.
5. Immediately before execution, revalidate hashes, Git state, and activation preconditions; stop on any drift.
6. Execute the exact controlled batch, reserve/consume the Receipt, and write an execution report.
7. Regenerate the Codex bundle and prove removed/deferred surfaces cannot reappear.
8. Update Root/public Skills, plugin metadata, README/reference docs, and maintained test/scenario catalog.
9. Snapshot old Skills and run representative onboarding, Goal, Cycle, Maintain, Resume, and Reject evaluations with objective assertions plus human-review output.
10. Run focused tests, full Node tests, all maintained scenarios, plugin/Skill validators, whitespace scan, and independent final audit.

## Research Required

Status: resolved for architecture; exact deletion list is an execution-time authorization gate.

Evidence: the surface scan identified the 53-command regeneration chain and dependency risks; the user confirmed public/internal/deferred/removed categories; Skill Creator and Plugin Creator define behavior evaluation and package validation expectations.

## Risks And Alternatives

- Risk: broad deletion removes reusable internals needed by later adapters.
- Risk: obsolete tests force old architecture back into product.
- Risk: a remaining generator recreates deleted artifacts.
- Rejected: delete from the pre-cutover tree; dependencies and replacements are not stable.
- Rejected: hide every old module forever; legacy writers and maintenance burden remain active.
- Mitigation: post-cutover classification, exact hashes, dedicated Receipt, Git recoverability, regeneration test, and independent dependency audit.

## Test Specification

- Public/contextual command set is exactly nine.
- Deferred/removed capabilities do not appear in any Codex-discovered/generated surface.
- Invoking a deferred compatibility message creates no workspace write.
- Generator reruns do not recreate removed command/Skill/TUI/Rules/Patch/Watchdog artifacts.
- Deletion rejects changed hashes, changed baseline, extra paths, or reused Receipt.
- Skill evaluations test behavior and authority boundaries rather than phrase presence.
- Full maintained test/scenario suites pass after explicit retirements.

## Validation Commands

```bash
npm test
python3 tests/run_regression.py
python3 /home/heyx/.vsp-codex/skills/.system/plugin-creator/scripts/validate_plugin.py .
git diff --check
```

Also run Skill quick validators and the generated Skill evaluation review/benchmark commands selected during M8 implementation.

Pass signal: every maintained command exits 0; only nine commands are discoverable; removed/deferred writers cannot mutate a current workspace; exact deletion audit has no unauthorized path.

Pseudo-test rejection: command-count constants, Markdown phrase scans, or deleting failing scenarios without replacement evidence do not satisfy M8.

## Evidence Paths

- `.pipeline/reviews/C21/M8/test-evidence.md`
- `.pipeline/reviews/C21/M8/deletion-manifest.yaml`
- `.pipeline/reviews/C21/M8/deletion-execution.md`
- `.pipeline/reviews/C21/M8/skill-evaluation.md`
- `.pipeline/reviews/C21/M8/implementation-evidence.md`
- `.pipeline/reviews/C21/M8/audit.md`
- `.pipeline/reports/07-surface-cleanup-deletion-gate-and-release-ready-regression.report.md`
- `.pipeline/reports/C21-final-closure.report.md`

## Audit Focus

- Deleted paths exactly match the authorized Manifest and unchanged hashes.
- Deferred code is non-discoverable and non-writing, not falsely reported as implemented.
- OpenCode/Claude support is not claimed in C21 current docs.
- Skill evaluations cover behavior, not only metadata text.
- Existing unrelated user changes are preserved.
- Final chat report explains changes, approach, files/modules, tests, results, expected outcome, problems, and follow-up risk.

## Subworker Assignment Plan

Status: authorized, strict separation; deletion remains separately gated.

- `test`: owns negative exposure/regeneration/deletion tests, full regression evidence, and Skill evaluation assertions.
- `implement`: owns only the authorized cleanup/config/docs implementation after Receipt; it cannot edit tests to weaken expectations.
- `audit`: independently compares the exact Manifest/Receipt/diff, reviews retirements and evaluation evidence, and checks worker separation.
- Main agent: prepares decision context, obtains the Receipt, invokes controlled executor, integrates approved changes, and writes lifecycle reports. It cannot self-authorize deletion or replace any role.

## Expected Artifacts

- approved and executed Deletion Manifest evidence
- reduced Codex Skill/plugin surface and updated docs
- Skill behavior comparison artifacts
- passing full regression and final C21 audit/closure report
