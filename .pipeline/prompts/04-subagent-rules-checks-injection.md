# M4 - Subagent 规则与检查点注入闭环

## Objective

打通 Subagent prompt 注入闭环，让每个 Subagent 明确知道当前规则、用户检查点、角色边界、授权状态和证据要求。

## 需求

- 设计统一的 Subagent prompt input schema 或 builder 契约，必须显式拆成两层：
  - Layer 1 - host/orchestrator generation：在 spawn 前生成共享 envelope，包含 `compact_rules_summary`、`authorization_state`、`role_boundary`、`out_of_scope_stop_rule`。
  - Layer 2 - Subagent task injection：每个具体 Subagent 任务再追加 `user_requested_checks`、Milestone 审计字段、`evidence_required`、`expected_output_artifact`。
- 每个 Subagent prompt 必须同时包含 Layer 1 和 Layer 2，不允许只把字段平铺进 prompt。
- `test/implement/audit` 三角色边界必须清晰，audit 只读。
- 缺少授权时必须问用户，不得静默降级成主 Agent 自己完成角色敏感工作。

## Boundaries

- In scope: `references/subagent-spec.md`、`templates/subagent/*`、`skills/start`、`skills/resume`、`skills/plan`、相关生成器/测试。
- Out of scope: 大规模改写所有 Subagent 工作流实现之外的业务逻辑。

## 预期测试

- 生成的 Subagent prompt 含 Layer 1 host envelope 和 Layer 2 task checks。
- 缺授权时出现明确阻断。
- audit Subagent 不获得写权限。

## Validation Commands

- `npm test --prefix core -- subagent`
- `npm test --prefix core -- codex-subagent`
- `npm test --prefix core -- lifecycle`
- `git diff --check`

## Audit Fields

- `audit_target`: Subagent 两层 prompt 注入、授权门、角色边界。
- `risk_hypotheses`: 只实现单层字段平铺；规则只进宿主不进 Subagent；user_requested_checks 丢失；audit 获得写权限。
- `test_scenarios`: Layer 1 envelope snapshot、Layer 2 task injection snapshot、missing authorization、role scope violation、out-of-scope request。
- `evidence_required`: 测试输出、prompt 示例、模板 diff。
- `independent_validator`: audit Subagent 检查所有模板是否有注入段。
- `manual_checks`: 用户能看到 host 层规则摘要和 Subagent 任务层检查点分别是什么。
- `known_limits`: 不依赖宿主私有 API；用生成 prompt 和 artifacts 验证。

## Subworker Assignment Plan

- `test`: 需授权；写 two-layer prompt injection contract tests。
- `implement`: 需授权；更新 builder/spec/templates，保持 Layer 1/Layer 2 可单独断言。
- `audit`: 已授权只读；检查 rules/checks 是否真的分两层进入每个相关 prompt。

## 预期产出

- Subagent 注入闭环和可测试 fixtures。
- 执行报告必须说明怎么手动检查一个生成 prompt。
