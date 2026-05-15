# Evaluation Spec

Use this reference when turning step evidence into a prompt-level decision.

## Primary Scores

### diff_score

Measures output drift from the prompt.

- `1`: fully aligned
- `2`: minor acceptable differences
- `3`: noticeable but reasonable differences
- `4`: large differences that need discussion
- `5`: severe deviation; stop the pipeline

### code_quality

Measures implementation quality independent of scope drift.

- `1`: unacceptable
- `2`: weak
- `3`: acceptable
- `4`: strong
- `5`: excellent

> **Deprecated scale direction (V1).** The V1 `code_quality` scale above
> (`1 = unacceptable`, `5 = excellent`) is retained for historical reference
> only. The canonical scale is the V4 direction: **`1 = excellent`,
> `5 = poor`** (see §多维度评分体系). All new evaluation logic and
> `adaptive_threshold` calculations must use the V4 direction.

## Check Set

Apply only the checks listed in `evaluation.checks`.

- `tests_pass`
  GREEN phase is fully passing, or an approved fallback validation succeeded for non-test presets.
- `no_regressions`
  Previously green behavior remains green.
- `matches_plan`
  Files, interfaces, and observable behavior broadly match `预期产出`.
- `code_quality`
  `code_quality >= 3`.

For `analysis` preset, use evidence-oriented checks instead of TDD red/green assumptions:

- `question_addressed`
  The ledger/report contains a clear question and conclusion.
- `evidence_complete`
  Required ledger fields are present, including the environment snapshot.
- `conclusion_traceable`
  The conclusion links back to observations and experiments.
- `experiment_executed`
  At least one concrete command, script, comparison, log query, metric collection, or source/config inspection was recorded.
- `change_validated`
  Required only when analysis actually changed code; non-code analysis marks this criterion `not_applicable`.
- `followup_recorded`
  Follow-up actions or a build follow-up proposal are recorded.

`analysis` evaluation must not require TDD red/green. `partial`, `disproved`, and `inconclusive` outcomes can still be valid completed analysis results when the evidence chain is traceable.

## Test Profile Evidence

When `execution.test_profiles` is enabled or a Feature declares a matching profile, required evidence becomes category-specific:

- `webapp`
  - require E2E execution
  - require browser interaction evidence
  - require screenshot or equivalent visual proof
  - block if the only evidence is unit tests
- `agent-service`
  - require CLI planning evidence
  - require shared core interface evidence
  - require real CLI scenario execution
- `research`
  - require named baseline metric
  - require expected direction
  - require explicit validation script
  - require before / after / delta evidence from actual script execution
  - block if acceptance is based on diff alone

Missing required Test Profile evidence counts as missing required evidence and should produce `STOP`.

## Score Formula

The pipeline keeps the V1 scoring model:

- base score = `1`
- add `1` for each failed check
- cap at `5`
- final score = `min(1 + failed_checks, 5)`

`diff_score` remains the primary stop/go field. The formula above is how the pipeline derives it from check failures when a direct review score is not already stronger.

## Decision Thresholds

- `CONTINUE`
  `diff_score < max_diff_score`
- `WARN`
  `diff_score == max_diff_score`
- `STOP`
  `diff_score > max_diff_score`, or required evidence is missing

Interpretation:

- `CONTINUE` can advance automatically when `auto_continue=true`.
- `WARN` should still persist state and reports, but the next prompt should only auto-start if project policy explicitly allows threshold-equal continuation.
- `STOP` blocks the current prompt.

## Report Generation Rules

Every completed prompt writes one report based on `assets/report-template.md`.

Reports must use `output.language` for prose and `output.timezone` for timestamps. Defaults are `zh-CN` and `Asia/Shanghai` when no output config is set.

Minimum report content:

- prompt summary
- per-step status table
- new test count
- regression suite size
- RED and GREEN summaries
- regressions
- code review notes
- evaluation check results
- overall `diff_score`
- next action

If the prompt blocks, the report should still be written with the final blocking reason.

Analysis reports should use `templates/analysis/report.md` or the language-specific analysis report fallback. They must include question, environment snapshot, hypotheses, experiments, observations, metrics, ruled-out alternatives, threats to validity, conclusion, confidence, next actions, and code change refs.

## 多维度评分体系（V4）

### 评估维度

每轮 Prompt 在 `review_code` 完成后进行多维度评分：

1. `diff_score (1-5)`
   产出与 Prompt 需求的偏离度
   - `1` = 完全符合
   - `2` = 微小偏离
   - `3` = 明显偏离
   - `4` = 严重偏离
   - `5` = 完全偏离
2. `code_quality (1-5)`
   代码质量
   - `1` = 优秀
   - `2` = 良好
   - `3` = 可接受
   - `4` = 较差
   - `5` = 很差
3. `test_coverage (1-5)`
   测试覆盖度，仅 TDD 模式参与
   - `1` = 全覆盖
   - `2` = 主路径覆盖
   - `3` = 部分覆盖
   - `4` = 很少
   - `5` = 无测试
   非 TDD 模式时跳过此维度，不参与 `overall` 计算。
4. `complexity (1-5)`
   复杂度
   - `1` = 极简
   - `2` = 简单
   - `3` = 适当
   - `4` = 复杂
   - `5` = 过度复杂
5. `architecture_drift (1-5)`
   架构漂移
   - `1` = 无偏移
   - `2` = 微小新增
   - `3` = 明显结构变化
   - `4` = 严重偏离设计
   - `5` = 完全重构

### overall 计算公式

默认权重：

- TDD 模式：
  `overall = round(diff_score * 0.3 + code_quality * 0.2 + test_coverage * 0.2 + complexity * 0.15 + architecture_drift * 0.15)`
- 非 TDD 模式：
  `overall = round(diff_score * 0.35 + code_quality * 0.25 + complexity * 0.2 + architecture_drift * 0.2)`

如果 `config.yaml` 中提供 `evaluation.weights`，用自定义权重覆盖默认值。

实现建议：

- 权重总和应尽量接近 `1.0`
- 非 TDD 模式忽略 `test_coverage`
- 在自定义权重缺失某个维度时，优先回退到该维度的默认权重

### 自适应阈值规则

仅当 `evaluation.adaptive_threshold=true` 时生效。

初始阈值：

- `adaptive_threshold = evaluation.base_max_diff_score`
- 默认基础值是 `3`

每轮 Prompt 完成后调整：

- 连续 3 个 Prompt 的 `diff_score <= 2`
  收紧到 `max(current - 1, 2)`
- 任意 Prompt 被 `STOP`
  放宽到 `min(current + 1, 5)`
- 其他情况
  保持不变

当前阈值必须写入：

- `state.yaml` 的 `pipeline.adaptive_threshold`
- 当前 Prompt 的 `history[].evaluation.adaptive_threshold`

### 架构漂移检测细则

在 `review_code` 时执行架构漂移分析：

1. 目录结构变化
   - 复用 `scripts/diff-stats.sh` 获取 `changed_files`、`added_lines`、`removed_lines`、`net_lines`
   - 比较本轮 Prompt 前后的目录树差异
   - 记录新增、删除、移动的文件
2. 依赖图变化
   - 检查新增的 import / require / dependency 声明
   - 标记新依赖引入与潜在循环依赖风险
3. 接口变化
   - 检查公开函数、类、命令入口、导出接口的签名变化
   - 破坏性变更要直接拉高 `architecture_drift`

检测结果写入报告的 `Architecture Drift Detail` 章节。

### 多维度阻塞决策

`STOP`（任一触发即阻塞）：

- `diff_score > threshold`
- `architecture_drift >= 4`
- `overall > threshold + 1`

`WARN`（记录但不阻塞）：

- `complexity >= 4`
- `test_coverage <= 2`

其中：

- `threshold = pipeline.adaptive_threshold`，当 adaptive 打开时
- 否则 `threshold = evaluation.max_diff_score`

### 向后兼容说明

当 `evaluation.adaptive_threshold=false` 时：

- 阈值保持 `evaluation.max_diff_score`
- 行为与 V3 的单维 `diff_score` 决策兼容
- 其他维度可以记录在报告和 state 中，但不会改变原有的默认阻塞语义，除非调用方显式启用 V4 判定路径

**STOP 规则兼容性：**

- 当 `adaptive_threshold=false` 时，V4 多维度 STOP 条件（`overall > threshold + 1`、`architecture_drift >= 4`）同样被禁用；仅 V1 的 `diff_score > max_diff_score` STOP 规则生效。
- 当 `adaptive_threshold=true` 时，所有 V4 STOP 条件均处于激活状态。
