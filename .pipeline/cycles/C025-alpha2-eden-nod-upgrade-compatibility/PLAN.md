---
kind: plan
cycle: C025-alpha2-eden-nod-upgrade-compatibility
mode: goal
status: closed
updated: 2026-08-09
progress: PROGRESS.md
execution: EXECUTION.md
---

# alpha.2 Eden/Nod 更新与兼容性验证

## 执行目的

将本机 Eden 与 Nod 的 VSP-Codex Hypo-Workflow active plugin 更新到 `15.0.0-alpha.2+codex.20260809052356`，同时保留活动旧 Session 所需的固定 cache，证明旧版不会参与新 Session 的 active resolution。

## 执行边界

本 Cycle 授权本机与 Nod 的 `.vsp-codex` plugin install、alpha.2 ZIP 的本地/远端版本化 source 目录、CLI marketplace remove/add、必要配置/cache 快照与旧 cache 原路径恢复。不得删除旧 cache、修改本机独立 `~/.codex` 环境、重启/kill app-server、tag、push 或创建远端 Release。

## 验证目标

两端 `codex plugin list` 只将 alpha.2 标记为 installed/enabled；marketplace source 唯一且正确；新 cache 与候选 manifest/checksum 一致；十个 Skills、六类 Hooks、core runtime 与 hook smoke 通过；旧 cache 路径仍存在但不被 active resolver 选择。

## 完整计划

| ID | 阶段 | 期望结果 | 验证方式 |
| --- | --- | --- | --- |
| `M1` | 双端快照与安装前基线 | 配置、marketplace、active version、cache inventory 与 artifact hash 可恢复/对账 | config SHA-256、cache inventory、plugin/marketplace list、ZIP SHA-256 |
| `M2` | 更新 Eden | 从已验证的 versioned artifact source 安装 alpha.2，自动清理的旧 cache 被恢复 | ZIP hash、CLI marketplace switch、plugin add JSON、cache path parity、plugin validator |
| `M3` | 更新 Nod | alpha.2 ZIP 落到新版本化 source，CLI 切换 marketplace 并安装 | SCP hash、marketplace list、plugin add JSON、active cache/version |
| `M4` | 新旧版本隔离兼容验证 | 新 Session 解析只指向 alpha.2；旧固定 cache 可用但不干扰 | resolver uniqueness、manifest/descriptor、10 Skills/6 Hooks、core import、hook smoke、config isolation |
| `M5` | 交付更新报告 | 用户能理解两端状态、验证、问题与残余操作 | `FINAL-REPORT.md` 与最终人工接受/拒绝 |

## 风险与处理

- `plugin add` 可能清理同一 plugin ID 的旧 cache；安装前完整快照，安装后按原绝对路径恢复缺失目录。
- Nod marketplace name 相同而 source 变化；只用 CLI remove/add，保留 config 快照以便回滚，不手改 TOML。
- Eden 原 repo marketplace 会复制 758 MB 脏开发树；用户已选择切换到与 Nod 相同的 versioned artifact source，避免 runtime/memory/旧 dist 进入新 cache。
- 当前/旧 Session 继续使用启动时固定的 `PLUGIN_ROOT`；不通过重启强制切换。兼容结论以新 resolver 和旧路径共存为准。
