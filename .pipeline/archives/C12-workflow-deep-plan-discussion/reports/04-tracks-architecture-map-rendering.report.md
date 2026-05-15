# C12/M4 Report - Requirement Tracks、Architecture Map 与人读渲染

## 结果

M4 已完成。Deep Plan 现在支持结构化 requirement/theme/module tracks、architecture map、relationship validation，以及从结构化 source 渲染 Markdown + Mermaid。

## 已完成

- 新增 track normalization，兼容 legacy `kind` 并规范为 `type`。
- 新增 module track derivation，保留 source requirement/theme context 与 evidence refs。
- 新增 relationship validation，覆盖 track relationships 和 architecture graph edges。
- 新增 architecture map update，并持久化 `architecture.yaml`、`tracks.yaml`、`architecture.md`。
- 渲染输出来自结构化 source，Markdown 不作为 source of truth。

## 验证

- `uv run -- node --test core/test/deep-plan-architecture.test.js`：7/7 passing。
- `uv run -- node --test core/test/deep-plan-package.test.js core/test/deep-plan-ask.test.js core/test/deep-plan-research.test.js core/test/deep-plan-architecture.test.js`：27/27 passing。
- `git diff --check`：passing。

## Carry-Forward

- M5 将使用 M4 的 tracks/architecture source 来实现 scoped drill、readiness depth 和 convert gate。
