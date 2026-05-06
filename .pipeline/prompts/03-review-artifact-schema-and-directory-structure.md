# M04 / F002 - Review Artifact Schema and Directory Structure

## Objective

- Define and implement durable review artifact contracts under `.pipeline/reviews/`.

## 需求

- Create a review artifact schema that supports plan, tests, code, Skill, hook, adapter, and final regression reviews.
- Store review output under `.pipeline/reviews/<feature>/<milestone>/<stage>/`.
- Capture transcript/notes, summary, machine-readable verdict, reviewed refs, active rules, checked/unchecked rules, issues, repair proposals, retry round, and fallback reason.
- Keep full review records out of `.pipeline/state.yaml`; state may store compact pointers only when needed.
- Document secret-safe evidence requirements.

## Boundaries

- In scope:
  - new review reference/spec files
  - `references/state-contract.md` compact pointer guidance
  - report/progress expectations
  - tests for schema validation and path generation
- Do not implement workflow gates yet; that belongs to M05.

## Non-Goals

- Do not implement a full debate framework.
- Do not require raw transcript when the host platform cannot provide it.

## Implementation Plan

1. Add failing tests for review path construction and verdict schema validation.
2. Define `pass`, `warn`, `needs_changes`, and `critical` semantics.
3. Implement deterministic helpers for review artifact paths and safe summary rendering.
4. Update specs and report templates to reference `.pipeline/reviews/`.
5. Add README/template examples for review artifacts.

## 预期测试

- Valid review artifacts pass schema checks.
- Invalid verdicts or missing reviewed refs fail deterministically.
- Secret-like fields are redacted or rejected.
- Review paths are stable for Feature/Milestone/stage input.

## Validation Commands

- `node --test core/test/*review*.test.js`
- `node --test core/test/*.test.js`
- `git diff --check`

## Evidence

- Include a fixture review artifact and validation output.
- Show where summary/verdict files are written.

## Human QA

- Confirm the directory shape is readable for humans.
- Confirm reports can link to review evidence without embedding long transcripts.

## 预期产出

- Review artifact contract and helpers.
- `.pipeline/reviews/` documentation/template.
- Focused tests.
