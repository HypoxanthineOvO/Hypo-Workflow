# Claude Code Guide

[中文](../../platforms/claude-code.md) | English

Hypo-Workflow does not execute project work directly. The host Agent reads `.pipeline/` files and performs implementation, tests, and review.

## Capability Summary

- Commands: plugin-slash+skills.
- Ask gates: chat.
- Plan support: prompt-managed.
- Subagents: available.
- Events/hooks: hooks.
- Rules/instructions: skill-files.
- Recovery: lease-heartbeat-hooks.

## Install / Sync

Validate the local checkout:

```bash
claude plugin validate /absolute/path/to/Hypo-Workflow
```

Run the current checkout as a development plugin:

```bash
claude --plugin-dir /absolute/path/to/Hypo-Workflow
```

Sync project-local settings, hooks, agents, monitors, and metadata:

```bash
hypo-workflow sync --platform claude-code --project .
```

## Supported Behavior

- Read `.pipeline/` state, config, Cycle, Rules/Habits, prompts, reports, logs, and review artifacts.
- Use canonical `/hw:*` workflow vocabulary: init, plan, start/resume, status/report, sync/docs, rules, patch, release.
- Support `/hw:explain` as a read-only evidence-first command.
- Protect authority files unless the active lifecycle command owns the write.
- Expose `/hw:*` through the `hw` Claude Code plugin namespace and plugin-root `commands/`.
- Generate Claude plugin slash command files that load existing `skills/*/SKILL.md` authority.
- Generate project-local hooks for SessionStart, Stop, PermissionRequest, compact resume, and progress/status refresh.
- Generate Claude agents and routing metadata for plan, code, test, review, debug, docs, report, and compact roles.

## Boundaries

- Hypo-Workflow is not a runner; implementation, tests, and review are performed by the host Agent.
- `.pipeline/state.yaml`, `.pipeline/cycle.yaml`, and `.pipeline/rules.yaml` are protected authority files.
- External installs, user-level config writes, destructive commands, and network side effects require explicit confirmation.
- Project settings are merged conservatively; user-owned settings conflicts must not be silently overwritten.
- Codex plugin installation inside Claude Code is a separate explicit-confirmation flow.

## Plugin Namespace

The Claude Code plugin name is intentionally `hw`; plugin-root `commands/` files map `/hw:*` to the existing workflow Skills.

- The adapter generates plugin-root `commands/*.md` slash-command files that load the root `skills/` authority.
- It does not generate `skills/hw-*` alias skills.
- Claude native `/resume` remains owned by Claude Code; Hypo workflow resume is `/hw:resume`.
- Do not promote `/hypo-workflow:<command>` as the primary Claude Code command path.
- Optional OpenAI Codex plugin installation is a separate explicit-confirmation flow.
