# C17-M4 Test Evidence - Workspace Clean Module Split

## 测试 worker 范围声明

- 本轮只新增测试与测试证据文件。
- 新增文件：`core/test/workspace-module-split.test.js`
- 新增证据：`.pipeline/reviews/C17/M4/test-evidence.md`
- 未修改生产代码、docs、package manifest、`.pipeline/state.yaml`、`.pipeline/log.yaml`、`.pipeline/PROGRESS.md`、`.pipeline/continuation.yaml`。

## RED 测试目标

`core/test/workspace-module-split.test.js` 覆盖 C17-M4 的 clean module split 契约：

1. 目标显式模块文件必须存在，并导出各自职责的核心 public API。
2. `core/src/index.js` 必须导出目标新模块，不能继续导出 `./workspace/index.js`。
3. `core/src/workspace/index.js` 必须不存在，或至少不能成为对新模块的 public re-export compatibility shim。
4. stale import scan：`core/src`、`core/test`、`docs`、`README.md`、`README.en.md` 中不能继续出现 `workspace/index` 或旧 `from .../workspace` import。
5. 关键行为必须能通过新模块路径直接 import 后运行，避免只靠 root barrel 或旧 workspace God Module 误过。

## 预期模块/API 映射

- `core/src/workspace-authority/index.js`
  - `validateWorkspaceAuthority`
  - `loadWorkspaceAuthority`
  - `deriveProjectRegistryFromWorkspace`
- `core/src/project-linkage/index.js`
  - `buildProjectLinkageRegistry`
  - `buildProjectLinkGraph`
  - `validateWorkspaceRelations`
- `core/src/project-stop-events/index.js`
  - `classifyProjectStopEvent`
  - `buildProjectStopEvent`
- `core/src/codex-capture/index.js`
  - `parseCodexFinalAssistantOutput`
  - `captureFinalAssistantOutput`
  - `probeFinalAssistantOutputSource`
- `core/src/notification-sender/index.js`
  - `formatProjectStopNotification`
  - `segmentProjectStopNotification`
  - `sendProjectStopNotification`

## 验证命令与结果

### 新增 RED 测试

命令：

```bash
node --test core/test/workspace-module-split.test.js
```

结果：失败，符合 RED 预期。

关键失败原因：

- `core/src/workspace-authority/index.js` 不存在，导致目标模块存在性/API 导出测试失败。
- `core/src/index.js` 尚未导出 `workspace-authority` 等显式模块。
- `core/src/index.js` 仍包含 `export * from "./workspace/index.js";`。
- focused behavior 测试无法通过 `core/src/workspace-authority/index.js` 等新模块路径 import。
- stale import scan 在测试内发现旧 workspace import。

失败中的 stale import 清单：

```text
core/src/index.js:49:export * from "./workspace/index.js";
core/src/maintenance/daily-project-summary.js:4:import { buildProjectLinkageRegistry, segmentProjectStopNotification, sendProjectStopNotification } from "../workspace/index.js";
core/src/maintenance/project-linkage-e2e.js:9:} from "../workspace/index.js";
core/src/project-events/index.js:8:import { sendProjectStopNotification } from "../workspace/index.js";
core/src/project-notifications/index.js:11:} from "../workspace/index.js";
```

### 既有 focused 行为基线

命令：

```bash
node --test core/test/workspace-authority.test.js core/test/project-link-graph.test.js core/test/project-stop-event.test.js core/test/final-assistant-output.test.js core/test/hypo-claw-notification.test.js core/test/project-linkage-registry.test.js
```

结果：通过。

摘要：34 个测试全部通过，说明现有 God Module 下的 workspace authority、project linkage、project stop event、Codex final assistant capture、Hypo-Claw notification sender 行为基线仍可用。

### 手动 stale import scan

命令：

```bash
rg -n 'workspace/index|from .*/workspace' core/src core/test docs README.md README.en.md
```

结果：失败，仍发现旧 import/export：

```text
core/src/project-notifications/index.js:11:} from "../workspace/index.js";
core/src/project-events/index.js:8:import { sendProjectStopNotification } from "../workspace/index.js";
core/src/maintenance/project-linkage-e2e.js:9:} from "../workspace/index.js";
core/src/maintenance/daily-project-summary.js:4:import { buildProjectLinkageRegistry, segmentProjectStopNotification, sendProjectStopNotification } from "../workspace/index.js";
core/src/index.js:49:export * from "./workspace/index.js";
```

## 当前 RED 结论

C17-M4 尚未满足 clean split 契约：目标模块尚未创建，root barrel 仍导出旧 workspace entry，运行时代码仍依赖 `../workspace/index.js`。新增测试会在实现者完成模块拆分、迁移 import、删除或去公共化旧 `core/src/workspace/index.js` 后转绿。
