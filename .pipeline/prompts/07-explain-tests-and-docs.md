# M08 / F003 - Explain 测试与文档

## Objective

- 补齐 Explain 的用户文档、命令映射、adapter surfaces 和 fixture 测试，确保它作为一等命令可被发现和验证。

## 需求

- 更新 README 常用命令、命令概览和文档入口。
- 更新 `docs/reference/commands.md`、`references/commands-spec.md`、platform guides 和 generated command maps。
- 新增或更新 `.opencode/commands/hw-explain.md`、Claude plugin skill entry、Codex skill docs。
- Fixture project 验证 Explain 对代码框架、配置 strict、近期 diff 原因的回答。
- 确保 Explain 文档中文主体，保留 command/config/file 英文术语。

## Boundaries

- In scope:
  - docs/reference and platform docs
  - generated adapters
  - command count freshness
  - Explain focused tests
- 不实现 debug/audit 的深度问题定位。
- 不加入自动修改 flag。

## Implementation Plan

1. 添加 docs/governance tests，确保 Explain 出现在命令表、help、platform map。
2. 添加 fixture tests，验证 Explain 对三类问题给出 evidence-backed answer。
3. 更新 generated artifacts source，使 sync/check-only 通过。
4. 更新 README，但保持 README 简洁。
5. 运行 focused tests 和 docs self-check。

## 预期测试

- `/hw:help` 或 command map 包含 `/hw:explain`。
- OpenCode command map 包含 `/hw-explain`。
- docs command count 更新为新的用户命令数量。
- Explain fixture 输出含文件引用或明确 unknowns。

## Validation Commands

- `node --test core/test/*explain*.test.js core/test/docs-governance.test.js core/test/platform-adapters.test.js`
- `node cli/bin/hypo-workflow sync --check-only --project .`
- `node --test core/test/*.test.js`
- `git diff --check`

## Evidence

- 报告列出更新过的命令/平台映射。
- 报告包含 Explain fixture 摘要。

## Human QA

- 确认 README 没有变成命令字典。
- 确认 Explain 的定位区别于 status/debug/audit。

## 预期产出

- 完整 Explain 命令文档和 adapter surface。
- Fixture tests 和 docs freshness 证据。

