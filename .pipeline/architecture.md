# C11 Audit 审计治理强化 - Architecture Snapshot

## 当前目标

本轮 C11 不是普通功能开发，而是对 Hypo-Workflow 的 audit 治理能力做结构性增强。目标是让 audit 成为执行主线中的硬 gate，而不是结束时附带的一次浅层 review。

## 关键升级方向

1. `audit` 拥有中途介入和打回权，不需要等 milestone 即将完成。
2. `audit` 可拒绝 `milestone`、`feature`、`cycle` 三个层级。
3. `blocked` 不是 implement 单方面宣布；只能由 implement 提出，audit 审批。
4. 引入持久化 `audit memory`，记住项目级 rules、用户特殊要求和 cycle 决策。
5. Plan 阶段必须有固定审计问题组，并在 P2/P3 回显审计契约。
6. 每个 milestone 默认只有一个 canonical prompt file；需要委派时才在固定 derived 路径下生成 `orchestrator/test/implement/audit` 的 subworker prompts。
7. 返工采用增量 `rework prompt`，保留与原 prompt 的可追溯关系。
8. spawn 串权是重点风险，尤其是同一 worker 同时承担 `test` 与 `implement`。

## 当前授权与边界

- execution subworkers: authorized
- mode: strict
- scope: `/hw:plan`, `/hw:start`, `/hw:resume`
- roles: `test`, `implement`, `audit`

当前执行按 `strict` worker separation 规划：`test`、`implement`、`audit` 必须保持独立，audit 有权因串权、伪测试、用户要求遗漏、worker lifecycle 不完整而拒绝。

## 规划中的新产物

- `audit memory` 持久化文件
- `rejection artifact`
- `blocked evidence`
- 每个 milestone 的 canonical prompt file，以及按需生成的 `orchestrator/test/implement/audit` derived prompts
- `rework prompt`
- 相关 focused tests 与 canonical examples

## 配套治理

- C10 的 live prompts 已归档，避免新 cycle 读取旧 prompt truth。
- Codex skill source 使用 snapshot 副本，不直接读取热修改中的工作仓库。
