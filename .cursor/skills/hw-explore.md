---
name: hw-explore
description: "Hypo-Workflow Cursor skill for /hw-explore; use when the user invokes /hw-explore or canonical /hw:explore."
---

# /hw-explore

Canonical command: `/hw:explore`
Cursor command: `/hw-explore`
Route: `explore`
Embedded authority source: `skills/explore/SKILL.md`

## Cursor Execution

1. Treat this file as the command-specific Cursor Skill for the requested `/hw-*` command.
2. Read `.cursor/skills/hypo-workflow.md` when global routing, output-language, or shared runtime rules are needed.
3. Execute the canonical `/hw:explore` semantics using the embedded command authority below and any user-provided arguments.
4. Before writes, inspect `.pipeline/config.yaml`, `.pipeline/cycle.yaml`, `.pipeline/state.yaml`, and `.pipeline/rules.yaml` when present.
5. Do not treat Hypo-Workflow as a runner; Cursor Agent performs the actual work and records evidence in project files when the active command owns those writes.
6. Cursor chooses the active model in the UI/session; treat provider-specific model defaults as non-Cursor examples and do not write or recommend them unless explicitly requested.

## Cursor Reference Resolution

- Local Cursor references live under `.cursor/skills/` and `.cursor/hypo-workflow/`.
- Source-repository paths mentioned by the embedded authority but absent from `.cursor/hypo-workflow/` are external/non-local for Cursor targets.
- Fallback: use the embedded command authority in this file first, then mirrored `.cursor/hypo-workflow/` resources; ask the user for source-repository context only if the missing external reference is required.

## Command Skill Authority

---
name: explore
description: Start and manage isolated Hypo-Workflow exploration worktrees without dirtying the main project worktree.
---

# /hw:explore

Use this skill when the user invokes `/hw:explore`.

## 输出语言规则

遵循根 Hypo-Workflow 输出语言配置。当 `output.language` 为 `zh-CN` 或 `zh` 时使用中文输出面向用户的内容，为 `en` 时使用英语，为 `auto` 时跟随对话语言。

## 契约

`/hw:explore "topic"` 启动一个隔离的探索。`/hw:explore status`、`/hw:explore end E001`、`/hw:explore archive E001`、`/hw:explore upgrade plan E001` 和 `/hw:explore upgrade analysis E001` 管理启动后的生命周期。

元数据位于：

```text
.pipeline/explorations/E001-slug/
```

代码 worktree 位于：

```text
~/.hypo-workflow/worktrees/<project-id>/E001-slug/
```

## 启动语义

1. 检查主 git worktree 的清洁度。
2. 如果脏，在写入探索元数据之前请求必需的用户决策。
3. 分配下一个探索 ID，例如 `E001`。
4. 创建分支 `explore/E001-slug`。
5. 创建全局 git worktree。
6. 写入 `exploration.yaml`、`notes.md` 和 `summary.md`。
7. 追加 `exploration_start` 日志条目。
8. 添加类型为 `explore` 的 Knowledge Ledger 记录。

## 生命周期语义

- `/hw:explore status` 从 `.pipeline/explorations/*/exploration.yaml` 列出探索元数据，并保持并行探索的区分。
- `/hw:explore end E001` 写入包含发现、更改文件、提交、结果的结构化摘要，以及 `exploration_end` 日志条目。
- `/hw:explore archive E001` 将探索标记为已归档，默认保留元数据、摘要、分支和 worktree。
- Worktree 删除是可选的，需要明确确认；归档默认不得删除分支或 worktree。
- `/hw:explore upgrade plan E001` 将探索暴露为 `/hw:plan --context explore:E001`，以便 Discover 可以加载摘要、笔记和证据引用。
- `/hw:explore upgrade analysis E001` 创建 `.pipeline/analysis/explore-E001-context.yaml`，包含主题、摘要、假设、证据、引用、分支和 worktree 路径。

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

- 不要授权整个 `~/.hypo-workflow` 树。
- OpenCode 文件守卫只允许 `~/.hypo-workflow/worktrees/**` 下的 HW 拥有的 worktree。
- 不要在探索元数据中存储真实密钥。
- 不要自动将探索代码合并到 main。
- 不要在没有明确确认的情况下删除分支或 worktree。
