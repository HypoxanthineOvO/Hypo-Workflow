# M0 — 审查基线与证据索引

## 目标

建立 C14 兼容性审查的证据索引：识别 Hypo-Workflow 的 source-of-truth、平台适配器、测试入口、文档入口和可运行验证命令。

## 审查范围

- Workflow/命令 source-of-truth：根 `SKILL.md`、`skills/*/SKILL.md`、`references/*`
- 状态/配置：`.pipeline/config.yaml`、schema、state contract、cycle/progress/log/report specs
- 平台适配器：OpenCode、Claude Code、Codex 相关 adapter、plugin、AGENTS/CLAUDE/Codex 指令
- 测试入口：tests、fixtures、snapshots、package scripts、CLI 验证命令
- 文档入口：README、docs、release notes、developer/contributor docs

## 工作要求

1. 只读审查，不修复代码。
2. 生成文件清单和证据索引。
3. 发现并列出可运行测试/验证命令，但仅在 M4 统一执行关键验证。
4. 标记 source-of-truth 关系和可能重复生成/派生文件。

## 输出

写入 `.pipeline/reports/C14-M0-baseline-index.md`，至少包含：

- Source-of-truth map
- Platform adapter map
- Test command inventory
- Documentation entry inventory
- Derived/generated artifact map
- Initial risk hypotheses（无证据项只能放这里）

## 验收

- 每个索引项必须有路径证据。
- 不得把假设写成正式 finding。
