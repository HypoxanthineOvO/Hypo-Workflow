---
kind: plan
cycle: C028-stop-that-shit-skill-assessment
mode: plan
status: approved
updated: 2026-08-21
progress: PROGRESS.md
execution: EXECUTION.md
---

# Stop That Shit 原则、Codex Hash Guard 与 Plan P0 工程合同

## 执行目的

把 Stop That Shit 的 Stop Ladder、无消费者 hash 禁止和未经请求重构禁止纳入 Hypo-Workflow 通用原则；恢复 `Discussion → Technical → Architecture → Write Plan` 四段 Plan 架构中的文字版 P0 工程合同；为 Codex 增加一个不依赖完整 STS mode/Runtime 的窄 `PreToolUse` Hash Guard。

## 执行边界

- 通用原则写入原则源并重新生成 `AGENTS.md`，Plan/Goal Skill 只保留阶段相关引导，不在每个 Skill 复制全文。
- P0 只使用 Markdown 六项合同和四种答案来源标签，不新增状态机、独立状态文件、Requirement Tracks、Readiness 评分或 Discussion Package。
- Codex Guard 只覆盖高置信直接/inline hash、写入新增 hash API、执行本地脏脚本前补查新增 hash；不扫描未修改脚本、依赖图、未知 MCP 或任意程序运行时。
- 必要 hash 由聚焦 active Cycle 的 P0 `hash=allow + purpose + consumer` 放行；不引入 STS review/change mode、session contract、RuntimeEvent、审计日志或文件锁。
- 不增加外部依赖或公开 Skill/命令；不安装插件、不重启服务、不发布、不远端写、不做无关旧文档清理。

## P0 工程合同

| 项目 | 答案 | 来源 |
| --- | --- | --- |
| 目标类型 | 包含 Proposal 批准后的产品修改；批准前不执行 | `user-confirmed` |
| 交付边界 | 通用原则、Plan/Goal 文字引导、语义模板、Codex 窄 Hash Guard、契约测试和直接冲突文档 | `user-confirmed` |
| 必要扩展 | 默认禁止无消费者 hash 和无必要证据的相邻重构；不引入完整 STS mode/Runtime、文件锁、新依赖或旧轨道 | `user-confirmed` |
| 高影响动作 | 不需要安装、重启、发布、远端写、破坏性操作或用户级配置 | `agent-default` |
| 完成证据 | 原则生成一致、定向 Skill/模板测试、Hash Guard Bad/Good 测试、Codex Hook process smoke、用户 Stone 审阅 | `agent-default` |
| 未决授权 | 当前无；新增高影响动作或扩大 Guard 范围必须返回 Discussion | `user-confirmed` |

P0 的四种来源标签仅用于人读：`user-confirmed`、`evidence-established`、`agent-default`、`user-decision-required`。它们不是运行时状态；Proposal 前必须清空 `user-decision-required`。

## 技术方案

### 通用原则与 Plan 引导

- 扩展 `core/src/artifacts/agent-guidance.js` 的 Four-Rule Discipline：增加 Stop Ladder、可达证据、遗漏失败测试、hash consumer 和相邻重构边界。
- 保留 `core/src/artifacts/agents-template.js` 的单一生成链，运行 `node scripts/generate-agents.mjs` 更新 `AGENTS.md`。
- 更新 `skills/plan/SKILL.md` 与 `skills/goal/SKILL.md`，明确四段架构、六项 P0、四种来源标签和讨论完成门。
- 更新 `templates/semantic/plan.md` 与 `templates/semantic/discussion-summary.md`，使新 Cycle 直接获得人类可读 P0 与决定摘要位置。

### Codex Hash Guard

- 在 `hooks/hooks.json` 注册第五个事件 `PreToolUse`，继续由 `hooks/codex-hook.mjs` 进入统一 Core。
- 在 `core/src/codex-hooks/` 增加小型 hash policy/classifier 模块，由 `index.js` 调用；不引入通用规则引擎。
- 分类器检查直接 hash 命令、inline Node/Python、patch/Write/Edit/shell 写入新增的高置信 hash API。
- 对 `node <file>`、`python <file>`、`bash <file>` 等本地脚本执行，只在文件未跟踪或 git diff 新增行含高置信 hash API 时触发；路径必须位于 workspace，git 检查使用参数数组，不拼接 shell。
- Guard 通过现有 Session focus 找到 active Cycle，并只接受 P0 中同时存在的 `hash=allow`、非空 `purpose` 和非空 `consumer`。无焦点、文件缺失、解析错误或内部异常 fail open；高置信命中且无授权时返回 Codex `PreToolUse` deny。
- 拒绝信息陈述观察事实和放行方法，不把 dirty worktree 归因于 GPT，也不宣称宿主所有路径都被阻止。

### 同步与验证

- 更新 `hooks/README.md`、`.codex-plugin/plugin.json` 和与 P0 直接冲突的 configuration/generated-artifacts 中英文文档；插件描述由旧的错误 Hook 数量改为真实五个。
- 为原则文本、模板、P0 来源标签、Hook 注册、hash classifier、Cycle 授权、dirty script、fail-open 和 process wrapper 增加定向测试。
- 使用 Bad/Good 对照验证：无消费者 hash 被拒，明确 consumer 的必要 hash 被允许，已有干净脚本和无焦点普通工作不误伤。

## 验证目标

- `node scripts/generate-agents.mjs` 后 `AGENTS.md` 与原则源一致，且包含 Stop Ladder、hash consumer、必要重构例外。
- 相关 Core 测试全部通过，覆盖直接、inline、写入、dirty script、Cycle allow、缺字段 deny、clean script allow 和 fail-open。
- `node scripts/codex-hook-smoke.mjs` 通过并报告五个注册事件。
- `git diff --check` 干净；无新依赖、Runtime、状态文件、公开 Skill/命令或非目标改动。
- S1 向用户展示真实 diff、Bad/Good 行为和验证结果，由用户接受或拒绝。

## 完整计划

Discussion 与 Proposal 属于 Plan 部分，不占用 M/S ID；以下 ID 只编码批准后的执行。

| ID | 阶段 | 期望结果 | 验证方式 |
| --- | --- | --- | --- |
| `M1` | 通用原则与文字版 P0 | Stop Ladder、hash/refactor 边界、四段 Plan 架构、六项 P0 和来源标签进入原则源、Plan/Goal 与语义模板 | 生成 `AGENTS.md`；原则与模板定向测试；确认新合同不依赖旧 P0 状态机 |
| `M2` | Codex 窄 Hash Guard | 第五个 `PreToolUse` 事件完成直接/inline/写入/dirty-script 分类和 active Cycle P0 授权；无 Runtime/mode | classifier/controller Bad/Good 测试；无焦点与错误路径 fail-open 测试；provenance 文案检查 |
| `M3` | 同步、回归与交付整理 | Hook/插件描述和直接冲突文档同步，完整定向验证通过，形成可审阅 diff | Hook process smoke、相关 Core tests、`git diff --check`、变更范围对账 |
| `S1` | 用户审阅真实集成结果 | 用户检查原则、P0 体验、Guard 行为、文档同步和验证证据 | 展示核心报告、修改模块、Bad/Good 结果、测试结果与剩余边界；用户接受或带反馈拒绝 |

## 未决问题

- 无。若执行中发现必须新增依赖、状态机、安装、重启、发布、远端写或扩大到其他宿主 Guard，返回 Discussion，不自行扩展。
