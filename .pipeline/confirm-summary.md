# C18 Confirm Summary

## Cycle

C18 `指令质量审查与集成同步方案`

## 生成结果

已生成 6 个执行 prompt：

1. `00-audit-engineering-method-upgrade.md`
2. `01-quality-command-and-report-contract.md`
3. `02-optimize-closed-loop-command.md`
4. `03-integration-sync-workflow-gate.md`
5. `04-source-side-closure-and-target-plans.md`
6. `05-target-repository-adaptation-after-confirmation.md`

## 执行策略

- Worker separation：recommended，已授权 `/hw:start` 和 `/hw:resume`。
- 每个 prompt 都包含 `test`、`implement`、`audit` 分工。
- 每个实现 Milestone 必须保留 P2 技术路线、验证路径和 audit focus。
- 测试必须覆盖真实命令/adapter/docs/state/report contract，拒绝伪测试。

## 硬门禁

`C18-M6` 不能直接执行目标仓库写入。必须先完成 `C18-M5`，生成 `~/Codex-VSP` 与 `~/VSP-Open-Code` 的目标适配计划、文件清单和验证命令，然后由用户明确确认。

## 下一步

用户确认后，可运行 `/hw:start` 开始执行 C18-M1。
