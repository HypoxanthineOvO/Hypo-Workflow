# C21-M8 Skill Behavior Evaluation

## 结论

Post-M8 Root + 9 Skill 设计在六个代表性工作流中没有出现已测回归。候选版 6 次运行共 `48/48` assertions 通过；冻结的 pre-M8 Skill 基线同样为 `48/48`，delta 为 `0.00`。

这个结果只支持“精简后保持了已测行为”，不支持“新版正确率优于旧版”。两组运行共用当前 Core backend，比较的主要是 Skill 指令与路由，而不是完整历史产品实现。

## 评测矩阵

| Eval | 行为边界 | Candidate | Frozen baseline |
|---|---|---:|---:|
| 1 | Guide -> Init 接管 brownfield，保留源码/Git，不创建 Delivery | `8/8` | `8/8` |
| 2 | 单一 bounded Goal，只提案，不自动批准或开始 | `8/8` | `8/8` |
| 3 | 有依赖顺序的 Cycle，只在聚合完成后人工验收 | `8/8` | `8/8` |
| 4 | Maintain 写入项目偏好，不创建 Rules/Goal/Cycle | `8/8` | `8/8` |
| 5 | 压缩后 Resume，以 Runtime/Continuation 覆盖 stale Pack/legacy state | `8/8` | `8/8` |
| 6 | pending Cycle Reject，先展示完整绑定，再写 Feedback/Receipt | `8/8` | `8/8` |
| **Total** | 6 paired workflows | **48/48** | **48/48** |

每个 eval 另外检查 frozen legacy authority 不被改写、fixture 文件不越权变化、秘密/原始 transcript tail 不落盘，以及最终会话回复必须说明结果、authority 变化、验证、下一步和限制。

## 产物

- Workspace: `/home/heyx/Hypo-Workflow-skill-workspace/iteration-1/benchmark`
- Machine benchmark: `benchmark.json`
- Human summary: `benchmark.md`
- Static review UI: `review.html`
- 每个 canonical run 均包含 `eval_metadata.json`、`outputs/`、`timing.json` 和 `grading.json`

## 公平性与限制

- 每个配置每个 eval 只有 1 次运行，不能计算方差或稳定性区间。
- 协作运行时没有可靠暴露 executor token 与可比较 wall-clock；报告将两项标记为 unavailable，没有用字符数伪造 token。
- 两组 Skill 共享当前 Core backend，因此不能把结果解释为完整 pre-C21 backend 与 post-C21 backend 的历史 A/B。
- secret-marker 全局 assertion 在这些 fixture 中没有正向注入秘密，只能证明没有意外 marker；M7 对抗测试承担真正的 redaction 合同。
- Eval 2 candidate 与 Eval 4 baseline 有被丢弃的 setup/preflight run；canonical paired run 的 fixture hash 与最终 invariants 有效。
- Eval 5 的首个 baseline 与 Eval 6 的 `baseline-invalid-fixture-mismatch-r1` 因 fixture mismatch 被排除；修正后的 baseline-r2 才进入 benchmark。

## Skill Creator 规范影响

评测采用冻结旧 Skill 作为 existing-skill baseline、候选/基线成对运行、客观 assertions、逐 run grading、聚合 benchmark 和静态 review viewer。由于本轮目标是 C21 收口而不是继续调参，没有根据同分结果继续改写 Skill，也没有发起描述触发优化。

## 用户应如何理解

公开命令从大规模 Child Skill 集合缩到 9 个，并没有破坏这六条核心路径；但相同满分说明旧版在这些例子上本来就能工作。新版的主要收益来自更小的发现面、更清楚的 authority 边界和不可复活的清理，而不是这组 benchmark 所能证明的准确率提升。

