# 用户指南

Hypo-Workflow 围绕 `.pipeline/` 的状态、提示、报告、日志和恢复文件组织长周期 AI 编程工作。它不是 runner，真正的编码、测试和审查仍由当前宿主 Agent 完成。

## 安装形态

从当前宿主 Agent 对应的平台 Guide 开始。README 保持通用入口，具体安装或同步命令放在平台页面。

| 平台 | 安装 / 同步入口 | Guide |
|---|---|---|
| Codex | 将仓库安装或 symlink 为 Codex Skill source。 | `docs/platforms/codex.md` |
| Claude Code | 安装 `hw` plugin 或用 `--plugin-dir` 调试；项目内用 `hypo-workflow sync --platform claude-code --project .` 同步 hooks/agents。 | `docs/platforms/claude-code.md` |
| OpenCode | 用 `hypo-workflow init-project --platform opencode --project .` 生成 native commands、agents、plugins 和 status artifacts。 | `docs/platforms/opencode.md` |
| Cursor | 生成 `.cursor/rules/hypo-workflow.mdc`。 | `docs/platforms/cursor.md` |
| GitHub Copilot | 生成 `.github/copilot-instructions.md`。 | `docs/platforms/copilot.md` |
| Trae | 生成 `.trae/rules/project_rules.md`。 | `docs/platforms/trae.md` |

## 常用流程

- 用 `/hw:plan` 规划工作，再用 `/hw:start` 或 `/hw:resume` 执行。
- 用 `/hw:status` 查看进度，用 `/hw:report` 查看报告。
- 用 `/hw:explain [question]` 提问代码、配置、命令或近期改动原因；回答必须引用本地文件证据，证据不足时要明确 unknowns。
- 用 `/hw:explain --subagent [question]` 让独立 Subagent 先做只读取证，主 Agent 校验 evidence packet 后再回答；平台不支持 Subagent 时记录 `fallback_reason` 并降级为 self evidence-first。
- 用 `/hw:pr inspect|review|fix|merge|close <url|id>` 处理已有 GitHub PR 或 GitLab MR，并把本地证据归档到 `.pipeline/pr/`。
- 用 `/hw:sync --repair` 修复派生上下文，用 `/hw:docs repair` 修复文档。
- 生命周期 gate 处用 `/hw:accept` 或 `/hw:reject` 明确验收。

## Explain 与 Status/Debug/Audit 的区别

`/hw:explain` 是只读问答命令，适合解释新项目代码框架、某个配置为什么 strict、刚才为什么这样写，或者某个命令/文档的用途。它不修改文件，不替代 `/hw:status` 的进度摘要，也不替代 `/hw:debug` / `/hw:audit` 的问题定位和风险扫描。

## Feature Queue

Feature Queue 支持长周期规划，但不会把 Hypo-Workflow 变成 runner。

- Use `/hw:plan --batch` to discover multiple Features and create a queue.
- Use `/hw:plan --insert` to stage a natural-language queue edit before confirmation.
- `.pipeline/feature-queue.yaml` stores Features, dependencies, gates, and scheduling metadata.
- `.pipeline/metrics.yaml` stores duration, token, cost, and telemetry fallback summaries.
- `upfront` decomposition writes milestones for the whole queue early.
- `just_in_time` decomposition materializes milestones when a Feature becomes current.
- `gate: confirm` pauses before work that requires explicit human review.
- `auto_chain` can advance ready Features when gates and failure policy allow it.
- `failure_policy: skip_defer` defers failed Features instead of blocking the whole queue.

## 恢复

结构化 execution lease 和生命周期日志会保存足够上下文，便于在支持的平台上安全 resume 或 handoff。
