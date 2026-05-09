---
name: start
description: Start Hypo-Workflow execution when the user wants to begin running milestones, continue automatically through the pipeline, or execute the first prompt.
---

# /hypo-workflow:start
## Output Language Rules

📌 输出语言规则：
读取 config.yaml → output.language
- zh-CN / zh：所有用户可见的输出使用中文（PROGRESS、报告、状态提示、错误消息、交互提问）
- en：使用英文
- auto：跟随用户对话语言
内部日志（log.yaml、state.yaml）始终英文。

Use this skill to start execution from a local `.pipeline/` workspace. This is the platform-specific entrypoint for the same behavior described by the root `SKILL.md` `/hw:start` command.

## Preconditions

- `.pipeline/config.yaml` exists and should be validated before mutating state
- prompt files exist under the configured prompts directory
- if `.pipeline/state.yaml` already contains unfinished work, resume it unless the user explicitly asks for a clean restart

## Execution Flow

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
   - testing/review and implementation should be separated when practical
   - the main agent verifies results, updates state, logging, and progress artifacts
13. Execute the active milestone serially:
   - `write_tests`
   - `review_tests`
   - `run_tests_red`
   - `implement`
   - `run_tests_green`
   - `review_code`
   - report and commit work if the prompt requires it
14. For review stages, create or reference secret-safe artifacts under `.pipeline/reviews/<feature>/<milestone>/<stage>/`:
   - validate `verdict` and non-empty `reviewed_refs`
   - record checked/unchecked rules, issues, retry round, and fallback reason when applicable
   - retry `needs_changes` through repair/review up to 3 total rounds by default
   - when strict review policy blocks a verdict, stop continuation and summarize the artifact path
   - for Skill/artifact coverage reviews, record checked/skipped evidence for Skills, hooks, agents, commands, and generated adapter surfaces
15. After every meaningful step, update:
   - `.pipeline/state.yaml`
   - `.pipeline/log.yaml`
   - `.pipeline/PROGRESS.md`
   - top-level `last_heartbeat`
16. Before declaring a milestone complete, run the Codex preflight/runtime checklist when platform is Codex or hooks are unavailable: protected authority writes, YAML/JSON/Markdown validity, stale derived artifacts, README freshness, output language, secret markers, and report/progress/log evidence.
17. After a Milestone report is generated and the Milestone reaches a final state, resolve `compact.auto` from project > global > defaults. If `compact.auto=true`, run the `/hw:compact` generation rules before advancing to the next Milestone.
18. If `.pipeline/feature-queue.yaml` exists, apply batch auto-chain after a Feature's final Milestone passes:
   - mark the completed Feature `done`
   - advance to the next queued Feature when `auto_chain=true`
   - pause before the next Feature when it has `gate: confirm`
   - when the next Feature uses `just_in_time`, decompose its Milestones before starting execution
   - sync queue metric summaries from `.pipeline/metrics.yaml`, using `n/a` when token/cost telemetry is unavailable
19. When `execution.test_profiles` or Feature-level Test Profiles are active, require the matching profile evidence before declaring GREEN:
   - `webapp`: E2E + browser interaction + visual evidence
   - `agent-service`: CLI plan + shared core + real CLI run
   - `research`: baseline + script execution + before/after/delta
20. When `execution.worker_separation.mode` is `recommended` or `strict`, resolve implement/test/audit role coverage before acceptance:
   - try to start distinct workers for `implement`, `test`, and `audit`
   - if roles are missing or collide onto one worker identity, mark the run degraded
   - implementation Subagent workers must not read test source, fixtures, snapshots, or assertion details; provide only requirements, public interfaces, allowed edit scope, test command, pass/fail status, and sanitized failure summary
   - if this role isolation cannot be preserved, stop before delegated execution and request explicit user confirmation for degraded mode
   - record role isolation degradation, missing roles, worker collisions, unavailable boundaries, and the user decision in the report/log/state notes
   - `recommended` may continue with explicit degraded-mode confirmation and evidence
   - `strict` must not treat degraded execution as fully accepted
21. On failure, the main agent must choose one of:
   - `retry`: revise instructions and rerun the failed step
   - `deferred`: mark the milestone deferred if downstream work can continue safely
   - `stop`: stop and surface the blocking reason to the user
22. If a derived refresh fails after authority commits, keep the authoritative fact committed, write `.pipeline/derived-refresh.yaml`, and surface repair guidance instead of rolling back the lifecycle write.
23. If a Feature fails and the resolved `failure_policy=skip_defer`, mark the Feature `deferred`, preserve its report and metrics, then auto-chain to the next queued Feature unless blocked by `gate: confirm`.
24. Keep moving automatically between milestones while unfinished work remains.
25. Before any natural turn end with unfinished work, write or refresh `.pipeline/continuation.yaml` with `status: active`, `next_action`, `reason`, `updated_at`, `safe_resume_command: /hw:resume`, and focused `context`.
26. Remove `.pipeline/.lock` when the execution turn completes, stops, blocks, aborts, or finishes.
27. If the pipeline completes or stops intentionally, unregister the watchdog cron entry.
28. Only allow the turn to end naturally when all milestones are complete or the main agent has explicitly chosen the `stop` outcome.

## Continuation And Preflight

- `.pipeline/continuation.yaml` is a recovery pointer for Codex turns and other environments without Stop hooks.
- `safe_resume_command` must be `/hw:resume` or another documented natural-language resume alias, never a shell command.
- `notify` may display the continuation `next_action`; it must not execute the resume command.
- Preflight blocking checks: uncommitted protected authority writes, invalid authority YAML/JSON, secret markers, missing required report/progress/log evidence, malformed leases, and invalid resume pointers.
- Preflight warning checks: stale derived artifacts, README freshness gaps, optional Codex notify absence, adapter staleness, and non-final output language mismatches.

## Watchdog Integration

- resolve `watchdog.*` from project > global > defaults
- when `watchdog.enabled=false`, do not register cron
- when enabled, register `scripts/watchdog.sh <project-root>` with marker `# hypo-workflow-watchdog:<project-root>`
- write `last_heartbeat` every time state is persisted during execution
- create `.pipeline/.lock` as a structured lease before executing steps so watchdog cannot reenter a fresh run
- update the lease heartbeat/expiry whenever `last_heartbeat` is persisted
- remove `.pipeline/.lock` on all clean exits and blocking exits
- stale lease takeover must log `lease_takeover`; platform failure hooks should record `reported_failure`, while heartbeat-only timeout records `inferred_stall`

## Failure Handling

- `retry` is allowed without a fixed numeric cap when the main agent believes another strategy can work
- `deferred` requires writing `milestones[].status=deferred` and `deferred_reason`
- `stop` should leave a clear reason in state, log, and progress summary

## Progress Tracking

- create `.pipeline/PROGRESS.md` if it does not exist
- update current milestone status after every step
- summarize recent activity and deferred items for human readers

## Template Language

When loading report or TDD step templates, resolve `output.language` from project > global > defaults.

- `zh-CN` / `zh` -> load `templates/zh/...`
- `en` / `en-US` -> load `templates/en/...`
- any missing localized template -> fall back to root `templates/...`

All user-visible report and PROGRESS prose must follow `output.language`. Internal `state.yaml` and `log.yaml` keys remain English.

## Reference Files

- `references/tdd-spec.md` — step sequencing and TDD rules
- `references/evaluation-spec.md` — scoring and continuation gates
- `references/state-contract.md` — required state fields, including `current.phase`
- `references/progress-spec.md` — `PROGRESS.md` format and update timing
- `references/review-artifacts-spec.md` — review artifact schema, retry policy, and coverage checklist
- `references/commands-spec.md` — exact command semantics
- `references/config-spec.md` — global/project config fallback rules
- `SKILL.md` — full system reference if broader pipeline context is needed
