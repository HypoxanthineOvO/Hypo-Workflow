# M0 — 面板刷新与交互基础

## 目标

将 TUI 面板从纯 `<text>` 字符串渲染重构为 JSX 元素渲染，增加手动刷新按钮和 Cycle 切换加载动画。

## 范围

- 文件: `.opencode/tui/hypo-workflow-tui.tsx`（主实现）
- 文件: `plugins/opencode/templates/plugin-tui.tsx`（同步模板）
- 不改动: `.opencode/runtime/hypo-workflow-status.js`（数据模型不变）

## 任务

### 1. JSX 元素重构

将 `renderSidebarText()` 从返回纯字符串改为返回 JSX 元素：

```tsx
// 当前: <text>{renderSidebarText(model())}</text>
// 目标: {renderSidebarContent(model())}
```

- 每个区块用 `<box>` 或 `<text>` 元素包裹
- 保留 `<text>` 作为叶子节点（OpenCode TUI 仍用 `<text>` 渲染文本）
- 为后续 M1-M4 的样式绑定做结构准备

### 2. 手动刷新按钮

在 sidebar 底部或 footer 区域添加刷新交互：

- 利用 `api.ui` 或 `api.command` 触发刷新
- 如果 TUI SDK 不支持按钮，用键盘快捷键或命令触发
- 刷新时显示短暂的 "刷新中..." 提示

### 3. Cycle 切换加载动画

- 检测 `model.cycle.id` 变化
- 变化时显示加载状态（如 "Loading C13..."）
- 加载完成后恢复正常显示

### 4. 刷新事件优化

- 评估当前 9 个事件订阅是否都需要刷新
- 添加防抖（debounce），避免短时间内多次刷新
- 刷新失败时保留上一次的 model 数据

## 验证

1. 启动 OpenCode，打开 Hypo-Workflow 面板
2. 执行 `/hw:cycle new` 切换 Cycle，观察面板自动刷新
3. 手动触发刷新，确认数据更新
4. 确认无渲染错误或崩溃

## 交接

- M0 完成后，面板结构从纯字符串变为 JSX 元素
- M1 将在此基础上添加折叠/展开逻辑
- 数据模型 `hypo-workflow-status.js` 保持不变
