# Independent Test Contract Review - Shard 08

## 结论

复审重新枚举了 `% 10 == 8` 的 18 个 Core 测试文件（122 个顶层 case）和 7 个 Scenario。覆盖数量与 primary 一致，没有漏掉 case 或 Scenario；但 primary 有 12 组需要修订的判断，主要问题是没有把当前 catalog 的文件级分类纳入裁决，因而把已经 quarantined 的 alpha.1 文档测试说成 maintained gate，也对已经 quarantined 的退休 CLI 测试继续建议 `reclassify`。

最重要的独立结论如下：

1. `c21-m8-regression-contract.test.js` 确实把固定 `C21-M1..M8`、31 个 Core 路径和 `c21/s70..s77` Scenario 路径提升成 release authority；行为等价的重命名或替换会错误失败，而原路径上的弱测试仍可通过。
2. alpha.1 文档断言确实是历史硬编码，但 `docs-governance.test.js` 当前已经是 `quarantined`，不是默认 maintained gate。它会污染 `test:all`，不会阻塞默认 `npm test`。修复应删除/改写历史固定值，而不是再次 reclassify。
3. `init-automation-contract.test.js` 和 `claude-settings-sync.test.js` 中确有退休 CLI 调用，但两文件当前均已 quarantined；没有发现 maintained 测试真正执行退休 CLI。唯一 maintained 命中是 catalog scanner 自身的字符串与 runner 调用，不是退休 CLI 执行。真正问题是 scanner 只做文本匹配，且文件级 quarantine 连带丢失同文件内有价值的非 CLI 测试。
4. completion、P2、lifecycle、docs 的 prose regex 既可能在同一合并文本中“凑齐关键词”而假通过，也会因无害改写、翻译或文件移动而失败。它们只能作为次级文档 smoke，不能替代结构化状态转换、渲染输出或真实交互测试。
5. case 级 `reclassify` 不是可执行处置，因为 catalog 按文件分类。混合文件必须先 `split`：把稳定行为合同留在 maintained，把退休 CLI、历史版本、实现依赖或能力现状断言删除或单独 quarantine。

`agree` 表示接受 primary 对合同、硬编码、有效修改敏感性、失败合理性和 verdict 的判断；`revise` 的替代裁决见后文。没有发现 primary 遗漏的顶层 case，`missing` 仅用于其遗漏的跨 case/catalog finding。

## 完整 Core 覆盖与逐项裁决

### `audit-baseline.test.js` (2/2)

| Item | Review | 说明 |
| --- | --- | --- |
| repository root exposes npm test | agree | runner 名称/`private:true` 不是“可运行根测试入口”的充分行为合同，改写为实际 dry-run。 |
| C17 audit inventory exposes categories | agree | 固定 C17 债务分类和别名是历史实现清单，应由当前 schema/输入派生。 |

### `c21-m8-regression-contract.test.js` (8/8)

| Item | Review | 说明 |
| --- | --- | --- |
| catalog exactly partitions inventory | revise | 合同正确，但当前 discovery 只扫描 `core/test` 顶层 `*.test.js`，比 METHODOLOGY 的 `*.test.*`/`*.spec.*` 窄；verdict 从 `keep` 改为 `rewrite`，共享同一 inventory discovery。 |
| retired CLI dependents quarantined | agree | 文本 scanner 有注释假阳性、wrapper/动态路径假阴性，需要 probe 后改为结构化依赖声明或真实执行边界。 |
| quarantine reason and replacement | agree | 路径可解析合同有效；另需补充 replacement 的行为覆盖等价性，不能只检查存在。 |
| maintained Core anchors C21 M1-M8 | agree | 固定 8 个历史 milestone 与 31 个路径是仓库拓扑硬编码，应改为稳定 capability/behavior ID。 |
| maintained Scenario anchors thin C21 lane | agree | 固定 `c21/s70..s77` 是路径身份，不是行为合同。 |
| runners fail closed on invalid catalogs | agree | 负例由 fixture 派生且失败范围合理。 |
| npm maintained/all/quarantine routing | agree | 选择集/零写入有价值；runner 文件名和可见计数文案应拆出。 |
| Scenario maintained/all/quarantine routing | agree | 选择集/零写入有价值；显示格式断言应拆出。 |

### `c23-m7-worker-routing.test.js` (21/21)

| Item | Review | 说明 |
| --- | --- | --- |
| routing API exports | agree | 公开 API 合同。 |
| strict routing schema | agree | v1 协议常量可测；`$defs` 数量需与行为/版本断言拆开。 |
| legacy seven-field classifications | agree | fixture 输入与兼容 route/reason 合同。 |
| mechanical operations override size | agree | 版本化策略映射。 |
| higher priority beats mechanical | agree | 安全/冲突优先级合同。 |
| full precedence ordering | agree | v1 确定性顺序。 |
| approved semantic signal mapping | agree | 版本化信号映射。 |
| two distinct failures escalate | agree | v1 阈值合同。 |
| assessment bounded/secret-safe | agree | 安全边界与协议上限。 |
| identifiers 128-byte UTF-8 boundary | agree | DoS/泄漏边界。 |
| attempts 256 / route IDs 64 caps | agree | DoS/持久化边界。 |
| host capability modes | agree | 模式状态表。 |
| config mode validation/default | agree | 配置枚举/默认值。 |
| Resume preserves routing | agree | 持久化兼容合同。 |
| lifecycle write preserves routing | agree | 非破坏性生命周期写入。 |
| Journal/Recovery preserve routing | agree | 恢复合同。 |
| SubagentStart records/displays routing | agree | 状态持久化与展示格式应拆分。 |
| SubagentStop freezes started routing | agree | 时序一致性。 |
| unrouted worker stays unrouted | agree | 禁止事后追溯赋值。 |
| routing orthogonal to topology/evidence/acceptance | agree | 权限/架构边界。 |
| routing policy is pure/no host resolution | agree | 纯函数和 host ownership 边界。 |

### `claude-settings-sync.test.js` (10/10)

| Item | Review | 说明 |
| --- | --- | --- |
| empty-project sync | revise | 保留 adapter 文件/ownership 行为，但移除固定 `deepseek-v4-pro` 和精确 Hook inventory；当前 target-owned model 断言不应成为 source 合同。先拆文件再纳入 maintained。 |
| merge/backup/idempotence | revise | 幂等、备份、用户设置保留应 `keep`；固定主模型断言应删除。primary 未注意该有效 case 被整文件 quarantine 连带排除。 |
| project-local API env | revise | ownership/冲突机制可测，但具体 provider env 投影属于 target-owned 范围；拆成通用 ownership 合同与 target adapter 专测。 |
| user-owned API env conflict | agree | 非覆盖安全边界有效，fixture URL/token 不是通用真值。 |
| replace managed API env | agree | 已管理字段可更新的 ownership 合同。 |
| replace managed hooks | agree | Hook 集合从受管源派生，不固定一次 inventory。 |
| managed-target conflict | agree | 用户资产非覆盖边界。 |
| user-owned main model conflict | revise | 非覆盖原则有效，但 source 不应以 Claude 主模型字段为自身产品合同；移到 target-owned 测试或改成通用 unmanaged-key conflict。 |
| replace managed main model | revise | 当前规则明确 model selection 为 target-owned；不是 `probe`，应从 source 测试删除/迁移。 |
| CLI supports claude-code sync | revise | catalog 已明确 `cli/bin/hypo-workflow` retired；verdict 从 `keep` 改为 `remove`，由 host/Skill-first sync 合同替代。 |

### `completion-report-contract.test.js` (5/5)

| Item | Review | 说明 |
| --- | --- | --- |
| shared response fields | agree | 语义字段可保留，内部字段名/渲染需拆开。 |
| templates expose fields | agree | 固定模板路径且跨文件聚合会漏检。 |
| completion surfaces share fields | agree | 固定源路径、跨文件凑字段不证明每个 surface。 |
| forbids path-only responses | agree | prose regex 不是最终回复行为验证。 |
| domain explanation for learning/research | agree | 关键词存在既可假通过也会因正常改写失败。 |

### `deep-plan-convert.test.js` (8/8)

| Item | Review | 说明 |
| --- | --- | --- |
| public convert exports | agree | 公开 API。 |
| targeted drilldown only | agree | fixture ID 且验证 sibling 不变。 |
| ambiguous target rejected atomically | agree | 原子性/歧义安全。 |
| readiness depth gates | agree | 状态合同有效，gap 文案需拆分。 |
| conversion emits compact context | agree | 隐私/持久化有效，英文 heading 与文件名过度具体。 |
| no default directional conversion | agree | readiness 安全门。 |
| archived conversion blocked | agree | 生命周期门。 |
| package path escape rejected | agree | 路径逃逸安全边界。 |

### `docs-governance.test.js` (8/8)

| Item | Review | 说明 |
| --- | --- | --- |
| exactly ten routes/docs deferred | agree | 未版本化的固定 inventory 对合法新增过敏；若保留，应声明为版本化 public API。 |
| docs ownership map | agree | alpha.1 路径与固定文档 inventory 不应成为当前治理真值。 |
| docs check rejects invalid README | agree | 负 fixture 与治理类别。 |
| repair preview is zero-write | agree | 零写入有效，9 个路径清单应从 docs map 派生。 |
| configuration reference coverage | agree | 安全概念有效，平台/措辞 regex 过度耦合。 |
| Chinese-body docs | agree | 语言策略可测，两个 spot check 不足。 |
| alpha.1 release coverage | revise | 硬编码判断同意，但该文件已经 `quarantined`；不是 maintained gate，不能再 `reclassify`。删除当前入口必须链接 alpha.1 的断言；历史 release artifact 可做版本参数化验证。 |
| stale release claims rejected | agree | 负 fixture 的失败类别合理。 |

### `final-assistant-output.test.js` (5/5)

| Item | Review | 说明 |
| --- | --- | --- |
| parse exact last Codex output | agree | fixture 字节是输入派生，精确捕获是合同。 |
| capture explicit session path | agree | 本地显式路径适配合同。 |
| resolve session ID | agree | Codex 目录布局属于版本化 adapter 兼容。 |
| missing assistant fails closed | agree | 禁止伪造输出。 |
| OpenCode remains probe-only | revise | 文件已 quarantined，`reclassify` 无效；改写为“只有 verified exact extractor 才可返回 captured”，允许未来能力新增。前四个有价值 case 应拆到 maintained 文件。 |

### `init-automation-contract.test.js` (4/4)

| Item | Review | 说明 |
| --- | --- | --- |
| non-git init with policy | revise | 已 quarantined 且直接执行 retired CLI；不是“分类待协调”，应删除 CLI case，由 Skill-first Init 行为测试覆盖非 Git 与安全默认。 |
| default balanced/reject invalid | revise | enum 合同保留到 config/API 测试，退休 CLI invocation 删除。 |
| shell validator rejects invalid | agree | exit semantics 可留，脚本路径/完整错误句拆分。 |
| init docs distinguish non-git/import | agree | 当前只是跨三文件 prose regex，应以结构化 Init route/状态行为替代。 |

### `lifecycle-policy.test.js` (6/6)

| Item | Review | 说明 |
| --- | --- | --- |
| kind derives defaults | agree | 版本化映射。 |
| reject routes needs_revision | agree | 状态转换。 |
| accept + continuation | agree | precedence 合同。 |
| completed follow-up does not override acceptance | agree | precedence 合同。 |
| execution beats stale accepted mirrors | agree | precedence 合同。 |
| lifecycle docs contain contracts | agree | `skills/status/SKILL.md` 当前不存在，且 prose/path 断言不能证明 lifecycle 行为。 |

### `maintenance-template-learning.test.js` (2/2)

| Item | Review | 说明 |
| --- | --- | --- |
| recurring runs create pending candidate | revise | case 本身保护非权威学习边界，但文件因该能力被 C21 Records/Maintain supersede 而 quarantined；先确认能力仍在产品范围，否则 remove，不能仅 `keep` 一个退休 lane。 |
| no implicit authority promotion | revise | 安全合同强；若能力仍支持，应拆到 maintained；若已退休，迁移同等“无自动提权”合同到当前 Maintain。 |

### `p2-technical-route-contract.test.js` (6/6)

| Item | Review | 说明 |
| --- | --- | --- |
| fixture fields every milestone | agree | raw YAML indentation 与 `C\d+-M\d+` 是实现/历史格式硬编码。 |
| docs gate proposed/P3 | agree | 合并 prose 可凑关键词假通过。 |
| research-required hard gate | agree | 安全语义有效，文案排列不应是 oracle。 |
| challenge returns P2 to revision | agree | 阶段行为应由状态测试，不是 prose。 |
| P3 preserves P2 route fields | agree | 数据保留有效，heading/path 需拆开。 |
| ordinary plan avoids Feature DAG | agree | UX 合同应通过 Plan 输出/状态测试。 |

### `profile-platform.test.js` (8/8)

| Item | Review | 说明 |
| --- | --- | --- |
| normalize known presets | agree | 仅在公开兼容期内保留。 |
| select config profile | agree | 配置选择行为。 |
| four profiles preserve gates | agree | 对所有 profile 的高风险 gate 循环有效，精确四项/内部设置需拆分。 |
| profile docs/yaml | agree | invalid lookup 有效，中文/YAML 文案应拆开。 |
| config docs list profile choices | agree | 重复固定 registry，应从结构化来源生成/核对。 |
| OpenCode native primitives | agree | 版本化 adapter contract。 |
| third-party adapter targets | agree | supported registry 应驱动覆盖，不手列三平台。 |
| Codex runtime assumptions | agree | 禁止外部 provider 泄漏有效，术语字符串应拆分。 |

### `readme-update.test.js` (9/9)

| Item | Review | 说明 |
| --- | --- | --- |
| default README config | agree | 公开默认值。 |
| render blocks from assets | agree | `/hw:release`、`/hw:chat` 已退休且重复断言，与十命令 surface 自相矛盾。 |
| replace managed block only | agree | marker ownership。 |
| strict missing marker fails | agree | 防静默追加安全边界。 |
| stale managed facts | agree | 负 fixture，版本/数量从 fixture 来源派生。 |
| stale narrative count | agree | mismatch 检测合理。 |
| Chinese Quick Start and six platforms | agree | 固定平台数/名单应从 capability registry 派生。 |
| reject English/external routing | agree | 语言/外部路由策略负例。 |
| update selected blocks | agree | 选择性写入合同。 |

### `revision-start-boundary.test.js` (5/5)

| Item | Review | 说明 |
| --- | --- | --- |
| separate revise/approve/start APIs | agree | approval 与 start 分离。 |
| feedback writes Records/no edits/start | agree | 原子权限边界。 |
| executing revision stops/resets | agree | 修订后需重新批准/启动。 |
| missing proposal atomic rejection | agree | 无 proposal 不可部分改变 authority。 |
| rejection then approval still no start | agree | 双门授权。 |

### `session-source-discovery.test.js` (3/3)

| Item | Review | 说明 |
| --- | --- | --- |
| safe probes for configured kinds | agree | exact four-source equality 对新增 source 过敏。 |
| normalize four fixture formats | agree | 总记录数 4 是 fixture topology，不是通用合同。 |
| redact sensitive input | agree | secret fixture 验证安全行为。 |

### `utils.test.js` (7/7)

| Item | Review | 说明 |
| --- | --- | --- |
| C17 utility exports | agree | 别名兼容是否公开需 probe。 |
| plain-object predicate | agree | 纯语义合同。 |
| clone isolated deep copy | agree | 无 aliasing。 |
| compact filesystem timestamp | revise | exact bytes 已进入 event/receipt/file IDs，属于持久化兼容候选；先追踪读写消费者。若历史对象需可寻址则 `keep/version`，不能按“等价格式”随意替换。 |
| stable stringify ordering | revise | 当前用于 evidence/project-event hash，canonical bytes 影响持久化标识；应作为版本化 hash contract `keep`，不是普通实现细节 probe。 |
| hasText | agree | 纯语义合同。 |
| safeId normalization | revise | 输出进入 event/maintenance ID 与路径，属于持久化兼容候选；应版本化并保留迁移测试，而不是允许任意“同样安全”的 slug。 |

### `yaml-parser-unification.test.js` (5/5)

| Item | Review | 说明 |
| --- | --- | --- |
| parse standard complex YAML | agree | YAML 语义。 |
| deterministic round trip | agree | 不固定 emitted bytes。 |
| config/knowledge same semantics | agree | C17/F001 等只是 fixture 输入。 |
| public YAML helpers | agree | 公开 API。 |
| manifest declares js-yaml | revise | primary 识别出实现依赖硬编码，但 case 级 `reclassify` 会把同文件 4 个有效 maintained case 一起移走。应 `split/remove` 此依赖名断言；行为测试继续 maintained。 |

## Scenario 逐项复审 (7/7)

| Scenario | Review | 说明 |
| --- | --- | --- |
| `v0.5/s07-full-hypo-todo` | agree | checklist-only 历史结果，固定 4 prompt/24 log/16/18 tests/旧 state；不是可执行 oracle。 |
| `v11/s63-init-automation-non-git` | agree | 直接执行退休 CLI 并匹配完整 validator 文案；当前已 quarantined，应移除并由 Skill-first Init 替代。 |
| `v4/s14-multi-dim-scoring` | agree | checklist-only，固定维度、权重、阈值与旧 state/report。 |
| `v6/s24-audit-report` | agree | 只 grep 旧审计 taxonomy、英文标题和旧路径。 |
| `v8.1/s34-import-history-time-gap` | revise | 删除 prose grep 同意；但若 `history_import.time_gap_threshold` 仍是当前公开 schema，字段/default 的 schema 行为测试应迁移而非随 Scenario 一并丢弃。 |
| `v8.3/s44-showcase-skeleton` | agree | 退休命令与固定文案/路径。 |
| `v9/s54-opencode-plugin-scaffold` | agree | 退休 CLI、固定生成树和内部 symbol/event 文案造成大面积无关失败。 |

## Primary 结论修订与遗漏

### High

1. **agree：固定 C21 与 Scenario 路径是 maintained gate 的真实高风险。** 这是本分片最直接的默认门禁问题。
2. **revise：alpha.1 不是 maintained gate。** `docs-governance.test.js` 当前 catalog classification 为 `quarantined`。保留“历史版本硬编码必须删除/参数化”的结论，但影响面应写为 `test:all` 噪声和历史诊断失真。
3. **agree：README 退休命令断言自相矛盾。** 该文件也已 quarantined，因此不是默认 gate；仍应清除，避免完整测试因正确删除退休资产而失败。
4. **agree：prose regex 不能替代行为验证。** 尤其跨多个文件拼接后匹配的测试甚至无法证明任一 surface 独立满足合同。

### Medium

1. **revise：没有 maintained 测试执行退休 CLI。** `init-automation-contract`、`claude-settings-sync` 和选中 Scenario 均已 quarantined。maintained 的 `c21-m8-regression-contract` 只运行 catalog runner 并扫描退休路径文本。问题是 scanner 质量以及 mixed-file quarantine，不是漏分 maintained caller。
2. **missing：catalog 是文件级分类，primary 多个 case 级 `reclassify` 不可实施。** 必须拆分 `yaml-parser-unification`、`final-assistant-output`、`claude-settings-sync` 等混合文件，避免一个坏 case 拖走多个有效合同。
3. **missing：catalog inventory discovery 与本 Cycle inventory 定义不一致。** maintained partition gate 只发现顶层 `*.test.js`，未来合法新增 `*.spec.js`、其他扩展或子目录测试可完全逃逸。
4. **missing：quarantine replacement 只验证路径存在，不验证行为等价。** generic reason + 任意 maintained replacement 可满足 gate，无法证明退休测试的合同真的被替代。
5. **revise：utility exact formats 并非明显无价值硬编码。** `stableStringify` 参与 evidence/project-event hash，`safeId`/timestamp 进入持久化 ID/路径；这些需要明确版本兼容，而不是允许等价实现任意变化。

## 建议的反事实 probes

| Probe | 当前预期 | 合理 oracle |
| --- | --- | --- |
| 把一个 C21 anchored 测试重命名，保留相同 `covers` 与断言 | 固定路径 gate 失败 | 应通过；coverage ID/真实行为仍在 |
| 把 retired CLI 字符串放进注释；另用 wrapper 间接执行 | 前者误报、后者漏报 | 注释通过，真实间接执行失败 |
| 将 alpha.1 入口更新为 alpha.2，同时保留 alpha.1 历史 release note | quarantined alpha.1 case 失败 | current docs gate 通过；历史 artifact 独立校验 |
| 同义改写 completion/P2 文档，再保留关键词但删除运行时行为 | 前者失败、后者可能通过 | 前者通过，后者失败 |
| 新增 `core/test/nested/example.spec.js` | catalog partition gate 可能不发现 | 必须报 unclassified |
| 给 quarantine 指定语义无关但 maintained 的 replacement | 当前 gate 通过 | 必须因 coverage 不等价失败 |
| 为 OpenCode 提供 verified exact extractor | “永不 captured” case 失败 | verified 时允许 captured，未验证时 fail closed |

## Catalog / fixture 裁决

- 7 个选中 Scenario 全部 quarantined。两个 checklist-only 条目不是测试；五个 runner 主要验证退休命令、旧路径或 prose。它们不应作为“完整测试仍有价值”的依据。
- `claude-settings-sync.test.js` 因最后一个退休 CLI case 整文件 quarantined，导致前面的幂等、备份和用户资产保护也退出默认 gate；拆分比继续整文件 quarantine 更准确。
- `yaml-parser-unification.test.js` 相反：4 个行为 case 值得 maintained，只有 `js-yaml` 依赖名 case 错把实现选择当合同；应拆除单 case，不应整文件 reclassify。
- completion/P2/readme/docs/lifecycle 的 fixture 应保存结构化语义输入与期望状态；Markdown 文案检查只能作为生成文档的次级 smoke。

## 零遗漏自检

- 与冻结的 `audits/INVENTORY.md`（commit `cd829923957ba09d5d0f1d0aa7ec9b5eecab9d93`）机械对账：shard 8 的 Core 18/18、Scenario 7/7 全部匹配，`missing=0`、`extraneous=0`。
- 重新枚举 Core inventory：179 个文件，选中 index `8,18,...,178` 共 18 文件。冻结 inventory 还包含 nested fixture test `core/test/fixtures/c21-m4/brownfield/test/server.test.js`，实证当前 catalog gate 的顶层-only discovery 漏洞。
- 重新枚举顶层 `test`、`routingTest`、`revisionTest`：122 个，以上逐项裁决 122/122。
- 重新枚举 catalog maintained + quarantined Scenario：76 个，选中 index `8,18,...,68` 共 7 项，以上裁决 7/7。
- 直接读取了所有选中测试源码、7 个 Scenario 的 `run.sh`/`checklist.md`/局部 fixture、`tests/regression-catalog.json`，并核对 retired surface 与文件 classification。
- 定向执行 `node --test core/test/c21-m8-regression-contract.test.js`：12/12 pass。这不是对 gate 正确性的肯定，反而确认它在漏掉 nested fixture test 的情况下仍会全绿。
- 本次只写本 reviewer 报告；未修改产品、测试、fixture、catalog 或 runner，未把 primary 结论当作事实。
