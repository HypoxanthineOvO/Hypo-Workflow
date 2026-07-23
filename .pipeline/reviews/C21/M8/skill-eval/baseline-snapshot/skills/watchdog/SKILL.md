---
name: watchdog
description: Internal cron-invoked Auto Resume watchdog for stalled executing pipelines.
---

# /hypo-workflow:watchdog
## 输出语言规则

📌 输出语言规则：
读取 config.yaml → output.language
- zh-CN / zh：所有用户可见的输出使用中文（PROGRESS、报告、状态提示、错误消息、交互提问）
- en：使用英文
- auto：跟随用户对话语言
内部日志（log.yaml、state.yaml）始终英文。

这是一个内部技能。它不是普通的面向用户的命令。它的存在是为了让 `scripts/watchdog.sh` 和 cron 驱动的代理有一个精确的策略来决定何时触发 `/hw:resume`。

## 前置条件

- `.pipeline/config.yaml` 存在
- `.pipeline/state.yaml` 存在
- 有效配置中 `watchdog.enabled=true`

如果 `watchdog.enabled=false` 或字段缺失，则不执行任何操作。

## 配置

```yaml
watchdog:
  enabled: false
  interval: 300
  heartbeat_timeout: 300
  max_retries: 5
  max_consecutive_milestones: 10
  notify: true
```

为了向后兼容，这些默认值被有意禁用。

## Heartbeat 契约

所有 Pipeline 执行技能必须在每次有意义的执行转换后更新 `.pipeline/state.yaml`：

```yaml
last_heartbeat: "2026-04-28T12:00:00+08:00"
```

写入带时区的 ISO-8601 时间戳。使用 `output.timezone`；默认为 `Asia/Shanghai`。

在以下情况下更新 `last_heartbeat`：

- `/hw:start` 设置 `current.phase=executing`
- `/hw:resume` 设置 `current.phase=executing`
- 任何执行子步骤完成
- milestone 完成、延迟、阻塞、停止或失败
- pipeline 完成

## 检测流程

1. 解析配置为 project > global > defaults。
2. 读取 `.pipeline/state.yaml`。
3. 检查 `current.phase`；仅当其为 `executing` 时继续。
4. 读取 `last_heartbeat`。
5. 如果心跳年龄小于 `watchdog.heartbeat_timeout`，则静默退出。
6. 如果 `.pipeline/.lock` 存在，记录 `skip: lock exists` 并退出。
7. 如果连续失败次数达到 `max_retries`，则停止并在配置时通知。
8. 触发 `/hw:resume`。
9. 将结果记录在 `.pipeline/watchdog.log` 中。

## Lockfile

`/hw:start` 和 `/hw:resume` 必须在进入活跃执行之前创建 `.pipeline/.lock`，并在执行轮次完成、停止、阻塞或结束时移除它。当锁存在时，watchdog 绝不能恢复。

锁文件内容应包括：

```text
pid=<pid or agent-session>
started=<iso timestamp>
command=/hw:start or /hw:resume
```

## Backoff

将重试状态存储在 `.pipeline/watchdog.state` 中。

- 失败 0-2 次：按配置的间隔运行
- 失败 3-4 次：在再次尝试前使用更长的退避时间
- 失败 5 次或更多：停止重试，并在 `watchdog.notify=true` 时通知

成功的恢复将连续失败计数重置为 0。

## Cron 注册

当 `/hw:start` 读取到 `watchdog.enabled=true` 时，应使用 `watchdog.interval` 为 `scripts/watchdog.sh` 注册一个 crontab 条目。

当 pipeline 达到 `completed`、`/hw:stop` 故意停止或用户中止时，注销 crontab 条目。

当 `watchdog.enabled=false` 时，永不注册 cron。

使用可识别的 crontab 标记：

```text
# hypo-workflow-watchdog:<project-root>
```

## 参考文件

- `scripts/watchdog.sh` — deterministic shell implementation of the detection flow
- `skills/start/SKILL.md` — lock and heartbeat writes on start
- `skills/resume/SKILL.md` — lock and heartbeat writes on resume
- `skills/stop/SKILL.md` — unregister cron and remove lock
- `references/state-contract.md` — state field contract
- `references/config-spec.md` — config defaults
