# M06 / F002 - Skill and Platform Artifact Review Coverage

## Objective

- Extend review coverage so Skills, hooks, agents, commands, and generated platform artifacts are checked against active Rules/Habits.

## 需求

- Review should check whether active structured rules and generated habits are reflected in:
  - `skills/*/SKILL.md`;
  - Codex instruction surfaces and `.codex/agents/` guidance where present;
  - OpenCode `AGENTS.md`, commands, agents, and plugin/runtime hooks;
  - Claude Code plugin skills, agents, settings, and hooks;
  - Cursor, Copilot, and Trae generated instruction files.
- Review reports must state which surfaces were checked, which were skipped, and why.
- Strengthen Skill Markdown quality guidance where C8 rules require it.
- Do not rewrite all Skills manually unless tests or review evidence show a targeted need.

## Boundaries

- In scope:
  - review checklist generation
  - Skill quality rules/tests
  - adapter artifact smoke tests
  - docs for checked/unchecked surfaces
- Preserve existing generated artifact paths unless a test shows they are stale or inconsistent.

## Non-Goals

- Do not implement Agent Teams.
- Do not require live Claude/OpenCode/Codex sessions for deterministic artifact checks.

## Implementation Plan

1. Add tests that render active rules and assert review checklists include Skill and platform surfaces.
2. Extend skill-quality/rules checks to evaluate generated instruction consistency.
3. Add or update generated artifact smoke fixtures for Codex/OpenCode/Claude/Cursor/Copilot/Trae.
4. Update report templates to list checked and unchecked surfaces.
5. Run full cross-platform regression.

## 预期测试

- Review checklist includes Skills, hooks, agents, commands, and adapter instructions.
- Generated artifact smoke detects stale or missing active rule injection.
- Skill quality tests cover the new C8 expectations.
- Unsupported surfaces produce explicit skipped evidence, not silent pass.

## Validation Commands

- `node --test core/test/skill-quality.test.js`
- `node --test core/test/platform-adapters.test.js`
- `node --test core/test/commands-rules-artifacts.test.js`
- `node --test core/test/*.test.js`
- `python3 tests/run_regression.py`
- `git diff --check`

## Evidence

- Include a review coverage matrix in the report.
- Include generated artifact smoke paths.

## Human QA

- Confirm reports are useful without being too long.
- Confirm skipped checks are understandable.

## 预期产出

- Review coverage checklist for Skills and platform artifacts.
- Stronger Skill/artifact consistency tests.
- Report and docs updates.
