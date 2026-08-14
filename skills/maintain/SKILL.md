---
name: maintain
description: 保存一条已确认的长期 requirement、preference、decision 或 feedback，不创建新的工作容器。
---

# Maintain

## 输出语言规则

用户可见内容跟随当前对话或项目语言；YAML key、命令、路径和必要专名保留英文。

Maintain 是记忆动作，不是独立工作轨道。

1. 确认事实内容、来源、适用范围，以及它是否替代已有事实。
2. 将它归类为 `requirement`、`preference`、`decision` 或 `feedback`，并标 `level`：`constraint`（必须）、`guideline`（应该）、`reference`（参考方法）。
3. 按 Memory 模板写入语义化 Markdown，使用可读文件名（`kind-语义名.md`），放入 `memory/global/rules`（约束级）、`memory/global/requirements`（需求/决定/偏好）或 `memory/global/knowledge`（知识方法），并更新 `memory/INDEX.md`。不得使用哈希或 UUID 命名。
4. 如果事实只适用于一个 Cycle 或 Experiment，将 scope 写清；不要错误提升到整个项目。
5. 如果新事实改变旧事实，通过 `supersedes` 保留关系，不覆盖历史。
6. 在聊天中说明保存了什么、适用范围、来源和替代关系。

主模型即使没有 Hook，也要识别用户明确说出的长期事实。解释后可以直接保存，不需要额外执行 gate。不要把 brainstorming、临时诊断、模型推断或模糊话语写成权威事实。

Discussion Ledger 负责保存可见原文；Memory 只保存提炼后的长期事实。不要保存原始密码、token、凭据、隐藏推理或 system/developer prompt。

如果请求包含实际交付，应在当前 Cycle 使用 Goal 或 Plan，而不是用 Maintain 代替执行。
