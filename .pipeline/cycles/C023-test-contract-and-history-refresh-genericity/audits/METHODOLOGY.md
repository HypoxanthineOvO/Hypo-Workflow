# 测试合同审计方法

## Inventory

- 可执行测试：`core/test/` 下全部 `*.test.*` 与 `*.spec.*` 文件，包括未进入 regression catalog 的 fixture 测试。
- Scenario：`tests/regression-catalog.json` 中 `suites.scenarios.maintained` 与 `quarantined` 的全部条目。
- 支撑面：被分片测试直接读取的 fixture、runner、catalog 条目和生成物；共享 runner/catalog 由 shard 0、1 重点审计。
- 分片：对规范化路径排序，zero-based index `% 10`。Primary 与 reviewer 使用同一规则。

## 每个测试项必须回答

1. **保护的合同：** 测试真正应保护的用户可见行为、协议、安全或兼容性是什么？
2. **硬编码：** literal 是稳定产品合同、fixture 输入，还是参考仓库/实现细节/偶然输出？
3. **有效修改敏感性：** 保持合同成立的功能演进是否会让测试失败？为什么？
4. **失败合理性：** 测试失败是否准确表示合同破坏，还是无关级联、快照漂移或内部重构？
5. **处置：** `keep`、`parameterize`、`split`、`rewrite`、`remove`、`reclassify` 或 `probe`。

## 判定边界

- 允许：schema version、协议字段、安全边界、公开命令、明确兼容格式等稳定合同常量。
- 不允许：参考仓库名、特定 Cycle 编号、固定数据数量、机器路径、时间、哈希、内部函数布局、偶然文案或与输入无关的固定输出。
- Fixture 可以包含具体样例，但期望值必须从 fixture 输入或明确合同派生；不得把样例值提升为所有项目的真值。
- 合法功能演进可以要求更新测试，但更新原因必须是合同明确改变；内部重构或新增兼容能力不应引发无关的大面积失败。

## 报告格式

每个报告先列覆盖文件和 Scenario，再按测试 case 给出表格：

| Item | Contract | Hardcode | Valid-change sensitivity | Failure appropriate | Verdict | Evidence |
| --- | --- | --- | --- | --- | --- | --- |

报告末尾列出高/中/低 findings、需要反事实 probe 的项目、catalog/fixture 问题和零遗漏自检。

## 交叉复审

Reviewer 必须重新阅读相同分片，不以 primary 结论为事实。逐项给出 `agree`、`revise` 或 `missing`，并对所有 `parameterize/split/rewrite/remove/reclassify/probe` 建议核验影响面。
