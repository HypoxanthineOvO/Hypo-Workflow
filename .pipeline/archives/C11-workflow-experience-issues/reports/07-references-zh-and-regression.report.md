# M7 - References 中文化与回归

## 结论

行为相关 references 已补中文主体结构，C11 完整回归、Sync 和 Docs 检查已通过。

## 做了什么

- 更新 `references/config-spec.md`、`progressive-discover-spec.md`、`commands-spec.md`、`subagent-spec.md` 的行为契约。
- 给平台/索引类 reference 补中文主体说明：`external-docs-index`、`opencode-command-map`、`opencode-parity`、`platform-capabilities`、`platform-codex`、`state-contract`、`v9-architecture`。
- 跑 OpenCode 与 Claude Code sync repair，并执行 docs 相关测试。

## 验证

- `uv run -- npm --prefix core test`：407/407 通过。
- `uv run python tests/run_regression.py`：63/63 通过。
- `uv run -- bash scripts/validate-config.sh .pipeline/config.yaml` 通过。
- `uv run -- git diff --check` 通过。
- `uv run -- node cli/bin/hypo-workflow sync --platform opencode --project /home/heyx/Hypo-Workflow --repair` 通过，`derived=fresh`。
- `uv run -- node cli/bin/hypo-workflow sync --platform claude-code --project /home/heyx/Hypo-Workflow --repair` 通过，`derived=fresh`。
- `uv run -- node --test core/test/docs-governance.test.js core/test/readme-spec.test.js core/test/platform-adapters.test.js`：14/14 通过。

## 手动操作

- 运行 `/hw:status` 查看 C11 完成状态。
- 运行 `/hw:explain "刚才为什么这样写?"` 检查是否输出结论、解释和下一步。
- 运行一次 `/hw:plan`，用“比如...”开头给例子，检查 Agent 是否先抽象需求再确认。
- 检查 `templates/subagent/*.md` 中 Layer 1 / Layer 2 注入字段。

## 已知风险

- `.pipeline/derived-health.yaml` 当前为 `ok: true`，`stale_count: 0`，`error_count: 0`。
