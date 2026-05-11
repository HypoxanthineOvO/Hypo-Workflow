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

Use this skill for the seven-surface health check.

## 前置条件

- if `.pipeline/` is missing, instruct the user to run init first

## 执行流程

1. Read `~/.hypo-workflow/config.yaml` if present and warn if it is malformed.
2. Resolve `output.language` and `output.timezone`.
3. Run the checks from `references/check-spec.md` plus built-in quality helpers:
   - Config
   - Pipeline
   - State
   - Prompts
   - Notion
   - Architecture
   - Skill quality via `checkSkillQuality`
  - Execution lease: parse `.pipeline/.lock` when present, report fresh/stale/malformed status, and show repair guidance for malformed leases.
4. Print `✅`, `⚠️`, or `❌` for each surface.
5. Summarize overall health, effective config source, and recommended next action in `output.language`.
6. Set `current.phase=lifecycle_check` when tracking this command through state.

## 参考文件

- `references/check-spec.md`
- `references/commands-spec.md`
- `references/config-spec.md`
- `core/src/skills/index.js`
- `SKILL.md`
