# Hypo-Workflow Hooks

Hooks 是语义文件工作方式的轻量辅助，不是 Workflow 正确性来源。主模型即使没有 Hooks，也必须维护 Progress、Execution、Discussion 和恢复所需记录。

## Official Codex Adapter

`hooks/hooks.json` 只注册四类事件：

| 事件 | 职责 |
| --- | --- |
| `SessionStart` | 指向当前 Cycle 的语义索引、Progress 和下一步 |
| `UserPromptSubmit` | 捕获用户可见原文，并提醒主模型识别长期事实 |
| `PreCompact` | 检查 Progress、Execution 和 Discussion Summary 是否足以恢复 |
| `Stop` | 捕获助手可见回复，并提醒同步有意义的进度变化 |

不再注册逐工具证据、压缩后记账、Worker 生命周期或删除保护 Hook（C027 移除删除保护门：破坏性操作由宿主权限与讨论门兜底）。普通工具调用、文件读取和上下文压缩不是项目历史；Worker 的任务、结果和证据由 Handoff、Progress 与 Execution 记录。

Core 实现仍保留 `PostToolUse`、`PostCompact`、`SubagentStart`、`SubagentStop`、`PreToolUse`、`PermissionRequest` 的处理路径，但只作为兼容实现存在：不注册、不承诺触发，也不产生记录或拒绝。注册面（`hooks.json` 四类）、实现面（Core）与文档面（本文件）以此处为准，任何一方变化必须三处同步。

未绑定 Work Item 的 Session 不得被 Hook 阻塞普通提示、工具、诊断或普通文件 Experiment 记录；`selection_required` 只有在候选列表确实存在时才渲染选择上下文。

## Discussion Ledger

用户和助手原文按 Cycle/Session 追加到 `.pipeline/local/discussions/<cycle>/<session>.md`，默认 Git ignore。

- 只保存用户和助手实际可见文本。
- 不保存 system/developer prompt、隐藏推理或原始工具输出。
- 明显 token、password 或 credential 替换为 `[REDACTED]`。
- 已有条目不得修改；纠正作为新条目追加。
- Git 中的 `DISCUSSION-SUMMARY.md` 保存需求、决定、接受、拒绝、纠正、未决问题和本地引用。

## Progress And Recovery

`PreCompact` 只检查能否通过 `PLAN.md`、完整 `PROGRESS.md`、最近 `EXECUTION.md` 和 `DISCUSSION-SUMMARY.md` 恢复，不生成另一套恢复协议。

`SessionStart` 提示当前 Cycle、当前位置和下一步。存在多个 active Cycle 且 Session 未聚焦时，只展示候选并请求选择；不能阻止普通问题和诊断。

## Safety And Failure

非安全 Hook 失败时应 fail open，并给出简短警告。Hook 不替代用户授权，也不能自行改变 Plan 或长期事实；破坏性操作由宿主权限与讨论门兜底。

Codex wrapper 必须只向 stdout 输出一行有效 JSON，诊断写入 stderr。项目本地 Hook 仍需通过宿主信任机制启用。
