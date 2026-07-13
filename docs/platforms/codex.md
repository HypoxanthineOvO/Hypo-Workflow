# Official Codex 指南

Hypo-Workflow 当前以 Codex plugin + 九个 focused Skills + 十事件 Hooks 运行。它不是 runner；Codex Agent 执行实现、测试和审查，Core 负责验证与持久化。

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
| Commands | 九个公开 Skills：guide、init、goal、plan、cycle、maintain、resume、accept、reject |
| Questions | 使用当前 host 的 Ask / request-user-input 能力；开卡片前先展示完整上下文 |
| Plan | 使用 host 可见 Plan/Todo，并由 `/hw:plan` 内部选择规划阶段 |
| Subagents | 按复杂度选择；重要实现可分离 test、implement、audit 或其他领域角色 |
| Memory | Manifest、Runtime、Continuation、Records、Receipts、Journal、Capsule、Pack、Snapshots |
| Hooks | 十类当前 Official Codex lifecycle events |
| Destruction | exact Deletion Manifest + fresh Receipt + controlled executor |

OpenCode、Claude Code、Cursor、Copilot、Trae 与自定义 Codex fork 适配不属于当前支持面。

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
