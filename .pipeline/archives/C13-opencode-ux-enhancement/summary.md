# C13 — OpenCode体验优化

## 基本信息

- **Cycle 编号**: C13
- **名称**: OpenCode体验优化
- **类型**: feature
- **状态**: completed
- **Preset**: tdd
- **开始时间**: 2026-05-14T19:08:10+08:00
- **结束时间**: 2026-05-14T23:30:00+08:00

## 里程碑

| ID | 名称 | 状态 |
|----|------|------|
| M0 | 面板刷新与交互基础 | done |
| M1 | 折叠/展开与面板收起 | done |
| M2 | 进度可视化与 Current 着色 | done |
| M3 | 状态色编码与背景色块 | done |
| M4 | 丰富色彩与 Metrics/Warnings 增强 | done |

## 关键数据

- **TUI 面板**: 从 173 行纯文本重构为 356 行带颜色、进度条、折叠/展开的交互式面板
- **命令注册**: 在 opencode.json 中注册 28 个 /hw-* 命令，分发到 26 个本地仓库
- **版本**: v12.5.2 → v12.6.0
- **颜色方案**: 使用 @opentui/solid 的 style prop API（fg, bold）实现逐词着色

## 延后事项

- M4 的 Metrics 趋势对比（数据+趋势箭头）
- 面板整体收起功能（需要 TUI 交互触发机制）

## 知识摘要

- @opentui/solid 的正确着色方式是 `<span style={{ fg: "color" }}>`，不是 `<span fg="color">` 也不是 ANSI 转义码
- OpenCode 命令需要在 opencode.json 的 `command` 字段注册，不能只在 plugin 的 commandMap 中定义
