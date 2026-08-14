---
kind: final-report
cycle: C025-alpha2-eden-nod-upgrade-compatibility
status: accepted
updated: 2026-08-09T16:54:55+08:00
---

# alpha.2 Eden/Nod 更新与兼容性报告

## 结论

Eden 与 Nod 的 VSP-Codex Hypo-Workflow active plugin 均已更新到 `15.0.0-alpha.2+codex.20260809052356`。两端使用同一个 SHA-256 已验证的 versioned artifact source；新 Session resolver 只选择 alpha.2。安装前旧 cache 已恢复到原绝对路径，可继续服务 pinned 旧 Session，但不会参与 active resolution。未重启或 kill 任何 app-server。

## 技术方案

先对两端 `.vsp-codex/config.toml` 与全部 Hypo cache 建立可恢复 snapshot，再从同一 Codex ZIP 创建版本化 source。marketplace source 只通过 Codex CLI remove/add 切换，plugin 只通过 `codex plugin add` 安装；installer 清理的旧 cache 从 hard-link snapshot 恢复。兼容性验证同时检查新 resolver、新 cache 完整性与旧 pinned cache 可执行性。

## Eden 更新结果

- Active source：`/home/heyx/.local/share/hypo-workflow/codex-15.0.0-alpha.2+codex.20260809052356`。
- Active cache：`/home/heyx/.vsp-codex/plugins/cache/hypoxanthine-hypo-workflow/hypo-workflow/15.0.0-alpha.2+codex.20260809052356`。
- 新 source/cache 为 177 files、约 2.9 MB，逐文件一致；不再从 758 MB 脏开发仓库生成新 cache。
- 旧 cache 5 个全部保留：14.0.0-alpha.5、alpha.1 与三个 alpha.1 cachebuster 版本。
- Snapshot：`/home/heyx/.local/share/hypo-workflow/upgrade-backups/20260809T060700Z-alpha2-eden`；安装前 config SHA-256 `4b161d03fab08242792d24163df1e95d4abce49207e692d05c7a6685a69be0f9`。
- 本机独立 `~/.codex` 仍指向 alpha.5 source，但当前 `CODEX_HOME=/home/heyx/.vsp-codex`，两套 home 隔离，不参与 Eden resolver。

## Nod 更新结果

- Active source：`/home/heyx/.local/share/hypo-workflow/codex-15.0.0-alpha.2+codex.20260809052356`。
- Active cache：`/home/heyx/.vsp-codex/plugins/cache/hypoxanthine-hypo-workflow/hypo-workflow/15.0.0-alpha.2+codex.20260809052356`。
- SCP 后 artifact SHA-256 为 `a4337674c54833ab3159f03ff5d36e67f4425f8ff1ef4e7c83d96467bd493f04`；source 为 177 files、约 3.4 MB。
- 旧 cache 3 个全部保留：14.0.0-alpha.5+、14.0.0-alpha.6+ 与 15.0.0-alpha.1。
- Snapshot：`/home/heyx/.local/share/hypo-workflow/upgrade-backups/20260809T060700Z-alpha2-nod`；安装前 config SHA-256 `c4e1f1c7fe3e985f257432c79a97506ac66f1ed01516d3e7b79e84ad3a7daad5`。

## 验证设计与结果

- 两端 `plugin list`：唯一 installed/enabled Hypo plugin 为 alpha.2。
- 两端 `marketplace list`：同名 marketplace 唯一指向 alpha.2 versioned source。
- 两端 versioned source 与 active cache：`diff -qr` 无差异。
- 两端 active cache：10 个 Skill 目录、6 类 Hook definitions、source commit `6e53401019d8b5af0630c80f2d3f59f7f5b35a72`。
- 两端 active cache Core import：通过；`PreToolUse(Read)` wrapper smoke：exit 0、stdout `{}`、stderr empty。
- 安装前 active 旧 cache Core import 与相同 Hook smoke：两端通过，证明 pinned path 恢复有效。
- 两端 config：alpha.2 plugin enabled，六项 active Hook trust state 存在。
- Eden 保留既有 Hook 开关：PreToolUse disabled，其他五项 enabled；Nod 六项 enabled。升级没有覆盖用户偏好。
- Eden app-server PID `559803` 在更新前后保持不变。

## 预期用户结果

新开的 Eden/Nod VSP-Codex Session 会从 alpha.2 versioned source/cache 加载十个 Skills 和当前六 Hook definitions。已运行的旧 Session 仍可访问启动时固定的旧 `PLUGIN_ROOT`；旧 cache 的存在不会改变 marketplace/plugin active resolution，因此不会把旧实现混入新 Session。

## 遇到的问题

- Eden 原 repo-backed cache 达 758 MB，包含 runtime/memory/旧 dist 等开发树内容。用户选择将 Eden 也切换为 versioned artifact source，新 cache 收敛到 2.9 MB。
- `plugin add` 按预期清理旧 cache；两端均从安装前 snapshot 恢复原路径。
- 初次旧 Hook smoke 的 process cwd 与 payload cwd 不一致，wrapper 正确 fail-open 并给出 stderr 诊断；修正 harness 后 clean pass，不是插件缺陷。

## 风险与后续

- 旧 cache 当前为兼容活动 Session 而保留。只有确认所有 pinned 旧 Session 结束后，才能另行授权清理；本轮未删除。
- Eden 的 PreToolUse disabled 是安装前用户配置，本轮保留。若需要六 Hook 全 enabled，应作为独立配置决定处理。
- 本机独立 `~/.codex` 仍是 alpha.5；它与 Eden `.vsp-codex` 隔离。若也要升级 Official Codex home，需要单独明确范围。
- 未执行 tag、push、GitHub Release/npm publish、app-server restart/kill 或 Hook 开关改写。
