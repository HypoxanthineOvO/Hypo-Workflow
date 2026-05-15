# M5 — 文档、用户引导与贡献者体验审查

## 目标

审查开发者、用户、贡献者是否能理解如何使用、迁移、扩展 Hypo-Workflow，尤其是状态、规则、平台适配、命令和测试的维护方式。

## 审查对象

- 开发者文档：如何改 skill/rules/state/schema/tests/adapters
- 用户引导：如何 plan/start/resume/cycle/patch/release/debug/audit
- 贡献指南：如何添加新命令、新平台、新状态、新测试

## 审查问题

- README/docs 是否说明 source-of-truth 与 derived artifacts？
- 是否有迁移说明解释版本更新后的兼容破坏点？
- 用户是否能理解 OpenCode/Codex/Claude Code 的命令差异？
- 开发者是否能理解测试与 sync/release 流程？

## 工作要求

1. 只读审查，不修文档。
2. 找出缺口、过时内容、重复内容、入口不明显的问题。
3. 给出文档补齐候选，而非直接改写。

## 输出

写入 `.pipeline/reports/C14-M5-docs-onboarding-audit.md`，至少包含：

- Developer doc gap list
- User onboarding gap list
- Contributor guide gap list
- Migration/release note gap list
- Documentation refactor candidates

## 验收

- 每个缺口必须引用现有文档路径或说明“未找到”的搜索证据。
