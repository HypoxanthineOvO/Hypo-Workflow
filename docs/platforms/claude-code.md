# Claude Code Guide

Hypo-Workflow does not run project work itself; the host agent performs the work using `.pipeline/` files.

## Capability Summary

- Commands: plugin-skill.
- Ask gates: chat.
- Plan support: prompt-managed.
- Subagents: available.
- Events/hooks: hooks.
- Rules/instructions: skill-files.
- Recovery: lease-heartbeat-hooks.

## Install / Sync

Validate a local checkout:

```bash
claude plugin validate /absolute/path/to/Hypo-Workflow
```

Use the checkout as a development plugin:

```bash
claude --plugin-dir /absolute/path/to/Hypo-Workflow
```

For persistent Claude Code installation, add the marketplace source and install the `hw` plugin from Claude Code:

```text
/plugin marketplace add HypoxanthineOvO/Hypo-Workflow
/plugin install hw@hypoxanthine-hypo-workflow
/reload-plugins
```

Inside a project, generate project-local settings, hooks, agents, monitors, and metadata:

```bash
hypo-workflow sync --platform claude-code --project .
```

## Supported Features

- Reads `.pipeline/` state, config, Cycle, Rules/Habits, prompts, reports, logs, and review artifacts.
- Uses the canonical `/hw:*` workflow vocabulary: init, plan, start/resume, status/report, sync/docs, rules, patch, release.
- Preserves protected authority files unless the lifecycle command explicitly owns the write.
- Exposes `/hw:*` through the `hw` Claude Code plugin namespace.
- Generates project-local hooks for SessionStart, Stop, PermissionRequest, compact resume, and progress/status refresh.
- Generates Claude agents and routing metadata for plan, code, test, review, debug, docs, report, and compact roles.
- Can optionally use the official OpenAI Codex plugin for implementation delegation after installed capability is detected.

## Boundaries

- Hypo-Workflow is not a runner; the host agent performs implementation, tests, and review.
- `.pipeline/state.yaml`, `.pipeline/cycle.yaml`, and `.pipeline/rules.yaml` are protected authority files.
- External installs, user-level config writes, destructive commands, and network side effects require explicit confirmation.
- Project settings are merged conservatively; user-owned settings conflicts must not be silently overwritten.
- Codex plugin installation inside Claude Code is a separate explicit-confirmation flow.

## Plugin Namespace

The Claude Code plugin name is intentionally `hw`, so existing workflow skills surface as `/hw:*` commands.

- The adapter uses the root `skills/` directory and existing workflow skills.
- It does not generate `skills/hw-*` alias skills.
- Settings are merged through project-local `settings.local_file` policy.
- DeepSeek and Mimo may be used through Claude Code agent routing when configured; this is separate from Codex Subagents.

## Optional OpenAI Codex Plugin Inside Claude Code

This is separate from the Hypo-Workflow `hw` plugin. It enables Claude Code to delegate implementation work to the official OpenAI Codex plugin only after capability detection reports `installed`.

```text
/plugin marketplace add openai/codex-plugin-cc
/plugin install codex@openai-codex
/reload-plugins
/codex:setup
```

Hypo-Workflow may render this as a confirmation proposal, but it must not execute these slash commands automatically.
