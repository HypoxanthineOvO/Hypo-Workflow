# C12 Design Spec - Workflow 深度计划讨论功能

## Goal

为 Hypo-Workflow 增加 Plan 前的长期“深度计划/讨论”能力。它用于绿地项目架构发现和已有项目长期路线规划，先通过多轮第一性原理追问、只读调研、架构映射和模块 drilldown 沉淀讨论包，再显式转换为普通 `/hw:plan` / Feature Queue 输入。

## Product Shape

- Primary entry: `/hw:plan:deep`
- Alias: `/hw:plan --deep`
- Core operations: `new`, `ask`, `research`, `map`, `drill`, `readiness`, `convert`
- Durable package root: `.pipeline/deep-plans/DPxxx-slug/`
- Ordinary Plan handoff: compact structured context, not raw long conversation
- Not a replacement for `/hw:explore`: explore validates ideas in isolated worktrees; deep planning shapes requirements and architecture before experiments.

## Functional Requirements

1. Deep planning has a lightweight lifecycle and durable discussion package.
2. A package may contain multiple parallel tracks.
3. Track model is mixed: requirement/theme tracks first, then architecture-derived module tracks.
4. Architecture has machine-readable source data and human-readable Mermaid/Markdown rendering.
5. `ask` challenges unclear requirements from first principles: necessity, minimum viable loop, falsifying evidence, and essential-vs-habitual requirements. It must not default to asking “who is the user”.
6. `research` is local read-only by default and records evidence refs, findings, unknowns, and boundaries.
   - When the user asks to research or reference an external work, Deep Plan should support an explicit research-code path: after the required remote/network confirmation, download or clone the source into a bounded research cache, inspect the implementation rather than only the README, and record code evidence refs in the discussion package.
7. `drill` explicitly focuses on a named module or topic and updates only scoped cards/tracks.
8. `readiness` supports depth levels:
   - `directional`: direction and question map may be enough; blanks are allowed.
   - `architecture-ready`: requirements, core components, relationships, and key risks are clear.
   - `implementation-ready`: requirements, architecture, module cards, test matrix, risk handling, and acceptance depth are complete enough for Feature Queue / Milestone planning.
9. `convert` is an explicit, auditable boundary from discussion state into ordinary Plan context.

## Validation Contract

- Automated: `uv run -- node --test core/test/deep-plan*.test.js core/test/progressive-discover.test.js core/test/batch-plan.test.js core/test/commands-rules-artifacts.test.js`
- Regression: `uv run python tests/run_regression.py`
- Manual: use deep planning to plan Hypo-Agent again from an unclear high-level request; pass only when Feature Queue order, acceptance depth, risks, and unresolved items are visible before ordinary Plan.
- Manual research-code check: ask Deep Plan to research a referenced external project and confirm it reads downloaded source implementation evidence, not only README-level summaries.
- Audit must reject pseudo-deep plans that only add static docs or shallow fixtures without proving multi-round challenge, readiness depth, and conversion handoff behavior.

## Milestone Strategy

1. M0: Deep Plan contract, command entry, lifecycle.
2. M1: Durable discussion package model.
3. M2: First-principles ask engine and shallow-plan rejection.
4. M3: Local read-only research evidence flow.
5. M4: Requirement tracks, architecture map, and human rendering.
6. M5: Drill, readiness depth, and convert gate.
7. M6: Skills, commands, adapters, and status/docs integration.
8. M7: Feature Queue handoff and ordinary Plan integration.
9. M8: Real scenario validation, regression, and release readiness.

## Audit Requirements

Every Milestone prompt must include:

- `audit_target`
- `risk_hypotheses`
- `test_scenarios`
- `evidence_required`
- `independent_validator`
- `manual_checks`
- `known_limits`
