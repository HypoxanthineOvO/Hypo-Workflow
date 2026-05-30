# C17-M1 Shared Utils Layer Extraction Report

## 结论

C17-M1 已完成并通过审计。共享工具层 `core/src/utils/index.js` 已建立，首批低风险重复 helper 已迁移，根目录测试入口保持 GREEN。

## 变更摘要

- 新增 `core/src/utils/index.js`，集中提供 `isPlainObject`、`cloneJson`/`deepClone`、`compactTimestamp`、`stableStringify`、`hasText`、`safeId`。
- 迁移 `evidence`、`reviews`、`storage-sync`、`domains`、`project-events`、`maintenance/project-linkage-e2e` 中的重复 helper 调用。
- 从 `core/src/index.js` 暴露共享 utils。
- 新增 `core/test/utils.test.js` 固化共享 helper 的基础契约。

## Worker Evidence

- Test worker: Aquinas (`019e49df-fc2f-7562-b422-b9210f9ed99a`)
  - Evidence: `.pipeline/reviews/C17/M1/test-evidence.md`
  - RED: `core/src/utils/index.js` 缺失导致 focused test 0/7 失败。
- Implement worker: Schrodinger (`019e49e2-ecfc-75a2-99d0-b2ea6fe30dc8`)
  - Evidence: `.pipeline/reviews/C17/M1/implementation-evidence.md`
  - GREEN: shared utils 实现和低风险迁移完成。
- Audit worker: Arendt (`019e49e9-8423-75b2-9ec1-6125c403975e`)
  - Evidence: `.pipeline/reviews/C17/M1/audit.md`
  - Verdict: PASS。

## Validation

- `node --test core/test/utils.test.js`: 7/7 passing
- `npm test`: 640/640 passing
- `git diff --check`: passing
- Duplicate helper residual scan: 仍有 M1 范围外残留，已留给 C17-M2 至 C17-M5 继续处理。

## Warnings

- `cloneJson` 当前优先使用 `structuredClone`，对非 JSON-like 输入的语义比旧 JSON clone 更宽；后续扩大复用范围前应明确契约。
- `core/src/index.js` 的 barrel export 面需要在 C17-M5 统一复核。

## Next

进入 C17-M2：分层配置与 integration/path 迁移。
