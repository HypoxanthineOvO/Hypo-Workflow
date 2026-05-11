---
name: skip
description: Skip the current prompt or step when the user explicitly wants to bypass work while keeping the pipeline state recoverable.
---

# /hypo-workflow:skip
## 输出语言规则

📌 输出语言规则：
读取 config.yaml → output.language
- zh-CN / zh：所有用户可见的输出使用中文（PROGRESS、报告、状态提示、错误消息、交互提问）
- en：使用英文
- auto：跟随用户对话语言
内部日志（log.yaml、state.yaml）始终英文。

Use this skill for prompt-level skip behavior. For step-level skip cascade, apply the root system rules for `skip step`.

## 前置条件

- a pipeline is active
- there is a current prompt to skip

## 执行流程

1. Read `.pipeline/state.yaml` and confirm there is an active current prompt.
2. Mark the prompt as skipped with a machine-readable reason.
3. Append a prompt-level skip event to `.pipeline/log.yaml`.
4. Update `.pipeline/PROGRESS.md` so the milestone summary shows the skip outcome.
5. Advance to the next prompt without incrementing `pipeline.prompts_completed`.
6. If no next prompt exists, mark the pipeline completed.

## 安全规则

- keep skipped work explicit and recoverable
- do not pretend skipped milestones passed
- preserve the reason in state and human-readable progress output

## 参考文件

- `references/commands-spec.md` — skip semantics
- `references/state-contract.md` — state mutations
- `references/progress-spec.md` — progress summary updates
- `SKILL.md` — broader pipeline behavior
