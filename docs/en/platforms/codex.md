# Official Codex Guide

[中文](../../platforms/codex.md) | English

This page covers how to install Hypo-Workflow on Official Codex, what it can do today, and where its boundaries are — for users trying Hypo-Workflow in Codex for the first time.

Hypo-Workflow v15.0.0-alpha.2 ships as a Codex plugin with ten focused Skills and six semantic or safety Hook events. It is not a runner: the Codex Agent implements, runs experiments, tests, and reviews work, while ordinary semantic files preserve plans and evidence. Host Contract v1 remains for legacy compatibility, and both ZIP artifacts include `/hw:experiment`.

## Installation Shapes

Use the plugin for full behavior. Add a development checkout as a local marketplace:

```bash
codex plugin marketplace add /absolute/path/to/Hypo-Workflow
codex plugin marketplace list
```

Install or enable `hypo-workflow` from Codex `/plugins`, then start a new session. Use `/hooks` to inspect sources and trust the current definitions. Codex binds trust to Hook hashes, so changed definitions are skipped until trusted again.

A Skill-only symlink is available for degraded testing without Hooks:

```bash
mkdir -p "$CODEX_HOME/skills"
ln -sfn /absolute/path/to/Hypo-Workflow "$CODEX_HOME/skills/hypo-workflow"
```

This loads Skills only and is not a full plugin installation.

## Current Capabilities

| Surface | Current contract |
| --- | --- |
| Commands | ten public Skills: guide, init, goal, plan, cycle, maintain, experiment, resume, accept, reject |
| Questions | use the host Ask/request-user-input surface after showing full decision context |
| Plan | maintain a visible host Plan/Todo; `/hw:plan` selects internal phases |
| Subagents | choose by complexity; material work may separate test, implement, audit, or domain roles |
| Memory | Manifest, Runtime, Continuation, Records, Receipts, Journal, Capsule, Pack, Snapshots |
| Experiment | project knowledge, code/`uv`/machine context, scans, Attempts, scientific review, Git events, and instant status |
| Hooks | ten current Official Codex lifecycle events |
| Destruction | exact Deletion Manifest + fresh Receipt + controlled executor |

OpenCode, Claude Code, Cursor, Copilot, Trae, and custom Codex-fork adapters are outside the current support surface.

## Task Assessment And Worker Routing

Codex first uses topology to decide whether independent test, implement, audit, or other Worker identities are required. It then generates and shows a Task Assessment for every Worker before start.

The assessment covers `complexity`, `uncertainty`, `oracle_strength`, `blast_radius`, `reversibility`, `risk_flags`, and a concise conclusion. Core only performs exact, bounded, secret-safe validation and deterministically emits `mechanical`, `standard`, `explore`, `critical`, or `escalation`.

This semantic handoff contains no concrete model, execution provider, credential, prompt, or reasoning effort. `SubagentStart` records only the persisted routing class, reason codes, policy version, and visible assessment in Worker Journal context.

The three modes: `advisory` records an explicit fallback and inherits the current execution context when the host lacks this handoff; `required` blocks Worker start; `off` emits no hint.

Routing does not replace topology or relax role separation, evidence, acceptance, or user authority. Resume reuses the Runtime/Continuation decision. A Worker that needs a different semantic class uses a no-history or bounded-history fork; a full-history fork inherits its parent's execution context. See the [configuration governance reference](../reference/configuration.md) for the complete field and classification tables.

## Hook Events

The plugin discovers `hooks/hooks.json` by default:

| Event | Hypo-Workflow behavior |
| --- | --- |
| `SessionStart` | inject bounded Recovery Pack context after compaction |
| `UserPromptSubmit` | extract a clean durable semantic delta into a Journal/Inbox proposal |
| `PreToolUse` | deny obvious direct deletion and explain the gate |
| `PermissionRequest` | add deletion or permission context before an approval prompt |
| `PostToolUse` | record bounded tool evidence and emit relevant deduplicated docs/Record reminders |
| `PreCompact` | seal a Recovery Pack from a validated Capsule |
| `PostCompact` | record the compaction outcome |
| `SubagentStart` | record worker identity and role |
| `SubagentStop` | record worker evidence references and closure |
| `Stop` | record the turn boundary and recovery clue |

Commands locate the installed bundle through `PLUGIN_ROOT`, and timeouts use seconds. The wrapper writes one valid JSON line to stdout and sends diagnostics to stderr.

Turn-level Hook inputs may omit `turn_id` or `tool_use_id` without causing a compatibility failure. This does not change Hook trust, enablement, or authority boundaries.

## Boundaries

Matching command Hooks launch concurrently, so one Hook cannot stop another from starting. `PreToolUse` covers supported Bash, `apply_patch`, and MCP paths, but interception remains incomplete. Therefore:

- Hooks do not replace Runtime or Receipt authority.
- Reminders do not force a documentation write after every tool call.
- Worker observations count for acceptance only when they satisfy topology and evidence contracts.
- Plugin enablement, Hook trust, and project trust are discovery prerequisites.

Deletion authority comes only from an exact hashed Deletion Manifest already shown to the user and a `deletion.execute` Receipt bound to actor, intent, scope, Manifest hash, and plan/Git state. The controlled executor revalidates content and Git before deletion; drift invalidates the Receipt.

## Workspace And Recovery

Current authority order:

```text
.pipeline/manifest.yaml
  -> .pipeline/runtime/active.yaml
  -> Runtime + Continuation
  -> Records / Receipts
  -> Journal / Capsule / latest valid sealed Pack
```

Resume reads Runtime and Continuation first; a Pack only enriches bounded context. Resume still works without a Pack and reports degraded recovery context. Never restore a current Delivery from legacy `state.yaml`, `cycle.yaml`, `log.yaml`, or `PROGRESS.md`.

## Validation

Repository checks can validate the manifest, JSON, Hook wrapper, and deterministic Core. A real-host result is PASS only with a compatible current Official Codex, the plugin enabled, and Hooks trusted. Otherwise report SKIP/UNAVAILABLE; a VSP fork or old Codex binary is not equivalent evidence.
