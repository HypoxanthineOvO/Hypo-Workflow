---
name: debug
description: Investigate a concrete failure when the user wants symptom-driven root-cause analysis instead of a preventive audit scan.
---

# /hypo-workflow:debug
## Output Language Rules

📌 输出语言规则：
读取 config.yaml → output.language
- zh-CN / zh：所有用户可见的输出使用中文（PROGRESS、报告、状态提示、错误消息、交互提问）
- en：使用英文
- auto：跟随用户对话语言
内部日志（log.yaml、state.yaml）始终英文。

Use this skill for the five-step debug workflow.

When project `execution.worker_separation.mode` is enabled:

- keep implementation help separate from test reproduction when practical
- `/hw:audit` remains the canonical audit lane and should not be duplicated inside debug
- if debug work degrades role separation, record that limitation explicitly

## Preconditions

- a concrete symptom, failing test, trace, or abnormal behavior is available

## Execution Flow

1. Collect symptoms.
2. Gather context:
   - architecture baseline
   - lifecycle log
   - recent milestone report
   - recent git changes
3. Resolve `output.language` and `output.timezone`.
4. Generate 3-5 ranked hypotheses.
5. Validate them in order.
6. Produce a root-cause report and optional fix suggestion in `output.language`.
7. With `--auto-fix`, only claim success after validation passes.
8. Apply the shared secret-safe evidence redaction helper before durable writes; do not store raw API keys, tokens, Authorization headers, cookies, passwords, or private keys.
9. Write the report to `.pipeline/debug/` with timestamps in `output.timezone` and append a debug lifecycle entry.
10. Set `current.phase=lifecycle_debug` when state tracking is used.

## Reference Files

- `references/debug-spec.md`
- `references/log-spec.md`
- `SKILL.md`
