# M6 - Skills 中文化：规划与辅助链

## Objective

完成剩余 Skill 的中文主体骨架，重点覆盖规划族、初始化/设置、规则、知识、文档、指南和展示链路。

## 需求

- 覆盖 `SKILL.md` 根路由和剩余 `skills/*/SKILL.md`，包括 `plan*`、`init`、`setup`、`rules`、`knowledge`、`docs`、`guide`、`help`、`showcase`、`chat`、`compact`、`check`、`release`、`explore`、`dashboard`、`watchdog` 等。
- 对 `plan*` 保持 P0/P1/P2/P3/P4、`--batch`、`--insert`、interactive gates 等语义不变。
- 对根 `SKILL.md` 保持命令总表、别名、路由和输出语言规则不变。

## Boundaries

- In scope: M5 未覆盖的所有 Skill。
- Out of scope: references 中文化和业务实现逻辑。

## 预期测试

- 仓库主树全部 `SKILL.md` 已覆盖中文主体骨架。
- 高风险状态机术语未被错误翻译。
- Plan interactive hard gate 仍然有效。

## Validation Commands

- `npm test --prefix core -- progressive-discover`
- `npm test --prefix core -- guide`
- `npm test --prefix core -- rules`
- `npm test --prefix core -- commands`
- `git diff --check`

## Audit Fields

- `audit_target`: 全量 Skill 中文化覆盖和规划状态机保持。
- `risk_hypotheses`: 根路由改坏；Plan hard gate 被弱化；Skill 之间术语不一致。
- `test_scenarios`: SKILL.md inventory scan、Plan gate tests、command map tests。
- `evidence_required`: 覆盖清单、测试输出、高风险文件抽查。
- `independent_validator`: audit Subagent 用 inventory 对照检查遗漏。
- `manual_checks`: 用户能从 Skill 读懂执行流程和阻断条件。
- `known_limits`: 普通 README/docs 不作为主要改造对象。

## Subworker Assignment Plan

- `test`: 需授权；补 inventory/gate tests。
- `implement`: 需授权；重排剩余 Skill。
- `audit`: 已授权只读；检查 40 个 SKILL.md 覆盖。

## 预期产出

- 全量 Skill 中文主体完成。
- 报告必须列出覆盖数量、遗漏为 0 或解释例外。
