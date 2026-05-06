# User Guide

Hypo-Workflow organizes long-running AI coding work around `.pipeline/` state, prompts, reports, logs, and recovery files.

## Install Shape

Start from the platform guide that matches the host agent. The README stays generic; platform pages carry the concrete install or sync commands.

| Platform | Install / sync entry | Guide |
|---|---|---|
| Codex | Install or symlink this repo as a Codex Skill source. | `docs/platforms/codex.md` |
| Claude Code | Install the `hw` plugin or run with `--plugin-dir`; sync project hooks/agents with `hypo-workflow sync --platform claude-code --project .`. | `docs/platforms/claude-code.md` |
| OpenCode | Generate native commands, agents, plugins, and status artifacts with `hypo-workflow init-project --platform opencode --project .`. | `docs/platforms/opencode.md` |
| Cursor | Generate `.cursor/rules/hypo-workflow.mdc`. | `docs/platforms/cursor.md` |
| GitHub Copilot | Generate `.github/copilot-instructions.md`. | `docs/platforms/copilot.md` |
| Trae | Generate `.trae/rules/project_rules.md`. | `docs/platforms/trae.md` |

## Common Workflows

- Plan work with `/hw:plan`, then execute with `/hw:start` or `/hw:resume`.
- Check progress with `/hw:status` and inspect reports with `/hw:report`.
- Repair derived context with `/hw:sync --repair` and documentation with `/hw:docs repair`.
- Use `/hw:accept` or `/hw:reject` at lifecycle gates.

## Feature Queue

Feature Queue supports long-range planning without turning Hypo-Workflow into a runner.

- Use `/hw:plan --batch` to discover multiple Features and create a queue.
- Use `/hw:plan --insert` to stage a natural-language queue edit before confirmation.
- `.pipeline/feature-queue.yaml` stores Features, dependencies, gates, and scheduling metadata.
- `.pipeline/metrics.yaml` stores duration, token, cost, and telemetry fallback summaries.
- `upfront` decomposition writes milestones for the whole queue early.
- `just_in_time` decomposition materializes milestones when a Feature becomes current.
- `gate: confirm` pauses before work that requires explicit human review.
- `auto_chain` can advance ready Features when gates and failure policy allow it.
- `failure_policy: skip_defer` defers failed Features instead of blocking the whole queue.

## Recovery

Structured execution leases and lifecycle logs preserve enough context for safe resume or handoff across supported platforms.
