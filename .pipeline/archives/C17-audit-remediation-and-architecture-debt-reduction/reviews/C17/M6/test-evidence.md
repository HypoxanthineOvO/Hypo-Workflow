# C17-M6 测试证据：最终回归与扫描

采集时间：2026-05-21（Asia/Shanghai）

## Commands / Results

| 命令 | 结果 | 摘要 |
| --- | --- | --- |
| `npm test` | PASS | `node --test core/test/*.test.js` 通过；`tests 661`、`pass 661`、`fail 0`、`duration_ms 3448.590384`。 |
| `git diff --check` | PASS | exit 0，无输出。 |
| `rg -n '/home/heyx' core/src scripts` | PASS | exit 1，无输出；记录为 no matches/pass。 |
| `rg -n 'workspace/index\|from .*/workspace' core/src core/test docs README.md README.en.md` | PASS with classified residual | 仅 1 条：`core/src/index.js:462: } from "./workspace-authority/index.js";`。这是 `workspace-authority` 新模块导出，不是旧 `workspace/index`，按误报分类。 |
| `rg -n 'function parseYaml\|function parseKnowledgeYaml\|export \* from' core/src` | PASS with classified residual | 仅 1 条：`core/src/config/index.js:1640: export function parseYaml(source) {`。这是统一 `js-yaml` 入口；无 `parseKnowledgeYaml`；无 `export * from`。 |
| `rg -n 'ledger.yaml\|export \* from' core/src core/test docs README.md README.en.md` | PASS with classified residual | 26 条命中，均分类为 analysis lane、migration/self-test、fixture、安全测试、audit scan 或普通关键词；无 root broad barrel。 |
| `node --input-type=module -e "import { buildAuditInventory } from './core/src/index.js'; ..."` | PASS | 通过现有 `buildAuditInventory({ cwd: process.cwd() })` 采集当前计数。 |

## Before / After Count

M0 baseline：`hardcoded_paths=31`、`duplicate_helpers=14`、`workspace_imports=9`、`yaml_parsers=2`、`ledger_rewrites=137`、`barrel_exports=55`。

当前 audit inventory 计数：

| 类别 | M0 baseline | 当前 | 变化 | 结论 |
| --- | ---: | ---: | ---: | --- |
| `hardcoded_paths` | 31 | 0 | -31 | PASS，目标扫描也无 `/home/heyx`。 |
| `duplicate_helpers` | 14 | 15 | +1 | 仍有宽松 detector 命中；本轮未被列为专项 `rg` pass/fail gate，需要后续审计判断是否接受或继续减债。 |
| `workspace_imports` | 9 | 0 | -9 | PASS，inventory 清零；专项扫描仅剩 `workspace-authority` 误报。 |
| `yaml_parsers` | 2 | 1 | -1 | PASS with classification；剩余为统一 `parseYaml` 公共入口，不是 split parser。 |
| `ledger_rewrites` | 137 | 129 | -8 | PASS with classification for requested scan；inventory 仍有宽松 detector 计数，包含 `writeFile(`、`stringifyYaml` 和 analysis ledger 关键词。 |
| `barrel_exports` | 55 | 0 | -55 | PASS，inventory 清零；专项扫描无 `export * from`。 |

## 剩余命中分类

### Workspace import / index

- `core/src/index.js:462`：`from "./workspace-authority/index.js"`。
- 分类：新 `workspace-authority` 模块导出命中 `from .*/workspace` 的宽松正则；不是旧 `workspace/index`，不是旧 workspace compatibility shim。
- 结论：PASS。

### YAML parser / broad barrel

- `core/src/config/index.js:1640`：`export function parseYaml(source) {`。
- 分类：统一 `js-yaml` 入口，供 config/knowledge 等消费者复用。
- 未命中：`function parseKnowledgeYaml`。
- 未命中：`export * from`。
- 结论：PASS，生产代码不再存在 split YAML parser 或 broad root barrel。

### ledger.yaml / export *

专项扫描命中 26 条：

- analysis lane：`core/src/analysis/index.js:97`、`:102`、`:266`、`:267`；`core/test/analysis-runtime.test.js:60`、`:109`、`:115`、`:127`；`core/test/analysis-state-ledger.test.js:34`、`:35`、`:37`、`:68`；`core/test/claude-status-surface.test.js:27`、`:111`；`core/test/opencode-status.test.js:165`、`:183`。
- fixture：`core/test/analysis-runtime.test.js:73`、`:95`；`core/test/analysis-state-ledger.test.js:13`、`:27`、`:61` 引用 `core/test/fixtures/analysis/M06-analysis-ledger.yaml`。
- migration/self-test：`core/test/ledger-jsonl-migration.test.js:56`、`:137`、`:178`、`:190`、`:249`。
- 安全测试：`core/test/maintenance-backup-policy.test.js:99`，`attacker-controlled-ledger.yaml`。
- 普通关键词：`core/test/knowledge-ledger.test.js:116`，fixture evidence ref 字符串；`core/src/batch-plan/index.js:632`，规划分类关键词 regex 中包含 `ledger|yaml|schema`。
- audit scan：`core/src/audit-inventory/index.js:19`，inventory detector 自身包含 `ledger\.yaml` 和 `export * from` 正则。
- `export * from`：无真实命中；唯一相关文本来自 audit scan detector 正则，不是生产 barrel。

结论：PASS with classified residual。未发现长期 `ledger.yaml` 写入 authority 或 broad root barrel 的未分类残留。

## Audit Inventory 采集方式

使用现有 API：

```sh
node --input-type=module -e "import { buildAuditInventory } from './core/src/index.js'; const inv=await buildAuditInventory({cwd: process.cwd()}); const summary=Object.fromEntries(Object.entries(inv.categories).map(([k,v])=>[k,v.count])); console.log(JSON.stringify({generated_at: inv.generated_at, summary}, null, 2));"
```

输出摘要：

```json
{
  "hardcoded_paths": 0,
  "duplicate_helpers": 15,
  "workspace_imports": 0,
  "yaml_parsers": 1,
  "ledger_rewrites": 129,
  "barrel_exports": 0
}
```

## Pass / Fail 结论

总体结论：PASS for requested final regression and targeted stale scans。

未发现 blocker。保留的注意项是 audit inventory 的宽松 detector 仍报告 `duplicate_helpers=15` 与 `ledger_rewrites=129`，其中 `ledger_rewrites` 包含大量普通 `writeFile(` / `stringifyYaml` 以及 analysis ledger 关键词，不能直接等价为 release blocker；建议由 M6 audit worker 按分类结果决定是否接受为已解释残留。
