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

This is an internal skill. It is not a normal user-facing command. It exists so `scripts/watchdog.sh` and cron-driven agents have a precise policy for deciding when to trigger `/hw:resume`.

## 前置条件

- `.pipeline/config.yaml` exists
- `.pipeline/state.yaml` exists
- `watchdog.enabled=true` in effective config

If `watchdog.enabled=false` or the field is missing, do nothing.

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

Defaults are intentionally disabled for backward compatibility.

## Heartbeat 契约

All Pipeline execution skills must update `.pipeline/state.yaml` after every meaningful execution transition:

```yaml
last_heartbeat: "2026-04-28T12:00:00+08:00"
```

Write an ISO-8601 timestamp with timezone. Use `output.timezone`; default to `Asia/Shanghai`.

Update `last_heartbeat` when:

- `/hw:start` sets `current.phase=executing`
- `/hw:resume` sets `current.phase=executing`
- any execution sub-step completes
- a milestone completes, defers, blocks, stops, or fails
- the pipeline completes

## 检测流程

1. Resolve config as project > global > defaults.
2. Read `.pipeline/state.yaml`.
3. Check `current.phase`; continue only when it is `executing`.
4. Read `last_heartbeat`.
5. If heartbeat age is less than `watchdog.heartbeat_timeout`, exit quietly.
6. If `.pipeline/.lock` exists, log `skip: lock exists` and exit.
7. If consecutive failures reached `max_retries`, stop and notify if configured.
8. Trigger `/hw:resume`.
9. Record the result in `.pipeline/watchdog.log`.

## Lockfile

`/hw:start` and `/hw:resume` must create `.pipeline/.lock` before entering active execution and remove it when the execution turn completes, stops, blocks, or finishes. The watchdog must never resume when the lock exists.

Lockfile content should include:

```text
pid=<pid or agent-session>
started=<iso timestamp>
command=/hw:start or /hw:resume
```

## Backoff

Store retry state in `.pipeline/watchdog.state`.

- failures 0-2: run on the configured interval
- failures 3-4: use a longer backoff before trying again
- failure 5 or greater: stop retrying and notify when `watchdog.notify=true`

Successful resume resets the consecutive failure count to 0.

## Cron 注册

When `/hw:start` reads `watchdog.enabled=true`, it should register a crontab entry for `scripts/watchdog.sh` using `watchdog.interval`.

When the pipeline reaches `completed`, `/hw:stop` stops intentionally, or the user aborts, unregister the crontab entry.

When `watchdog.enabled=false`, never register cron.

Use an identifiable crontab marker:

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
