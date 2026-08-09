---
kind: final-report
cycle: C023-test-contract-and-history-refresh-genericity
status: accepted
updated: 2026-08-09T13:18:36+08:00
---

# 测试合同治理与 History Refresh 通用性修复验收报告

## 结论

C023 的实现、全量双重审计、整改、完整验证与最终独立 diff 审计均已完成。History Refresh 不再依赖 Hypo-Workflow、C022、固定 Cycle 数量或 S2 文案；当前可执行测试 gate 不再允许 skip、零匹配假绿、live repository snapshot、committed release artifact 或 retired API 噪声冒充产品合同。最终独立审计无未解决 High/Medium finding。

## 改动摘要

- History Refresh 从目标 manifest/package/workspace identity、任意 semantic Cycle、root legacy Cycle 和实际历史数量派生输出。
- Preview CLI 支持显式 `--output`；缺失 manifest 仅在明确批准后创建，既有等价 manifest 保持字节不变。
- Core/Scenario catalog 增加 `excluded` inventory 分类；`all` 只执行 maintained + quarantined，两个 runner 都拒绝显式执行 excluded。
- Core discovery 递归识别 179 个 test/spec；brownfield Express test 作为 fixture-owned evidence 保持可见但不进入产品 gate。
- maintained Core 对 skip 和 TAP `1..0` fail-closed；6 个 title-pattern Scenario 通过统一 helper 拒绝零命中。
- public command、Bootstrap record/dedupe/writer 数量从 authority 或实际输入派生。
- Host Contract 默认 source gate 移除 committed ZIP/checksum 依赖，保留封闭 fixture 的 bundle integrity/tamper 行为测试。
- Deep Plan、response、semantic resume/hooks 与 adapter 测试移除 live C12、legacy protected sentinel、固定标题/完整句子/行数和 additive exact-key 耦合。

## 技术方案

### History Refresh

身份解析优先级为有效 manifest `project_id`、package name、workspace basename。预览先构造完整 mapping 并绑定 source fingerprint；激活必须显式 `approved:true`，并在任何目标冲突或 stale preview 时零写失败。Manifest 仍保持最后写入，以保留原子激活边界。

### 测试治理

inventory、execution lane 与历史证据分离：

- `maintained`：当前 release gate，必须全执行、零 skip。
- `quarantined`：仍保护当前合同但暂不进入 release gate的可执行诊断；当前为空。
- `excluded`：fixture-owned 或 retired/history evidence，只参与 inventory 与审计，不可执行。

JS/Python runner 使用一致的 test/spec 文件名结尾规则和 classification policy。Catalog validator继续 fail-closed 检查 unclassified、overlap、reason 与 replacement 引用。

## 主要文件

- `core/src/history-refresh/index.js`
- `scripts/history-refresh-preview.mjs`
- `core/test/history-refresh-preview.test.js`
- `tests/run_core_tests.mjs`
- `tests/run_regression.py`
- `tests/run-node-test-pattern.mjs`
- `tests/regression-catalog.json`
- `core/test/c21-m8-regression-contract.test.js`
- `core/test/c21-m8-surface-cleanup.test.js`
- History/command/Bootstrap/Host/Deep Plan/response/semantic maintained focused tests
- `tests/scenarios/c21/s70`、`s71`、`s72`、`s74`、`s75`、`s76` runner

## 测试设计与结果

- Primary audit：10/10 分片。
- Independent reviewer：10/10 分片。
- 最终独立 diff audit：无未解决 High/Medium finding。
- Core inventory：179 = 67 maintained + 0 quarantined + 112 excluded。
- Scenario inventory：76 = 8 maintained + 0 quarantined + 68 excluded。
- Maintained Core：708/708 pass，0 fail，0 skipped。
- Maintained Scenario：8/8 pass。
- History Refresh focused：12/12 pass。
- 最终受影响 focused：73/73 pass。
- Quarantine invocation：0 selected，正常成功，不会递归执行 excluded。
- JS/Python catalog dry-run、runner syntax 与 `git diff --check`：通过。

反事实验证包括：不存在的 Scenario pattern 必须失败；maintained 全量 pattern 不匹配必须因 zero-test/skip 失败；两个 runner 的 `--set excluded` 都必须拒绝；nested fixture test 必须被 inventory 发现但不得执行。

## 预期用户结果

- 在不同项目名、不同 Cycle 编号、不同历史数量和已有 semantic Cycle 的工作区运行 History Refresh，不再生成 Hypo-Workflow/C022 专属结果。
- 测试标题被合法重命名、公开命令新增、fixture candidate 增加、文案润色或内部布局调整时，不再产生无关级联失败。
- 关键 API 缺失、测试零执行、catalog 漏项、History preview stale、激活冲突或安全合同破坏时会明确失败。
- retired 测试仍可审计和追溯，但不会污染 current release gate。

## 遇到的问题

- Node v22 在 `--test-name-pattern` 零匹配时会出现内层 `1..0`，但文件 wrapper 仍返回 pass；新的 helper 与 maintained runner显式检测空 TAP plan。
- 原 catalog exact inventory 只与 shallow discovery 自洽，漏掉 nested fixture；现改为递归 inventory + explicit excluded。
- 原 quarantine 运行结果为 329 pass / 159 fail，失败主要来自 retired export/Skill、旧 live snapshot、retired sync/write 与 source-layout oracle；本轮没有恢复这些旧 API，而是保留为 excluded evidence。
- 最终 reviewer 初审发现 PUBLIC_ROUTES、Bootstrap 7/6 与 Python excluded parity 残留；均已修复并复核。

## 风险与后续

- 真实 release ZIP/checksum 必须由构建后的独立 release gate 验证；默认 source test 不应读取可能陈旧的 committed artifact。本 Cycle 未授权 release，因此未生成或发布新包。
- excluded 历史代码仍存在，但不能被解释为当前覆盖。未来恢复其中能力时，应基于当前 API 重写合同并重新分类，不能恢复 retired export 来迎合旧测试。
- 未来支持 `.test.d.ts` 或其他复合扩展时，必须同步更新两套 discovery 及 parity tests。

## 审阅建议

接受时确认三点：History Refresh 通用化边界符合预期；excluded 表示“可审计但不可执行”的历史/fixture 证据；release artifact 验证继续由显式 release flow 所有。若拒绝，请指出具体合同、classification 或验证结果需要调整。
