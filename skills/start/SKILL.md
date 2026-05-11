---
name: start
description: Start Hypo-Workflow execution when the user wants to begin running milestones, continue automatically through the pipeline, or execute the first prompt.
---

# /hypo-workflow:start
## 输出语言规则

📌 输出语言规则：
读取 config.yaml → output.language
- zh-CN / zh：所有用户可见的输出使用中文（PROGRESS、报告、状态提示、错误消息、交互提问）
- en：使用英文
- auto：跟随用户对话语言
内部日志（log.yaml、state.yaml）始终英文。

Use this skill to start execution from a local `.pipeline/` workspace. This is the platform-specific entrypoint for the same behavior described by the root `SKILL.md` `/hw:start` command.

## 前置条件

- `.pipeline/config.yaml` exists and should be validated before mutating state
- prompt files exist under the configured prompts directory
- if `.pipeline/state.yaml` already contains unfinished work, resume it unless the user explicitly asks for a clean restart

## 执行流程

1. Read `~/.hypo-workflow/config.yaml` if present.
2. Read `.pipeline/config.yaml`, normalize defaults, and validate it against `config.schema.yaml`.
3. Resolve effective config as project > global > defaults:
   - `execution.mode` falls back to global `execution.default_mode`, then `self`
   - `execution.subagent_tool` falls back to global `subagent.provider`, then `auto`
   - `dashboard.*` and `plan.*` use the same priority when relevant
4. Read `.pipeline/state.yaml` if present; otherwise initialize state from `assets/state-init.yaml`.
5. Read `.pipeline/continuation.yaml` when present. If it has `status: active`, prefer its `next_action`, `reason`, and `safe_resume_command` before falling back to generic `current.*` state.
6. Read `.pipeline/cycle.yaml` when present and derive Cycle behavior from `cycle.workflow_kind` and `cycle.lifecycle_policy`.
7. Default step preset from workflow kind when no explicit compatible preset exists: `build -> tdd`, `analysis -> analysis`, `showcase -> implement-only`.
8. If `watchdog.enabled=true`, register the project watchdog cron entry before long-running execution begins.
9. Create a structured execution lease at `.pipeline/.lock` before entering active execution. The lease must include platform, session id, owner, command, phase, created_at, heartbeat_at, expires_at, workflow kind, cycle id, and handoff_allowed.
10. Set `current.phase=executing` and update top-level `last_heartbeat` with an ISO-8601 timestamp before running milestones.
11. Use the workflow commit helper for any protected lifecycle write so authority facts commit atomically before derived refreshes.
12. Treat the main agent as the orchestrator:
   - the main agent coordinates the current step
   - the main agent delegates concrete sub-work to serial Subagent tasks when appropriate
   - Codex should prefer Codex Subagents for substantial work when available, without external model routing
   - when worker separation is `off`, testing/review and implementation should still be separated when practical; when `recommended` or `strict`, follow the mandatory role ownership below
   - the main agent verifies results, updates state, logging, and progress artifacts
13. Before role-sensitive worker-separated work begins, resolve platform-specific Subagent/delegation authorization:
   - on Codex, if the host requires explicit authorization before spawning Subagents, Ask before starting `write_tests`, `review_tests`, `implement`, `review_code`, or audit-like validation workers
   - when `execution.worker_separation.mode` is `recommended` or `strict`, `write_tests` and `review_tests` belong to the independent `test` worker; the main agent must not write red tests locally first and then ask a subworker to review them
   - when `execution.worker_separation.mode` is `recommended` or `strict`, `implement` belongs to the independent implementation worker; the main agent must not implement locally first and then ask a subworker to review or certify it
   - on Codex, plan-time authorization is valid only when its saved scope explicitly includes `/hw:start` or execution/start-resume roles
   - on Codex, if authorization is absent or declined and worker separation is `recommended` or `strict`, stop before role-sensitive work unless the generated plan explicitly selected the fastest single-agent `execution.worker_separation.mode=off` lane with user-confirmed downgrade evidence
   - on Codex, if the plan selected fast/off mode, continue locally only after that explicit downgrade confirmation is present, and record that worker-separation gates are intentionally disabled for speed
   - on Claude Code and OpenCode, no extra subworker authorization gate is required; use the configured backend/agents, with Claude Code honoring the saved `subcodex` or `subclaude` choice
   - every spawned worker prompt must declare role-specific explicit scope: default spawned workers may edit only `.pipeline/` files and explicitly scoped root-level non-project documentation such as `README.md`, `CHANGELOG.md`, and `PROJECT-SUMMARY.md`; `test` may edit only named test/fixture/snapshot/assertion paths in its explicit scope; `implement` may edit only named production/runtime/documentation paths in its explicit scope; `audit` is read-only
   - `test` worker owns reproduction, red tests, validation commands, fixtures, snapshots, assertions, and test evidence before implementation begins
   - `implement` worker owns only production/runtime/documentation implementation; it must not create, edit, or rewrite tests, fixtures, snapshots, assertions, or validation evidence, and it must not spawn or impersonate `test` or `audit`
   - if a worker needs to touch an out-of-scope path, stop that worker and report the path and owning role; do not let the worker edit first and explain later
   - spawned workers must not revert or overwrite another worker's changes unless that exact action is explicitly authorized in the worker prompt scope
   - do not perform the work locally first and explain missing independent worker evidence afterward
   - record every worker lifecycle as `requested`, `started`, `completed|failed|blocked`, and `closed|close_failed`; wait for the worker whose evidence gates the next step, then close/release it when its result is integrated
   - when `/hw:start` stops, blocks, aborts, or completes, close/release any workers it opened or record `close_failed` with the worker id and reason
14. Execute the active milestone serially:
   - `write_tests`
   - `review_tests`
   - `run_tests_red`
   - `implement`
   - `run_tests_green`
   - `review_code`
   - report and commit work if the prompt requires it
15. For review stages, create or reference secret-safe artifacts under `.pipeline/reviews/<feature>/<milestone>/<stage>/`:
   - validate `verdict` and non-empty `reviewed_refs`
   - record checked/unchecked rules, issues, retry round, and fallback reason when applicable
   - retry `needs_changes` through repair/review up to 3 total rounds by default
   - when strict review policy blocks a verdict, stop continuation and summarize the artifact path
   - for Skill/artifact coverage reviews, record checked/skipped evidence for Skills, hooks, agents, commands, and generated adapter surfaces
16. After every meaningful step, update:
   - `.pipeline/state.yaml`
- `.pipeline/log.yaml`
- `.pipeline/PROGRESS.md`
- top-level `last_heartbeat`
17. Before declaring a milestone complete, run the Codex preflight/runtime checklist when platform is Codex or hooks are unavailable: protected authority writes, YAML/JSON/Markdown validity, stale derived artifacts, README freshness, output language, secret markers, and report/progress/log evidence.
18. During execution, do not compact after every step. Track which compact source files changed (`PROGRESS.md`, `state.yaml`, `log.yaml`, `metrics.yaml`, `reports/`, `patches/`, and Knowledge records) while keeping full authoritative files available for development and validation. After the complete `/hw:start` run has finished successfully and validation/report/state updates have all passed, run end-of-run dirty-only compact refresh when `compact.auto=true` and `compact.end_of_run=true`; default `compact.refresh_policy=dirty_only`.
19. If `.pipeline/feature-queue.yaml` exists, apply batch auto-chain after a Feature's final Milestone passes:
   - mark the completed Feature `done`
   - advance to the next queued Feature when `auto_chain=true`
   - pause before the next Feature when it has `gate: confirm`
   - when the next Feature uses `just_in_time`, decompose its Milestones before starting execution
   - sync queue metric summaries from `.pipeline/metrics.yaml`, using `n/a` when token/cost telemetry is unavailable
20. When `execution.test_profiles` or Feature-level Test Profiles are active, require the matching profile evidence before declaring GREEN:
   - `webapp`: E2E + browser interaction + visual evidence
   - `agent-service`: CLI plan + shared core + real CLI run
   - `research`: baseline + script execution + before/after/delta
21. When `execution.worker_separation.mode` is `recommended` or `strict`, resolve implement/test/audit role coverage before acceptance:
   - start distinct workers for `test`, `implement`, and `audit` only after authorization is resolved
   - `write_tests` and `review_tests` are steps owned by the `test` worker, and that worker must be distinct from the `implement` worker for non-trivial changes
   - implementation Subagent workers must not read test source, fixtures, snapshots, or assertion details; provide only requirements, public interfaces, allowed edit scope, test command, pass/fail status, and sanitized failure summary
   - the main agent may integrate returned changes and resolve conflicts, but it must not be the primary `test`, `implement`, or `audit` worker when worker separation is enabled
   - if `implement` and `test` collapse onto one worker identity, `recommended` must block; objective subworker-unavailable evidence may justify `retry`, `deferred`, `stop`, or an explicit user-confirmed downgrade to `off`, but it must not count as accepted worker-separated completion
   - in `recommended`, `audit` may degrade with explicit evidence when subworker capability is unavailable
   - `strict` must not treat degraded execution as fully accepted
   - incomplete, missing, or `close_failed` worker lifecycle evidence blocks worker-separated completion until repaired or explicitly downgraded where policy allows
22. On failure, the main agent must choose one of:
   - `retry`: revise instructions and rerun the failed step
   - `deferred`: mark the milestone deferred if downstream work can continue safely
   - `stop`: stop and surface the blocking reason to the user
23. If a derived refresh fails after authority commits, keep the authoritative fact committed, write `.pipeline/derived-refresh.yaml`, and surface repair guidance instead of rolling back the lifecycle write.
24. If a Feature fails and the resolved `failure_policy=skip_defer`, mark the Feature `deferred`, preserve its report and metrics, then auto-chain to the next queued Feature unless blocked by `gate: confirm`.
25. Keep moving automatically between milestones while unfinished work remains.
26. Before any natural turn end with unfinished work, write or refresh `.pipeline/continuation.yaml` with `status: active`, `next_action`, `reason`, `updated_at`, `safe_resume_command: /hw:resume`, and focused `context`.
27. Remove `.pipeline/.lock` when the execution turn completes, stops, blocks, aborts, or finishes.
28. If the pipeline completes or stops intentionally, unregister the watchdog cron entry.
29. Only allow the turn to end naturally when all milestones are complete or the main agent has explicitly chosen the `stop` outcome.

## 续跑与 Preflight

- `.pipeline/continuation.yaml` is a recovery pointer for Codex turns and other environments without Stop hooks.
- `safe_resume_command` must be `/hw:resume` or another documented natural-language resume alias, never a shell command.
- `notify` may display the continuation `next_action`; it must not execute the resume command.
- Preflight blocking checks: uncommitted protected authority writes, invalid authority YAML/JSON, secret markers, missing required report/progress/log evidence, malformed leases, and invalid resume pointers.
- Preflight warning checks: stale derived artifacts, README freshness gaps, optional Codex notify absence, adapter staleness, and non-final output language mismatches.

## Watchdog 集成

- resolve `watchdog.*` from project > global > defaults
- when `watchdog.enabled=false`, do not register cron
- when enabled, register `scripts/watchdog.sh <project-root>` with marker `# hypo-workflow-watchdog:<project-root>`
- write `last_heartbeat` every time state is persisted during execution
- create `.pipeline/.lock` as a structured lease before executing steps so watchdog cannot reenter a fresh run
- update the lease heartbeat/expiry whenever `last_heartbeat` is persisted
- remove `.pipeline/.lock` on all clean exits and blocking exits
- stale lease takeover must log `lease_takeover`; platform failure hooks should record `reported_failure`, while heartbeat-only timeout records `inferred_stall`

## 失败处理

- `retry` is allowed without a fixed numeric cap when the main agent believes another strategy can work
- `deferred` requires writing `milestones[].status=deferred` and `deferred_reason`
- `stop` should leave a clear reason in state, log, and progress summary

## 进度跟踪

- create `.pipeline/PROGRESS.md` if it does not exist
- update current milestone status after every step
- summarize recent activity and deferred items for human readers

## Template Language

When loading report or TDD step templates, resolve `output.language` from project > global > defaults.

- `zh-CN` / `zh` -> load `templates/zh/...`
- `en` / `en-US` -> load `templates/en/...`
- any missing localized template -> fall back to root `templates/...`

All user-visible report and PROGRESS prose must follow `output.language`. Internal `state.yaml` and `log.yaml` keys remain English.

## 参考文件

- `references/tdd-spec.md` — step sequencing and TDD rules
- `references/evaluation-spec.md` — scoring and continuation gates
- `references/state-contract.md` — required state fields, including `current.phase`
- `references/progress-spec.md` — `PROGRESS.md` format and update timing
- `references/review-artifacts-spec.md` — review artifact schema, retry policy, and coverage checklist
- `references/commands-spec.md` — exact command semantics
- `references/config-spec.md` — global/project config fallback rules
- `SKILL.md` — full system reference if broader pipeline context is needed
