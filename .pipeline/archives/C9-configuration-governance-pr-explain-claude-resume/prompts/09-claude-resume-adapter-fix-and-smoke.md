# M10 / F004 - Claude 适配修复与烟测

## Objective

- 根据 M09 审计结果修复 Claude adapter、plugin metadata、docs 和 tests，确保 Claude 原生 `/resume` 与 Hypo `/hw:resume` 不冲突。

## 需求

- 修复导致裸 `/resume` 被 Hypo 接管或自动补全混淆的命名/alias/source。
- 保留 `/hw:resume` 的 canonical command。
- 更新 Claude Code guide，说明 Claude 原生 resume 和 Hypo workflow resume 的区别。
- 更新 generated artifact source，确保 sync 后不会重新引入冲突。
- 运行 Claude plugin validation 和 focused tests。

## Boundaries

- In scope:
  - `.claude-plugin/plugin.json`
  - `skills/resume/SKILL.md`
  - `core/src/artifacts/claude.js`
  - `core/src/commands/`
  - docs and tests
- 不修改用户 `~/.claude`。
- 不执行 plugin install。
- 不声明可以控制 Claude Code 内置 autocomplete，只保证 Hypo metadata 不误导。

## Implementation Plan

1. 用 M09 failing tests 驱动修复。
2. 移除或重命名 ambiguous bare resume alias。
3. 调整 generated docs/commands，让所有 Hypo 入口带 `/hw:` 或明确 `hw` namespace。
4. 更新平台 guide 和 command reference。
5. 运行 smoke validation。

## 预期测试

- Alias tests 通过。
- Claude plugin validate 通过。
- OpenCode/Codex command maps 仍包含正确 `/hw:resume` 映射。
- Docs 中不建议用户用裸 `/resume` 进入 Hypo pipeline。

## Validation Commands

- `node --test core/test/*claude*resume*.test.js core/test/claude-plugin-alias.test.js core/test/platform-adapters.test.js`
- `claude plugin validate .`
- `node cli/bin/hypo-workflow sync --check-only --project .`
- `node --test core/test/*.test.js`
- `git diff --check`

## Evidence

- 报告包含 before/after alias matrix。
- 报告包含 Claude plugin validation 结果。

## Human QA

- 在 Claude Code 文档里确认用户知道 `/resume` 和 `/hw:resume` 是两件事。
- 确认修复没有删除 workflow resume 能力。

## 预期产出

- Claude Resume namespace 修复。
- Tests、docs、adapter smoke 证据。

