# M3 — 状态色编码与背景色块

## 目标

建立统一的状态色编码系统，为面板每个区块添加不同背景色块分隔。

## 范围

- 文件: `.opencode/tui/hypo-workflow-tui.tsx`
- 文件: `plugins/opencode/templates/plugin-tui.tsx`
- 依赖: M0-M2

## 前置条件

- M0-M2 已完成
- 面板已有 JSX 结构、折叠、进度条、Current 着色

## 任务

### 1. 统一状态色编码系统

定义全局状态色映射：

```tsx
const STATUS_COLORS = {
  active: "green",
  done: "gray",
  completed: "gray",
  error: "red",
  failed: "red",
  blocked: "red",
  pending: "yellow",
  queued: "yellow",
  paused: "blue",
  deferred: "blue",
  missing: "dim",
  unknown: "dim",
};
```

- Milestone 状态着色
- Feature 状态着色
- Pipeline status 着色
- Acceptance state 着色

### 2. 区块背景色块

为每个区块定义不同的背景色系：

| 区块 | 背景色 | 前景色 |
|---|---|---|
| Current | 深蓝 (#1a1a2e) | 白色 |
| Recovery | 深红 (#2e1a1a) | 白色 |
| Models | 深紫 (#1a1a2e) | 白色 |
| Feature Queue | 深青 (#1a2e2e) | 白色 |
| Milestones | 深绿 (#1a2e1a) | 白色 |
| Blocked/Deferred | 深橙 (#2e2e1a) | 白色 |
| Derived Health | 深灰 (#1a1a1a) | 白色 |
| Metrics | 深靛 (#1a1a2e) | 白色 |
| Recent | 深褐 (#2e1a1a) | 白色 |
| Warnings | 深红 (#3e1a1a) | 黄色 |

- 使用 `@opentui/solid` 的 `<box>` 元素样式属性
- 如果 SDK 不支持背景色，使用 Unicode 方块字符模拟

### 3. 标题着色

每个区块标题使用对应的前景亮色：

```tsx
const SECTION_TITLE_COLORS = {
  Current: "cyan",
  Models: "magenta",
  "Feature Queue": "cyan",
  Milestones: "green",
  Metrics: "blue",
  Recent: "yellow",
  Warnings: "red",
};
```

### 4. 边框和分隔

- 区块之间用空行或分隔线分隔
- 区块内部用缩进区分标题和内容

## 验证

1. 面板各区块有不同背景色
2. Milestone 状态为 done 时显示灰色
3. Milestone 状态为 active 时显示绿色
4. Warnings 区块红色背景 + 黄色文字
5. 各区块标题有对应颜色

## 交接

- M3 完成后，面板有完整的色编码和背景色块
- M4 将增强 Metrics 趋势、Warnings 原位标记和丰富色彩
