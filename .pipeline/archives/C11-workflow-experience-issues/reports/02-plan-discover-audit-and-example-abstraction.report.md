# M2 - Plan Discover 访谈升级

## 结论

已强化 Plan Discover：所有 Plan 都要问审计/验证问题，并在用户举例时先抽象成泛化需求再确认。

## 做了什么

- 在 `core/src/progressive-discover/index.js` 增加 `PLAN_AUDIT_FIELDS`、`buildPlanAuditQuestions` 和 `extractExampleAbstraction`。
- 更新 Progressive Discover spec，要求 `audit_target`、`risk_hypotheses`、`test_scenarios`、`evidence_required`、`independent_validator`、`manual_checks`、`known_limits`。
- 测试覆盖“比如/例如”输入的抽象确认流程。

## 验证

- `node --test core/test/progressive-discover.test.js`
- 全量 `npm test --prefix core` 已通过。

## 手动操作

- 运行 `/hw:plan` 并给出一个例子，例如“比如调研链接只给路径”，Agent 应先确认泛化需求，而不是只处理这个例子。

## 已知风险

- 当前 helper 提供契约和测试锚点；各 host 的自然语言执行还依赖 Skill 指令遵守。
