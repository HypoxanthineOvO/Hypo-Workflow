---
name: hw-status
description: "Hypo-Workflow Cursor skill for /hw-status; use when the user invokes /hw-status or canonical /hw:status."
---

# /hw-status

Canonical command: `/hw:status`
Cursor command: `/hw-status`
Route: `read`
Embedded authority source: `skills/status/SKILL.md`

## Cursor Execution

1. Treat this file as the command-specific Cursor Skill for the requested `/hw-*` command.
2. Read `.cursor/skills/hypo-workflow.md` when global routing, output-language, or shared runtime rules are needed.
3. Execute the canonical `/hw:status` semantics using the embedded command authority below and any user-provided arguments.
4. Before writes, inspect `.pipeline/config.yaml`, `.pipeline/cycle.yaml`, `.pipeline/state.yaml`, and `.pipeline/rules.yaml` when present.
5. Do not treat Hypo-Workflow as a runner; Cursor Agent performs the actual work and records evidence in project files when the active command owns those writes.
6. Cursor chooses the active model in the UI/session; treat provider-specific model defaults as non-Cursor examples and do not write or recommend them unless explicitly requested.

## Command Skill Authority

---
name: status
description: Show current Hypo-Workflow progress when the user wants a concise status summary without mutating pipeline state.
---

# /hypo-workflow:status
## 输出语言规则

📌 输出语言规则：
读取 config.yaml → output.language
- zh-CN / zh：所有用户可见的输出使用中文（PROGRESS、报告、状态提示、错误消息、交互提问）
- en：使用英文
- auto：跟随用户对话语言
内部日志（log.yaml、state.yaml）始终英文。

使用此技能仅检查 pipeline 进度。

Status 是严格只读的。如果 state、logs、progress 或 step 指针不一致，报告不一致性和建议的修复命令；不要修复文件，不要推进当前步骤，也不要让 Stop hooks 作为显示状态的副作用而通过。

## 前置条件

- none; if `.pipeline/state.yaml` is missing, report that no active pipeline exists

## 执行流程

1. Read `~/.hypo-workflow/config.yaml` if present.
2. Read `.pipeline/config.yaml` if present.
3. If the user passed `--full`, read `.pipeline/state.yaml` and `.pipeline/PROGRESS.md` directly and print `加载完整版 state.yaml` / `加载完整版 PROGRESS.md` with line counts when possible.
4. If `--full` is absent, prefer `.pipeline/state.compact.yaml` and `.pipeline/PROGRESS.compact.md` when they exist; otherwise fall back to `.pipeline/state.yaml` and `.pipeline/PROGRESS.md`.
5. 解析有效默认值为 project > global > defaults，不修改任一配置文件。
6. 当 shell 访问可用时，优先使用 `scripts/state-summary.sh` 进行快速摘要；仅将 compact 文件作为补充上下文使用，因为规范的状态变更仍属于 `state.yaml`。
7. 报告：
   - pipeline 名称
   - 整体状态
   - 从 Cycle workflow/lifecycle policy 派生的规范阶段和下一步操作
   - 当前 milestone 或 prompt
   - 当前步骤和步骤索引
   - 有效执行模式和 subagent 提供者
   - 当 `.pipeline/cycle.yaml` 存在时的活跃 Cycle
   - 最近完成的 milestone
   - 延迟项目（如有）
   - 当存在 `prompt_state.analysis_summary` 时，显示 Analysis question、ledger path、outcome/conclusion、confidence、next action、hypothesis/experiment counts
   - `last_heartbeat` 和 watchdog 状态（如存在）
8. 如果 `.pipeline/PROGRESS.md` 或 `.pipeline/PROGRESS.compact.md` 存在，将其作为面向用户的摘要来源，但在状态检查期间不要重写它。
9. 如果 `.pipeline/feature-queue.yaml` 包含 Feature DAG 依赖，显示一个简洁的看板摘要，包含就绪、阻塞和并行候选项。对于普通的单功能队列，隐藏 DAG 概念。
10. 当存在时，包含来自 `.pipeline/derived-health.yaml` 的派生健康状态，并将过时的派生视图路由到 `/hw:sync --repair` 或 `/hw:docs repair`（视情况而定）。
11. 显示来自 `.pipeline/log.yaml` 的最近事件，按时间戳最新优先排序，过滤为用户相关的生命周期事件，并通过共享的密钥安全证据助手进行编辑。
12. 如果项目根目录存在 `PROJECT-SUMMARY.md`，包含其顶部摘要行和 Open Patches / Deferred 计数。
13. 当通过 Claude Code 或 `/hw:status` 运行时，优先使用共享的 Claude 状态表面形状：紧凑的 milestone 表、当前阶段/下一步操作、自动化/配置文件基础信息以及最近事件。除非请求 `--full`，否则不要转储完整的原始 `PROGRESS.md`。
14. 对 Analysis lane，只展示摘要字段和 ledger path；不要把完整 hypotheses、experiments、observations 或 threats_to_validity 展开到状态输出中。

Status 必须暴露一个面向用户的规范阶段和一个下一步操作。从 `.pipeline/cycle.yaml`、`.pipeline/state.yaml`、接受状态和活跃的继续状态中派生这些信息。重要阶段：

- `needs_revision` -> next action `resume_revision`
- `follow_up_planning` -> next action `start_follow_up_plan`
- `pending_acceptance` -> next action `accept_or_reject`

不要让用户在第一个屏幕上协调单独的执行、接受、继续和锁定轴。

## Flags 参数

- `/hw:status --full`：忽略 compact 文件，加载完整的 `.pipeline/state.yaml` 和 `.pipeline/PROGRESS.md`。
- `/hw:status`：当 compact 文件可用时使用它们，当 compact 文件不存在时回退到完整文件。

## 安全规则

- 不要修改 `state.yaml`
- 不要修改日志或报告
- 不要创建缺失的日志/进度文件
- 不要推进任何步骤或 milestone
- 在状态显示期间不要修复工作流不一致性
- 不要显示来自日志、报告、Knowledge 记录或状态源的原始密钥
- 不要把 `.pipeline/analysis/**/ledger.yaml` 或 legacy analysis ledger 的完整内容倾倒到 status 输出；仅给出路径和紧凑摘要

## 参考文件

- `references/state-contract.md` — state layout
- `references/progress-spec.md` — progress summary layout
- `references/commands-spec.md` — status command semantics
- `references/analysis-ledger-spec.md` — analysis summary and ledger boundary
- `references/config-spec.md` — config priority and fallback rules
- `SKILL.md` — broader system reference if needed
