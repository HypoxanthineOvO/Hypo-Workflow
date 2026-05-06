# M05 / F002 - Plan Test Code Review Gates

## Objective

- Make Agent Review a default gate for planning, test design, and implementation quality.

## 需求

- Add default review expectations for:
  - plan generation after P3;
  - test design after `write_tests`;
  - implementation after `run_tests_green`.
- Use Codex as the default stronger reviewer when DPSK-led planning needs challenge review.
- Keep review/test/implementation separation: implementation workers must not be the final reviewers of their own changes.
- Implement retry behavior: `needs_changes` repairs and re-reviews up to 3 total rounds by default.
- Support hard-gate configuration where selected verdicts block continuation.
- Record all review attempts in `.pipeline/reviews/` and summarize in reports.

## Boundaries

- In scope:
  - TDD step spec
  - Plan/Confirm Skill guidance
  - start/resume/report/status behavior
  - config/spec additions for retry and strictness if needed
  - tests for retry and blocking behavior
- Preserve existing `review_tests` and `review_code` step names.

## Non-Goals

- Do not implement multi-agent debate.
- Do not require subagents when the host platform cannot provide them; record fallback instead.

## Implementation Plan

1. Add tests for review verdict flow: pass, warn, needs_changes retry, critical strict block.
2. Extend TDD and Plan specs to require review artifact output.
3. Add bounded retry logic/guidance for `needs_changes` with default max 3.
4. Add config/default resolution for hard gates only if existing fields are insufficient.
5. Update report and progress summaries to show review round and final verdict.

## 预期测试

- `needs_changes` triggers a repair/review loop and stops after the configured max.
- Strict mode blocks on configured failure level.
- Default mode records `critical` and attempts repair or escalates according to policy.
- Reports link to `.pipeline/reviews/` artifacts.
- Review fallback reason is recorded when no subagent is available.

## Validation Commands

- `node --test core/test/*review*.test.js`
- `node --test core/test/lifecycle-regression.test.js`
- `node --test core/test/*.test.js`
- `python3 tests/run_regression.py`
- `git diff --check`

## Evidence

- Include retry-loop fixture output.
- Include a strict hard-gate fixture.

## Human QA

- Confirm default behavior is not too interruptive.
- Confirm strict mode wording makes blocking reasons obvious.

## 预期产出

- Default review gate guidance/implementation.
- Retry and strictness tests.
- Report/progress integration.
