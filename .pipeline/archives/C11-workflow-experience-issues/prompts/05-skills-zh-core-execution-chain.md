# M5 - Skills 中文化：核心执行链

## Objective

把核心执行链 Skill 改成中文主体骨架，同时保持命令语义、路径、状态字段和英文术语不变。

## 需求

- 覆盖核心执行链：`start`、`resume`、`status`、`report`、`cycle`、`accept`、`reject`、`patch`、`pr`、`sync`、`explain`、`debug`、`audit`。
- 统一中文骨架：`适用场景 / 前置条件 / 命令形态 / 执行流程 / 交互与确认 / 安全边界 / 术语保留 / 参考文件`。
- 保留 `/hw:*`、`.pipeline/*`、YAML 字段、状态名、配置键、Codex/OpenCode/Claude Code 等英文 literal。
- 不把状态机“翻译成另一个意思”。

## Boundaries

- In scope: 上述核心 Skill 的 `SKILL.md`。
- Out of scope: 规划链和 references，全量 docs 重写。

## 预期测试

- Skill 文件中文主体覆盖率提高。
- 命令名、路径、状态字段保持原样。
- command registry、adapter docs、已有测试不被破坏。

## Validation Commands

- `npm test --prefix core -- commands`
- `npm test --prefix core -- docs`
- `bash scripts/validate-config.sh .pipeline/config.yaml`
- `git diff --check`

## Audit Fields

- `audit_target`: 核心执行链 Skill 中文骨架与语义保持。
- `risk_hypotheses`: 翻译破坏命令名；状态字段被中文化；安全边界被弱化；输出契约丢失。
- `test_scenarios`: literal preservation scan、command docs freshness、selected Skill manual review。
- `evidence_required`: 文件清单、测试输出、抽样对照说明。
- `independent_validator`: audit Subagent 抽查高风险 Skill。
- `manual_checks`: 用户能读懂 Skill 主体，并能辨认保留的英文术语。
- `known_limits`: 本 Milestone 不覆盖规划与辅助链。

## Subworker Assignment Plan

- `test`: 需授权；补 Skill literal preservation 或 docs governance tests。
- `implement`: 需授权；批量重排核心 Skill。
- `audit`: 已授权只读；按高风险清单抽查。

## 预期产出

- 核心执行链 Skill 中文主体完成。
- 报告列出改了哪些 Skill、哪些术语保留、怎么抽样验收。
