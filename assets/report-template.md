# Execution Report: {prompt_name}

> Language: {output_language} | Timezone: {output_timezone}
> Write this report in `{output_language}` and render all timestamps in `{output_timezone}`.

## Summary
- Prompt: {prompt_id} — {prompt_name}
- Started: {started_at}
- Finished: {finished_at}
- Duration: {duration}
- Result: {result}
- Diff Score: {diff_score}/5

## Completion Narrative
- Change Summary: {change_summary}
- Technical Approach: {technical_approach}
- Modified Files / Modules: {modified_files}
- Test Design: {test_design}
- Validation Results: {validation_results}
- Expected Results: {expected_results}
- Problems Encountered: {problems_encountered}
- Risks / Follow-Up: {risks_follow_up}

## Steps
| Step | Status | Duration | Notes |
|------|--------|----------|-------|
| {step_name} | {step_status} | {step_duration} | {step_notes} |

## Test Results
- New tests in this prompt: {new_tests_count}
- Regression suite size: {regression_suite_count}
- RED phase: {red_summary}
- GREEN phase: {green_summary}
- Regressions: {regressions}

## Code Review
- Quality: {quality_score}/5
- Issues found: {issues_found}
- Architecture diff: {architecture_diff}

## Evaluation

### Scores
| 维度 | 分数 | 说明 |
|------|------|------|
| diff_score | {diff_score}/5 | {diff_reason} |
| code_quality | {code_quality}/5 | {quality_reason} |
| test_coverage | {test_coverage}/5 | {coverage_reason} |
| complexity | {complexity}/5 | {complexity_reason} |
| architecture_drift | {arch_drift}/5 | {arch_reason} |
| **overall** | **{overall}/5** | 加权综合 |

### Decision
- 判定: {decision}
- 当前阈值: {threshold}
- 触发条件: {trigger_reason}

### Architecture Drift Detail
- 目录结构: {dir_changes}
- 依赖图: {dep_changes}
- 接口变化: {api_changes}
- diff 统计（scripts/diff-stats.sh）: changed_files={changed_files}, added_lines={added_lines}, removed_lines={removed_lines}

### Adaptive Threshold History
| Prompt | diff_score | 阈值 | 调整 |
|--------|-----------|------|------|
| {prompt_name} | {diff_score} | {threshold} | {threshold_adjustment} |

## Next
{next_action}
