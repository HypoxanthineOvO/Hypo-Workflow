# User Guide

[中文](../user-guide.md) | English

Hypo-Workflow organizes long-running AI programming work around `.pipeline/` state, prompts, reports, logs, and recovery files. It is not a runner; the current host Agent performs implementation, tests, and review.

## Installation Shapes

Start from the platform guide for your host Agent. The README stays as a compact entrypoint; platform-specific install and sync commands live in the platform pages.

| Platform | Install / sync entrypoint | Guide |
|---|---|---|
| Codex | Install or symlink the repository as a Codex Skill source. | `docs/en/platforms/codex.md` |
| Claude Code | Install the `hw` plugin or debug with `--plugin-dir`; sync hooks/agents with `hypo-workflow sync --platform claude-code --project .`. | `docs/en/platforms/claude-code.md` |
| OpenCode | Run `hypo-workflow init-project --platform opencode --project .` for native commands, agents, plugins, and status artifacts. | `docs/en/platforms/opencode.md` |
| Cursor | Generate `.cursor/rules/hypo-workflow.mdc`, `.cursor/skills/hw-*.md`, and `.cursor/commands/hw-*.md`. | `docs/en/platforms/cursor.md` |
| GitHub Copilot | Generate `.github/copilot-instructions.md`. | `docs/en/platforms/copilot.md` |
| Trae | Generate `.trae/rules/project_rules.md`. | `docs/en/platforms/trae.md` |

## Common Workflows

- After `/hw:cycle new`, complete or explicitly reuse `P0 Configure` before Discover; it covers automation level, Subagent authorization, acceptance mode, PR/MR remote-write policy, full regression, analysis boundaries, and worker separation.
- Use `/hw:plan` to plan work, then `/hw:start` or `/hw:resume` to execute.
- Use `/hw:status` for progress and `/hw:report` for reports.
- Use `/hw:explain [question]` for evidence-first answers about code, config, commands, or recent changes.
- Use `/hw:explain --subagent [question]` to request independent read-only evidence collection when the platform supports it.
- Use subcommands such as `/hw:pr inspect URL`, `/hw:pr review URL`, and `/hw:pr fix URL` for existing GitHub PRs or GitLab MRs, with local archives under `.pipeline/pr/`.
- Use `/hw:pr create` for guided PR/MR creation; existing local changes use `--from-worktree`, while plan-first work uses `--plan`.
- Use `/hw:sync --repair` to repair derived context and `/hw:docs repair` to refresh documentation.
- Use `/hw:accept` or `/hw:reject` at lifecycle gates.

## Subagents And Degraded Mode

When `execution.worker_separation.mode` is `recommended` or `strict`, non-trivial work should separate implement, test, and audit roles. Implementation Subagents must not read test source, fixtures, snapshots, or assertion details. They may receive requirements, public interfaces, allowed edit scope, test command, pass/fail status, and sanitized failure summaries. If the platform cannot preserve isolation, record role isolation degradation; `recommended` can continue only after explicit degraded-mode confirmation, while `strict` cannot treat degraded execution as fully accepted.

`/hw:accept` treats worker separation as an acceptance gate. Missing `test`, `implement`, or `audit` worker evidence, role identity collisions, `close_failed` lifecycle records, missing Codex `/hw:start` + `/hw:resume` authorization scope, or runtime-only subtask observations being used as evidence block acceptance until repaired or explicitly downgraded where policy allows.

After a successful `/hw:start` or `/hw:resume` run, when `compact.auto=true` and `compact.end_of_run=true`, the closeout refresh uses the default `compact.refresh_policy=dirty_only` and updates only dirty compact targets. The refresh is generated from full authority files, never copied from old `.compact` files.

## Explain Versus Status/Debug/Audit

`/hw:explain` is read-only and evidence-first. It does not modify files, replace `/hw:status`, or replace `/hw:debug` and `/hw:audit`.

## Feature Queue

Feature Queue supports long-range planning without turning Hypo-Workflow into a runner.

- Use `/hw:plan --batch` to discover multiple Features and create a queue.
- Use `/hw:plan --insert` to stage a natural-language queue edit before confirmation.
- `.pipeline/feature-queue.yaml` stores Features, dependencies, gates, and scheduling metadata.
- `upfront` decomposition writes milestones for the whole queue early.
- `just_in_time` decomposition materializes milestones when a Feature becomes current.
- `gate: confirm` pauses before work that requires explicit human review.
- `auto_chain` can advance ready Features when gates and failure policy allow it.
- `failure_policy: skip_defer` defers failed Features instead of blocking the whole queue.

## Recovery

Structured execution leases and lifecycle logs preserve enough context for safe resume or handoff on supported platforms.
