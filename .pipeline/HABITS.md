# Hypo-Workflow Habits

This file is generated from structured Rules/Habits authority. Edit structured rule records, then regenerate derived views.

## Active Rules

- **auto-continue-threshold** [builtin/warn/workflow]
  - Govern automatic continuation decisions after evaluation.
  - hooks: on-evaluate
- **claude-hw-command-namespace** [project/error/workflow]
  - Claude Code integration must expose Hypo-Workflow commands through the `hw` plugin namespace as `/hw:*` slash commands while keeping Claude native `/resume` separate from Hypo `/hw:resume`.
  - hooks: always, pre-commit, pre-release
  - source: .pipeline/rules/structured/project/claude-hw-command-namespace.yaml
- **config-valid** [builtin/warn/guard]
  - Validate project configuration before milestone execution.
  - hooks: pre-milestone
- **conflict-check** [builtin/warn/guard]
  - Detect incompatible local agent plugins or hook systems at session start.
  - hooks: on-session-start
- **cycle-closed** [builtin/warn/guard]
  - Check that the previous explicit Cycle was closed before starting a new delivery lane.
  - hooks: pre-milestone
- **git-clean-check** [builtin/warn/guard]
  - Check whether the Git working tree has uncommitted changes before milestone execution.
  - hooks: pre-milestone
- **knowledge-ledger-self-check** [builtin/warn/hook]
  - Require a Knowledge Ledger self-check after work that changes reusable project knowledge.
  - hooks: post-step, post-milestone
- **plan-tool-required** [builtin/warn/workflow]
  - Complex planning and execution work must maintain a visible plan/todo state.
  - hooks: always, pre-milestone
- **prefer-chinese-output** [project/warn/style]
  - 面向用户的说明、README 更新、PROGRESS 摘要和交互提示优先使用中文。命令名、配置键、文件名和专有英文术语保持英文。
  - hooks: always
  - source: .pipeline/rules/custom/prefer-chinese-output.md
- **progress-timezone** [builtin/warn/style]
  - Keep PROGRESS timestamps aligned with output.timezone.
  - hooks: always
- **readme-freshness** [builtin/warn/release]
  - Ensure README managed content matches version, command count, platform matrix, features, and release policy before publishing.
  - hooks: pre-commit, pre-release
- **report-language** [builtin/warn/style]
  - Keep reports and generated summaries aligned with output.language.
  - hooks: always
- **review-strictness** [builtin/warn/workflow]
  - Apply the configured review strictness during evaluation.
  - hooks: on-evaluate
- **session-start-context-load** [builtin/error/hook]
  - Preserve SessionStart context loading as a rule-level gate.
  - hooks: on-session-start
- **skill-quality** [builtin/warn/quality]
  - Validate Skill frontmatter, canonical output-language heading, reference paths, command map traceability, and internal Skill exceptions.
  - hooks: pre-milestone, pre-release
- **stop-hook-self-check** [builtin/error/hook]
  - Preserve the Stop Hook self-check as a rule-level gate.
  - hooks: post-step

## Conflicts

No structured rule conflicts.
