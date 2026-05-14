---
name: report
description: Summarize the latest Hypo-Workflow report when the user asks for the most recent evaluation result or milestone outcome.
---

# /hypo-workflow:report
## Output Language Rules

📌 输出语言规则：
读取 config.yaml → output.language
- zh-CN / zh：所有用户可见的输出使用中文（PROGRESS、报告、状态提示、错误消息、交互提问）
- en：使用英文
- auto：跟随用户对话语言
内部日志（log.yaml、state.yaml）始终英文。

Use this skill to summarize the latest generated report file.

## Prerequisites

- `.pipeline/reports/` 中存在报告，或当前状态指向最新报告

## Execution Flow

1. 如果存在，读取 `.pipeline/state.yaml`。
2. 从项目 > 全局 > 默认值解析 `output.language` 和 `output.timezone`。
3. 如果用户传递了 `/hw:report --view M<N>`，则在 `.pipeline/reports/` 或已存档的 Cycle 报告目录中定位匹配的报告，并加载完整的报告内容。不要将 `reports.compact.md` 用于 `--view`。
4. 如果未提供 `--view` 目标且 `.pipeline/reports.compact.md` 存在，则首先显示紧凑报告摘要列表。
5. 当需要详细的最新摘要时，定位最新报告：
   - 优先使用 `history.completed_prompts[-1].report_file`
   - 否则使用 `.pipeline/reports/` 中的最新报告
6. 以 `output.language` 摘要：
   - Milestone 或提示名称
   - 最终决定
   - 关键分数
   - 警告
   - 如果存在，则延迟或阻止注释
7. 如果 `.pipeline/PROGRESS.md` 存在，请在概念上保持其摘要一致，但不要从只读报告命令对其进行修改。
8. 在显示报告片段或摘要之前，应用共享的密钥安全证据编辑助手。如果生成或标记报告成功，则在检测到原始密钥证据时阻止成功。

## Flags

- `/hw:report --view M3`：加载并显示 Milestone `M3` 的完整报告。
- `/hw:report`：当可用时，列出 `.pipeline/reports.compact.md` 中的紧凑报告摘要；否则摘要最新报告。

## Output Rules

- 报告摘要必须使用 `output.language`；默认为 `zh-CN`
- 时间戳必须转换为 `output.timezone`；默认为 `Asia/Shanghai`
- 对于中文输出，使用紧凑的进度时间：同一天 `HH:MM`，跨天 `DD日 HH:MM`
- 模板加载将 `zh-CN` / `zh` 映射到 `templates/zh/report.md`，将 `en` / `en-US` 映射到 `templates/en/report.md`，当本地化模板缺失时回退到 `templates/report.md`

## Reference Files

- `references/evaluation-spec.md` — score interpretation
- `references/commands-spec.md` — report selection behavior
- `references/progress-spec.md` — progress summary relationship
- `SKILL.md` — full reporting context
