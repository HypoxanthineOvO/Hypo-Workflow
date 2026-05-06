# M11 / F004 - Claude Code Codex Delegation Routing

## Objective

- Add Claude Code routing guidance so implementation work can prefer the official Codex plugin while tests and review remain independent.

## 需求

- Generate/sync Claude Code artifacts that declare Codex implementation delegation when the official plugin is available or configured.
- Keep planning/review/test separation clear:
  - planning may be Claude, DPSK, or configured profile;
  - implementation may route to Codex;
  - tests/review should use independent reviewers, preferably Codex reviewer when DPSK-led planning needs challenge review.
- Add planning profiles:
  - `premium`: Claude plan, Codex/GPT implementation, DPSK docs/report.
  - `balanced`: DPSK draft, Codex challenger, escalate on critical risk.
  - `cost_saver`: DPSK plan with mandatory Codex review.
- Record routing choices in reports and generated metadata.

## Boundaries

- In scope:
  - Claude Code agent/artifact generation
  - config/spec docs for planning profiles and routing intent
  - tests for generated routing metadata
- Do not perform real plugin install.
- Do not require live Claude Code sessions for deterministic tests.

## Non-Goals

- No full Agent Teams debate framework.
- No external model routing from Codex Subagents inside Codex runtime.

## Implementation Plan

1. Add tests for generated Claude routing metadata with and without Codex plugin capability.
2. Add planning-profile config/spec guidance if schema support is needed.
3. Render Claude instructions that prefer Codex for implementation only when safe.
4. Ensure reports record routing and fallback.
5. Run cross-platform artifact tests to avoid OpenCode/Codex regressions.

## 预期测试

- Claude artifacts include Codex implementation delegation when capability is present.
- Missing capability generates guidance and fallback, not broken routing.
- Test/review roles remain separate from implementation.
- Planning profiles render expected reviewer requirements.

## Validation Commands

- `node --test core/test/*claude*codex*.test.js`
- `node --test core/test/platform-adapters.test.js`
- `node --test core/test/*.test.js`
- `python3 tests/run_regression.py`
- `git diff --check`

## Evidence

- Include generated routing metadata sample.
- Include fallback sample for missing plugin.

## Human QA

- Confirm the routing wording does not imply Hypo-Workflow calls models directly.

## 预期产出

- Claude Code Codex delegation routing.
- Planning-profile guidance.
- Tests and docs.
