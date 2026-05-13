# M0 - P0 Configure 与规划授权记录

## Objective

把 C11 的 Cycle 级操作策略固化为可读取、可审计、可复用的配置与规划记录，后续 Milestone 必须引用这些决策。

## 需求

- 校准 `.plan-state/p0-configure.yaml`、`.plan-state/discover.yaml`、`.plan-state/decompose.yaml` 与 `.pipeline/cycle.yaml`、`.pipeline/config.yaml` 的关系。
- 明确 C11 的输出语言、Subagent 授权策略、自动化白名单分层、worker separation、Plan 审计字段和例子抽象规则。
- 如果项目已有适合承载长期授权白名单的 config/spec 位置，更新 spec；如果没有，先补 contract 并给后续 M3 留出实现入口。

## Boundaries

- In scope: `.plan-state/*`、`.pipeline/confirm-summary.md`、`.pipeline/PROGRESS.md`、相关 config/spec/test scaffolding。
- Out of scope: 真正执行 Skill 中文化、Subagent prompt-builder、自动化白名单运行时实现。

## 预期测试

- 规划记录可被后续 prompt 引用，且不与 `.pipeline/config.yaml`、全局配置冲突。
- C11 的授权状态清晰区分：audit Subagent 已授权；test/implement Subagent 仍需执行前确认。
- P0 Configure 决策包含长期白名单三档：`safe_local`、`stateful_local`、`external`。

## Validation Commands

- `bash scripts/validate-config.sh .pipeline/config.yaml`
- `npm test --prefix core -- p0`
- `git diff --check`

## Audit Fields

- `audit_target`: C11 P0 Configure、授权记录、规划记录的一致性。
- `risk_hypotheses`: 授权记录只留在对话中导致后续 Milestone 读取不到；白名单语义与安全边界冲突；Subagent 授权状态被误解为全部授权。
- `test_scenarios`: 读取规划记录、校验 config、检查 prompt 是否能引用 P0 决策。
- `evidence_required`: config 校验输出、相关测试输出、规划文件 diff 摘要。
- `independent_validator`: audit Subagent 只读审查。
- `manual_checks`: 用户确认 `/hw:start` 前能看到授权策略和下一步说明。
- `known_limits`: M0 不实现完整白名单运行时，只固化 contract 和状态。

## Subworker Assignment Plan

- `audit`: 只读检查 P0 记录是否覆盖用户在 P1 中确认的全部决策。
- `test`: 执行前需额外授权；负责补或改 config/P0 contract 测试。
- `implement`: 执行前需额外授权；负责 P0 记录与最小 spec 更新。
- Every worker prompt must include `compact_rules_summary` and `user_requested_checks`.

## 预期产出

- P0 Configure 记录与 P1/P2 规划记录保持一致。
- M0 report 必须用中文说明：做了什么、怎么验证、用户接下来如何进入 M1。
