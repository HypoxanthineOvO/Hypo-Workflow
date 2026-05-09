# OpenCode Guide

[中文](../../platforms/opencode.md) | English

Hypo-Workflow does not execute project work directly. The host Agent reads `.pipeline/` files and performs implementation, tests, and review.

## Capability Summary

- Commands: native-slash.
- Ask gates: question-tool.
- Plan support: todowrite.
- Subagents: native-agents.
- Events/hooks: plugin-events.
- Rules/instructions: AGENTS.md-instructions.
- Recovery: lease-heartbeat-plugin-events.

## Install / Sync

Initialize native OpenCode artifacts:

```bash
hypo-workflow init-project --platform opencode --project . --automation balanced
```

Refresh an existing project:

```bash
hypo-workflow sync --platform opencode --project . --repair
```

## Supported Behavior

- Read `.pipeline/` state, config, Cycle, Rules/Habits, prompts, reports, logs, and review artifacts.
- Use canonical `/hw:*` workflow vocabulary: init, plan, start/resume, status/report, sync/docs, rules, patch, release.
- Support `/hw:explain` as a read-only evidence-first command.
- Protect authority files unless the active lifecycle command owns the write.
- Generate native `/hw-*` slash command files.
- Generate OpenCode role agents, plugin runtime files, status sidecars, and TUI/status config.
- Use native `question` for required decisions and `todowrite` for visible plan discipline.
- Map `/hw-pr-create` to canonical `/hw:pr create` for guided GitHub PR / GitLab MR creation.
- Status may display OpenCode active subagent/model data, but those subtask fields are runtime-only and must not satisfy `/hw:accept` worker evidence.

## Boundaries

- Hypo-Workflow is not a runner; implementation, tests, and review are performed by the host Agent.
- `.pipeline/state.yaml`, `.pipeline/cycle.yaml`, and `.pipeline/rules.yaml` are protected authority files.
- External installs, user-level config writes, destructive commands, and network side effects require explicit confirmation.
- OpenCode-specific events and plugins are incremental capabilities; Codex and Claude Code behavior must not depend on them.
- OpenCode `subtask` parts are UI/status runtime-only observations; acceptance and worker separation gates must ignore them.

## Model Matrix

OpenCode performs the actual model calls. Hypo-Workflow writes role-aware agent metadata and config defaults.

| Agent | Role | Release default |
|---|---|---|
| `hw-compact` | context compaction | `deepseek-v4-flash` |
| `hw-test` | test design and validation | `deepseek-v4-pro` |
| `hw-code-a` | primary implementation | `mimo-v2.5-pro` |
| `hw-code-b` | secondary implementation | `deepseek-v4-pro` |
| `hw-docs` | documentation and release notes | `deepseek-v4-pro` |
| `hw-report` | report synthesis | `deepseek-v4-flash` |
