# M4 — 测试健壮性与硬编码审查

## 目标

审查测试体系是否存在硬编码数量、文本、版本、平台矩阵、命令列表、固定文件路径等脆弱断言，并运行关键验证命令。

## 审查问题

- 测试是否硬编码具体数量、全文文本、版本号、命令列表？
- 配置默认值是否散落多处，缺少可更新 source-of-truth？
- 平台矩阵是否在多个文件重复，容易不同步？
- 是否覆盖近期新增功能：Deep Plan、Cycle、OpenCode command registration、TUI、Worker Separation？

## 工作要求

1. 先发现测试命令，再运行关键测试；若无法运行，记录原因。
2. 不修复测试，只记录风险和建议。
3. 对硬编码项区分：合理 snapshot / 脆弱 hardcode / 应迁移到配置。

## 输出

写入 `.pipeline/reports/C14-M4-test-hardcode-audit.md`，至少包含：

- Test command inventory and executed commands
- Hardcode findings table
- Coverage gap findings table
- Flaky/brittle risk notes
- Suggested test refactor queue

## 验收

- 每个执行过的命令记录结果。
- 未执行命令记录跳过原因。
