---
name: log
description: Read the unified lifecycle log when the user wants milestone, fix, audit, debug, review, or release history.
---

# /hypo-workflow:log
## 输出语言规则

📌 输出语言规则：
读取 config.yaml → output.language
- zh-CN / zh：所有用户可见的输出使用中文（PROGRESS、报告、状态提示、错误消息、交互提问）
- en：使用英文
- auto：跟随用户对话语言
内部日志（log.yaml、state.yaml）始终英文。

Use this skill to inspect `.pipeline/log.yaml`.

## 执行流程

1. If the user passed `--full`, read `.pipeline/log.yaml` directly and print `加载完整版 log.yaml (<N> 行)` when line counts are available.
2. If `--full` is absent, prefer `.pipeline/log.compact.yaml` when it exists; otherwise read `.pipeline/log.yaml`.
3. Resolve `output.language` and `output.timezone`.
4. Show the latest 10 entries by default, with timestamps converted to `output.timezone`.
5. Support:
   - `--all`
   - `--type <type>`
   - `--since <milestone>`
   - `--full`
6. If the log file is missing, state that no lifecycle log has been created yet in `output.language`.

Recent/status readers must sort by timestamp rather than file order and must use the shared secret-safe redaction helper before showing summaries. `/hw:log --full` may show complete lifecycle history, but status/dashboard Recent should remain a filtered user activity feed.

## Flags 参数

- `/hw:log --full`: ignore `.pipeline/log.compact.yaml` and load the complete lifecycle log.
- `/hw:log`: use compact log context when available, with full-file fallback when compact is absent.

## 参考文件

- `references/log-spec.md`
- `references/commands-spec.md`
- `SKILL.md`
