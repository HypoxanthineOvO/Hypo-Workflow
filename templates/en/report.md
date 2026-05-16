# Execution Report: {prompt_name}

> Language: {output_language} | Timezone: {output_timezone}

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
- tests_pass: {tests_pass}
- no_regressions: {no_regressions}
- matches_plan: {matches_plan}
- code_quality: {code_quality}
- **Overall diff_score: {diff_score}/5**
- **Decision: {decision}**

## Next
{next_action}
