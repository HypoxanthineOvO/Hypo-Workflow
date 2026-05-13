# M1 - 用户可见输出契约

## Objective

建立“说人话”的强制用户可见输出契约，避免 Agent 在调研、链接分析、写文件、Milestone/Cycle 完成时只说“完成了”或只给路径。

## 需求

- 定义全局响应 schema：`结论 / 解释 / 下一步`。
- 为场景补模板或 Skill 规则：调研/链接分析、文件写入后、状态查询、中间进度更新、Milestone 完成、Cycle 完成、accept/reject、report/status/explain。
- 复杂完成态必须包含：做了什么、为什么这样做、关键文件、验证结果、用户手动操作、已知风险。
- 中间过程更新必须包含：正在做什么、发现了什么、下一步。

## Boundaries

- In scope: `skills/report`、`skills/status`、`skills/explain`、`skills/cycle`、`skills/accept`、`skills/reject`、模板、references、contract tests。
- Out of scope: 大规模 Skill 中文化和 reference 中文化。

## 预期测试

- 用户可见输出不能只有文件路径或“完成了”。
- status/report/explain/cycle close 至少包含结论、解释、下一步。
- Milestone/Cycle 完成态包含手动操作说明。

## Validation Commands

- `npm test --prefix core -- explain`
- `npm test --prefix core -- status`
- `npm test --prefix core -- lifecycle`
- `git diff --check`

## Audit Fields

- `audit_target`: 用户可见回复 schema 和场景模板。
- `risk_hypotheses`: 模板只写在 docs 里但命令 Skill 不引用；compact/report 继续压缩成路径；英文模板与中文模板不一致。
- `test_scenarios`: explain/status/report/cycle completion fixtures；链接分析或调研类响应样例；Milestone report 样例。
- `evidence_required`: 测试断言、模板 diff、Skill 引用点。
- `independent_validator`: audit Subagent 检查是否覆盖所有用户抱怨场景。
- `manual_checks`: 人工阅读一份完成报告，确认可直接知道怎么手动试。
- `known_limits`: 不保证每个宿主模型永远遵守，但把约束写入 Skill/spec/template/test。

## Subworker Assignment Plan

- `test`: 需授权；先补 response contract tests。
- `implement`: 需授权；更新 Skill/spec/template。
- `audit`: 已授权只读；检查是否仍存在“完成了 + 路径”的输出口。
- Worker prompts must include `user_requested_checks`: “解释内容而不是只记录路径；完成后给用户手动操作说明。”

## 预期产出

- 统一响应契约和场景模板。
- M1 report 用新 schema 自证：结论、解释、下一步、手动测试方式。
