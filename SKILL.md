---
name: hypo-workflow
version: 12.4.0
description: Run a serialized prompt execution pipeline from a local `.pipeline/` workspace. Use this skill whenever the user says "开始执行", "继续 pipeline", "执行下一步", "pipeline status", "跳过当前步骤", "skip step", "中止", "abort", or invokes `/hw:start`, `/hw:resume`, `/hw:status`, `/hw:skip`, `/hw:stop`, `/hw:report`, `/hw:chat`, `/hw:plan`, `/hw:plan:extend`, `/hw:plan:review`, `/hw:cycle`, `/hw:accept`, `/hw:reject`, `/hw:explore`, `/hw:sync`, `/hw:docs`, `/hw:patch`, `/hw:pr`, `/hw:pr create`, `/hw:explain`, `/hw:compact`, `/hw:knowledge`, `/hw:guide`, `/hw:showcase`, `/hw:rules`, `/hw:init`, `/hw:check`, `/hw:audit`, `/hw:release`, `/hw:debug`, `/hw:help`, `/hw:reset`, or `/hw:log`.
---

# Hypo-Workflow v12.4.0

> **Claude Code 用户**：请使用 `/hypo-workflow:<command>` 调用具体指令。输入 `/hypo-workflow:help` 查看全部 39 个用户指令。
>
> **Codex 用户**：本文件是完整的 Skill 入口，继续使用 `/hw:*` 指令。

## 指令列表

| Command | Description |
|---------|-------------|
| `/hw:start` | Initialize and start the pipeline from the first prompt |
| `/hw:resume` | Resume from the last interrupted state |
| `/hw:status` | Show current pipeline progress; use `--full` to bypass compact context |
| `/hw:skip` | Skip the current prompt and advance |
| `/hw:stop` | Gracefully stop and save state |
| `/hw:report` | Show compact report summaries, latest scores, or `--view <M>` full report |
| `/hw:chat` | Enter lightweight append conversation mode |
| `/hw:plan` | Enter Plan Mode through `plan/PLAN-SKILL.md` |
| `/hw:plan:discover` | Run the Discover phase of Plan Mode |
| `/hw:plan:decompose` | Run the Decompose phase of Plan Mode |
| `/hw:plan:generate` | Run the Generate phase of Plan Mode |
| `/hw:plan:confirm` | Run the Confirm phase of Plan Mode |
| `/hw:plan:extend` | Append milestones to an active Cycle |
| `/hw:plan:review` | Run Plan Review for the current or all milestones |
| `/hw:cycle` | Create, list, view, close, and archive delivery Cycles |
| `/hw:accept` | Accept pending Cycle work and complete the manual acceptance gate |
| `/hw:reject` | Reject pending Cycle work with structured feedback and reopen the Cycle |
| `/hw:explore` | Start an isolated exploration worktree and record exploration metadata |
| `/hw:sync` | Synchronize project adapters and lightweight derived context without executing pipeline milestones |
| `/hw:docs` | Generate, check, repair, and sync documentation |
| `/hw:patch` | Create, list, close, and `fix` persistent lightweight Patches |
| `/hw:patch fix` | Execute the lightweight six-step Patch repair lane |
| `/hw:pr` | Inspect, review, fix, merge, or close existing GitHub PRs / GitLab MRs through local archives |
| `/hw:pr create` | Guide GitHub PR / GitLab MR creation from existing worktree changes or a plan-first PR-sized task |
| `/hw:explain` | Answer code, config, command, or recent-change questions with cited local evidence |
| `/hw:compact` | Generate `.compact` context views for large runtime files |
| `/hw:knowledge` | Inspect Knowledge Ledger records, indexes, compact summaries, and secret references |
| `/hw:guide` | Start an interactive guide that recommends the next command path |
| `/hw:showcase` | Generate project intro docs, technical docs, slides, and an optional poster |
| `/hw:rules` | Manage rule severities, custom natural-language rules, lifecycle hooks, and rule packs |
| `/hw:init` | Initialize or rescan `.pipeline/` with architecture-aware project discovery |
| `/hw:check` | Run pipeline health checks for config, state, prompts, Notion, and architecture |
| `/hw:audit` | Run preventive code audits and emit graded findings with report output |
| `/hw:release` | Run the automated release flow with regression, versioning, changelog, and git steps |
| `/hw:debug` | Run symptom-driven debugging with hypotheses, validation, and optional auto-fix |
| `/hw:help` | Show command help, grouped quick reference, or per-command usage |
| `/hw:reset` | Reset pipeline runtime state with safe, full, or hard modes |
| `/hw:log` | Read the unified lifecycle log; use `--full` to bypass compact log context |
| `/hw:setup` | Create or update `~/.hypo-workflow/config.yaml` for environment, execution, subagent, plan, and dashboard defaults |

Internal runtime skill: `/hw:watchdog` is cron-only and should not be presented as a normal user command.

When the user types any `/hw:*` command, execute the corresponding action.
Unrecognized `/hw:*` commands should be reported as unknown.
Load [`references/commands-spec.md`](./references/commands-spec.md) when you need parsing rules, parameter semantics, or state-mutation details for slash commands.

Compatibility alias: `/hw:review` now prints `⚠️ \`/hw:review\` 已迁移到 \`/hw:plan:review\`。请使用新命令。`

## 输出语言规则

📌 输出语言规则：
读取 config.yaml → output.language
- zh-CN / zh：所有用户可见的输出使用中文（PROGRESS、报告、状态提示、错误消息、交互提问）
- en：使用英文
- auto：跟随用户对话语言
内部日志（log.yaml、state.yaml）始终英文。

Template loading maps `zh-CN` / `zh` to `templates/zh/`, maps `en` / `en-US` to `templates/en/`, and falls back to root `templates/` when the localized template is missing.

## Plan 工具纪律

The `plan-tool-required` rule applies to complex tasks and planning work:

- OpenCode: use native `todowrite` for visible plan state and `question` / Ask for required user decisions.
- Codex: use the available plan/update tool when present; otherwise keep an explicit checklist in the conversation.
- Claude Code: keep an explicit plan/checkpoint list in the conversation or configured planning surface.
- P1/P2/P3/P4 checkpoints must update the visible plan before moving to the next phase.

# Prompt Pipeline 执行骨架

Use this skill to execute one prompt at a time from a project-local `.pipeline/` directory.

V2.5 is a structural upgrade:

- keep the same pipeline behavior as V1
- move detailed specs into `references/`
- move reusable shell helpers into `scripts/`
- move stable templates into `assets/`
- expose Claude plugin packaging through `.claude-plugin/plugin.json`

The runtime guarantees in this version focus on:

- `pipeline.source: local | notion`
- `pipeline.output: local | notion`
- `execution.mode: self | subagent`
- recovery through `.pipeline/state.yaml`

If the configuration asks for a capability the current version does not support, stop and say so explicitly.

## 渐进式加载

Load the skill in three layers:

1. metadata from this file frontmatter
2. this `SKILL.md` body for core runtime behavior
3. bundled resources on demand:
   - `references/` for detailed policy
   - `assets/` for stable templates and examples
   - `scripts/` for deterministic helper tasks

Prefer not to inline long policy text into the main conversation when a bundled file already defines it.

## Plan 子 Skill

Plan Mode is implemented as a dedicated sub-skill:

- [`plan/PLAN-SKILL.md`](./plan/PLAN-SKILL.md) is the planning L2 entry point
- `plan/assets/` and `plan/templates/` are planning L3 resources

When the command namespace is:

- `/hw:plan`
- `/hw:plan:*`
- `/hw:plan:review`
- `/hw:plan:extend`

load `plan/PLAN-SKILL.md` before executing the command-specific behavior.

## 首要动作

1. Read `~/.hypo-workflow/config.yaml` if present.
2. Read `.pipeline/config.yaml`.
3. Validate the project config against [`config.schema.yaml`](./config.schema.yaml).
4. When shell access is available, prefer [`scripts/validate-config.sh`](./scripts/validate-config.sh) for a quick structural pre-check before deeper reasoning.
5. Resolve effective config as project > global > defaults. Never hardcode prompts, reports, state, or legacy step-log paths if config overrides them.
6. If `execution` is still missing after resolution, assume:
   - `mode=self`
   - `subagent_tool=auto`
   - `steps.preset=tdd`
7. If `platform` is still missing after resolution, assume `auto`.
8. Normalize step overrides:
   - accept top-level `step_overrides`
   - also accept legacy `execution.step_overrides`
   - if both exist, top-level wins
9. Read `.pipeline/state.yaml` if it exists. If not, initialize from [`assets/state-init.yaml`](./assets/state-init.yaml) and then fill in the prompt-specific fields.
10. Read `.pipeline/log.yaml` when lifecycle history, milestone status, fixes, audits, release records, or debug context matters.
11. Read `.pipeline/rules.yaml` and `.pipeline/rules/custom/` when rule severity, lifecycle gates, or always-on behavior constraints matter. Missing rules config is compatible and behaves as `extends: recommended`.

## 运行时资源

Use these bundled files when relevant:

- [`assets/state-init.yaml`](./assets/state-init.yaml)
- [`assets/report-template.md`](./assets/report-template.md)
- [`adapters/source/local.md`](./adapters/source/local.md)
- [`adapters/source/notion.md`](./adapters/source/notion.md)
- [`adapters/output/local.md`](./adapters/output/local.md)
- [`adapters/output/notion.md`](./adapters/output/notion.md)
- [`plan/PLAN-SKILL.md`](./plan/PLAN-SKILL.md)
- [`references/tdd-spec.md`](./references/tdd-spec.md)
- [`references/commands-spec.md`](./references/commands-spec.md)
- [`references/evaluation-spec.md`](./references/evaluation-spec.md)
- [`references/check-spec.md`](./references/check-spec.md)
- [`references/audit-spec.md`](./references/audit-spec.md)
- [`references/debug-spec.md`](./references/debug-spec.md)
- [`references/init-spec.md`](./references/init-spec.md)
- [`references/log-spec.md`](./references/log-spec.md)
- [`references/plan-review-spec.md`](./references/plan-review-spec.md)
- [`references/release-spec.md`](./references/release-spec.md)
- [`references/progress-spec.md`](./references/progress-spec.md)
- [`references/config-spec.md`](./references/config-spec.md)
- [`references/rules-spec.md`](./references/rules-spec.md)
- [`references/subagent-spec.md`](./references/subagent-spec.md)
- [`references/state-contract.md`](./references/state-contract.md)
- [`references/platform-claude.md`](./references/platform-claude.md)
- [`references/platform-codex.md`](./references/platform-codex.md)
- [`templates/subagent/review-tests.md`](./templates/subagent/review-tests.md)
- [`templates/subagent/review-code.md`](./templates/subagent/review-code.md)
- [`templates/subagent/full-delegation.md`](./templates/subagent/full-delegation.md)
- [`scripts/state-summary.sh`](./scripts/state-summary.sh)
- [`scripts/log-append.sh`](./scripts/log-append.sh)
- [`scripts/diff-stats.sh`](./scripts/diff-stats.sh)
- [`scripts/watchdog.sh`](./scripts/watchdog.sh)
- [`scripts/rules-summary.sh`](./scripts/rules-summary.sh)
- [`skills/compact/SKILL.md`](./skills/compact/SKILL.md)
- [`skills/knowledge/SKILL.md`](./skills/knowledge/SKILL.md)
- [`skills/guide/SKILL.md`](./skills/guide/SKILL.md)
- [`skills/showcase/SKILL.md`](./skills/showcase/SKILL.md)
- [`skills/rules/SKILL.md`](./skills/rules/SKILL.md)
- [`skills/pr/SKILL.md`](./skills/pr/SKILL.md)
- [`skills/explain/SKILL.md`](./skills/explain/SKILL.md)

## 支持的指令

Handle these commands directly:

- `/hw:start`, `开始执行`, `start pipeline`
  Start the pipeline. Resume unfinished state if present unless `--clean` is given. With `--from <prompt>`, initialize the current prompt directly to the matched prompt file or prompt stem.
- `/hw:resume`, `继续`, `continue`, `下一步`, `执行下一步`
  Resume from `current.prompt_file` and `current.step`. Treat a user-facing interrupted session as persisted unfinished work, usually `pipeline.status=running|stopped`.
- `/hw:status`, `pipeline status`, `状态`
  Read config plus state and print a concise status summary without mutating work. Use compact state/progress when available unless `--full` is present. When shell access is available, prefer [`scripts/state-summary.sh`](./scripts/state-summary.sh).
- `/hw:skip`
  Skip the current prompt, persist a prompt-level skip reason, append a prompt skip log event, and advance to the next prompt without incrementing `pipeline.prompts_completed`.
- `跳过当前步骤`, `skip step`
  Mark the current step as skipped, apply cascade logic when needed, persist state, append log events, and move to the next runnable step.
- `/hw:stop`
  Gracefully stop without aborting the pipeline. Persist state, optionally write an intermediate report, and set `pipeline.status=stopped`. With `--no-report`, skip the intermediate report.
- `/hw:report`
  Load compact report summaries when available. With `--view <M>`, load the specified Milestone report in full. Otherwise summarize the latest scores, warnings, and decision.
- `/hw:chat`
  Load [`skills/chat/SKILL.md`](./skills/chat/SKILL.md). Enter lightweight append conversation mode, reload `state.yaml + cycle.yaml + PROGRESS.md + recent report`, and write chat entries instead of Milestone reports.
- `/hw:help`
  Show grouped command help. Use `--quick` for a compact cheat sheet or `/hw:help <cmd>` for detailed usage, arguments, and examples sourced from this file.
- `/hw:reset`
  Reset runtime state only, or use `--full` / `--hard` for broader cleanup. Always list the affected files before deletion. `--hard` requires an explicit `YES` confirmation.
- `/hw:log`
  Read `.pipeline/log.compact.yaml` when available, otherwise `.pipeline/log.yaml`; show the latest 10 entries by default, and support `--all`, `--type <type>`, `--since <milestone>`, and `--full` filters. If the file is missing, say `暂无日志，执行 Pipeline 后自动生成`.
- `/hw:setup`
  Configure the plugin itself: create or update `~/.hypo-workflow/config.yaml`, detect environment, choose plan mode, and choose execution/subagent mode.
- `/hw:check`
  Run health checks for config, workspace completeness, state consistency, prompts, Notion connectivity, and architecture. Without `.pipeline/`, respond with `请先运行 /hw:init`.
- `/hw:init`
  Detect whether the repo is empty, already has source code, or already has a pipeline, then create or refresh `.pipeline/` plus the architecture baseline. Support `--rescan`, `--folder`, `--single`, `--import-history`, and `--import-history --interactive`.
- `/hw:release`
  Run the seven-step release flow. Support `--dry-run`, `--skip-tests`, and explicit `--patch` / `--minor` / `--major` version overrides.
- `/hw:audit`
  Audit the whole project or a narrower scope, grade findings as Critical / Warning / Info, write `.pipeline/audits/audit-NNN.md`, and log the result.
- `/hw:debug`
  Investigate a concrete symptom, generate ranked root-cause hypotheses, validate them, and optionally apply `--auto-fix` only after verification passes.
- `/hw:plan`, `/hw:plan:discover`, `/hw:plan:decompose`, `/hw:plan:generate`, `/hw:plan:confirm`, `/hw:plan:extend`, `/hw:plan:review`
  Load [`plan/PLAN-SKILL.md`](./plan/PLAN-SKILL.md) and route execution to the corresponding Plan Mode phase.
- `/hw:cycle`
  Load [`skills/cycle/SKILL.md`](./skills/cycle/SKILL.md). Manage explicit Cycles, archives, deferred items, and project summaries. Old projects without `.pipeline/cycle.yaml` remain compatible as implicit `C1`.
- `/hw:sync`
  Load [`skills/sync/SKILL.md`](./skills/sync/SKILL.md). Run light, standard, or deep project sync without executing pipeline milestones. SessionStart may only run light external-change detection.
- `/hw:patch`
  Load [`skills/patch/SKILL.md`](./skills/patch/SKILL.md). Manage persistent lightweight patches under `.pipeline/patches/`. Support `/hw:patch fix P001 [P...]` for the lightweight six-step fix lane.
- `/hw:pr`
  Load [`skills/pr/SKILL.md`](./skills/pr/SKILL.md). Handle existing GitHub PRs or GitLab MRs through a local `.pipeline/pr/` Change Request archive. Support `inspect`, `review`, `fix`, `merge`, and `close`; remote writes require explicit confirmation.
- `/hw:explain`
  Load [`skills/explain/SKILL.md`](./skills/explain/SKILL.md). Answer natural-language questions using cited local evidence. Stay read-only and report `unknown` or `needs_context` when evidence is missing.
- `/hw:compact`
  Load [`skills/compact/SKILL.md`](./skills/compact/SKILL.md). Generate `.compact` context views for PROGRESS, state, log, reports, and closed patches without mutating source files.
- `/hw:knowledge`
  Load [`skills/knowledge/SKILL.md`](./skills/knowledge/SKILL.md). Inspect `.pipeline/knowledge/` records, generated category indexes, compact summaries, and redacted secret references. Default to compact and index context; load raw records only for `view` or narrow `search`.
- `/hw:guide`
  Load [`skills/guide/SKILL.md`](./skills/guide/SKILL.md). Sense project state, ask what the user wants, recommend a short command flow, and execute the first command only after confirmation.
- `/hw:showcase`
  Load [`skills/showcase/SKILL.md`](./skills/showcase/SKILL.md). Generate project introduction documents, technical docs, slides, and an optional GPT Image poster under `.pipeline/showcase/`.
- `/hw:rules`
  Load [`skills/rules/SKILL.md`](./skills/rules/SKILL.md). Manage rule severities, built-in presets, custom Markdown rules, lifecycle hook binding, and shareable rule packs.
- `/hw:review`
  Emit the legacy migration warning and redirect the user to `/hw:plan:review`. Keep this alias only for compatibility.
- `中止`, `abort`
  Mark the current prompt and pipeline as aborted, persist state, append a prompt-level log event, and stop.

If a command starts with `/hw:` and is not listed above, return:

`Unknown command: /hw:xxx. Available: /hw:start, /hw:resume, /hw:status, /hw:skip, /hw:stop, /hw:report, /hw:chat, /hw:plan, /hw:plan:discover, /hw:plan:decompose, /hw:plan:generate, /hw:plan:confirm, /hw:plan:extend, /hw:plan:review, /hw:cycle, /hw:accept, /hw:reject, /hw:explore, /hw:sync, /hw:patch, /hw:pr, /hw:explain, /hw:compact, /hw:knowledge, /hw:guide, /hw:showcase, /hw:rules, /hw:init, /hw:check, /hw:audit, /hw:release, /hw:debug, /hw:help, /hw:reset, /hw:log, /hw:setup`

Slash commands are exact and take precedence over fuzzy natural-language matching. Detailed parsing and option semantics live in [`references/commands-spec.md`](./references/commands-spec.md).

If the user command is ambiguous, prefer a safe resume and say which prompt and step you are about to run.

## 配置模型

Configuration has two layers:

- global config: `~/.hypo-workflow/config.yaml`, created by `/hypo-workflow:setup`
- project config: `.pipeline/config.yaml`, created by `/hypo-workflow:init` or `/hypo-workflow:plan-generate`

Resolve effective values in this order:

1. project config
2. global config
3. built-in defaults

Key fallbacks:

- `execution.mode` falls back to global `execution.default_mode`, then `self`
- `execution.subagent_tool` falls back to global `subagent.provider`, then `auto`
- `plan.mode` falls back to global `plan.default_mode`, then `interactive`
- `plan.interaction_depth` falls back to global `plan.interaction_depth`, then `medium`
- `dashboard.enabled` falls back to global `dashboard.enabled`, then `false`
- `dashboard.port` falls back to global `dashboard.port`, then `7700`
- `output.language` falls back to global `output.language`, then `en`
- `output.timezone` falls back to global `output.timezone`, then `UTC`
- `watchdog.enabled` falls back to global `watchdog.enabled`, then `false`
- `history_import.split_method` falls back to global `history_import.split_method`, then `auto`
- `compact.auto` falls back to global `compact.auto`, then `true`
- `showcase.language` falls back to global `showcase.language`, then `auto`
- `rules.extends` falls back to `recommended`

Read [`references/config-spec.md`](./references/config-spec.md) when resolving config precedence or field mapping.

Expected top-level config groups:

- `pipeline`
- `execution`
- `evaluation`
- `plan` optional
- `output` optional
- `watchdog` optional
- `history_import` optional
- `compact` optional
- `knowledge` optional
- `showcase` optional
- `rules` optional
- `platform` optional
- `step_overrides` optional
- `hooks` optional

Key defaults:

- `pipeline.prompts_dir=.pipeline/prompts`
- `pipeline.reports_dir=.pipeline/reports`
- `pipeline.state_file=.pipeline/state.yaml`
- `pipeline.log_file=.pipeline/log.md`
- lifecycle log defaults to `.pipeline/log.yaml`
- `plan.mode=interactive`
- `plan.interaction_depth=medium`
- `plan.interactive.min_rounds=3`
- `plan.interactive.require_explicit_confirm=true`
- `output.language=en`
- `output.timezone=UTC`
- `watchdog.enabled=false`
- `watchdog.interval=300`
- `watchdog.heartbeat_timeout=300`
- `watchdog.max_retries=5`
- `watchdog.max_consecutive_milestones=10`
- `watchdog.notify=true`
- `history_import.split_method=auto`
- `history_import.time_gap_threshold=24h`
- `history_import.max_milestones=20`
- `history_import.keyword_patterns=['feat\\(M(\\d+)\\):','M(\\d+)-','milestone-(\\d+)']`
- `compact.auto=true`
- `compact.progress_recent=15`
- `compact.state_history_full=1`
- `compact.log_recent=20`
- `compact.reports_summary_lines=3`
- `knowledge.enabled=true`
- `knowledge.loading.session_start=true`
- `knowledge.loading.compact=true`
- `knowledge.loading.records=false`
- `knowledge.redaction.secret_keys=['api_key','token','secret','password','authorization','access_token','refresh_token','client_secret']`
- `showcase.language=auto`
- `showcase.poster.api_key_env=OPENAI_API_KEY`
- `showcase.poster.size=1024x1536`
- `showcase.poster.quality=high`
- `showcase.poster.style=auto`
- `rules.extends=recommended`
- `dashboard.enabled=false`
- `dashboard.port=7700`
- `dashboard.auto_start=false`
- `dashboard.shutdown_delay=30`
- `execution.mode=self`
- `execution.subagent_tool=auto`
- `execution.steps.preset=tdd`
- `platform=auto`

The main skill only needs the normalized values. It should not care whether the user wrote overrides in the legacy or current location.

`pipeline.log_file` remains the legacy step-trace target for V0-V5 compatibility. V6 also uses `.pipeline/log.yaml` as the lifecycle ledger for milestones, fixes, audits, debug sessions, releases, and plan reviews.

## Prompt 发现

For `source: local`:

1. Read the configured prompts directory.
2. Collect `*.md` files.
3. Sort them by filename ascending.
4. Treat each file as one pipeline prompt.

For `source: notion`:

1. Read the `notion` config block.
2. Resolve the token from `NOTION_TOKEN` or `notion.token_file`.
3. Use [`adapters/source/notion.md`](./adapters/source/notion.md) as the source contract.
4. If helper execution is needed, prefer `python3 scripts/notion_api.py fetch-prompts ...`.
5. Convert Notion prompts into the same internal prompt structure used for local files.

Prompt files should usually contain:

- `需求`
- `预期测试`
- `预期产出`

If headings differ slightly but meaning is clear, infer by meaning. If critical content is missing, block the prompt instead of guessing.

## 架构文件

`/hw:init` establishes the architecture baseline. Read it before `/hw:plan`, `/hw:plan:review`, `/hw:audit`, and `/hw:debug`; update it through `/hw:init`, `/hw:init --rescan`, and `/hw:plan:review`. Layout rules stay in [`references/init-spec.md`](./references/init-spec.md).

## Plan 模式

Planning now supports two modes through `plan.mode`:

- `interactive`
  - default mode
  - Discover asks targeted questions in rounds
  - Confirm waits for explicit user approval
  - `interaction_depth` controls the minimum P1 question rounds: low=2, medium=3, high=5
  - P1 may enter P2 only after the minimum rounds and an explicit user signal such as「够了」「开始吧」「可以了」
  - P2 must show the milestone split and wait for confirmation before P3
  - hooks should allow turn end during planning checkpoints
- `auto`
  - Claude completes P1-P4 without pausing for user feedback unless blocked by missing critical information
  - Confirm becomes a summary checkpoint instead of a hard gate
  - hooks should block premature turn end so planning continues automatically

`/hw:plan --context audit,patches,deferred,debug` injects existing evidence into P1 Discover. Context sharpens the interview; it does not skip Discover.

## Dashboard

The dashboard is an optional WebUI for `.pipeline/` state, config, progress, and reports.

- treat it as a background service that must not block normal agent execution
- keep its configuration under the `dashboard` config block and plugin-level setup defaults
- resolve the preferred port as project `dashboard.port` > global `dashboard.port` > `7700`

## Cycle 与 Patch

V8 adds two persistent lifecycle surfaces:

- Cycles: explicit delivery containers under `.pipeline/cycle.yaml`, archived to `.pipeline/archives/`
- Patches: lightweight side-track items under `.pipeline/patches/`

Cycle rules:

- old projects without `.pipeline/cycle.yaml` keep their previous behavior and are treated as implicit `C1` only for display
- `/hw:init` must not create `.pipeline/cycle.yaml`
- `/hw:cycle new` creates the first explicit Cycle, resets Cycle-local state/prompts/reports, and preserves architecture, config, lifecycle log, archives, and patches
- `/hw:cycle close` archives Cycle-local artifacts, writes deferred items, and updates project-root `PROJECT-SUMMARY.md`

Patch rules:

- Patch numbering is global, `P001`, `P002`, and so on
- Patches are never archived with a Cycle
- `/hw:plan --context patches` can inject open Patches into P1 Discover

## 规则

V8.4 adds Rules as an independent behavior dimension.

Rule sources:

- distributed built-ins: `rules/builtin/*.yaml`
- distributed presets: `rules/presets/recommended.yaml`, `strict.yaml`, `minimal.yaml`
- project config: `.pipeline/rules.yaml`
- project custom rules: `.pipeline/rules/custom/*.md`
- imported packs: `.pipeline/rules/packs/<pack-name>/`

Severity model:

- `off`: disabled
- `warn`: emit warning and continue
- `error`: hard gate; stop execution until fixed, disabled, or downgraded

Lifecycle hook points:

- `on-session-start`
- `pre-milestone`
- `post-milestone`
- `pre-step`
- `post-step`
- `pre-commit`
- `on-fail`
- `on-evaluate`
- `always`

Loading priority:

1. built-in default severity
2. `extends` preset
3. `.pipeline/rules/custom/`
4. `.pipeline/rules.yaml rules:` overrides
5. command-line `--rule name=severity` overrides when supported

Missing `.pipeline/rules.yaml` is compatible with old projects and behaves like `extends: recommended`.

SessionStart loads active `always` rules through `scripts/rules-summary.sh` and injects them into context. Other hook points are enforced by the command-specific Skill behavior and should use `references/rules-spec.md` when exact rule semantics matter.

### ⚠️ Patch Fix 执行约束

❌ 绝对禁止：
1. 启动 brainstorming 或 Plan Discover
2. 走完整 TDD 流水线（write_tests → run_red → ...）
3. 写入 state.yaml（Patch 不是 Milestone）
4. 生成 report.md
5. 单个 Patch 改动超过 5 个文件时不提醒用户
6. 顺手重构不相关代码

✅ 必须做到：
1. 读取 Patch 描述后直接定位和修复
2. 跑现有测试验证不破坏其他功能
3. 单次 commit，message 格式：fix(P<NNN>): <描述>
4. 自动关闭 Patch 并更新文件
5. 超出范围时停下来建议升级为 Milestone

## Step Presets

Resolve the active step sequence from config:

- `tdd`
  `write_tests -> review_tests -> run_tests_red -> implement -> run_tests_green -> review_code`
- `implement-only`
  `implement -> run_tests -> review_code`
- `custom`
  Use `execution.steps.sequence` exactly as configured.

Apply normalized step overrides after preset expansion:

- skip steps whose override sets `enabled: false`
- honor `strict`
- honor `executor` or `reviewer`
- honor `subagent_tool` or `subagent`

> 📎 详细步骤规范见 `references/tdd-spec.md`

## Hook 集成（可选）

Resolve platform in this order:

1. config `platform`
2. global `agent.platform`
3. runtime auto-detection

Platform guidance:

- `claude`
  Prefer Claude-specific delegation and hook metadata.
- `codex`
  Prefer Codex-compatible delegation and treat hook support as minimal.
  Codex should strongly prefer concrete Subagent delegation for substantial work when available.
- `auto`
  Infer from the environment.

If `platform=auto`, detect the environment using repository markers:

- `.claude/` directory or `CLAUDE.md` -> Claude Code
- `.codex/` directory or `AGENTS.md` -> Codex

If `config.yaml` sets `hooks.enabled=true`, treat Hook integration as active when the matching hook files are installed.

### Claude Code（完整 Hook 支持）

If the platform resolves to Claude Code and hooks are installed:

1. **Stop Hook 已激活**
   - the hook runs before the agent stops
   - it checks `state.yaml`, `log.md`, current step state, and report generation
   - it may return `decision:block`
   - the returned `reason` becomes the next concrete instruction for the agent
   - this acts as a passive completion safety net
2. **SessionStart Hook 已激活**
   - the hook injects pipeline state through `additionalContext`
   - startup, resume, and compact all get fresh pipeline status
   - compact reinjection reduces the risk of losing run state after context compression
3. **InstructionsLoaded Hook**（可选）
   - purely observational
   - useful for logging when `SKILL.md` or related instructions reload

When Claude hooks are active, the main skill can simplify some self-check messaging, but it must still preserve the full state machine on its own.

### Codex（降级模式）

If the platform resolves to Codex:

1. there is no Stop Hook
2. there is no SessionStart context injection
3. recovery still depends on the agent reading `state.yaml` directly
4. `notify` is optional and only provides turn-complete observability
5. `AGENTS.md` should carry the discipline that hooks cannot enforce

This means Codex keeps the V1 behavior: the skill itself is responsible for stop safety, recovery, and report discipline.

Codex Subagents are Codex/GPT runtime workers. Hypo-Workflow must not require DeepSeek, Mimo, Claude, or other external model routing for Codex delegation. For substantial or non-trivial work, Codex should strongly prefer concrete Subagent delegation when available:

- use a test/review Subagent for test design, failure evidence, final diff review, or assumption challenge
- use an implementation Subagent for scoped edits
- use docs-specific assistance for README, guide, or adapter documentation work
- keep the main agent responsible for integration, state/log/report updates, and final judgment
- if no Subagent is used for substantial work, record a concise reason in the report, Patch file, or lifecycle log

Trivial one-file or pure inspection tasks may stay local without escalation.

### Hook 日志

Hook events should be written through [`scripts/log-append.sh`](./scripts/log-append.sh) when possible.

Preferred format:

```markdown
## {timestamp} - hook:{hook_name}
- result: pass | block | warning
- message: ...
```

Hook sensing rules:

- If a `hooks/` directory exists in the project root, note that hook data may be available.
- If config contains `hooks.enabled=true`, prefer the installed hooks but do not rely on them for correctness in non-Claude environments.
- Hook facts may enrich notes, logging, or subagent context.
- Hook facts must never replace the core state machine.

Use platform-specific details only after reading the matching reference:

- Claude -> [`references/platform-claude.md`](./references/platform-claude.md)
- Codex -> [`references/platform-codex.md`](./references/platform-codex.md)

> 📎 Claude 细节见 `references/platform-claude.md`
>
> 📎 Codex 细节见 `references/platform-codex.md`

## State Core

Persist state to the configured state file after every meaningful transition.

Core shape:

```yaml
pipeline:
  name: Hypo-TODO
  status: idle | running | blocked | aborted | stopped | completed
  prompts_total: 0
  prompts_completed: 0
  started: null
  finished: null
last_heartbeat: null
current:
  phase: idle | plan_discover | plan_decompose | plan_generate | plan_confirm | executing | lifecycle_init | lifecycle_check | lifecycle_audit | lifecycle_release | lifecycle_debug | lifecycle_cycle | lifecycle_patch | completed
  prompt_index: 0
  prompt_file: 00-scaffold.md
  prompt_name: scaffold
  step: write_tests
  step_index: 0
milestones:
  - name: 00-scaffold
    status: done | in_progress | deferred | failed | skipped
    deferred_reason: null
prompt_state:
  started_at: null
  updated_at: null
  finished_at: null
  result: running | pass | blocked | aborted | stopped | skipped
  diff_score: null
  code_quality: null
  steps:
    - name: write_tests
      status: pending | running | done | skipped | blocked
      executor: self | subagent
      subagent_tool: codex | claude | auto | null
      subagent_result: null
      reason: null
      started_at: null
      finished_at: null
      duration_seconds: null
      notes: ""
history:
  completed_prompts: []
```

Core write rules:

- `current.step` must always point at the next runnable or currently running step.
- `current.step_index` must match the position inside `prompt_state.steps`.
- skipped steps must record both `status=skipped` and a machine-readable `reason`.
- delegated steps must record the actual `executor`, actual `subagent_tool`, and parsed `subagent_result` when available.
- `last_heartbeat` must be updated on every persisted execution transition during `/hw:start` and `/hw:resume`.

评估完成后写入 `state.yaml` 的 `evaluation` 块：

```yaml
evaluation:
  diff_score: 1-5
  code_quality: 1-5
  test_coverage: 1-5 | null
  complexity: 1-5
  architecture_drift: 1-5
  overall: 1-5
  adaptive_threshold: 2-5
  warnings:
    - "..."
```
该块应存在于当前 prompt 的运行态，并在 prompt 完成后复制到 `history[].evaluation`。

> 📎 完整字段、时机和版本演化见 `references/state-contract.md`

## Auto Resume Watchdog

The watchdog is disabled by default. When `watchdog.enabled=true`, `/hw:start` registers `scripts/watchdog.sh` through cron and `/hw:resume` honors the same lock and heartbeat contract.

Runtime contract:

- update `last_heartbeat` with an ISO-8601 timestamp every time execution state is persisted
- create `.pipeline/.lock` before active execution
- remove `.pipeline/.lock` when the run stops, blocks, aborts, or completes
- watchdog skips when lock exists
- watchdog triggers `/hw:resume` only when `current.phase=executing` and heartbeat age exceeds `watchdog.heartbeat_timeout`
- pipeline completion, `/hw:stop`, and abort unregister the watchdog cron entry

Detailed detection and backoff rules live in [`skills/watchdog/SKILL.md`](./skills/watchdog/SKILL.md) and [`scripts/watchdog.sh`](./scripts/watchdog.sh).

## Unified Logging

V6 keeps two log layers: `.pipeline/log.yaml` for lifecycle history and `pipeline.log_file` for the backward-compatible step trace, usually `.pipeline/log.md`. Read [`references/log-spec.md`](./references/log-spec.md) before mutating `log.yaml`, write entries for milestones and fix/audit/debug/plan-review/release reports, and create `.pipeline/fixes/`, `.pipeline/audits/`, or `.pipeline/debug/` only when those artifacts exist.

## Logging Core

Append Markdown to the configured legacy step log.

Record only step start, step finish, prompt start, prompt finish, prompt blocked, prompt skipped, and prompt stopped.

Do not record pipeline-wide lifecycle events such as "pipeline initialized".

Preferred shape:

```markdown
## 2026-04-22T16:01:00+08:00 - 00-scaffold - write_tests - finish
- status: done
- executor: self
- notes: wrote 8 tests across 2 files
```

When shell access is available, prefer [`scripts/log-append.sh`](./scripts/log-append.sh) for simple standardized writes.

Lifecycle events such as milestone completion, release, audit, debug, and plan review should be summarized in `.pipeline/log.yaml` instead of cluttering the step trace.

## Progress Summary

Maintain `.pipeline/PROGRESS.md` as the human-readable execution summary.

- update it after every milestone start, step completion, milestone completion, and deferred decision
- keep it consistent with `state.yaml` and `log.yaml`
- use it to summarize current status, milestone table, timeline table, patch table, and deferred items for humans
- keep it as a board-style summary, not a loose append-only event log
- write all prose in `output.language`
- format times in `output.timezone` as same-day `HH:MM` or cross-day `DD日 HH:MM` for `zh-CN`

Detailed format rules live in [`references/progress-spec.md`](./references/progress-spec.md).

## Context Compact

V8.2 adds derived compact views for large runtime files. Generate them with `/hw:compact` or automatically when `compact.auto=true`.

Compact files:

- `.pipeline/PROGRESS.compact.md`
- `.pipeline/state.compact.yaml`
- `.pipeline/log.compact.yaml`
- `.pipeline/reports.compact.md`
- `.pipeline/patches.compact.md`

Rules:

- compact files are read-only context views and must never replace source files for mutation
- SessionStart loads compact files first, then falls back to full source files when compact views are absent
- current prompt and current report are always loaded in full
- open Patch files are loaded in full; closed Patch details are represented through `patches.compact.md`
- `/hw:status --full`, `/hw:log --full`, and `/hw:report --view <M>` bypass compact views for the requested data

## Main State Machine

Use this loop for `/hw:start`, `/hw:resume`, `start pipeline`, `continue`, `下一步`, and auto-continue decisions:

1. Read config and normalize runtime values.
2. Discover prompt files.
3. Initialize state if missing.
4. If pipeline is already `completed`, report completion and stop unless the user explicitly asks to restart or uses `/hw:start --clean`.
5. If pipeline is `aborted` or `stopped`, resume only on explicit continue/start/resume.
6. Load the current prompt.
7. Find the next step whose status is not `done` or `skipped`.
8. If this is a fresh prompt entry, append one prompt-level `prompt_start` log event.
9. Create `.pipeline/.lock`, mark the selected step as `running`, record `started_at`, set `current.phase=executing`, update `last_heartbeat`, record the resolved executor, and append a step-start log event.
10. Execute the step according to the preset, overrides, skip cascade state, and delegation rules.
11. The main agent coordinates the step, uses serial Subagent tasks for concrete work when appropriate, and validates the result before continuing. In Codex, substantial work should prefer Codex Subagents when available.
12. Record notes, timing, actual executor, result, `last_heartbeat`, and `PROGRESS.md` updates.
13. If the step blocks, evaluate whether to `retry`, mark the milestone `deferred`, or `stop`.
14. Persist state and append a step-finish or block event.
15. When all enabled steps finish, generate the prompt report, compute evaluation, write final prompt fields, append a prompt-finish log event, and persist state.
16. If the prompt passed and architecture tracking is active, run Plan Review before advancing.
17. After a milestone-level result is final, append one lifecycle entry to `.pipeline/log.yaml` and refresh `.pipeline/PROGRESS.md`.
18. After Plan Review, add the prompt to history and advance state to the next prompt immediately.
19. If `auto_continue=false`, stop after the state advance and wait for the user to say `继续`.
20. If there is no next prompt, set `current.phase=completed`, mark the pipeline `completed`, persist state, remove `.pipeline/.lock`, unregister the watchdog cron entry, and stop.

## Skip Cascade

General skip rules:

- keep the current prompt recoverable
- mark every skipped step explicitly
- record a reason
- append skip events to the log

Special cascade from `write_tests` in `tdd`:

1. mark `write_tests` as `skipped` with `reason=user_skipped`
2. mark `review_tests` as `skipped` with `reason=dependency_skipped`
3. mark `run_tests_red` as `skipped` with `reason=dependency_skipped`
4. continue from `implement`
5. keep `run_tests_green` runnable
6. downgrade `run_tests_green` to inline validation
7. set `run_tests_green.notes` to `fallback=inline_validation, reason=tests_skipped`
8. log the downgrade before `run_tests_green` starts

Inline validation means:

- check imports
- check syntax
- record `inline_validation` in state and log

`implement-only` and custom flows may also use inline validation when no tests exist for the current prompt.

## Subagent Entry Point

Delegation is allowed only when:

- `execution.mode=subagent`
- the normalized step override resolves `executor=subagent` or `reviewer=subagent`

When those conditions are met, Codex should strongly prefer concrete Subagent delegation for substantial work. Testing/review and implementation are separate responsibilities: an implementation Subagent must not be the sole validator of its own changes, and a test/review Subagent should inspect tests, failure evidence, final diffs, or assumptions when practical. Documentation and README work should prefer docs-specific assistance when available. If substantial work stays local, record a non-delegation rationale.

Delegation flow:

1. choose the correct subagent template
2. assemble prompt context from the active prompt, changed files, and relevant tests
3. resolve the actual tool from step override, project execution default, global subagent provider, and platform
4. try the delegated execution
5. parse JSON output
6. merge the structured result back into state

Tool selection:

- `auto`
  choose the best supported backend for the current platform; in Codex, prefer `codex exec` and do not choose DeepSeek, Mimo, Claude, or other external model routing as a Codex Subagent backend
- `claude`
  prefer Claude subagent definitions or `claude -p`; this is a Claude/cross-tool path, not Codex Subagent external model selection
- `codex`
  prefer `codex exec`

Fallback rules:

1. if the tool is unavailable, execution fails, or JSON cannot be parsed, rerun the same step locally
2. set `subagent_fallback=true` in the log note
3. set a concise fallback `reason`
4. mark the actual executor as `self`
5. never block the pipeline because delegation failed by itself

The main skill should only own the routing and fallback. Template content and detailed note formats belong in the reference layer.

> 📎 Subagent 细节见 `references/subagent-spec.md`

## Execute Architecture

Execution is now modeled as main-agent orchestration plus serial Subagent work:

1. The main agent reads the active prompt and decomposes the next task.
2. The main agent delegates concrete write/test/run/report steps serially when useful.
3. In Codex, substantial work should attempt Codex Subagents when available, while trivial one-file work may stay local.
4. The main agent validates Subagent output, updates state, logs, and progress summaries.
5. The main agent decides whether to continue, retry, defer, or stop.
6. Hooks and watchdogs should keep execution moving until all milestones finish or the main agent explicitly chooses the `stop` outcome.

## 评估决策（V4 多维度）

`review_code` 完成后，对本轮 Prompt 执行多维度评分。

> 📎 各维度评分标准、权重公式、架构漂移检测细则见 `references/evaluation-spec.md`

评分维度：

- `diff_score`
- `code_quality`
- `test_coverage`（仅 TDD）
- `complexity`
- `architecture_drift`
- `overall`

阻塞决策：

- `STOP`（任一触发）:
  - `diff_score > threshold`
  - `architecture_drift >= 4`
  - `overall > threshold + 1`
- `WARN`（记录不阻塞）:
  - `complexity >= 4`
  - `test_coverage <= 2`
- `threshold = adaptive_threshold` 或 `max_diff_score`

自适应阈值在 `evaluation.adaptive_threshold=true` 时启用：

- 连续 3 个 `diff_score <= 2` -> 收紧
- 出现 `STOP` -> 放宽
- 其他情况 -> 保持
> 📎 自适应阈值详细规则见 `references/evaluation-spec.md`

向后兼容要求：

- 当 `adaptive_threshold=false` 时，保持 V3 的 `diff_score > max_diff_score` 主判定行为
- 多维评分仍可写入 state 和报告，但不应破坏旧配置的默认流转语义

报告规则：

- 使用 [`assets/report-template.md`](./assets/report-template.md)
- 每个 prompt 写一份报告
- 当需要目录变化和 diff 统计时，优先复用 [`scripts/diff-stats.sh`](./scripts/diff-stats.sh)

## Plan Review

When the pipeline was generated through Plan Mode and `.pipeline/architecture.md` exists, run Plan Review after prompt evaluation and before prompt advance, compare the completed milestone against the current baseline, record `ADDED`, `CHANGED`, `REASON`, and `IMPACT`, and inspect whether downstream prompts should be revised. Detailed behavior belongs in [`references/plan-review-spec.md`](./references/plan-review-spec.md).

## 失败处理

When a milestone or step fails, Claude must explicitly choose one path:

- `retry`
  - use a revised strategy and optionally ask a subagent to analyze the failure first
- `deferred`
  - mark the milestone as deferred when downstream work can continue safely
  - store `deferred_reason` and surface it in `PROGRESS.md`
- `stop`
  - stop and wait for user intervention
  - leave a clear blocking reason in state and logs

## Restart And Abort

If the user explicitly asks to restart:

1. keep old reports and logs unless deletion is explicitly requested
2. reinitialize state from `assets/state-init.yaml`
3. set the first prompt and its first runnable step
4. make it clear that the run is a restart, not a resume

If the user asks to stop gracefully or invokes `/hw:stop`:

1. persist the current prompt and pipeline state
2. set `pipeline.status=stopped`
3. if `--no-report` is not present, write an intermediate report for the current prompt
4. append one prompt-level stop event
5. stop without discarding context or marking the prompt aborted

If the user asks to abort:

1. mark prompt and pipeline as aborted
2. persist state
3. append one prompt-level log event
4. stop without discarding context

## 失败处理

Stop and explain the reason when:

- config is invalid
- prompt files are missing
- preset expansion fails
- custom sequence is missing
- a detailed reference file needed for the current branch is missing
- evaluation cannot be computed from available evidence
- the prompt is blocked by `diff_score`

Prefer explicit blocking over silent guessing.

## Platform Packaging

This skill is packaged for Claude plugin installation through:

- [`.claude-plugin/plugin.json`](./.claude-plugin/plugin.json)

That manifest should only point to this `SKILL.md`. Hooks, commands, and agent definitions can grow in later versions without changing the core state machine here.

## Output Adapters

For `output: local`:

- persist reports to the configured reports directory

For `output: notion`:

1. read the `notion` config block
2. resolve the token from `NOTION_TOKEN` or `notion.token_file`
3. use [`adapters/output/notion.md`](./adapters/output/notion.md) as the write contract
4. prefer `python3 scripts/notion_api.py upsert-report ...` when helper execution is needed
5. if the Notion write fails, keep local report generation intact and report the adapter error explicitly

## Deprecated Layout

The old `templates/` directory is retained for compatibility but is now considered deprecated.

- reports now live in `assets/report-template.md`
- TDD policy now lives in `references/tdd-spec.md`
- evaluation policy now lives in `references/evaluation-spec.md`
- subagent prompt templates remain in `templates/subagent/`

Read [`templates/DEPRECATED.md`](./templates/DEPRECATED.md) before adding new material to the old template tree.

## 边界

V4 extends evaluation behavior but still does not add new remote execution capabilities beyond the existing runtime model.

Do not claim support for:

- remote prompt execution beyond the existing supported adapters
- non-local reports in this packaged layout unless the runtime explicitly supports them
- concurrent fan-out delegation for one step
- replacing the state machine with hook-only orchestration
- deleting the deprecated template tree automatically
