# M02 / F001 - Rules Remember Capture and Confirmation Flow

## Objective

- Add user-facing capture flows that turn mid-discussion requirements into structured rule candidates without interrupting the main conversation.

## 需求

- Support explicit commands such as `/hw:rules remember ...`.
- Support force-write intent when the user clearly requests immediate persistence.
- Support natural-language candidate detection, but do not interrupt the current discussion; surface candidates at the end of the turn/checkpoint.
- Ask for confirmation for ordinary candidates, including scope and severity.
- Write confirmed rules to the structured authority model from M01.
- Log capture decisions and include enough evidence for later review.

## Boundaries

- In scope:
  - `skills/rules/SKILL.md`
  - command routing/spec docs
  - core rules helpers
  - tests for candidate/confirmed/force-write behavior
- Preserve protected-file policy for `.pipeline/rules.yaml`.
- Use explicit confirmation before mutating project or user-level authority unless the user used a clear force form.

## Non-Goals

- Do not implement generated habits documents yet.
- Do not build a full natural-language classifier; use simple deterministic command/marker surfaces plus agent instruction.
- Do not silently write user-global config without clear user intent.

## Implementation Plan

1. Add tests for `/hw:rules remember` parsing and structured record generation.
2. Add Skill instructions for natural-language capture candidates and end-of-discussion confirmation.
3. Define force-write wording and safety constraints.
4. Implement or document append paths for cycle/project/global scopes.
5. Update logs/report expectations for remembered rules.

## 预期测试

- Command-form remember creates a valid structured rule proposal.
- Confirmed candidate writes to the selected scope.
- Force-write form skips the proposal state only when intent is explicit.
- Ordinary candidate detection does not block normal planning/execution responses.
- Captured rules appear in effective summary output.

## Validation Commands

- `node --test core/test/*rules*.test.js`
- `node --test core/test/commands-rules-artifacts.test.js`
- `node --test core/test/*.test.js`
- `git diff --check`

## Evidence

- Include before/after rule files and an example end-of-turn confirmation prompt.
- Record log evidence for a confirmed remember action.

## Human QA

- Confirm the confirmation question is concise and not disruptive.
- Confirm force-write language is hard to trigger accidentally.

## 预期产出

- Remember command/candidate flow.
- Updated rules Skill and command specs.
- Focused tests and report evidence.
