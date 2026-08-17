# Configuration Governance Reference

[中文](../../../reference/configuration.md) | English

This page is the configuration matrix for users and Agents: start here when you need a field's meaning, default value, or confirmation boundary.

Configuration resolution is project config > global config > built-in default — project config wins, then global config, then built-in defaults. Project config is usually `.pipeline/config.yaml`; global config is usually `~/.hypo-workflow/config.yaml`.

Hypo-Workflow is not a background runner; config only controls how the Agent plans, executes, reviews, and asks for confirmation.

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
| `automation.gates.planning` | `confirm` | Planning confirmation | Decompose milestone split and Generate final confirmation |
| `automation.gates.execution` | `auto` | Ordinary Milestones may continue | Strict review can still block |
| `automation.gates.destructive_external` | `confirm` | Destructive or external side effects stay gated | Destructive commands and external side effects |
| `automation.gates.release_publish` | `confirm` | Release publish stays gated | tag, push, publish |
| `cycle.lifecycle_policy.gates.pr_remote_write` | `confirm` | PR/MR remote writes stay gated | push, merge, close, reviewer/label/target branch writes |

## Planning And Execution Strictness

| Field | Purpose | Typical policy |
|---|---|---|
| `plan.mode` | `interactive` displays Discover / Technical / Architecture artifacts and asks only for material decisions; `auto` continues only when explicitly delegated | Use `interactive` when the user participates in planning |
| `plan.interactive.require_explicit_confirm` | Offers one confirm-and-start / confirm-without-starting / continue-discussion choice after the complete Proposal | Keep `true` for team or high-risk work |
| `execution.mode` | `self`, `subagent`, or host-specific execution mode | Codex defaults to main Agent orchestration with optional Subagents |
| `execution.worker_separation.mode` | `off` / `recommended` / `strict` | `recommended` separates implement/test/audit when practical; `strict` does not fully accept degraded execution |
| `execution.worker_routing.mode` | `off` / `advisory` / `required` | Passes a semantic capability class after topology is fixed; default is `advisory` |
| `execution.worker_routing.failure_escalation_threshold` | fixed at `2` | Escalates after two distinct execution routes fail; same-route retries do not accumulate |
| `acceptance.mode` | `auto`, `manual`, `timeout`, or legacy `confirm` | Use `manual`/`confirm` for team workflows |

## P0 Configure And Subagent Authorization

`P0 Configure` runs after `cycle new` and before Discover. It lets the user select or reuse automation, Subagent authorization, acceptance, PR/MR remote-write policy, full regression, analysis boundaries, and worker separation. Reuse sources are recorded as `cycle_explicit`, `previous_cycle_snapshot`, `project_config`, `global_config`, or `built_in_default`.

Strict worker separation requires implementation Subagents to stay isolated from test/review/audit roles:

- implementation workers do not read test source, fixtures, snapshots, or assertion details;
- they may receive requirements, public interfaces, allowed edit scope, test command, pass/fail status, and sanitized failure summaries.

If the host cannot preserve isolation, the run must explain degraded mode, obtain explicit user confirmation, and record role isolation degradation.

Acceptance hardening: `/hw:accept` blocks missing or colliding implement/test/audit worker evidence, failed or `close_failed` worker lifecycle records, missing Codex `/hw:start` + `/hw:resume` authorization scope, and runtime-only observations being used as worker evidence.

## Task Assessment And Worker Routing

Worker topology and Worker Routing are separate decisions:

1. Topology first determines whether test, implement, audit, or other independent identities are required.
2. The host AI then generates a visible Task Assessment for each Worker from current repository evidence.

Core validates that structured assessment and applies deterministic policy; it does not call another model or choose a concrete model, execution provider, credential, or reasoning effort.

The Task Assessment is shown before Worker start:

| Field | Values | Meaning |
|---|---|---|
| `complexity` | `low` / `medium` / `high` | Overall implementation, coordination, and comprehension difficulty |
| `uncertainty` | `low` / `medium` / `high` | How unclear the root cause, route, or inputs remain |
| `oracle_strength` | `strong` / `mixed` / `weak` | Reliability of tests, specifications, or objective metrics used to judge correctness |
| `blast_radius` | `low` / `medium` / `high` | Potentially affected modules, users, or authority surfaces |
| `reversibility` | `reversible` / `guarded` / `irreversible` | Whether rollback is direct, needs safeguards, or is materially irreversible |
| `risk_flags` | at most 16 safe identifiers, each at most 128 UTF-8 bytes | Semantic risks such as security, migration, or recovery conflict |
| `summary` | at most 1024 UTF-8 bytes | Concise user-visible conclusion with no secret, prompt, or hidden reasoning |

Deterministic precedence is `escalation > critical > explore > standard > mechanical`:

| Routing class | Typical triggers |
|---|---|
| `mechanical` | `status`, `format`, `read-only-summary`, `deterministic-test-command`, or other trivial reversible work |
| `standard` | Ordinary implementation, routine test design, or documentation |
| `explore` | Unknown root cause, candidate comparison, high uncertainty, or exploratory implementation |
| `critical` | Architecture, weak oracle, independent audit, recovery conflict, or high blast radius |
| `escalation` | Security, migration, irreversible work, or two distinct failed execution routes |

The three modes differ as follows:

- `off` emits no hint.
- `advisory` permits the Worker to inherit the current execution context when the host lacks semantic routing support and records an explicit fallback.
- `required` blocks that Worker start when support is absent.

Routing never changes role independence, evidence, acceptance, or user authority. Resume reuses the persisted assessment, class, reasons, failure count, and policy version from Runtime/Continuation instead of reclassifying.

Every routing identifier is limited to 128 UTF-8 bytes. One failure-history input may contain at most 256 attempts, and persisted distinct failed route IDs are limited to 64. Larger inputs fail closed before any Runtime, Journal, or Capsule write.

```yaml
execution:
  worker_routing:
    mode: advisory
    policy_version: worker-routing-v1
    failure_escalation_threshold: 2
automation:
  codex:
    external_model_routing: false
```

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
