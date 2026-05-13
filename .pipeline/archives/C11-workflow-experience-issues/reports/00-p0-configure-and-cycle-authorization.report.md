# M0 - P0 Configure 与规划授权记录

## 结论

已完成 C11 的 P0 Configure 与授权记录固化，后续 Milestone 可读取 `.plan-state/p0-configure.yaml`、`.plan-state/discover.yaml`、`.plan-state/decompose.yaml` 和 `.plan-state/generate.yaml`。

## 做了什么

- 固化 C11 的中文输出、Subagent 授权、worker separation、自动化白名单和审计字段。
- 修正 live `.pipeline/config.yaml` 名称为 C11，避免旧 C10 状态回流。
- 将 Subagent 注入在规划层明确为两层 contract。

## 验证

- `bash scripts/validate-config.sh .pipeline/config.yaml`
- `git diff --check`

## 手动操作

- 运行 `/hw:status` 时应看到 C11，而不是 C10。
- 查看 `.plan-state/p0-configure.yaml`，应能看到 Layer 1 / Layer 2 Subagent 注入和三档自动化白名单。

## 已知风险

- P0 只固化配置和规划记录；具体运行时白名单实现在 M3 完成。
