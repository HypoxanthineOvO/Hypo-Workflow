# Hypo-Workflow C8 体验优化 - 开发进度

> 最后更新：2026-05-06 22:20 +08:00 | 状态：已完成，发布收口中 | 进度：13/13 Milestone

## 当前状态

C8 已完成。四个 Feature 全部自动推进完成，没有停在 Feature gate 或 Milestone gate。收口阶段已完成全平台 sync、文档 repair、知识库记录和 v12.0.0 发布准备。

## Feature Queue

| Feature | 标题 | 状态 | 依赖 |
|---|---|---|---|
| F001 | Rules/Habits Authority | Done | 无 |
| F002 | Default Agent Review | Done | F001 |
| F003 | Domain Pack Interface + RTL Pack | Done | F001, F002 |
| F004 | Claude Code Codex Plugin Support | Done | F001, F002 |

## Milestone 计划

| # | Feature | Milestone | 状态 | Prompt |
|---|---|---|---|---|
| M01 | F001 | Rules and Habits Authority Schema | Done | `00-rules-habits-authority-schema.md` |
| M02 | F001 | Rules Remember Capture and Confirmation Flow | Done | `01-rules-remember-capture-and-confirmation-flow.md` |
| M03 | F001 | Habits Documents and Cross-Platform Injection | Done | `02-habits-documents-and-cross-platform-injection.md` |
| M04 | F002 | Review Artifact Schema and Directory Structure | Done | `03-review-artifact-schema-and-directory-structure.md` |
| M05 | F002 | Plan Test Code Review Gates | Done | `04-plan-test-code-review-gates.md` |
| M06 | F002 | Skill and Platform Artifact Review Coverage | Done | `05-skill-and-platform-artifact-review-coverage.md` |
| M07 | F003 | Domain Pack Boundary Protocol and Knowledge Decision | Done | `06-domain-pack-boundary-protocol-and-knowledge-decision.md` |
| M08 | F003 | RTL Domain Pack Reference Implementation | Done | `07-rtl-domain-pack-reference-implementation.md` |
| M09 | F003 | RTL-Aware Planning Review and Test Integration | Done | `08-rtl-aware-planning-review-and-test-integration.md` |
| M10 | F004 | Official Codex Plugin Capability Detection | Done | `09-official-codex-plugin-capability-detection.md` |
| M11 | F004 | Claude Code Codex Delegation Routing | Done | `10-claude-code-codex-delegation-routing.md` |
| M12 | F004 | Confirmed Install and Multi-Worker Support | Done | `11-confirmed-install-and-multi-worker-support.md` |
| M13 | F004 | C8 Agent Review and Full Regression Readiness | Done | `12-c8-agent-review-and-full-regression-readiness.md` |

## 结果摘要

- Rules/Habits：新增结构化 authority、remember/candidate/force-write helper、`.pipeline/HABITS.md`、adapter rule injection。
- Agent Review：新增 `.pipeline/reviews/` schema helper、verdict 校验、secret-safe redaction/reject、bounded retry、coverage checklist。
- Domain Pack/RTL：新增通用 domain pack loader、external ref 安全边界、RTL reference pack 和 RTL checklist。
- Claude Codex Plugin：新增官方 `openai/codex-plugin-cc` capability detection、安装提案、delegation profiles 和 multi-worker ownership 校验；没有执行真实安装。
- 文档收口：README 保持通用能力入口；Codex、Claude Code、OpenCode、Cursor、Copilot、Trae 的安装/同步命令和支持边界写入平台 Guide，并记录到 Knowledge Ledger。

## 验证

- `npm test --prefix core` / `node --test core/test`：311/311 passed
- `python3 tests/run_regression.py`：63/63 passed
- `bash scripts/validate-config.sh .pipeline/config.yaml`：passed
- `claude plugin validate .`：passed
- docs freshness / narrative release check：passed
- `node cli/bin/hypo-workflow sync --check-only --project .`：derived=fresh
- `git diff --check`：passed

## Review 记录

- C8 最终 Review：`.pipeline/reviews/F004-codex-plugin/M13/regression/summary.md`
- C8 SubagentReview 迭代：`.pipeline/reviews/F004-codex-plugin/M13/subagent-review-r2/` 到 `subagent-review-r8/`，最终 verdict 为 pass/stable。
- F001 Review：`.pipeline/reviews/F001-rules-habits/`
- F002 Review：`.pipeline/reviews/F002-agent-review/`
- F003 Review：`.pipeline/reviews/F003-domain-rtl/`
- F004 Review：`.pipeline/reviews/F004-codex-plugin/`
