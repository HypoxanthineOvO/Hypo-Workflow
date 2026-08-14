---
kind: discussion-summary
cycle: C025-alpha2-eden-nod-upgrade-compatibility
updated: 2026-08-09T16:54:55+08:00
---

# 讨论摘要

## 用户需求

- 用户接受 C024 本地分发候选。
- 用户要求本机 Eden 与 Nod 都更新到 alpha.2，确保更新兼容性，旧版不得干扰新版。

## 已确认事实

- Eden 当前 `CODEX_HOME=/home/heyx/.vsp-codex`，active plugin 为 `15.0.0-alpha.1+codex.20260809040716`，marketplace source 为当前仓库。
- Nod 的 VSP-Codex active plugin 为 `15.0.0-alpha.1`，marketplace source 为 `~/.local/share/hypo-workflow/codex-15.0.0-alpha.1`。
- alpha.2 candidate 的 hook 文件与 Nod alpha.1 SHA-256 相同；六 Hook trust 可复用。
- 旧 cache 不立即删除；它们只服务启动时固定旧 `PLUGIN_ROOT` 的 Session。

## 待授权

- 用户已选择“确认并开始”；Goal 获得双端快照、SSH/SCP、CLI marketplace 切换与 plugin reinstall 授权。
- M1 发现 Eden repo-backed cache 为 758 MB；用户选择将 Eden 改为 versioned artifact source，与 Nod 使用同一候选 ZIP，避免开发树杂项进入新 cache。

## 最终接受

- 用户明确接受并关闭 C025。
- 接受范围包含 Eden/Nod alpha.2 active resolution、旧 pinned cache 保留与不干扰结论、Hook 配置偏好保留及最终报告。
- 接受不授权旧 cache 删除、Official Codex `~/.codex` 更新、服务重启、tag、push 或远端发布。
