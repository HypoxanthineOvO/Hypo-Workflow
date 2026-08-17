# VSPi 0.2.0 集成合同

本页定义 VSPi 宿主与 Hypo-Workflow 之间的集成合同（边界、并发、模型路由与 API），主要面向做 VSPi/Pi 侧接入的开发者。

VSPi 与 Hypo-Workflow 的关系是宿主与项目事实内核，不是进程管理器与被管理进程。VSPi/Pi 继续负责 Session、模型调用、工具执行和 TUI；Hypo-Workflow 只负责 Plan、Delivery、Workstream、证据、Continuation、Recovery 与审计记录。

## Authority 边界

- Hypo-Workflow 是项目 Plan 的唯一 authority。VSPi 的 `/plan` 只投影和编辑 Workflow Plan，不保留长期 Local Plan fallback，也不双写第二份 Plan。
- 未初始化项目必须显式运行 `/hw:init`。VSPi 不静默创建本地 Plan。
- `active.delivery` 只是旧宿主可见的 foreground pointer。它不表示整个项目只能存在一个非终态 Delivery。
- Session 在需要权威路由或资源 claim 时通过 Work Placement 显式选择一个 Work Item（Delivery 或 Experiment）；Delivery 内的并行 Worker 仍使用 Workstream。存在多个候选时不得静默继承 `active.delivery`，但未绑定状态不阻断普通提示、工具、诊断或 Experiment 文件记录。
- 一个 Project authority root 可以登记多个 Repository Target。stable repository identity 与可变 locator 分离，每个 Repository 可以有一个 primary 和后续兼容的 alternate integration target。
- Hypo-Workflow 不启动、停止或监督项目进程，也不持有覆盖整个 Agent turn 的全局锁。

## 并发与恢复

一个工作区可以同时存在多个 Delivery；同一 Delivery 中 dependency-ready 的 Milestone 可以由不同 Workstream claim。Workstream 使用 generation CAS、Session 唯一绑定、Git base 和 path scope 约束来拒绝 stale update 与冲突写入。

Delivery 和 Experiment 的 Repository/resource claims 在一次短 transaction 内完成评估与 lease 获取。判定只有 `shared`、`isolated_worktree`、`isolated_resources` 和 `blocked` 四种。Core 只返回 bounded `argv[]` Host action descriptor，不运行 Git、创建 worktree、分配 GPU 或执行 merge。源码变更必须提供与 claim 和 integration target 一致、带 digest 的 Git ancestry proof，才能通过 Delivery 最终完成门禁。

工作区 mutation 仅在一次短 transaction commit 内获取 writer lease。lease 使用 owner token 与 fencing；后继 writer 会在 lease 失效后自动恢复 pending transaction。普通读取不需要获取 writer lease，终端或 writer 被 `SIGTERM`、`SIGKILL` 或意外关闭后也不要求用户手工删除 lock。

## Model Group

Hypo-Workflow 只输出任务难度与能力需求，不选择具体 Provider 或 model id。VSPi 根据这些信号执行 Explicit Auto Group：

| Core signal | VSPi responsibility |
| --- | --- |
| `mechanical` / `standard` / `explore` / `critical` / `escalation` | 解析到当前可用模型组 |
| `vision` / `tool_use` / `context_window` | 过滤不满足能力的候选模型 |
| `selection_mode=auto_group` | 在 turn 或 Worker 边界选择模型 |
| `selection_mode=manual` | 保持用户 pinned model，直到用户切回 Auto |

Provider、model id、credential 和模型专用 prompt tuning 不进入 Hypo-Workflow Core 或项目证据。

## 上下文实验

bounded capsule 与 typed on-demand read 只定义为实验接口，默认关闭。VSPi `0.2.0` 的稳定 fallback 仍是 Pi native compaction。实验必须记录 `input_tokens`、`latency_ms` 和 `miss_rate`，不能在没有数据的情况下替代原生压缩。

## Typed API

VSPi adapter 从版本匹配的 Hypo-Workflow Core bundle 调用 root exports：

- `createDeliveryStore({ clock })`
- `createWorkstreamStore({ clock })`
- `createRepositoryTargetStore({ clock })`
- `createWorkPlacementStore({ clock, lease_ttl_ms })`
- `resolveWorkItemSession(root, { host, session_id })`
- `compileVspiIntegrationContract({ generated_at })`
- `parseVspiIntegrationContract(value)`

每次 mutation 使用唯一安全的 `{ id }`，并传入目标项目 `root`。具体模型解析、Pi Session 生命周期和 TUI 状态保持在 VSPi 内部。

目标仓实现范围与迁移检查表见 [VSPi 0.2.0 target Goal input](../../.pipeline/integrations/VSPi-0.2.0-target-goal-input.md)。
