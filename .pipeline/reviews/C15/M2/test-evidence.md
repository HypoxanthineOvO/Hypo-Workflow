# C15/M2 Test Evidence

## 测试设计

- 新增 `core/test/completion-report-contract.test.js`，只读取 tracked 的 source/docs/templates/spec/skill 文件，不读取 `.pipeline/` 运行时生成产物。
- 契约字段固定为 8 项：`change_summary`、`technical_approach`、`modified_files_or_modules`、`test_design`、`validation_results`、`expected_results`、`encountered_issues`、`risks_and_followups`。
- 覆盖三层断言：
  - shared completion contract：`COMPLETION_RESPONSE_SECTIONS`、`normalizeCompletionResponse`、`renderCompletionResponse` 必须暴露这些字段。
  - report templates：`assets/report-template.md`、`templates/report.md`、`templates/zh/report.md`、`templates/analysis/report.md`、`templates/zh/analysis-report.md` 必须出现这些字段或等价中英文标签。
  - completion surfaces：`skills/report/SKILL.md`、Milestone 相关模板/spec、`skills/cycle/SKILL.md`、`skills/debug/SKILL.md` + `references/debug-spec.md`、`skills/audit/SKILL.md` + `references/audit-spec.md`、`skills/patch/SKILL.md` 必须共享同一字段集合。

## 命令与结果

```bash
uv run -- node --test core/test/completion-report-contract.test.js
```

结果：失败，`0/3` 通过。当前红灯符合 test worker 预期，因为 implementation/template/surface 尚未实现 M2 的详细完成汇报契约。首个失败点：

- `COMPLETION_RESPONSE_SECTIONS must require change_summary`
- `assets/report-template.md must mention required completion field change_summary`
- `report_command completion surface must mention required completion field change_summary`

```bash
uv run -- node --test core/test/response-contract.test.js core/test/log-evidence.test.js core/test/progress-table.test.js
```

结果：通过，`10/10` passed。

## 风险与后续

- 新测试会在实现 worker 更新 shared completion contract、模板和 lifecycle surface 前保持红灯。
- 字段名现在由测试明确固定；实现 worker 若选择不同命名，需要同步修改测试或按本契约实现。
- 未修改 implementation/spec/template 文件，未修改 `.pipeline/state.yaml`、`.pipeline/log.yaml`、`.pipeline/PROGRESS.md`。
