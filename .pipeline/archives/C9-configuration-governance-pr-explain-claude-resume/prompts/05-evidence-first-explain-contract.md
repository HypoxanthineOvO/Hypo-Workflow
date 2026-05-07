# M06 / F003 - Evidence-first Explain 合同

## Objective

- 新增 `/hw:explain` 的证据优先、只读问答合同，让 Agent 回答代码、配置、命令和近期修改问题时必须先查证据。

## 需求

- 定义 `/hw:explain [question]` 命令语义。
- Explain 不替代 `/hw:status`；它面向“为什么”“是什么”“刚才为什么这样写”“这个框架怎么组织”等自然语言问题。
- 默认只读，不推进 Cycle、不创建 Patch、不修改 state、不写远端。
- 证据来源包括用户指定文件、相关 source/test、`git diff`、`.pipeline` 状态、PROGRESS、log、reports、reviews、README/docs/references。
- 输出必须引用证据或明确说无法确认。

## Boundaries

- In scope:
  - new `references/explain-spec.md`
  - `references/commands-spec.md`
  - `skills/explain/SKILL.md`
  - command/help/docs updates
  - focused tests
- 不把 Explain 变成 debug/audit/patch。
- 不执行修改命令。
- 不读取 secret-bearing remote resources。

## Implementation Plan

1. 写 tests，覆盖 command parsing、read-only behavior、evidence requirement。
2. 设计 evidence packet schema：question、scope、files_read、pipeline_refs、diff_refs、confidence、unknowns。
3. 实现或规范 evidence collector，优先读取显式目标，再读取相关上下文。
4. 更新 docs 和 help，给出常见问法。
5. 确保 Explain 输出语言按 `output.language`。

## 预期测试

- `/hw:explain "为什么这个配置是 strict"` 必须引用具体配置键/文件。
- `/hw:explain .pipeline/cycle.yaml` 能解释文件作用但不修改文件。
- Explain 不更新 `.pipeline/state.yaml`、`.pipeline/log.yaml` 或远端状态。
- 缺证据时输出 unknown/needs_context，而不是编造。

## Validation Commands

- `node --test core/test/*explain*.test.js core/test/commands-rules-artifacts.test.js`
- `node --test core/test/*.test.js`
- `git diff --check`

## Evidence

- 报告包含一个 evidence packet 样例。
- 报告列出只读行为验证结果。

## Human QA

- 确认回答像“带证据的解释”，不是状态面板。
- 确认不确定性表达清楚。

## 预期产出

- `/hw:explain` command/spec/skill 合同。
- Evidence-first tests 和中文文档。

