---
kind: execution
cycle: C025-alpha2-eden-nod-upgrade-compatibility
updated: 2026-08-09T16:54:55+08:00
---

# 执行记录

## 2026-08-09T14:05:20+08:00 - Proposal 建立

- **目的：** 将用户要求的 Eden/Nod alpha.2 更新整理为可回滚、可验证的新旧版本隔离 Goal。
- **动作：** 只读检查两端 CODEX_HOME、CLI、marketplace、active plugin、cache inventory、hook hashes 与 Nod source layout；展示 Discover、Technical 与 Architecture。
- **结果：** Eden active 为 alpha.1+ 且 source 指向当前仓库；Nod active 为 alpha.1 且 source 为版本化本地目录；两端旧 cache 需安装前保护。
- **证据：** 两端 `codex plugin list`/`marketplace list`、config 片段、cache manifests、hook SHA-256、SSH preflight。
- **遇到的问题：** 本机另有隔离的 `~/.codex` alpha.5 环境；本轮明确只更新 Eden 的 `.vsp-codex`，以 CODEX_HOME 隔离证明其不干扰。
- **下一步：** 用户确认并开始、确认但不开始，或继续讨论。

## 2026-08-09T14:07:00+08:00 - Goal 开始

- **目的：** 按已确认 Proposal 开始双端 alpha.2 更新。
- **动作：** 将 Goal 与 Progress 切为 active；保持 M1-M5 和旧 cache/服务/远端发布边界。
- **结果：** 用户选择“确认并开始”；M1 进入执行。
- **证据：** C025 Proposal gate 选择结果。
- **下一步：** 创建双端 config/cache 快照并记录 SHA-256。

## 2026-08-09T14:09:00+08:00 - M1 完成，Eden source 方案修订

- **目的：** 在安装前保证两端可回滚，并选择足以证明新旧版本隔离的安装源。
- **动作：** 备份两端 `.vsp-codex/config.toml`；对 Eden 5 个、Nod 3 个旧 cache 创建原文件 hard-link snapshot；比较 config SHA-256 与 cache inventory。
- **结果：** 快照完整；Eden 现有 repo-backed cache 达 758 MB，而候选 ZIP 仅 177 entries。
- **证据：** Eden backup `~/.local/share/hypo-workflow/upgrade-backups/20260809T060700Z-alpha2-eden`；Nod 对应 `...-nod`；config SHA 分别为 `4b161d03…`、`c4e1f1c7…`。
- **遇到的问题：** 从开发仓库重装会把 runtime/memory/旧 dist 复制进新 cache，隔离证据不足。
- **计划影响：** 用户选择 Eden 与 Nod 都使用同一个 versioned artifact source；M2 的 marketplace source 切换范围扩大到 Eden。
- **下一步：** 解压并校验 Eden versioned source，通过 CLI 切换 marketplace、安装 alpha.2 并恢复旧 cache。

## 2026-08-09T14:12:00+08:00 - M2/M3 完成，M4 启动

- **目的：** 让两端从同一不可变候选安装 alpha.2，并保留旧 Session 兼容路径。
- **动作：** Eden 本地解压候选 ZIP，Nod 通过 SCP 接收同一 ZIP；两端核对 artifact SHA/177 files/runtime；用 CLI remove/add 切换 marketplace 并 plugin add；从 hard-link snapshot 恢复缺失旧 cache。
- **结果：** 两端 active resolver 均为 `15.0.0-alpha.2+codex.20260809052356`；marketplace source 均为对应 versioned directory；Eden 5 个、Nod 3 个旧 cache 路径保留。
- **证据：** 双端 plugin add JSON、plugin/marketplace list、Eden plugin validator、Nod runtime import 与 cache inventory。
- **遇到的问题：** 无安装失败；CLI 安装按预期清理旧 cache，随后已恢复固定路径。
- **计划影响：** M2/M3 完成，M4 开始。
- **下一步：** 验证 active cache 的 Skills/Hooks/descriptor/core/hook smoke 与 config-home 隔离。

## 2026-08-09T16:47:07+08:00 - M4/M5 完成，等待最终审阅

- **目的：** 证明两端新 resolver 只使用 alpha.2，同时旧 pinned Session 路径继续可用且不干扰新版本。
- **动作：** 双端 source/cache 逐文件 diff；核对 10 Skills、6 Hook definitions、installed descriptor/source commit；从新旧 cache 分别导入 Core 并执行 `PreToolUse(Read)` wrapper smoke；解析 TOML 验证 marketplace/plugin/trust state 与 CODEX_HOME 隔离。
- **结果：** Eden/Nod active resolver 唯一指向 alpha.2；新旧 cache Core/Hook smoke 均通过；旧 cache 全部保留但不 active；本机 app-server PID 559803 未变化。
- **证据：** 双端 plugin/marketplace list、cache inventories、source/cache `diff -qr`、JSON/TOML assertions、stdout `{}`/stderr empty hook smoke。
- **遇到的问题：** 初次旧 Hook smoke 因 process cwd 与 payload cwd 不一致产生 fail-open 告警，修正测试 harness 后 clean pass。Eden 预存配置将 `PreToolUse` 设为 disabled；升级保留该偏好，六项 trust state 均存在，其他五 Hook enabled；Nod 六 Hook enabled。
- **计划影响：** M4/M5 完成；Cycle 进入最终人工接受/拒绝点。
- **下一步：** 用户接受或拒绝 Eden/Nod 更新与兼容性结果。

## 2026-08-09T16:54:55+08:00 - M5 接受并关闭

- **目的：** 将用户对 Eden/Nod alpha.2 更新与兼容性结果的明确接受绑定到最终报告并归档。
- **动作：** 核对双端 active version、versioned source、旧 cache 恢复、Core/Hook smoke、config-home 隔离和服务未重启证据；关闭 Cycle 并生成 `SUMMARY.md`。
- **结果：** 用户选择“接受并关闭 C025”；M5 completed，Cycle closed。
- **证据：** `FINAL-REPORT.md`、双端最终 plugin list、backup SHA-256、cache inventory 与 compatibility smoke。
- **计划影响：** 无后续自动动作；旧 cache 清理、Official Codex home 更新和远端发布继续独立授权。
- **下一步：** 无。
