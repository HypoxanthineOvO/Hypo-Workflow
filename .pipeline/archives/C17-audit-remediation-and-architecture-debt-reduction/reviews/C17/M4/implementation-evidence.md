# C17-M4 Workspace Clean Module Split 实现证据

## 模块映射

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

## 旧入口处理

- 已删除 `core/src/workspace/index.js`。
- 未保留 public re-export compatibility shim。
- `core/src/index.js` 已移除 `export * from "./workspace/index.js"`，改为导出五个拆分模块。

## import 迁移

- `core/src/project-events/index.js`
  - `sendProjectStopNotification` 改为从 `../notification-sender/index.js` 导入。
- `core/src/project-notifications/index.js`
  - stop event API 改为从 `../project-stop-events/index.js` 导入。
  - final assistant capture API 改为从 `../codex-capture/index.js` 导入。
  - notification formatting/sending API 改为从 `../notification-sender/index.js` 导入。
- `core/src/maintenance/project-linkage-e2e.js`
  - project linkage API 改为从 `../project-linkage/index.js` 导入。
  - stop event API 改为从 `../project-stop-events/index.js` 导入。
  - capture API 改为从 `../codex-capture/index.js` 导入。
  - notification API 改为从 `../notification-sender/index.js` 导入。
- `core/src/maintenance/daily-project-summary.js`
  - `buildProjectLinkageRegistry` 改为从 `../project-linkage/index.js` 导入。
  - notification segmentation/sending API 改为从 `../notification-sender/index.js` 导入。

## docs 更新

- 已扫描 `docs/**`, `README.md`, `README.en.md`。
- 未发现旧 `workspace/index.js` import 或需要更新的 workspace public import 示例，因此未做无关文档改动。

## 验证结果

- `node --test core/test/workspace-module-split.test.js`
  - 通过：5/5。
- `node --test core/test/workspace-authority.test.js core/test/project-link-graph.test.js core/test/project-stop-event.test.js core/test/final-assistant-output.test.js core/test/hypo-claw-notification.test.js core/test/project-linkage-registry.test.js`
  - 通过：34/34。
- `rg -n 'workspace/index|from .*/workspace' core/src core/test docs README.md README.en.md`
  - 无 `workspace/index` 命中。
  - 唯一命中为 `core/src/index.js` 中按任务要求新增的 `export * from "./workspace-authority/index.js"`；这是新模块导出，不是旧 workspace 入口或 compatibility shim。
- `npm test`
  - 通过：655/655。
- `git diff --check`
  - 通过，无 whitespace error。

## 边界声明

- 未读取或修改 `core/test/workspace-module-split.test.js` 测试源码。
- 未修改 `core/test/**`。
- 未修改 package manifests。
- 未修改 `.pipeline/state.yaml`, `.pipeline/log.yaml`, `.pipeline/PROGRESS.md`, `.pipeline/continuation.yaml`, `.pipeline/.lock`, `.pipeline/reports/**`。
