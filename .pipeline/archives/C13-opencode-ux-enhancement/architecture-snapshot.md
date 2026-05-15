# C13 Architecture — OpenCode 面板美化

## 改动边界

仅 TUI 渲染层改动，数据模型不变。

| 层 | 文件 | 改动 |
|---|---|---|
| TUI 渲染 | `.opencode/tui/hypo-workflow-tui.tsx` | 重构 JSX、添加样式 |
| 模板源 | `plugins/opencode/templates/plugin-tui.tsx` | 同步 TUI 改动 |
| 数据模型 | `.opencode/runtime/hypo-workflow-status.js` | 不改动 |
| 状态文件 | `.pipeline/state.yaml` 等 | 不改动 |

## 当前架构

```
.pipeline/*.yaml
    ↓
buildOpenCodeStatusModel()  ← 不改动
    ↓
model object
    ↓
renderSidebarText(model)    ← 纯字符串拼接
    ↓
<text>{string}</text>       ← 单个 text 元素
```

## 目标架构

```
.pipeline/*.yaml
    ↓
buildOpenCodeStatusModel()  ← 不改动
    ↓
model object
    ↓
renderSidebarContent(model) ← JSX 元素树
    ↓
<box>                        ← 背景色块容器
  <text>标题</text>          ← 着色标题
  <text>内容...</text>       ← 着色内容
  <text>[████░░] 40%</text>  ← 进度条
</box>
```

## 关键约束

1. **@opentui/solid**: 使用 SolidJS JSX，`<text>` 为叶子节点
2. **只读**: TUI 插件不写入 `.pipeline/`
3. **同步**: 改动需同步到模板文件，通过 `hypo-workflow sync` 验证
4. **降级**: 如果 SDK 不支持样式属性，使用 Unicode/ANSI 降级方案

## 色彩系统

### 状态色

| 状态 | 颜色 |
|---|---|
| active | green |
| done/completed | gray |
| error/failed/blocked | red |
| pending/queued | yellow |
| paused/deferred | blue |
| missing/unknown | dim |

### 区块色系

| 区块 | 背景色 | 标题色 |
|---|---|---|
| Current | 深蓝 | cyan |
| Models | 深紫 | magenta |
| Milestones | 深绿 | green |
| Metrics | 深靛 | blue |
| Recent | 深褐 | yellow |
| Warnings | 深红 | red |

## 依赖链

M0 → M1 → M2 → M3 → M4（顺序依赖）

- M0: JSX 重构 + 刷新机制（基础设施）
- M1: 折叠/展开（交互层）
- M2: 进度条 + Current 着色（可视化层）
- M3: 状态色 + 背景色块（色彩系统）
- M4: 丰富色彩 + Metrics/Warnings 增强（精细打磨）
