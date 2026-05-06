# Claude Code Codex Plugin Spec

This spec covers the C8 F004 support layer for the official OpenAI Codex plugin inside Claude Code. Hypo-Workflow remains a coordinator and artifact generator, not a runner.

Official reference: `https://github.com/openai/codex-plugin-cc`.

## Capability Detection

The detection model is read-only and evidence-first. It reports exactly one of `installed/missing/command_unavailable/unsupported_version`.

- `installed`: Claude Code is inspectable, the official `codex@openai-codex` plugin is listed, and the plugin version meets the configured minimum.
- `missing`: Claude Code is inspectable, but the official Codex plugin is not present.
- `command_unavailable`: the Claude Code command or plugin-list command cannot be executed.
- `unsupported_version`: the plugin is present, but its version is lower than the supported minimum.

Detection records command path, command version when available, plugin version, plugin path when available, and the required minimum version. It must not install packages, contact the network, or write user configuration.

## Install Proposal

No install command is executed by default. Hypo-Workflow may render an install proposal, but execution requires explicit confirmation from the user.

The official Claude Code plugin install flow is represented as user-facing slash commands:

```text
/plugin marketplace add openai/codex-plugin-cc
/plugin install codex@openai-codex
/reload-plugins
/codex:setup
```

`@openai/codex` is the Codex CLI package used by the plugin; it is not the Claude plugin id.

The proposal must include:

- target
- command, rendered as user-facing Claude slash commands rather than a shell chain
- command kind, with `command_kind=claude_slash_commands`
- scope
- external side effects
- rollback/fallback notes
- `default_action=do_not_execute`
- `shell_command=false`

The proposal text is suitable for a `question`/confirmation surface. It is not an automation instruction.

## Planning Profiles

Claude Code remains responsible for planning, review, and test judgment. Codex delegation is implementation-only and only allowed when the capability is present and project configuration enables it.

Profiles:

- `premium`: planning/review/test stay with Claude Code; implementation may delegate to Codex when configured and installed.
- `balanced`: same separation, with scoped implementation delegation as the default enabled shape.
- `cost_saver`: same separation, optimized for delegating eligible implementation edits to Codex while keeping validation in Claude Code.

If the Codex plugin is missing, unavailable, or unsupported, implementation falls back to Claude Code/current worker execution.

## Multi-Worker Ownership

Multi-worker Codex delegation requires disjoint file/module ownership.

- File claims overlap when two workers claim the same file.
- Module claims overlap when a worker claims a module directory and another worker claims that directory or a file under it.
- Overlap is rejected before delegation.
- When capability is missing, multi-worker plans fall back to a single worker.

The ownership validator is deterministic and does not inspect or mutate the filesystem.
