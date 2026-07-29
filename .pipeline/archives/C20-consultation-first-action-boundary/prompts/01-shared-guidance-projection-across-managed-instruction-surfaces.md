# C20-M2 Shared Guidance Projection Across Managed Instruction Surfaces

## Objective

Project the consultation-first contract into shared agent guidance and managed OpenCode, Claude, and root instruction outputs.

## 需求

- Add concise shared guidance for the C20 consultation-first action boundary.
- Project it through OpenCode command, OpenCode agent, Claude command, Claude agent, and managed root instruction paths.
- Keep automation compatible: clear imperative plus concrete target still executes directly.
- Keep first-use concept explanation visible where it affects user-facing behavior.

## Boundaries

- In scope:
  - `core/src/artifacts/agent-guidance.js`
  - `core/src/artifacts/opencode.js`
  - `core/src/artifacts/claude.js`
  - `plugins/opencode/templates/AGENTS.md` only if shared injection is insufficient
  - `core/test/commands-rules-artifacts.test.js`
  - `core/test/c18-instruction-quality-contract.test.js`
  - `core/test/c20-consultation-boundary.test.js`
- Out of scope:
  - No `Codex-VSP` per-model prompt edits.
  - No `VSP-Open-Code` local reminder expansion.
  - No removal of existing automation guidance.

## Technical Solution

Add one shared guidance constant, then inject it through the existing artifact generation path so OpenCode, Claude, and managed root instructions do not drift. Define the boundary as discussion-signal interception, not blanket manual approval.

## Technical Route

1. Add a concise consultation-first guidance constant next to existing shared guidance in `core/src/artifacts/agent-guidance.js`.
2. Reference the C20 source spec in naming or comments only where useful; do not duplicate long policy text across renderers.
3. Inject the guidance into OpenCode `renderCommand`, `renderAgent`, and root `AGENTS` rendering path.
4. Inject the same guidance into Claude command and agent rendering.
5. Use the template only for root-only framing if `renderAgentsInstruction` cannot cover it cleanly.
6. Update focused and existing artifact tests to assert projection across managed surfaces.

## Research Required

Status: resolved.

Evidence:

- `core/src/artifacts/agent-guidance.js` already centralizes shared guidance.
- `core/src/artifacts/opencode.js` and `core/src/artifacts/claude.js` already consume shared guidance.
- `.plan-state/c20-architecture.yaml` identifies `plugins/opencode/templates/AGENTS.md` only as fallback/root template surface.

## Risks And Alternatives

- Risk: guidance becomes repetitive in generated instructions.
- Risk: clear tasks start requiring confirmation because the direct-execution exception is unclear.
- Risk: root `AGENTS.md` template and generated renderer diverge.
- Alternative rejected: paste the full C20 spec into every command; rejected because it creates drift and prompt bloat.
- Alternative rejected: only update root `AGENTS.md`; rejected because command and agent surfaces are also effective runtime instructions.
- Mitigation: keep shared guidance short, test direct-execution exception, and prefer one injected constant.

## 预期测试

- Generated OpenCode command guidance includes discussion-signal interception and Mini-contract language.
- Generated OpenCode agent guidance includes the same shared boundary.
- Generated Claude command and agent guidance includes the same shared boundary.
- Managed root `AGENTS.md` behavior includes the consultation-first boundary or receives it through shared rendering.
- Existing Ask gate and Plan discipline tests still pass.

## Validation Commands

```bash
node --test core/test/c20-consultation-boundary.test.js core/test/commands-rules-artifacts.test.js core/test/c18-instruction-quality-contract.test.js
```

## Evidence

- Focused artifact tests exit 0.
- Test evidence should show which generated surfaces were asserted.
- Output evidence should be recorded under `.pipeline/reviews/C20/M2/test-evidence.md`.

## Audit Focus

- Implementation uses a shared source instead of platform-specific drift.
- Automation remains available for clear imperative concrete tasks.
- Generated surfaces include first-use concept explanation where it affects user-facing behavior.
- No target-owned prompt files are edited.

## Human QA

- Review whether the inserted guidance is concise enough for base prompt surfaces.
- Independent validation owner: `test` worker.

## Subworker Assignment Plan

- `test`: owns generated-artifact assertions and focused instruction-quality checks. Output evidence under `.pipeline/reviews/C20/M2/test-evidence.md`.
- `implement`: owns shared guidance and renderer/template edits within the C20 scope.
- `audit`: read-only; reviews duplication, automation compatibility, renderer consistency, and target-owned boundary. Output audit under `.pipeline/reviews/C20/M2/audit.md`.
- Main agent: orchestrates workers, integrates accepted changes, updates lifecycle state, and must not satisfy the worker roles itself.
- Non-overlap: the same worker identity must not satisfy both `test` and `implement`; audit remains separate when available.
- Prompt-scoped local execution scope required before spawning source-editing workers:
  - `test` may edit the listed focused tests and `.pipeline/reviews/C20/M2/test-evidence.md`.
  - `implement` may edit `core/src/artifacts/agent-guidance.js`, `core/src/artifacts/opencode.js`, `core/src/artifacts/claude.js`, `plugins/opencode/templates/AGENTS.md`, and `.pipeline/reviews/C20/M2/implementation-evidence.md`.
  - `audit` is read-only and may only write `.pipeline/reviews/C20/M2/audit.md` if granted audit report write scope.

## 预期产出

- Updated shared guidance and renderer projection.
- Updated focused artifact tests.
- `.pipeline/reviews/C20/M2/test-evidence.md`
- `.pipeline/reviews/C20/M2/audit.md`
