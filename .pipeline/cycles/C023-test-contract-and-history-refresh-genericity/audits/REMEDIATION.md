# 测试合同主裁决与整改清单

## 结论

10 个 primary 分片与 10 个 independent reviewer 分片已经按冻结 inventory 完成双重覆盖。主裁决不采用“所有 literal 都是缺陷”的规则：schema、协议字段、安全样例和由 fixture 输入派生的期望继续精确测试；参考仓库身份、固定 Cycle/命令/文件数量、live 历史、committed release artifact、源码布局和偶然文案不得充当通用产品合同。

## 覆盖

- Core inventory：179 个递归发现的 `*.test.*` / `*.spec.*` 文件。
- Scenario inventory：76 个 catalog 注册项。
- 审计：primary 10/10、reviewer 10/10，全部分片零路径遗漏。
- 特殊分类：`core/test/fixtures/c21-m4/brownfield/test/server.test.js` 是 brownfield 输入素材，保持可见但作为 fixture-owned `excluded`，不要求产品环境安装 Express。

## 主裁决

### 保留为稳定合同

- closed/versioned schema、Receipt binding、Hook event/output 约束、path traversal 与 secret 对抗样例。
- 明确的 zero-write、authority ownership、recovery、idempotence 和 boundedness 行为。
- fixture 中显式给出的项目、Cycle、时间、ID 和路径，只要期望值从输入派生且不被提升为所有项目真值。

### 改写或参数化

- History Refresh 从目标 manifest、任意 semantic Cycle、root legacy Cycle 与动态历史数量派生。
- public command parity 从 `CANONICAL_COMMANDS` 派生，不再复制 10/54/53/36 等数量。
- Bootstrap writer 的 record/dedupe/writer 数量从生成结果或 registry 派生。
- response、semantic resume/hooks、Deep Plan 与 adapter 测试保留结构/安全语义，去掉标题、完整句子、固定行数和 additive exact-key 耦合。
- C21 coverage gate 按 `covers` 行为标签验证，不固定测试文件路径。

### 排除出可执行产品 lane

- 旧 catalog quarantine 已证明包含 retired export/Skill、C3/C4/C12 live snapshot、retired sync/write API 和 source-layout oracle；基线为 329 pass / 159 fail，失败不代表当前产品回归。
- 这些条目全部保留在 `excluded` inventory，继续携带 reason 与已声明 replacement，但不由 `maintained`、`quarantined` 或 `all` 执行。
- `quarantined` 允许为空；只有仍保护当前合同、但暂未进入 release gate 的可执行诊断才能重新进入该 lane。

## 已实施

- Core catalog：67 maintained、0 quarantined、112 excluded，inventory 179。
- Scenario catalog：8 maintained、0 quarantined、68 excluded，inventory 76。
- Core discovery 改为递归识别 test/spec；JS/Python runner 均核对完整 inventory。
- maintained Core runner 对任何 skip 或 `1..0` 零测试文件 fail-closed。
- 6 个 title-pattern Scenario 改用 `tests/run-node-test-pattern.mjs`；零命中或零通过返回非零。
- Host Contract 默认 gate 不再校验 committed ZIP/checksum；保留通用 bundle tamper verifier。
- Deep Plan maintained fixture 不再读取 live C12 playbook，也不再写 legacy protected sentinel。
- History Refresh generic focused tests 为 12 个，覆盖 identity、manifest create/preserve、任意 Cycle、root legacy、幂等和冲突回滚。

## 验证设计

- 正向：maintained Core、8 个 current Scenario、History Refresh focused、catalog dry-run。
- 反事实：不存在的 test-name pattern 必须失败；maintained 全部 pattern 不匹配必须因 zero-test/skip 失败；nested fixture 必须被 inventory 发现但不得进入 product execution。
- 独立性：最终 reviewer 只读检查实际 diff、JS/Python parity 与残余高/中风险。

## 风险与边界

- 本 Cycle 未授权 release，因此 committed candidate ZIP/checksum 的显式 release freeze gate 不在默认测试内；通用 bundle integrity 仍有 maintained 覆盖。
- `excluded` 文件仍保留历史代码，不能被解释为当前可执行覆盖。未来恢复其中能力时，必须基于当前 API 重写合同并重新分类，不能直接恢复 retired export。
