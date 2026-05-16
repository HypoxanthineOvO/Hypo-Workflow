# C15-M2 Detailed Completion Report Contract

## Goal

Make Milestone, Cycle, Debug, Audit, and Patch completions detailed and reviewable. Completion output must explain what was changed or designed, what tests were designed, which areas were touched, the reasoning, expected results, encountered problems, and residual risks.

## Technical Solution

Introduce a shared completion narrative contract and thread it through durable reports plus final user-facing completion responses.

Required fields:

- 改动摘要
- 技术思路
- 修改文件/模块
- 测试设计
- 验证结果
- 预期结果
- 遇到的问题
- 风险/后续

## Subworker Assignment Plan

Status: authorized. Worker Separation mode: recommended.

- `test`
  - Owns report/response shape tests and scenario checks for Debug, Audit, Patch, Milestone, and Cycle completion surfaces.
  - Evidence path: `.pipeline/reviews/C15/M2/test-evidence.md`.
- `implement`
  - Owns template/spec/skill updates for the completion contract.
  - Evidence path: `.pipeline/reviews/C15/M2/implementation-evidence.md`.
- `audit`
  - Confirms every requested completion surface is covered and secret redaction remains effective.
  - Evidence path: `.pipeline/reviews/C15/M2/audit.md`.
- Main agent
  - Coordinates workers and writes lifecycle updates plus report.

## Required Steps

1. Read `assets/report-template.md`, `templates/report.md`, `templates/zh/report.md`, `templates/analysis/report.md`, `templates/zh/analysis-report.md`, `skills/report/SKILL.md`, `skills/debug/SKILL.md`, `skills/audit/SKILL.md`, `skills/patch/SKILL.md`, `skills/cycle/SKILL.md`, `references/progress-spec.md`, `references/log-spec.md`, `references/debug-spec.md`, and `references/audit-spec.md`.
2. Define the shared completion contract in a central reference surface.
3. Update report templates and command skills so completion responses cannot omit required fields.
4. Keep `PROGRESS.md` as a compact board; detailed payload belongs in reports/logs and final completion text.
5. Preserve output language and timezone rules.
6. Preserve secret-safe evidence redaction before success claims.

## Validation

Run targeted checks:

```bash
uv run -- node --test core/test/response-contract.test.js core/test/log-evidence.test.js core/test/progress-table.test.js
uv run python tests/run_regression.py --scenario s24-audit-report --scenario s25-debug-flow --scenario s38-patch-fix-flow
```

Smoke expectation: sample completion outputs for Milestone/Cycle/Debug/Audit/Patch all contain the required fields.

## Completion Report Requirements

The final report for this Milestone must itself follow the new detailed completion contract.
