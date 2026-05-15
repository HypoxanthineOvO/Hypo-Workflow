# M6 — 综合报告、修复队列与检查清单

## 目标

整合 M0-M5 的审查结果，生成最终审查报告、结构化 findings、修复队列和未来兼容性检查清单。

## 输入

- `.pipeline/reports/C14-M0-baseline-index.md`
- `.pipeline/reports/C14-M1-workflow-state-audit.md`
- `.pipeline/reports/C14-M2-platform-compatibility-audit.md`
- `.pipeline/reports/C14-M3-prompt-rules-audit.md`
- `.pipeline/reports/C14-M4-test-hardcode-audit.md`
- `.pipeline/reports/C14-M5-docs-onboarding-audit.md`

## 输出

生成：

- `.pipeline/reports/C14-compatibility-audit.md`
- `.pipeline/reports/C14-findings.yaml`
- `.pipeline/reports/C14-fix-queue.md`
- `.pipeline/reports/C14-compatibility-checklist.md`

## 报告结构

按审查域组织，每域包含：

- Conclusion
- Evidence
- Risks
- Findings (P0-P4)
- Suggested fixes
- Follow-up milestone candidates
- Pending hypotheses

## Findings YAML 字段

每项至少包含：

```yaml
- id: C14-F001
  severity: P1
  area: workflow_state|platform_adapter|prompt_rules|tests|docs|extension
  title: "..."
  evidence:
    - path: "..."
      lines: "..."
      note: "..."
  impact: "..."
  suggested_fix: "..."
  owner_hint: "..."
  fix_shape: milestone|patch|docs|test|research
```

## 验收

- 所有正式 findings 必须有证据。
- P0/P1 必须有 suggested_fix 和 impact。
- 无证据项只能在 Pending hypotheses。
- 修复队列需同时提供 Markdown 表格和 Milestone 候选。
