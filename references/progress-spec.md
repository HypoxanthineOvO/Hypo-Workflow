# Progress Spec

Use this reference for the human-readable progress summary file at `.pipeline/PROGRESS.md`.

## Goal

`PROGRESS.md` is the human-facing companion to `log.yaml`.

- `log.yaml` is machine-readable and structured
- `PROGRESS.md` is narrative and quick to scan

## File Location

- canonical path: `.pipeline/PROGRESS.md`

## Format

Use a board-style summary. Do not let `PROGRESS.md` degrade into a loose append-only event log; `log.yaml` owns that job.

```markdown
# <project name> — 开发进度

> 最后更新：15:30 | 状态：进行中 | 进度：3/5 Milestone

## 当前状态
🔄 **M3: Rich UI** — 实现中（step: run_green）

## Milestone 进度

| # | Milestone | 状态 | 摘要 |
|---|-----------|------|------|
| M0 | 项目骨架 | ✅ 完成 | pyproject.toml + 目录结构 + CI 配置 |
| M1 | 核心 CRUD | ✅ 完成 | SQLite 持久化 + 5 个 CRUD 操作 + 100% 测试覆盖 |
| M2 | CLI 交互 | ✅ 完成 | Click CLI + 交互式菜单 + 彩色输出 |
| M3 | Rich UI | 🔄 进行中 | Rich 表格渲染 + 进度条 + 过滤排序 |
| M4 | 导出功能 | ⏳ 待执行 | — |

## 时间线

| 时间 | 类型 | 事件 | 结果 |
|---|---|---|---|
| 15:30 | Step | M3 implement | 完成，进入 run_green |
| 15:15 | Step | M3 write_tests | 完成 12 个测试用例 |
| 14:50 | Milestone | M2 completed | commit `a1b2c3d` |

## Patch 轨道

| Patch | 状态 | 时间 | 摘要 |
|---|---|---|---|
| P001 | ✅ closed | 16:28 | 修复登录页 CSS 错位 |

## Deferred 项
- M1/step3: 跳过了 SQLite WAL 模式测试 — 原因：测试环境不支持
```

Chat sessions should appear in `时间线` as compact board rows rather than as a new freeform appendix.

Example:

```markdown
| 16:40 | Chat | 💬 Chat session recovered | 继续上次 `/hw:chat`，恢复 recent report 与修改上下文 |
```

## Update Timing

Update `PROGRESS.md`:

- when a milestone starts
- when a step completes
- when a milestone completes
- when a milestone is deferred, failed, skipped, or stopped
- when the overall pipeline completes

## Required Content

- last update timestamp
- overall status
- completed vs total milestone count
- current milestone and step
- milestone table
- timeline table with compact timestamps
- board-style chat session rows when chat mode is used
- patch table when patches exist
- deferred section when applicable

## Update Rules

When recording a new event:

1. Update the top metadata line (`最后更新`, status, completed/total count).
2. Update the affected row in `Milestone 进度` or `Patch 轨道`.
3. Insert a compact row at the top of `时间线`.
4. Keep older timeline rows brief; detailed event payloads belong in `.pipeline/log.yaml`.

Cycle acceptance rows use compact lifecycle status labels:

- `pending_acceptance`: completed work is waiting for `/hw:accept` or `/hw:reject`.
- `accepted`: the user accepted the Cycle.
- `rejected`: feedback was captured and the Cycle reopened.
- `needs_revision`: feedback was captured and `/hw:resume` should continue revision from `acceptance.feedback_ref`.
- `follow_up_planning`: accepted work has a planned `cycle.continuations[]` follow-up plan ready to start.
- `timeout accepted`: status/check logic treated pending acceptance as accepted after `acceptance.timeout_hours`.

Rejected feedback should be summarized in the row and stored in `.pipeline/acceptance/`; do not paste full feedback into `PROGRESS.md`.

For chat mode:

- use `Chat` as the timeline type
- use `Chat 前缀` for the event family and `💬 Chat` for the visible event text
- prefix the event text with `💬 Chat`
- summarize append conversation, recent report recovery, or chat summary persistence in one row
- do not create a separate append-only chat transcript section inside `PROGRESS.md`

Do not append standalone one-line entries such as `14:30 P001 closed — ...` to the bottom of the file. Convert them into timeline/table rows instead.

## Output Language And Timezone

Resolve output settings as project `.pipeline/config.yaml` > global `~/.hypo-workflow/config.yaml` > built-in defaults:

- `output.language`: default `zh-CN`
- `output.timezone`: default `Asia/Shanghai`

All `PROGRESS.md` prose, status labels, and recent-activity text should use `output.language`. All timestamps should be converted to `output.timezone`.

Compact time format:

- same local day: `HH:MM`
- cross-day within the current month: `DD日 HH:MM` when `output.language=zh-CN`; otherwise `DD HH:MM`
- include full ISO timestamps only when debugging a timezone or audit issue

## Relationship To State

`PROGRESS.md` should stay consistent with:

- `.pipeline/state.yaml`
- `.pipeline/log.yaml`
- current milestone report files

It is a summary surface, not a replacement for state or lifecycle logs.

For analysis Milestones, `PROGRESS.md` should mention the current question, outcome/confidence when known, and the ledger path if it helps recovery. Full hypotheses, experiments, observations, and validity discussion belong in the analysis ledger and report, not the progress board.

For Agent Review gates, `PROGRESS.md` should show compact review status only: stage, verdict, retry round when relevant, and the `.pipeline/reviews/<feature>/<milestone>/<stage>/` path. Full issues, transcripts, coverage matrices, and repair proposals belong in review artifacts, not the progress board.
