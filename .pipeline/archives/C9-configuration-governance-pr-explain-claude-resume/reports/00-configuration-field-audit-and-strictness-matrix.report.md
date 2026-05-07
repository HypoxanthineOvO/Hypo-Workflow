# M01 报告 - 配置字段盘点与严格度矩阵

## Metadata

- Cycle: C9
- Feature: F001 配置治理与默认配置组合
- Milestone: M01 配置字段盘点与严格度矩阵
- Status: completed
- Finished: 2026-05-07T15:37:40+08:00

## Summary

M01 新增了中文主体的配置治理参考页 `docs/reference/configuration.md`，并把它纳入 docs map 和 `/hw:docs repair` 生成路径。文档覆盖 project/global/Cycle/rules 配置层级、自动化等级、hard gates、worker separation、analysis preset、legacy auto 字段和平台配置差异。

## Changed Files

- `docs/reference/configuration.md`
- `core/src/docs/index.js`
- `core/test/docs-governance.test.js`

## Validation

- `node --test core/test/docs-governance.test.js`: 6/6 passed
- `node --test core/test/*config*.test.js core/test/docs-governance.test.js`: 25/25 passed
- `npm test --prefix core`: 316/316 passed
- `bash scripts/validate-config.sh .pipeline/config.yaml`: passed
- `node --input-type=module -e "import { checkDocs } from './core/src/docs/index.js'; ..."`: passed
- `git diff --check`: passed

## Evidence

配置治理矩阵包含：

- `automation.level`
- `automation.gates.planning`
- `automation.gates.destructive_external`
- `automation.gates.release_publish`
- `execution.worker_separation.mode`
- `execution.analysis.interaction_mode`
- `execution.analysis.boundaries.code_changes`
- `acceptance.mode`
- `evaluation.auto_continue`
- `batch.auto_chain`
- `opencode.auto_continue`
- `PR/MR remote write`
- `plugin install`
- `user-level config write`
- Codex / Claude Code / OpenCode 平台边界

## Decision

pass
