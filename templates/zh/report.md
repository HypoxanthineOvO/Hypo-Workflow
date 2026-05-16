# 执行报告：{prompt_name}

> 语言：{output_language} | 时区：{output_timezone}

## 概要
- Prompt：{prompt_id} — {prompt_name}
- 开始时间：{started_at}
- 完成时间：{finished_at}
- 耗时：{duration}
- 结果：{result}
- Diff Score：{diff_score}/5

## 完成说明
- 改动摘要：{change_summary}
- 技术思路：{technical_approach}
- 修改文件/模块：{modified_files_or_modules}
- 测试设计：{test_design}
- 验证结果：{validation_results}
- 预期结果：{expected_results}
- 遇到的问题：{encountered_issues}
- 风险/后续：{risks_and_followups}

## 步骤
| 步骤 | 状态 | 耗时 | 备注 |
|------|------|------|------|
| {step_name} | {step_status} | {step_duration} | {step_notes} |

## 测试结果
- 本轮新增测试：{new_tests_count}
- 回归测试规模：{regression_suite_count}
- RED 阶段：{red_summary}
- GREEN 阶段：{green_summary}
- 回归问题：{regressions}

## 代码审查
- 质量评分：{quality_score}/5
- 发现的问题：{issues_found}
- 架构差异：{architecture_diff}

## 评估
- tests_pass：{tests_pass}
- no_regressions：{no_regressions}
- matches_plan：{matches_plan}
- code_quality：{code_quality}
- **总体 diff_score：{diff_score}/5**
- **决策：{decision}**

## 下一步
{next_action}
