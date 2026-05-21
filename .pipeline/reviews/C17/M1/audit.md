# C17-M1 Audit

verdict: PASS

reviewed_refs:
- `.pipeline/prompts/01-shared-utils-layer-extraction.md`
- `.pipeline/reviews/C17/M1/test-evidence.md`
- `.pipeline/reviews/C17/M1/implementation-evidence.md`
- `core/src/utils/index.js`
- `core/src/evidence/index.js`
- `core/src/reviews/index.js`
- `core/src/storage-sync/index.js`
- `core/src/domains/index.js`
- `core/src/project-events/index.js`
- `core/src/maintenance/project-linkage-e2e.js`
- `core/src/index.js`
- `core/test/utils.test.js`
- `.pipeline/state.yaml`
- `.pipeline/log.yaml`
- `.pipeline/PROGRESS.md`
- `.pipeline/continuation.yaml`

checks:
- 工具语义：`isPlainObject`、`cloneJson`/`deepClone`、`compactTimestamp`、`stableStringify`、`hasText`、`safeId` 均位于 `core/src/utils/index.js`，只依赖标准运行时，满足 `core/test/utils.test.js` 的 7 项契约。
- 迁移正确性：已迁移模块从 `../utils/index.js` 引入共享 helper；`utils` 自身无 domain/config/workspace 依赖，未发现 utils-to-domain 循环 import 风险。
- 行为等价性：`evidence`、`reviews`、`storage-sync`、`domains`、`project-events`、`project-linkage-e2e` 的迁移保持原调用形态，完整 `npm test` 通过，未观察到迁移导致的行为回归。
- Worker separation：测试证据先记录 RED，原因是缺少 `core/src/utils/index.js`；实现证据随后记录 GREEN。实现证据声明未编辑 `core/test/utils.test.js`，时间线与 RED/GREEN 证据一致。
- 生命周期一致性：实现阶段曾触及 lifecycle 文件这一点不理想，但主流程后续已在 `.pipeline/state.yaml`、`.pipeline/log.yaml`、`.pipeline/PROGRESS.md` 中归一化 C17-M1 状态；最终证据没有冲突，因此不作为 blocker。
- C17-M1 范围：重复 helper 扫描仍有 `opencode-hooks`、`knowledge`、`maintenance`、`workspace`、`sync`、`config`、`rules` 等模块残留，但这些不在本次低风险迁移切片内，或属于后续 C17-M2 至 C17-M5 的计划范围；对 M1 可接受。

findings:
- none

warnings:
- `cloneJson` 当前优先使用 `structuredClone`，对 Date、function、BigInt 等非 JSON-like 输入会与旧的 `JSON.parse(JSON.stringify(...))` 语义不同。M1 测试契约覆盖的是 JSON-like 深拷贝，且现有迁移调用未暴露回归；建议后续若扩大复用范围，为非 JSON-like 输入明确契约。
- `core/src/index.js` 的当前 diff 中包含 `utils` 以外的 barrel export 变化；这些看起来来自相邻 C17/C16 工作而非本次 utils 迁移本身。当前测试通过，不阻塞 M1，但后续 barrel cleanup 阶段应统一复核 root export 面。

validation:
- `node --test core/test/utils.test.js`: 7/7 passing
- `npm test`: 640/640 passing
- `git diff --check`: passing
- `rg 'function isPlainObject|function compactTimestamp|function stableStringify|async function writeYaml' core/src`: 仍有残留，但符合 M1 范围外或后续 milestone 延后处理预期

recommendation:
- C17-M1 可以 PASS。主流程可进入完成报告与 C17-M2；后续 milestone 继续按计划迁移剩余重复 helper，并在扩大 `cloneJson` 调用面前补充非 JSON-like 输入的契约判断。
