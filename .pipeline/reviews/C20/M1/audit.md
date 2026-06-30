# C20-M1 Audit — Source Behavior Contract

Timestamp: 2026-06-30T20:11:23+08:00

Worker: audit

## verdict

PASS_WITH_WARNINGS

- Blockers: none.
- Critical findings: 0.
- Warning findings: 0.
- Info / follow-up risks: 3.
- Gate result: M1 can proceed. The source behavior contract and focused tests satisfy the approved milestone scope; later milestones must preserve the source/target distribution boundary and avoid turning the contract into a broader ask-before-everything rule.

## reviewed_refs

- `.pipeline/prompts/00-source-behavior-contract-and-scenario-fixtures.md`
- `references/consultation-first-action-boundary.md`
- `core/test/c20-consultation-boundary.test.js`
- `.pipeline/reviews/C20/M1/test-evidence.md`
- `.pipeline/reviews/C20/M1/implementation-evidence.md`
- `.pipeline/state.yaml`
- `.pipeline/cycle.yaml`
- `.pipeline/config.yaml`

## checks

- User-confirmed scope fidelity: pass.
  - The prompt requires a source-side behavior contract and focused executable fixtures, with no renderer, runtime router, execution engine, or target repository writes in scope.
  - The contract covers discussion/background/idea/complaint/question/solution-discussion as non-editing signals and requires Mini-contract before edits.
  - The Mini-contract order is explicitly fixed as `我的理解` -> `问题原因` -> `推荐方案`.
  - The contract preserves direct execution only for clear imperative requests with concrete targets and when the request is not wrapped in discussion/background/idea/complaint/question/solution-discussion context.
  - The contract treats `可以`, `确认`, `OK`, `go ahead`, and `apply it` as post-plan execution authorization, while requiring fresh confirmation for expanded scope, target repo writes, destructive operations, or new file lists.
  - The contract requires a one-sentence explanation on first use of a new concept in the Cycle.
  - The contract separates source-owned direct sync scope from target-owned Codex-VSP and VSP-Open-Code local prompt/runtime work.

- Test meaningfulness: pass.
  - The test reads `references/consultation-first-action-boundary.md` and validates nearby context around each contract anchor, not only headings or file existence.
  - It checks all six non-editing signals, Mini-contract term order, direct execution semantics, post-plan authorization phrases, first-use concept explanation, and direct sync vs target-owned boundaries.
  - The test is still an instruction-contract guard, not a runtime behavior test. That is appropriate for M1 because runtime router/execution-engine changes are explicitly out of scope.

- Source/target boundary: pass with residual dirty-worktree caveat.
  - Scoped source status for M1 shows only the new prompt, contract, focused test, and C20-M1 evidence files.
  - `git -C /home/heyx/Codex-VSP status --short` and `git -C /home/heyx/VSP-Open-Code status --short` show pre-existing or parallel dirty worktrees, so current status alone cannot prove target isolation.
  - A read-only mtime scan from `2026-06-30 20:00:00 +0800` found no non-git target files modified after the C20-M1 start window, supporting that this milestone did not write target repositories.

## issues

None blocking.

No Critical or Warning issue was found in the reviewed M1 artifacts.

## risks/follow-up

- INFO-01: M2 projection risk. When this contract is projected into managed instruction surfaces, preserve the direct execution carve-out. The phrase "discussion signal wins over vague action words" should not become a blanket ask-before-everything rule.
- INFO-02: M3 regression risk. Current tests validate source contract text, not rendered AGENTS/OpenCode/Claude surfaces. Later regression should verify generated/managed artifacts actually carry the same Mini-contract order, authorization rules, and direct sync boundary.
- INFO-03: M4 target-cycle risk. Codex-VSP and VSP-Open-Code are intentionally target-owned for per-model prompts, runtime prompt details, local reminders, and provider/model behavior. Target-local Cycles should start from an explicit file list and should not treat source direct sync as permission to edit target-owned files.

## worker_separation

PASS

- `.pipeline/state.yaml` records separate `test`, `implement`, and `review_code` phases for C20-M1.
- Test worker scope in `.pipeline/reviews/C20/M1/test-evidence.md` states it edited only `core/test/c20-consultation-boundary.test.js` and `.pipeline/reviews/C20/M1/test-evidence.md`, did not edit the source contract, and produced the intended RED result against the missing contract.
- Implement worker scope in `.pipeline/reviews/C20/M1/implementation-evidence.md` states it edited only `references/consultation-first-action-boundary.md` and implementation evidence, did not edit the test, and produced the GREEN result.
- Audit worker remained read-only for source/test/evidence files and wrote only this report.

## validation

- Command: `node --test core/test/c20-consultation-boundary.test.js`
- Result: exit code 0.
- Tests: 6.
- Pass: 6.
- Fail: 0.
- Subtests covered:
  - non-editing signals for discussion/background/idea/complaint/question/solution-discussion
  - Mini-contract term order
  - direct execution with concrete target
  - post-plan affirmative execution authorization
  - first-use new concept one-sentence explanation
  - direct sync vs target-owned boundary with Codex-VSP and VSP-Open-Code

## completion_narrative

- Change Summary: completed an independent C20-M1 audit of the source behavior contract, focused test, test evidence, implementation evidence, worker separation, and source/target boundaries. Verdict is PASS_WITH_WARNINGS with no blockers.
- Technical Approach: applied the `/hw:audit` acceptance-gate lens using GQM-style requirement-to-evidence mapping, contract fidelity review, test meaningfulness review, worker separation review, scoped git status checks, target-repository read-only status checks, and the required Node test command.
- Modified Files / Modules: wrote `.pipeline/reviews/C20/M1/audit.md`; reviewed the files listed in `reviewed_refs`.
- Test Design: reused the milestone validation command and inspected whether assertions validated scenario semantics rather than titles alone.
- Validation Results: required Node test passed 6/6; no Critical or Warning issues found; three non-blocking follow-up risks recorded for M2/M3/M4.
- Expected Result: M1 can proceed as the authoritative source contract and fixture baseline for later managed-surface projection and target-local planning.
- Problems Encountered: target repositories were already dirty, so target isolation was judged using evidence files plus an mtime scan rather than status cleanliness alone.
- Risks / Follow-Up: preserve direct execution carve-out in M2, verify rendered managed surfaces in M3, and require explicit target-local file lists and validation in M4.
