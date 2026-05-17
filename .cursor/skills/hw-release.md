---
name: hw-release
description: "Hypo-Workflow Cursor skill for /hw-release; use when the user invokes /hw-release or canonical /hw:release."
---

# /hw-release

Canonical command: `/hw:release`
Cursor command: `/hw-release`
Route: `release`
Embedded authority source: `skills/release/SKILL.md`

## Cursor Execution

1. Treat this file as the command-specific Cursor Skill for the requested `/hw-*` command.
2. Read `.cursor/skills/hypo-workflow.md` when global routing, output-language, or shared runtime rules are needed.
3. Execute the canonical `/hw:release` semantics using the embedded command authority below and any user-provided arguments.
4. Before writes, inspect `.pipeline/config.yaml`, `.pipeline/cycle.yaml`, `.pipeline/state.yaml`, and `.pipeline/rules.yaml` when present.
5. Do not treat Hypo-Workflow as a runner; Cursor Agent performs the actual work and records evidence in project files when the active command owns those writes.
6. Cursor chooses the active model in the UI/session; treat provider-specific model defaults as non-Cursor examples and do not write or recommend them unless explicitly requested.

## Cursor Reference Resolution

- Local Cursor references live under `.cursor/skills/` and `.cursor/hypo-workflow/`.
- Source-repository paths mentioned by the embedded authority but absent from `.cursor/hypo-workflow/` are external/non-local for Cursor targets.
- Fallback: use the embedded command authority in this file first, then mirrored `.cursor/hypo-workflow/` resources; ask the user for source-repository context only if the missing external reference is required.

## Command Skill Authority

---
name: release
description: Run Hypo-Workflow release automation when the user wants regression, versioning, changelog, and publication handled in one flow.
---

# /hypo-workflow:release
## Output Language Rules

📌 输出语言规则：
读取 config.yaml → output.language
- zh-CN / zh：所有用户可见的输出使用中文（PROGRESS、报告、状态提示、错误消息、交互提问）
- en：使用英文
- auto：跟随用户对话语言
内部日志（log.yaml、state.yaml）始终英文。

Use this skill for the release workflow.

## Prerequisites

- 工作树应准备好发布
- 状态中不应保留未完成的 Milestone

## Execution Flow

1. 预检：
   - 验证干净的工作树
   - 验证正确的分支
   - 验证没有未完成的 Milestone
2. 除非用户明确确认跳过测试，否则运行回归测试。
3. 除非给出明确的版本标志，否则计算下一个版本。
4. 更新版本化文件。
5. 从 README 规范契约运行 `update_readme`：
   - 读取 `templates/readme-spec.md`
   - 默认替换托管的标记块
   - 遵守 `release.readme.mode` 和 `release.readme.full_regen`
   - 在严格/共享发布配置中不要静默地完整重新生成
6. 在提交/标签/推送门控之前运行 `readme-freshness`。
7. 解析 `output.language` 和 `output.timezone`。
8. 以 `output.language` 生成更改日志内容，时间戳使用 `output.timezone`。
9. 提交、打标签和推送。
10. 可选地创建远程发布条目。
11. 追加生命周期日志条目。
12. 当使用状态跟踪时，设置 `current.phase=lifecycle_release`。

## Reference Files

- `references/release-spec.md`
- `references/log-spec.md`
- `SKILL.md`
