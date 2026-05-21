# C17 P4 Confirm Summary

## Cycle

- Cycle：C17
- 名称：审计修复与架构减债
- 类型：refactor
- Preset：tdd
- 状态：等待确认开始执行

## 已确认边界

- 全修审计发现：Critical、Warning、Info 均纳入 C17。
- 根目录 `npm test` 必须直接可运行。
- 配置 authority 分层读取：项目配置、用户全局配置、安全默认值。
- 配置迁移通过显式命令触发；`sync/start` 只能提示，不能静默写用户级配置。
- `workspace/index.js` 一次切干净，不保留兼容 re-export shim。
- YAML 统一采用 `js-yaml`。
- ledger 新写入采用 append-only JSONL；旧 YAML ledger 一次性迁移；compact YAML 只做人读摘要。
- 文档/examples 同步新显式模块 import。
- barrel export 尽量清理干净。
- Subagent 已授权，执行采用 recommended worker separation。

## 执行 Prompt

| # | Prompt | 主题 |
|---|---|---|
| 00 | `.pipeline/prompts/00-audit-baseline-and-root-test-entry.md` | 根目录测试入口与审计基线 |
| 01 | `.pipeline/prompts/01-shared-utils-layer-extraction.md` | 共享 utils 层 |
| 02 | `.pipeline/prompts/02-layered-config-and-integration-migration.md` | 分层配置与集成迁移 |
| 03 | `.pipeline/prompts/03-yaml-parser-unification-with-js-yaml.md` | js-yaml 统一 parser |
| 04 | `.pipeline/prompts/04-workspace-clean-module-split.md` | workspace clean split |
| 05 | `.pipeline/prompts/05-ledger-jsonl-migration-and-barrel-export-cleanup.md` | JSONL ledger 与 barrel cleanup |
| 06 | `.pipeline/prompts/06-full-audit-closure-and-release-readiness.md` | 审计闭环与发布就绪 |

## 必须验证

- 每个 Milestone 至少运行 focused tests、`npm test` 和 `git diff --check`。
- 最终必须运行 hardcoded path、workspace stale import、parser split、ledger authority 和 export cleanup 扫描。
- Audit worker 必须拒绝伪测试、静默用户配置写入、workspace shim、长期 YAML/JSONL 双写和 stale docs/examples。

## 下一步

确认后使用 `/hw:start` 开始 C17-M0。
