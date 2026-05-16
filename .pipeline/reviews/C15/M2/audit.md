# C15-M2 独立复审报告

审计 worker：`audit`
时间：2026-05-16T00:29:43+08:00
范围：C15-M2 `Detailed Completion Report Contract`

结论：无阻塞问题，C15-M2 可完成。

## Findings

### Warning：模板占位符命名仍未完全统一，属于后续兼容性风险

证据：

- `core/src/response/index.js:9-16` 将新 runtime completion 字段固定为 `change_summary`、`technical_approach`、`modified_files_or_modules`、`test_design`、`validation_results`、`expected_results`、`encountered_issues`、`risks_and_followups`。
- `templates/zh/report.md:16-21` 和 `templates/zh/analysis-report.md:13-18` 使用旧/短占位符：`modified_files`、`expected_result`、`problems_encountered`、`risks_follow_up`。
- `core/test/completion-report-contract.test.js:129-136` 目前通过中英文标签匹配确认字段存在，没有断言模板占位符必须与 runtime helper 输出键一致。

影响：

- 当前不阻塞 M2，因为模板语义字段齐全，核心 helper 也兼容 `expected_result` 输入别名。
- 如果后续有自动模板渲染直接使用 `normalizeCompletionResponse()` 的返回对象，中文模板中的 `{expected_result}` 等占位符可能无法被填充，导致字段标题存在但内容缺失。

建议：

- 后续 Patch 可选择统一模板占位符为 runtime 字段名，或补一个字段映射层测试，明确这些旧占位符是受支持别名。

### Info：新增 test/reference/review 交付文件仍为 untracked，需要合入前处理

证据：

- `git ls-files --others --exclude-standard` 显示以下 C15-M2 关键文件仍未纳入版本控制：
  - `core/test/completion-report-contract.test.js`
  - `references/completion-report-contract.md`
  - `.pipeline/reviews/C15/M2/implementation-evidence.md`
  - `.pipeline/reviews/C15/M2/test-evidence.md`
  - 本报告 `.pipeline/reviews/C15/M2/audit.md` 写入后也会是 untracked，除非后续统一 add。
- 同一命令还显示 C15 其它新增交付文件仍为 untracked，例如 `.pipeline/PROGRESS.md`、`.pipeline/prompts/01-detailed-completion-report-contract.md`、`core/test/p2-technical-route-contract.test.js`、`core/test/fixtures/p2-technical-route/*`。

影响：

- 这不是代码 blocker，但属于交付风险：若提交或打包时遗漏 untracked 文件，M2 的 contract reference 和测试覆盖不会随变更交付。

建议：

- 合入前由主 worker 统一确认 C15 新增文件清单并纳入版本控制，避免 audit worker 越权修改索引或其它文件。

## 覆盖复核

- 完成面覆盖：已覆盖 Milestone、Cycle、Debug、Audit、Patch。
  - 中央契约在 `references/completion-report-contract.md` 明确适用 `.pipeline/reports/`、Cycle archive summary、`.pipeline/debug/`、`.pipeline/audits/`、Patch close/pending-acceptance completion narratives 和最终用户回应。
  - `skills/cycle/SKILL.md`、`skills/debug/SKILL.md`、`skills/audit/SKILL.md`、`skills/patch/SKILL.md`、`skills/report/SKILL.md` 均引用或内联要求八个字段。

- 八个必填字段覆盖：已覆盖。
  - runtime helper 的 `COMPLETION_RESPONSE_SECTIONS` 包含 8 个新字段。
  - `normalizeCompletionResponse()` 和 `renderCompletionResponse()` 均输出新字段。
  - 模板、Debug/Audit specs、Progress/Log specs 和命令规范均出现对应中英文语义字段。

- `PROGRESS.md` 紧凑性：通过。
  - `references/progress-spec.md` 要求详细完成说明放入 reports、logs、Patch records 或最终回应，不放入长 `PROGRESS.md` 段落。
  - 当前 `.pipeline/PROGRESS.md` 只保留目标摘要和短时间线，没有内联完整 completion payload。

- `output.language` / `output.timezone`：通过。
  - `.pipeline/config.yaml` 为 `output.language: zh-CN`、`output.timezone: Asia/Shanghai`。
  - 新 contract 和模板均要求按 output language/timezone 生成 completion narrative。

- secret-safe evidence redaction：通过。
  - `references/completion-report-contract.md` 指向 `references/log-spec.md` 的 shared redaction contract。
  - `references/log-spec.md` 新增 Patch records 和 completion narratives 到 durable/user-facing evidence surfaces。
  - `core/test/log-evidence.test.js` 覆盖 log writer redaction、Recent feed redaction 和 successful report secret leak blocking。

- Runtime response helper 兼容性：通过。
  - 新字段：`COMPLETION_RESPONSE_SECTIONS`、`normalizeCompletionResponse()`、`renderCompletionResponse()` 均支持 8 字段。
  - 旧字段：`what_changed`、`why`、`key_files`、`validation`、`manual_operations`、`known_risks`、`next_steps` 仍被接收并在 rendered response 中保留 `手动操作`、`已知风险`、`下一步` 区块。

## 验证命令

```bash
uv run -- node --test core/test/completion-report-contract.test.js core/test/response-contract.test.js core/test/log-evidence.test.js core/test/progress-table.test.js
```

结果：通过，13/13。

```bash
bash tests/scenarios/v6/s24-audit-report/run.sh
bash tests/scenarios/v6/s25-debug-flow/run.sh
bash tests/scenarios/v8.2/s38-patch-fix-flow/run.sh
```

结果：全部通过。

```bash
git diff --check -- core/src/response/index.js core/test/completion-report-contract.test.js assets/report-template.md templates/report.md templates/en/report.md templates/zh/report.md templates/analysis/report.md templates/en/analysis-report.md templates/zh/analysis-report.md references/completion-report-contract.md skills/report/SKILL.md skills/debug/SKILL.md skills/audit/SKILL.md skills/patch/SKILL.md skills/cycle/SKILL.md references/progress-spec.md references/log-spec.md references/debug-spec.md references/audit-spec.md references/commands-spec.md .pipeline/reviews/C15/M2
```

结果：通过，无 whitespace error。

## 剩余风险 / 测试缺口

- 场景脚本 `s24`、`s25`、`s38` 当前主要验证既有 spec/skill 关键词，不直接断言新 completion 字段；字段覆盖主要由 `core/test/completion-report-contract.test.js` 承担。
- 新增 reference/test/review 文件仍是 untracked 交付风险，合入前必须统一确认。
- 历史报告不会自动补齐新字段；这符合本轮契约变更范围，但 `/hw:report` 汇总历史报告时需要按 `skills/report/SKILL.md` 标注缺失字段。
