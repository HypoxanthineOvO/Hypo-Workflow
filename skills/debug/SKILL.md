---
name: debug
description: Investigate a concrete failure when the user wants symptom-driven root-cause analysis instead of a preventive audit scan.
---

# /hypo-workflow:debug
## 输出语言规则

📌 输出语言规则：
读取 config.yaml → output.language
- zh-CN / zh：所有用户可见的输出使用中文（PROGRESS、报告、状态提示、错误消息、交互提问）
- en：使用英文
- auto：跟随用户对话语言
内部日志（log.yaml、state.yaml）始终英文。

Use this skill for the five-step debug workflow.

When project `execution.worker_separation.mode` is enabled:

- when `execution.worker_separation.mode=off`, keep implementation help separate from test reproduction when practical
- when `execution.worker_separation.mode=recommended`, debug may not claim worker-separated validation if reproduction/test and implementation collapse onto one worker; stop, retry, defer, or require explicit user-confirmed downgrade before local role-sensitive edits
- when `execution.worker_separation.mode=strict`, debug must keep reproduction/test, implementation, and audit/validation workers distinct before claiming completion evidence
- resolve Subagent/delegation authorization before role-sensitive reproduction, auto-fix implementation, or validation work starts
- `test` or reproduction workers own failure reproduction, failing tests, fixtures, snapshots, assertions, validation commands, and evidence; `implement` workers must not create, edit, or rewrite that test evidence
- `implement` workers own only production/runtime/documentation fixes and must not spawn or impersonate `test` or `audit`
- audit or validation workers are independent; `/hw:audit` remains the canonical audit lane and debug must not silently collapse audit into the fixer
- the main agent owns worker lifecycle: record `requested`, `started`, `completed|failed|blocked`, and `closed|close_failed`; wait for evidence before advancing and close/release workers when debug stops, blocks, aborts, or completes
- if authorization is absent or declined, stop or record a documented degraded path that cannot satisfy worker-separation gates; degraded debug work must remain blocked/pending for worker-separated completion
- do not reproduce, fix, and validate locally first and then report that the independent worker was unavailable
- if debug work degrades role separation, record that limitation explicitly

## 前置条件

- a concrete symptom, failing test, trace, or abnormal behavior is available

## 执行流程

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
7. Before `--auto-fix` edits or independent validation, confirm required worker authorization or stop with a blocking reason.
8. With `--auto-fix`, only claim success after validation passes.
9. Before leaving the debug turn, close/release any workers opened by debug or record `close_failed` with worker id and reason; unresolved worker lifecycle cannot satisfy debug validation evidence.
10. Apply the shared secret-safe evidence redaction helper before durable writes; do not store raw API keys, tokens, Authorization headers, cookies, passwords, or private keys.
11. Write the report to `.pipeline/debug/` with timestamps in `output.timezone` and append a debug lifecycle entry.
12. Set `current.phase=lifecycle_debug` when state tracking is used.

## 参考文件

- `references/debug-spec.md`
- `references/log-spec.md`
- `SKILL.md`
