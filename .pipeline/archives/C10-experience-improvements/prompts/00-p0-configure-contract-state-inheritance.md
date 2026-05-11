# M0 - P0 Configure 契约、状态与继承模型

## Objective

- 定义每个 Cycle 的 `P0 Configure` 阶段，包括触发时机、配置继承优先级、可审计记录、用户问答项，以及与 `/hw:guide`、`/hw:init`、`/hw:plan` / Discover 的衔接。

## 需求

- 更新配置 schema、默认配置、`references/config-spec.md`、`references/progressive-discover-spec.md`、`skills/init/SKILL.md`、`skills/guide/SKILL.md`、`skills/plan/SKILL.md` 和必要的 docs。
- 明确 `P0 Configure` 在 `cycle new` 后、`P1 Discover` 前触发；Guide/Init 进入规划前也应引导到该阶段。
- 定义“沿用上次配置”的优先级：当前 Cycle 显式配置、上一个 Cycle 配置快照、`.pipeline/config.yaml`、`~/.hypo-workflow/config.yaml`、内置默认。
- `P0 Configure` 应询问 automation、Subagent 授权、`acceptance.mode`、PR/MR remote write 一次性确认策略、完整回归开关、analysis 边界和 worker separation。
- 记录沿用来源、字段、时间和风险提示，保证后续 status/report 可解释。

## Boundaries

- In scope: config schema/defaults、config/init/guide/plan/discover specs、docs、focused tests。
- 不实现 `/hw:pr create`。
- 不启动真实交互 TUI。

## Implementation Plan

1. 先补 focused tests，断言 P0 Configure 术语、继承优先级和问答项出现在 config/init/guide/plan/discover 合同中。
2. 更新 core config 默认值或 helper，表达 Cycle-level configure policy。
3. 更新 schema，使必要字段可被项目配置或 Cycle 快照表达。
4. 更新 skills/references/docs，让 Guide/Init/Plan 统一指向 P0 Configure。
5. 补充状态/报告记录规则，避免“沿用”变成不可审计的隐式行为。

## 预期测试

- 配置与文档测试确认 `P0 Configure` 是独立阶段。
- 测试确认继承优先级完整。
- 测试确认配置问答覆盖 automation、Subagent、acceptance、PR/MR remote write、full regression、analysis boundaries、worker separation。

## Validation Commands

- `node --test core/test/config.test.js core/test/init-automation-contract.test.js core/test/progressive-discover.test.js core/test/guide-router.test.js`

## Evidence

- 报告中记录新增/修改文件、测试输出、P0 Configure 字段摘要和仍待后续 Milestone 接入的边界。

## Human QA

- test/review Subagent 可读取测试与最终 diff；implement Subagent 不得读取测试源码。

## 预期产出

- P0 Configure 合同、schema/default 更新、focused tests、M0 report。
