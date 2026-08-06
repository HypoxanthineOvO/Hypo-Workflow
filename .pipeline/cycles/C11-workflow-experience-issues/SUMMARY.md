---
archived_source: .pipeline/archives/C11-workflow-experience-issues
cycle: C11-workflow-experience-issues
finished: 2026-05-11T14:55:25+08:00
kind: cycle-summary
started: 2026-05-11T13:54:47+08:00
status: closed
---

# Workflow 的一系列小体验问题 总结

## 目的与边界

Completed C11 workflow experience improvements: Chinese-first Skills and references, two-layer Subagent rules/check injection, durable automation whitelist, human-readable response contracts, stronger Plan audit/example-abstraction behavior, sync and docs refresh, and full core regression.

## 最终结果

旧 Cycle 状态：`completed`。本预览不重新判断旧结果，只建立可读导航。

## 验证结果

- 8 个历史 milestone 已映射。
- 26 个旧文件继续保存在 `.pipeline/archives/C11-workflow-experience-issues`。

## 重要决定与经验

- Skill quality checks must accept Chinese canonical headings when the project language policy is zh-CN.
- Planning examples should become generalized requirements before Milestone decomposition.
- Subagent prompt injection needs distinct host envelope and task-specific check layers.

## 后续候选

- 不自动继承旧任务；新 Cycle 应通过 `builds_on` 选择需要的结果或经验。

## 映射缺口

- 无结构性缺失。

## 旧总结原文

# C11 Workflow 的一系列小体验问题

- Cycle：C11
- 名称：Workflow 的一系列小体验问题
- 类型：feature
- 状态：completed
- 开始：2026-05-11T13:54:47+08:00
- 结束：2026-05-11T14:55:25+08:00
- Preset：tdd

## Milestones

- M0 P0 Configure 与规划授权记录：完成 P0 配置、Subagent 授权、自动化白名单和审计字段固化。
- M1 用户可见输出契约：建立“结论 / 解释 / 下一步”的用户可见输出契约。
- M2 Plan Discover 访谈升级：升级 Plan 审计问题和例子抽象确认逻辑。
- M3 自动化授权白名单：实现长期自动化授权白名单。
- M4 Subagent 规则与检查点注入闭环：补强 Subagent 两层规则与检查点注入。
- M5 Skills 中文化：核心执行链：补齐核心执行链 Skills 中文骨架。
- M6 Skills 中文化：规划与辅助链：补齐规划与辅助链 Skills 中文骨架。
- M7 References 中文化与回归：完成 references 中文主体和完整回归。

## 关键结果

- 测试：`uv run -- npm --prefix core test` 407/407 通过。
- 回归：`uv run python tests/run_regression.py` 63/63 通过。
- 配置校验：`uv run -- bash scripts/validate-config.sh .pipeline/config.yaml` 通过。
- Sync：OpenCode 与 Claude Code `sync --repair` 均通过，derived health 为 fresh。
- 最终结论：C11 完成并归档。

## Deferred

- 延后事项：0。

## Lessons

- Skill quality checks must accept Chinese canonical headings when the project language policy is zh-CN.
- Planning examples should become generalized requirements before Milestone decomposition.
- Subagent prompt injection needs distinct host envelope and task-specific check layers.

## Knowledge

- 知识摘要：`.pipeline/archives/C11-workflow-experience-issues/knowledge-summary.md`
