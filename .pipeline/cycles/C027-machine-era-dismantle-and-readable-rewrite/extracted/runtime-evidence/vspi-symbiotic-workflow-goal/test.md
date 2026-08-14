# Test evidence

Role: `test`

## Contract design

独立 test workers 先建立 failure-first 契约，再由主 Agent 复现 RED。覆盖：

- 并发 writer 原子获取、`SIGTERM` / `SIGKILL` / `SIGSTOP`、自动 recovery、old-owner fencing、target rename 前复核与异常 expiry 有界接管。
- 多 Delivery coexistence、foreground pointer、显式 resume、Workstream Session/evidence/CAS/scope 隔离、跨 Git base 冲突、并行 DAG claim 与乱序 verification。
- stale Plan binding、同 ID 并发 proposal、唯一 Plan authority、Explicit Auto Group 与默认关闭的 context experiment。

审计 remediation 的 6 个 RED 均已转绿：并行 verification 不再丢更新，旧 Plan Workstream 不再 claim 新 revision，无 lock pending 自动恢复，伪造远未来 expiry 有界接管，并在 target rename 前执行最终 fencing。

## Validation

- Focused concurrency/lifecycle suite: `53/53` passed.
- Maintained regression: `npm test`, `667/667` passed.
- Full inventory: `npm run test:all`, `1143` total, `971` passed, `172` failed only in the repository's pre-existing quarantined set. The same quarantined set alone is `304` passed / `172` failed; no maintained failure remains.
- Syntax checks for changed production modules: passed.
- `git diff --check`: passed.

No test worker committed, pushed, or wrote `/home/heyx/VSPi`.
