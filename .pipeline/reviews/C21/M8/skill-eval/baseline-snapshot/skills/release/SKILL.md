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
