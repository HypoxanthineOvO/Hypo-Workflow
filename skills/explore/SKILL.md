---
name: explore
description: Start and manage isolated Hypo-Workflow exploration worktrees without dirtying the main project worktree.
---

# /hw:explore

Use this skill when the user invokes `/hw:explore`.

## 输出语言规则

Follow the root Hypo-Workflow output language config. Use Chinese for user-facing output when `output.language` is `zh-CN` or `zh`, English when it is `en`, and follow the conversation language when it is `auto`.

## 契约

`/hw:explore "topic"` starts an isolated exploration. `/hw:explore status`, `/hw:explore end E001`, `/hw:explore archive E001`, `/hw:explore upgrade plan E001`, and `/hw:explore upgrade analysis E001` manage the lifecycle after start.

Metadata lives under:

```text
.pipeline/explorations/E001-slug/
```

Code worktree lives under:

```text
~/.hypo-workflow/worktrees/<project-id>/E001-slug/
```

## 启动语义

1. Inspect main git worktree cleanliness.
2. If dirty, ask for a required user decision before writing exploration metadata.
3. Allocate the next exploration id such as `E001`.
4. Create branch `explore/E001-slug`.
5. Create the global git worktree.
6. Write `exploration.yaml`, `notes.md`, and `summary.md`.
7. Append an `exploration_start` log entry.
8. Add a Knowledge Ledger record of type `explore`.

## 生命周期语义

- `/hw:explore status` lists exploration metadata from `.pipeline/explorations/*/exploration.yaml` and keeps parallel explorations distinct.
- `/hw:explore end E001` writes a structured summary with findings, changed files, commits, outcome, and an `exploration_end` log entry.
- `/hw:explore archive E001` marks the exploration as archived while retaining metadata, summary, branch, and worktree by default.
- Worktree deletion is optional and requires an explicit confirmation; archive must not delete branches or worktrees by default.
- `/hw:explore upgrade plan E001` exposes the exploration as `/hw:plan --context explore:E001` so Discover can load the summary, notes, and evidence refs.
- `/hw:explore upgrade analysis E001` creates `.pipeline/analysis/explore-E001-context.yaml` with topic, summary, hypotheses, evidence, refs, branch, and worktree path.

## 元数据

```yaml
id: E001
topic: "Investigate sync drift"
status: active
source_project:
  id: prj-xxxxxxxxxxxx
  path: /repo/project
base_branch: main
base_commit: abc123
explore_branch: explore/E001-investigate-sync-drift
worktree_path: ~/.hypo-workflow/worktrees/prj-xxxxxxxxxxxx/E001-investigate-sync-drift
notes_path: .pipeline/explorations/E001-investigate-sync-drift/notes.md
summary_path: .pipeline/explorations/E001-investigate-sync-drift/summary.md
created_at: 2026-05-03T01:50:00+08:00
```

## 边界

- Do not authorize the whole `~/.hypo-workflow` tree.
- Only HW-owned worktrees under `~/.hypo-workflow/worktrees/**` are allowed by OpenCode file guard.
- Do not store real secrets in exploration metadata.
- Do not merge exploration code into main automatically.
- Do not delete branches or worktrees without explicit confirmation.
