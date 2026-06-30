<div align="center">

# Hypo-Workflow

**A local workflow protocol for AI Agents**

Plan -> Execute -> Review -> Report -> Resume

[![Version](https://img.shields.io/badge/version-13.1.0-beta.2-blue)](.claude-plugin/plugin.json)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Codex%20%7C%20Claude%20Code%20%7C%20OpenCode%20%7C%20Cursor%20%7C%20Copilot%20%7C%20Trae-purple)](docs/en/reference/platforms.md)

**Language:** [中文](README.md) | English

</div>

Hypo-Workflow organizes long-running AI programming work into local, reviewable, resumable workflows. It is not a task runner or background service; your current host Agent still performs implementation, tests, and review, while `.pipeline/` keeps workflow state, cycles, patches, rules, progress, prompts, reports, and logs.

The repository entrypoint is `HypoxanthineOvO/Hypo-Workflow`. This English README links only to English subpages under `docs/en/`.

## Quick Start

Primary workflow:

```text
/hw:init -> /hw:plan -> /hw:start
```

Check status and continue:

```text
/hw:status -> /hw:resume
```

## Shared Capabilities

- **Cycle / Plan / Start / Resume**: split long tasks into resumable Features, Milestones, Prompts, and Reports.
- **P0 Configure**: before Discover, confirm or reuse automation level, Subagent authorization, acceptance, PR/MR remote-write confirmation, full regression, and worker separation.
- **Rules / Habits**: store user habits and project rules as structured authority, then render platform-readable instruction views.
- **Agent Review**: record review artifacts during planning, tests, implementation, and final checks.
- **PR/MR Create**: `/hw:pr create` guides GitHub PR and GitLab MR creation from existing local changes or a plan-first work item, with remote writes gated by explicit confirmation.
- **Acceptance / Compact Evidence**: `/hw:accept` blocks missing or colliding worker evidence; successful `/hw:start` and `/hw:resume` refresh compact views with `dirty_only` policy.
- **Sync / Docs / Release**: synchronize platform adapters, repair docs, and run release checks without replacing host Agent work.

## Platform Entrypoints

| Platform | Best entrypoint | Guide |
|---|---|---|
| Codex | Codex Skill / repo skill source | [Codex Guide](docs/en/platforms/codex.md) |
| Claude Code | `hw` plugin plus Claude hooks/agents | [Claude Code Guide](docs/en/platforms/claude-code.md) |
| OpenCode | Native commands, agents, plugins, TUI/status | [OpenCode Guide](docs/en/platforms/opencode.md) |
| Cursor | Repository rule plus per-command Skills/commands | [Cursor Guide](docs/en/platforms/cursor.md) |
| GitHub Copilot | Repository custom instructions | [GitHub Copilot Guide](docs/en/platforms/copilot.md) |
| Trae | Project rule file | [Trae Guide](docs/en/platforms/trae.md) |

Third-party IDE adapters provide repository instruction surfaces; Cursor also receives one flat Skill file and one command file per `/hw-*` entry. They teach the host IDE Agent to read Hypo-Workflow docs and `.pipeline/`, but they do not claim native hooks, automatic installs, or lifecycle enforcement.

## Operating Principles

- `.pipeline/state.yaml`, `.pipeline/cycle.yaml`, and `.pipeline/rules.yaml` are protected authority files.
- Prefer Codex Subagents for substantial Codex work when available; keep implementation separate from testing/review, and do not let implementation workers read test source, fixtures, snapshots, or assertion details.
- Run pre-delivery checks for formatting, stale derived artifacts, README/docs freshness, secret markers, tests, and report evidence.
- Automation is governed by `.pipeline/config.yaml`; release, destructive operations, external side effects, and PR/MR remote writes still follow explicit confirmation gates.

Current version exposes **53 user-facing commands** and **1 internal watchdog** skill.

## Common Commands

| Scenario | Command |
|---|---|
| Initialize or rescan a project | `/hw:init` |
| Plan a feature | `/hw:plan` |
| Start or continue execution | `/hw:start` / `/hw:resume` |
| Show status and recent events | `/hw:status` |
| Continue analysis and root-cause investigation | `/hw:analysis` |
| Explain code/config/changes with evidence | `/hw:explain "why this design"` |
| Handle existing PR/MR | `/hw:pr inspect URL`, `/hw:pr review URL`, `/hw:pr fix URL` |
| Create PR/MR | `/hw:pr create` / `/hw:pr create --from-worktree` / `/hw:pr create --plan` |
| Repair derived context | `/hw:sync --repair` |
| Check or repair docs | `/hw:docs check` / `/hw:docs repair` |

## Documentation

| Document | Purpose |
|---|---|
| [User Guide](docs/en/user-guide.md) | Common workflows, recovery, Feature Queue |
| [Developer Guide](docs/en/developer.md) | Core helpers, authority boundaries, derived artifacts, tests |
| [Commands Reference](docs/en/reference/commands.md) | Standard commands and OpenCode mappings |
| [Platforms Reference](docs/en/reference/platforms.md) | Platform capability matrix |
| [Generated Artifacts](docs/en/reference/generated-artifacts.md) | Generated adapter and docs sources |
| [Configuration Reference](docs/en/reference/configuration.md) | Automation, gates, profiles, and worker separation |
| [v13.1.0-beta.2 Release Notes](docs/en/release/v13.1.0-beta.2.md) | C19 named Plan phases and C20 consultation-first action boundary |

## License

Hypo-Workflow is released under the MIT License. See [LICENSE](LICENSE).
