# VSPi 0.2.0 Target Goal Input

Status: `source contract verified / target-local Goal required`.

本文件只准备 `/home/heyx/VSPi` 的后续本地 Goal 输入。本 source Goal 不修改 `~/VSPi`，不复制 Hypo-Workflow 的 runtime state，也不声称 VSPi `0.2.0` 已经实现。

## Read-only baseline

2026-07-23 的只读检查显示：

- `package.json` 为 `vspi@0.1.0`，Node.js/TypeScript，直接依赖 Pi Coding Agent 与 Pi TUI `0.81.1`。
- 仓库处于 unborn `main`，所有项目文件均未跟踪；目标 Goal 必须先保护这一 dirty baseline，不能清理或重置。
- `.pipeline/manifest.yaml` 已存在，所以这个项目不需要重新 `/hw:init`。
- foreground Delivery `vspi-v0-1-0-usability` revision 2 正在执行 M2。
- 该 Plan 的 pending M6 仍描述独立 `LocalPlanBackend`，M8 仍把 Plan capsule 绑定到该本地后端。这两项与新的唯一 Plan authority 冲突，必须在执行前通过目标仓自己的反馈/修订流程正式 supersede，不能直接改 runtime YAML。

## Target outcome

VSPi `0.2.0` 使用 typed adapter 加载版本匹配的 Hypo-Workflow Core。`/plan` 成为 Workflow Plan 的原生 TUI 投影；每个 Pi Session 可绑定一个独立 Workstream；多个 Session、Delivery 和模型可以并行工作。VSPi 继续拥有 Pi runtime、模型解析、工具执行和界面，Hypo-Workflow 不管理项目进程。

## Required target modules

建议先在目标 Goal 中确认最终命名，再按以下 ownership 拆分：

- `src/workflow/core-loader.ts`：解析版本匹配的 Core bundle，拒绝 contract version mismatch。
- `src/workflow/hypo-adapter.ts`：封装 Delivery、Workstream、resume、claim 和 evidence typed calls。
- `src/workflow/session-binding.ts`：维护 Pi Session 到 Workstream 的显式 binding，不复制 Plan 到消息历史。
- `src/workflow/model-router.ts`：接收 routing tier/capability filter，在 VSPi model catalog 中解析具体模型，维护 Auto 与 pinned 状态。
- `src/workflow/context-experiment.ts`：只提供默认关闭的 feature flag、指标与 Pi native compaction fallback。
- `src/app/vspi-app.ts`：将 `/plan`、Session switch/fork/new、model group 与 Workstream lifecycle 接通。
- `src/backend/pi-backend.ts` 与 `src/backend/types.ts`：暴露稳定 Session identity 和 turn/Worker 模型切换边界，不把 Provider/model 写回 Core。
- `src/domain/commands.ts`、`src/domain/types.ts`、`src/ui/panels.ts`：把现有 deferred `/plan` 和 fixture Plan/ModelGroup 视图接到真实 adapter。

## Migration rules

1. 先记录目标仓 unborn/dirty baseline；未经用户授权不要 commit、tag、push 或发布。
2. 通过当前 Delivery 的正式 feedback/revision 或一个明确关联的 target-local Goal，先 supersede M6/M8 的 Local Plan ownership，再开始相应实现。
3. 已初始化项目直接读取 Manifest 与 Deliveries；只有确实没有 Manifest 的项目才提示显式 `/hw:init`。
4. `active.delivery` 仅作为默认 foreground 展示。显式 Session binding/resume 必须使用 object ref，不能靠覆盖 pointer 模拟并发。
5. 如果未来发现真实 `0.1` Local Plan 数据，只允许用户确认的一次性 import；import 后以 Workflow Plan 为唯一写入端，不长期双写。
6. Context retrieval 保持 opt-in；没有指标证明收益时使用 Pi native compaction。

## Target acceptance matrix

| Area | Required evidence |
| --- | --- |
| Plan authority | `/plan` 只读写 Workflow Plan；未初始化项目要求 `/hw:init`；无 Local Plan fallback/dual-write |
| Session isolation | new/switch/fork/resume 分别绑定正确 Workstream，transcript、evidence、Continuation 和 recovery 不串写 |
| Concurrency | 两个 Pi Session 可在同一或不同 Delivery 上并发；scope/claim/CAS 冲突明确失败 |
| Model groups | Auto 根据 tier + capability filter 解析；manual pin 持续到显式切回 Auto；fallback 可审计 |
| Compaction | 实验默认关闭；Pi native path 通过；实验记录 token、latency、miss rate |
| Compatibility | 已有 accepted `vspi-tui-v1` 和 executing `vspi-v0-1-0-usability` evidence 保留，foreground UI 不回归 |
| Quality | `npm run check`、`npm test`、`npm run build`、`npm run smoke`、真实 PTY/Session fixtures 与独立审计通过 |

## Non-targets

- 不让 Hypo-Workflow 启动、停止或监督项目进程。
- 不在 Hypo Core 中保存 Provider、model id、credential 或模型专用 prompt。
- 不从本 source Goal 写入、清理、commit 或发布 `/home/heyx/VSPi`。
- 不复制 source `.pipeline/runtime` 到 target。
- 不把 `active.delivery` 恢复成全局排他锁。
