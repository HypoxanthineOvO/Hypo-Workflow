# C17-M0 Audit Baseline And Root Test Entry Report

## 变更摘要

- 新增根目录 `package.json`，提供 private/minimal 的 `npm test` 入口。
- 新增 `core/src/audit-inventory/index.js`，提供 `buildAuditInventory()` / `auditInventory()`。
- 从 `core/src/index.js` 导出 audit inventory helper。
- 新增 RED/GREEN 测试 `core/test/audit-baseline.test.js`。
- 记录 C17 审计基线分类：hardcoded paths、duplicate helpers、workspace imports、YAML parsers、ledger rewrites、barrel exports。

## 技术思路

M0 不修复后续 C17 债务，只建立可重复测试入口和基线计数。audit inventory 使用有界文本扫描，只扫描 `core/src`、`scripts`、README、`docs` 和 `references`，跳过 `.git`、`node_modules`、`.pipeline`、archives、dist、coverage 和 cache 目录。

## 修改文件/模块

- `package.json`
- `core/src/audit-inventory/index.js`
- `core/src/index.js`
- `core/test/audit-baseline.test.js`
- `.pipeline/reviews/C17/M0/test-evidence.md`
- `.pipeline/reviews/C17/M0/implementation-evidence.md`
- `.pipeline/reviews/C17/M0/audit.md`

## 测试设计

- test worker 先写 RED：根目录缺 `package.json` 时 `npm test` 失败；缺少 `buildAuditInventory()` export 时 focused test 失败。
- implement worker 只写实现和实现证据，不编辑测试。
- audit worker 只读审查 diff、证据、验证命令和 worker separation。

## 验证结果

- `node --test core/test/audit-baseline.test.js`：2/2 passing
- `npm test`：633/633 passing
- `git diff --check`：passing
- audit verdict：PASS

## Audit Inventory Baseline

```json
{
  "hardcoded_paths": 31,
  "duplicate_helpers": 14,
  "workspace_imports": 9,
  "yaml_parsers": 2,
  "ledger_rewrites": 137,
  "barrel_exports": 55
}
```

## 预期结果

后续 C17 Milestones 可以用根目录 `npm test` 作为统一验证入口，并用 audit inventory baseline 对比修复前后的结构债务变化。

## 遇到的问题

- 旧 C16 执行租约已过期，C17-M0 启动时已记录 lease takeover。
- 初始 RED 明确暴露根目录缺少 `package.json` 和 audit inventory export。

## 风险/后续

- `ledger_rewrites` detector 偏宽，适合作为稳定基线信号，不是精确语义计数。
- `workspace_imports` 可能对同一 import 双重计数；后续以相同规则比较即可。
- M1 将基于此基线开始提取共享 utils。
