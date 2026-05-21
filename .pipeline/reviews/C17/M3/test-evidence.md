# C17-M3 测试证据：YAML Parser Unification With js-yaml

## Worker 边界

- 角色：test worker。
- 未修改生产代码、CLI、schema、docs、package.json、package-lock、state/log/progress/continuation 或既有测试文件。
- 新增测试文件：`core/test/yaml-parser-unification.test.js`。
- 新增证据文件：`.pipeline/reviews/C17/M3/test-evidence.md`。
- 未新增 fixture；复杂 YAML 直接内联在新测试中。

## 本地调查结论

- `core/src/config/index.js` 当前导出 `parseYaml` / `stringifyYaml`，但实现是手写 partial parser/dumper。
- `core/src/knowledge/index.js` 当前内部使用独立的 `parseKnowledgeYaml` / `stringifyKnowledgeYaml`，`loadKnowledgeRecords()` 读取记录时没有复用 config 的 public parser。
- `core/src/index.js` 已通过 re-export 暴露 config 的 `parseYaml` / `stringifyYaml`。
- 根 `package.json` 与 `core/package.json` 当前都没有显式声明 `js-yaml`。

## RED 覆盖点

新增 `core/test/yaml-parser-unification.test.js` 覆盖：

1. `parseYaml` 解析 js-yaml 标准复杂 YAML：literal/folded multiline、含冒号字符串、数组、嵌套对象、null、quoted strings。
2. `stringifyYaml` 输出稳定，且能经 `parseYaml` round-trip 回原对象。
3. knowledge public API `loadKnowledgeRecords()` 与 config public parser 对同一复杂 YAML 记录保持一致语义，重点覆盖冒号字符串、数组、null、多行字符串。
4. 通过 public API 暴露当前 knowledge 自定义 parser 的限制：复杂记录经 `loadKnowledgeRecords()` 后出现字段丢失/语义差异。
5. package manifest 必须显式声明 `js-yaml`。

## 验证命令与结果

### 命令 1

```bash
node --test core/test/yaml-parser-unification.test.js
```

结果：失败，符合 RED 预期。

关键失败原因：

- `parseYaml supports js-yaml standard complex YAML constructs`
  - `literal: |` 被解析成字符串 `"|"`，未解析 block scalar 内容。
- `stringifyYaml round-trips through parseYaml with deterministic output`
  - 含冒号字符串数组项被错误解析成对象，例如 `"alpha: one"` 变成类似 `{ "\"alpha": "one\"" }`。
  - 多行字符串 round-trip 后保留了转义文本而不是实际换行语义。
- `config and knowledge YAML loaders share js-yaml semantics for complex records`
  - knowledge public loader 未保留 `details.optional: null`，实际为 `undefined`，暴露自定义 `parseKnowledgeYaml` 对复杂 YAML 的限制。
- `package manifests explicitly declare js-yaml`
  - 根或 core manifest 均未声明 `js-yaml`。

### 命令 2

```bash
node --test core/test/global-config-registry.test.js core/test/knowledge-ledger.test.js core/test/knowledge-opencode-gate.test.js
```

结果：通过。

摘要：

- 17 个测试全部通过。
- 说明新增 RED 测试是针对 C17-M3 YAML parser 统一行为的增量失败，没有破坏现有指定回归测试。

## 预期实现接口

- 从 `core/src/index.js` 继续公开导出 `parseYaml` / `stringifyYaml`。
- `parseYaml(source)` 应委托 `js-yaml` 解析，并支持标准 YAML block scalar、quoted colon strings、数组、嵌套对象和 null。
- `stringifyYaml(value)` 应委托 `js-yaml` dump，并使用稳定输出策略；同一输入重复 stringify 输出应一致，且可被 `parseYaml` round-trip。
- knowledge 读取路径应复用共享 `parseYaml`，移除或停止使用独立 `parseKnowledgeYaml` 行为差异。
- package manifest 应显式声明 `js-yaml`，具体位置由 implement worker 根据包所有权决定。

## 未运行项

- 未运行 `npm test`。当前新增测试已 RED，完整套件在实现前预计会因同一新增测试失败。
