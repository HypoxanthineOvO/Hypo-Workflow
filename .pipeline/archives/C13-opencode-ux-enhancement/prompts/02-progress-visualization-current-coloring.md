# M2 — 进度可视化与 Current 着色

## 目标

在面板中添加 ASCII 进度条，为 Current 区块的字段添加颜色区分。

## 范围

- 文件: `.opencode/tui/hypo-workflow-tui.tsx`
- 文件: `plugins/opencode/templates/plugin-tui.tsx`
- 依赖: M0 JSX 重构 + M1 折叠逻辑

## 前置条件

- M0 和 M1 已完成
- 面板已使用 JSX 元素渲染

## 任务

### 1. ASCII 进度条

在 Current 区块或面板顶部添加进度条：

```
进度: [████████░░] 80% (8/10)
```

实现：

```tsx
function renderProgressBar(completed: number, total: number): string {
  if (total === 0) return "[░░░░░░░░░░] 0% (0/0)";
  const percent = Math.round((completed / total) * 100);
  const filled = Math.round(completed / total * 10);
  const empty = 10 - filled;
  return `[${"█".repeat(filled)}${"░".repeat(empty)}] ${percent}% (${completed}/${total})`;
}
```

- 进度条在 sidebar 顶部摘要区域显示
- 百�分比和分数并排

### 2. Current 区块字段着色

为 Current 区块的每个字段添加语义颜色：

| 字段 | 颜色方案 |
|---|---|
| Cycle | 青色（cyan） |
| Phase | 根据 phase 值动态着色 |
| Next | 黄色（yellow） |
| Acceptance | 根据状态着色 |
| Feature | 蓝色（blue） |
| Milestone | 绿色（green） |
| Step | 根据 step 值着色 |

- 使用 `@opentui/solid` 的样式属性（如果支持）
- 如果不支持内联样式，使用 ANSI 转义码

### 3. Phase/Step 动态着色

```tsx
const PHASE_COLORS = {
  executing: "green",
  planning: "yellow",
  completed: "gray",
  blocked: "red",
  pending_acceptance: "cyan",
};

const STEP_COLORS = {
  implement: "green",
  write_tests: "yellow",
  review_code: "blue",
  complete: "gray",
};
```

## 验证

1. 面板顶部显示 ASCII 进度条
2. Current 区块各字段有不同颜色
3. Phase 为 executing 时显示绿色
4. Phase 为 blocked 时显示红色
5. 进度条随 Milestone 完成自动更新

## 交接

- M2 完成后，面板有进度条和 Current 着色
- M3 将扩展状态色编码到所有区块，并添加背景色块
