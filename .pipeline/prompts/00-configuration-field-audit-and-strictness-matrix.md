# M01 / F001 - 配置字段盘点与严格度矩阵

## Objective

- 审查 Hypo-Workflow 现有配置体系，把自动程度、严格程度、确认边界和平台差异整理成中文主体的配置治理文档基础。

## 需求

- 盘点 project config `.pipeline/config.yaml`、global config `~/.hypo-workflow/config.yaml`、Cycle metadata `.pipeline/cycle.yaml`、rules、analysis preset、review strict 和 platform profile 的主要字段。
- 建立一张中文矩阵，说明字段作用、层级优先级、默认值、自动化影响、严格度影响、是否触发人工确认。
- 明确 hard gates：planning、destructive/external、release publish、PR/MR remote write、plugin install、user-level config write。
- 解释 legacy 字段与新字段关系，例如 `evaluation.auto_continue`、`batch.auto_chain`、`opencode.auto_continue` 与 `automation.*` 的兼容边界。
- 不改变配置行为，只整理和验证文档/规范。

## Boundaries

- In scope:
  - `references/config-spec.md`
  - `docs/user-guide.md`
  - `docs/reference/*.md`
  - `core/src/config/`
  - config/docs focused tests
- 不重写用户全局配置。
- 不修改 `.pipeline/cycle.yaml` 的业务事实。
- 不把 README 变成长篇配置手册；README 只保留入口。

## Implementation Plan

1. 写或更新 focused tests，覆盖配置字段表、自动化级别、analysis boundary、worker separation、hard gate 文档新鲜度。
2. 从 `references/config-spec.md`、core config helper 和现有 docs 中抽取字段清单。
3. 更新中文配置治理文档，形成“字段 -> 默认值 -> 作用 -> 风险/确认门”的矩阵。
4. 补充平台差异：Codex、Claude Code、OpenCode、第三方 IDE 的配置作用边界。
5. 确保 docs generator 或 docs repair 不会覆盖这份中文主体内容。

## 预期测试

- 配置字段矩阵包含 `automation.*`、`plan.*`、`execution.*`、`execution.analysis.*`、`execution.worker_separation.*`、`acceptance.*`、`review/evaluation`、`batch.*`、`output.*`、platform profile。
- docs governance 测试能发现命令数量/配置说明过期。
- `scripts/validate-config.sh` 仍接受当前 `.pipeline/config.yaml`。
- 新文档不会声称 Hypo-Workflow 是 runner。

## Validation Commands

- `node --test core/test/*config*.test.js core/test/docs-governance.test.js`
- `bash scripts/validate-config.sh .pipeline/config.yaml`
- `node --test core/test/*.test.js`
- `git diff --check`

## Evidence

- 在报告中列出新增/修改的配置文档路径。
- 附一段字段矩阵摘录，至少覆盖自动化和 hard gates。
- 记录未能自动验证的配置项和人工审查结果。

## Human QA

- 确认普通用户能从文档看懂“我选哪个模式”。
- 确认平台配置边界没有夸大宿主 Agent 能力。

## 预期产出

- 中文主体的配置治理文档和字段矩阵。
- Focused tests 和 config validation 证据。

