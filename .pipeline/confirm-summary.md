# C11 规划确认摘要

## 结论

C11 将交付一组 Workflow 体验治理改动：中文主体 Skill/reference、Subagent 检查注入、长期自动化白名单、用户可见“说人话”输出契约、Plan 审计问题和例子抽象规则。

## Milestone 拆分

1. M0 - P0 Configure 与规划授权记录
2. M1 - 用户可见输出契约
3. M2 - Plan Discover 访谈升级
4. M3 - 自动化授权白名单
5. M4 - Subagent 规则与检查点注入闭环
6. M5 - Skills 中文化：核心执行链
7. M6 - Skills 中文化：规划与辅助链
8. M7 - References 中文化与回归

## 验证策略

- 每个 Milestone 使用 TDD preset，先写或更新可观察测试，再实现。
- 每个 Milestone 必须记录审计字段：`audit_target`、`risk_hypotheses`、`test_scenarios`、`evidence_required`、`independent_validator`、`manual_checks`、`known_limits`。
- Subagent 审计已获授权；实现/测试 Subagent 在 `/hw:start` 或 `/hw:resume` 执行前仍需按 prompt 边界确认。
- Subagent 注入按两层建模：host/orchestrator 先生成 rules/authorization/role envelope，每个 Subagent 任务再注入用户检查点、审计字段和证据要求。

## 用户手动操作建议

确认后可运行 `/hw:start` 开始 M0。执行中重点观察：

- Agent 是否在中间更新里说明正在做什么、发现了什么、下一步是什么。
- Milestone 完成时是否给出“做了什么、怎么验证、你怎么手动试、已知风险”。
- Subagent prompt 是否包含规则摘要和本轮检查点。
