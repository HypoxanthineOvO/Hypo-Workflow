# C17-M3 实施证据：YAML Parser Unification With js-yaml

## 修改文件

- `package.json`
- `package-lock.json`
- `core/package.json`
- `core/src/config/index.js`
- `core/src/knowledge/index.js`
- `core/src/rules/index.js`
- `.pipeline/reviews/C17/M3/implementation-evidence.md`

未修改 `core/test/**` 测试源码。未修改 `.pipeline/state.yaml`、`.pipeline/log.yaml`、`.pipeline/PROGRESS.md`、`.pipeline/continuation.yaml`、`.pipeline/.lock`、`.pipeline/reports/**`。

## 依赖声明位置

- 根 `package.json` 显式声明 `js-yaml: ^4.1.1`，并由 `npm install js-yaml` 生成/更新根 `package-lock.json`。
- `core/package.json` 同步声明 `js-yaml: ^4.1.1`，因为运行时 import 位于 `@hypo-workflow/core` 源码。

## Parser 迁移方式

- `core/src/config/index.js` 的 public `parseYaml` / `stringifyYaml` 已改为委托 `js-yaml`。
- `parseYaml` 使用 `yaml.load(..., { schema: yaml.CORE_SCHEMA })`：
  - 支持 block scalar、null、数组、含冒号字符串等标准 YAML 语义。
  - 避免默认 schema 将 ISO 时间戳自动解析为 `Date`，保留现有运行时对时间字符串的兼容。
- `stringifyYaml` 使用 `yaml.dump`，配置：
  - `schema: yaml.CORE_SCHEMA`
  - `sortKeys: true`
  - `noRefs: true`
  - `lineWidth: 120`
- `core/src/knowledge/index.js` 的 YAML 读写点已停止使用独立 parser/dumper 行为，改为通过共享 `parseYaml` / `stringifyYaml`。
- 因 `core/src/config/index.js` 顶层当前导入 `DEFAULT_KNOWLEDGE_CONFIG`，knowledge 侧使用延迟 `import("../config/index.js")` 调用共享 wrapper，避免新增静态循环 import。

## 删除/停用的独立 parser

- 已移除 `core/src/knowledge/index.js` 内部 `parseKnowledgeYaml` / `stringifyKnowledgeYaml` 自定义实现。
- 已移除 knowledge 私有 YAML 标量解析/格式化辅助逻辑的使用。
- `normalizeKnowledgeRecord` 的 tag 归一化不再对冒号做 slugify 替换，避免把 YAML 正确解析出的 `parser:unification` 误改为 `parser-unification`。

## 验证结果

- `node --test core/test/yaml-parser-unification.test.js`
  - 结果：通过，5/5 passing。
- `node --test core/test/global-config-registry.test.js core/test/knowledge-ledger.test.js core/test/knowledge-opencode-gate.test.js`
  - 结果：通过，17/17 passing。
- `node --test core/test/yaml-parser-unification.test.js core/test/global-config-registry.test.js core/test/knowledge-ledger.test.js core/test/knowledge-opencode-gate.test.js core/test/progressive-discover.test.js`
  - 结果：通过，29/29 passing。
- `git diff --check`
  - 结果：通过，无 whitespace error。
- `npm test`
  - 初次结果：649/650 passing，唯一失败为 `core/test/progressive-discover.test.js` 的 rules summary 兼容断言。
  - 修复：`core/src/rules/index.js` 已兼容 builtin rule 的 `id`/`name` 字段，并在 rules config 读取时对历史未加引号的 `@scope/pack` extends 项做 fallback quote 后重试，保留 `js-yaml` 为主解析路径。
  - 最终结果：通过，650/650 passing。

## 范围声明

- 未扩大到 M4 workspace 拆分。
- 未扩大到 M5 ledger 重构。
- 未修改测试源码或生命周期状态文件。
