---
name: check
description: Run a health check over config, state, prompts, and architecture when the user wants to diagnose a Hypo-Workflow workspace quickly.
---

# /hypo-workflow:check
## 输出语言规则

📌 输出语言规则：
读取 config.yaml → output.language
- zh-CN / zh：所有用户可见的输出使用中文（PROGRESS、报告、状态提示、错误消息、交互提问）
- en：使用英文
- auto：跟随用户对话语言
内部日志（log.yaml、state.yaml）始终英文。

使用此技能进行七层健康检查。

## Prerequisites

- 如果 `.pipeline/` 缺失，指示用户先运行 init

## Steps

1. 读取 `~/.hypo-workflow/config.yaml`（如果存在），如果格式错误则发出警告。
2. 解析 `output.language` 和 `output.timezone`。
3. 运行 `references/check-spec.md` 中的检查以及内置质量助手：
   - Config
   - Pipeline
   - State
   - Prompts
   - Notion
   - Architecture
   - 通过 `checkSkillQuality` 检查技能质量
   - 执行租约：解析 `.pipeline/.lock`（如果存在），报告 fresh/stale/malformed 状态，并显示格式错误租约的修复指导。
4. 为每层打印 `✅`、`⚠️` 或 `❌`。
5. 使用 `output.language` 总结整体健康状况、有效配置源和建议的下一步操作。
6. 当通过状态跟踪此命令时，设置 `current.phase=lifecycle_check`。

## References

- `references/check-spec.md`
- `references/commands-spec.md`
- `references/config-spec.md`
- `core/src/skills/index.js`
- `SKILL.md`
