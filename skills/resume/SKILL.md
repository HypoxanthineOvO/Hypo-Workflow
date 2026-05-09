---
description: Resume Hypo-Workflow execution only through the `/hw:resume` namespace from saved `.pipeline/` state; do not use for Claude Code native `/resume`.
disable-model-invocation: true
argument-hint: "[optional context]"
---

# /hypo-workflow:resume
## Output Language Rules

📌 输出语言规则：
读取 config.yaml → output.language
- zh-CN / zh：所有用户可见的输出使用中文（PROGRESS、报告、状态提示、错误消息、交互提问）
- en：使用英文
- auto：跟随用户对话语言
内部日志（log.yaml、state.yaml）始终英文。

Use this skill to continue from `.pipeline/state.yaml` without restarting completed work.

## Preconditions

- `.pipeline/state.yaml` exists
- the saved pipeline is unfinished, usually `pipeline.status=running` or `pipeline.status=stopped`

## Execution Flow

1. Read `~/.hypo-workflow/config.yaml` if present.
2. Read `.pipeline/config.yaml` and `.pipeline/state.yaml`.
3. Read `.pipeline/continuation.yaml` when present. If it has `status: active`, choose its `next_action`, `reason`, and `safe_resume_command` before falling back to generic `current.*` state.
4. Resolve effective execution and subagent defaults as project > global > defaults before selecting the next step.
5. If `current.phase=needs_revision`, resume the revision path using `acceptance.feedback_ref` as input; do not continue from a previously completed step.
6. If `current.phase=follow_up_planning`, start the active `continuation` or the matching `cycle.continuations[]` follow-up plan.
7. Validate that `current.prompt_file`, `current.step`, and `current.step_index` still point to a valid prompt and step for ordinary execution phases.
8. If `.pipeline/.lock` exists, parse it as an execution lease.
   - fresh foreign lease: stop and report that another execution is active
   - expired lease: take over, write `lease_takeover` evidence, and record `inferred_stall`
   - lease with `reported_failure`: take over and preserve the failure evidence
   - malformed lease: stop with repair guidance instead of deleting it silently
9. Create or refresh the structured execution lease before resuming active execution.
10. Set `current.phase=executing` and update top-level `last_heartbeat`.
11. Use the workflow commit helper for any protected lifecycle write so authority facts commit atomically before derived refreshes.
12. Continue from the next runnable step instead of replaying completed steps.
13. Use the same serial orchestration model as `/hypo-workflow:start`:
   - the main agent coordinates
   - Subagent tasks execute concrete work
   - Codex should prefer Codex Subagents for substantial work when available, without external model routing
   - testing/review and implementation should be separated when practical
   - the main agent validates, scores, and updates artifacts
14. For resumed review stages, inspect existing `.pipeline/reviews/<feature>/<milestone>/<stage>/` artifacts before creating a new round:
   - continue from the next retry round when the latest verdict is `needs_changes` and retry budget remains
   - block when strict policy blocks the latest verdict or the default max of 3 total rounds is exhausted
   - preserve checked/skipped coverage evidence for Skills, hooks, agents, commands, and generated adapter surfaces
   - keep full review notes in review artifacts and store only compact pointers in state or progress
15. Update `.pipeline/PROGRESS.md`, `.pipeline/log.yaml`, `.pipeline/state.yaml`, and `last_heartbeat` after each meaningful transition.
16. Before declaring completion, run the Codex preflight/runtime checklist when platform is Codex or hooks are unavailable.
17. If a derived refresh fails after authority commits, keep the authoritative fact committed, write `.pipeline/derived-refresh.yaml`, and surface repair guidance instead of rolling back the lifecycle write.
18. During resume execution, keep full authoritative runtime files available for development and validation; track compact source changes instead of compacting after every step.
19. If `.pipeline/feature-queue.yaml` exists, resume batch auto-chain from the saved state:
   - honor `gate: confirm` by pausing before the next Feature
   - when a queued Feature uses `just_in_time`, decompose it only after it becomes current
   - sync queue duration, token/cost, and metric summaries from `.pipeline/metrics.yaml`, preserving `n/a` for unavailable telemetry
20. When Test Profiles are active, do not treat missing profile evidence as a soft warning; block until the required evidence contract is satisfied or an explicit blocker is recorded.
21. Apply the same `retry` / `deferred` / `stop` decision model on failures.
22. After the complete `/hw:resume` run has finished successfully and validation/report/state updates have all passed, run end-of-run dirty-only compact refresh when `compact.auto=true` and `compact.end_of_run=true`; skip it when disabled. Refresh compact targets from full authoritative sources, not from older compact files.
23. Before any natural turn end with unfinished work, write or refresh `.pipeline/continuation.yaml` with `safe_resume_command: /hw:resume`.
24. Remove `.pipeline/.lock` when the resume turn completes, stops, blocks, aborts, or finishes.
25. If the pipeline completes or stops intentionally, unregister the watchdog cron entry.

## Safety Rules

- never silently discard saved work
- never resume when a fresh `.pipeline/.lock` lease says another execution is active
- if state references a missing prompt, stop and explain the inconsistency
- if the current step is already complete, advance to the next runnable step rather than rerunning it blindly
- active `.pipeline/continuation.yaml` has priority over generic state pointers, but unsafe `safe_resume_command` values must be rejected instead of executed

## Continuation And Preflight

- `.pipeline/continuation.yaml` is file-backed recovery state for Codex and other environments without Stop hooks.
- Active continuation records `next_action`, `reason`, `updated_at`, `safe_resume_command`, and focused `context`.
- `/hw:resume` should resolve active continuation first, then fall back to `state.current`.
- `safe_resume_command` is a display/resume hint only; never shell-execute it.
- Blocking preflight findings must be fixed before declaring completion. Warning findings should be recorded with repair hints and may continue when correctness is otherwise preserved.

## Watchdog Integration

Watchdog-triggered resumes follow the same safety rules as user-triggered resumes. They must update `last_heartbeat`, honor fresh execution leases, take over expired leases with evidence, and write a concise note to `.pipeline/watchdog.log` when the triggering script provides context.

## Reference Files

- `references/state-contract.md` — resume semantics and required fields
- `references/commands-spec.md` — command behavior
- `references/progress-spec.md` — progress summary rules
- `references/review-artifacts-spec.md` — review artifact schema, retry policy, and coverage checklist
- `references/config-spec.md` — global/project config fallback rules
- `SKILL.md` — full execution context if needed
