---
name: hw-compact
description: "Hypo-Workflow Cursor skill for /hw-compact; use when the user invokes /hw-compact or canonical /hw:compact."
---

# /hw-compact

Canonical command: `/hw:compact`
Cursor command: `/hw-compact`
Route: `tool`
Embedded authority source: `skills/compact/SKILL.md`

## Cursor Execution

1. Treat this file as the command-specific Cursor Skill for the requested `/hw-*` command.
2. Read `.cursor/skills/hypo-workflow.md` when global routing, output-language, or shared runtime rules are needed.
3. Execute the canonical `/hw:compact` semantics using the embedded command authority below and any user-provided arguments.
4. Before writes, inspect `.pipeline/config.yaml`, `.pipeline/cycle.yaml`, `.pipeline/state.yaml`, and `.pipeline/rules.yaml` when present.
5. Do not treat Hypo-Workflow as a runner; Cursor Agent performs the actual work and records evidence in project files when the active command owns those writes.
6. Cursor chooses the active model in the UI/session; treat provider-specific model defaults as non-Cursor examples and do not write or recommend them unless explicitly requested.

## Command Skill Authority

---
name: compact
description: Generate compact context views for large Hypo-Workflow runtime files without mutating the originals.
---

# /hypo-workflow:compact
## 输出语言规则

📌 输出语言规则：
读取 config.yaml → output.language
- zh-CN / zh：所有用户可见的输出使用中文（PROGRESS、报告、状态提示、错误消息、交互提问）
- en：使用英文
- auto：跟随用户对话语言
内部日志（log.yaml、state.yaml）始终英文。

当用户调用 `/hw:compact` 或 `/hypo-workflow:compact` 时使用此技能。

Compact 文件是派生的上下文视图。它们减少 SessionStart 上下文大小，同时保持源文件不变。

Compact 输出是恢复和索引上下文。Agent 必须从稳定的 prompt/设计产物重新开始，例如 `.pipeline/prompts/*.md`、`.pipeline/design-spec.md`、`.pipeline/design-concepts.yaml`、`.pipeline/glossary.md` 和持久的 Knowledge 索引。Compact 摘要不是设计权威，在做出实现决策时不得替代这些稳定产物。

## Paths

所有 compact 文件写入其源文件旁边：

- `.pipeline/PROGRESS.compact.md`
- `.pipeline/state.compact.yaml`
- `.pipeline/log.compact.yaml`
- `.pipeline/reports.compact.md`
- `.pipeline/patches.compact.md`
- `.pipeline/knowledge/knowledge.compact.md`

在生成 compact 视图时，永远不要删除或重写原始文件。

## Config

从项目配置 > 全局配置 > 默认值解析 `compact.*`：

```yaml
compact:
  auto: true
  end_of_run: true
  refresh_policy: dirty_only
  progress_recent: 15
  state_history_full: 1
  log_recent: 20
  reports_summary_lines: 3
```

如果配置缺失，使用这些默认值。

## Commands

支持的形式：

- `/hw:compact`

## Steps

1. 读取 `~/.hypo-workflow/config.yaml`（如果存在）。
2. 读取 `.pipeline/config.yaml`（如果存在）。
3. 解析 `output.language`、`output.timezone` 和 `compact.*`。
4. 扫描 `.pipeline/` 中可压缩的源文件。
5. 仅在源文件存在时生成 `.compact` 文件。
6. 报告生成的文件数量和预计的 token 节省，例如 `已生成 4 个 .compact 文件，预计节省 ~92% context token`。

## Compact 策略

### `PROGRESS.compact.md`

源文件：`.pipeline/PROGRESS.md`

保留：

- 当前 Cycle 标题或当前状态块（如果存在）
- 最近的 `compact.progress_recent` 个进度条目；默认 `15`
- 每个已归档 Cycle 一行摘要，从 `.pipeline/archives/*/summary.md` 提取

不包含完整的已归档进度文件。

### `state.compact.yaml`

源文件：`.pipeline/state.yaml`

保留：

- 完整的 `pipeline` 和 `current` 部分
- `last_heartbeat`（如果存在）
- 最新的 `compact.state_history_full` 个已完成的 milestone 完整内容；默认 `1`
- 较旧的 `history.completed_prompts` 条目简化为 `{prompt, status, score_summary}`
- 当前 `milestones` 列表，包含名称和状态

`state.compact.yaml` 是只读上下文，不得用作变更的规范状态文件。

### `log.compact.yaml`

源文件：`.pipeline/log.yaml`

保留：

- 最新的 `compact.log_recent` 个生命周期事件完整内容；默认 `20`
- 较旧的事件压缩为：

```yaml
older:
  count: <N>
  earliest: "<timestamp>"
  latest: "<timestamp>"
  summary: "<event type counts and notable failures>"
```

### `reports.compact.md`

源文件：`.pipeline/reports/`

对于每个历史报告，最多提取 `compact.reports_summary_lines` 行；默认 `3`。

优先保留以下事实（如果存在）：

- 最终结论或决策
- 评估分数
- 关键变更摘要

跳过当前 Milestone 报告，以便 SessionStart 在其存在时可以完整加载。

### `patches.compact.md`

源文件：`.pipeline/patches/P*.md`

仅包含已关闭的 Patch。对于每个已关闭的 Patch，保留：

- Patch ID
- 标题
- 一行变更摘要或 commit hash

打开的 Patch 文件仍由 SessionStart 单独完整加载。

### `knowledge.compact.md`

源文件：`.pipeline/knowledge/records/*.yaml` 加上生成的类别索引。

保留：

- 最近的持久决策
- 可重用的陷阱
- 重要的依赖关系
- 配置说明
- 脱敏的密钥引用

默认不加载完整的原始知识记录。SessionStart 仅加载 `.pipeline/knowledge/knowledge.compact.md` 和 `.pipeline/knowledge/index/*.yaml`。

## 自动生成

当 `compact.auto: true` 时：

- 在 `/hw:start` 或 `/hw:resume` 成功完成后，在验证、报告、状态、日志和进度更新都通过后重新生成脏的 compact 视图
- 在普通步骤执行期间不要重复 compact；在开发和验证仍在进行时保持完整的权威文件可用
- 当 Knowledge Ledger 记录或索引更改时重新生成 `.pipeline/knowledge/knowledge.compact.md`
- 在 `/hw:cycle close` 期间，在归档摘要生成之前或之后立即重新生成 compact 视图

当 `compact.auto: false` 时，除非用户明确调用 `/hw:compact`，否则不生成 compact 文件。

运行结束时的自动 compact 仅处理脏数据：仅刷新完整权威源更新或 compact 目标缺失的 compact 目标。每个刷新的 compact 目标必须从完整源文件或源目录重新生成，永远不要从之前的 `.compact` 输出生成。

`compact.refresh_policy=always` 可用于明确的维护命令，当需要完整的派生重建时。默认的运行结束策略是 `dirty_only`。

## Git 跟踪

Compact 文件是派生产物。`.gitignore` 必须包含 `*.compact.*`，以便不被跟踪。

## References

- `hooks/session-start.sh` — compact-first 上下文加载
- `skills/status/SKILL.md` — `--full` 状态行为
- `skills/log/SKILL.md` — `--full` 日志行为
- `skills/report/SKILL.md` — 报告摘要和 `--view`
- `references/config-spec.md` — 配置默认值
- `SKILL.md` — 根命令路由
