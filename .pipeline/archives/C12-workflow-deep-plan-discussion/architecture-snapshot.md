# Architecture Baseline - C12 Workflow 深度计划讨论功能

## Current Baseline

- Active Cycle: C12, "Workflow 深度计划讨论功能"。
- Workflow kind: build。
- Preset: tdd。
- `.pipeline/` 继续作为 Cycle、state、Feature Queue、rules、progress、logs、prompts、reports、reviews、metrics、Knowledge、patches 和 archives 的 source of truth。
- Hypo-Workflow 不是 runner；它生成计划、命令协议、文档、adapter、审查证据和恢复指针，实际工作由宿主 Agent 执行。

## Architecture Direction

C12 增加一个 Plan 前的长期 Deep Plan discussion lifecycle：

1. **Command Entry**：canonical `/hw:plan:deep`，alias `/hw:plan --deep`。
2. **Discussion Package**：长期存储在 `.pipeline/deep-plans/DPxxx-slug/`，包含对话摘要、结构化决策、tracks、architecture source、readiness 和 compact handoff。
3. **First-Principles Ask**：反复挑战不明确需求的必要性、最小闭环、否定证据和本质需求。
4. **Research Evidence**：默认本地只读，把 repo/docs/history 证据写入 discussion package。
5. **Architecture Map**：机器可读 components/edges/relationships 是 source of truth，Mermaid/Markdown 是派生人读视图。
6. **Drill / Readiness / Convert**：显式 drill 模块或主题；按 `directional`、`architecture-ready`、`implementation-ready` 检查；显式 convert 到普通 Plan context。
7. **Feature Queue Handoff**：保留执行顺序、验收深度、测试矩阵、风险和未知项。

## Expected Code Areas

- `core/src/deep-plan/`
- `core/src/commands/index.js`
- `core/src/progressive-discover/index.js`
- `core/src/batch-plan/index.js`
- `core/src/docs/index.js`
- `skills/plan/SKILL.md`
- `skills/plan-deep/SKILL.md`
- `commands/plan/deep.md`
- `references/deep-plan-spec.md`
- `references/progressive-discover-spec.md`
- `references/feature-queue-spec.md`
- `core/test/deep-plan*.test.js`
- `core/test/progressive-discover.test.js`
- `core/test/batch-plan.test.js`
- `core/test/commands-rules-artifacts.test.js`
- `tests/scenarios/v12/s70-deep-plan-discussion-cycle/`

## Source-Of-Truth Boundaries

- `.pipeline/deep-plans/DPxxx-slug/*.yaml` stores machine-readable Deep Plan source.
- Generated Markdown/Mermaid views are human-readable derivatives and must not become the only source of truth.
- `.pipeline/knowledge/` may index decisions and refs, but must not copy full discussion bodies into every context.
- `/hw:explore` remains isolated worktree-based hypothesis validation, not the primary Deep Plan surface.
- `/hw:plan` remains the ordinary P1-P4 planning flow; Deep Plan converts into ordinary Plan context through an explicit gate.

## Review And Evidence

C12 requires durable review artifacts for worker-separated execution:

```text
.pipeline/reviews/
  C12/
    M0/
      test-evidence.md
      implementation-evidence.md
      audit.md
    ...
    M8/
      test-evidence.md
      implementation-evidence.md
      audit.md
```

Every generated prompt requires `test`, `implement`, and `audit` role separation. The test worker owns red tests, fixtures, assertions, and pseudo-test rejection; implement owns scoped code/docs; audit owns final diff, evidence quality, readiness depth, and acceptance risks.

## Cross-Cutting Constraints

- 不自动执行远端写、安装系统依赖、重启服务或破坏性动作。
- Deep Plan research 默认只读本地文件、archives、docs、tests。
- `convert` 不能隐藏 unresolved risks 或 intentional blanks。
- `directional` readiness 可以允许留空；`implementation-ready` 必须阻塞缺失需求树、架构关系、模块卡、测试矩阵和风险处理。
- 所有用户可见说明按 `output.language=zh-CN`。
