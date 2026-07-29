# C20-M3 Source Regression And Managed Artifact Closure Report

## Conclusion

Result: `PASS_WITH_WARNINGS`.

C20 source-side closure is complete. The consultation-first behavior contract is now represented in source-managed OpenCode, Claude, root `AGENTS.md`, and command surfaces. The full regression suite passes after fixing lifecycle log validation for real visible-gate feedback records.

Warnings remain because the source worktree and both target repositories were already dirty. The C20-M3 evidence separates C20-owned source closure from those broader dirty states, and no target repository writes were performed in this source Cycle.

## Change Summary

- Refreshed checked-in managed instruction artifacts so key source-owned surfaces include `Consultation-First Action Boundary / 协商优先`.
- Added explicit lifecycle log support for visible gate feedback events and statuses.
- Preserved the target-owned boundary: `Codex-VSP` per-model prompts and `VSP-Open-Code` local reminder/runtime prompt wording are not edited by this source Cycle.
- Removed the M3 blockers found by the test worker:
  - stale managed artifacts
  - full `npm test` failing on lifecycle log schema/status drift

## Technical Approach

M3 treated C20 as an artifact-generation closure problem. The implementation used the existing artifact writers rather than hand-editing each generated surface, then added narrow validator support for the exact gate feedback states already present in `.pipeline/log.yaml`.

The lifecycle log change is whitelist-style: `gate` became a known family, and only these concrete statuses were added:

- `ready_for_visible_gate`
- `needs_prompt_source_before_vsp_opencode_write`
- `needs_plan_visible_summary`

## Modified Files And Modules

Core C20 source/validation changes:

- `core/src/log/index.js`
- `core/test/log-evidence.test.js`
- `core/src/artifacts/agent-guidance.js`
- `core/src/artifacts/opencode.js`
- `core/src/artifacts/claude.js`
- `references/consultation-first-action-boundary.md`
- `core/test/c20-consultation-boundary.test.js`

Representative refreshed managed surfaces:

- `AGENTS.md`
- `.opencode/commands/hw:plan.md`
- `.opencode/agents/hw-plan.md`
- `commands/plan.md`
- `.claude/agents/hw-plan.md`
- other generated `.opencode/**`, `.claude/agents/**`, `commands/**`, and `opencode.json` surfaces produced by the existing artifact writer

Evidence and review artifacts:

- `.pipeline/reviews/C20/M3/test-evidence.md`
- `.pipeline/reviews/C20/M3/implementation-evidence.md`
- `.pipeline/reviews/C20/M3/audit.md`

## Test Design

The validation covered three layers:

- Behavior contract tests: discussion-like inputs must stop at a Mini-contract, direct concrete imperatives may execute, and post-plan affirmative replies authorize only the shown scope.
- Artifact projection tests: OpenCode command/agent/root surfaces and Claude command/agent surfaces must receive the shared consultation-first guidance.
- Regression tests: the full repository test suite must pass, and `git diff --check` must remain clean.

## Validation Results

- `node --test core/test/c20-consultation-boundary.test.js core/test/commands-rules-artifacts.test.js core/test/c18-instruction-quality-contract.test.js`: initially `23/23` passing.
- `npm test`: initially failed at `core/test/log-evidence.test.js` because real gate feedback statuses were unsupported.
- After implementation:
  - `node --test core/test/log-evidence.test.js core/test/c20-consultation-boundary.test.js core/test/commands-rules-artifacts.test.js core/test/c18-instruction-quality-contract.test.js`: `30/30` passing.
  - `npm test`: `687/687` passing.
  - `git diff --check`: passing.
- Audit verdict: `PASS_WITH_WARNINGS`, no blockers.

## Expected Result

Agents using source-managed Hypo-Workflow instruction surfaces should now treat discussion/background/idea/complaint/question/solution-discussion inputs as non-editing signals and answer first with:

1. `我的理解`
2. `问题原因`
3. `推荐方案`

They may still execute directly for clear imperative requests with concrete targets, and they may treat post-plan affirmative replies as execution authorization within the displayed scope.

## Problems Encountered

- The original M3 test worker result arrived after the restored session had already timed out waiting; a replacement worker was briefly started and then closed once the original evidence landed.
- Checked-in managed surfaces were stale even though generator-level tests passed.
- Full regression exposed lifecycle log validator drift from earlier visible-gate records.

## Risks And Follow-up

- The source worktree has many dirty files beyond the narrow M3 closure surface. They must be separated before commit/release decisions.
- `/home/heyx/Codex-VSP` and `/home/heyx/VSP-Open-Code` are dirty, but M3 did not write them. Target adaptation must happen in target-local Cycles.
- `plugins/opencode/templates/AGENTS.md` does not directly duplicate the C20 guidance; current design injects shared guidance through `core/src/artifacts/opencode.js`. This is acceptable for M3, but can be revisited if the template itself must become a readable source contract.

