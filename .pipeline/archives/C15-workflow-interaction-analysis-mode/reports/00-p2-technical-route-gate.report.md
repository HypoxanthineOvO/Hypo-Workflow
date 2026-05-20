# C15-M1 执行报告：P2 Technical Route Gate

## 改动摘要

C15-M1 已完成，目标是让 `/hw:plan` 的 P2 Decompose 不再只给 Milestone 目标和验收清单就要求用户确认进入 P3，而是必须同时给出可审核的技术方案和技术路线。

本轮把 P2 技术路线门禁写入了规划相关 skill、共享计划规范和命令规范。现在每个实现型 Milestone 在 P2 必须具备六个字段：`technical_solution`、`technical_route`、`research_required`、`risks_and_alternatives`、`validation_path`、`audit_focus`。如果这些字段缺失，或者存在未解决的硬调研项，P2 只能停在 `in_progress` 或 `revision`，不能标记为 `proposed`，也不能进入 P3 Generate。

## 技术思路

本轮没有把门禁写成某个单点脚本，而是先把它固化到 Workflow 的权威交互契约里：用户真正遇到的问题发生在 P2/P3 的人机检查点，所以主修复点是 `plan`、`plan-decompose`、`plan-generate` 的行为说明、`plan/PLAN-SKILL.md` 的共享规则，以及 `references/commands-spec.md` 的命令语义。

具体路线是：

- P2 的定义从“Milestone 拆分检查点”升级为“Milestone 拆分 + 技术方案/路线拆解检查点”。
- `research_required` 变成硬门禁，未知工具、外部服务、第三方库、平台能力、用户私有 schema 或专有数据契约都必须触发调研、提问或用户明确延后。
- 用户质疑技术路线时，P2 必须回到 `revision` 或 `in_progress`，记录被质疑点并补调研，不能静默继续 P3。
- P3 Generate 必须继承 P2 的技术路线字段，不能把 P2 方案压缩成目标摘要或验收清单。
- 普通单 Feature `/hw:plan` 保持简单；Feature DAG 仍只属于 batch/长期协调场景，避免为了本次修复把普通交互复杂化。

## 修改文件/模块

- `skills/plan/SKILL.md`：新增 P2 技术路线门禁，定义六个必填字段、硬调研触发器、用户质疑后的 revision/in_progress 行为，并明确普通单 Feature 不要求 Feature DAG。
- `skills/plan-decompose/SKILL.md`：强化 P2 Decompose 输出规则，要求每个实现型 Milestone 同时给出技术方案、路线、调研状态、风险替代、验证路径和审计焦点。
- `skills/plan-generate/SKILL.md`：要求 P3 Generate 读取并保留 P2 技术路线字段；如果 P2 缺字段或存在 active blocking research question，必须退回 P2 revision。
- `plan/PLAN-SKILL.md`：把上述行为沉到共享 Plan 规范，避免不同入口对 P2 的解释不一致。
- `references/commands-spec.md`：补齐命令层行为，保证 `/hw:plan`、`/hw:plan:decompose`、`/hw:plan:generate` 的语义一致。
- `core/test/p2-technical-route-contract.test.js`：新增 P2/P3 技术路线契约测试。
- `core/test/fixtures/p2-technical-route/`：新增 tracked fixture，用于模拟 P2 decompose、technical route review 和 generated prompt 字段继承。
- `core/test/progressive-discover.test.js`：调整既有断言以兼容当前中文契约表达，同时保留 worker separation 语义检查。
- `.pipeline/reviews/C15/M1/*.md`：记录 test、implementation、audit、test-rework、audit-recheck 的独立证据。

## 测试设计

测试重点不是验证某个业务功能，而是验证 Workflow 规划契约不会退回“只讲目标”的旧形态。

新增 `core/test/p2-technical-route-contract.test.js` 覆盖六类行为：

- P2 fixture 中每个 Milestone 必须包含六个技术路线字段。
- plan/decompose/commands 文档必须拒绝 goal-only P2 checkpoint。
- `research_required` 的硬触发器必须覆盖未知工具、外部服务、第三方库、平台能力和用户私有 schema，并阻止 unresolved research 进入 proposed/P3。
- 用户质疑技术路线后必须回到 `revision` 或 `in_progress`。
- P3 Generate 必须保留 P2 技术方案、技术路线和调研字段。
- 普通 single-feature `/hw:plan` 不应要求或显示 Feature DAG。

测试最初依赖 `.plan-state/` 和 `.pipeline/prompts/` 的运行时文件，audit 判定这会导致 clean checkout/CI 不可靠。随后测试被重构为读取 `core/test/fixtures/p2-technical-route/` 下的固定 fixture，消除了对 ignored/generated runtime 文件的依赖。

## 验证结果

已运行并通过：

```bash
uv run -- node --test core/test/p2-technical-route-contract.test.js core/test/progressive-discover.test.js core/test/batch-plan.test.js core/test/deep-plan-handoff.test.js
```

结果：27/27 tests passing。

已运行并通过：

```bash
rg '\.plan-state|\.pipeline/prompts|prompt\.file' core/test/p2-technical-route-contract.test.js core/test/fixtures/p2-technical-route
```

结果：无命中，说明新增 contract test 不再读取 P2/P3 运行时产物。

已运行并通过：

```bash
git diff --check -- core/test/p2-technical-route-contract.test.js core/test/fixtures/p2-technical-route core/test/progressive-discover.test.js skills/plan/SKILL.md skills/plan-decompose/SKILL.md skills/plan-generate/SKILL.md plan/PLAN-SKILL.md references/commands-spec.md .pipeline/reviews/C15/M1
```

结果：无 whitespace error。

独立 audit recheck 结论：无阻塞问题，C15-M1 可完成。

## 预期结果

后续使用 `/hw:plan` 时，P2 checkpoint 应该能让用户审核“技术理解是否正确”，而不是只能审核“目标列表是否合理”。如果某个 Milestone 涉及未知工具、外部服务、第三方库、平台能力或用户私有 schema，Workflow 应主动调研、提问或记录用户明确延后，不能用猜测填补技术路线。

当用户像本 Cycle 里那样指出“你欠调研”或“技术路线不对”时，P2 应回到修订状态，补充调研和路线说明后再请求确认。进入 P3 后，生成的 prompt 应继承 P2 的技术方案、路线、调研结论、风险和验证路径，worker 不应只看到目标摘要。

## 遇到的问题

本轮主要问题是第一次测试设计不够干净：它直接读取了 `.plan-state/` 和 `.pipeline/prompts/`，这些文件属于运行时/生成产物，不适合作为 clean checkout 下的稳定测试输入。独立 audit 把这列为 blocker。

修复方式是增加固定 fixture，并把测试目标从“读取当前 Cycle 运行时产物”改成“验证 P2/P3 契约和一个可移植样例”。这保留了对关键行为的覆盖，也让测试能在 CI 或干净工作区中运行。

## 风险/后续

- 本轮主要强化 skill/spec/contract 层，尚未新增 JS runtime state-machine enforcement；实际执行仍依赖 agent 遵守这些 P2/P3 门禁。
- Contract tests 是内容和 fixture 断言，不是完整交互模拟；用户质疑后 P2 状态迁移的端到端执行模拟可在后续测试里补强。
- 新增 `core/test/p2-technical-route-contract.test.js` 和 `core/test/fixtures/p2-technical-route/*` 当前在工作区是 untracked，最终交付或提交时必须纳入变更集，否则 clean checkout 会缺失这次新增测试。

## 决策

C15-M1 完成。没有未解决 blocker。可以进入 C15-M2 `Detailed Completion Report Contract`。
