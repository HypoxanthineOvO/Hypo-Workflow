# C15-M2 Implementation Evidence

Worker: `implement`

## Scope

Edited only authorized completion report contract guidance, templates, skills, and specs:

- `references/completion-report-contract.md`
- `references/commands-spec.md`
- `references/progress-spec.md`
- `references/log-spec.md`
- `references/debug-spec.md`
- `references/audit-spec.md`
- `assets/report-template.md`
- `templates/report.md`
- `templates/en/report.md`
- `templates/zh/report.md`
- `templates/analysis/report.md`
- `templates/en/analysis-report.md`
- `templates/zh/analysis-report.md`
- `skills/report/SKILL.md`
- `skills/debug/SKILL.md`
- `skills/audit/SKILL.md`
- `skills/patch/SKILL.md`
- `skills/cycle/SKILL.md`

No test files, runtime source files, or protected workflow state files were edited.

## Design

Added a shared completion narrative contract in `references/completion-report-contract.md` and linked it from the command/spec/skill surfaces that generate or summarize Milestone, Cycle, Debug, Audit, and Patch completions.

The contract requires eight reviewable fields:

- Change Summary / 改动摘要
- Technical Approach / 技术思路
- Modified Files / Modules / 修改文件/模块
- Test Design / 测试设计
- Validation Results / 验证结果
- Expected Result / 预期结果
- Problems Encountered / 遇到的问题
- Risks / Follow-Up / 风险/后续

Templates now include the required fields directly so generated reports cannot omit them by default. Skills now state that final responses and persisted reports must preserve these fields, and missing source fields must be called out rather than silently dropped.

## Contract Details

- Milestone reports use `assets/report-template.md`, `templates/report.md`, and localized report templates with the same completion field set.
- Analysis report templates also include the field set so analysis-style Milestones keep the same completion surface.
- Cycle close and archive summary guidance now requires Cycle-level completion narrative fields.
- Debug and Audit specs now include completion narrative sections in their report templates.
- Patch close or pending-acceptance guidance now requires the fields in Patch records/final responses while preserving the rule that Patch fixes do not generate Milestone `report.md`.
- `PROGRESS.md` guidance explicitly keeps detailed completion payloads out of progress board rows.
- Secret-safe evidence redaction remains tied to `references/log-spec.md`, now including Patch records and completion narratives.
- Output language and timezone rules remain explicit through existing skill/template language and the new contract.

## Validation

Ran:

```bash
rg -n "Completion Narrative|完成说明|Change Summary|改动摘要|Technical Approach|技术思路|Modified Files / Modules|修改文件/模块|Test Design|测试设计|Validation Results|验证结果|Expected Result|预期结果|Problems Encountered|遇到的问题|Risks / Follow-Up|风险/后续" references/completion-report-contract.md assets/report-template.md templates/report.md templates/en/report.md templates/zh/report.md templates/analysis/report.md templates/en/analysis-report.md templates/zh/analysis-report.md skills/report/SKILL.md skills/debug/SKILL.md skills/audit/SKILL.md skills/patch/SKILL.md skills/cycle/SKILL.md references/progress-spec.md references/log-spec.md references/debug-spec.md references/audit-spec.md references/commands-spec.md
git diff --check -- assets/report-template.md templates/report.md templates/en/report.md templates/zh/report.md templates/analysis/report.md templates/en/analysis-report.md templates/zh/analysis-report.md skills/report/SKILL.md skills/debug/SKILL.md skills/audit/SKILL.md skills/patch/SKILL.md skills/cycle/SKILL.md references/progress-spec.md references/log-spec.md references/debug-spec.md references/audit-spec.md references/commands-spec.md references/completion-report-contract.md
rg -n "[[:blank:]]$" references/completion-report-contract.md .pipeline/reviews/C15/M2/implementation-evidence.md
```

Results:

- Required field labels are present in the shared contract, report templates, analysis templates, Debug/Audit specs, and relevant command skills.
- `git diff --check` passed with no whitespace errors.
- Trailing whitespace scan for the new untracked reference/evidence files returned no matches.

## Not Covered / Risks

- Did not edit or run test-owned contract tests; the test worker owns `core/test/*` coverage.
- Did not update generated adapters or derived compact files.
- Some runtime report-generation code may need follow-up wiring if it does not yet populate the new placeholders.
- Existing historical reports remain unchanged and may lack the new completion fields.
