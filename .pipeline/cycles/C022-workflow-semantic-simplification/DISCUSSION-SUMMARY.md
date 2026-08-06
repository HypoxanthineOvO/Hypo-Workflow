---
kind: discussion-summary
cycle: C022-workflow-semantic-simplification
updated: 2026-08-05T21:45:00+08:00
raw_discussion: local/discussions/C022-workflow-semantic-simplification/
---

# Workflow 语义简化讨论摘要

## 已确认需求

- Guide 只在用户不知道该使用哪条 Workflow 路径时出现。
- Init 负责理解并初始化项目。
- Plan 是自适应的意图发现；有能力模型只需要清楚的目的、边界、验证目标和进度位置。
- Progress 和人类可读 Execution 是核心职责。
- Cycle 用于隔离和归档不同项目轮次，支持多个 active Cycle，绝不把 Demo 任务混入后续正式版。
- Experiment 以人类可读方式跨 Cycle 管理目的、方案、数据、Attempts 和结果。Maintain 只提升长期事实；两者都不是另一种 Cycle。
- 模型直接编写带 YAML frontmatter 的简短 Markdown。日常写 API、可见 hash、Pack、Receipt 和 routing 机制没有必要。
- 一次性模型辅助 History Refresh 必须保留旧历史，并在激活前经过审阅。
- 用户和助手的可见消息必须严格保存在本地只追加记录中；Git 保存经过审阅的讨论摘要。
- 用户可见 Markdown 使用中文主体，只保留 YAML key、路径、命令和必要专名为英文。
- Progress 必须包含完整计划表，通过稳定的人类可读 ID 与 Plan 对齐，并在 frontmatter 中用 `plan: PLAN.md` 明确反向引用。

## 已作决定

- 使用 template-first 普通文件写入，不提供日常模型可见写 API。
- 完整可见讨论保存在本地，Git 保存 secret-safe 摘要。
- 内部校验保持可选，不进入普通提示词。
- C22 先交付 M1 模板与样例，然后停在 S1。

## 接受与拒绝

- 完整 C22 Proposal 已获批准并立即开始。
- History Refresh 激活没有获批，仍在 S2 阻塞。
- M1 首版 S1 被拒绝，原因是正文主要使用英文。
- M1 中文修订版 S1 被拒绝，原因是 Progress 没有完整计划表，也没有清楚指出自己的 Plan。
- 补充完整计划编码后的 M1 已通过 S1，获准进入 M2。
- History Refresh 预览已通过 S2；用户接受正式语义 Cycle，同时要求旧 archives、Knowledge、Chats 和 live Delivery 保持 legacy 入口。

## 纠正与分歧

- 早期“需要更多工程 gate”的诊断被否决；已接受的根因是 prompt purpose drift 和过度 Workflow ceremony。
- 最小三 API 方案已被普通模板文件写入取代。
- “schema key 使用英文”已经纠正为“只有 key 和必要专名使用英文，用户可见正文使用中文”。
- “Progress 是自由文本摘要”已经纠正为“Progress 是完整 Plan 的实时状态投影”。

## 未决问题

- M5 激活与完整验证结果。
