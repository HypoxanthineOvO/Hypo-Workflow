# Hypo-Workflow CLI

`hypo-workflow` is a setup utility, not a runner. It manages global defaults, profiles, adapter sync, doctor checks, and project bootstrap files. Pipeline execution still happens inside Codex, Claude Code, or OpenCode agents.

## Commands

```bash
hypo-workflow setup
hypo-workflow tui --snapshot
hypo-workflow doctor
hypo-workflow config migrate
hypo-workflow config migrate --write
hypo-workflow sync --platform opencode --project .
hypo-workflow sync --platform claude-code --project .
hypo-workflow sync --light --project .
hypo-workflow sync --deep --project .
hypo-workflow profile list
hypo-workflow profile use opencode
hypo-workflow profile edit opencode --model qwen
hypo-workflow install opencode
hypo-workflow init-project --platform opencode --project . --automation balanced
```

`init-project` works in non-Git directories. Use `--automation manual|balanced|full` to write the stable project `automation.level`; interactive `/hw:init` shows the Chinese labels 稳妥模式, 自动模式, and 全自动模式.

When no command is provided, the CLI runs `setup` on first use and opens the global read-only Ink TUI afterwards. The `hw` bin alias points to the same entrypoint when the CLI package is installed or linked.

The TUI reads `~/.hypo-workflow/config.yaml` and `~/.hypo-workflow/projects.yaml`, shows registered projects, project detail, global config, model pool, and explicit sync/action entries. It does not execute pipelines. Sync modes are light, standard, and deep; SessionStart uses only light external-change detection.

## Layered Config

Effective config resolves in this order: project `.pipeline/config.yaml` > user `~/.hypo-workflow/config.yaml` > safe defaults. Safe defaults include `integrations.hypo_claw`, `integrations.hypo_writer`, `projects`, `output.timezone`, and `project_linkage.seeds` without embedding machine-specific absolute paths.

`hypo-workflow config migrate` prints the user config migration plan and YAML without writing files. `hypo-workflow config migrate --write` is the explicit user-level write path for `~/.hypo-workflow/config.yaml`. `hypo-workflow sync` may print the migration prompt when user config is missing, but it does not create user config silently.
