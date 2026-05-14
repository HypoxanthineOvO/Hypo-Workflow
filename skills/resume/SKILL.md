---
description: Resume Hypo-Workflow execution only through the `/hw:resume` namespace from saved `.pipeline/` state; do not use for Claude Code native `/resume`.
disable-model-invocation: true
argument-hint: "[optional context]"
---

# /hypo-workflow:resume
## 输出语言规则

📌 输出语言规则：
读取 config.yaml → output.language
- zh-CN / zh：所有用户可见的输出使用中文（PROGRESS、报告、状态提示、错误消息、交互提问）
- en：使用英文
- auto：跟随用户对话语言
内部日志（log.yaml、state.yaml）始终英文。

使用此技能从 `.pipeline/state.yaml` 继续执行，无需重启已完成的工作。

## 前置条件

- `.pipeline/state.yaml` 存在
- 保存的 pipeline 未完成，通常为 `pipeline.status=running` 或 `pipeline.status=stopped`

## 执行流程

1. 如果存在，读取 `~/.hypo-workflow/config.yaml`。
2. 读取 `.pipeline/config.yaml` 和 `.pipeline/state.yaml`。
3. 如果存在，读取 `.pipeline/continuation.yaml`。如果其 `status: active`，在回退到通用 `current.*` 状态之前，选择其 `next_action`、`reason` 和 `safe_resume_command`。
4. 在选择下一步之前，将有效的执行和 subagent 默认值解析为 project > global > defaults。
5. 如果 `current.phase=needs_revision`，使用 `acceptance.feedback_ref` 作为输入恢复修订路径；不要从先前已完成的步骤继续。
6. 如果 `current.phase=follow_up_planning`，启动活动的 `continuation` 或匹配的 `cycle.continuations[]` 后续计划。
7. 验证 `current.prompt_file`、`current.step` 和 `current.step_index` 是否仍然指向普通执行阶段的有效提示和步骤。
8. 如果 `.pipeline/.lock` 存在，将其解析为执行租约。
   - 新鲜的外部租约：停止并报告另一个执行处于活动状态
   - 过期的租约：接管，写入 `lease_takeover` 证据，并记录 `inferred_stall`
   - 带有 `reported_failure` 的租约：接管并保留失败证据
   - 格式错误的租约：停止并提供修复指导，而不是静默删除
9. 在恢复活动执行之前，创建或刷新结构化执行租约。
10. 设置 `current.phase=executing` 并更新顶层 `last_heartbeat`。
11. 对任何受保护的生命周期写入使用工作流提交助手，以便权威事实在派生刷新之前原子提交。
12. 从下一个可运行的步骤继续，而不是重放已完成的步骤。
13. 使用与 `/hypo-workflow:start` 相同的串行编排模型：
    - 主代理协调
    - Subagent 任务执行具体工作
    - Codex 应优先使用 Codex Subagents 进行实质性工作（如果可用），无需外部模型路由
    - 当 Worker Separation 为 `off` 时，测试/审查和实现仍应在可行时分离；当为 `recommended` 或 `strict` 时，遵循以下强制角色所有权
    - 主代理验证、评分和更新工件
14. 在恢复角色敏感的 Worker Separation 工作之前，解析平台特定的 Subagent/委托授权：
    - 在 Codex 上，如果主机在生成 Subagents 之前需要明确授权，在启动或重试 `write_tests`、`review_tests`、`implement`、`review_code` 或类似审计的验证工作者之前询问
    - 当 `execution.worker_separation.mode` 为 `recommended` 或 `strict` 时，`write_tests` 和 `review_tests` 属于独立的 `test` 工作者；主代理不得先在本地编写红色测试，然后要求子工作者审查
    - 当 `execution.worker_separation.mode` 为 `recommended` 或 `strict` 时，`implement` 属于独立的实现工作者；主代理不得先在本地实现，然后要求子工作者审查或认证
    - 在 Codex 上，计划时授权仅在其保存的范围明确包含 `/hw:resume` 或执行/启动-恢复角色时有效
    - 在 Codex 上，如果授权缺失或被拒绝，且 Worker Separation 为 `recommended` 或 `strict`，在角色敏感工作之前停止，除非生成的计划明确选择了用户确认降级证据的最快单代理 `execution.worker_separation.mode=off` 通道
    - 在 Codex 上，如果计划选择了快速/关闭模式，仅在该明确降级确认存在后继续在本地进行，并记录 Worker Separation 门控被有意禁用以提高速度
    - 在 Claude Code 和 OpenCode 上，不需要额外的子工作者授权门控；使用配置的后端/代理，Claude Code 遵循保存的 `subcodex` 或 `subclaude` 选择
    - 每个生成的工作者提示必须声明特定角色的明确范围：默认生成的工作者只能编辑 `.pipeline/` 文件和明确范围的根级非项目文档，如 `README.md`、`CHANGELOG.md` 和 `PROJECT-SUMMARY.md`；`test` 只能编辑其明确范围中的命名测试/夹具/快照/断言路径；`implement` 只能编辑其明确范围中的命名生产/运行时/文档路径；`audit` 是只读的
    - `test` 工作者拥有复现、红色测试、验证命令、夹具、快照、断言和测试证据，然后才能恢复实现
    - `implement` 工作者仅拥有生产/运行时/文档实现；它不得创建、编辑或重写测试、夹具、快照、断言或验证证据，也不得生成或冒充 `test` 或 `audit`
    - 如果工作者需要接触范围外的路径，停止该工作者并报告路径和拥有角色；不要让工作者先编辑再解释
    - 生成的工作者不得恢复或覆盖另一个工作者的更改，除非该确切操作在工作者提示范围中被明确授权
    - 不要先在本地执行恢复的工作，然后解释缺失的独立工作者证据
    - 将每个工作者生命周期记录为 `requested`、`started`、`completed|failed|blocked` 和 `closed|close_failed`；等待其证据关卡下一步的工作者，然后在其结果集成后关闭/释放它
    - 当 `/hw:resume` 停止、阻塞、中止或完成时，关闭/释放它打开的任何工作者，或记录带有工作者 ID 和原因的 `close_failed`
15. 对于恢复的审查阶段，在创建新一轮之前检查现有的 `.pipeline/reviews/<feature>/<milestone>/<stage>/` 工件：
    - 当最新裁决为 `needs_changes` 且重试预算剩余时，从下一轮重试继续
    - 当严格策略阻止最新裁决或默认最多 3 轮总数用尽时阻塞
    - 保留 Skills、钩子、代理、命令和生成的适配器表面的已检查/跳过覆盖证据
    - 在审查工件中保留完整的审查注释，仅在状态或进度中存储紧凑指针
16. 在每次有意义的转换后更新 `.pipeline/PROGRESS.md`、`.pipeline/log.yaml`、`.pipeline/state.yaml` 和 `last_heartbeat`。
17. 在声明完成之前，当平台为 Codex 或钩子不可用时，运行 Codex 预检/运行时检查清单。
18. 如果在权威提交后派生刷新失败，保持已提交的权威事实，写入 `.pipeline/derived-refresh.yaml`，并提供修复指导，而不是回滚生命周期写入。
19. 在恢复执行期间，保持完整的权威运行时文件可用于开发和验证；跟踪紧凑的源更改，而不是在每一步后压缩。
20. 如果 `.pipeline/feature-queue.yaml` 存在，从保存的状态恢复批量自动链：
    - 通过在下一个 Feature 之前暂停来遵守 `gate: confirm`
    - 当排队的 Feature 使用 `just_in_time` 时，仅在其变为当前后才分解它
    - 从 `.pipeline/metrics.yaml` 同步队列持续时间、令牌/成本和指标摘要，对不可用的遥测保留 `n/a`
21. 当 Test Profiles 活动时，不要将缺失的配置文件证据视为软警告；阻塞直到满足所需的证据契约或记录明确的阻塞器。
22. 当 `execution.worker_separation.mode` 为 `recommended` 或 `strict` 时，在完成或验收之前解析 `test` / `implement` / `audit` 工作者覆盖：
    - `write_tests` 和 `review_tests` 是 `test` 工作者拥有的步骤
    - `implement` 必须由独立的实现工作者拥有
    - `audit` 必须在需要时由独立的审计工作者拥有；`review_code` 是 `audit` 拥有的步骤/工件阶段，而不是工作者角色
    - 如果 `implement` 和 `test` 坍缩到一个工作者身份上，`recommended` 必须阻塞；客观的子工作者不可用证据可能证明 `retry`、`deferred`、`stop` 或明确的用户确认降级到 `off` 是合理的，但它不得被视为已接受的 Worker Separation 完成
    - 主代理可以集成返回的更改并解决冲突，但当 Worker Separation 启用时，它不得是主要的 `test`、`implement` 或 `audit` 工作者
    - 不完整、缺失或 `close_failed` 的工作者生命周期证据会阻塞 Worker Separation 完成，直到修复或在策略允许的情况下明确降级
23. 在失败时应用相同的 `retry` / `deferred` / `stop` 决策模型。
24. 在完整的 `/hw:resume` 运行成功完成且验证/报告/状态更新全部通过后，当 `compact.auto=true` 和 `compact.end_of_run=true` 时，运行结束时仅脏压缩刷新；禁用时跳过。从完整的权威源刷新紧凑目标，而不是从旧的紧凑文件刷新。
25. 在任何有未完成工作的自然轮次结束之前，写入或刷新 `.pipeline/continuation.yaml`，其中 `safe_resume_command: /hw:resume`。
26. 当恢复轮次完成、停止、阻塞、中止或结束时，移除 `.pipeline/.lock`。
27. 如果 pipeline 完成或有意停止，注销 watchdog cron 条目。

## 安全规则

- 永远不要静默丢弃保存的工作
- 当新鲜的 `.pipeline/.lock` 租约表明另一个执行处于活动状态时，永远不要恢复
- 如果状态引用了缺失的提示，停止并解释不一致
- 如果当前步骤已完成，前进到下一个可运行的步骤，而不是盲目重跑
- 活动的 `.pipeline/continuation.yaml` 优先于通用状态指针，但不安全的 `safe_resume_command` 值必须被拒绝而不是执行

## 续跑与 Preflight

- `.pipeline/continuation.yaml` 是 Codex 和其他没有 Stop 钩子的环境的文件支持恢复状态。
- 活动的 continuation 记录 `next_action`、`reason`、`updated_at`、`safe_resume_command` 和聚焦的 `context`。
- `/hw:resume` 应首先解析活动的 continuation，然后回退到 `state.current`。
- `safe_resume_command` 仅是显示/恢复提示；永远不要 shell 执行它。
- 阻塞的预检发现必须在声明完成之前修复。警告发现应记录修复提示，并在正确性以其他方式保留时可以继续。

## Watchdog 集成

Watchdog 触发的恢复遵循与用户触发的恢复相同的安全规则。它们必须更新 `last_heartbeat`，遵守新鲜的执行租约，接管带有证据的过期租约，并在触发脚本提供上下文时向 `.pipeline/watchdog.log` 写入简洁的注释。

## 参考文件

- `references/state-contract.md` — 恢复语义和必需字段
- `references/commands-spec.md` — 命令行为
- `references/progress-spec.md` — 进度摘要规则
- `references/review-artifacts-spec.md` — 审查工件架构、重试策略和覆盖检查清单
- `references/config-spec.md` — 全局/项目配置回退规则
- `SKILL.md` — 完整执行上下文（如果需要）