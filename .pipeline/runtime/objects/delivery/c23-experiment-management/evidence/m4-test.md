# C23 Revision 1 M4 独立测试合同与预冻结验证

- Worker ID: `c23-m4-test`
- Role: `test` only
- Milestone: `M4`
- Task assessment: complexity `material`; uncertainty `moderate`; oracle strength `strong` for authority/schema behavior and `weak` for scientific semantics; blast radius `experiment authority`; reversibility `reversible`; hazards `runner_authority`, `rerun_lineage`, `receipt_replay`, `scientific_overclaim`, `secret_exposure`, `path_escape`
- Current verdict: `GREEN (pre-freeze, non-final)`
- Workflow Runtime/Continuation advancement: none

## 结论

M4 的独立 maintained 合同当前通过 `22/22`。它证明 Workflow/Core 只编译 host-owned 的 foreground/tmux 监督描述符并记录已观察证据，不启动或持有实验进程；中断 Attempt、checkpoint 恢复、restart-from-scratch、严格完成态、科学合理性 review，以及人工确认 Receipt 都有可执行的结构化合同。

M1-M4 与共享 Record、Runtime、Receipt、workspace transaction 组合回归由 Node 报告 `137/137` PASS（`119` 个顶层 case，另含嵌套 subtests）。当前结果不是最终 retest：独立 audit 仍在进行，production 尚未 freeze；audit remediation 完成后必须重新运行并生成单独的 `m4-retest.md` 与最终 SHA-256。

## 测试合同

### 监督计划与 no-runner 边界

- `compileExperimentSupervisionPlan` 对相同输入产生稳定 `plan_id`，不修改调用者输入。
- plan 明确记录 `runner_authority: host` 与 `workflow_is_runner: false`；Core 源码不导入 `node:child_process`，也不持久化 scheduler/job/process/PID/tmux authority。
- foreground plan 保留结构化 cwd/argv/env 与 log/config/metrics observation path。
- tmux session 由 `project_id + experiment_id + attempt_id` 确定性派生到 `hw-exp-*` namespace，并带 12 位 digest；caller 不能提供任意 session，超长可读主体截断后总 UTF-8 长度不超过 128。
- 测试 harness 实际执行一个短 Node 进程，并实际创建、观察和清理一个唯一 tmux session；运行前后的既有 tmux session 集合保持不变。

### 中断、恢复与完成态

- interrupted Attempt 必须以有序 `started -> interrupted` events 结束，并记录 `reason_code`、可选 signal、evidence ref、self-bound `interrupted_attempt_id` 与 terminal event sequence。
- 不支持 checkpoint 时 recovery 固定为 `restart_from_scratch`；支持 checkpoint 时 artifact 必须位于 run output 目录并保留在 Attempt `output_refs`，resume argv 必须扩展原始 `uv run --frozen ...` command 并显式携带该 artifact。
- 恢复执行是同 identity 的新 rerun Attempt。child 的 `rerun_of_attempt_id`、recovery `interrupted_attempt_id`、`interruption_event_sequence` 和完整 checkpoint plan 必须共同绑定一个 terminal interrupted parent；错误 parent、sequence、重复/错位 `restarted` event 或 command drift 在写入前拒绝。
- supervision 首末 event 必须 exact-match Attempt `started_at/finished_at`，恢复 child 不能早于 parent 完成。
- 严格入口 `recordSupervisedRun` 不改变 M3 legacy `recordRun` 兼容面。严格 completed outcome 必须含 supervision 与 scientific review；operational completion 必须为 exit code `0` 并验证声明的 log/config/metrics refs。

### 科学 review 与人工确认

- review 绑定 Attempt id、run id、identity hash、完成时间、outcome metrics、保留的 output refs、metric evidence、reference、reason code 与 candidate causes，并生成 `review_id`/`review_hash`。
- `reasonable` review 不要求确认；`suspicious`/`inconsistent` review 保持 pending，不能静默确认。
- 与论文结果不一致时至少保留 reference evidence 和两个不同 cause category；implementation 只能作为 hypothesis，`implementation_error_confirmed` 被拒绝。
- persisted normalizer 重放 compiler semantic policy。即使调用者使用公开 canonical hash 重新签名，单一 implementation cause 或 confirmed-implementation reason code 仍不能进入 Experiment authority。
- `experiment.review.resolve` target 完整绑定 attempt/review id、review hash、decision 与 rationale。`confirm|dismiss|investigate` 通过 one-shot Receipt 解决；target substitution、Experiment state drift 和 consumed Receipt replay 均拒绝且不改变 Experiment authority。
- review 不能早于 operational completion，resolution 不能早于 review；已知的 early-resolution 时间错误在 Receipt reserve 前零写入拒绝。
- authority-activated resolution recovery 必须保持 persisted resolution actor 与 Receipt actor canonical-equal；forged actor 不得消费用户 Receipt。

## RED 到 GREEN 演进

第一次执行与主线程 production 实现并发发生，得到 `3 pass / 12 fail`；其中多数是测试初稿与已落地公开 schema 的字段布局差异，未作为 production finding。测试随后按公开契约校准到 `15/15`。

扩展权威边界后，测试与独立审视推动并固化了以下 closure：

1. checkpoint `artifact_ref` 必须出现在 resume argv，且 resume argv 不能换成另一脚本或另一组原始参数。
2. persisted scientific review 必须重放 compiler policy，不能只验证 caller 可重算的 hash。
3. interrupted 是 terminal Attempt；恢复必须作为 same-identity child rerun，并绑定 parent Attempt 与 parent terminal event sequence。
4. child 首次 normalize 能看到 parent，但 `appendAttempt` 二次 normalize 曾在写入 `rerun_of_attempt_id` 之前运行，导致合法 restarted child 被拒绝。该真实缺口在一次校准后的运行中表现为 `17/18`；修复 parent context 传递后恢复 GREEN。
5. tmux session 增加 Experiment 维度与 deterministic digest，并在 persisted normalize 中 exact-recompute，阻断跨 Experiment collision 和 re-signed session substitution。
6. metrics、Attempt/supervision/review/resolution 时间轴、checkpoint retained evidence、单一 sequence-2 restart、parent/child checkpoint command 与 operational verified refs 均改为闭合绑定。
7. early resolution 由 reserve 后失败改为 reserve 前 preflight；authority-activated review recovery 增加 actor binding。
8. strict entry 区分 missing 与 explicit `undefined`，两者均不能绕过 supervision/review requirement。

测试没有通过删除或放宽上述断言获得 GREEN。

## 当前验证结果

- `node --test core/test/c23-m4-experiment-supervision.test.js`: `22/22` PASS。
- M1-M4 + Record + Runtime + Receipt + workspace transaction combined: Node `137/137` PASS；`119` top-level cases。
- production/test `node --check`: PASS。
- M4 fixture 与 regression catalog JSON parsing: PASS。
- maintained catalog dry-run: `56` selected，包含 M1-M4。
- all catalog dry-run: `172` selected。
- full repository `git diff --check`: PASS。
- `.pipeline/runtime/transactions/`: `0` descendants。

## 当前测试资产

- `core/test/c23-m4-experiment-supervision.test.js`
- `core/test/fixtures/c23-m4/supervision-review.json`
- `tests/regression-catalog.json` 中的 `C23-M4` maintained entry

测试 worker 未修改 production、Delivery Runtime/Continuation、legacy authority、plugin metadata、版本或 cachebuster。

当前测试资产 SHA-256（仅用于 pre-freeze 对照）：

- test: `3d5ee631a3fcfe666d9914abfbe8e35bf7d924bbf09ecf72220831a639f02863`
- fixture: `039f042f6670c71ed829d848c562c57506d0dce0c219656e706ef903466e8d5f`
- regression catalog: `951258d90d78d5c0fe5958c269299f8045851a77ca63cc1ba403cc92a35e2f1c`

## 预期用户效果

Agent 可以长时间盯住 foreground 或隔离 tmux 实验，但 Workflow 只保存稳定 plan 与 observation。中断后，用户能看到为什么中断、是否有 checkpoint、应该 resume 还是从头 rerun，以及恢复 child 对应哪个 parent。完成不再是一个裸 `down` 或 `done`：它必须带成功退出与 log/config/metrics 证据。AI 对论文不一致或可疑结果只能提出结构化 review 和多个候选原因，最终判断由用户 Receipt 确认。

## 问题与限制

- 并发实现导致首次 RED 混入 schema calibration noise；报告已将其与真实 production finding 分开。
- 真实 smoke 使用短 Node 进程和本机 tmux，不代表 NeRF/AceSim 的实际 `uv` command、GPU、远程 SSH 或大 trace 已运行。
- Core 能验证 scientific review 的证据结构、引用和确认状态，不能证明 AI 的科学解释正确；这里仍是 weak oracle，pending confirmation 是必要边界。
- 当前只运行 focused combined regression；maintained/all catalog 仅 dry-run，未在本阶段执行全部 `56/172` 个文件。
- Receipt resolution 的正常、漂移、replay、early-time preflight、authority-activated recovery 和 forged actor 路径已覆盖；尚未为每个 workspace transaction fault phase 建立完整 M4 专用矩阵。
- supervised `failed` 仍沿用 M3 的 host-memory `resource_exhausted` schema；普通 nonzero exit、Python exception 或 GPU OOM 尚不是通用结构化 failure 类型。
- production 尚未 freeze。本报告不能作为 M4 最终 `test` evidence 参与 Milestone verification。
