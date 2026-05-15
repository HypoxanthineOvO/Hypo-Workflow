# M2 — 跨平台适配器兼容审查

## 目标

审查 OpenCode、Claude Code、Codex 三个平台的命令、权限、worker/subagent、slash namespace、adapter 生成产物是否一致。

## 审查问题

- `/hw:*` canonical command 与 OpenCode `/hw-*` mapping 是否同步？
- Claude Code 的 `hw` plugin namespace 是否保留 `/resume` 与 `/hw:resume` 分离？
- Codex 的 AGENTS 指令、subagent 授权门控、start/resume Worker gate 是否与 Plan/Start 技能一致？
- OpenCode 的 `opencode.json`、plugin、TUI、权限 policy 是否符合 schema？
- 平台适配器是否存在历史残留、配置 drift、生成模板不同步？

## 工作要求

1. 只读审查，不修复代码。
2. 对比 generated/runtime/template/source 文件，标记 source-of-truth。
3. 执行或记录 `hypo-workflow sync --platform opencode --check-only/普通 sync` 的验证证据（若不可用，记录原因）。

## 输出

写入 `.pipeline/reports/C14-M2-platform-compatibility-audit.md`，至少包含：

- Platform compatibility matrix
- Command namespace/mapping matrix
- Permission/schema compatibility findings
- Worker/subagent compatibility findings
- Generated artifact drift findings

## 验收

- 每个平台至少覆盖命令、权限、worker、适配器产物四类证据。
