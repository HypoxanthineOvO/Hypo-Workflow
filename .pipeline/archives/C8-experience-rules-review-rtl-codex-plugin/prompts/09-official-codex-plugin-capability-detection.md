# M10 / F004 - Official Codex Plugin Capability Detection

## Objective

- Detect and model Claude Code support for OpenAI's official `codex-plugin-cc` without assuming installation or network access.

## 需求

- Add capability detection for the official Codex plugin for Claude Code.
- Record plugin presence, version/path evidence when available, and fallback reason when unavailable.
- Detect Codex CLI/subagent capability where locally available.
- Do not install anything in the detection path.
- Document current official references and the safety boundary between detection, project configuration, and real installation.

## Boundaries

- In scope:
  - Claude Code adapter capability model
  - local command/path detection helpers
  - docs/reference updates
  - fixture tests for installed/missing/unknown states
- Do not run user-level install commands.
- Do not write `~/.claude`.
- Do not require network during tests.

## Non-Goals

- Do not implement delegation routing yet.
- Do not implement multi-worker orchestration yet.

## Implementation Plan

1. Add tests for plugin detection states: installed, missing, command unavailable, and unsupported version.
2. Add deterministic capability model fields for Codex plugin support.
3. Implement safe local detection helpers with no external side effects.
4. Update docs and Knowledge references with official source links.
5. Add report guidance for detection evidence and fallback.

## 预期测试

- Detection reports installed plugin with version/path fixture.
- Missing plugin reports actionable guidance without failing ordinary workflows.
- Network is not required.
- Detection output can be consumed by later routing milestones.

## Validation Commands

- `node --test core/test/*claude*codex*.test.js`
- `node --test core/test/claude-plugin-alias.test.js`
- `node --test core/test/*.test.js`
- `git diff --check`

## Evidence

- Include detection fixture outputs for installed and missing states.
- Include official source refs in report.

## Human QA

- Confirm missing-plugin guidance is safe and understandable.

## 预期产出

- Codex plugin capability detection model.
- Tests and docs with no install side effects.
