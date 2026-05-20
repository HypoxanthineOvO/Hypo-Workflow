# C15-M2 执行报告：Detailed Completion Report Contract

## 改动摘要

C15-M2 已完成。本轮把用户要求的“完成后必须详细汇报”固化成共享 completion narrative contract，并覆盖 Milestone、Cycle、Debug、Audit、Patch 五类完成面。

新的完成说明要求包含八个必填语义字段：`change_summary` / 改动摘要、`technical_approach` / 技术思路、`modified_files_or_modules` / 修改文件/模块、`test_design` / 测试设计、`validation_results` / 验证结果、`expected_results` / 预期结果、`encountered_issues` / 遇到的问题、`risks_and_followups` / 风险/后续。

## 技术思路

本轮采用“共享契约 + 各入口引用 + runtime helper 支持”的路线。只改单个模板不够，因为用户要求覆盖 Milestone/Cycle/Debug/Audit/Patch，多入口如果各自维护字段，很容易再次变成有的报告详细、有的报告只说完成。

所以本轮新增 `references/completion-report-contract.md` 作为权威契约，再把它接到 report 模板、analysis 模板、report/debug/audit/patch/cycle skills，以及 commands/progress/log/debug/audit specs。运行时侧同步更新 `core/src/response/index.js`，让 `normalizeCompletionResponse()` 和 `renderCompletionResponse()` 真正理解八个新字段，同时兼容旧字段输入，例如 `what_changed`、`why`、`key_files`、`validation`、`manual_operations`、`known_risks` 和 `next_steps`。

`PROGRESS.md` 被明确保持为紧凑看板和短时间线；详细 payload 应进入 reports、debug/audit 文件、Patch records、log-linked artifacts 或最终用户回应。

## 修改文件/模块

- `references/completion-report-contract.md`：新增共享完成汇报契约，定义适用范围、八个字段、PROGRESS/log 边界、语言/时区和密钥脱敏要求。
- `assets/report-template.md`、`templates/report.md`、`templates/en/report.md`、`templates/zh/report.md`：Milestone 报告模板加入八项完成说明。
- `templates/analysis/report.md`、`templates/en/analysis-report.md`、`templates/zh/analysis-report.md`：Analysis 报告模板同步加入八项完成说明。
- `skills/report/SKILL.md`：要求报告摘要或 synthesized completion narrative 保留字段，不完整时标注缺失。
- `skills/debug/SKILL.md`、`references/debug-spec.md`：Debug 结束报告必须映射到八项字段。
- `skills/audit/SKILL.md`、`references/audit-spec.md`：Audit 结束报告必须覆盖范围、扫描方法、发现、验证、预期修复效果和风险。
- `skills/patch/SKILL.md`：Patch close / pending acceptance narrative 必须覆盖字段，同时保留 Patch fix 不写 `state.yaml`、不生成 Milestone report 的约束。
- `skills/cycle/SKILL.md`：Cycle close / archive summary 必须给 Cycle 级完成说明。
- `references/progress-spec.md`、`references/log-spec.md`、`references/commands-spec.md`：补齐 completion payload 的归属和摘要边界。
- `core/src/response/index.js`：运行时完成回应 schema 改为八个新字段，并保留旧字段兼容渲染。
- `core/test/completion-report-contract.test.js`：新增契约测试，检查共享字段、模板和五类完成面。

## 测试设计

测试 worker 先写 RED 测试，不改实现文件。新增测试不依赖 `.pipeline/` 运行时产物，只读取 tracked docs/templates/specs 和 runtime helper，避免 clean checkout 中缺文件。

测试覆盖三层：

- Runtime completion response contract：`COMPLETION_RESPONSE_SECTIONS` 必须包含八个字段，`normalizeCompletionResponse()` 必须保留字段，`renderCompletionResponse()` 必须渲染字段。
- Report templates：Milestone 和 Analysis 中英文模板必须暴露八项完成说明。
- Completion surfaces：Milestone、Cycle、Debug、Audit、Patch 的 skill/spec surface 必须共享这套字段。

实施完成后，主代理额外补了两个集成点：runtime helper 字段映射，以及英文/中文模板占位符统一。这样测试不只是文档变绿，实际 response helper 也能输出新结构。

## 验证结果

RED 阶段：

```bash
uv run -- node --test core/test/completion-report-contract.test.js
```

结果：预期失败，0/3。失败原因是当时共享契约、模板和 runtime helper 尚未包含新字段。

GREEN 阶段已通过：

```bash
uv run -- node --test core/test/completion-report-contract.test.js core/test/response-contract.test.js core/test/log-evidence.test.js core/test/progress-table.test.js
```

结果：13/13 tests passing。

Smoke 场景已通过：

```bash
bash tests/scenarios/v6/s24-audit-report/run.sh
bash tests/scenarios/v6/s25-debug-flow/run.sh
bash tests/scenarios/v8.2/s38-patch-fix-flow/run.sh
```

结果：全部通过。

Diff 检查已通过：

```bash
git diff --check -- core/src/response/index.js core/test/completion-report-contract.test.js assets/report-template.md templates/report.md templates/en/report.md templates/zh/report.md templates/analysis/report.md templates/en/analysis-report.md templates/zh/analysis-report.md references/completion-report-contract.md skills/report/SKILL.md skills/debug/SKILL.md skills/audit/SKILL.md skills/patch/SKILL.md skills/cycle/SKILL.md references/progress-spec.md references/log-spec.md references/debug-spec.md references/audit-spec.md references/commands-spec.md .pipeline/reviews/C15/M2
```

结果：无 whitespace error。

独立 audit 结论：无阻塞问题，C15-M2 可完成。audit 提到中文模板占位符与 runtime 字段名未完全统一；本轮已在完成前修复，并重跑验证通过。

## 预期结果

后续 Milestone、Cycle、Debug、Audit、Patch 完成时，汇报应能清楚说明：改了什么、为什么这样改、动了哪些文件或模块、测试怎么设计、验证结果是什么、完成后应该产生什么行为、遇到过什么问题、还剩哪些风险或后续事项。

对用户来说，完成回复不应再只有“完成了，见某文件”。对 Workflow 自身来说，`PROGRESS.md` 仍保持短摘要，详细证据进入报告、日志关联产物或最终回应。

## 遇到的问题

主要问题有三个：

- 第一次 GREEN 验证发现 implementation worker 只更新了 docs/templates，没有更新 `core/src/response/index.js` 的 runtime response schema。
- 英文模板初版使用 `Expected Result` 单数，新增测试按 `expected_results` 字段匹配，导致模板字段命名不一致。
- 独立 audit 发现中文模板仍使用旧占位符，例如 `{expected_result}`、`{modified_files}`、`{problems_encountered}`、`{risks_follow_up}`。这些不是语义缺失，但会给后续自动渲染带来内容填充风险；已统一到 runtime 字段名。

此外，`tests/run_regression.py --scenario ...` 实际没有实现 `--scenario` 过滤，命令会跑全量 68 个场景并混入当前工作区历史失败。为避免误判，本轮改用对应场景的 `run.sh` 做 targeted smoke。

## 风险/后续

- 新增 `core/test/completion-report-contract.test.js`、`references/completion-report-contract.md` 和 M2 review/report 文件当前是 untracked，最终交付或提交时必须纳入变更集。
- 历史报告不会自动补齐八个字段；`/hw:report` 汇总历史报告时应按新规则标注缺失字段，而不是伪造内容。
- 场景脚本 `s24`、`s25`、`s38` 仍主要检查既有关键词，八项字段覆盖主要由 Node contract test 承担。

## 决策

C15-M2 完成。没有未解决 blocker。可以进入 C15-M3 `Interactive Analysis State And Command Entry`。
