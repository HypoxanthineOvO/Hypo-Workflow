# History Refresh 预览报告

## 结论

当前 20 个旧 Cycle 可以映射为新的只读语义 Cycle。预览为每个 Cycle 生成 Plan、Progress、Execution、Discussion Summary 和 Summary，但不复制 594 个旧归档文件；详细 prompts、reports 和 reviews 继续引用原路径。旧文件没有被修改，Manifest 也没有切换。

本预览**不具备激活授权**。当前仍有 1 个非终态 live Delivery，必须在 S2 明确处理。

## 源数据

| 类别 | 数量 |
| --- | ---: |
| `.pipeline` 源文件（排除 preview/local） | 1270 |
| 旧 Cycle | 20 |
| 旧 Cycle 文件 | 594 |
| Memory Records | 71 |
| 旧 Knowledge 文件 | 11 |
| 旧 Chat 状态文件 | 12 |
| Patch 文件 | 8 |
| PR 文件 | 30 |
| Live Delivery | 7 |

## 映射方式

- `cycle.yaml` 与 `state.yaml` 生成稳定的历史 Plan 和最终 Progress 表。
- milestone history 与 report 路径生成高层 Execution checkpoint。
- `summary.md` 进入新的 Summary；缺失时使用 `cycle.summary` 并标记不确定。
- `confirm-summary.md` 只作为接受证据引用，不伪造逐字 Discussion。
- 71 个 Memory Records 保持原路径，预览重建人类可读索引。
- 旧 Knowledge、Chats、Patches、PR 和 live deliveries 保留原位，不在没有语义依据时强行归类。

## 覆盖与缺口

- 旧 Cycle 映射：20/20。
- 缺少 `summary.md`：C2-new-cycle。
- 缺少 `PROGRESS.md`：C13-opencode-ux-enhancement、C14-prompt-compatibility-audit。
- Live Delivery 状态：accepted=5，pending_acceptance=1，superseded=1。

## 不确定项与风险

- C1-v9-opencode-native-adapter 缺少 knowledge-summary.md，预览只能使用其他来源补足。
- C2-new-cycle 缺少 summary.md、knowledge-summary.md，预览只能使用其他来源补足。
- C3-opencode-multi-agent-matrix-and-v10-analysis-preset 缺少 knowledge-summary.md，预览只能使用其他来源补足。
- C4-knowledge-ledger-global-tui-acceptance-loop-explore-mode 缺少 knowledge-summary.md，预览只能使用其他来源补足。
- C5-hypo-workflow-c5-follow-up-ai-coding-workflow-redesign 缺少 state.yaml invalid YAML，预览只能使用其他来源补足。
- C8-experience-rules-review-rtl-codex-plugin 缺少 state.yaml invalid YAML，预览只能使用其他来源补足。
- C13-opencode-ux-enhancement 缺少 PROGRESS.md、knowledge-summary.md，预览只能使用其他来源补足。
- C14-prompt-compatibility-audit 缺少 state.yaml invalid YAML、PROGRESS.md、knowledge-summary.md，预览只能使用其他来源补足。
- Live Delivery experiment-protocol-hooks-simplification 状态为 pending_acceptance，激活前必须解决或明确保留。
- 11 个旧 Knowledge 文件可能与 Memory Records 重叠，需要人工去重。
- 12 个旧 Chat 状态文件没有可靠 Cycle 绑定，不自动归入 Discussion。

## S2 需要判断

1. 是否接受“语义摘要层 + 旧详细历史只读引用”，而不是复制全部旧文件。
2. 非终态 live Delivery 应先完成/拒绝，还是在激活时作为单独 legacy work item 保留。
3. 旧 Knowledge 与 Memory 的重叠是否交给后续 Maintain 人工去重。

接受 S2 之前，不写 `.pipeline/cycles/` 中的 20 个历史 Cycle，不修改 `.pipeline/manifest.yaml`，不删除 `.pipeline/archives/`。
