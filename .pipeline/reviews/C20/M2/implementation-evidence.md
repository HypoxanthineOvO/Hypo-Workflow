# C20-M2 Implementation Evidence

## Scope

Worker: `implement`

Task completed: shared consultation-first guidance projection across managed instruction surfaces.

Allowed files touched:

- `core/src/artifacts/agent-guidance.js`
- `core/src/artifacts/opencode.js`
- `core/src/artifacts/claude.js`
- `.pipeline/reviews/C20/M2/implementation-evidence.md`

No tests, Workflow state/log/progress files, or target repositories were edited.

## Implementation Summary

- Added `CONSULTATION_FIRST_ACTION_BOUNDARY_GUIDANCE` as the shared C20 consultation-first guidance source.
- Kept the guidance concise while covering:
  - consultation-first / 协商优先 label
  - Mini-contract order: `我的理解 -> 问题原因 -> 推荐方案`
  - discussion/background/idea/complaint/question/solution-discussion as non-editing / no file edits signals
  - clear imperative plus concrete target direct execution carve-out
  - post-plan affirmative replies as execution authorization
  - first-use new concept one-sentence explanation
  - direct sync scope versus target-owned scope
  - `Codex-VSP` and `VSP-Open-Code` prompt/reminder boundaries
- Injected the shared guidance into OpenCode command, OpenCode agent, and root `AGENTS.md` rendering.
- Injected the shared guidance into Claude slash command and Claude agent rendering.
- Updated root `AGENTS.md` rendering to project shared Four-Rule and Ask guidance without editing the template file.

## Validation

Command:

```bash
node --test core/test/c20-consultation-boundary.test.js core/test/commands-rules-artifacts.test.js core/test/c18-instruction-quality-contract.test.js
```

Result: GREEN, exit code `0`.

Summary:

- Tests: `23`
- Passed: `23`
- Failed: `0`
- Cancelled/skipped/todo: `0`

## Risks

- The guidance is intentionally concise; future target-specific prompt/reminder expansions should remain in target-owned Cycles, not source-side direct sync.
- Root `AGENTS.md` now receives shared guidance through the renderer, so generated output is covered, but the raw template remains minimal by design.
