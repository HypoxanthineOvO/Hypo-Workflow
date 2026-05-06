# OpenCode Guide

Hypo-Workflow does not run project work itself; the host agent performs the work using `.pipeline/` files.

## Capability Summary

- Commands: native-slash.
- Ask gates: question-tool.
- Plan support: todowrite.
- Subagents: native-agents.
- Events/hooks: plugin-events.
- Rules/instructions: AGENTS.md-instructions.
- Recovery: lease-heartbeat-plugin-events.

## Install / Sync

Bootstrap a project with native OpenCode artifacts:

```bash
hypo-workflow init-project --platform opencode --project . --automation balanced
```

Refresh an existing project:

```bash
hypo-workflow sync --platform opencode --project . --repair
```

## Supported Features

- Reads `.pipeline/` state, config, Cycle, Rules/Habits, prompts, reports, logs, and review artifacts.
- Uses the canonical `/hw:*` workflow vocabulary: init, plan, start/resume, status/report, sync/docs, rules, patch, release.
- Preserves protected authority files unless the lifecycle command explicitly owns the write.
- Generates native `/hw-*` slash command files.
- Generates OpenCode role agents, plugin runtime files, status sidecars, and TUI/status config.
- Uses native `question` for required decisions and `todowrite` for visible plan discipline.
- Supports OpenCode provider/model matrix metadata without turning Hypo-Workflow into a runner.

## Boundaries

- Hypo-Workflow is not a runner; the host agent performs implementation, tests, and review.
- `.pipeline/state.yaml`, `.pipeline/cycle.yaml`, and `.pipeline/rules.yaml` are protected authority files.
- External installs, user-level config writes, destructive commands, and network side effects require explicit confirmation.
- OpenCode-specific events and plugins are additive; Codex and Claude Code behavior must not depend on them.

## Model Matrix

OpenCode 负责实际模型调用；Hypo-Workflow only writes role-aware agent metadata and config defaults.

```yaml
opencode:
  compaction:
    effective_context_target: 900000
  agents:
    plan:
      model: gpt-5.5
    compact:
      model: deepseek-v4-flash
    test:
      model: deepseek-v4-pro
    code-a:
      model: mimo-v2.5-pro
    code-b:
      model: deepseek-v4-pro
    debug:
      model: gpt-5.5
    docs:
      model: deepseek-v4-pro
    report:
      model: deepseek-v4-flash
```

| Agent | Role | 发布默认 |
|---|---|---|
| `hw-compact` | context compaction | `deepseek-v4-flash` |
| `hw-test` | test design and validation | `deepseek-v4-pro` |
| `hw-code-a` | primary implementation | `mimo-v2.5-pro` |
| `hw-code-b` | secondary implementation | `deepseek-v4-pro` |
| `hw-docs` | documentation and release notes | `deepseek-v4-pro` |
| `hw-report` | report synthesis | `deepseek-v4-flash` |
