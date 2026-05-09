# Platform Guide: Claude Code

## 中文主体说明

本规格描述 Hypo-Workflow 在 Claude Code 中的 plugin、hooks、agents、settings merge 和 resume 边界。Claude Code 的 plugin namespace 是 `hw`，因此 Hypo 命令应表现为 `/hw:*`；Claude native `/resume` 仍归 Claude Code 所有，Hypo workflow resume 只使用 `/hw:resume`。本文保留 hook event、SessionStart、PermissionRequest、settings、agent routing 等英文术语，便于和 Claude Code 配置文件精确对应。

Use this reference when the pipeline runs inside Claude Code.

## Environment Shape

- Hook support is rich and event-driven.
- Plugin packaging is supported through `.claude-plugin/plugin.json`.
- Dedicated subagent definitions normally live in `.claude/agents/`.
- Additional instruction files can live in `CLAUDE.md` and `.claude/rules/*.md`.
- Hypo-Workflow is not a runner. Claude Code performs the actual work while `.pipeline/` remains the workflow source of truth.

## Recommended Settings Template

Example `/.claude/settings.local.json` for project-local hooks:

```json
{
  "hooks": {},
  "agents": {}
}
```

## Hook 手动安装

将以下内容添加到 `.claude/settings.local.json`：

```json
{
  "hooks": {
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "bash hooks/stop-check.sh",
            "timeout": 5000
          }
        ]
      }
    ],
    "SessionStart": [
      {
        "matcher": "startup|clear",
        "hooks": [
          {
            "type": "command",
            "command": "bash hooks/session-start.sh startup",
            "timeout": 3000
          }
        ]
      },
      {
        "matcher": "resume",
        "hooks": [
          {
            "type": "command",
            "command": "bash hooks/session-start.sh resume",
            "timeout": 3000
          }
        ]
      },
      {
        "matcher": "compact",
        "hooks": [
          {
            "type": "command",
            "command": "bash hooks/session-start.sh compact",
            "timeout": 3000
          }
        ]
      }
    ]
  }
}
```

## Plugin Installation

Typical flow:

1. place the skill directory in the repository
2. load the plugin with `claude --plugin-dir <Hypo-Workflow repo>` for local development, or install it through a Claude Code marketplace for persistent use
3. verify that the plugin namespace is `hw` and that `skills/plan/SKILL.md` resolves as `/hw:plan`
4. run `/hw:setup` to create `~/.hypo-workflow/config.yaml`

Codex-related delegation has two separate paths:

- Codex CLI delegation: install `@openai/codex`, configure `OPENAI_API_KEY`, and set global `subagent.provider=codex` through setup. This is a CLI-backed delegation path.
- Official OpenAI Codex plugin for Claude Code: optional plugin-assisted delegation inside Claude Code. It uses `/plugin marketplace add openai/codex-plugin-cc`, `/plugin install codex@openai-codex`, `/reload-plugins`, and `/codex:setup`; Hypo-Workflow may propose these commands but must not execute them automatically.

Do not conflate these paths in generated setup guidance. If neither path is configured, fall back to Claude Code native subagents or stop before worker-separated role-sensitive work when policy requires independent evidence.

## Subagent Paths

Preferred order:

1. `.claude/agents/<name>.md`
2. built-in Claude subagent routing
3. `claude -p` for explicit non-interactive delegation

## Hook Usage Guidance

Claude hooks can enrich the pipeline with:

- prompt start summaries
- decision-block stop enforcement
- state snapshotting
- structured event propagation through `additionalContext`

Key V3 behavior:

- Stop Hook can block premature termination with `decision:block`
- SessionStart reinjects pipeline state on startup, resume, and compact
- Claude native `/resume` remains a Claude Code command. Hypo-Workflow resume is `/hw:resume`; the plugin must not expose or document bare `/resume` as a Hypo alias.
- `hooks/hooks.json` `matcher: resume` is a SessionStart event matcher, not a user slash command.
- InstructionsLoaded can observe `SKILL.md` loads without changing control flow

Even in Claude Code, hooks should reinforce the state machine, not replace it.

## C6 Hook Runtime

Generated settings register `node hooks/claude-hook.mjs <EventName>` for:

- `SessionStart`
- `Stop`
- `PreCompact`
- `PostCompact`
- `PostToolUse`
- `PostToolBatch`
- `UserPromptSubmit`
- `PermissionRequest`
- `FileChanged(.pipeline/PROGRESS.md)`

Stop blocks missing workflow-critical evidence: `.pipeline/state.yaml`, `.pipeline/log.yaml`, `.pipeline/PROGRESS.md`, and the current report when the final milestone step is complete. Metrics and derived-refresh gaps are warning-only so they do not deadlock routine exits.

Compact hooks emit a short resume packet with Cycle, current Milestone/prompt, current step, next action, required files, automation state, and recent events. The packet explicitly tells Claude not to replay completed steps and to trust `.pipeline/state.yaml`.

PermissionRequest follows `claude_code.profile`:

- `developer`: allow local automation.
- `standard`: ask for protected workflow files, destructive commands, and external side effects.
- `strict`: deny protected/destructive/external actions and allow only low-risk actions.

## C6 Adapter Profiles

Claude Code adapter configuration uses three safety profiles:

- `developer`: permissive local development mode.
- `standard`: published default, with confirmation for destructive or external side effects.
- `strict`: conservative team/CI mode.

The adapter should preserve existing `.claude/` configuration, merge only Hypo-managed settings, and back up `.claude/settings.local.json` before first mutation.

## Safe Settings Merge

`hypo-workflow sync --platform claude-code` owns marker-bearing hook entries and the managed main-session model in `.claude/settings.local.json`:

- `model`: generated from `claude_code.model`, defaulting to `deepseek-v4-pro`
- hook groups marked with `hypo_workflow_managed: true`
- metadata under `hypo_workflow.managed_by=hypo-workflow`

Existing user keys such as `env`, user-managed plugin configuration, and non-managed hook groups are preserved. Existing managed hook groups and managed model value are replaceable on rerun. A user-owned hook command that matches a Hypo-managed command, or a user-owned `model` value that differs from `claude_code.model`, is treated as a conflict; sync reports manual confirmation and does not rewrite the settings file.

Before changing an existing settings file, sync creates `.claude/settings.local.json.bak.YYYYMMDDHHMMSS`. Rerunning sync after no content change is idempotent and does not create another backup.

## Model Routing

Claude Code subagents derive model choices from the shared model pool. C6 defaults keep docs on DeepSeek V4 Pro and code/test roles on Mimo V2.5 Pro, with explicit project overrides allowed through `claude_code.agents`.

`hypo-workflow sync --platform claude-code` writes marker-managed `.claude/agents/hw-*.md` files plus `.claude/hypo-workflow-agents.json` metadata. User-owned same-name agent files are not overwritten; sync records a conflict for manual resolution.

Dynamic selection is advisory and inspectable:

- documentation tasks select `docs`
- implementation tasks select `code`
- active Test Profiles select `test`
- retry/failure states select `debug`
- report/release work selects `report`
- compact/context work selects `compact`

Hypo-Workflow does not invoke these models directly. Claude Code owns actual subagent execution and model calls.

## Status Surface

C6 exposes a read-only Claude status surface built from the canonical workflow files:

- `.pipeline/PROGRESS.md` supplies the compact current summary, basic settings table, milestone table, and timeline rows.
- `.pipeline/state.yaml` supplies phase, step, next action, progress count, and lifecycle status through the shared status model.
- `.pipeline/log.yaml` supplies fallback recent events when the Progress timeline is missing.

The surface is intentionally a projection. It must not create an action panel, mutate workflow state, or paste raw logs/secrets into Claude output.

Status refresh is event-driven:

- `FileChanged(.pipeline/PROGRESS.md)` and progress-touching tool events attach a `claude_status` snapshot to the hook result.
- `ProgressMonitor` returns a short notification plus Markdown status context.
- `/hw:status` aliases should present the same compact model instead of dumping all of `PROGRESS.md`.

Monitor capability finding: Claude Code plugin docs include monitor packaging, but C6 does not assume a persistent native panel/status slot. The validated fallback order is:

1. monitor notification from `monitors/monitors.json`
2. `/hw:status` compact output
3. SessionStart/Stop injected summary
4. dashboard link or explicit launch guidance
