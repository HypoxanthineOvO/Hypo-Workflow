# Commands Spec

## 中文主体说明

本规格定义 Hypo-Workflow 的命令命名空间、解析规则和各命令的行为边界。用户可见的 Hypo 命令必须使用 `/hw:` 前缀；Claude Code 原生 `/resume` 属于 Claude Code，不是 Hypo `/hw:resume` 的别名。本文保留 command、flag、config key、file path 等英文术语，便于 Agent 和测试精确引用。

Use this reference when the user's message starts with `/hw:` or when exact command parsing matters more than fuzzy natural-language intent matching.

## Namespace

- all explicit Hypo-Workflow commands use the `/hw:` prefix
- Claude Code exposes canonical commands through plugin-root `commands/` files under a plugin whose namespace is `hw`; those slash-command files must load the existing Hypo-Workflow skill files instead of duplicating a second implementation
- Claude Code `/hw:*` entries are plugin slash-command mappings backed by the existing `skills/*/SKILL.md` authority
- Claude Code native `/resume` remains owned by Claude Code; Hypo-Workflow must never register or document bare `/resume` as an alias for `/hw:resume`
- V12 canonical namespace contains user-facing commands across Setup, Pipeline, Plan, Lifecycle, Docs, Review, Explain, and Utility groups, plus an internal cron-only watchdog skill
- slash commands are exact and namespace-scoped
- slash commands take precedence over fuzzy natural-language matching
- natural-language commands remain valid for backward compatibility

## Parsing Rules

1. treat the first whitespace-delimited token as the command name
2. recognized commands are:
   - `/hw:start`
   - `/hw:resume`
   - `/hw:status`
   - `/hw:skip`
   - `/hw:stop`
   - `/hw:report`
   - `/hw:help`
   - `/hw:reset`
   - `/hw:log`
   - `/hw:setup`
   - `/hw:knowledge`
   - `/hw:compact`
   - `/hw:guide`
- `/hw:showcase`
- `/hw:rules`
- `/hw:check`
- `/hw:init`
- `/hw:release`
- `/hw:audit`
- `/hw:debug`
- `/hw:chat`
- `/hw:plan`
   - `/hw:plan:deep`
   - `/hw:plan:discover`
   - `/hw:plan:decompose`
   - `/hw:plan:generate`
   - `/hw:plan:confirm`
   - `/hw:plan:extend`
   - `/hw:plan:review`
   - `/hw:cycle`
   - `/hw:accept`
   - `/hw:reject`
   - `/hw:explore`
   - `/hw:sync`
   - `/hw:docs`
   - `/hw:patch`
   - `/hw:pr`
   - `/hw:explain`
3. parse remaining tokens as command arguments
4. flags are order-independent
5. if a command is unknown, return exactly:
   `Unknown command: /hw:xxx. Available: /hw:start, /hw:resume, /hw:status, /hw:skip, /hw:stop, /hw:report, /hw:plan, /hw:plan:deep, /hw:plan:discover, /hw:plan:decompose, /hw:plan:generate, /hw:plan:confirm, /hw:plan:extend, /hw:plan:review, /hw:cycle, /hw:accept, /hw:reject, /hw:explore, /hw:sync, /hw:docs, /hw:patch, /hw:pr, /hw:explain, /hw:compact, /hw:knowledge, /hw:guide, /hw:showcase, /hw:rules, /hw:init, /hw:check, /hw:audit, /hw:release, /hw:debug, /hw:help, /hw:reset, /hw:log, /hw:setup`
6. if a known command receives an unsupported flag, stop and report the unsupported flag explicitly instead of guessing
7. if a prompt selector is ambiguous, list the candidates and stop
8. plan and review commands load `plan/PLAN-SKILL.md` before execution
9. if a command starts with `/hw:plan:` and is unknown, return exactly:
   `Unknown command: /hw:plan:xxx. Available: /hw:plan, /hw:plan:deep, /hw:plan:discover, /hw:plan:decompose, /hw:plan:generate, /hw:plan:confirm, /hw:plan:extend, /hw:plan:review`
10. append-mode conflicts must never silently renumber executed prompts
11. `/hw:review` is a compatibility alias that prints a migration warning instead of running the review directly

## Command Semantics

Lifecycle-mutating commands must use the workflow commit helper for protected workflow state. This applies to `/hw:accept`, `/hw:reject`, `/hw:start`, `/hw:resume`, `/hw:plan:generate`, prompt skip/stop transitions, and any command that writes `.pipeline/state.yaml`, `.pipeline/cycle.yaml`, or `.pipeline/rules.yaml`.

User-visible command responses must not collapse into "done" plus a file path. Use a human response structure:

- conclusion: what is true now
- explanation: why, with the most relevant evidence or changed content
- next steps: what the user should do next

Milestone, Cycle, report, status, explain, research, and link-analysis completions must additionally explain what changed, how it was validated, how the user can manually exercise it, and known risks or limits.

The command should prepare authoritative writes first, prevalidate invariants, commit authority with temp-file atomic replacement, then refresh derived views such as `.pipeline/log.yaml`, `.pipeline/PROGRESS.md`, metrics mirrors, compact views, `PROJECT-SUMMARY.md`, and OpenCode status inputs. If a derived refresh fails after authority commits, do not roll back authority; report the warning, write `.pipeline/derived-refresh.yaml`, and recommend `/hw:sync --light` or rerunning the lifecycle command after repair.

### `/hw:start`

Supported flags:

- `--from <prompt>`
- `--clean`

Behavior:

- read `.pipeline/config.yaml`
- read `~/.hypo-workflow/config.yaml` if present
- resolve effective config as project > global > defaults before selecting execution mode or subagent provider
- if `execution.worker_separation.mode` is missing, first `/hw:plan` or interactive `/hw:init` should ask for `off|recommended|strict` before treating it as settled project policy
- validate config before mutating state
- read `.pipeline/continuation.yaml` when present; active continuation records `next_action`, `reason`, `updated_at`, `safe_resume_command`, and focused `context`
- if `--clean` is present, treat the action as a restart and reinitialize from `assets/state-init.yaml`
- if unfinished state exists and `--clean` is absent, resume that state instead of silently discarding it
- if `--from <prompt>` is present, resolve against prompt filename or prompt stem prefix
- when `--from` is used, initialize `current.prompt_file` directly to the matched prompt
- do not fabricate history entries for prompts that were never executed
- create `.pipeline/.lock` during active execution
- update top-level `last_heartbeat` whenever state is persisted
- if `watchdog.enabled=true`, register cron for `scripts/watchdog.sh`
- create `.pipeline/.lock` as a structured execution lease with heartbeat and expiry fields
- after the full run succeeds and validation/report/state/log/progress writes have passed, run end-of-run compact when `compact.auto=true` and `compact.end_of_run=true`
- end-of-run compact uses `compact.refresh_policy`, defaulting to `dirty_only`, and regenerates compact targets from full authoritative sources rather than previous `.compact` files
- do not run success compact while validation is incomplete, failed, blocked, or stopped
- before natural turn end with unfinished work, write or refresh `.pipeline/continuation.yaml` with `safe_resume_command: /hw:resume`
- before declaring completion in Codex or hook-limited environments, run preflight checks for protected writes, format validity, derived artifacts, README freshness, output language, secret markers, and required evidence
- when worker separation is enabled, required evidence should include implement/test/audit role coverage; in `recommended`, implement/test degradation is valid only with objective subworker-unavailable evidence, while audit may degrade with explicit evidence

### `/hw:resume`

Supported flags:

- `--template <name>`

Preconditions:

- `state.yaml` exists
- state indicates unfinished work, usually `pipeline.status=running|stopped`

Notes:

- user-facing "interrupted" means persisted unfinished state
- V4.5 does not require a literal `pipeline.status=interrupted` enum

Behavior:

- read `state.yaml`
- read `.pipeline/continuation.yaml`; if `status: active`, choose its `next_action` before falling back to `state.current`
- accept only safe resume commands such as `/hw:resume` or documented natural-language resume aliases; never execute `safe_resume_command` through a shell
- parse `.pipeline/.lock` as a structured execution lease when present
- stop on a fresh foreign lease, take over an expired lease with `lease_takeover` evidence, and stop with repair guidance on a malformed lease
- create or refresh `.pipeline/.lock` before active execution
- locate `current.prompt_file` and `current.step`
- continue from the next runnable step
- update top-level `last_heartbeat` whenever state is persisted
- run the same Codex preflight checks before declaring a resumed milestone complete

### Continuation And Preflight Contract

`.pipeline/continuation.yaml` is a file-backed recovery pointer, not a background runner:

```yaml
schema_version: "1"
status: active
next_action: continue_execution
reason: agent_turn_completed_with_unfinished_milestone
updated_at: 2026-05-06T14:00:00+08:00
safe_resume_command: /hw:resume
context:
  prompt_file: .pipeline/prompts/02-codex-continuation-and-preflight-runtime.md
  step: implement
```

Blocking preflight findings include uncommitted protected authority writes, invalid authority YAML/JSON, malformed leases, invalid resume pointers, secret markers, and missing required report/progress/log evidence. Warning findings include stale derived artifacts, README freshness gaps, missing optional Codex notify, adapter staleness, and non-final output language mismatches.

### `/hw:status`

Supported flags:

- none
- `--full`

Behavior:

- prefer `scripts/state-summary.sh`
- without `--full`, prefer `.pipeline/state.compact.yaml` and `.pipeline/PROGRESS.compact.md` when present
- with `--full`, ignore compact files and load complete `.pipeline/state.yaml` plus `.pipeline/PROGRESS.md`
- if the script is unavailable, fall back to direct config/state inspection
- include the effective execution mode when config files are available
- include active Cycle metadata, `last_heartbeat`, and watchdog state when present
- include project-root `PROJECT-SUMMARY.md` top summary when present
- do not mutate `state.yaml`, `log.md`, `log.yaml`, or reports

### `/hw:skip`

Supported flags:

- `--reason <text>`

Preconditions:

- the pipeline has an active current prompt
- the pipeline is currently resumable, usually `pipeline.status=running|stopped`

Behavior:

- mark the current prompt as skipped
- store the skip reason when provided, otherwise use a concise default such as `user_skipped`
- append a prompt-level skip log event
- write one history entry with `result=skipped`
- do not increment `pipeline.prompts_completed`
- advance directly to the next prompt
- if there is no next prompt, mark the pipeline `completed`

### `/hw:stop`

Supported flags:

- `--no-report`

Preconditions:

- the pipeline has active unfinished work

Behavior:

- persist the current prompt state
- set `pipeline.status=stopped`
- if `--no-report` is absent, write an intermediate report for the current prompt
- append one prompt-level stop event
- do not advance the prompt
- do not mark the prompt aborted
- remove `.pipeline/.lock`
- unregister watchdog cron because the stop is intentional

### `/hw:report`

Supported flags:

- none
- `--view M<N>`

Behavior:

- without `--view`, list `.pipeline/reports.compact.md` summaries when available
- with `--view M<N>`, load the specified Milestone report in full
- locate the most recent report using `history.completed_prompts[-1].report_file` when available
- otherwise fall back to the newest report file in the reports directory
- summarize the latest scores, warnings, and decision

### `/hw:help`

Supported forms:

- `/hw:help`
- `/hw:help --quick`
- `/hw:help <cmd>`

Behavior:

- read `SKILL.md` command tables as the source of truth
- `/hw:help` lists all 40 user-facing commands grouped under Setup, Pipeline, Plan, Lifecycle, Docs, Review, Explain, and Utility
- `/hw:help --quick` returns a compact cheat sheet
- `/hw:help <cmd>` returns detailed usage, flags, and examples for the requested command

### `/hw:reset`

Supported flags:

- none
- `--full`
- `--hard`

Behavior:

- `/hw:reset` resets `state.yaml` to an initial state and preserves config, prompts, architecture, and logs
- `/hw:reset --full` removes state plus generated reports and lifecycle logs while preserving config, prompts, and architecture
- `/hw:reset --hard` removes the entire `.pipeline/` directory after printing the delete list and receiving an explicit `YES`

### `/hw:log`

Supported flags:

- `--all`
- `--type <type>`
- `--since <milestone>`
- `--full`

Behavior:

- read `.pipeline/log.compact.yaml` when available unless `--full` is present
- with `--full`, read `.pipeline/log.yaml` directly
- show the newest 10 entries by default
- filter entries by type or milestone when requested
- if `log.yaml` is missing, return `暂无日志，执行 Pipeline 后自动生成`

### `/hw:setup`

Supported flags:

- none

Behavior:

- run the plugin-level setup wizard
- create `~/.hypo-workflow/` if it is missing
- create or update `~/.hypo-workflow/config.yaml`
- detect or confirm `agent.platform` as `claude-code` or `codex`
- configure `execution.default_mode`, `subagent.provider`, provider model settings, `plan.default_mode`, optional output defaults, and optional watchdog defaults
- preserve `created` on existing configs and update `updated`
- write plugin-level configuration outside the project pipeline state

### `/hw:check`

Supported flags:

- none
- `--config`
- `--notion`
- `--state`

Behavior:

- if `.pipeline/` is missing, return `请先运行 /hw:init`
- otherwise run the six checks defined in `references/check-spec.md`
- return per-check `✅` / `⚠️` / `❌` markers, an overall summary, and a suggested action

### `/hw:init`

Supported flags:

- none
- `--rescan`
- `--folder`
- `--single`
- `--import-history`
- `--interactive` with `--import-history`
- `--automation manual|balanced|full`

Behavior:

- detect whether the repo is empty, is an existing codebase without `.pipeline/`, or already has a pipeline
- normal `/hw:init` does not require git
- follow the exploration and output rules in `references/init-spec.md`
- ask for automation level in interactive contexts: 稳妥模式 (`manual`), 自动模式 (`balanced`), 全自动模式 (`full`)
- write the chosen stable `automation.level` into generated project config; non-interactive init defaults to `balanced` unless `--automation` is provided
- on existing pipelines, check completeness first and use `--rescan` to refresh architecture
- with `--import-history`, scan Git first-parent history and create `.pipeline/archives/cycle-0-legacy/`; `/hw:init --import-history` requires git and must fail clearly outside a Git worktree
- with `--import-history --interactive`, show the proposed split and wait for explicit user confirmation before writing history archive files
- `--import-history` must not change normal init behavior when omitted

### `/hw:release`

Supported flags:

- none
- `--dry-run`
- `--skip-tests`
- `--patch`
- `--minor`
- `--major`

Behavior:

- follow the seven-step release flow in `references/release-spec.md`
- run `update_readme` after versioned files are updated and before commit/tag/push gates
- run `readme-freshness` before release commit creation
- require explicit second confirmation for `--skip-tests`
- append a `type: release` entry to `.pipeline/log.yaml`

### `/hw:audit`

Supported flags:

- none
- `--scope <dir>`
- `--focus <dimension>`
- `--since <milestone>`

Behavior:

- follow the four-step audit workflow in `references/audit-spec.md`
- scan all six dimensions by default
- write the detailed report to `.pipeline/audits/` and append an audit log entry

### `/hw:debug`

Supported forms:

- `/hw:debug`
- `/hw:debug "<symptom>"`
- `/hw:debug --trace`
- `/hw:debug --auto-fix`

Behavior:

- follow the five-step reasoning workflow in `references/debug-spec.md`
- distinguish symptom-driven debugging from preventive audit scanning
- write the detailed report to `.pipeline/debug/` and append a debug log entry

### `/hw:chat`

Supported forms:

- `/hw:chat`
- `/hw:chat end`

Behavior:

- load `references/chat-spec.md`
- `/hw:chat` reloads Workflow context from `state.yaml + cycle.yaml + PROGRESS.md + recent report`
- enter append conversation mode without opening a new Milestone
- keep discussion and small modifications in chat log rather than Milestone report
- `/hw:chat end` explicitly closes chat mode and writes a chat summary when required
- if the session stays lightweight, keep at least chat entries plus modification traces
- when scale grows beyond lightweight follow-up work, recommend upgrade to Patch instead of silently converting

### `/hw:plan`

Supported flags:

- none
- `--batch`
- `--deep`
- `--insert <natural language>`
- `--context audit,patches,deferred,debug`

Behavior:

- load `plan/PLAN-SKILL.md`
- enter Plan Mode using the Discover-first flow
- with `--deep`, route to `/hw:plan:deep` before ordinary decomposition; `/hw:plan --deep` is an alias for the Deep Plan discussion package lifecycle
- honor `--template <name>` as an initial template hint when present
- honor `--context` as comma-separated P1 context sources, including `explore:E001` refs created by `/hw:explore upgrade plan E001`
- single-feature /hw:plan behavior is unchanged when `--batch` is absent
- ordinary `/hw:plan` keeps P1-P4 gates; Deep Plan context, `--deep`, or converted discussion output must not skip P1-P4
- with `--batch`, Discover covers multiple Features in one interview and generates a Feature Queue after confirmation
- Progressive Discover starts by asking task category, desired effect, and verification method before deeper implementation detail
- map task category to Test Profile expectations when applicable; webapp, agent-service, and research each require different validation evidence
- with `--insert <natural language>`, interpret the natural-language request as a structured queue operation, summarize the queue diff, and wait for explicit confirmation before writing `.pipeline/feature-queue.yaml`
- supported insert operations include append, insert before/after, reprioritize, pause with `gate: confirm`, move queued Features, and update queued Feature title/summary/decompose mode
- `--insert` must not reorder active, done, blocked, or deferred Features unless the user explicitly requests repair surgery
- with `--batch`, resolve `batch.decompose_mode`:
  - `upfront`: decompose all Features before execution
  - `just_in_time`: defer Milestone decomposition until each Feature becomes current
- with `--batch`, generate Feature Queue Markdown tables and Mermaid graphs for dependencies and architecture impact
- when `--context` is omitted, use active `cycle.context_sources` when present
- honor `plan.mode=auto|interactive` from project config, falling back to global `plan.default_mode` when available
- default to `/hw:plan:discover` when no explicit sub-phase is given
- do not start normal pipeline execution yet

### `/hw:plan:deep`

Supported operations:

- `new`
- `ask`
- `research`
- `map`
- `drill`
- `readiness`
- `convert`

Behavior:

- load `skills/plan-deep/SKILL.md`
- execute Deep Plan operations only: `new`, `ask`, `research`, `map`, `drill`, `readiness`, and `convert`
- create or update a durable discussion package under `.pipeline/deep-plans/DPxxx-slug/`
- maintain machine-readable source files plus Mermaid/Markdown views for humans
- keep Deep Plan distinct from `/hw:guide` onboarding and `/hw:explore` hypothesis exploration
- honor analysis boundaries and protected file boundaries when reading, researching, or updating package artifacts
- must not directly execute implementation milestones
- require `readiness` and explicit `convert` before using the package as ordinary Plan context
- after conversion, ordinary `/hw:plan` still runs P1-P4 and must not skip P1-P4 gates
- for external code research, remote clone/download requires a concrete action authorization: either per-run `confirmed_remote_actions` from the user or trusted local config `local_config_trusted_remote_actions`; portable project defaults must continue to ask the user
- even when locally trusted, remote code research still requires bounded `.pipeline/deep-plans/.../research-cache/...` storage and implementation-code `evidence_refs`; README-only evidence remains insufficient

### `/hw:plan:discover`

Supported flags:

- `--template <name>`

Behavior:

- load `plan/PLAN-SKILL.md`
- inspect the current repository when applicable
- gather goals, constraints, and stack assumptions
- ask task category, desired effect, and verification method before narrower follow-up questions
- if the category is `research`, ask baseline, expected direction, and validation script before leaving Discover
- write or update `.pipeline/design-spec.md`
- persist intermediate planning state in `.plan-state/` when available
- in interactive mode, ask targeted follow-up questions in rounds
- use assumption statement, ambiguity resolution, tradeoff review, and validation criteria as the default Progressive Discover structure
- in interactive mode, enforce minimum rounds from `plan.interaction_depth`: low=2, medium=3, high=5
- in interactive mode, do not enter P2 until the user explicitly says「够了」「开始吧」「可以了」or equivalent
- if context is injected, present it before the first question round but do not skip Discover
- in auto mode, continue without pausing unless blocked by missing critical information

### `/hw:plan:decompose`

Supported flags:

- none

Behavior:

- load `plan/PLAN-SKILL.md`
- split the project into milestones
- include test specs and boundary coverage expectations per milestone
- in interactive mode, show the proposed milestone split and wait for confirmation before P3 Generate

### `/hw:plan:generate`

Supported flags:

- `--template <name>`

Behavior:

- load `plan/PLAN-SKILL.md`
- generate `.pipeline/config.yaml`, prompts, and `architecture.md`
- use the requested template when provided
- otherwise choose a template from planning context
- detect append mode when an existing `.pipeline/` workspace is present
- choose `implement-only` for planning-heavy or document-heavy build plans unless the project clearly requires executable TDD
- choose `analysis` for root-cause, metric, or repo/system investigations whose primary deliverable is a conclusion and evidence chain
- on prompt-number conflicts, preserve executed prompts and append new prompt numbers after the highest existing number unless explicit resequencing is approved

### `/hw:plan:confirm`

Supported flags:

- none

Behavior:

- load `plan/PLAN-SKILL.md`
- summarize generated artifacts
- include project name, stack, preset, milestone count, test point count, and generated files
- in interactive mode, treat Confirm as a hard gate and wait for explicit `确认` or equivalent before `/hw:start`
- in auto mode, treat confirm as a summary checkpoint only when `automation.gates.planning=auto`; the default `confirm` gate remains mandatory and waits for explicit approval

### `/hw:plan:extend`

Supported flags:

- none

Behavior:

- load `plan/PLAN-SKILL.md`
- require active `.pipeline/cycle.yaml`
- require `.pipeline/state.yaml`
- show the current Cycle milestone list
- ask at least one targeted interactive question round
- use lightweight Progressive Discover first: category, desired effect, verification method
- propose appended milestones and wait for explicit confirmation
- generate new prompt files under `.pipeline/prompts/`
- append milestone records to `.pipeline/state.yaml`
- start numbering at current max milestone number + 1
- never renumber or reorder existing milestones

### `/hw:plan:review`

Supported flags:

- `--full`

Behavior:

- load `plan/PLAN-SKILL.md`
- run Plan Review for the current milestone
- with `--full`, review all completed milestones and architecture deltas
- append or refresh `architecture.md` review notes using the Plan Review format
- emit proposed downstream prompt edits to `.plan-state/prompt-patch-queue.yaml` instead of silently rewriting prompts

### `/hw:cycle`

Supported forms:

- `/hw:cycle new "名称" [--type feature|bugfix|refactor|spike|hotfix] [--context audit,patches,deferred,debug]`
- `/hw:cycle list`
- `/hw:cycle view C{N}`
- `/hw:cycle close [--reason "..."] [--paused]`

Behavior:

- load `skills/cycle/SKILL.md`
- create explicit `.pipeline/cycle.yaml` only on `new`
- do not let `/hw:init` create `cycle.yaml`
- archive active Cycle artifacts on `close` or before a new Cycle starts
- leave old projects without `cycle.yaml` compatible as implicit `C1`

### `/hw:sync`

Supported flags:

- `--light`
- `--check-only`
- `--repair`
- `--deep`
- `--platform opencode`
- `--platform claude-code`
- `--project <dir>`

Behavior:

- default standard mode runs light sync, OpenCode adapter sync, config loading check, and compact refresh
- `--platform claude-code` runs light sync, Claude plugin metadata refresh, safe `.claude/settings.local.json` hook merge, config loading check, derived checks, and compact refresh
- `--light` refreshes registry status, refreshes Knowledge Ledger compact/index when source records changed, detects external changes, and reports without adapter writes
- `--check-only` reports external changes and declared derived artifact drift without writing anything
- `--repair` safely refreshes declared derived artifacts and writes `.pipeline/derived-health.yaml`
- `--deep` runs standard repair sync plus dependency scan and architecture rescan hints
- the derived artifact map records authority, `derived_from`, writer commands, refresh triggers, staleness severity, and repair behavior for each generated view
- protected authority conflicts involving `.pipeline/state.yaml`, `.pipeline/cycle.yaml`, or `.pipeline/rules.yaml` require explicit repair or confirmation and must not be guessed
- never execute pipeline milestones
- SessionStart may only perform light external-change detection and prompt before heavier sync

### `/hw:docs`

Supported forms:

- `/hw:docs check`
- `/hw:docs repair`
- `/hw:docs generate`
- `/hw:docs sync`

Behavior:

- load `skills/docs/SKILL.md`
- check README quality, command/platform freshness, license link policy, generated reference presence, and broken docs references
- repair managed README blocks and generated references without silently rewriting narrative docs
- generate or refresh `docs/user-guide.md`, `docs/developer.md`, `docs/platforms/{codex,claude-code,opencode}.md`, and `docs/reference/*.md`
- keep README as a concise user entrypoint and move test-running, release internals, architecture details, adapter runtime internals, and long changelog content to full docs
- release-time docs checks must fact-check narrative docs for stale command counts and false platform claims
- missing `LICENSE` is a documented user-facing gap until a license file exists; do not invent license authority silently

### `/hw:patch`

Supported forms:

- `/hw:patch "描述" [--severity critical|normal|minor]`
- `/hw:patch list [--open] [--severity critical|normal|minor]`
- `/hw:patch close P{NNN}`
- `/hw:patch fix P{NNN} [P{NNN} ...]`
- `/hw:patch accept P{NNN}`
- `/hw:patch reject P{NNN} "feedback"`

OpenCode mapping:

- `/hw:patch accept P{NNN}` is invoked as `/hw-patch accept P{NNN}`.
- `/hw:patch reject P{NNN} "feedback"` is invoked as `/hw-patch reject P{NNN} "feedback"`.
- `accept` and `reject` are `/hw-patch` argument subcommands, not first-class OpenCode commands. Do not generate `/hw-patch-accept` or `/hw-patch-reject`.

Behavior:

- load `skills/patch/SKILL.md`
- store Patch files under `.pipeline/patches/`
- assign global monotonically increasing IDs `P001`, `P002`, ...
- keep Patches outside Cycle archives
- close patches by updating status without deleting notes
- fix patches through the worker-separated lightweight lane in `skills/patch/SKILL.md`; never write `state.yaml` or generate `report.md` for Patch fix
- accept/reject patches by updating Patch metadata and `.pipeline/patches/feedback/`; Patch acceptance must never write `.pipeline/state.yaml`

### `/hw:pr`

Supported forms:

- `/hw:pr create`
- `/hw:pr create --from-worktree`
- `/hw:pr create --plan`
- `/hw:pr inspect <url|id>`
- `/hw:pr review <url|id>`
- `/hw:pr fix <url|id>`
- `/hw:pr merge <url|id>`
- `/hw:pr close <url|id>`

Behavior:

- load `skills/pr/SKILL.md`
- normalize GitHub Pull Request and GitLab Merge Request inputs into one Change Request shape
- create mode supports both GitHub PR and GitLab MR targets, including self-hosted GitLab hosts when repository host/URL is supplied
- store local archives under `.pipeline/pr/PR-YYYYMMDD-NNN/`
- write `request.yaml`, `summary.md`, `review-notes.md`, `changes.md`, `decisions.yaml`, and `evidence/`
- keep `.pipeline/pr/` as local evidence, not the remote source of truth
- `/hw:pr create` first asks whether the user already has local changes or wants a plan-first PR/MR-sized work item
- `/hw:pr create --from-worktree` guides file scope, source branch, commit message, target branch, title/body, reviewers, labels, and final confirmation
- `/hw:pr create --plan` hands off to `/hw:plan`, then returns to `/hw:pr create --from-worktree` after implementation and validation
- create proposal archives may write `create-proposal.yaml` locally before confirmation
- `inspect` and `review` are remote-readonly except for local archive writes
- `fix` may record local changes and tests, but must not push
- `create`, `merge`, and `close` require explicit confirmation before remote writes
- create confirmation summary must list `push`, `create_change_request`, `reviewer_write`, `label_write`, and `target_branch_write` before any provider write method runs

### `/hw:explain`

Supported forms:

- `/hw:explain [question]`
- `/hw:explain --file <path> [question]`
- `/hw:explain --diff [question]`
- `/hw:explain --report M<N> [question]`

Behavior:

- load `skills/explain/SKILL.md`
- build an evidence packet before answering
- read explicit local targets first, then relevant source/test/docs/pipeline context
- cite files, reports, diffs, logs, or reviews used as evidence
- default to read-only and never advance Cycle, create Patch, mutate state/log, or write remote state
- if evidence is missing, answer with `needs_context` or `unknown` instead of inventing a cause
- `--subagent` requests independent read-only evidence collection; when unavailable, record `fallback_reason` and continue in evidence-first self mode

### `/hw:compact`

Supported flags:

- none

Behavior:

- load `skills/compact/SKILL.md`
- generate `.pipeline/PROGRESS.compact.md`, `.pipeline/state.compact.yaml`, `.pipeline/log.compact.yaml`, `.pipeline/reports.compact.md`, and `.pipeline/patches.compact.md` when source files exist
- never mutate source files while compacting
- obey `compact.*`, `output.language`, and `output.timezone`
- automatic start/resume compact is end-of-run and dirty-only by default; explicit `/hw:compact` may rebuild all supported compact targets

### `/hw:knowledge`

Supported forms:

- `/hw:knowledge list`
- `/hw:knowledge view <id>`
- `/hw:knowledge compact`
- `/hw:knowledge index`
- `/hw:knowledge search [--category <name>] [--tag <tag>] [--source <source>] [text]`

Behavior:

- load `skills/knowledge/SKILL.md`
- read `references/knowledge-spec.md`
- inspect `.pipeline/knowledge/knowledge.compact.md` and `.pipeline/knowledge/index/*.yaml` by default
- only load `.pipeline/knowledge/records/*.yaml` for `view` or narrow `search` results
- redact `api_key`, `token`, `secret`, `password`, `authorization`, `access_token`, `refresh_token`, `client_secret`, and similar fields before display
- never write raw secret values into `.pipeline/`
- keep `.pipeline/state.yaml` compact and do not store full knowledge records there

### `/hw:guide`

Supported flags:

- none

Behavior:

- load `skills/guide/SKILL.md`
- inspect `.pipeline/`, active Cycle, current state, and open Patches
- use `routeGuideIntent` when available to return one recommended next path with command flow, confidence, reason, and confirmation requirement
- consider lifecycle phase, continuation, rejected work, dirty worktree, lease/lock state, derived refresh warnings, batch intent, patch/explore suitability, docs/config/sync intent, and architecture/source-of-truth risk
- ask what the user wants
- recommend exactly one 1-3 command flow
- route deep Grill-Me only for architecture, workflow semantic, source-of-truth, product concept, or long-running coordination risk
- route documentation intent to `/hw:docs`
- execute the first recommended command only after explicit confirmation

### `/hw:showcase`

Supported flags:

- none
- `--all`
- `--doc`
- `--slides`
- `--poster`
- `--new`

Behavior:

- load `skills/showcase/SKILL.md`
- create `.pipeline/showcase/` and `showcase.yaml` on first run
- without selection flags, ask which artifacts to generate and wait for the user
- always run `analyze` and `review`
- generate selected artifacts: `PROJECT-INTRO.md`, `TECHNICAL-DOC.md`, `slides.md`, and optional `poster.png`
- with `--new`, archive current artifacts into `history/v{N}/` and increment Showcase version
- obey `showcase.*`, `output.language`, and `output.timezone`
- poster API failures must not block docs or slides

### `/hw:rules`

Supported forms:

- `/hw:rules`
- `/hw:rules list`
- `/hw:rules list --active`
- `/hw:rules list --label <guard|style|hook|workflow|custom>`
- `/hw:rules enable <name>`
- `/hw:rules disable <name>`
- `/hw:rules set <name> <off|warn|error>`
- `/hw:rules create <name>`
- `/hw:rules edit <name>`
- `/hw:rules delete <name>`
- `/hw:rules pack export <name>`
- `/hw:rules pack import <url>`

Behavior:

- load `skills/rules/SKILL.md`
- use `rules/builtin/` and `rules/presets/` as distributed defaults
- use `.pipeline/rules.yaml` for project extends and severity overrides
- allow optional packs such as `@karpathy/guidelines`; keep them disabled unless explicitly extended
- auto-load `.pipeline/rules/custom/*.md` as natural-language custom rules
- missing `.pipeline/rules.yaml` remains compatible and behaves as `extends: recommended`
- use `scripts/rules-summary.sh` for deterministic listing when shell access is available
- `warn` rules warn and continue; `error` rules block execution at the matching lifecycle hook
- `always` rules are injected into SessionStart context

### `/hw:review`

Supported flags:

- `--full`

Behavior:

- do not run Plan Review directly
- print `⚠️ \`/hw:review\` 已迁移到 \`/hw:plan:review\`。请使用新命令。`
- keep `--full` only as part of the compatibility message

## Compatibility Notes

- `开始执行` is the natural-language equivalent of `/hw:start`
- `继续`, `下一步`, `执行下一步` are natural-language equivalents of `/hw:resume`
- `pipeline status`, `状态` are natural-language equivalents of `/hw:status`
- `跳过当前步骤` remains a step-level skip and is not the same as `/hw:skip`
- `中止`, `abort` remain hard-abort operations and are not the same as `/hw:stop`
- `/hw:plan` enters planning mode and is not the same as `/hw:start`
- `/hw:chat` is lightweight append conversation and is not the same as `/hw:patch`
- `/hw:plan:extend` appends to an active Cycle and is not the same as opening a new Cycle
- `/hw:plan:review` is a planning review surface and not the same as `review_code`
- `/hw:cycle` manages Cycle metadata and archives, not normal milestone execution
- `/hw:patch` manages persistent side-track issues, not prompt patch queues under `.plan-state/`
- `/hw:review --full` remains a legacy compatibility reminder only
- slash commands are entry shortcuts only; they do not change TDD, evaluation, or delegation semantics
