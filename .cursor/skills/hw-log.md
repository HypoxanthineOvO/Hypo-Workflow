---
name: hw-log
description: "Hypo-Workflow Cursor skill for /hw-log; use when the user invokes /hw-log or canonical /hw:log."
---

# /hw-log

Canonical command: `/hw:log`
Cursor command: `/hw-log`
Route: `read`
Embedded authority source: `skills/log/SKILL.md`

## Cursor Execution

1. Treat this file as the command-specific Cursor Skill for the requested `/hw-*` command.
2. Read `.cursor/skills/hypo-workflow.md` when global routing, output-language, or shared runtime rules are needed.
3. Execute the canonical `/hw:log` semantics using the embedded command authority below and any user-provided arguments.
4. Before writes, inspect `.pipeline/config.yaml`, `.pipeline/cycle.yaml`, `.pipeline/state.yaml`, and `.pipeline/rules.yaml` when present.
5. Do not treat Hypo-Workflow as a runner; Cursor Agent performs the actual work and records evidence in project files when the active command owns those writes.
6. Cursor chooses the active model in the UI/session; treat provider-specific model defaults as non-Cursor examples and do not write or recommend them unless explicitly requested.

## Cursor Reference Resolution

- Local Cursor references live under `.cursor/skills/` and `.cursor/hypo-workflow/`.
- Source-repository paths mentioned by the embedded authority but absent from `.cursor/hypo-workflow/` are external/non-local for Cursor targets.
- Fallback: use the embedded command authority in this file first, then mirrored `.cursor/hypo-workflow/` resources; ask the user for source-repository context only if the missing external reference is required.

## Command Skill Authority

---
name: log
description: Read the unified lifecycle log when the user wants milestone, fix, audit, debug, review, or release history.
---

# /hypo-workflow:log
## 输出语言规则

📌 输出语言规则：
读取 config.yaml → output.language
- zh-CN / zh：所有用户可见的输出使用中文（PROGRESS、报告、状态提示、错误消息、交互提问）
- en：使用英文
- auto：跟随用户对话语言
内部日志（log.yaml、state.yaml）始终英文。

使用此 skill 检查 `.pipeline/log.yaml`。

## 执行流程

1. 如果用户传入 `--full`，直接读取 `.pipeline/log.yaml`，并在行数可用时打印 `加载完整版 log.yaml (<N> 行)`。
2. 如果未传入 `--full`，优先使用 `.pipeline/log.compact.yaml`（如果存在）；否则读取 `.pipeline/log.yaml`。
3. 解析 `output.language` 和 `output.timezone`。
4. 默认显示最近 10 条记录，时间戳转换为 `output.timezone`。
5. 支持以下参数：
   - `--all`
   - `--type <type>`
   - `--since <milestone>`
   - `--full`
6. 如果日志文件不存在，使用 `output.language` 说明尚未创建生命周期日志。

Recent/status 读取器必须按时间戳排序（而非文件顺序），并在显示摘要前使用共享的密钥安全脱敏辅助函数。`/hw:log --full` 可以显示完整的生命周期历史，但 status/dashboard 的 Recent 部分应保持为过滤后的用户活动流。

## Flags 参数

- `/hw:log --full`：忽略 `.pipeline/log.compact.yaml`，加载完整的生命周期日志。
- `/hw:log`：在 compact 日志可用时使用 compact 日志上下文，compact 不存在时回退到完整文件。

## 参考文件

- `references/log-spec.md`
- `references/commands-spec.md`
- `SKILL.md`
