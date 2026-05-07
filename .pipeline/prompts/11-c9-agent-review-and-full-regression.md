# M12 / F006 - C9 Agent Review 与全量回归

## Objective

- 对 C9 全部功能做最终 Agent Review、Subagent 审计、文档自检、全量回归和交付报告。

## 需求

- 审查 C9 是否满足配置治理、PR/MR、Explain、Claude Resume、中文文档五条主线。
- 运行或记录 focused tests 和 full regression。
- 生成 `.pipeline/reviews/` 证据，包含 Subagent 审计结果。
- 确认所有新增命令出现在 help、commands reference、platform maps 和 adapter surfaces。
- 确认 PR/MR 远端写操作、plugin install、user-level config write、release publish 都保留人工确认门。
- 更新 PROGRESS、reports、architecture、Knowledge（如有可复用决策）和 release readiness notes。

## Boundaries

- In scope:
  - final review artifacts
  - focused and full tests
  - docs self-check
  - sync/check-only
  - Claude plugin validate
- 不发布 release，除非用户明确确认。
- 不执行真实 PR/MR live merge/close/push。
- 不安装插件或写 user-level config。

## Implementation Plan

1. 运行 focused tests for config/pr/explain/claude/docs。
2. 运行 full Node suite、Python regression、config validation、sync check、Claude plugin validation、diff check。
3. 使用 Subagent 审计 C9 计划与实现产物，检查遗漏、风险边界和验证闭环。
4. 修复审计发现，必要时重复 review。
5. 写 final report、更新 PROGRESS 和 Knowledge。

## 预期测试

- 配置治理 focused tests 通过。
- PR/MR archive/gate focused tests 通过。
- Explain evidence/subagent focused tests 通过。
- Claude Resume alias focused tests 通过。
- Docs governance tests 通过。
- Full regression 通过或记录明确环境限制。

## Validation Commands

- `node --test core/test/*config*.test.js core/test/*pr*.test.js core/test/*explain*.test.js core/test/*claude*resume*.test.js core/test/docs-governance.test.js`
- `npm test --prefix core`
- `python3 tests/run_regression.py`
- `bash scripts/validate-config.sh .pipeline/config.yaml`
- `node cli/bin/hypo-workflow sync --check-only --project .`
- `claude plugin validate .`
- `git diff --check`

## Evidence

- 报告包含所有命令输出摘要。
- 报告引用 `.pipeline/reviews/` Subagent 审计路径。
- 报告列出任何 degraded/fallback 情况。

## Human QA

- 确认文档足够中文可读。
- 确认 PR/MR 命令不会让用户误以为自动合并。
- 确认 Explain 回答需要证据。
- 确认 Claude `/resume` 不再被 Hypo 文档或 metadata 混淆。

## 预期产出

- C9 final validation report。
- Subagent 审计证据。
- 更新后的 PROGRESS、Knowledge 和 release readiness notes。

