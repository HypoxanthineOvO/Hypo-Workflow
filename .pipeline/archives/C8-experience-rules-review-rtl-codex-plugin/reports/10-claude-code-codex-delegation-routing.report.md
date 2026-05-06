# M11 / F004 - Claude Code Codex Delegation Routing Report

完成 Claude Code routing metadata for Codex implementation delegation。

Planning profiles：

- `premium`
- `balanced`
- `cost_saver`

共同约束：

- planning/review/test remain separated from implementation
- Codex delegation is implementation-only
- missing plugin falls back to Claude/current worker execution
- Hypo-Workflow does not call models directly

验证：

- `node --test core/test/claude-codex-plugin.test.js`
- `node --test core/test/claude-*.test.js`
