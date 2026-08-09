# C023 最终独立 Diff 审计

## Findings

**无未解决的 High / Medium finding。**

初审发现的三项问题已在最终工作树中修复并复核：

1. `core/test/c21-m8-surface-cleanup.test.js:28` 现在由 `CANONICAL_COMMANDS` 派生 `PUBLIC_ROUTES`；固定“十 routes”的 `docs-governance.test.js` 已归入 excluded，不进入 maintained/all。
2. `core/test/bootstrap-activation.test.js:120-124` 现在按 `activated.records` 派生 records/active-key 数量；`core/test/bootstrap-migration.test.js:187-190` 按 `active_by_dedupe_key` 派生 active 数量，不再冻结 `7/6`。
3. JS/Python runner 的 CLI 都只允许 `maintained|quarantined|all`，均以 code `2` 拒绝 `excluded`；Python discovery 已改为与 JS 相同的 `\.(test|spec)\.[^.]+$` 结尾规则。`c21-m8-regression-contract` 新增双 runner 反事实测试。

受影响的 C21 M8、surface、bootstrap activation/migration focused 集合为 `73/73` 通过；最终完整 maintained gate 也重新执行通过。

## 覆盖

只读审计了以下当前工作树变更和关联面：

- History Refresh：`core/src/history-refresh/index.js`、`scripts/history-refresh-preview.mjs`、`core/test/history-refresh-preview.test.js`。
- Catalog/runner：`tests/run_core_tests.mjs`、`tests/run_regression.py`、`tests/run-node-test-pattern.mjs`、`tests/regression-catalog.json`。
- Scenario：C21 `s70`、`s71`、`s72`、`s74`、`s75`、`s76` 的 pattern runner 改动，并通过 maintained runner覆盖 `s73`、`s77`。
- 本轮修改的 maintained tests：C21 M8 regression/surface、C23 M5 status、command routing、Deep Plan architecture/real scenario、History Refresh、Host Contract、single writer、response、semantic prompts/runtime。
- 对全部 maintained 路径补做了 live repository、release artifact、固定数量、固定命令集合和 prose coupling 的静态扫描。

## 核验结果

### History Refresh 通用性

- 未在生产实现、脚本或 runner 中发现 `C022`、`C22`、固定“20 个 Cycle”或固定项目名。
- project identity 顺序为有效 manifest `project_id` → package name → workspace basename，并经过安全归一化。
- 测试覆盖非 Hypo-Workflow 项目 `sample-product`、manifest identity 优先、根部 legacy `C7`、既有 active/closed semantic Cycle、动态 `${mapping.cycles.length}` 报告、显式 `approved:true`、stale preview、冲突前零写、legacy byte preservation 与幂等激活。
- Focused History Refresh suite 全部通过。

### Inventory 与 excluded

- JS Core dry-run：`maintained=67`、`quarantined=0`、`excluded=112`、`inventoried=179`。
- Python Scenario dry-run：`maintained=8`、`quarantined=0`、`excluded=68`、`inventoried=76`。
- `all` 当前只包含 maintained + quarantined：Core `67`，Scenario `8`；nested brownfield fixture test 被 inventoried 且 excluded，不进入 maintained/all。
- catalog exact inventory、overlap、unclassified、missing reason、missing replacement 反例均 fail closed。

### Skip / zero-match

- 最终完整 maintained Core：`67` 个文件，TAP `708` tests，`708 pass`、`0 fail`、`0 skipped`。
- maintained runner 的全量不匹配 pattern 反例被 `skipped > 0` gate 拒绝。
- `run-node-test-pattern.mjs` 对真实匹配返回成功；零命中即使 Node 自身返回 code 0 且输出 `1..0`，helper 仍返回失败。
- 六个改造后的 C21 Scenario runner 均实际命中并通过；完整 Scenario maintained `8/8` 通过。

### Authority / retired surface

- `host-contract-v1`、`semantic-workflow-prompts` 和 `c21-m8-surface-cleanup` 均从 `CANONICAL_COMMANDS` 派生命令集合；未在 maintained gate 中发现固定公开命令副本。
- 产品代码 diff 仅修改 History Refresh 文案/通用化，没有恢复 retired CLI、legacy writer、project-events、TUI 或旧 command API。
- `c21-m8-surface-cleanup` 仍验证 retired/deferred/internal routes 不可发现、零写，sync/generator 不得复活删除面。

### Live/release coupling

- 未发现 maintained test 直接读取当前仓库 `.pipeline/log.yaml` 作为 validator 输入；扫描命中的 `.pipeline/log.yaml` 均为临时 fixture、legacy freeze 或“不得写入”安全合同。
- `host-contract-v1` 已删除对工作树 `dist` ZIP 和 release-manifest hash 的默认 maintained 依赖，保留封闭 portable fixture 的 tamper 验证。
- 固定 v15 release prose 的 `docs-governance.test.js` 属于 excluded，不进入 maintained/all。
- `git diff --check` 对审计范围通过。

## 残余风险

1. 移除工作树 release ZIP/hash 断言后，真实发布包的完整性需要由独立 release-build CI 在构建后验证；默认 maintained source gate 不应读取陈旧产物，但发布流程必须保留 artifact-level gate。
2. `excluded` 项仍保留在 catalog 中作为 inventory/history；两套 runner 当前均拒绝显式执行 excluded，后续修改 CLI set 时必须保留这项反事实测试。
3. 本审计验证当前 frozen inventory 与现有扩展规则；未来若要支持 `.test.d.ts`、嵌套复合扩展或其他语言测试，应先统一修改两套 discovery，而不是单边扩展。

## 审计结论

History Refresh 通用化、179/76 inventory、excluded 从 maintained/all 隔离且不可显式执行、skip/zero-match fail closed、command authority 派生、bootstrap 数量派生，以及“不恢复 retired API”均验证通过。最终未发现未解决的 High/Medium finding；完整 maintained Core `708/708` 与 maintained Scenario `8/8` 通过。
