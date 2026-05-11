---
name: stop
description: Gracefully stop Hypo-Workflow when the user wants to pause execution without aborting the pipeline.
---

# /hypo-workflow:stop
## 输出语言规则

📌 输出语言规则：
读取 config.yaml → output.language
- zh-CN / zh：所有用户可见的输出使用中文（PROGRESS、报告、状态提示、错误消息、交互提问）
- en：使用英文
- auto：跟随用户对话语言
内部日志（log.yaml、state.yaml）始终英文。

Use this skill to pause the current run while preserving resumable state.

## 前置条件

- active unfinished pipeline work exists

## 执行流程

1. Read `.pipeline/state.yaml` and confirm the current run is unfinished.
2. Persist current prompt and step state.
3. Set `pipeline.status=stopped`.
4. Preserve `current.phase` so a future resume can restore intent cleanly.
5. Optionally write an intermediate report if the command does not disable report generation.
6. Append a stop event to `.pipeline/log.yaml`.
7. Update `.pipeline/PROGRESS.md` to show the paused status in the top metadata, current status block, and timeline table.
8. Update top-level `last_heartbeat`.
9. Remove `.pipeline/.lock` if it belongs to the current execution.
10. Unregister the watchdog cron entry because this stop is intentional.

## 安全规则

- do not mark the prompt aborted
- do not discard partial work
- stop should be resumable, not destructive
- do not leave `.pipeline/.lock` behind after a successful stop

## 参考文件

- `references/commands-spec.md` — stop behavior and flags
- `references/state-contract.md` — stopped state semantics
- `references/progress-spec.md` — progress summary updates
- `SKILL.md` — full runtime reference
