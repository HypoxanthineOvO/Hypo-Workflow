---
kind: legacy-index
status: read-only
---

# Legacy 索引

这些路径保持原样，不是普通 Session 的默认上下文：

- Archives：`.pipeline/archives/`
- Knowledge：`.pipeline/knowledge/`
- Chats：`.pipeline/chats/`
- Patches：`.pipeline/patches/`
- PR：`.pipeline/pr/`
- 旧 Manifest 与 live Delivery：`.pipeline/manifest.yaml`、`.pipeline/runtime/objects/delivery/`
- 旧机器时代配置与提示词：`.pipeline/config.yaml`（C026 标记退役）、`.pipeline/prompts/00-07`（C21 机器时代，见 `README-LEGACY.md`）
- 旧阶段制 Plan 实现（C026 标记退役）：`core/src/planning`、`core/src/batch-plan`、`core/src/deep-plan`、`core/src/progressive-discover`、`core/src/delivery`

## Live Deliveries

C026（2026-08-14）审计后，以下旧 live Delivery 全部归档为只读历史；日常权威是语义 Cycle（`.pipeline/cycles/INDEX.md`），`.pipeline/runtime/active.yaml` 仅作旧兼容回退指针。

| ID | 类型 | 状态 | 来源 |
| --- | --- | --- | --- |
| c21 | `cycle` | `archived (C026)` | `.pipeline/runtime/objects/delivery/c21` |
| c23-experiment-management | `cycle` | `archived (C026)` | `.pipeline/runtime/objects/delivery/c23-experiment-management` |
| concurrent-work-placement-integration | `goal` | `archived (C026)` | `.pipeline/runtime/objects/delivery/concurrent-work-placement-integration` |
| experiment-protocol-hooks-simplification | `goal` | `accepted (C026 S1)` | `.pipeline/runtime/objects/delivery/experiment-protocol-hooks-simplification` |
| g22-vsp-distribution-contract | `goal` | `archived (C026)` | `.pipeline/runtime/objects/delivery/g22-vsp-distribution-contract` |
| vspi-symbiotic-workflow-core | `cycle` | `archived (C026)` | `.pipeline/runtime/objects/delivery/vspi-symbiotic-workflow-core` |
| vspi-symbiotic-workflow-goal | `goal` | `archived (C026)` | `.pipeline/runtime/objects/delivery/vspi-symbiotic-workflow-goal` |

- `experiment-protocol-hooks-simplification`（Hooks 非阻塞化）的原 `pending_acceptance` 状态在 C026 S1 由用户接受审计矩阵时一并确认接受，后续不再走旧兼容入口验收。
- 其余条目的终态已是 `accepted`/`superseded`，仅补归档标记，不移动目录、不破坏旧引用。

非终态项必须通过旧兼容入口单独处理，不自动转成 Cycle，也不自动接受或拒绝。
