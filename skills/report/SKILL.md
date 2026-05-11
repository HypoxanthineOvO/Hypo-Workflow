---
name: report
description: Summarize the latest Hypo-Workflow report when the user asks for the most recent evaluation result or milestone outcome.
---

# /hypo-workflow:report
## 输出语言规则

📌 输出语言规则：
读取 config.yaml → output.language
- zh-CN / zh：所有用户可见的输出使用中文（PROGRESS、报告、状态提示、错误消息、交互提问）
- en：使用英文
- auto：跟随用户对话语言
内部日志（log.yaml、state.yaml）始终英文。

Use this skill to summarize the latest generated report file.

## 前置条件

- a report exists in `.pipeline/reports/`, or the current state points to the latest report

## 执行流程

1. Read `.pipeline/state.yaml` if present.
2. Resolve `output.language` and `output.timezone` from project > global > defaults.
3. If the user passed `/hw:report --view M<N>`, locate the matching report in `.pipeline/reports/` or archived Cycle report directories and load the complete report content. Do not use `reports.compact.md` for `--view`.
4. If no `--view` target is provided and `.pipeline/reports.compact.md` exists, show the compact report summary list first.
5. Locate the latest report when a detailed latest summary is needed:
   - prefer `history.completed_prompts[-1].report_file`
   - otherwise use the newest report in `.pipeline/reports/`
6. Summarize in `output.language`:
   - milestone or prompt name
   - final decision
   - key scores
   - warnings
   - deferred or blocking notes if present
7. If `.pipeline/PROGRESS.md` exists, keep its summary consistent conceptually, but do not mutate it from a read-only report command.
8. Before displaying report snippets or summaries, apply the shared secret-safe evidence redaction helper. If generating or marking a report successful, block success when raw secret evidence is detected.

## Flags 参数

- `/hw:report --view M3`: load and display the complete report for Milestone `M3`.
- `/hw:report`: list compact report summaries from `.pipeline/reports.compact.md` when available; otherwise summarize the latest report.

## 输出规则

- report summaries must use `output.language`; default is `zh-CN`
- timestamps must be converted to `output.timezone`; default is `Asia/Shanghai`
- for Chinese output, use compact progress times: same day `HH:MM`, cross-day `DD日 HH:MM`
- template loading maps `zh-CN` / `zh` to `templates/zh/report.md`, maps `en` / `en-US` to `templates/en/report.md`, and falls back to `templates/report.md` when localized templates are missing

## 参考文件

- `references/evaluation-spec.md` — score interpretation
- `references/commands-spec.md` — report selection behavior
- `references/progress-spec.md` — progress summary relationship
- `SKILL.md` — full reporting context
