---
kind: requirement
name: stop-that-shit-task-boundary
level: constraint
scope: project
status: active
updated: 2026-08-21
supersedes: []
sources:
  - C028 Discussion，用户明确要求，2026-08-21
---

# Stop That Shit 任务边界

所有工作严格遵循 Stop Ladder：增加用户未命名的工作前，必须确认它是否由用户要求，或是否有当前可达的代码、数据、用户决定、平台要求、部署状态或验收条件证明其为完成请求所必需，并确认省略它会导致当前任务失败。无法证明时不实施；有价值时只报告或留待讨论。

不得添加没有明确消费者和决策用途的 hash、checksum 或内容指纹；不得借当前任务进行未经请求的相邻重构、架构整理或顺手清理。用户明确要求，或可达证据证明为当前正确性所必需的 hash、重构、caller、fixture、测试、兼容性与迁移工作仍应保留。目标是最小正确结果，不是机械追求更少文件或代码行。

