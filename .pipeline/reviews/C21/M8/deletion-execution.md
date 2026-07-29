# C21-M8 Exact Deletion Execution

## 结论

C21-M8 Phase A 删除已经按用户批准的 exact Manifest 执行完成。执行器只删除了 Manifest 中的 37 个非公开 Child Skill 目录，没有第 38 项，也没有执行更广泛的仓库清理。绑定 Receipt 已进入 `consumed`，不能重放。

## 授权绑定

- Manifest: `.pipeline/reviews/C21/M8/deletion-manifest.yaml`
- Manifest SHA-256: `2bbfa6ff4d1354bcdef2543c4d44bb8b844e7dd266fbc5f95cb5f6d1372176ac`
- Receipt: `receipt-11f1630faba84b0bb53630fd2ee5c1df`
- Receipt intent: `deletion.execute`
- Receipt final state: `consumed`
- Tool use: `c21-m8-phase-a-deletion`
- Bound Git HEAD: `0373266f32a15903c275816707bb03a92ba435e6`
- Bound Git tree: `e2ee6b0cf78fd424c96fe586b04be1dba6b2c79c`
- Bound target-state hash: `cebc929099d130559f23271dc2d639ec4e6b40d21ae3d831e6b54834f472069e`
- Machine execution report: `.pipeline/runtime/evidence/deletion/reports/c21-m8-phase-a-delete.yaml`

## Exact Deleted Paths

```text
skills/analysis
skills/audit
skills/chat
skills/check
skills/compact
skills/debug
skills/docs
skills/explain
skills/explore
skills/help
skills/knowledge
skills/log
skills/optimize
skills/patch
skills/plan-architecture
skills/plan-confirm
skills/plan-decompose
skills/plan-deep
skills/plan-discover
skills/plan-extend
skills/plan-generate
skills/plan-review
skills/plan-technical-stack
skills/pr
skills/quality
skills/release
skills/report
skills/reset
skills/rules
skills/setup
skills/showcase
skills/skip
skills/start
skills/status
skills/stop
skills/sync
skills/watchdog
```

## 执行与核验

执行前，controlled executor 重新检查了路径、目录内容 hash、Git HEAD/tree/target state 和 protected-path policy；随后 reserve Receipt、写 prepared evidence、执行删除、消费 Receipt，并写 applied report。删除报告中的 `deleted_paths` 与 Manifest 路径集合完全相等。

执行后实际 `skills/` 只保留 9 个 Child Skill：`guide`、`init`、`goal`、`plan`、`cycle`、`maintain`、`resume`、`accept`、`reject`。Plugin discovery 与 Registry 投影均为这 9 个路由。

## 问题与边界

- 恢复会话时再次收到的 `approve_exact` 是原门禁的迟到恢复上下文。由于 Receipt 已消费且执行报告已存在，本轮没有重复删除。
- Phase A 没有清理扫描中发现的更大范围历史文件；那部分没有进入用户批准的 Manifest。
- 本次删除可通过 Git 恢复，但不应通过复用旧 Receipt 恢复或重放操作。

