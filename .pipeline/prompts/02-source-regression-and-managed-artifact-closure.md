# C20-M3 Source Regression And Managed Artifact Closure

## Objective

Close the source-side change by refreshing managed artifacts, checking docs/instruction consistency, and running focused plus full regression.

## 需求

- Refresh or update source managed instruction artifacts after C20-M2.
- Keep docs/README updates limited to generated or directly stale C20 behavior references.
- Run focused C20 and artifact tests.
- Run full `npm test`.
- Run `git diff --check`.
- Record source closure evidence for the target Cycle input package.

## Boundaries

- In scope:
  - Generated OpenCode command/agent artifacts under the source repository
  - Generated Claude/OpenCode instruction surfaces produced by existing source sync tooling
  - `AGENTS.md`
  - `README.md`
  - `README.en.md`
  - Docs/references only if generated or directly stale because of C20 wording
  - `.pipeline/reviews/C20/M3/*` and source closure report/evidence
- Out of scope:
  - No target repository adaptation writes.
  - No broad rewrite of unrelated command docs.
  - No architecture baseline update unless implementation reveals a real structural change.

## Technical Solution

Treat C20 source changes as an artifact-generation contract update. After shared guidance is implemented, refresh generated surfaces and prove the repository remains internally consistent.

## Technical Route

1. Run existing focused artifact tests after C20-M2.
2. Regenerate or update managed source artifacts using the repository's established sync/generation path.
3. Update docs/README only if they are generated or directly reference the changed behavior boundary.
4. Run focused C20 tests, then full `npm test`, then `git diff --check`.
5. Write concise source closure evidence for the later target Cycle input.

## Research Required

Status: resolved.

Evidence:

- `.plan-state/c20-technical-stack-summary.md` identifies source focused tests and `npm test` as validation.
- `.plan-state/c20-architecture-summary.md` states C19 architecture baseline already covers artifact generation and sync.

## Risks And Alternatives

- Risk: broad generated artifact churn hides the actual C20 change.
- Risk: docs become stale if guidance text changes but generated references are not refreshed.
- Alternative rejected: skip artifact refresh until target adaptation; rejected because managed source surfaces must represent the actual guidance before distribution.
- Mitigation: keep the diff scoped to generated/managed instruction surfaces and record focused evidence.

## 预期测试

- Focused C20 and existing artifact tests pass.
- Full `npm test` passes before source closure.
- `git diff --check` passes for touched source files.
- Static scan classifies stale or contradictory action-boundary wording if any appears.

## Validation Commands

```bash
node --test core/test/c20-consultation-boundary.test.js core/test/commands-rules-artifacts.test.js core/test/c18-instruction-quality-contract.test.js
npm test
git diff --check
```

## Evidence

- Focused test output, full test output, and whitespace check output must be recorded.
- Evidence should explain generated artifact churn and any stale wording classification.
- Output evidence should be recorded under `.pipeline/reviews/C20/M3/test-evidence.md`.

## Audit Focus

- Generated artifacts match the shared guidance and source spec.
- No stale contradictory automation guidance remains unqualified.
- No `.pipeline/` runtime state is copied into target-facing source artifacts.
- Architecture baseline is only changed if implementation proves it necessary.

## Human QA

- Review final generated instruction wording for ordinary user experience: it should ask for confirmation only when the input is discussion-like, not when the user clearly asks for a concrete change.
- Independent validation owner: `test` worker.

## Subworker Assignment Plan

- `test`: owns focused/full regression evidence, stale wording scan classification, and pseudo-test rejection. Output evidence under `.pipeline/reviews/C20/M3/test-evidence.md`.
- `implement`: owns managed artifact refresh and directly stale docs/readme updates.
- `audit`: read-only; reviews generated artifacts, source evidence, architecture drift, and distribution readiness. Output audit under `.pipeline/reviews/C20/M3/audit.md`.
- Main agent: orchestrates workers, integrates accepted changes, updates lifecycle state, and must not satisfy the worker roles itself.
- Non-overlap: the same worker identity must not satisfy both `test` and `implement`; audit remains separate when available.
- Prompt-scoped local execution scope required before spawning source-editing workers:
  - `test` may edit `.pipeline/reviews/C20/M3/test-evidence.md` and test evidence artifacts only; test code edits are only allowed if stale assertions from C20-M2 need direct correction and must be reported.
  - `implement` may edit generated/managed instruction artifacts, directly stale docs/README files, and `.pipeline/reviews/C20/M3/implementation-evidence.md`.
  - `audit` is read-only and may only write `.pipeline/reviews/C20/M3/audit.md` if granted audit report write scope.

## 预期产出

- Refreshed managed instruction artifacts as required by existing generation workflow.
- `.pipeline/reviews/C20/M3/test-evidence.md`
- `.pipeline/reviews/C20/M3/audit.md`
- Source closure evidence for C20-M4.
