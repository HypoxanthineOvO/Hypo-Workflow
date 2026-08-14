---
kind: discussion-summary
cycle: C024-v15-alpha2-distribution-preparation
updated: 2026-08-09T14:02:34+08:00
---

# 讨论摘要

## 用户需求

- 用户接受 C023 的 History Refresh 通用化与完整测试合同治理结果。
- 用户要求开始准备分发，版本命名为“15.0 alpha 2”；按规范 SemVer 解释为 `15.0.0-alpha.2`。

## 已确认决定

- 只准备本地分发候选，不执行 commit、tag、push、远端发布、插件重装、marketplace/config 修改或服务重启/kill。
- 复用仓库既有 Host artifact builder 与 current maintained gate，不另造打包或测试体系。
- Codex manifest 允许 `+codex.<timestamp>` build metadata，公开 release version 保持 `15.0.0-alpha.2`。

## 待授权

- 用户已选择“确认并开始”；Goal 获得执行授权。

## 追加授权与保留边界

- builder 因 8 个打包输入未绑定 `HEAD` 而停止后，用户明确授权一个精确 allowlist 的本地 source-prep commit 并继续构建。
- 最终本地 commit 为 `6e53401019d8b5af0630c80f2d3f59f7f5b35a72`；runtime、memory、旧 dist 与其他并行改动均未纳入。
- 用户仍未授权 tag、push、远端发布、插件重装、marketplace/config 安装修改或 app-server 重启/kill。

## 最终接受与后续授权

- 用户明确接受并关闭 C024。
- 用户要求本机 Eden 与 Nod 都更新到 alpha.2，并验证更新兼容性，确保旧版不干扰新版。
- 该后续要求授权必要的本地/远端插件更新与兼容性验证；tag、push、远端 Release 与服务重启仍未包含在授权中。
