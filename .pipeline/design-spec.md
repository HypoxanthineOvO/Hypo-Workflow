# C11 Design Spec - Workflow 的一系列小体验问题

## Goal

本 Cycle 要把 Hypo-Workflow 的中文交互、规划质量、Subagent 检查注入、自动化授权和完成汇报改成可执行、可测试、可持续维护的契约。

## Project Shape

- Project type: CLI/workflow orchestration framework
- Primary deliverable: behavior specs, Skill instructions, tests, prompts, and documentation updates
- Target platform: Codex, OpenCode, Claude Code adapters
- Expected users: 使用 `/hw:*` 管理长期工程 Cycle 的中文用户和多 Agent 工作流用户

## Functional Requirements

1. 所有 `SKILL.md` 使用中文主体骨架，保留命令名、路径、配置键、状态字段和专业英文术语。
2. 行为相关 `references/*.md` 作为独立 Milestone 中文化，避免 Skill 与 spec 语义漂移。
3. Subagent prompt 必须采用两层注入：host/orchestrator 层先生成 `compact_rules_summary`、authorization state、role boundary 和 out-of-scope stop rule；每个 Subagent 任务层再注入 `user_requested_checks`、Milestone 审计字段、evidence requirements 和 output artifact。
4. 自动化授权支持长期白名单，按 `safe_local`、`stateful_local`、`external` 三档管理。
5. 用户可见回复采用“结论 / 解释 / 下一步”的强 schema；复杂完成态必须包含手动操作说明、已知风险和验证方式。
6. 长时间执行的中间更新必须说明正在做什么、发现了什么、下一步是什么。
7. `/hw:plan` 必须问审计/验证问题，并把用户例子抽象为泛化需求后确认。

## Testing Expectations

- Contract tests for response schemas, status/report/explain/cycle completion output, Plan audit fields, example abstraction, automation whitelist behavior, and Subagent prompt injection.
- Scenario checks covering Skill/reference Chinese skeleton preservation and command semantics.
- Full regression: core tests, config validation, Python scenario regression, and diff whitespace check.

## Milestone Strategy

- Proposed milestone count: 8
- Expected preset: tdd
- Rationale: first establish behavior contracts, then update planning/authorization/Subagent mechanics, then convert Skill/reference content in controlled groups, then run regression.

## Audit Requirements

Every Milestone prompt must include:

- `audit_target`
- `risk_hypotheses`
- `test_scenarios`
- `evidence_required`
- `independent_validator`
- `manual_checks`
- `known_limits`
