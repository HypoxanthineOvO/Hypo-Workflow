<div align="center">

# Hypo-Workflow

**A local project workflow protocol for Codex**

Plan -> Execute -> Independently verify -> Human acceptance -> Resume safely

[![Version](https://img.shields.io/badge/version-14.0.0--alpha.3-blue)](.codex-plugin/plugin.json)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Official%20Codex-black)](docs/en/reference/platforms.md)

**Language:** [中文](README.md) | English

</div>

Hypo-Workflow is a Skill protocol, not a runner or background service. The host Agent implements, tests, and reviews project work; `.pipeline/` preserves verifiable, recoverable project facts.

[v14.0.0-alpha.3 Release Notes](docs/en/release/v14.0.0-alpha.3.md)

This release supports **Official Codex** as its only current adapter. OpenCode, Claude Code, Cursor, GitHub Copilot, Trae, and custom Codex-fork adapters are deferred. Old platform artifacts that remain in the repository are not current support claims.

## Current Architecture

`.pipeline/manifest.yaml` selects the current format and write boundary:

```text
Manifest
  -> Runtime + Continuation
  -> Records + Receipts
  -> Recovery Journal + Capsule + sealed Pack
  -> accepted/checkpoint Snapshots
```

- **Runtime** owns Goal/Cycle lifecycle; **Continuation** owns only the next action.
- **Records** store requirements, preferences, decisions, and feedback. They replace the generic Rules system.
- **Experiment events / status projection** store Git-mergeable experiment facts and provide instant status without rescanning result trees.
- **Worker Routing** shows a task assessment before Worker start and emits a semantic capability class without choosing a model or provider.
- **Receipts** store one-time, scoped user authorization.
- **Recovery Journal / Capsule / Pack** preserve bounded recovery evidence without replaying full conversations or overriding newer Runtime.
- Legacy `state.yaml`, `cycle.yaml`, `log.yaml`, `PROGRESS.md`, `rules.yaml`, and `knowledge/` are not current authority.

## Install

Use the Codex plugin for full behavior. A development checkout can be added as a local marketplace:

```bash
git clone https://github.com/HypoxanthineOvO/Hypo-Workflow.git
codex plugin marketplace add /absolute/path/to/Hypo-Workflow
```

Install or enable `hypo-workflow` from Codex `/plugins`, then use `/hooks` in a new session to review and trust its plugin Hooks. Changed Hook definitions require trust for the new hash.

A symlink under `$CODEX_HOME/skills` loads Skills only. It does not load plugin-bundled Hooks and is therefore not a full installation.

## Delivery Workflows And The Experiment Lane

Use Goal for one explicit outcome:

```text
/hw:init -> /hw:goal -> discuss and approve Design -> explicitly say “start”
         -> verify -> /hw:accept or /hw:reject
```

Use Cycle when stages have real dependency order:

```text
/hw:init -> /hw:cycle -> /hw:plan when needed
         -> approve ordered Milestones -> explicitly say “start”
         -> verify each Milestone -> one final human acceptance
```

Use Experiment when work has no linear finish and requires repeated runs, parameter scans, and result judgment:

```text
/hw:init -> /hw:experiment -> record environment/knowledge/baselines -> run and supervise
         -> append immutable events -> read materialized status -> continue iterating
```

Approval moves only to `waiting_to_start`; it does not implement. Use `/hw:resume` after interruption. Use `/hw:maintain` for everyday requirements, preferences, decisions, feedback, and writing context. Experiment is a non-linear record and status lane, not a runner or background scheduler.

### Experiment Capabilities

- Preserve project purpose, paper/document references, metric and dataset meanings, module roles, optimization locations, and concept-to-code mappings, with stale-knowledge checks after code changes.
- Bind every run to a Git snapshot, `uv` environment, machine/GPU/driver/CUDA facts, data locations, parameters, command, resource limits, and a readable output directory.
- Separate logical Experiments from Attempts and support one-axis/cross scans, screening expansion, contextual baselines, tmux supervision, interruption recovery, trash/restore history, and confirmation-gated scientific review.
- Answer “how are the experiments going?” from a bounded materialized status that leads with baselines, environment, datasets, scan purpose, outcomes, exceptions, and next actions instead of rescanning every result directory.

Real NeRF, AceSim, GitLab, SSH/SCP, large-trace, and multi-week behavior still need a real-project Pilot. The current release records the environment used by an experiment; it is not a whole-computer inventory for proxies, ports, services, tools, or SSH configuration.

## Ten Public Routes

| Command | Purpose |
| --- | --- |
| `/hw:guide` | recommend one workflow when the next step is unclear |
| `/hw:init` | initialize, adopt, or inspect a workspace |
| `/hw:goal` | deliver one outcome with explicit acceptance |
| `/hw:plan` | adapt planning depth to available evidence |
| `/hw:cycle` | deliver ordered dependent Milestones |
| `/hw:maintain` | persist one day-to-day project fact |
| `/hw:experiment` | manage environments, scans, reruns, scientific review, and instant experiment status |
| `/hw:resume` | recover from Runtime, Continuation, and a Recovery Pack |
| `/hw:accept` | accept a pending Delivery |
| `/hw:reject` | reject with structured feedback and revise |

Chat, Explain, Status, Report, Log, Check, Compact, Knowledge, Sync, Debug, Start, and Plan phases are internal natural behavior. Analysis, Audit, Quality, Docs, PR, Release, Explore, and Optimize are deferred. Setup, Rules, Stop, Skip, Reset, Showcase, Patch, Help, Watchdog, and plan-confirm are removed; old explicit invocations return zero-write diagnostics.

## Semantic Worker Routing

Topology decides whether independent test, implement, or audit identities are needed. Routing only states the semantic capability required by an already selected Worker. The host AI shows `complexity`, `uncertainty`, `oracle_strength`, `blast_radius`, `reversibility`, and `risk_flags`; Core then deterministically emits:

| Class | Typical work |
| --- | --- |
| `mechanical` | status, formatting, read-only summaries, deterministic commands |
| `standard` | ordinary implementation with clear requirements and acceptance |
| `explore` | unknown roots, candidate comparison, or high uncertainty |
| `critical` | architecture, a weak oracle, high blast radius, or independent audit |
| `escalation` | security, migration, irreversible work, or two distinct failed routes |

Workflow does not emit Luna/Sol, providers, credentials, or reasoning effort; those mappings belong to the host. Routing never relaxes role separation, evidence, acceptance, or user authority.

## Codex Hooks

The plugin loads ten events from `hooks/hooks.json`:

`SessionStart`, `UserPromptSubmit`, `PreToolUse`, `PermissionRequest`, `PostToolUse`, `PreCompact`, `PostCompact`, `SubagentStart`, `SubagentStop`, and `Stop`.

They support ambient Maintain, relevant docs/Record reminders, pre-compaction Pack sealing, post-compaction recovery, worker evidence, and an additional deletion guardrail. Matching Hooks can run concurrently, and `PreToolUse` cannot intercept every equivalent path, so Hooks never replace Core authority or human approval.

Deletion requires the full exact Deletion Manifest in chat, fresh user approval, a `deletion.execute` Receipt bound to that Manifest and Git state, and the controlled executor. Any hash or Git drift invalidates approval.

## Execution Discipline

- Treat discussion, background, ideas, complaints, and revision feedback as consultation, not editing authorization.
- Use `solo-verified` for trivial reversible work; separate test, implement, audit, or other domain roles when material work benefits from independent evidence.
- Explain completion reports in chat: conclusion, approach, changed modules, tests, results, problems, and risks. A path alone is insufficient.
- Preserve unrelated user changes in a dirty worktree.

## Documentation

- [User Guide](docs/en/user-guide.md)
- [Ten-command Reference](docs/en/reference/commands.md)
- [Codex Guide](docs/en/platforms/codex.md)
- [Platform Status](docs/en/reference/platforms.md)
- [Current Artifacts and Authority](docs/en/reference/generated-artifacts.md)
- [Command Spec](references/commands-spec.md)
- [State Contract](references/state-contract.md)

## License

MIT. See [LICENSE](LICENSE).
