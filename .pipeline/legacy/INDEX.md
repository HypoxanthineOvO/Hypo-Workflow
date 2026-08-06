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

## Live Deliveries

| ID | 类型 | 状态 | 来源 |
| --- | --- | --- | --- |
| c21 | `cycle` | `accepted` | `.pipeline/runtime/objects/delivery/c21` |
| c23-experiment-management | `cycle` | `accepted` | `.pipeline/runtime/objects/delivery/c23-experiment-management` |
| concurrent-work-placement-integration | `goal` | `accepted` | `.pipeline/runtime/objects/delivery/concurrent-work-placement-integration` |
| experiment-protocol-hooks-simplification | `goal` | `pending_acceptance` | `.pipeline/runtime/objects/delivery/experiment-protocol-hooks-simplification` |
| g22-vsp-distribution-contract | `goal` | `accepted` | `.pipeline/runtime/objects/delivery/g22-vsp-distribution-contract` |
| vspi-symbiotic-workflow-core | `cycle` | `superseded` | `.pipeline/runtime/objects/delivery/vspi-symbiotic-workflow-core` |
| vspi-symbiotic-workflow-goal | `goal` | `accepted` | `.pipeline/runtime/objects/delivery/vspi-symbiotic-workflow-goal` |

非终态项必须通过旧兼容入口单独处理，不自动转成 Cycle，也不自动接受或拒绝。
