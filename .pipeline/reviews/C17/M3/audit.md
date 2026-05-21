# C17-M3 Audit
verdict: PASS

reviewed_refs:
- `.pipeline/prompts/03-yaml-parser-unification-with-js-yaml.md`
- `.pipeline/reviews/C17/M3/test-evidence.md`
- `.pipeline/reviews/C17/M3/implementation-evidence.md`
- `package.json`
- `package-lock.json`
- `core/package.json`
- `core/src/config/index.js`
- `core/src/knowledge/index.js`
- `core/src/rules/index.js`
- `core/test/yaml-parser-unification.test.js`
- `.pipeline/state.yaml`
- `.pipeline/log.yaml`
- `.pipeline/PROGRESS.md`
- `.pipeline/continuation.yaml`

checks:
- 依赖范围：`package.json` 与 `core/package.json` 均显式声明 `js-yaml: ^4.1.1`；`package-lock.json` 仅引入 `js-yaml@4.1.1` 与其 `argparse@2.0.1` 依赖，锁文件范围最小且一致。
- Parser 正确性：`core/src/config/index.js` 的 public `parseYaml` / `stringifyYaml` 已委托 `js-yaml`；dump 使用 `sortKeys: true`、`noRefs: true`、`lineWidth: 120`，测试覆盖 block scalars、冒号字符串、数组、嵌套对象、null 与稳定 round-trip。
- 时间戳回归：实现使用 `yaml.CORE_SCHEMA`；本地抽样确认 `2026-05-21` 解析为字符串而非 `Date`，未发现 timestamp surprise regression。
- Knowledge migration：`loadKnowledgeRecords()`、`appendKnowledgeRecord()`、`rebuildKnowledgeIndexes()` 通过共享 `parseYaml` / `stringifyYaml` 路径读写；`parseKnowledgeYaml` / `stringifyKnowledgeYaml` 已从 `core/src/knowledge/index.js` 移除。
- Rules 兼容修复：`getRuleId(rule)` 的 `name || id` fallback 仅用于 rules summary/severity key 解析；历史未加引号 `@scope/pack` fallback 仅包在 `parseRulesYaml()` 内，并且先尝试标准 `parseYaml()`，未恢复独立 YAML parser。
- Worker separation：生命周期和证据显示 Avicenna 只新增 RED 测试与测试证据，Banach 实施生产/manifest 变更，main 仅集成 rules 兼容修复与 GREEN 证据；未看到 implement/main 修改 `core/test/yaml-parser-unification.test.js` 的证据。
- 范围控制：M3 相关改动未触及 M4 workspace 拆分或 M5 ledger 策略；`core/src/config/index.js` 中较大 diff 来自 C17-M2 分层配置上下文，不作为本 M3 parser unification 的阻断项。

findings:
- none

warnings:
- 当前工作树存在大量 C17 前序/后续未提交改动；本审计按用户指定的 C17-M3 输入和关键文件收窄判断，范围外脏改动需在后续 milestone/最终 release audit 中继续隔离复核。

validation:
- `node --test core/test/yaml-parser-unification.test.js core/test/global-config-registry.test.js core/test/knowledge-ledger.test.js core/test/knowledge-opencode-gate.test.js core/test/progressive-discover.test.js`: 29/29 passing。
- `npm test`: 650/650 passing。
- `git diff --check -- package.json package-lock.json core/package.json core/src/config/index.js core/src/knowledge/index.js core/src/rules/index.js core/test/yaml-parser-unification.test.js`: passing。
- `node --input-type=module` timestamp probe: `parseYaml("date: 2026-05-21\n").date` 为 string。

recommendation:
- C17-M3 可以 PASS；建议主线程生成 M3 completion report，并在记录 audit worker closure 后进入 C17-M4。
