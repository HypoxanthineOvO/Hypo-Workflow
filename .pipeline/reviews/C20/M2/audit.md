# C20-M2 Audit

> Language: zh-CN | Timezone: Asia/Shanghai

## verdict

PASS_WITH_WARNINGS.

共享 `CONSULTATION_FIRST_ACTION_BOUNDARY_GUIDANCE` 已覆盖 C20-M1 合同核心，并通过同一个常量投影到 OpenCode command、OpenCode agent、OpenCode root `AGENTS.md`、Claude command 和 Claude agent。focused 验证命令通过 23/23。

无功能阻断项。主要警告是最终工作区 diff 与 worker 证据的归属不完全一致：存在未被 C20-M2 evidence 明确归属的既有测试/模板变更，主控在接受 milestone 前应确认这些变更属于相邻工作、被纳入本 milestone，或从本 milestone diff 中排除。

## reviewed_refs

- `.pipeline/prompts/01-shared-guidance-projection-across-managed-instruction-surfaces.md`
- `references/consultation-first-action-boundary.md`
- `core/src/artifacts/agent-guidance.js`
- `core/src/artifacts/opencode.js`
- `core/src/artifacts/claude.js`
- `core/test/c20-consultation-boundary.test.js`
- `core/test/commands-rules-artifacts.test.js`
- `core/test/c18-instruction-quality-contract.test.js`
- `.pipeline/reviews/C20/M2/test-evidence.md`
- `.pipeline/reviews/C20/M2/implementation-evidence.md`

Additional read-only diff context:

- `plugins/opencode/templates/AGENTS.md`

## checks

- C20-M1 contract coverage: PASS. `CONSULTATION_FIRST_ACTION_BOUNDARY_GUIDANCE` covers non-editing signals, Mini-contract order, clear imperative + concrete target direct execution, post-plan affirmative authorization, first-use concept explanation, direct sync scope, and target-owned boundaries for `Codex-VSP` / `VSP-Open-Code`.
- Shared projection: PASS. OpenCode imports the shared constant and injects it through `renderCommand`, `renderAgent`, and `renderAgentsInstruction`; Claude imports the same constant and injects it through slash command and agent rendering.
- Root `AGENTS.md` managed output: PASS_WITH_NOTE. Injecting Four-Rule, Ask, and consultation-first guidance in the renderer is reasonable and avoids needing template-only projection for generated output.
- Test quality: PASS. The C20 test checks source contract semantics, exported shared guidance, and generated OpenCode/Claude/root surfaces with semantic anchors, not just headings.
- Direct execution compatibility: PASS. The guidance explicitly preserves direct execution for clear imperative requests with concrete targets, so it does not collapse into ask-before-everything behavior.
- Target-owned boundary: PASS_WITH_LIMITATION. Reviewed source diff/evidence does not show target repository writes; `Codex-VSP` per-model prompt work and `VSP-Open-Code` local reminder work remain target-owned Cycle work. I did not inspect target repo git metadata to avoid target-side side effects.

## issues

### WARN-01 — Diff/evidence attribution gap

- Severity: Warning
- Dimension: Risk / Engineering
- Location: `.pipeline/reviews/C20/M2/test-evidence.md`, `.pipeline/reviews/C20/M2/implementation-evidence.md`, final source diff
- Evidence:
  - Test evidence lists only `core/test/c20-consultation-boundary.test.js` and `.pipeline/reviews/C20/M2/test-evidence.md` as test-worker touched files.
  - Implementation evidence lists only `core/src/artifacts/agent-guidance.js`, `core/src/artifacts/opencode.js`, `core/src/artifacts/claude.js`, and `.pipeline/reviews/C20/M2/implementation-evidence.md` as implement-worker touched files.
  - Final diff also contains tracked changes in `core/test/commands-rules-artifacts.test.js`, `core/test/c18-instruction-quality-contract.test.js`, and `plugins/opencode/templates/AGENTS.md`.
- Impact: The functional implementation is green, but worker separation evidence is not clean enough to prove every changed file in the final diff is owned by the claimed worker boundaries.
- Recommendation: Before accepting C20-M2, main orchestration should explicitly attribute these adjacent/template/test changes to their owning milestone/worker, or remove them from the C20-M2 acceptance diff.

### INFO-01 — New C20 evidence and focused test are untracked in git index context

- Severity: Info
- Dimension: Engineering
- Location: `core/test/c20-consultation-boundary.test.js`, `.pipeline/reviews/C20/M2/test-evidence.md`, `.pipeline/reviews/C20/M2/implementation-evidence.md`
- Evidence: `git ls-files --others --exclude-standard` reports these files as untracked.
- Impact: Not a behavior issue, but final commit/review packaging must include them or the passing validation evidence will not travel with the implementation.
- Recommendation: Ensure these files are intentionally added by the main integrator when preparing the final commit.

## risks/follow-up

- Prompt length risk is acceptable for this milestone. The consultation-first text is concise enough for shared base surfaces, but it is injected into several generated files, so future expansions should stay in the source contract or target-owned Cycles rather than growing every runtime surface.
- The wording has a reasonable direct-execution carve-out. The residual risk is interpretation around questions that also contain concrete edit commands; the current text resolves this by treating discussion framing as stronger than vague action words and allowing explicit action + target when not framed as discussion.
- The raw `plugins/opencode/templates/AGENTS.md` diff adds completion/report-surface guidance unrelated to C20 consultation-first projection. It may be valid adjacent work, but it should not be silently counted as C20-M2 implementation unless ownership is recorded.

## worker_separation

- `test` worker: Evidence claims ownership of `core/test/c20-consultation-boundary.test.js` and `.pipeline/reviews/C20/M2/test-evidence.md`; no implementation files are claimed by the test worker.
- `implement` worker: Evidence claims ownership of `core/src/artifacts/agent-guidance.js`, `core/src/artifacts/opencode.js`, `core/src/artifacts/claude.js`, and `.pipeline/reviews/C20/M2/implementation-evidence.md`; no tests are claimed by the implement worker.
- Audit worker: This review was read-only except writing `.pipeline/reviews/C20/M2/audit.md`.
- Separation verdict: PASS_WITH_WARNINGS because the claimed test/implement ownership is logically separated, but final diff attribution contains extra files not explained by the two evidence reports.

## validation

Command:

```bash
node --test core/test/c20-consultation-boundary.test.js core/test/commands-rules-artifacts.test.js core/test/c18-instruction-quality-contract.test.js
```

Result:

- Exit code: 0
- Tests: 23
- Passed: 23
- Failed: 0
- Skipped/todo/cancelled: 0

## completion_narrative

- Change Summary: Audited C20-M2 shared consultation-first guidance projection. Result is PASS_WITH_WARNINGS with 0 Critical, 1 Warning, and 1 Info item.
- Technical Approach: Compared the C20 source contract, shared guidance constant, renderer projection paths, generated-surface tests, worker evidence, and final diff ownership against the milestone prompt.
- Modified Files / Modules: This audit only wrote `.pipeline/reviews/C20/M2/audit.md`; reviewed the refs listed above.
- Test Design: Used semantic source/generation inspection plus the user-specified focused Node test command.
- Validation Results: Focused command passed 23/23. Functional projection is valid; evidence attribution needs cleanup before clean acceptance.
- Expected Result: Generated OpenCode/Claude/root instruction surfaces consistently carry the consultation-first boundary while clear imperative concrete tasks still execute directly.
- Problems Encountered: Worker evidence does not fully explain all files present in final diff.
- Risks / Follow-Up: Attribute or exclude adjacent test/template changes before acceptance; keep target-owned prompt/reminder work in target Cycles.
