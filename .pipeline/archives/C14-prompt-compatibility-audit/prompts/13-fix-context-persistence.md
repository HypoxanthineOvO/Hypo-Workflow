# M13 — 上下文保持增强

## 目标
Agent 在长对话中不会"忘记"自己在 Workflow 模式下，持续维护状态文件。

## 问题
在反复反馈修改过程中，Agent 逐渐脱离 Workflow 模式，不再记录状态变更。`/hw:resume` 后之前的修改丢失。

## 修复

### 1. AGENTS.md 增加 Workflow 心智保持指令
在 `AGENTS.md` 中增加段落：

```markdown
## Workflow context persistence
- Before every response, check `.pipeline/state.yaml` for current milestone/step.
- After every code or config change that completes a step, update:
  - `.pipeline/state.yaml` (step status, heartbeat)
  - `.pipeline/log.yaml` (step_complete event)
  - `.pipeline/PROGRESS.md` (timeline entry)
- When receiving revision feedback, update step status to "in_progress" before reworking.
- Never silently exit Workflow mode — if blocked, write continuation.yaml.
```

### 2. session-start hook 注入当前状态
**文件**: `hooks/session-start.sh`

在上下文中注入：
```
--- Hypo-Workflow Current State ---
Cycle: C14 (Prompt兼容性审查)
Milestone: M11 (测试修复)
Step: implement
Last heartbeat: 2026-05-15T14:00:00
--- End Workflow State ---
```

### 3. PROGRESS.md 心跳机制
在 `.pipeline/state.yaml` 的 `last_heartbeat` 更新频率从"每步骤"提高到"每文件修改"。

## 验收
- AGENTS.md 包含 Workflow context persistence 段落
- session-start hook 注入当前状态摘要
- 能够在多轮对话后 `/hw:resume` 不丢失修改
