# M4 — 丰富色彩与 Metrics/Warnings 增强

## 目标

为每个区块应用独立色系，增强 Metrics 显示（数据+趋势），优化 Warnings 原位红色标记，Recent 事件色编码。

## 范围

- 文件: `.opencode/tui/hypo-workflow-tui.tsx`
- 文件: `plugins/opencode/templates/plugin-tui.tsx`
- 依赖: M0-M3

## 前置条件

- M0-M3 已完成
- 面板已有状态色编码和背景色块

## 任务

### 1. Metrics 数据 + 趋势

增强 Metrics 区块显示：

```
Metrics:
- Duration: 12345ms (+5% vs last)
- Tokens: 50000 (-2% vs last)
- Cost: $0.50 (=)
```

- 从 `metrics.yaml` 读取历史数据
- 计算与上次的变化百分比
- 用 ↑ ↓ = 箭头表示趋势
- 趋势颜色：增长=红色（成本相关）/绿色（效率相关），下降=反色

### 2. Warnings 原位红色标记

在各区块内，有 warning 的 item 用红色标记：

```
Derived Health:
- Status: fresh (绿色)
- Stale: 0
- Errors: 1 (红色高亮)
```

- Warnings 不再单独成区块，而是分散到对应区块内
- 用红色前景 + 粗体标记 warning 项
- 保留顶部 toast 通知作为补充

### 3. Recent 事件色编码

为 Recent 区块的事件添加类型色：

```tsx
const EVENT_FAMILY_COLORS = {
  milestone: "green",
  cycle: "cyan",
  patch: "yellow",
  feature: "blue",
  acceptance: "magenta",
  recovery: "red",
  audit: "cyan",
  debug: "yellow",
  release: "green",
  sync: "gray",
};
```

- 每个事件根据 `family` 字段着色
- 事件时间戳用 dim 色
- 事件摘要用对应 family 颜色

### 4. 区块色系微调

在 M3 基础上微调每个区块的色系：

- 标题：亮色前景
- 内容：正常前景
- 次要信息：dim 前景
- 关键值：粗体 + 亮色

## 验证

1. Metrics 区块显示趋势箭头和变化百分比
2. Warnings 在对应区块内红色标记
3. Recent 事件按类型有不同颜色
4. 各区块色系统一且不冲突
5. 面板整体视觉和谐

## 交接

- M4 完成后，面板美化全部完成
- 所有改动同步到模板文件
- 运行 `hypo-workflow sync --platform opencode` 验证同步
