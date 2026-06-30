# C20-M1 Source Behavior Contract And Scenario Fixtures

## Objective

Create the authoritative source-side behavior contract for the consultation-first action boundary and encode the approved scenarios as focused testable fixtures.

## 需求

- Add `references/consultation-first-action-boundary.md` as the source modification spec.
- Add or extend `core/test/c20-consultation-boundary.test.js`.
- The contract must state that discussion/background/idea/complaint/question/solution-discussion inputs should produce a Mini-contract first and must not edit files.
- The Mini-contract shape is `我的理解` -> `问题原因` -> `推荐方案`.
- The contract must preserve direct execution for clear imperative requests with concrete targets.
- Post-plan affirmative replies such as `可以`, `确认`, `OK`, `go ahead`, and `apply it` authorize execution.
- First use of a new concept in the Cycle should include a one-sentence explanation.

## Boundaries

- In scope:
  - `references/consultation-first-action-boundary.md`
  - `core/test/c20-consultation-boundary.test.js`
  - Optional small fixture/helper data inside that focused test
- Out of scope:
  - No OpenCode or Claude renderer changes.
  - No target repository writes.
  - No runtime prompt router or execution engine changes.

## Technical Solution

Use a source-owned Markdown contract as the stable behavior authority and a focused Node contract test as the executable guardrail. The spec becomes the input for shared guidance and later target-local Cycles.

## Technical Route

1. Write the consultation-first action boundary spec with intent classification, Mini-contract shape, direct execution authorization, and first-use concept explanation.
2. Include scenario fixtures in the spec: discussion interception, direct execution pass-through, and post-plan authorization.
3. Include a distribution checklist that separates source-owned direct sync surfaces from target-owned local adaptation surfaces.
4. Add a focused Node test that reads the spec and checks the required scenario and distribution anchors.
5. Keep the spec concise enough to be copied into target Cycle briefs without carrying source-only runtime details.

## Research Required

Status: resolved.

Evidence:

- `.plan-state/c20-discover-summary.md` records user-approved behavior boundaries.
- `.plan-state/c20-technical-stack.yaml` defines source modification spec contents.
- `.plan-state/c20-architecture.yaml` selects `references/consultation-first-action-boundary.md` as the source contract.

## Risks And Alternatives

- Risk: spec-only work could become non-executable guidance.
- Risk: wording could over-block clear implementation requests.
- Alternative rejected: put the rule only in `AGENTS.md`; rejected because target distribution needs an authoritative spec and tests.
- Alternative rejected: implement runtime intent classification; rejected because C20 is prompt/instruction behavior, not a runner/router change.
- Mitigation: attach concrete scenario assertions and preserve direct execution pass-through in the contract.

## 预期测试

- Assert the spec defines discussion/background/idea/complaint/question/solution-discussion signals as non-editing signals.
- Assert the spec preserves direct execution for clear imperative requests with concrete targets.
- Assert the spec treats post-plan affirmative replies as execution authorization.
- Assert the spec contains first-use concept explanation and Mini-contract structure.
- Assert the spec separates direct sync scope from target-owned scope.

## Validation Commands

```bash
node --test core/test/c20-consultation-boundary.test.js
```

## Evidence

- Focused test exits 0.
- Failure output must identify the missing contract anchor if any scenario or distribution boundary is absent.
- Test evidence should be recorded under `.pipeline/reviews/C20/M1/test-evidence.md`.

## Audit Focus

- The spec reflects user decisions exactly and does not invent a broader ask-before-everything rule.
- The test checks meaningful scenario anchors, not only title text.
- No target repository files are touched.

## Human QA

- Review the Chinese wording for ordinary user-facing behavior. It should sound natural and should not expose internal policy jargon unless useful.
- Independent validation owner: `test` worker.

## Subworker Assignment Plan

- `test`: owns `write_tests` and `review_tests`; designs focused assertions for the contract anchors and records evidence under `.pipeline/reviews/C20/M1/test-evidence.md`.
- `implement`: owns the source contract and scoped implementation edits for this milestone.
- `audit`: read-only; reviews the final diff, evidence quality, user-decision fidelity, and no-target-write boundary. Output audit under `.pipeline/reviews/C20/M1/audit.md`.
- Main agent: orchestrates workers, integrates accepted changes, updates lifecycle state, and must not satisfy the `test`, `implement`, or `audit` roles itself.
- Non-overlap: the same worker identity must not satisfy both `test` and `implement`; audit remains separate when available.
- Prompt-scoped local execution scope required before spawning source-editing workers:
  - `test` may edit `core/test/c20-consultation-boundary.test.js` and `.pipeline/reviews/C20/M1/test-evidence.md`.
  - `implement` may edit `references/consultation-first-action-boundary.md` and `.pipeline/reviews/C20/M1/implementation-evidence.md`.
  - `audit` is read-only and may only write `.pipeline/reviews/C20/M1/audit.md` if the workflow grants audit report write scope.

## 预期产出

- `references/consultation-first-action-boundary.md`
- `core/test/c20-consultation-boundary.test.js`
- `.pipeline/reviews/C20/M1/test-evidence.md`
- `.pipeline/reviews/C20/M1/audit.md`
