# 配置治理参考

本页是面向用户和 Agent 的配置治理矩阵。配置的解析顺序是 project config > global config > built-in default；project config 通常是 `.pipeline/config.yaml`，global config 通常是 `~/.hypo-workflow/config.yaml`。Hypo-Workflow 不是后台 runner，配置只决定 Agent 如何规划、执行、审查和确认。

## 配置层级

| 层级 | 文件 | 用途 | 写入边界 |
|---|---|---|---|
| Project | `.pipeline/config.yaml` | 当前项目的 workflow、执行、文档和平台覆盖项 | `/hw:init`、`/hw:plan:generate` 或明确配置编辑 |
| Global | `~/.hypo-workflow/config.yaml` | 用户级默认平台、profile、model pool、automation、output | `/hw:setup` 或全局 TUI 确认写入 |
| Cycle | `.pipeline/cycle.yaml` | 当前 Cycle 的 workflow_kind、preset、lifecycle_policy 和 gates | `/hw:cycle`、`/hw:plan:generate`、accept/reject 生命周期命令 |
| Rules | `.pipeline/rules.yaml` | 项目级 rule severity 和 guard 覆盖 | `/hw:rules` 或明确用户确认 |

## 自动程度与 hard gates

| 字段 | 默认/常见值 | 自动化影响 | 严格度影响 | 人工确认边界 |
|---|---|---|---|---|
| `automation.level` | `manual` / `balanced` / `full` | 决定普通执行是否尽量自动推进 | 不得降低 hard gates | 不能跳过 destructive/external、release publish、PR/MR remote write |
| `automation.gates.planning` | `confirm` | Plan 阶段确认 | 规划 gate 是 hard gate | Decompose milestone split 和 Generate final confirmation 需要确认 |
| `automation.gates.execution` | `auto` | 普通 Milestone 可自动推进 | strict review 仍可阻塞 | 仅适用于普通本地执行 |
| `automation.gates.destructive_external` | `confirm` | 破坏性或外部副作用不可自动执行 | 所有 profile 都保持确认 | destructive commands、external side effects |
| `automation.gates.release_publish` | `confirm` | release publish 不自动执行 | release/tag/push 前确认 | tag、push、publish |
| `cycle.lifecycle_policy.gates.high_risk` | `confirm` | 当前 Cycle 的高风险动作 gate | 高风险动作不得因 auto_continue 放开 | PR/MR remote write、plugin install、user-level config write |
| `cycle.lifecycle_policy.gates.pr_remote_write` | `confirm` | PR/MR 写远端需要确认 | 比普通 execution 更严格 | push、merge、close、reviewer/label/target branch 写入 |
| `cycle.lifecycle_policy.gates.plugin_install` | `confirm` | 插件安装需要确认 | user-level 或 remote install 不自动 | Claude/Codex/OpenCode plugin install |
| `cycle.lifecycle_policy.gates.user_level_config` | `confirm` | 写用户级配置需要确认 | 不可由项目流程静默写入 | `~/.claude`、`~/.codex`、`~/.hypo-workflow` |

## 规划与执行严格度

| 字段 | 作用 | 常见策略 |
|---|---|---|
| `plan.mode` | `interactive` 会进行 Discover / Technical Stack / Architecture / Decompose / Generate gate；`auto` 只在配置允许时自动总结通过 | 用户参与规划时用 `interactive` |
| `plan.interaction_depth` | `low`/`medium`/`high` 控制 Discover 最少追问轮数 | 复杂 Cycle 用 `high` |
| `plan.interactive.require_explicit_confirm` | 是否要求明确 Generate final confirmation | 团队或高风险项目设为 `true` |
| `execution.mode` | `self`、subagent 或 host-specific execution mode | Codex 默认主 Agent 编排，必要时使用 Subagents |
| `execution.worker_separation.mode` | `off` / `recommended` / `strict` | `recommended` 尽量分离 implement/test/audit；`strict` 不接受降级为 fully accepted |
| `execution.worker_routing.mode` | `off` / `advisory` / `required` | topology 确定后传递语义能力档；默认 `advisory` |
| `execution.worker_routing.failure_escalation_threshold` | 固定为 `2` | 两条不同执行路线失败后进入 `escalation`；同路线重试不累计 |
| `execution.step_overrides.review_tests.strict` | 测试审查是否严格阻塞 | release/team 模式可设更严格 |
| `execution.step_overrides.review_code.strict` | 代码审查是否严格阻塞 | 关键功能建议更严格 |
| `acceptance.mode` | `auto`、`manual`、`timeout` 或 legacy `confirm` 控制交付接受方式 | 手动验收或团队流程用 `manual`/`confirm` |
| `evaluation.max_diff_score` | diff score 超阈值可触发警告或修复 | 越低越保守 |

## P0 Configure 与 Subagent 授权

`P0 Configure` 是每个新 Cycle 在 Discover 前的配置阶段。用户可以重新选择，也可以明确沿用上一轮或项目/全局默认。该阶段覆盖 automation、Subagent authorization、acceptance、PR/MR remote write、full regression、analysis boundaries 和 worker separation，并把来源记录为 `cycle_explicit`、`previous_cycle_snapshot`、`project_config`、`global_config` 或 `built_in_default`。

strict worker separation 要求 implementation Subagent 与 test/review/audit 角色隔离。implementation worker 不读取 test source、fixtures、snapshots 或 assertion details；它只能接收需求、公开接口、允许编辑范围、test command、pass/fail 和 sanitized failure summary。若宿主平台不能提供这种隔离，必须在执行前说明 degraded mode，获得 explicit user confirmation，并记录 role isolation degradation。

acceptance hardening：`/hw:accept` 会阻塞缺失或身份碰撞的 implement/test/audit worker evidence、失败或 `close_failed` worker lifecycle、缺少 Codex `/hw:start` + `/hw:resume` 授权范围，以及把 runtime-only observation 当成 worker evidence 的验收。

## Task Assessment 与 Worker Routing

Worker topology 和 Worker Routing 是两步独立决策。topology 先决定是否需要 test、implement、audit 等独立身份；之后，宿主 AI 根据当前仓库证据为每个待启动 Worker 生成一份可见的 Task Assessment。Core 只验证这份结构化说明并按确定性规则输出语义路由档，不会再调用模型，也不会选择具体模型、运行方、凭据或推理强度。

Task Assessment 在 Worker 启动前向用户显示，字段含义如下：

| 字段 | 允许值 | 含义 |
|---|---|---|
| `complexity` | `low` / `medium` / `high` | 实现、协调和理解所需的总体难度 |
| `uncertainty` | `low` / `medium` / `high` | 根因、方案或输入尚未确定的程度 |
| `oracle_strength` | `strong` / `mixed` / `weak` | 是否有可靠测试、规范或客观指标判断结果正确 |
| `blast_radius` | `low` / `medium` / `high` | 可能影响的模块、用户或 authority 范围 |
| `reversibility` | `reversible` / `guarded` / `irreversible` | 回退是否直接、是否需要保护措施、或实质不可逆 |
| `risk_flags` | 最多 16 个、每个最多 128 UTF-8 bytes 的安全标识 | security、migration、recovery conflict 等需要优先处理的语义风险 |
| `summary` | 最多 1024 UTF-8 bytes | 面向用户的简短结论；不得包含 secret、prompt 或隐藏推理 |

确定性优先级为 `escalation > critical > explore > standard > mechanical`：

| 路由档 | 典型触发 |
|---|---|
| `mechanical` | `status`、`format`、`read-only-summary`、`deterministic-test-command`，或其他 trivial 且 reversible 的工作 |
| `standard` | 普通实现、常规测试设计或文档工作 |
| `explore` | 根因未知、候选路线比较、高不确定性或探索性实现 |
| `critical` | architecture、weak oracle、independent audit、recovery conflict 或高 blast radius |
| `escalation` | security、migration、不可逆任务，或两条不同执行路线已经失败 |

`off` 不产生路由提示；`advisory` 在宿主不支持语义路由时允许继承当前执行上下文，并明确记录 fallback；`required` 在宿主不支持时阻止该 Worker 启动。路由档不会改变角色独立性、证据要求、acceptance 或用户授权。Resume 复用 Runtime/Continuation 中已持久化的 assessment、route、reason、失败计数和 policy version，不重新猜测。

所有 routing identifier 都限制为 128 UTF-8 bytes。一次失败历史输入最多包含 256 个 attempt，持久化的 distinct failed route IDs 最多 64 个；超过边界时在写入 Runtime、Journal 或 Capsule 前 fail closed。

```yaml
execution:
  worker_routing:
    mode: advisory
    policy_version: worker-routing-v1
    failure_escalation_threshold: 2
automation:
  codex:
    external_model_routing: false
```

## Analysis preset 边界

| 字段 | manual | hybrid | auto |
|---|---|---|---|
| `execution.analysis.interaction_mode` | 只读分析优先 | 改代码前确认 | 可在边界内自动改代码 |
| `execution.analysis.boundaries.code_changes` | `deny` | `confirm` | `allow` |
| `execution.analysis.boundaries.restart_services` | `confirm` | `confirm` | `confirm` |
| `execution.analysis.boundaries.install_system_dependencies` | `ask` | `ask` | `ask` |
| `execution.analysis.boundaries.network_remote_resources` | `ask` | `ask` | `allow` |
| `execution.analysis.boundaries.destructive_or_external_side_effects` | `ask` | `ask` | `ask` |

## Legacy auto 字段

| 字段 | 兼容含义 | 不允许做的事 |
|---|---|---|
| `evaluation.auto_continue` | 普通评估通过后可继续 | 不能跳过 planning、destructive/external、release publish、PR/MR remote write |
| `batch.auto_chain` | Feature/Milestone 队列通过后可自动推进 | 不能跳过 `gate: confirm` |
| `batch.default_gate` | 新 Feature 默认 gate | 不能覆盖 Cycle high-risk gates |
| `opencode.auto_continue` | OpenCode 平台普通执行可继续 | 不能代表远端写或插件安装确认 |

## 默认配置组合

默认配置组合是给 `/hw:setup`、项目初始化和人工选型使用的保守模板。它们可以减少配置字段选择成本，但不能覆盖 high-risk hard gates；PR/MR remote write、插件安装、用户级配置写入、destructive/external side effects 和 release publish 始终需要确认。

| Profile | 适用场景 | 自动程度 | 严格程度 | 固定确认边界 |
|---|---|---|---|---|
| `solo-auto` | 适合个人项目的高自动化配置：普通本地执行尽量自动推进，但 PR/MR 远端写、插件安装、用户级配置和发布仍需确认。 | `full` | `recommended` | PR/MR remote write、plugin install、user-level config、destructive_external、release_publish |
| `manual-review` | 适合新项目、敏感变更或学习流程：规划和关键阶段保留更多确认，普通执行不追求无打断。 | `manual` | `recommended` | PR/MR remote write、plugin install、user-level config、destructive_external、release_publish |
| `team-strict` | 适合团队协作、受保护分支和 release 前流程：要求更强 worker separation、review strictness 和确认记录。 | `manual` | `strict` | PR/MR remote write、plugin install、user-level config、destructive_external、release_publish |
| `analysis-hybrid` | 适合先调查后修改的问题：允许证据收集和只读分析，代码变更前确认。 | `balanced` | `recommended` | PR/MR remote write、plugin install、user-level config、destructive_external、release_publish |

### 可复制片段

#### solo-auto

适合个人项目的高自动化配置：普通本地执行尽量自动推进，但 PR/MR 远端写、插件安装、用户级配置和发布仍需确认。

```yaml
# solo-auto - 个人全自动开发
automation:
  level: full
  gates:
    planning: confirm
    execution: auto
    destructive_external: confirm
    release_publish: confirm
execution:
  bash:
    mode: allow_local
    confirm_external: false
    confirm_destructive: false
    confirm_system_install: false
  worker_separation:
    mode: recommended
evaluation:
  auto_continue: true
batch:
  auto_chain: true
  default_gate: auto
cycle:
  lifecycle_policy:
    gates:
      high_risk: confirm
      destructive_external: confirm
      plugin_install: confirm
      pr_remote_write: confirm
      user_level_config: confirm
      release_publish: confirm
```

#### manual-review

适合新项目、敏感变更或学习流程：规划和关键阶段保留更多确认，普通执行不追求无打断。

```yaml
# manual-review - 手动检查
automation:
  level: manual
  gates:
    planning: confirm
    execution: confirm
    destructive_external: confirm
    release_publish: confirm
plan:
  mode: interactive
  interactive:
    require_explicit_confirm: true
evaluation:
  auto_continue: false
batch:
  auto_chain: false
  default_gate: confirm
execution:
  worker_separation:
    mode: recommended
cycle:
  lifecycle_policy:
    gates:
      high_risk: confirm
      destructive_external: confirm
      plugin_install: confirm
      pr_remote_write: confirm
      user_level_config: confirm
      release_publish: confirm
```

#### team-strict

适合团队协作、受保护分支和 release 前流程：要求更强 worker separation、review strictness 和确认记录。

```yaml
# team-strict - 团队严格
automation:
  level: manual
  gates:
    planning: confirm
    execution: confirm
    destructive_external: confirm
    release_publish: confirm
acceptance:
  mode: manual
  require_user_confirm: true
execution:
  worker_separation:
    mode: strict
  step_overrides:
    review_tests:
      strict: true
    review_code:
      strict: true
evaluation:
  auto_continue: false
batch:
  auto_chain: false
  default_gate: confirm
cycle:
  lifecycle_policy:
    gates:
      high_risk: confirm
      destructive_external: confirm
      plugin_install: confirm
      pr_remote_write: confirm
      user_level_config: confirm
      release_publish: confirm
```

#### analysis-hybrid

适合先调查后修改的问题：允许证据收集和只读分析，代码变更前确认。

```yaml
# analysis-hybrid - 分析混合
default_workflow_kind: analysis
automation:
  level: balanced
  gates:
    planning: confirm
    execution: auto
    destructive_external: confirm
    release_publish: confirm
execution:
  steps:
    preset: analysis
  analysis:
    interaction_mode: hybrid
    boundaries:
      code_changes:
        manual: deny
        hybrid: confirm
        auto: allow
      restart_services: confirm
      install_system_dependencies: ask
      network_remote_resources:
        manual: ask
        hybrid: ask
        auto: allow
      destructive_or_external_side_effects: ask
  worker_separation:
    mode: recommended
evaluation:
  auto_continue: true
cycle:
  lifecycle_policy:
    gates:
      high_risk: confirm
      destructive_external: confirm
      plugin_install: confirm
      pr_remote_write: confirm
      user_level_config: confirm
      release_publish: confirm
```


## 平台配置差异

| 平台 | 配置重点 | 边界 |
|---|---|---|
| Codex | Codex Skills、Subagents、preflight、continuation | Codex Subagents 留在 Codex/GPT runtime；不要求外部模型路由 |
| Claude Code | `hw` plugin、hooks、agents、settings merge、可选 Codex plugin detection | Claude 原生命令和 Hypo `/hw:*` 必须分离；plugin install/user-level settings 需要确认 |
| OpenCode | native commands、agents、plugins、TUI/status、model matrix | OpenCode 执行模型调用；Hypo-Workflow 只生成 metadata 和指令 |
| Cursor / Copilot / Trae | repository instruction files | 仅提供规则/说明，不声明 hook、runner 或 lifecycle enforcement |

## 用户选择提示

- 想少打断普通开发：选择 `balanced` 或后续 `solo-auto` profile，但保留 high-risk confirm。
- 想每一步都稳：选择 `manual-review`，让规划、review、PR/MR、release 更频繁停顿。
- 团队协作或 release 前：选择 `team-strict`，要求更强 review 和 worker separation evidence。
- 调查问题但不想先改代码：选择 `analysis-hybrid`，允许证据收集，代码变更前确认。
