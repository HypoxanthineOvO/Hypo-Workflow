# V9 Architecture Baseline

V9 adapts Hypo-Workflow to OpenCode without turning Hypo-Workflow into a separate execution engine. The `hypo-workflow` CLI is a setup and synchronization utility, not a runner. Agent execution still happens inside Codex, Claude Code, or OpenCode.

## Architecture Principles

1. One workflow contract, multiple platform adapters.
2. OpenCode native tools are preferred over HW reinvention.
3. Codex and Claude Code keep their existing command surfaces.
4. Deterministic generation belongs in `core/`; reasoning and implementation still belong to the host Agent.
5. `.pipeline/` remains the cross-platform source of truth.

## Repository Shape

```text
core/
  config/               # load/merge global and project profiles
  artifacts/            # generate commands, agents, instructions, and setup files
  contracts/            # shared schemas for pipeline, cycle, rules, patches
plugins/
  opencode/             # OpenCode plugin source generated/implemented in later milestones
    commands/           # /hw-* command templates
    agents/             # hw-plan, hw-build, hw-status, hw-review, hw-explorer, hw-worker
    plugin.ts           # event hooks, file guard, context injection, auto continue
skills/
  */SKILL.md            # existing Codex/Claude-facing behavior remains authoritative
references/
  opencode-spec.md
  platform-capabilities.md
  v9-architecture.md
```

`core/` is intentionally small. It should parse config, normalize profiles, generate command maps, summarize rules, and render platform artifacts. It should not execute Milestones, call models, or replace the Agent. The first helper CLI is `core/bin/hw-core`.

The canonical OpenCode adapter path is `plugins/opencode/`.

## Execution Flow

```text
User invokes platform command
  -> platform adapter renders HW command prompt/context
  -> host Agent performs work
  -> HW file contracts are updated in .pipeline/
  -> adapter hooks record context, heartbeat, guard results, and optional auto-continue
```

On OpenCode this means `/hw-plan`, `/hw-start`, and other `/hw-*` commands are native slash commands. The OpenCode plugin assists with events and context, but the Agent still reads the command prompt and performs the work.

## Global Setup CLI

The global `hypo-workflow` command should provide setup only:

- `hypo-workflow setup` opens a small TUI or guided config flow.
- `hypo-workflow doctor` checks installed adapters and global config.
- `hypo-workflow sync opencode` writes OpenCode command, agent, plugin, metadata, and instruction files.
- `hypo-workflow init-project` can prepare project-level `.pipeline/` and `.opencode/` files.

It is not a runner and should not execute `/hw:start`, `/hw:resume`, or model calls directly. This keeps a single workflow instead of a forked OpenCode implementation.

The first implementation lives in `cli/bin/hypo-workflow` with non-interactive flags for CI and a small menu fallback for local setup.

## OpenCode Adapter Plan

| Component | Output | Responsibility |
|---|---|---|
| Command generator | `.opencode/commands/hw-*.md` | Map all 36 HW user commands to OpenCode slash commands. |
| Agent generator | `.opencode/agents/hw-*.md` | Bind plan/build/status/compact/test/code/debug/report/review/explore roles with optional model frontmatter. |
| Plugin | `.opencode/plugins/hypo-workflow.ts` | Event hooks, context injection, file guard, auto-continue, command context capture. |
| Instruction exporter | `AGENTS.md` or config instructions | Export stable HW guidance and active always-rules. |
| Permission profile | `opencode.json` snippets | Set standard, strict, and automation profiles. |

Root vs adapter config:

- project root `opencode.json` is the executable OpenCode config and owns plugin registration
- `.opencode/opencode.json` is adapter-local metadata for mirrored settings and must not redeclare plugin paths, or OpenCode may resolve duplicate nested plugin entries
- non-plugin runtime helpers such as status loaders belong under `.opencode/runtime/`, not `.opencode/plugins/`, because OpenCode auto-discovers local plugin files from the plugins directory

The V9 scaffold templates live under `plugins/opencode/templates/` and are rendered by `core/src/artifacts/opencode.js`.

## Codex and Claude Code Path

Codex keeps using `SKILL.md` and `/hw:*`. Claude Code uses `.claude-plugin` with the plugin namespace `hw`, so existing Hypo-Workflow skills surface as `/hw:*`. Any shared text moved into `core/` must be rendered back into these surfaces, not replaced by OpenCode-only files.

## Milestone Boundary After M0

M1 can start implementing `core/` once these documents are green. M0 deliberately stops before writing plugin code, so later milestones can change implementation details while preserving the agreed platform contract.
