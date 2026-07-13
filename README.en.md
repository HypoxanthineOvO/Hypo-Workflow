<div align="center">

# Hypo-Workflow

**A local project workflow protocol for Codex**

Plan -> Execute -> Independently verify -> Human acceptance -> Resume safely

[![Version](https://img.shields.io/badge/version-13.1.0--beta.3-blue)](.codex-plugin/plugin.json)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Official%20Codex-black)](docs/en/reference/platforms.md)

**Language:** [中文](README.md) | English

</div>

Hypo-Workflow is a Skill protocol, not a runner or background service. The host Agent implements, tests, and reviews project work; `.pipeline/` preserves verifiable, recoverable project facts.

[v13.1.0-beta.3 Release Notes](docs/en/release/v13.1.0-beta.3.md)

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

## Two Main Workflows

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

Approval moves only to `waiting_to_start`; it does not implement. Use `/hw:resume` after interruption. Use `/hw:maintain` for everyday requirements, preferences, decisions, feedback, and writing context without opening a Delivery.

## Nine Public Routes

| Command | Purpose |
| --- | --- |
| `/hw:guide` | recommend one workflow when the next step is unclear |
| `/hw:init` | initialize, adopt, or inspect a workspace |
| `/hw:goal` | deliver one outcome with explicit acceptance |
| `/hw:plan` | adapt planning depth to available evidence |
| `/hw:cycle` | deliver ordered dependent Milestones |
| `/hw:maintain` | persist one day-to-day project fact |
| `/hw:resume` | recover from Runtime, Continuation, and a Recovery Pack |
| `/hw:accept` | accept a pending Delivery |
| `/hw:reject` | reject with structured feedback and revise |

Chat, Explain, Status, Report, Log, Check, Compact, Knowledge, Sync, Debug, Start, and Plan phases are internal natural behavior. Analysis, Audit, Quality, Docs, PR, Release, Explore, and Optimize are deferred. Setup, Rules, Stop, Skip, Reset, Showcase, Patch, Help, Watchdog, and plan-confirm are removed; old explicit invocations return zero-write diagnostics.

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
- [Nine-command Reference](docs/en/reference/commands.md)
- [Codex Guide](docs/en/platforms/codex.md)
- [Platform Status](docs/en/reference/platforms.md)
- [Current Artifacts and Authority](docs/en/reference/generated-artifacts.md)
- [Command Spec](references/commands-spec.md)
- [State Contract](references/state-contract.md)

## License

MIT. See [LICENSE](LICENSE).
