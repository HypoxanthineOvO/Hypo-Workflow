# C17-M4 Workspace Clean Module Split Report

## 结论

C17-M4 已完成并通过审计。`core/src/workspace/index.js` God Module 已拆分为五个显式 public 模块，旧 workspace public entry 已删除，未保留 re-export compatibility shim。

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

## 变更摘要

- 删除 `core/src/workspace/index.js`。
- `core/src/index.js` 移除旧 workspace export，改为导出五个新模块。
- 迁移 `project-events`、`project-notifications`、`daily-project-summary`、`project-linkage-e2e` 的旧 workspace imports。
- docs/README 扫描未发现旧 workspace import 示例，无需额外文档改动。

## Worker Evidence

- Test worker: Carver (`019e4a1f-1df6-7fc1-a4d4-68b1094cad59`)
  - Evidence: `.pipeline/reviews/C17/M4/test-evidence.md`
  - RED: workspace split focused test 1/5 passing，4 failing。
- Implement worker: Turing (`019e4a23-b4e8-7712-b5a5-4108fe6e74f4`)
  - Evidence: `.pipeline/reviews/C17/M4/implementation-evidence.md`
  - 实现模块拆分、旧入口删除和 import 迁移。
- Audit worker: Jason (`019e4a2e-20b1-71e2-8cf8-ae675145cdcc`)
  - Evidence: `.pipeline/reviews/C17/M4/audit.md`
  - Verdict: PASS。

## Validation

- `node --test core/test/workspace-module-split.test.js core/test/workspace-authority.test.js core/test/project-link-graph.test.js core/test/project-stop-event.test.js core/test/final-assistant-output.test.js core/test/hypo-claw-notification.test.js core/test/project-linkage-registry.test.js`: 39/39 passing
- `npm test`: 655/655 passing
- `git diff --check`: passing
- `test ! -e core/src/workspace/index.js`: passing
- `rg -n "workspace/index|from .*/workspace" core/src core/test docs README.md README.en.md`: no stale legacy workspace import; only allowed `workspace-authority` new-module path match

## Warning

- 当前工作树仍是 C17 多里程碑聚合状态；最终 release audit 需整体复核跨里程碑 diff。

## Next

进入 C17-M5：JSONL ledger 迁移与 public export surface 清理。
