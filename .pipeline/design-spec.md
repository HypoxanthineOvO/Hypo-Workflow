# C10 Design Spec - 体验优化：PR Create、P0 Configure 与 Subagent 隔离

## Goal

C10 要把 Hypo-Workflow 的协作体验向前推进一层：用户可以通过 `/hw:pr create` 被问答式引导完成 PR/MR 创建；每个 Cycle 在进入 Discover 前都有独立的 `P0 Configure` 阶段确认自动化、授权和执行边界；Subagent 的使用从“鼓励”升级为有明确授权、角色隔离和降级记录的执行契约。

## Project Shape

- Project type: Hypo-Workflow core / skills / docs / adapter workflow project。
- Primary deliverable: 命令契约、core helper、skill/spec/docs、测试和回归场景。
- Target platform: Codex、OpenCode、Claude Code 共享 `.pipeline/` 协议。
- Expected users: 不熟悉 PR/MR 细节但希望 Agent 引导完成开发、提交和审查流程的用户。

## Constraints

- Hypo-Workflow 不是 runner；实际命令由宿主 Agent 执行。
- `.pipeline/` 仍是 state、Cycle、prompts、reports、progress、logs 和 archives 的 source of truth。
- PR/MR remote write 是 high-risk gate。一次性确认可以覆盖整套 create 流程，但确认摘要必须列出 push、create、reviewer/label/target branch 等具体远端写动作。
- 测试不能依赖真实 GitHub/GitLab 网络；provider 写操作用 fixture/mock。
- Implement Subagent 不能读取测试源码、fixtures、snapshot 或断言细节，只能接收测试命令、pass/fail 和精简错误摘要。

## Functional Requirements

1. `P0 Configure`：在 `cycle new` 后、`P1 Discover` 前触发；Guide/Init/Plan 进入规划前也应引导到该阶段。支持沿用配置，继承优先级为当前 Cycle 显式配置、上一个 Cycle 快照、项目配置、全局配置、内置默认。
2. `/hw:pr create`：默认先问用户是否已有改动；`--from-worktree` 处理已有本地改动；`--plan` 先进入一组 Plan，完成后回到 create。
3. PR/MR 创建引导：检查 dirty worktree、文件范围、分支、commit、push、title/body、target branch、reviewer/label，并输出一次性确认摘要。
4. GitLab：优先支持 `gitlab.com`；self-hosted GitLab 至少保留 host/base_url/provider 扩展点，复杂 live API 可后置。
5. Subagent：P0 中请求授权；执行中区分 implement/test/audit；strict 不可满足时告知用户并请求 degraded mode。

## Testing Expectations

- Focused Node tests 覆盖 config/init/guide/discover、PR create contract、PR manual gates、Subagent discipline。
- 最终 M4 必须运行 `npm test --prefix core`、`bash scripts/validate-config.sh .pipeline/config.yaml`、`python3 tests/run_regression.py` 和 `git diff --check`。
- 每个 Milestone 报告必须记录验证命令、通过/失败证据、Subagent 隔离或降级情况。

## Milestone Strategy

- M0: `P0 Configure` 契约、状态与继承模型。
- M1: `/hw:pr create` 向导契约与本地归档模型。
- M2: PR Create 远端执行适配与教学式流程。
- M3: Subagent 授权、隔离与降级治理。
- M4: 命令、文档、适配器与完整回归。

## Open Questions

- self-hosted GitLab 在 M2 做最小可用实现，还是只保留配置和 provider seam。
- 真实远端写 smoke 需要用户提供 token/remote 并再次确认。
