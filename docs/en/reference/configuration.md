# Configuration Governance Reference

[中文](../../../reference/configuration.md) | English

Configuration resolution is project config > global config > built-in default. Project config is usually `.pipeline/config.yaml`; global config is usually `~/.hypo-workflow/config.yaml`. Hypo-Workflow is not a background runner; config only controls how the Agent plans, executes, reviews, and asks for confirmation.

`loadLayeredConfig` merges project `.pipeline/config.yaml` > user `~/.hypo-workflow/config.yaml` > safe defaults and returns source tracing. Safe defaults include `integrations.hypo_claw`, `integrations.hypo_writer`, `projects`, `output.timezone`, and `project_linkage.seeds`; paths use `~` or runtime HOME derivation instead of machine-specific absolute paths.

User config migration is explicit: `hypo-workflow config migrate` prints a dry-run plan and YAML, while `hypo-workflow config migrate --write` writes `~/.hypo-workflow/config.yaml`. `hypo-workflow sync` may show the migration prompt when user config is missing, but it does not silently create user config.

## Configuration Layers

| Layer | File | Purpose | Write boundary |
|---|---|---|---|
| Project | `.pipeline/config.yaml` | Current project workflow, execution, docs, and platform overrides | `/hw:init`, `/hw:plan:generate`, or explicit config edit |
| Global | `~/.hypo-workflow/config.yaml` | User-level platform, profile, model pool, automation, output defaults | `/hw:setup` or confirmed global TUI write |
| Cycle | `.pipeline/cycle.yaml` | Current Cycle kind, preset, lifecycle policy, and gates | `/hw:cycle`, `/hw:plan:generate`, accept/reject lifecycle commands |
| Rules | `.pipeline/rules.yaml` | Project-level rule severity and guard overrides | `/hw:rules` or explicit user confirmation |

## Automation And Hard Gates

| Field | Default / Common Values | Automation Effect | Strictness Effect | Human Confirmation Boundary |
|---|---|---|---|---|
| `automation.level` | `manual` / `balanced` / `full` | Controls whether ordinary execution auto-advances | Cannot lower hard gates | Cannot skip destructive/external, release publish, PR/MR remote write |
| `automation.gates.planning` | `confirm` | P2/P4 planning confirmation | Planning gate is a hard gate | P2 milestone split and P4 final plan confirmation require confirmation |
| `automation.gates.execution` | `auto` | Ordinary Milestones may auto-advance | Strict review can still block | Ordinary local execution only |
| `automation.gates.destructive_external` | `confirm` | Destructive or external side effects are never auto-executed | All profiles keep confirmation | Destructive commands, external side effects |
| `automation.gates.release_publish` | `confirm` | Release publish is never auto-executed | Confirm before tag, push, publish | tag, push, publish |
| `execution.bash.mode` | `allow_local` | Local bash execution auto-approved by default | Must never encode as OpenCode `bypass` | OpenCode local YOLO config no longer gates bash |
| `cycle.lifecycle_policy.gates.high_risk` | `confirm` | High-risk actions in current Cycle gated | High-risk actions not allowed by auto_continue | PR/MR remote write, plugin install, user-level config write |
| `cycle.lifecycle_policy.gates.pr_remote_write` | `confirm` | PR/MR remote writes require confirmation | Stricter than ordinary execution | push, merge, close, reviewer/label/target branch writes |
| `cycle.lifecycle_policy.gates.plugin_install` | `confirm` | Plugin installs require confirmation | User-level or remote install not auto | Claude/Codex/OpenCode plugin install |
| `cycle.lifecycle_policy.gates.user_level_config` | `confirm` | User-level config writes require confirmation | Cannot be silently written by project flow | `~/.claude`, `~/.codex`, `~/.hypo-workflow` |

## Planning And Execution Strictness

| Field | Purpose | Typical Policy |
|---|---|---|
| `plan.mode` | `interactive` runs P1-P4 gates; `auto` summarizes only when config allows | Use `interactive` when the user participates in planning |
| `plan.interaction_depth` | `low`/`medium`/`high` controls minimum P1 question rounds | Use `high` for complex Cycles |
| `plan.interactive.require_explicit_confirm` | Whether P4 explicit confirmation is required | Set `true` for team or high-risk projects |
| `execution.mode` | `self`, subagent, or host-specific execution mode | Codex defaults to main Agent orchestration with optional Subagents |
| `execution.worker_separation.mode` | `off` / `recommended` / `strict` | `recommended` separates implement/test/audit when practical; `strict` does not fully accept degraded execution |
| `execution.step_overrides.review_tests.strict` | Whether test review is strictly blocking | Set stricter for release/team mode |
| `execution.step_overrides.review_code.strict` | Whether code review is strictly blocking | Recommend stricter for critical features |
| `acceptance.mode` | `auto`, `manual`, `timeout`, or legacy `confirm` controls delivery acceptance | Use `manual`/`confirm` for manual acceptance or team workflows |
| `evaluation.max_diff_score` | Diff score exceeding threshold may trigger warning or repair | Lower is more conservative |

## P0 Configure And Subagent Authorization

`P0 Configure` runs before `P1 Discover` when starting each new Cycle. You can re-select or reuse the previous Cycle's settings, project config, or global defaults. This phase covers automation, Subagent authorization, acceptance, PR/MR remote write, full regression, analysis boundaries, and worker separation. Reuse sources are recorded as `cycle_explicit`, `previous_cycle_snapshot`, `project_config`, `global_config`, or `built_in_default`.

OpenCode local YOLO mode is expressed through schema-compatible `allow`, not through invalid OpenCode permission values. With `execution.bash.mode: allow_local` and disabled confirm flags, local test, lint, build, format, sync, docs repair, `git push`, PR/MR remote writes, `curl/wget`, remote clone, publish, `rm -rf`, `git reset --hard`, system installs, and release publication are not intercepted by the OpenCode permission hook. Generated `opencode.json` should explicitly keep `*: allow`, `bash: allow`, `edit: allow`, and `question: allow`; it must only use native OpenCode `ask`/`allow`/`deny` values and must not contain `bypass`.

Strict worker separation requires implementation Subagents to stay isolated from test/review/audit roles. Implementation workers do not read test source, fixtures, snapshots, or assertion details; they may receive requirements, public interfaces, allowed edit scope, test command, pass/fail status, and sanitized failure summaries. If the host cannot preserve isolation, the run must explain degraded mode, obtain explicit user confirmation, and record role isolation degradation.

Acceptance hardening: `/hw:accept` blocks missing or colliding implement/test/audit worker evidence, failed or `close_failed` worker lifecycle records, missing Codex `/hw:start` + `/hw:resume` authorization scope, and runtime-only observations being used as worker evidence.

## Analysis Preset Boundaries

| Field | manual | hybrid | auto |
|---|---|---|---|
| `execution.analysis.interaction_mode` | Read-only analysis preferred | Confirm before code changes | Auto-code-changes within boundaries |
| `execution.analysis.boundaries.code_changes` | `deny` | `confirm` | `allow` |
| `execution.analysis.boundaries.restart_services` | `confirm` | `confirm` | `confirm` |
| `execution.analysis.boundaries.install_system_dependencies` | `ask` | `ask` | `ask` |
| `execution.analysis.boundaries.network_remote_resources` | `ask` | `ask` | `allow` |
| `execution.analysis.boundaries.destructive_or_external_side_effects` | `ask` | `ask` | `ask` |

## Legacy Auto Fields

| Field | Compat Meaning | What It Must NOT Do |
|---|---|---|
| `evaluation.auto_continue` | Continue after ordinary evaluation passes | Cannot skip planning, destructive/external, release publish, PR/MR remote write |
| `batch.auto_chain` | Auto-advance Feature/Milestone queue after pass | Cannot skip `gate: confirm` |
| `batch.default_gate` | Default gate for new Features | Cannot override Cycle high-risk gates |
| `opencode.auto_continue` | OpenCode platform can continue in ordinary execution | Cannot represent remote write or plugin install confirmation |

## Default Profiles

Default profiles are conservative templates for `/hw:setup`, project initialization, and manual selection. They reduce config field selection cost but cannot override high-risk hard gates; PR/MR remote write, plugin install, user-level config write, destructive/external side effects, and release publish always require confirmation.

| Profile | Use Case | Automation | Strictness | Fixed Confirmation Boundaries |
|---|---|---|---|---|
| `solo-auto` | High-automation for personal projects: ordinary local execution auto-advances as much as possible, but PR/MR remote write, plugin install, user-level config, and release still require confirmation. | `full` | `recommended` | PR/MR remote write, plugin install, user-level config, destructive_external, release_publish |
| `manual-review` | New projects, sensitive changes, or learning workflows: keep more confirmation in planning and critical phases; ordinary execution does not aim for zero interruption. | `manual` | `recommended` | PR/MR remote write, plugin install, user-level config, destructive_external, release_publish |
| `team-strict` | Team collaboration, protected branches, and pre-release workflows: requires stronger worker separation, review strictness, and confirmation records. | `manual` | `strict` | PR/MR remote write, plugin install, user-level config, destructive_external, release_publish |
| `analysis-hybrid` | Investigate-first-then-modify problems: allows evidence collection and read-only analysis, confirms before code changes. | `balanced` | `recommended` | PR/MR remote write, plugin install, user-level config, destructive_external, release_publish |

### Copy-paste Snippets

#### solo-auto

High-automation configuration for personal projects: ordinary local execution auto-advances as much as possible, but PR/MR remote write, plugin install, user-level config, and release still require confirmation.

```yaml
# solo-auto - Personal full-auto development
automation:
  level: full
  gates:
    planning: confirm
    execution: auto
    destructive_external: confirm
    release_publish: confirm
evaluation:
  auto_continue: true
batch:
  auto_chain: true
  default_gate: auto
execution:
  bash:
    mode: allow_local
    confirm_external: false
    confirm_destructive: false
    confirm_system_install: false
  worker_separation:
    mode: recommended
cycle:
  lifecycle_policy:
    gates:
      high_risk: confirm
      destructive_external: confirm
      plugin_install: confirm
      pr_remote_write: confirm
      user_level_config: confirm
      release_publish: confirm
```

#### manual-review

For new projects, sensitive changes, or learning workflows: more confirmation kept in planning and critical phases; ordinary execution does not aim for zero interruption.

```yaml
# manual-review - Manual review
automation:
  level: manual
  gates:
    planning: confirm
    execution: confirm
    destructive_external: confirm
    release_publish: confirm
plan:
  mode: interactive
  interactive:
    require_explicit_confirm: true
evaluation:
  auto_continue: false
batch:
  auto_chain: false
  default_gate: confirm
execution:
  worker_separation:
    mode: recommended
cycle:
  lifecycle_policy:
    gates:
      high_risk: confirm
      destructive_external: confirm
      plugin_install: confirm
      pr_remote_write: confirm
      user_level_config: confirm
      release_publish: confirm
```

#### team-strict

For team collaboration, protected branches, and pre-release workflows: requires stronger worker separation, review strictness, and confirmation records.

```yaml
# team-strict - Team strict
automation:
  level: manual
  gates:
    planning: confirm
    execution: confirm
    destructive_external: confirm
    release_publish: confirm
acceptance:
  mode: manual
  require_user_confirm: true
execution:
  worker_separation:
    mode: strict
  step_overrides:
    review_tests:
      strict: true
    review_code:
      strict: true
evaluation:
  auto_continue: false
batch:
  auto_chain: false
  default_gate: confirm
cycle:
  lifecycle_policy:
    gates:
      high_risk: confirm
      destructive_external: confirm
      plugin_install: confirm
      pr_remote_write: confirm
      user_level_config: confirm
      release_publish: confirm
```

#### analysis-hybrid

For investigate-first-then-modify problems: allows evidence collection and read-only analysis, confirms before code changes.

```yaml
# analysis-hybrid - Analysis hybrid
default_workflow_kind: analysis
automation:
  level: balanced
  gates:
    planning: confirm
    execution: auto
    destructive_external: confirm
    release_publish: confirm
execution:
  steps:
    preset: analysis
  analysis:
    interaction_mode: hybrid
    boundaries:
      code_changes:
        manual: deny
        hybrid: confirm
        auto: allow
      restart_services: confirm
      install_system_dependencies: ask
      network_remote_resources:
        manual: ask
        hybrid: ask
        auto: allow
      destructive_or_external_side_effects: ask
  worker_separation:
    mode: recommended
evaluation:
  auto_continue: true
cycle:
  lifecycle_policy:
    gates:
      high_risk: confirm
      destructive_external: confirm
      plugin_install: confirm
      pr_remote_write: confirm
      user_level_config: confirm
      release_publish: confirm
```

## Platform Differences

| Platform | Focus | Boundary |
|---|---|---|
| Codex | Codex Skills, Subagents, preflight, continuation | Codex Subagents stay inside the Codex/GPT runtime; no external model routing required |
| Claude Code | `hw` plugin, hooks, agents, settings merge, optional Codex plugin detection | Claude native commands and Hypo `/hw:*` must be separated; plugin install/user-level settings require confirmation |
| OpenCode | native commands, agents, plugins, TUI/status, model matrix | OpenCode performs model calls; Hypo-Workflow only writes metadata and instructions |
| Cursor / Copilot / Trae | repository instruction files | Instruction surface only; no hook, runner, or lifecycle enforcement claims |

## User Selection Guide

- Want fewer interruptions in ordinary development: choose `balanced` or the `solo-auto` profile, but keep high-risk confirm.
- Want to pause at every step: choose `manual-review` so planning, review, PR/MR, and release stop more frequently.
- Working in a team or pre-release: choose `team-strict` for stronger review and worker separation evidence.
- Investigating a problem without modifying code first: choose `analysis-hybrid`, which allows evidence collection and confirms before code changes.
