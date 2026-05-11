# M2 - Plan Discover 访谈升级

## Objective

让 `/hw:plan` 的 P1 Discover 更像资深 PM/审计负责人：所有 Plan 都认真追问验证与审计问题，并把用户例子抽象成泛化需求后确认。

## 需求

- 所有 Plan 都必须问审计/验证问题，不使用轻量占位问题糊弄。
- 用户举例时固定执行三步：识别这是例子、提炼泛化需求、反问确认覆盖范围。
- P1 产物必须包含审计字段：`audit_target`、`risk_hypotheses`、`test_scenarios`、`evidence_required`、`independent_validator`、`manual_checks`、`known_limits`。
- 更新 `skills/plan*` 与相关 references，必要时补 tests/scenarios。

## Boundaries

- In scope: `skills/plan*`、`references/commands-spec.md`、`references/config-spec.md`、`references/audit-spec.md` 或相关测试。
- Out of scope: 自动化白名单运行时、Skill 全量中文化。

## 预期测试

- 只给一个例子时，Plan 不把例子硬编码为唯一需求。
- Plan 输出包含完整审计字段。
- Interactive 模式仍遵守最少轮数和明确结束 Discover 的规则。

## Validation Commands

- `npm test --prefix core -- progressive-discover`
- `npm test --prefix core -- p0`
- `npm test --prefix core -- audit`
- `git diff --check`

## Audit Fields

- `audit_target`: Plan Discover 问题质量、例子抽象规则、审计字段落地。
- `risk_hypotheses`: Plan 问题过多但不可执行；把用户例子当成唯一 case；审计字段生成但不进入 prompt。
- `test_scenarios`: 用户输入 “比如 X” 的 fixture；审计字段缺失 fixture；interactive gate fixture。
- `evidence_required`: 测试输出、Skill 规则 diff、生成 prompt 样例。
- `independent_validator`: audit Subagent 检查问题是否足够具体。
- `manual_checks`: 用户阅读 Plan 问题时能看出 Agent 在确认泛化意图。
- `known_limits`: 本 Milestone 不执行后续实现，只改规划契约和生成逻辑。

## Subworker Assignment Plan

- `test`: 需授权；设计 red tests 覆盖例子抽象和审计字段。
- `implement`: 需授权；更新 Plan Skill/spec/生成逻辑。
- `audit`: 已授权只读；检查是否仍可能绕过审计问题。

## 预期产出

- Plan Discover 升级契约。
- 生成 prompts 中出现可测试审计字段。
