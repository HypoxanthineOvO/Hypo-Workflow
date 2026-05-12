---
name: setup
description: Configure Hypo-Workflow global defaults for agent platform, execution mode, subagents, plan mode, and dashboard.
---

# /hypo-workflow:setup
## 输出语言规则

📌 输出语言规则：
读取 config.yaml → output.language
- zh-CN / zh：所有用户可见的输出使用中文（PROGRESS、报告、状态提示、错误消息、交互提问）
- en：使用英文
- auto：跟随用户对话语言
内部日志（log.yaml、state.yaml）始终英文。

Use this skill as the plugin-level setup wizard. It configures Hypo-Workflow itself, not a project-local `.pipeline/` workspace.

## 配置目标

Always use the global file:

- directory: `~/.hypo-workflow/`
- config file: `~/.hypo-workflow/config.yaml`

Do not write `.pipeline/config.yaml` from setup. Project-local configuration belongs to `/hypo-workflow:init` or `/hypo-workflow:plan-generate`.

## 配置优先级

When another skill needs runtime defaults, resolve values in this order:

1. project config: `.pipeline/config.yaml`
2. global config: `~/.hypo-workflow/config.yaml`
3. built-in defaults

Important mappings:

- project `execution.mode` > global `execution.default_mode` > `self`
- project `execution.subagent_tool` > global `subagent.provider` > `auto`
- project `plan.mode` > global `plan.default_mode` > `interactive`
- project `plan.interaction_depth` > global `plan.interaction_depth` > `medium`
- project `dashboard.enabled` > global `dashboard.enabled` > `false`
- project `dashboard.port` > global `dashboard.port` > `7700`
- project `output.language` > global `output.language` > `zh-CN`
- project `output.timezone` > global `output.timezone` > `Asia/Shanghai`
- project `watchdog.enabled` > global `watchdog.enabled` > `false`
- project rules from `.pipeline/rules.yaml` > project `rules.*` > global `rules.*` > `extends: recommended`

## 执行流程

1. Create the config directory if needed:
   - `mkdir -p ~/.hypo-workflow`
2. Check for an existing global config:
   - if `~/.hypo-workflow/config.yaml` does not exist, start the first-run wizard
   - if it exists, read it, summarize the current values, and ask whether the user wants to modify it
3. Detect the current agent platform:
   - Claude Code when Claude-specific markers or environment are visible
   - Codex when Codex-specific markers or environment are visible
   - otherwise ask the user to choose `claude-code` or `codex`
4. Ask for execution mode:
   - `self` is recommended for first-time users
   - `subagent` enables delegation to another agent runtime
5. If subagent mode is selected, ask for:
   - provider: `codex` or `claude`
   - model
   - Codex `base_url` only when a custom API endpoint is used
   - optional connection test command when the tool is available
6. Ask for Dashboard defaults:
   - enabled by default: `true` or `false`
   - port, default `7700`
7. Ask for Plan mode:
   - `interactive` pauses for confirmation during planning
   - `auto` runs planning phases without routine pauses
8. Ask for output defaults:
   - language, default `zh-CN`
   - timezone, default `Asia/Shanghai`
9. Ask whether to enable watchdog defaults:
   - default `false`
   - interval and heartbeat timeout default `300`
10. Ask for Rules defaults:
   - preset: `recommended`, `strict`, or `minimal`
   - default `recommended`
11. Write `~/.hypo-workflow/config.yaml`.
12. Print a concise configuration summary and remind the user that project config can override these values.

## 首次运行问题

Use short, concrete prompts:

- "Current platform appears to be `<detected>`. Use this platform?"
- "Default execution mode: `self` or `subagent`?"
- "Subagent provider: `codex` or `claude`?"
- "Subagent model?"
- "Custom Codex base URL, or leave empty?"
- "Enable Dashboard by default?"
- "Dashboard port?"
- "Plan mode: `interactive` or `auto`?"
- "Interaction depth: `low`, `medium`, or `high`?"
- "Output language?"
- "Output timezone?"
- "Enable Auto Resume watchdog by default?"
- "History import split method?"
- "Rules preset: `recommended`, `strict`, or `minimal`?"

## 默认值

- `agent.platform=claude-code` when running in Claude Code, otherwise `codex`
- `agent.model` should use the current session model when visible
- `execution.default_mode=self`
- `subagent.provider=codex`
- `subagent.codex.model=gpt-5.4`
- `subagent.claude.model=claude-sonnet-4-20250514`
- `dashboard.enabled=true`
- `dashboard.port=7700`
- `plan.default_mode=interactive`
- `plan.interaction_depth=medium`
- `plan.interactive.min_rounds=3`
- `plan.interactive.require_explicit_confirm=true`
- `output.language=zh-CN`
- `output.timezone=Asia/Shanghai`
- `watchdog.enabled=false`
- `watchdog.interval=300`
- `watchdog.heartbeat_timeout=300`
- `watchdog.max_retries=5`
- `watchdog.max_consecutive_milestones=10`
- `watchdog.notify=true`
- `history_import.split_method=auto`
- `history_import.time_gap_threshold=24h`
- `history_import.max_milestones=20`
- `compact.auto=true`
- `compact.progress_recent=15`
- `compact.state_history_full=1`
- `compact.log_recent=20`
- `compact.reports_summary_lines=3`
- `showcase.language=auto`
- `showcase.poster.api_key_env=OPENAI_API_KEY`
- `showcase.poster.size=1024x1536`
- `showcase.poster.quality=high`
- `showcase.poster.style=auto`
- `rules.extends=recommended`
- `rules.rules={}`
- `version=8.4.0`

## 配置结构

```yaml
# Hypo-Workflow global config
# Generated by /hypo-workflow:setup

agent:
  platform: claude-code
  model: claude-sonnet-4-20250514

execution:
  default_mode: self

subagent:
  provider: codex
  codex:
    model: gpt-5.4
    base_url: https://api.vsplab.cn
  claude:
    model: claude-sonnet-4-20250514

dashboard:
  enabled: true
  port: 7700

plan:
  default_mode: interactive
  interaction_depth: medium
  interactive:
    min_rounds: 3
    require_explicit_confirm: true

output:
  language: zh-CN
  timezone: Asia/Shanghai

watchdog:
  enabled: false
  interval: 300
  heartbeat_timeout: 300
  max_retries: 5
  max_consecutive_milestones: 10
  notify: true

history_import:
  split_method: auto
  time_gap_threshold: 24h
  max_milestones: 20
  keyword_patterns:
    - 'feat\(M(\d+)\):'
    - 'M(\d+)-'
    - 'milestone-(\d+)'

compact:
  auto: true
  progress_recent: 15
  state_history_full: 1
  log_recent: 20
  reports_summary_lines: 3

showcase:
  language: auto
  poster:
    api_key_env: OPENAI_API_KEY
    size: "1024x1536"
    quality: high
    style: auto

rules:
  extends: recommended
  rules: {}

version: "8.4.0"
created: "2026-04-26T14:00:00+08:00"
updated: "2026-04-26T14:00:00+08:00"
```

Omit `subagent.codex.base_url` when the default OpenAI endpoint is used.

## 连接检查

Only run checks that match installed tools:

- Codex provider:
  - `codex --version`
  - if custom API variables are needed, tell the user to set `OPENAI_BASE_URL` and `OPENAI_API_KEY`
- Claude provider:
  - `claude --version`

If a check fails, keep the config but mark the provider as unverified in the summary. Do not block setup unless the user asks for a strict check.

## 平台说明

Claude Code users:

- install/enable the `hw` plugin and invoke commands as `/hw:*`; Claude native `/resume` remains separate from Hypo `/hw:resume`
- configure Codex as a subagent by installing `@openai/codex`, setting `OPENAI_API_KEY`, and choosing `subagent.provider=codex`
- dashboard is not part of the active Claude Code command surface unless a future release explicitly re-enables it

Codex users:

- invoke the compatibility commands as `/hw:*`
- keep Codex Subagents inside the Codex/GPT runtime; do not configure Claude, DeepSeek, Mimo, or other external model routing as a Codex Subagent backend
- keep project-specific overrides in `.pipeline/config.yaml`

Mixed mode:

- keep `execution.mode=self` for the main orchestrator
- delegate individual steps with `step_overrides.<step>.executor=subagent`
- choose a subagent backend only when it is native to the active platform or explicitly documented as a non-Codex handoff path

## 既有配置行为

When a config exists:

1. show current values for platform, default mode, subagent provider/model, dashboard, and plan mode
2. ask whether to edit
3. preserve unspecified existing values

## Config TUI 编辑

Interactive config editing must keep global defaults and project config as separate targets. Stage edits first, show a diff, validate supported schema fields, and require confirmation before writing.

Do not write `.pipeline/state.yaml`, `.pipeline/cycle.yaml`, or `.pipeline/rules.yaml` from the setup/config TUI. If adapter-affecting values change, tell the user to run `/hw:sync --light`.
4. update `updated`
5. keep the original `created` timestamp

## 参考文件

- `references/config-spec.md` - global/project config priority and field mapping
- `config.schema.yaml` - project schema plus global config schema definition
- `SKILL.md` - full system reference if broader context is needed
