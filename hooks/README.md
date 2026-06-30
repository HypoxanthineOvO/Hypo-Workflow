# Pipeline Hooks

Hooks 为 Hypo-Workflow Pipeline 提供被动安全网。

## 平台支持

| Hook | Claude Code | Codex |
|------|-------------|-------|
| Stop 强制完成 | ✅ decision:block | ❌ 不支持 |
| SessionStart 上下文注入 | ✅ additionalContext | ❌ 不支持 |
| Compact 恢复包 | ✅ PreCompact / PostCompact | ❌ 不支持 |
| PermissionRequest | ✅ profile-aware allow/ask/deny | ❌ 不支持 |
| Progress refresh | ✅ PostToolUse / PostToolBatch / FileChanged | ❌ 不支持 |
| InstructionsLoaded 监听 | ✅ 可选 | ❌ 不支持 |
| 完成通知 | ✅ Notification | ✅ notify |

## Claude Hook Runtime

C6 起，Claude Code 使用统一 wrapper：

```bash
node hooks/claude-hook.mjs <EventName>
```

当前注册事件：

- `SessionStart`
- `Stop`
- `PreCompact`
- `PostCompact`
- `PostToolUse`
- `PostToolBatch`
- `UserPromptSubmit`
- `PermissionRequest`
- `FileChanged` for `.pipeline/PROGRESS.md`

Stop 会阻止缺失 `state.yaml`、`log.yaml`、`PROGRESS.md`、最终步骤 report 等关键证据；metrics 和 derived refresh gap 只作为 warning。Compact 事件输出 resume packet，明确当前 Cycle/Milestone/step、下一步、自动化边界和最近事件，避免压缩后重放已完成步骤。PermissionRequest 按 `claude_code.profile` 决策：`developer` 本地宽松，`standard` 对破坏性/外部副作用 ask，`strict` 对高风险操作 deny。

## Project Stop QQ Notifications

旧的 Hypo-Workflow project-stop QQ 通知链路已经退役。此前 Claude Stop hook 和 Codex notify hook 会在终态时写入本地 pending queue，再由 `scripts/project-notification-dispatcher.sh` 每分钟读取队列并通过 Hypo-Claw 发送 QQ。现在用户侧 Codex 完成通知由 Hermes 的 `Codex completion watch` 负责：Hermes 每 2 分钟扫描 `~/.codex/sessions/**/*.jsonl`，发现 `task_complete` / `final_answer` 后通过 Hermes Cron 投递到 QQ。

退役原因：旧队列 `~/.hypo-workflow/notifications/project-stop-pending.yaml` 曾膨胀到约 528 MB，dispatcher 每分钟读取时触发 Node heap out-of-memory，并在系统日志中产生规律性的 `cron:session opened/closed` 噪声。避免重复通知和资源浪费后，Hypo-Workflow hooks 只保留工作流约束、resume/context、progress refresh 等本地安全功能，不再写入 project-stop QQ 通知队列。

## Chat Recovery

M13 起，Hook 规范额外支持 `/hw:chat` 的追加对话语义：

- SessionStart 可在无 active Milestone 时提示用户可以进入 `/hw:chat`
- SessionStart 可在 `chat.active == true` 时恢复 chat context
- 恢复时优先注入 `state.yaml + cycle.yaml + PROGRESS.md + recent report`
- Stop Hook 可根据会话规模决定写 `chat summary`，或只保留 `chat_entry` 与修改痕迹
- 当 chat 修改不再轻量时，Hook / runtime 可提示升级为 Patch escalation

## Knowledge Ledger

M03 起，Hook 规范支持 Knowledge Ledger 的轻量上下文和停止前自检：

- SessionStart 注入 `.pipeline/knowledge/knowledge.compact.md`
- SessionStart 注入 `.pipeline/knowledge/index/*.yaml`
- SessionStart 默认不读取 `.pipeline/knowledge/records/*.yaml`
- Stop Hook 在 `knowledge-ledger-self-check: error` 时阻止缺少 Knowledge record 的最终停止
- warn 模式只提示 Agent 自检，不阻止继续

## 安装

### 方式 1：Plugin 安装（推荐，Claude Code）

如果通过 Plugin 安装了 hypo-workflow，Hook 已自动配置。

### 方式 2：手动安装

详见：

- Claude Code: `references/platform-claude.md`
- Codex: `references/platform-codex.md`

## 验证

```bash
# 测试 stop-check（非 Pipeline 目录，应输出空 JSON）
echo '{}' | bash hooks/stop-check.sh

# 测试 session-start（非 Pipeline 目录，应输出空 JSON）
echo '{}' | bash hooks/session-start.sh startup

# 测试 Claude wrapper（非 Pipeline 目录，应输出空 JSON）
echo '{}' | node hooks/claude-hook.mjs SessionStart
```
