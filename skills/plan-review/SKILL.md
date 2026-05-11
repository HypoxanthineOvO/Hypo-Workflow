---
name: plan-review
description: Review architecture changes after a completed milestone when the user wants downstream prompt impact analyzed.
---

# /hypo-workflow:plan-review
## 输出语言规则

📌 输出语言规则：
读取 config.yaml → output.language
- zh-CN / zh：所有用户可见的输出使用中文（PROGRESS、报告、状态提示、错误消息、交互提问）
- en：使用英文
- auto：跟随用户对话语言
内部日志（log.yaml、state.yaml）始终英文。

Use this skill for Plan Review after execution changes project reality.

## 前置条件

- a milestone has completed
- architecture tracking is active or an architecture baseline exists

## 执行流程

1. Read the architecture baseline.
2. Resolve `output.language` and `output.timezone`.
3. Summarize what the completed milestone actually changed in `output.language`.
4. Record:
   - `ADDED`
   - `CHANGED`
   - `REASON`
   - `IMPACT`
5. Check downstream prompts for stale assumptions.
6. Propose edits in `.plan-state/prompt-patch-queue.yaml` instead of silently rewriting prompts.
7. Append a lifecycle log entry and update progress context if this review materially changes the plan.

## 参考文件

- `references/plan-review-spec.md` — full review format
- `plan/PLAN-SKILL.md` — planning context
- `SKILL.md` — broader system context
