---
name: hw-knowledge
description: "Hypo-Workflow Cursor skill for /hw-knowledge; use when the user invokes /hw-knowledge or canonical /hw:knowledge."
---

# /hw-knowledge

Canonical command: `/hw:knowledge`
Cursor command: `/hw-knowledge`
Route: `tool`
Embedded authority source: `skills/knowledge/SKILL.md`

## Cursor Execution

1. Treat this file as the command-specific Cursor Skill for the requested `/hw-*` command.
2. Read `.cursor/skills/hypo-workflow.md` when global routing, output-language, or shared runtime rules are needed.
3. Execute the canonical `/hw:knowledge` semantics using the embedded command authority below and any user-provided arguments.
4. Before writes, inspect `.pipeline/config.yaml`, `.pipeline/cycle.yaml`, `.pipeline/state.yaml`, and `.pipeline/rules.yaml` when present.
5. Do not treat Hypo-Workflow as a runner; Cursor Agent performs the actual work and records evidence in project files when the active command owns those writes.
6. Cursor chooses the active model in the UI/session; treat provider-specific model defaults as non-Cursor examples and do not write or recommend them unless explicitly requested.

## Cursor Reference Resolution

- Local Cursor references live under `.cursor/skills/` and `.cursor/hypo-workflow/`.
- Source-repository paths mentioned by the embedded authority but absent from `.cursor/hypo-workflow/` are external/non-local for Cursor targets.
- Fallback: use the embedded command authority in this file first, then mirrored `.cursor/hypo-workflow/` resources; ask the user for source-repository context only if the missing external reference is required.

## Command Skill Authority

---
name: knowledge
description: Inspect and maintain Hypo-Workflow Knowledge Ledger records, indexes, compact summaries, and secret references under `.pipeline/knowledge/`.
---

# /hypo-workflow:knowledge
## 输出语言规则

📌 输出语言规则：
读取 config.yaml → output.language
- zh-CN / zh：所有用户可见的输出使用中文（PROGRESS、报告、状态提示、错误消息、交互提问）
- en：使用英文
- auto：跟随用户对话语言
内部日志（log.yaml、state.yaml）始终英文。

将此技能用于 `/hw:knowledge` 和 OpenCode `/hw-knowledge`。

## 前置条件

- 当配置默认值影响加载、压缩、编辑或严格性时，应读取 `.pipeline/config.yaml`。
- `.pipeline/knowledge/` 在旧项目中可能不存在；报告空账本而不是失败。
- 原始记录读取应仅在用户请求特定 `view` 或狭窄 `search` 时进行。

## 执行流程

1. 读取 `references/knowledge-spec.md`。
2. 从项目 > 全局 > 默认值解析 `knowledge.*` 配置。
3. 对于 `list`，首先读取紧凑和索引文件；列出记录 ID、类别、标签和来源（如果可用）。
4. 对于 `view <id>`，仅打开匹配的 `.pipeline/knowledge/records/*.yaml` 文件。
5. 对于 `compact`，根据用户请求的操作显示或重新生成 `.pipeline/knowledge/knowledge.compact.md`。
6. 对于 `index`，检查或重新生成 `.pipeline/knowledge/index/` 下的类别索引。
7. 对于 `search`，按类别、标签、来源或文本过滤，仅对匹配的候选项打开原始记录。
8. 在显示任何记录内容之前编辑类似密钥的字段。

## 指令语义

- `list`：显示可用类别、紧凑摘要状态和记录 ID。
- `view`：显示一条编辑过的记录。
- `compact`：显示或重新生成紧凑摘要。
- `index`：显示或重新生成生成的类别索引。
- `search`：按 `category`、`tag`、`source` 或自由文本过滤。

## 安全规则

- 切勿将原始 API 密钥、令牌、密码、授权头或密钥写入 `.pipeline/`。
- 真实值属于 `~/.hypo-workflow/secrets.yaml` 或环境变量。
- 保持 `.pipeline/state.yaml` 紧凑；不要在运行时状态中存储完整的知识记录。
- 此技能不是运行器，不执行 Milestone。
- M01 定义了契约。完整的钩子捕获和自动 SessionStart 集成属于后续 milestone。

## 参考文件

- `references/knowledge-spec.md`
- `references/config-spec.md`
- `references/commands-spec.md`
- `references/state-contract.md`
- `SKILL.md`
