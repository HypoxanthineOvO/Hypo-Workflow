# Configuration Governance Reference

[中文](../../../reference/configuration.md) | English

Configuration resolution is project config > global config > built-in default. Project config is usually `.pipeline/config.yaml`; global config is usually `~/.hypo-workflow/config.yaml`. Hypo-Workflow is not a background runner; config only controls how the Agent plans, executes, reviews, and asks for confirmation.

## Configuration Layers

| Layer | File | Purpose | Write boundary |
|---|---|---|---|
| Project | `.pipeline/config.yaml` | Current project workflow, execution, docs, and platform overrides | `/hw:init`, `/hw:plan:generate`, or explicit config edit |
| Global | `~/.hypo-workflow/config.yaml` | User-level platform, profile, model pool, automation, output defaults | `/hw:setup` or confirmed global TUI write |
| Cycle | `.pipeline/cycle.yaml` | Current Cycle kind, preset, lifecycle policy, and gates | `/hw:cycle`, `/hw:plan:generate`, accept/reject lifecycle commands |
| Rules | `.pipeline/rules.yaml` | Project-level rule severity and guard overrides | `/hw:rules` or explicit user confirmation |

## Automation And Hard Gates

| Field | Common values | Effect | Confirmation boundary |
|---|---|---|---|
| `automation.level` | `manual` / `balanced` / `full` | Controls ordinary execution automation | Cannot skip destructive/external, release publish, or PR/MR remote write gates |
| `automation.gates.planning` | `confirm` | Planning confirmation | P2 split and P4 final plan confirmation |
| `automation.gates.execution` | `auto` | Ordinary Milestones may continue | Strict review can still block |
| `automation.gates.destructive_external` | `confirm` | Destructive or external side effects stay gated | Destructive commands and external side effects |
| `automation.gates.release_publish` | `confirm` | Release publish stays gated | tag, push, publish |
| `cycle.lifecycle_policy.gates.pr_remote_write` | `confirm` | PR/MR remote writes stay gated | push, merge, close, reviewer/label/target branch writes |

## Planning And Execution Strictness

| Field | Purpose | Typical policy |
|---|---|---|
| `plan.mode` | `interactive` runs P1-P4 gates; `auto` summarizes only when config allows | Use `interactive` when the user participates in planning |
| `plan.interaction_depth` | Controls minimum P1 question rounds | Use `high` for complex Cycles |
| `execution.mode` | `self`, `subagent`, or host-specific execution mode | Codex defaults to main Agent orchestration with optional Subagents |
| `execution.worker_separation.mode` | `off` / `recommended` / `strict` | `recommended` separates implement/test/audit when practical; `strict` does not fully accept degraded execution |
| `acceptance.mode` | `auto`, `manual`, `timeout`, or legacy `confirm` | Use `manual`/`confirm` for team workflows |

## P0 Configure And Subagent Authorization

`P0 Configure` runs after `cycle new` and before `P1 Discover`. It lets the user select or reuse automation, Subagent authorization, acceptance, PR/MR remote-write policy, full regression, analysis boundaries, and worker separation. Reuse sources are recorded as `cycle_explicit`, `previous_cycle_snapshot`, `project_config`, `global_config`, or `built_in_default`.

Strict worker separation requires implementation Subagents to stay isolated from test/review/audit roles. Implementation workers do not read test source, fixtures, snapshots, or assertion details; they may receive requirements, public interfaces, allowed edit scope, test command, pass/fail status, and sanitized failure summaries. If the host cannot preserve isolation, the run must explain degraded mode, obtain explicit user confirmation, and record role isolation degradation.

## Default Profiles

| Profile | Automation | Worker separation | Fixed confirmation boundaries |
|---|---|---|---|
| `solo-auto` | `full` | `recommended` | PR/MR remote write, plugin install, user-level config, destructive_external, release_publish |
| `manual-review` | `manual` | `recommended` | PR/MR remote write, plugin install, user-level config, destructive_external, release_publish |
| `team-strict` | `manual` | `strict` | PR/MR remote write, plugin install, user-level config, destructive_external, release_publish |
| `analysis-hybrid` | `balanced` | `recommended` | PR/MR remote write, plugin install, user-level config, destructive_external, release_publish |

## Platform Differences

| Platform | Focus | Boundary |
|---|---|---|
| Codex | Codex Skills, Subagents, preflight, continuation | Codex Subagents stay inside the Codex/GPT runtime |
| Claude Code | `hw` plugin, hooks, agents, settings merge, optional Codex plugin detection | Claude native commands and Hypo `/hw:*` remain separate |
| OpenCode | native commands, agents, plugins, TUI/status, model matrix | OpenCode performs model calls; Hypo-Workflow writes metadata and instructions |
| Cursor / Copilot / Trae | repository instruction files | Instruction surface only; no native hook or runner claim |
