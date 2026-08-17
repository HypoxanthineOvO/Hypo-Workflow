# Official Codex 指南

本页说明 Hypo-Workflow 在 Official Codex 上的安装方式、当前能力和边界，适合第一次在 Codex 里使用 Hypo-Workflow 的用户。

Hypo-Workflow v15.0.0-alpha.2 以 Codex plugin、十个 focused Skills 与六类语义/安全 Hooks 发布。它不是 runner：Codex Agent 执行实现、实验、测试和审查，普通语义文件保存计划与证据。Host Contract v1 作为 legacy compatibility 保留，两个 ZIP 均包含 `/hw:experiment`。

## 安装形态

完整安装使用 plugin。开发 checkout 可作为本地 marketplace：

```bash
codex plugin marketplace add /absolute/path/to/Hypo-Workflow
codex plugin marketplace list
```

在 Codex `/plugins` 中安装或启用 `hypo-workflow`，然后开始一个新会话。用 `/hooks` 查看来源、审查并信任当前 Hook 定义。Codex 按 Hook hash 保存信任；文件改变后会跳过未重新信任的 Hook。

Skill-only symlink 可用于无 Hooks 的降级测试：

```bash
mkdir -p "$CODEX_HOME/skills"
ln -sfn /absolute/path/to/Hypo-Workflow "$CODEX_HOME/skills/hypo-workflow"
```

该方式只加载 Skills，不是完整 plugin 安装。

## 当前能力

| Surface | 当前契约 |
| --- | --- |
| Commands | 十个公开 Skills：guide、init、goal、plan、cycle、maintain、experiment、resume、accept、reject |
| Questions | 使用当前 host 的 Ask / request-user-input 能力；开卡片前先展示完整上下文 |
| Plan | 使用 host 可见 Plan/Todo，并由 `/hw:plan` 内部选择规划阶段 |
| Subagents | 按复杂度选择；重要实现可分离 test、implement、audit 或其他领域角色 |
| Memory | Manifest、Runtime、Continuation、Records、Receipts、Journal、Capsule、Pack、Snapshots |
| Experiment | 项目知识、代码/`uv`/机器上下文、扫描、Attempt、科学审查、Git events 与即时状态 |
| Hooks | 十类当前 Official Codex lifecycle events |
| Destruction | exact Deletion Manifest + fresh Receipt + controlled executor |

OpenCode、Claude Code、Cursor、Copilot、Trae 与自定义 Codex fork 适配不属于当前支持面。

## Task Assessment 与 Worker Routing

Codex 先用 topology 决定是否需要独立的 test、implement、audit 或其他 Worker 身份，再为每个待启动 Worker 生成并展示 Task Assessment（任务评估）。

Assessment 明确说明 `complexity`、`uncertainty`、`oracle_strength`、`blast_radius`、`reversibility`、`risk_flags` 和简短结论；Core 只做 exact、bounded、secret-safe 验证，并确定性输出 `mechanical`、`standard`、`explore`、`critical` 或 `escalation`。

该语义 handoff 不包含具体模型、运行方、凭据、prompt 或 reasoning effort。`SubagentStart` 只把已持久化的 routing class、reason codes、policy version 和可见 assessment 写入 Worker Journal context。

三种模式的区别：`advisory` 在宿主不支持该 handoff 时明确记录 fallback 并继承当前执行上下文；`required` 阻止 Worker 启动；`off` 不传提示。

路由不会替代 topology，也不会放宽角色隔离、evidence、acceptance 或用户授权。Resume 必须复用 Runtime/Continuation 中的决定；需要不同语义档的新 Worker 使用 no-history 或 bounded-history fork，full-history fork 只继承父执行上下文。完整字段与分类表见 [配置治理参考](../reference/configuration.md)。

## Hook 事件

Plugin 默认发现 `hooks/hooks.json`：

| Event | Hypo-Workflow 行为 |
| --- | --- |
| `SessionStart` | compact 恢复时注入有界 Recovery Pack context |
| `UserPromptSubmit` | 提取干净的 durable semantic delta，写 Journal/Inbox proposal |
| `PreToolUse` | 拒绝明显的直接删除并提供门禁原因 |
| `PermissionRequest` | 在即将询问批准时补充删除/权限边界 |
| `PostToolUse` | 记录有界工具证据并发送相关、去重的 docs/Record 提醒 |
| `PreCompact` | 从已验证 Capsule 封存 Recovery Pack |
| `PostCompact` | 记录压缩结果 |
| `SubagentStart` | 记录 worker identity 与角色 |
| `SubagentStop` | 记录 worker evidence references 与关闭结果 |
| `Stop` | 记录 turn boundary 与恢复线索 |

Hook 命令通过 `PLUGIN_ROOT` 定位安装包，timeout 单位为秒。Hook wrapper 的 stdout 只输出一行合法 JSON，诊断写 stderr。

Turn 级 Hook 输入允许宿主省略 `turn_id` 或 `tool_use_id`；缺省字段不会再导致兼容性错误。该兼容行为不改变 Hook 的信任、启用或 authority 边界。

## 边界

多个匹配 command Hooks 会并发启动，一个 Hook 不能阻止其他 Hook 开始。`PreToolUse` 只覆盖当前支持的 Bash、`apply_patch` 与 MCP 路径，而且 interception 不完整。因此：

- Hook 不能替代 Runtime/Receipt authority。
- Hook 提醒不是每次工具调用都强制写文档。
- Hook 返回的 worker observation 只有满足 topology/evidence 契约时才可用于验收。
- Hook 信任、plugin 启用和项目 trust 都是发现前提。

删除的真实授权只能来自已向用户展示的 exact hashed Deletion Manifest，以及绑定 actor、intent、scope、Manifest hash、plan/Git state 的 `deletion.execute` Receipt。controlled executor 在执行前重验内容与 Git；任何 drift 都会使 Receipt 失效。

## 工作区与恢复

当前 authority 顺序是：

```text
.pipeline/manifest.yaml
  -> .pipeline/runtime/active.yaml
  -> Runtime + Continuation
  -> Records / Receipts
  -> Journal / Capsule / latest valid sealed Pack
```

Resume 先读 Runtime 与 Continuation；Pack 只补充有界上下文。没有 Pack 时仍可按 authority 继续，并明确报告 degraded recovery context。不要从 legacy `state.yaml`、`cycle.yaml`、`log.yaml` 或 `PROGRESS.md` 恢复当前 Delivery。

## 验证

仓库内可验证 manifest、JSON、Hook wrapper 与 deterministic Core。真实宿主验证只有在 compatible current Official Codex、plugin 已启用且 Hooks 已信任时才算 PASS；否则必须报告 SKIP/UNAVAILABLE，不能把 VSP 或旧 Codex 当作通过。
