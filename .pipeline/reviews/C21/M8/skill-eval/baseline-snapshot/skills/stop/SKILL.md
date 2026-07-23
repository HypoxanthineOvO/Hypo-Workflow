---
name: stop
description: Gracefully stop Hypo-Workflow when the user wants to pause execution without aborting the pipeline.
---

# /hypo-workflow:stop
## 输出语言规则

📌 输出语言规则：
读取 config.yaml → output.language
- zh-CN / zh：所有用户可见的输出使用中文（PROGRESS、报告、状态提示、错误消息、交互提问）
- en：使用英文
- auto：跟随用户对话语言
内部日志（log.yaml、state.yaml）始终英文。

使用此技能暂停当前运行，同时保留可恢复状态。

## 前置条件

- 存在活跃的未完成 pipeline 工作

## 执行流程

1. 读取 `.pipeline/state.yaml` 并确认当前运行未完成。
2. 持久化当前 prompt 和步骤状态。
3. 设置 `pipeline.status=stopped`。
4. 保留 `current.phase`，以便未来的恢复可以干净地恢复意图。
5. 如果命令未禁用报告生成，可选择写入中间报告。
6. 向 `.pipeline/log.yaml` 追加一个停止事件。
7. 更新 `.pipeline/PROGRESS.md`，在顶部元数据、当前状态块和时间线表中显示暂停状态。
8. 更新顶层 `last_heartbeat`。
9. 如果 `.pipeline/.lock` 属于当前执行，则移除它。
10. 注销 watchdog cron 条目，因为此停止是有意的。

## 安全规则

- 不要将 prompt 标记为中止
- 不要丢弃部分工作
- 停止应该是可恢复的，而不是破坏性的
- 成功停止后不要留下 `.pipeline/.lock`

## 参考文件

- `references/commands-spec.md` — stop behavior and flags
- `references/state-contract.md` — stopped state semantics
- `references/progress-spec.md` — progress summary updates
- `SKILL.md` — full runtime reference
