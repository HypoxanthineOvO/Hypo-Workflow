# M1 — 折叠/展开与面板收起

## 目标

为面板区块添加折叠/展开能力，实现智能折叠（内容超阈值自动折叠），并支持面板整体收起。

## 范围

- 文件: `.opencode/tui/hypo-workflow-tui.tsx`
- 文件: `plugins/opencode/templates/plugin-tui.tsx`
- 依赖: M0 的 JSX 元素重构

## 前置条件

- M0 已完成 JSX 元素重构
- 每个区块已用独立元素包裹

## 任务

### 1. 折叠/展开状态管理

```tsx
const [collapsedSections, setCollapsedSections] = createSignal<Set<string>>(new Set());
```

- 每个区块有唯一 ID（如 "current", "models", "milestones" 等）
- 点击区块标题切换折叠状态
- 如果 TUI SDK 不支持点击事件，用命令或快捷键触发

### 2. 智能折叠逻辑

定义阈值配置：

```tsx
const SMART_COLLAPSE = {
  items_threshold: 4,    // 超过 4 项自动折叠
  char_threshold: 200,   // 单项超过 200 字符自动折叠
};
```

- 区块 items 数量 > threshold → 默认折叠
- 区块总字符数 > char_threshold → 默认折叠
- Current 区块始终展开（核心信息）
- Milestones 区块始终展开（当前任务）

### 3. 折叠渲染

折叠时只显示标题 + 摘要行：

```tsx
// 展开: "Models:" + 所有 items
// 折叠: "Models: (3 agents)" + 点击提示
```

### 4. 面板整体收起

- 添加面板收起/展开状态
- 收起时只显示摘要行：`C13 | M0 | executing | 2/5`
- 展开时显示完整面板

## 验证

1. 启动面板，确认 Models/Feature Queue 等长列表区块默认折叠
2. 点击标题展开，再点击折叠
3. 面板收起后只显示一行摘要
4. 展开后恢复完整内容

## 交接

- M1 完成后，面板支持折叠/展开
- M2 将在 Current 区块添加进度条和着色
