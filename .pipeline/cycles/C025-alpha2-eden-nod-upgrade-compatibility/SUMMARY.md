---
kind: cycle-summary
cycle: C025-alpha2-eden-nod-upgrade-compatibility
status: closed
started: 2026-08-09
finished: 2026-08-09
builds_on:
  - C024-v15-alpha2-distribution-preparation
successors: []
---

# alpha.2 Eden/Nod 更新与兼容性总结

## 目的与边界

将 Eden 与 Nod 的 VSP-Codex Hypo-Workflow active plugin 更新到 alpha.2，同时保留旧 Session 固定 cache 并证明新旧版本隔离。范围包含双端 snapshot、SCP、versioned source、CLI marketplace/plugin update 与兼容性验证；不删除旧 cache、不改 Official Codex home、不重启服务或远端发布。

## 最终结果

- Eden 与 Nod active plugin 均为 `15.0.0-alpha.2+codex.20260809052356`。
- 两端 marketplace 唯一指向对应的 alpha.2 versioned artifact source。
- Eden 新 cache 为 177 files/约 2.9 MB；Nod 为 177 files/约 3.4 MB。
- Eden 5 个、Nod 3 个旧 cache 均恢复到安装前绝对路径，但不参与 active resolution。
- 用户已接受双端更新、兼容性结论和保留边界。

## 验证结果

- 两端 source/cache `diff -qr` 无差异。
- 两端 active cache 均包含 10 Skills、6 Hook definitions 与 source commit `6e53401019d8b5af0630c80f2d3f59f7f5b35a72`。
- 新旧 active/pinned cache 的 Core import 与 `PreToolUse(Read)` wrapper smoke 均通过，stdout `{}`、stderr empty。
- 双端 resolver 唯一选择 alpha.2；本机独立 `~/.codex` alpha.5 由 CODEX_HOME 隔离。
- Eden app-server PID 559803 未变化。

## 重要决定与经验

- mutable repo marketplace 会复制 758 MB 开发树，不适合可审计安装；Eden 与 Nod 统一改用同一 versioned artifact source。
- installer 清理旧 cache 是预期行为；活动旧 Session 兼容需要安装前快照并在同一流程恢复原路径。
- 安装更新不应覆盖用户 Hook 开关。Eden 保留 PreToolUse disabled 偏好，Nod 六 Hook enabled；两端六项 trust state 均存在。

## 后续候选

- 只有确认全部 pinned 旧 Session 结束后，才单独审阅并授权旧 cache 清理。
- 如需更新本机 Official Codex `~/.codex` alpha.5、启用 Eden PreToolUse、创建 artifact commit、tag/push 或远端 Release，分别建立明确范围。
