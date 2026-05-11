# C11 Plan Confirm Summary

## 项目

- Cycle: C11
- 名称: Audit 审计治理强化
- Workflow kind: build
- Preset: tdd
- Feature 数: 1
- Milestone 数: 8

## 生成文件

- `.pipeline/cycle.yaml`
- `.pipeline/state.yaml`
- `.pipeline/feature-queue.yaml`
- `.pipeline/confirm-summary.md`
- `.pipeline/architecture.md`
- `.pipeline/PROGRESS.md`

## 关键确认点

- `audit` 从附属检查升级为执行主线中的硬治理角色，具备中途打回能力。
- `audit` 可拒绝 `milestone`、`feature` 或 `cycle`，并要求 `test` 与 `implement` 重做。
- 只有 `implement` 提出客观阻塞、且 `audit` 认可后，才能进入 `blocked`。
- 审计记忆区需要记录项目级 `rules.md` 关键解释、用户特殊要求和当前 cycle 关键决策。
- 每个 milestone 以一个 canonical prompt 作为主合同；`test`、`implement`、`audit` prompt 作为派生执行物，只在真实分派时展开。
- 返工使用增量 `rework prompt` 并引用原 prompt。
- 审计必须检查 worker 身份唯一性、prompt scope、改动文件归属、生命周期闭环以及 test/implement 证据分离。
- 重点治理 spawn 串权，尤其是同一 worker 偷偷同时承担 `test` 与 `implement`。
- Codex subworker 已授权为 `authorized strict`，作用域覆盖 `/hw:plan`、`/hw:start`、`/hw:resume`，角色为 `test`、`implement`、`audit`。
- C10 的 live prompts 已归档到 `.pipeline/archives/C10-experience-improvements/`；Codex skill source 已切换为独立 snapshot，避免开发中自改当前使用中的 skill。

## P4 Gate

等待用户确认后，C11 进入执行前的 prompt/spec 生成与后续 `/hw:start` 流程。确认后从 M01 开始。
