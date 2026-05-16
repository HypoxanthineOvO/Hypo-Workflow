---
name: start
description: Start Hypo-Workflow execution when the user wants to begin running milestones, continue automatically through the pipeline, or execute the first prompt.
---

# /hypo-workflow:start
<!-- @include: output-language-rule -->
> This `@include` marker indicates the intent to migrate to centralized inclusion.
> Until the platform supports `@include`, the duplicated block below is the active fallback.
> Keep both in sync with `SKILL.md` § @include: output-language-rule.

## 输出语言规则

📌 输出语言规则：
读取 config.yaml → output.language
- zh-CN / zh：所有用户可见的输出使用中文（PROGRESS、报告、状态提示、错误消息、交互提问）
- en：使用英文
- auto：跟随用户对话语言
内部日志（log.yaml、state.yaml）始终英文。

使用此技能从本地 `.pipeline/` 工作区启动执行。这是根 `SKILL.md` `/hw:start` 命令描述的相同行为的平台特定入口点。

## 前置条件

- `.pipeline/config.yaml` 存在，并且在变更状态之前应进行验证
- 提示文件存在于配置的提示目录下
- 如果 `.pipeline/state.yaml` 已包含未完成的工作，除非用户明确要求干净重启，否则恢复它

## 执行流程

1. 如果存在，读取 `~/.hypo-workflow/config.yaml`。
2. 读取 `.pipeline/config.yaml`，规范化默认值，并根据 `config.schema.yaml` 验证它。
3. 将有效配置解析为 project > global > defaults：
   - `execution.mode` 回退到全局 `execution.default_mode`，然后 `self`
   - `execution.subagent_tool` 回退到全局 `subagent.provider`，然后 `auto`
   - `dashboard.*` 和 `plan.*` 在相关时使用相同的优先级
4. 如果存在，读取 `.pipeline/state.yaml`；否则从共享根资产 `../../assets/state-init.yaml` 初始化状态。
5. 如果存在，读取 `.pipeline/continuation.yaml`。如果其 `status: active`，在回退到通用 `current.*` 状态之前，优先选择其 `next_action`、`reason` 和 `safe_resume_command`。
6. 如果存在，读取 `.pipeline/cycle.yaml`，并从 `cycle.workflow_kind` 和 `cycle.lifecycle_policy` 派生 Cycle 行为。
7. 当没有明确兼容的预设存在时，从工作流类型默认步骤预设：`build -> tdd`、`analysis -> analysis`、`showcase -> implement-only`。
8. 如果 `watchdog.enabled=true`，在长时间运行的执行开始之前注册项目 watchdog cron 条目。
9. 在进入活动执行之前，在 `.pipeline/.lock` 创建结构化执行租约。租约必须包括平台、会话 ID、所有者、命令、阶段、created_at、heartbeat_at、expires_at、工作流类型、cycle ID 和 handoff_allowed。
10. 设置 `current.phase=executing` 并在运行里程碑之前使用 ISO-8601 时间戳更新顶层 `last_heartbeat`。
11. 对任何受保护的生命周期写入使用工作流提交助手，以便权威事实在派生刷新之前原子提交。
12. 将主代理视为编排器：
    - 主代理协调当前步骤
    - 主代理在适当时将具体的子工作委托给串行 Subagent 任务
    - Codex 应优先使用 Codex Subagents 进行实质性工作（如果可用），无需外部模型路由
    - 当 Worker Separation 为 `off` 时，测试/审查和实现仍应在可行时分离；当为 `recommended` 或 `strict` 时，遵循以下强制角色所有权
    - 主代理验证结果，更新状态、日志和进度工件
13. 在角色敏感的 Worker Separation 工作开始之前，解析平台特定的 Subagent/委托授权：
    - 在 Codex 上，如果主机在生成 Subagents 之前需要明确授权，在启动 `write_tests`、`review_tests`、`implement`、`review_code` 或类似审计的验证工作者之前询问
    - 当 `execution.worker_separation.mode` 为 `recommended` 或 `strict` 时，`write_tests` 和 `review_tests` 属于独立的 `test` 工作者；主代理不得先在本地编写红色测试，然后要求子工作者审查
    - 当 `execution.worker_separation.mode` 为 `recommended` 或 `strict` 时，`implement` 属于独立的实现工作者；主代理不得先在本地实现，然后要求子工作者审查或认证
    - 在 Codex 上，计划时授权仅在其保存的范围明确包含 `/hw:start` 或执行/启动-恢复角色时有效
    - 在 Codex 上，如果授权缺失或被拒绝，且 Worker Separation 为 `recommended` 或 `strict`，在角色敏感工作之前停止，除非生成的计划明确选择了用户确认降级证据的最快单代理 `execution.worker_separation.mode=off` 通道
    - 在 Codex 上，如果计划选择了快速/关闭模式，仅在该明确降级确认存在后继续在本地进行，并记录 Worker Separation 门控被有意禁用以提高速度
    - 在 Claude Code 和 OpenCode 上，不需要额外的子工作者授权门控；使用配置的后端/代理，Claude Code 遵循保存的 `subcodex` 或 `subclaude` 选择
    - 每个生成的工作者提示必须声明特定角色的明确范围：默认生成的工作者只能编辑 `.pipeline/` 文件和明确范围的根级非项目文档，如 `README.md`、`CHANGELOG.md` 和 `PROJECT-SUMMARY.md`；`test` 只能编辑其明确范围中的命名测试/夹具/快照/断言路径；`implement` 只能编辑其明确范围中的命名生产/运行时/文档路径；`audit` 是只读的
    - `test` 工作者拥有复现、红色测试、验证命令、夹具、快照、断言和测试证据，然后才能开始实现
    - `implement` 工作者仅拥有生产/运行时/文档实现；它不得创建、编辑或重写测试、夹具、快照、断言或验证证据，也不得生成或冒充 `test` 或 `audit`
    - 如果工作者需要接触范围外的路径，停止该工作者并报告路径和拥有角色；不要让工作者先编辑再解释
    - 生成的工作者不得恢复或覆盖另一个工作者的更改，除非该确切操作在工作者提示范围中被明确授权
    - 不要先在本地执行工作，然后解释缺失的独立工作者证据
    - 将每个工作者生命周期记录为 `requested`、`started`、`completed|failed|blocked` 和 `closed|close_failed`；等待其证据关卡下一步的工作者，然后在其结果集成后关闭/释放它
    - 当 `/hw:start` 停止、阻塞、中止或完成时，关闭/释放它打开的任何工作者，或记录带有工作者 ID 和原因的 `close_failed`
14. 串行执行活动的 Milestone：
    - `write_tests`
    - `review_tests`
    - `run_tests_red`
    - `implement`
    - `run_tests_green`
    - `review_code`
    - 如果提示要求，报告并提交工作
15. 对于审查阶段，在 `.pipeline/reviews/<feature>/<milestone>/<stage>/` 下创建或引用安全的秘密工件：
    - 验证 `verdict` 和非空的 `reviewed_refs`
    - 记录已检查/未检查的规则、问题、重试轮次和回退原因（如果适用）
    - 通过修复/审查重试 `needs_changes`，默认最多 3 轮
    - 当严格审查策略阻止裁决时，停止继续并总结工件路径
    - 对于 Skill/工件覆盖审查，记录 Skills、hooks、代理、命令和生成的适配器表面的已检查/跳过证据
16. 在每个有意义的步骤之后，更新：
    - `.pipeline/state.yaml`
    - `.pipeline/log.yaml`
    - `.pipeline/PROGRESS.md`
    - 顶层 `last_heartbeat`
17. 在声明 Milestone 完成之前，当平台为 Codex 或钩子不可用时，运行 Codex 预检/运行时检查清单：受保护的权威写入、YAML/JSON/Markdown 有效性、过时的派生工件、README 新鲜度、输出语言、秘密标记和报告/进度/日志证据。
18. 在执行期间，不要在每一步后压缩。跟踪哪些紧凑源文件发生了变化（`PROGRESS.md`、`state.yaml`、`log.yaml`、`metrics.yaml`、`reports/`、`patches/` 和 Knowledge 记录），同时保持完整的权威文件可用于开发和验证。在完整的 `/hw:start` 运行成功完成且验证/报告/状态更新全部通过后，当 `compact.auto=true` 和 `compact.end_of_run=true` 时，运行结束时仅脏压缩刷新；默认 `compact.refresh_policy=dirty_only`。
19. 如果 `.pipeline/feature-queue.yaml` 存在，在 Feature 的最终 Milestone 通过后应用批量自动链：
    - 将完成的 Feature 标记为 `done`
    - 当 `auto_chain=true` 时，前进到下一个排队的 Feature
    - 当下一个 Feature 有 `gate: confirm` 时，在下一个 Feature 之前暂停
    - 当下一个 Feature 使用 `just_in_time` 时，在开始执行之前分解其 Milestones
    - 从 `.pipeline/metrics.yaml` 同步队列指标摘要，当令牌/成本遥测不可用时使用 `n/a`
20. 当 `execution.test_profiles` 或 Feature 级别的 Test Profiles 活动时，在声明 GREEN 之前要求匹配的配置文件证据：
    - `webapp`：E2E + 浏览器交互 + 视觉证据
    - `agent-service`：CLI 计划 + 共享核心 + 真实 CLI 运行
    - `research`：基线 + 脚本执行 + 前后/差异
21. 当 `execution.worker_separation.mode` 为 `recommended` 或 `strict` 时，在验收之前解析实现/测试/审计角色覆盖：
    - 仅在授权解析后为 `test`、`implement` 和 `audit` 启动不同的工作者
    - `write_tests` 和 `review_tests` 是 `test` 工作者拥有的步骤，对于非平凡更改，该工作者必须与 `implement` 工作者不同
    - 实现 Subagent 工作者不得读取测试源、夹具、快照或断言详细信息；仅提供需求、公共接口、允许的编辑范围、测试命令、通过/失败状态和 sanitized 失败摘要
    - 主代理可以集成返回的更改并解决冲突，但当 Worker Separation 启用时，它不得是主要的 `test`、`implement` 或 `audit` 工作者
    - 如果 `implement` 和 `test` 坍缩到一个工作者身份上，`recommended` 必须阻塞；客观的子工作者不可用证据可能证明 `retry`、`deferred`、`stop` 或明确的用户确认降级到 `off` 是合理的，但它不得被视为已接受的 Worker Separation 完成
    - 在 `recommended` 中，当子工作者能力不可用时，`audit` 可以带有明确证据降级
    - `strict` 不得将降级的执行视为完全接受
    - 不完整、缺失或 `close_failed` 的工作者生命周期证据会阻塞 Worker Separation 完成，直到修复或在策略允许的情况下明确降级
22. 在失败时，主代理必须选择以下之一：
    - `retry`：修订指令并重跑失败的步骤
    - `deferred`：如果下游工作可以安全继续，将 Milestone 标记为延迟
    - `stop`：停止并向用户显示阻塞原因
23. 如果在权威提交后派生刷新失败，保持已提交的权威事实，写入 `.pipeline/derived-refresh.yaml`，并提供修复指导，而不是回滚生命周期写入。
24. 如果 Feature 失败且解析的 `failure_policy=skip_defer`，将 Feature 标记为 `deferred`，保留其报告和指标，然后自动链到下一个排队的 Feature，除非被 `gate: confirm` 阻塞。
25. 在未完成的工作剩余时，继续在 Milestones 之间自动移动。
26. 在任何有未完成工作的自然轮次结束之前，写入或刷新 `.pipeline/continuation.yaml`，包含 `status: active`、`next_action`、`reason`、`updated_at`、`safe_resume_command: /hw:resume` 和聚焦的 `context`。
27. 当执行轮次完成、停止、阻塞、中止或结束时，移除 `.pipeline/.lock`。
28. 如果 pipeline 完成或有意停止，注销 watchdog cron 条目。
29. 仅当所有 Milestones 完成或主代理明确选择了 `stop` 结果时，才允许轮次自然结束。

## 续跑与 Preflight

- `.pipeline/continuation.yaml` 是 Codex 轮次和其他没有 Stop 钩子的环境的恢复指针。
- `safe_resume_command` 必须是 `/hw:resume` 或另一个记录的自然语言恢复别名，永远不是 shell 命令。
- `notify` 可以显示 continuation `next_action`；它不得执行恢复命令。
- Preflight 阻塞检查：未提交的受保护权威写入、无效的权威 YAML/JSON、秘密标记、缺失的必需报告/进度/日志证据、格式错误的租约和无效的恢复指针。
- Preflight 警告检查：过时的派生工件、README 新鲜度差距、可选的 Codex 通知缺失、适配器过时和非最终输出语言不匹配。

## Watchdog 集成

- 从 project > global > defaults 解析 `watchdog.*`
- 当 `watchdog.enabled=false` 时，不注册 cron
- 当启用时，注册 `scripts/watchdog.sh <project-root>`，标记为 `# hypo-workflow-watchdog:<project-root>`
- 在执行期间每次持久化状态时写入 `last_heartbeat`
- 在执行步骤之前创建 `.pipeline/.lock` 作为结构化租约，以便 watchdog 不能重新进入新运行
- 每次持久化 `last_heartbeat` 时更新租约心跳/到期
- 在所有干净退出和阻塞退出时移除 `.pipeline/.lock`
- 过时的租约接管必须记录 `lease_takeover`；平台失败钩子应记录 `reported_failure`，而仅心跳超时记录 `inferred_stall`

## 失败处理

- 当主代理相信另一个策略可以工作时，允许没有固定数字上限的 `retry`
- `deferred` 需要写入 `milestones[].status=deferred` 和 `deferred_reason`
- `stop` 应在状态、日志和进度摘要中留下明确的原因

## 进度跟踪

- 如果不存在，创建 `.pipeline/PROGRESS.md`
- 在每个步骤之后更新当前 Milestone 状态
- 为人类读者总结最近的活动和延迟项

## Template Language

当加载报告或 TDD 步骤模板时，从 project > global > defaults 解析 `output.language`。

- `zh-CN` / `zh` -> 加载 `templates/zh/...`
- `en` / `en-US` -> 加载 `templates/en/...`
- 任何缺失的本地化模板 -> 回退到根 `templates/...`

所有用户可见的报告和 PROGRESS 散文必须遵循 `output.language`。内部 `state.yaml` 和 `log.yaml` 键保持英文。

## 参考文件

- `references/tdd-spec.md` — 步骤排序和 TDD 规则
- `references/evaluation-spec.md` — 评分和继续门控
- `references/state-contract.md` — 必需的状态字段，包括 `current.phase`
- `references/progress-spec.md` — `PROGRESS.md` 格式和更新时机
- `references/review-artifacts-spec.md` — 审查工件架构、重试策略和覆盖检查清单
- `references/commands-spec.md` — 精确的命令语义
- `references/config-spec.md` — 全局/项目配置回退规则
- `SKILL.md` — 完整系统参考（如果需要更广泛的 pipeline 上下文）
