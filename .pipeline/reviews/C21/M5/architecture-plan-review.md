# C21-M5 Architecture Plan Review

- Reviewed Milestone: `C21-M5`
- Baseline: `.pipeline/architecture.md`
- Completion report: `.pipeline/reports/04-reference-repository-bootstrap-and-schema-activation.report.md`
- Review time: `2026-07-12T11:56:42+08:00`
- Verdict: `BASELINE HOLDS / DOWNSTREAM PATCH PROPOSALS REQUIRED FOR M7-M8`

## ADDED

- 显式 Bootstrap `pending -> accepted` lifecycle，以及 checkpoint-bound immutable acceptance companion。
- Future checkpoint 的四文件 legacy freeze inventory；当前 sealed checkpoint 的 self-hashed compatibility binding。
- Strict Snapshot/File evidence union、`verified_evidence_hash` 和 `legacy_freeze_inventory_hash`。
- Acceptance-time 四节点 Recovery head 与 post-accept 第五节点 closure Pack 的线性 ancestry。
- Lowest-boundary pending mutation gates，覆盖 transaction、Journal blob/append 和 Retention deletion。

## CHANGED

- M5 不再以“activation + fresh restore”直接完成；必须先保持 rollback 可执行，再经过独立 acceptance authenticity review 才能关闭 rollback window。
- Live C21 authority 已从 legacy state/log/progress 切换为 Manifest、Runtime/Continuation、Record Store、Journal/Capsule/Pack 和 Snapshot。
- `.pipeline/architecture.md` 现在是切换时的规划基线和 source evidence，不再作为 post-activation lifecycle authority。本 Review 因此没有绕过 single-writer fence 直接追加该旧文件；durable delta 将由 Record Store 保存。

## REASON

- 首次独立终审证明：允许 pending checkpoint 之后继续写合法 descendants，会使 rollback baseline 漂移而又缺少 accepted fact。
- 第二次独立复审证明：companion self-hash 只能证明文档没改，不能证明 legacy freeze 和 evidence 本身真实。
- Revision 2 将“状态自洽”“证据真实”“历史冻结”合并为同一次可复验 acceptance 事实。

## IMPACT

### M6

`05-goal-cycle-delivery-core-and-adaptive-plan.md` 可以原样执行。它依赖的 Runtime、Records、Receipts、Recovery 和 explicit start/acceptance 基础均已建立；M5 新增的 Bootstrap acceptance 是内部迁移生命周期，不改变 Goal/Cycle peer contract，也不新增公开命令。

### M7

核心方向仍然成立，但 deletion/permission implementation 需要新增默认 protected authority/evidence policy。任何 Deletion Manifest 都不能把当前 Manifest、Runtime/Continuation、Journal、Capsule、Records、Snapshots、Packs、Bootstrap acceptance companion、rollback checkpoint 或 compatibility binding 当作普通 cleanup candidate。

### M8

Cleanup gate 仍然成立，但 dependency scan 和 exact Manifest 必须显式区分 legacy residue 与 accepted-bootstrap evidence。删除 compatibility binding 或 companion 会破坏已封存 Pack/evidence graph；除非另有已审计 retention/replacement 方案和新的 exact Receipt，否则必须保留。

### Prompt Updates

- M6: `none`
- M7: `proposed`, 增加 accepted-bootstrap protected set 与 negative tests
- M8: `proposed`, 增加 legacy-residue/evidence classification 和 preservation preconditions
- Proposal queue: `.plan-state/prompt-patch-queue.yaml`

## 结论

总体架构基线继续成立，M6 可安全开始。M7/M8 不需要重新 Decompose，但在各自开始前应审阅并批准 patch proposal；Plan Review 不直接修改下游 prompt。

