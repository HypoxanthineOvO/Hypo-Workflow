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

当执行改变项目现实后，在 Plan Review 后使用此 skill。

## 前置条件

- Milestone 已完成
- 架构跟踪处于活动状态或架构基线存在

## 执行流程

1. 读取架构基线。
2. 解析 `output.language` 和 `output.timezone`。
3. 用 `output.language` 总结已完成 Milestone 实际改变了什么。
4. 记录：
   - `ADDED`
   - `CHANGED`
   - `REASON`
   - `IMPACT`
5. 检查下游提示是否存在过时假设。
6. 在 `.plan-state/prompt-patch-queue.yaml` 中提出编辑建议，而不是静默重写提示。
7. 如果此审查实质性地改变了计划，则附加生命周期日志条目并更新进度上下文。

## 参考文件

- `references/plan-review-spec.md` — 完整审查格式
- `plan/PLAN-SKILL.md` — 规划上下文
- `SKILL.md` — 更广泛的系统上下文
