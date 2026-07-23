# C20-M2 Report — Shared Guidance Projection Across Managed Instruction Surfaces

## Conclusion

C20-M2 completed with `PASS_WITH_WARNINGS` and no functional blockers. The consultation-first boundary is now a shared guidance constant and is projected into OpenCode command, OpenCode agent, OpenCode root `AGENTS.md`, Claude command, and Claude agent generated surfaces.

## Change Summary

- Added `CONSULTATION_FIRST_ACTION_BOUNDARY_GUIDANCE`.
- Injected the shared guidance into OpenCode command, agent, and root instruction rendering.
- Injected the shared guidance into Claude slash command and agent rendering.
- Root `AGENTS.md` generated output now receives Four-Rule and Ask guidance through the renderer.
- Added focused projection tests in the C20 contract test file.

## Technical Approach

The implementation keeps the source contract in `references/consultation-first-action-boundary.md` and uses a concise shared guidance constant for generated prompt surfaces. This avoids copying the full contract into every artifact while still preserving the Mini-contract order, non-editing discussion signals, direct execution carve-out, post-plan authorization, first-use concept explanation, and target-owned distribution boundary.

## Modified Files / Modules

C20-M2 owned changes:

- `core/src/artifacts/agent-guidance.js`
- `core/src/artifacts/opencode.js`
- `core/src/artifacts/claude.js`
- `core/test/c20-consultation-boundary.test.js`
- `.pipeline/reviews/C20/M2/test-evidence.md`
- `.pipeline/reviews/C20/M2/implementation-evidence.md`
- `.pipeline/reviews/C20/M2/audit.md`
- `.pipeline/reviews/C20/M2/diff-ownership-note.md`

Adjacent dirty context not claimed by M2 workers:

- `core/test/commands-rules-artifacts.test.js`
- `core/test/c18-instruction-quality-contract.test.js`
- `plugins/opencode/templates/AGENTS.md`

## Test Design

The focused C20 tests now validate:

- exported shared guidance constant
- OpenCode generated `/hw:plan` command
- OpenCode `hw-plan` agent
- OpenCode root `AGENTS.md`
- Claude `/hw:plan` command
- Claude `hw-test` agent

Existing artifact and instruction-quality regressions remain in the command to catch root renderer and Ask/Four-Rule regressions.

## Validation Results

- RED: focused M2 command exited 1 with 19/23 passing and 4 failures for missing guidance/projection.
- GREEN: focused M2 command exited 0 with 23/23 passing.
- Audit: `PASS_WITH_WARNINGS`, no blockers. Warning is limited to dirty-worktree attribution for adjacent files.

Validation command:

```bash
node --test core/test/c20-consultation-boundary.test.js core/test/commands-rules-artifacts.test.js core/test/c18-instruction-quality-contract.test.js
```

## Expected Result

Managed instruction generation now carries the consultation-first boundary consistently across OpenCode and Claude while preserving direct execution for clear imperative concrete tasks.

## Problems Encountered

The repository already had adjacent dirty changes in artifact tests and the OpenCode AGENTS template. M2 records these as context rather than worker-owned changes.

## Risks / Follow-Up

- M3 must refresh actual managed artifacts and verify rendered source outputs, not just generator functions.
- The shared guidance should remain concise; larger target-specific prompt work belongs in target-local Cycles.
- M4 must not treat source direct sync as permission to edit target-owned Codex-VSP or VSP-Open-Code prompt/reminder files.
