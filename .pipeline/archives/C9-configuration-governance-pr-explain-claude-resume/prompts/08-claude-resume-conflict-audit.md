# M09 / F004 - Claude `/resume` 冲突审计

## Objective

- 审计 Claude Code 原生 `/resume` 被自动补全或误路由到 Hypo `/hw:resume` 的原因，定义 exact namespace 边界。

## 需求

- 检查 `.claude-plugin/plugin.json`、`skills/resume/SKILL.md`、Claude plugin manifest、generated commands、adapter docs 和 tests。
- 找出 Hypo 是否暴露了过宽的 `resume` alias、natural-language alias 或 plugin command metadata。
- 明确：Claude 原生 `/resume` 属于宿主平台；Hypo 只拥有 `/hw:resume`。
- 审计 OpenCode/Codex 映射，避免修复 Claude 时破坏其他平台。
- 输出一份中文审计记录，列出风险点和修复计划。

## Boundaries

- In scope:
  - Claude plugin/skill metadata
  - command parsing specs
  - alias/autocomplete tests
  - docs
- 不修改 Claude Code 内置行为。
- 不删除 Hypo `/hw:resume`。
- 不破坏自然语言“继续 pipeline”这类明确 Hypo intent 的兼容入口。

## Implementation Plan

1. 写或更新 failing tests，复现 `/resume` 不应匹配 `/hw:resume`。
2. 审计 command parser、plugin manifest、skill names、generated docs。
3. 标记所有 ambiguous alias。
4. 提出修复方案：exact namespace、display label、docs warning、autocomplete-safe naming。
5. 把审计结果写入 report/review evidence。

## 预期测试

- `/resume` 不被 Hypo command parser 识别为 `/hw:resume`。
- `/hw:resume` 仍正常识别。
- “继续 pipeline”这类自然语言入口仍可在明确 workflow context 下工作。
- Claude plugin metadata 不声明裸 `/resume`。

## Validation Commands

- `node --test core/test/*claude*resume*.test.js core/test/claude-plugin-alias.test.js core/test/commands-rules-artifacts.test.js`
- `claude plugin validate .`
- `node --test core/test/*.test.js`
- `git diff --check`

## Evidence

- 报告列出冲突来源和修复候选。
- 报告保存 failing/passing alias fixture。

## Human QA

- 确认用户在 Claude Code 输入 `/resume` 不会被文档或 Hypo metadata 诱导到 `/hw:resume`。
- 确认 `/hw:resume` 的用途仍清晰。

## 预期产出

- Claude Resume 冲突审计报告。
- Alias/autocomplete fixture tests。

