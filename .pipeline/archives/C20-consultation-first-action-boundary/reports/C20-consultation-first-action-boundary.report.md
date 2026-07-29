# C20 Cycle Report — 协商优先的修改启动风格

## Conclusion

C20 is complete and pending user acceptance.

The source repository now has a consultation-first action boundary: discussion/background/idea/complaint/question/solution-discussion inputs are non-editing signals until the assistant shows a Mini-contract in the order `我的理解` -> `问题原因` -> `推荐方案`. Clear imperative requests with concrete targets can still execute directly, and post-plan affirmative replies authorize execution within the shown scope.

The target distribution package is ready, but target repositories have not been modified by this source Cycle. `Codex-VSP` and `VSP-Open-Code` adaptation is intentionally deferred to target-local Cycles.

## Change Summary

- M1 created the source behavior contract and scenario fixtures.
- M2 projected the shared guidance into OpenCode and Claude generated instruction renderers.
- M3 refreshed checked-in source managed artifacts and fixed lifecycle log validation for visible gate feedback records.
- M4 produced the target-local Cycle input package and C20 integration matrix handoff.

## Technical Approach

C20 used a source-first, target-local distribution strategy:

1. Define the behavior contract as a source-owned reference.
2. Test and project the contract into shared generated guidance.
3. Refresh source managed artifacts and run full source regression.
4. Prepare target handoff material without writing target repositories.

The design deliberately keeps `Direct sync scope` separate from `Target-owned scope`, so source-owned managed surfaces can carry the behavior rule while target-specific prompt/runtime tuning remains governed by each target repository.

## Modified Files / Modules

Primary source contract and tests:

- `references/consultation-first-action-boundary.md`
- `core/test/c20-consultation-boundary.test.js`
- `core/test/log-evidence.test.js`

Shared generation and validation:

- `core/src/artifacts/agent-guidance.js`
- `core/src/artifacts/opencode.js`
- `core/src/artifacts/claude.js`
- `core/src/log/index.js`

Representative generated/managed surfaces:

- `AGENTS.md`
- `.opencode/commands/hw:plan.md`
- `.opencode/agents/hw-plan.md`
- `commands/plan.md`
- `.claude/agents/hw-plan.md`
- related generated `.opencode/**`, `.claude/agents/**`, `commands/**`, and `opencode.json` surfaces

Integration and reports:

- `.pipeline/integrations/C20-target-cycle-input.md`
- `.pipeline/integrations/matrix.yaml`
- `.pipeline/reports/00-source-behavior-contract-and-scenario-fixtures.report.md`
- `.pipeline/reports/01-shared-guidance-projection-across-managed-instruction-surfaces.report.md`
- `.pipeline/reports/02-source-regression-and-managed-artifact-closure.report.md`
- `.pipeline/reports/03-target-cycle-input-and-distribution-boundary-package.report.md`

## Test Design

C20 validation combined focused contract tests, artifact projection tests, full source regression, and target handoff checks:

- behavior contract assertions for non-editing signals, Mini-contract order, direct execution carve-out, post-plan authorization, first-use concept explanation, and target-owned scope separation
- generator projection assertions for OpenCode command/agent/root surfaces and Claude command/agent surfaces
- lifecycle log regression for visible-gate feedback statuses
- full `npm test`
- `git diff --check`
- M4 package existence, matrix YAML parse, anchor scans, and read-only target status checks

## Validation Results

- M1 focused behavior contract: `6/6` passing.
- M2 focused projection suite: `23/23` passing.
- M3 post-implementation focused C20/C18/artifact/log suite: `30/30` passing.
- M3 full regression: `npm test` `687/687` passing.
- M3 and M4 `git diff --check`: passing.
- M4 package/matrix validation: package exists, matrix YAML parses, C20/no-write/target-local anchors are present.
- Audits:
  - M1: `PASS_WITH_WARNINGS`, no blockers.
  - M2: `PASS_WITH_WARNINGS`, no functional blockers.
  - M3: `PASS_WITH_WARNINGS`, no blockers.
  - M4: `PASS_WITH_WARNINGS`, no blockers.

## Expected Result

For source-managed Hypo-Workflow instruction surfaces:

- Discussion-like or exploratory user input should not trigger file edits immediately.
- The assistant should first show `我的理解` -> `问题原因` -> `推荐方案`.
- Clear concrete commands can still proceed without an unnecessary confirmation loop.
- After a displayed plan or recommendation, affirmative replies authorize execution within that displayed scope.
- Target-specific prompt/runtime updates must occur in target-local Cycles.

## Problems Encountered

- The restored M3 test worker completed after the main session had timed out waiting; a replacement worker was closed once the original evidence landed.
- Checked-in managed artifacts were stale before M3 refresh.
- Full regression initially failed because lifecycle log validation did not yet accept real visible-gate feedback statuses.
- The source worktree and both target repositories were already dirty, so reports separate C20-owned changes from broader dirty baseline caveats.

## Risks / Follow-Up

- This Cycle is pending user acceptance; `/hw:accept` can close it, and `/hw:reject` should include structured feedback for revision.
- `Codex-VSP` still needs a target-local Cycle that verifies the effective base-instructions path before editing per-model prompts.
- `VSP-Open-Code` still needs a target-local Cycle that reconciles `Prefer automation` with the Mini-contract boundary.
- Source dirty worktree separation is still required before commit/release decisions.

