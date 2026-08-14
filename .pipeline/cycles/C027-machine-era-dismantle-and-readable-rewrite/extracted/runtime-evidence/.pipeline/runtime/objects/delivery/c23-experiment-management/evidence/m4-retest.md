# C23 Revision 1 M4 Final Independent Retest

- Worker ID: `c23-m4-test`
- Role: `test` only
- Milestone: `M4`
- Verdict: `GREEN`
- Frozen baseline: post-Finding-11 test-only remediation
- Workflow Runtime/Continuation advancement: none

## 结论

M4 在重新声明的 production/test 冻结基线上通过最终独立复测。M4 maintained 合同为 `25/25` PASS；M1-M4 加共享 Record、Receipt、Runtime、workspace transaction 的组合回归为 `122` 个顶层 case、`140/140` total PASS。冻结后的 standalone 与 combined 两次运行都实际执行了短 foreground 进程和隔离 tmux smoke，均成功清理自身 session，没有干扰或遗留 tmux server。

最终结果证明 Workflow/Core 保持 protocol-only：它编译 host-owned foreground/tmux 监督计划、记录宿主观察到的运行证据和恢复 lineage，但不启动或持有实验进程。严格 completed Attempt 必须有 operational completion 与 scientific review；可疑或论文不一致的结果保持人工确认门，不能被 AI 静默定性为实现错误。

## 技术与变更范围

冻结 production 范围包括：

- `core/src/experiment/supervision.js`：确定性 supervision plan 与 scientific review compiler。
- `core/src/experiment/index.js`：严格 supervised Attempt、恢复 child、Receipt-gated review resolution 与 fresh authority reread。
- `core/src/workspace-store/transaction.js`：write-level `expected_hash` CAS precondition。
- `core/src/index.js`：公开 M4 Core API。

最终测试资产包括：

- `core/test/c23-m4-experiment-supervision.test.js`
- `core/test/fixtures/c23-m4/supervision-review.json`
- `tests/regression-catalog.json` 的 maintained `C23-M4` entry

初次 final retest 暴露冻结 test 文件缺少五个 Finding 11 helper，结果为 `22 pass / 3 fail`。主线程显式重新打开 test-only freeze 后，仅在 M4 test 文件补齐合法并发 authority 构造、Runtime/Continuation 写回、review resolution、transaction path 筛选和 SHA-256 helper；production、fixture、catalog、Delivery authority、legacy authority 与 plugin metadata 均未修改。修复后 test SHA 更新并由主线程重新正式冻结，本报告的 GREEN 只对应重新冻结后的基线。

## 测试设计

M4 maintained 覆盖：

- 纯 foreground/tmux plan 编译、稳定 plan id、Experiment/Attempt session 隔离和 128-byte 上限。
- checkpoint artifact retained evidence、原命令扩展、parent/child checkpoint canonical binding，以及无 checkpoint 时从头重跑。
- interrupted terminal Attempt、same-identity rerun child、事件 sequence、parent lineage 和时间轴。
- exit code `0`、log/config/metrics refs 与额外 verified refs 的 operational completion 绑定。
- review metrics/output/time/Attempt/run identity 绑定，论文引用、多个候选原因和 implementation-only-as-hypothesis policy。
- one-shot target-bound Receipt 的 confirm/dismiss/investigate、substitution、replay、early-time preflight、actor recovery 和 state drift。
- Receipt reserve 后并发 Attempt 的 fresh reread，以及 fresh read 后 transaction prepare 窗口的 CAS 冲突。
- `expected_hash` 的 missing-create、matching-update、wrong-hash、existing-with-null 和 missing-with-digest 行为。
- protocol-only/no-runner 边界、临时 workspace legacy sentinels 和 transaction cleanup。

组合回归额外覆盖 M1 Experiment/Receipt authority、M2 knowledge/metric/concept-to-code 绑定、M3 uv run/scan/resource evidence，以及共享 Record、Receipt、Runtime 和 workspace transaction kernel。

## 验证结果

- `node --test core/test/c23-m4-experiment-supervision.test.js`: `25/25` PASS。
- M1-M4 + Record + Receipt + Runtime + workspace transaction: `122` top-level、`140/140` total PASS。
- 真实 foreground smoke: PASS，短 Node 子进程 stdout/stderr 与 descriptor observation 合同一致。
- 真实 tmux smoke: PASS，隔离 session 可创建、观察、清理；测试后没有 tmux server/session 残留。
- production/test `node --check`: PASS。
- fixture 与 regression catalog JSON parsing: PASS。
- maintained catalog dry-run: `56` selected，包含 M1-M4。
- all catalog dry-run: `172` selected。
- no-runner static scan: PASS；Experiment Core 没有 child-process 或 scheduler authority。
- full repository `git diff --check`: PASS。
- `.pipeline/runtime/transactions/`: `0` descendants。
- M4 临时 workspace legacy sentinel checks: PASS。

全 catalog 的 `56/172` 是 selection dry-run，不是本 Milestone 执行了全部仓库测试；最终执行门是上面的 M4 standalone 与 140-case focused combination。

## 冻结 SHA-256

测试前与全部验证完成后逐项重新采样，以下七项与主线程重新声明的冻结 baseline 完全一致：

- `core/src/experiment/supervision.js`: `976f3f368fcbc4362659a137709e71a55708d0e4e5ac4e88837f06aac7c5f53f`
- `core/src/experiment/index.js`: `a2232f20462587a5205964dfc2ddd25532d09712927990e3efee3d45b3c6d6c2`
- `core/src/workspace-store/transaction.js`: `4a432586659c1ba9053d6229987a9590f78935df2f9af35d9c8234ae18c1c75a`
- `core/src/index.js`: `ea6c73e9d05bb45cf263984fdce11f734135d804b9ac0aa67c369325fa26ce45`
- `core/test/c23-m4-experiment-supervision.test.js`: `2f3f5968cc782d058b6071efbc51f7e10e5480246a98b88e812dfbcd0ecae98e`
- `core/test/fixtures/c23-m4/supervision-review.json`: `039f042f6670c71ed829d848c562c57506d0dce0c219656e706ef903466e8d5f`
- `tests/regression-catalog.json`: `951258d90d78d5c0fe5958c269299f8045851a77ca63cc1ba403cc92a35e2f1c`

## 预期用户效果

Agent 可以盯住一个由 host 实际运行的 foreground 或隔离 tmux 实验，并快速回答它属于哪个 Experiment/Attempt、运行命令和输出在哪里、为何中断、应从 checkpoint 恢复还是从头重跑。完成态不再是裸 `done`：必须绑定成功退出与声明输出。AI 发现可疑值或论文差异时会记录指标、引用和多个候选原因，并请求用户确认，而不是直接宣布实现错误。

## 问题、限制与后续风险

- final retest 第一次运行发现 test-only freeze 不完整；该冻结已明确撤回、修复并重新声明，旧 test SHA `6a6ec21c...` 不得用于 M4 verification。
- smoke 使用本机短 Node 进程和 tmux，没有运行真实 NeRF、AceSim、GPU、远程 SSH、大 trace 或 `uv` workload；真实项目行为仍需后续 pilot 验证。
- Core 验证 review 的结构、证据和确认状态，不能证明 AI 的科学解释正确；scientific semantics 仍是 weak oracle。
- same-identity rerun 仍共享 M3 logical output directory，artifact ref 尚无内容 digest；host 必须在重跑前保留或 trash 旧输出，M5 status 应显式暴露这一点。
- 同标识的两个 clone 在同一主机仍可能生成相同 tmux session；常规假设是一台服务器一个 clone。
- 通用 nonzero exit、Python exception、GPU OOM 等 failure taxonomy 尚未扩展，当前结构化 terminal failure 主要覆盖 M3 host-memory exhaustion。

在上述边界内，M4 满足其 acceptance contract，可交给独立 audit 在相同冻结 SHA 上完成最终审查。
