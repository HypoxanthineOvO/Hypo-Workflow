# C23 Revision 1 M4 最终独立审计

- Worker ID: `c23-m4-audit`
- Role: `audit` only
- Milestone: `M4`
- Verdict: `PASS`
- Test evidence: `m4-retest.md`
- Test evidence SHA-256: `ea944f190db515c44a638d4eccd4b60a8e36dec5fc05c73b870e1124059fe500`

## 结论

M4 在重新冻结的 production/test 基线上通过独立审计。审计期间提出的 11 项软件质量 finding 已全部修复并独立复核，没有遗留 P0 或 P1。

交付边界清晰且一致：Workflow Core 编译确定性的、由 host 持有执行权的 foreground 或隔离 tmux 监督描述符，并持久化已观察到的 Experiment 证据；真正启动和监控进程仍由 host 负责。中断 Attempt、checkpoint 或从头恢复、运行完成、科学复核、人工确认、Receipt recovery 和陈旧 authority 防护都绑定到明确的 Experiment 与 Attempt authority。

## 技术方法与范围

审计组合使用了静态契约检查、临时边界验证、持久化 authority 规范化检查、恢复与状态漂移检查、真实短进程/tmux smoke、聚焦回归、共享 Store 回归和冻结字节复核。

审查的 production 范围：

- `core/src/experiment/supervision.js`：监督计划、中断/恢复证据、运行完成和科学复核契约。
- `core/src/experiment/index.js`：严格 supervised Attempt 持久化、rerun lineage、Receipt-gated review resolution、recovery、fresh authority reread 和 Experiment 写入前置条件。
- `core/src/workspace-store/transaction.js`：可选的逐 write `expected_hash` compare-and-swap 前置条件。
- `core/src/index.js`：公开的 Experiment supervision/review API。

审查的 maintained 验证范围：

- `core/test/c23-m4-experiment-supervision.test.js`
- `core/test/fixtures/c23-m4/supervision-review.json`
- `tests/regression-catalog.json`

本审计没有修改 production、test、Runtime、Continuation、legacy authority、plugin metadata 或 cachebuster；唯一写入是本报告。

## Finding 关闭情况

11 项 finding 均已关闭：

1. tmux session identity 现在以受限长度的确定性 digest 区分 Experiment 与 Attempt。
2. 持久化 supervision plan 会重新派生并精确匹配允许的 tmux session，而不是只信任重新计算的 plan id。
3. checkpoint recovery 要求 Attempt 已保留对应 checkpoint artifact。
4. scientific review 的观察值必须精确匹配同一 Attempt 的指标。
5. supervision、review、parent/child 和 resolution 时间戳构成一致的执行时间线。
6. interrupted parent 的 supervised rerun 必须有且只有一个紧邻开始事件的 restarted event，并显式绑定 parent recovery。
7. 每个 operationally verified artifact 也必须存在于 Attempt output refs。
8. review recovery 将持久化 resolution actor 绑定到 Receipt actor。
9. restarted child 必须精确匹配 interrupted parent 的完整 checkpoint descriptor。
10. 严格 supervised-run 入口会拒绝缺失或 `undefined` 的 supervision/review 证据。
11. Receipt resolution 会重新读取最新 Experiment authority，write-level expected hash 会在安装前拒绝陈旧 authority 更新。

maintained suite 已覆盖上述边界，包括两个陈旧 authority 时间窗和 expected-hash 的 missing/existing 前置条件。

## 验证结果

- M4 standalone：`25/25` PASS。
- M1-M4 加 Record、Receipt、Runtime、workspace transaction：`122` 个顶层 case，`140/140` total PASS。
- Foreground smoke：PASS。
- 隔离 tmux smoke 与清理：PASS；没有遗留 tmux server/session。
- Production/test 语法与 fixture/catalog JSON 解析：PASS。
- Maintained catalog dry-run：选择 `56` 项，包含 M1-M4。
- Full catalog dry-run：选择 `172` 项。
- Protocol-only/no-runner 与 scheduler-authority 静态检查：PASS。
- M4 Core/test 的 Provider/model 词汇隔离检查：PASS。
- `git diff --check`：PASS。
- `.pipeline/runtime/transactions/`：验证后为零 descendant。

审计前后重复采样的 7 个 production/test 冻结 digest 与最终 test evidence digest 均未变化。

## 预期结果

Agent 现在可以把 host 实际运行的长实验绑定到稳定的 Experiment 和 Attempt，说明命令与输出位置、记录中断原因，并明确应该使用声明的 checkpoint 恢复还是从头运行。completed run 必须保留成功运行结果以及 log/config/metrics 证据，不能只留下一个裸完成状态。

Scientific review 会记录同一 Attempt 的真实指标、对比证据、引用和候选原因。可疑或与论文不一致的结果保持等待用户确认，不能静默变为实现错误结论。并发 authority 变化会 fail closed，不会被陈旧的 review resolution 覆盖。

## 遇到的问题

第一次 final-test freeze 无效，因为 3 个新增 maintained case 引用了缺失的 test-only helper。该基线得到 `22` pass、`3` fail，未被接受为证据。随后显式重新打开 test-only freeze，在不改变 production 的情况下补齐 helper，并以 test SHA-256 `2f3f5968cc782d058b6071efbc51f7e10e5480246a98b88e812dfbcd0ecae98e` 重新冻结。最终独立 retest 与本审计都运行在替换后的基线上。

实现审查期间共发现 11 项正确性和恢复问题。每一项都由主实现身份修复、由 maintained test 覆盖，并在给出 PASS 前由本独立 audit 身份复核。

## 残余风险与后续

- Core 验证声明的结构、identity、evidence refs 和 confirmation state；它不启动 workload、不证明远程文件实际存在，也不能证明科学解释正确。Scientific review 仍是 weak oracle，可疑结果必须经过用户 gate。
- Smoke 只运行了本地短进程和本地 tmux，没有运行真实 NeRF、AceSim、GPU、远程 SSH、大 trace 或 `uv` workload；真实项目行为仍需要后续 pilot。
- Same-identity rerun 继续共享 M3 logical output directory，artifact refs 尚无内容 digest。Host 必须在重跑前保留或 trash 旧字节，M5 status 应明确展示该保留状态。
- 同一主机上的两个 clone 如果使用完全相同的 project、Experiment 和 Attempt 标识，仍可能派生相同 tmux session；当前运行假设是一台服务器只有一个 active clone。
- Structured terminal failure 覆盖仍较窄；nonzero process exit、Python exception、GPU OOM 和其他 failure class 需要后续扩展 taxonomy。
- `expected_hash` 会保护 Experiment target file 不被陈旧写入覆盖；更广泛的整机 transaction scheduling/locking policy 不属于 M4。

在上述明确边界内，M4 满足 acceptance contract，可以进行 Milestone verification。
