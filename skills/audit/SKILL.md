---
name: audit
description: Run a preventive code audit when the user wants graded findings across security, bugs, architecture, performance, tests, and quality.
---

# /hypo-workflow:audit
## 输出语言规则

📌 输出语言规则：
读取 config.yaml → output.language
- zh-CN / zh：所有用户可见的输出使用中文（PROGRESS、报告、状态提示、错误消息、交互提问）
- en：使用英文
- auto：跟随用户对话语言
内部日志（log.yaml、state.yaml）始终英文。

Use this skill for deep project auditing.

When an audit is used as acceptance or worker-separation evidence, resolve Subagent/delegation authorization before scanning starts. The audit worker must be independent from the worker that implemented the audited change. If authorization is absent, declined, or unavailable, stop or record a degraded audit that cannot satisfy acceptance gates; do not audit locally first and then claim independent review was missing.

## 前置条件

- source code and architecture baseline should be available

## 执行流程

1. Determine scope:
   - full project
   - `--scope <dir>`
   - `--since <milestone>`
2. Read the architecture baseline first.
3. Resolve `output.language` and `output.timezone`.
4. If the audit will count as acceptance evidence, confirm the independent audit worker is authorized and distinct from implementation before scanning.
5. Scan the six audit dimensions.
6. Grade findings as `Critical`, `Warning`, or `Info`.
7. Write the report to `.pipeline/audits/audit-NNN.md` in `output.language`.
8. Render report timestamps in `output.timezone`.
9. Apply the shared secret-safe evidence redaction helper before durable writes; do not store raw API keys, tokens, Authorization headers, cookies, passwords, or private keys.
10. Append a lifecycle log entry.
11. Set `current.phase=lifecycle_audit` when state tracking is used.

## 参考文件

- `references/audit-spec.md`
- `references/log-spec.md`
- `SKILL.md`
