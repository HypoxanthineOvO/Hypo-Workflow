# C15-M1 Audit Recheck

Worker: `audit-recheck`
Scope: C15-M1 `P2 Technical Route Gate` after audit blocker rework.

## Findings

### Blocker: 无

原 audit blocker 已解决。`core/test/p2-technical-route-contract.test.js:23-28` 现在读取 `core/test/fixtures/p2-technical-route/*`，不再读取 ignored runtime state `.plan-state/*` 或 `.pipeline/prompts/*`。复查命令：

```bash
rg '\.plan-state|\.pipeline/prompts|prompt\.file' core/test/p2-technical-route-contract.test.js core/test/fixtures/p2-technical-route
```

结果：无命中。

### Warning: 新增 test/fixture 当前仍是 untracked，需要纳入最终变更集

`git ls-files -- core/test/p2-technical-route-contract.test.js core/test/fixtures/p2-technical-route` 当前没有输出，`git status --short` 显示这些文件为 `??`。这不是原 blocker 的运行时依赖问题，且 fixture 路径没有被 `.gitignore` 忽略；但如果最终提交/交付时遗漏这些 untracked 文件，clean checkout/CI 仍会缺少新增 contract test 与 fixture。

建议收尾时确认以下文件进入最终变更集：

- `core/test/p2-technical-route-contract.test.js`
- `core/test/fixtures/p2-technical-route/decompose.yaml`
- `core/test/fixtures/p2-technical-route/generated-prompt.md`
- `core/test/fixtures/p2-technical-route/technical-route.md`

## Passed Checks

- P2 必填字段覆盖充分：`technical_solution`、`technical_route`、`research_required`、`risks_and_alternatives`、`validation_path`、`audit_focus` 在 `skills/plan/SKILL.md:95`、`skills/plan-decompose/SKILL.md:34`、`plan/PLAN-SKILL.md:182`、`references/commands-spec.md:504` 等 contract surface 中明确出现。
- Goal-only P2 不能 proposed/P3：`skills/plan-decompose/SKILL.md:53`、`plan/PLAN-SKILL.md:203`、`references/commands-spec.md:505` 明确要求 goal-only checkpoint 保持 `in_progress`/`revision` 或不得 proposed。
- 硬 research gate 覆盖 unknown tool、external service、third-party library、platform capability、user-private schema：`core/test/fixtures/p2-technical-route/decompose.yaml:9`、`skills/plan/SKILL.md:102`、`skills/plan-decompose/SKILL.md:55`、`references/commands-spec.md:506` 均覆盖。
- 用户质疑技术路线后回到 revision/in_progress：`core/test/fixtures/p2-technical-route/decompose.yaml:17`、`skills/plan/SKILL.md:104`、`skills/plan-decompose/SKILL.md:69`、`references/commands-spec.md:508` 覆盖。
- P3 继承技术路线字段：`skills/plan-generate/SKILL.md:21`、`skills/plan-generate/SKILL.md:56`、`plan/PLAN-SKILL.md:257`、`references/commands-spec.md:527` 覆盖；fixture `core/test/fixtures/p2-technical-route/generated-prompt.md:3` 保留六个字段。
- 普通 single-feature `/hw:plan` 不暴露/要求 Feature DAG：`skills/plan/SKILL.md:87`、`skills/plan-decompose/SKILL.md:119`、`plan/PLAN-SKILL.md:215`、`references/commands-spec.md:429` 覆盖。
- Worker separation 基本保持：implementation evidence 声明只改 guidance/spec 文件；test-rework evidence 声明只重写测试与 fixture；本复审只写本文件。

## Tests Run

```bash
uv run -- node --test core/test/p2-technical-route-contract.test.js core/test/progressive-discover.test.js core/test/batch-plan.test.js core/test/deep-plan-handoff.test.js
```

结果：通过，27/27 tests passed。

```bash
git diff --check -- core/test/p2-technical-route-contract.test.js core/test/fixtures/p2-technical-route core/test/progressive-discover.test.js skills/plan/SKILL.md skills/plan-decompose/SKILL.md skills/plan-generate/SKILL.md plan/PLAN-SKILL.md references/commands-spec.md .pipeline/reviews/C15/M1
```

结果：通过，无 whitespace error。

## Remaining Risks / Test Gaps

- 当前实现主要是 skill/spec/contract 层约束，没有新增 runtime JS state-machine enforcement；实际执行仍依赖 agent 遵守 P2/P3 文档门控。
- Contract tests 是内容/regex 断言，不是完整交互模拟；它们覆盖关键门控语义，但不模拟真实用户质疑后的端到端 P2 状态迁移。
- 新增 fixture/test 需要在最终提交前确认纳入版本控制，否则 clean checkout 不会获得这次 rework。

结论：无阻塞问题，C15-M1 可完成
