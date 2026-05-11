---
name: status
description: Show current Hypo-Workflow progress when the user wants a concise status summary without mutating pipeline state.
---

# /hypo-workflow:status
## 输出语言规则

📌 输出语言规则：
读取 config.yaml → output.language
- zh-CN / zh：所有用户可见的输出使用中文（PROGRESS、报告、状态提示、错误消息、交互提问）
- en：使用英文
- auto：跟随用户对话语言
内部日志（log.yaml、state.yaml）始终英文。

Use this skill to inspect pipeline progress only.

Status is strictly read-only. If state, logs, progress, or step pointers are inconsistent, report the inconsistency and the recommended repair command; do not repair files, do not advance the current step, and do not make Stop hooks pass as a side effect of showing status.

## 前置条件

- none; if `.pipeline/state.yaml` is missing, report that no active pipeline exists

## 执行流程

1. Read `~/.hypo-workflow/config.yaml` if present.
2. Read `.pipeline/config.yaml` if present.
3. If the user passed `--full`, read `.pipeline/state.yaml` and `.pipeline/PROGRESS.md` directly and print `加载完整版 state.yaml` / `加载完整版 PROGRESS.md` with line counts when possible.
4. If `--full` is absent, prefer `.pipeline/state.compact.yaml` and `.pipeline/PROGRESS.compact.md` when they exist; otherwise fall back to `.pipeline/state.yaml` and `.pipeline/PROGRESS.md`.
5. Resolve effective defaults as project > global > defaults without mutating either config file.
6. Prefer `scripts/state-summary.sh` for a quick summary when shell access is available; use compact files only as supplemental context because canonical state mutations still belong to `state.yaml`.
7. Report:
   - pipeline name
   - overall status
   - canonical phase and next action derived from Cycle workflow/lifecycle policy
   - current milestone or prompt
   - current step and step index
   - effective execution mode and subagent provider
   - active Cycle when `.pipeline/cycle.yaml` exists
   - latest completed milestone
   - deferred items if any
   - `last_heartbeat` and watchdog state when present
8. If `.pipeline/PROGRESS.md` or `.pipeline/PROGRESS.compact.md` exists, use it as a human-facing summary source, but do not rewrite it during status inspection.
9. If `.pipeline/feature-queue.yaml` contains Feature DAG dependencies, show a concise board summary with ready, blocked, and parallel candidates. Hide DAG concepts for ordinary single-feature queues.
10. Include derived health from `.pipeline/derived-health.yaml` when present and route stale derived views to `/hw:sync --repair` or `/hw:docs repair` as appropriate.
11. Show Recent Events from `.pipeline/log.yaml` sorted by timestamp newest-first, filtered to user-relevant lifecycle events, and redacted through the shared secret-safe evidence helper.
12. If project-root `PROJECT-SUMMARY.md` exists, include its top summary line and Open Patches / Deferred counts.
13. When running through Claude Code or `/hw:status`, prefer the shared Claude status surface shape: compact milestone table, current phase/next action, automation/profile basics, and recent events. Do not dump the full raw `PROGRESS.md` unless `--full` is requested.

Status must expose one user-facing canonical phase and one next action. Derive these from `.pipeline/cycle.yaml`, `.pipeline/state.yaml`, acceptance state, and active continuation state. Important phases:

- `needs_revision` -> next action `resume_revision`
- `follow_up_planning` -> next action `start_follow_up_plan`
- `pending_acceptance` -> next action `accept_or_reject`

Do not make the user reconcile separate execution, acceptance, continuation, and lock axes on the first screen.

## Flags 参数

- `/hw:status --full`: ignore compact files and load the complete `.pipeline/state.yaml` and `.pipeline/PROGRESS.md`.
- `/hw:status`: use compact files when available, with full-file fallback when compact files are absent.

## 安全规则

- do not mutate `state.yaml`
- do not mutate logs or reports
- do not create missing log/progress files
- do not advance any step or milestone
- do not repair workflow inconsistencies during status display
- do not display raw secrets from logs, reports, Knowledge records, or status sources

## 参考文件

- `references/state-contract.md` — state layout
- `references/progress-spec.md` — progress summary layout
- `references/commands-spec.md` — status command semantics
- `references/config-spec.md` — config priority and fallback rules
- `SKILL.md` — broader system reference if needed
