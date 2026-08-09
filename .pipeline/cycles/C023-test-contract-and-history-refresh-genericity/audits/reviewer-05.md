# Independent Reviewer Test Contract Audit 05

## 结论

本复审按 `METHODOLOGY.md` 重新计算 `% 10 == 5` 分片，并独立读取 18 个测试文件、当前 131 个顶层 case（动态 subcase/variant 在其父 case 内继续复核）与 8 个 Scenario。总体同意 primary-05 对真实项目 C3 依赖、Hook exact-key、源码 regex 门、History Refresh `files.size`、prompt 行数/整句和退役 Scenario 的判断，但有 8 处需要修订，另有 2 个并行新增的 History Refresh case 在 primary 报告中缺失。

最重要的复核结果：

1. `analysis-runtime.test.js` 的 C3 case 确实直接读取当前仓库 `.pipeline/archives/C3-*`，不是隔离 fixture。产品代码不变，仅清理参考仓库历史就会失败，应重写。
2. `semantic-workflow-prompts.test.js` 对 Hook key 使用完整集合等值；新增合规 `PostToolUse` 必然失败。该断言保护旧封闭集合，不保护 Hook 的能力或安全合同。
3. S75 通过自然语言 test title 选 case；实测用绝对不匹配的 pattern 运行同一文件仍退出 `0`，TAP 显示 `1..0` 后整体 pass，故当前 Scenario 可零行为执行而 false-pass。
4. S51 同时有 checklist 的 36、runner 期望的 53、runner 手列的 42；三个数字对应不上，不能作为命令覆盖证据。
5. `history-refresh-preview.test.js` 当前新增了 “naive timestamp” 和 “equivalent manifest byte preservation” 两个 case；primary-05 未覆盖，应标记 `missing` 并补入最终 inventory。
6. 不是所有 exact assertion 都应拆掉。对公开 descriptor/schema 的精确形状、严格恢复事件序列和用户可见安全状态，合法合同演进触发单个聚焦测试失败是合理的；primary 对 C23 M4 的两项拆分建议过宽。

## 覆盖复算

测试文件（18/18）：

- `core/test/analysis-runtime.test.js`
- `core/test/bootstrap-migration.test.js`
- `core/test/c23-m4-experiment-supervision.test.js`
- `core/test/claude-model-routing.test.js`
- `core/test/command-exposure.test.js`
- `core/test/daily-project-summary.test.js`
- `core/test/delivery-bootstrap-promotion.test.js`
- `core/test/explore-lifecycle.test.js`
- `core/test/history-refresh-preview.test.js`
- `core/test/ledger-jsonl-migration.test.js`
- `core/test/maintenance-ledger.test.js`
- `core/test/opencode-panels.test.js`
- `core/test/pr-create.test.js`
- `core/test/project-stop-event.test.js`
- `core/test/rejection-rework-blocked-runtime-loop.test.js`
- `core/test/semantic-workflow-prompts.test.js`
- `core/test/sync-derived-map.test.js`
- `core/test/workspace-format.test.js`

Scenario（8/8）：S75、S08、S11、S21、S31、S41、S51、S61，路径与 primary-05 一致。

与冻结 inventory（commit `cd829923957ba09d5d0f1d0aa7ec9b5eecab9d93`）机械对账：test files `18 expected / 18 reviewed / 0 missing / 0 extraneous`；Scenarios `8 expected / 8 reviewed / 0 missing / 0 extraneous`。case 级的两项 `missing` 是冻结后同一路径内并行新增的测试，并非 inventory 路径遗漏。

## 逐项交叉复审

`agree` 表示合同、硬编码分类、有效修改敏感性、失败合理性和处置均同意；`revise` 后给出替代结论；`missing` 表示当前源码已有但 primary 未逐项覆盖。

| File | Item | Review | Independent evidence / correction |
| --- | --- | --- | --- |
| analysis-runtime | real execution/boundary decisions | agree | literal 均由输入回验；枚举是协议。 |
| analysis-runtime | outcomes/follow-up proposal | agree | outcome 全集变化是明确协议变化，聚焦失败合理。 |
| analysis-runtime | evidence-oriented evaluation | revise: keep | `ANALYSIS_EVALUATION_CRITERIA` 是公开、被报告消费的有序合同；增加/重排 criterion 应显式审阅。primary 的 `parameterize` 会削弱完整性门。 |
| analysis-runtime | report contract | agree | 路径、时间和 metrics 均由 ledger/options 派生。 |
| analysis-runtime | templates/guidance discoverable | agree | 手列文件和宽泛关键词同时存在漏检与文案误报，改查结构化模板 inventory/渲染结果。 |
| analysis-runtime | batch plan/C3 queue | agree | L169-171 读取 live `.pipeline/archives/C3-*`；应迁到 isolated fixture，并保留 no-confirm 行为断言。 |
| bootstrap-migration | proposal APIs exported | agree | API 名是公开 surface；C21/M5 只污染标题/skip message。 |
| bootstrap-migration | Bootstrap remains internal | agree | 负面命令样例保护未公开内部 Job。 |
| bootstrap-migration | proposal authority separation | agree | role/hash/零写是安全合同。 |
| bootstrap-migration | selection rubric | agree | L140 依赖英文 reason 同义词，应用稳定 reason code/schema。 |
| bootstrap-migration | deterministic merge | agree | 全对象一致正是确定性合同。 |
| bootstrap-migration | one active leaf | agree | `active.length === 6` 应从 fixture dedupe groups 派生。 |
| bootstrap-migration | conflict/non-proposal fail closed | agree | 失败准确对应 authority/leaf 冲突。 |
| bootstrap-migration | caller Record ID rejected | agree | writer-owned ID 是边界合同。 |
| bootstrap-migration | approved audit zero-write | agree | read-only audit 的 tree equality 合理。 |
| bootstrap-migration | rejection variants | agree | synthetic secret/source drift 是刻意安全 fixture。 |
| c23-m4 | API surface | agree | 公开 protocol/compiler surface。 |
| c23-m4 | fixture modes/review diversity | agree | 仅验证 fixture 前提，literal 未提升为全局真值。 |
| c23-m4 | deterministic foreground plan | revise: keep | L76-93 的 exact descriptor 是 host 消费的公开 protocol；新增字段也是合同演进，单 case 失败并要求审阅是合理的，不是无关级联。保留 forbidden process-authority 断言。 |
| c23-m4 | isolated tmux descriptor | agree | `hw-exp-...-12hex` 绑定实现格式过深；保留 namespace、字符集、唯一/稳定关系和 128-byte 上限。 |
| c23-m4 | checkpoint command binding | revise: keep | 当前只有两类明确越权输入（错误 artifact、替换原命令），均应拒绝；没有证据表明安全扩展会误杀，无需 probe 才能保留。 |
| c23-m4 | tampered tmux rejection | agree | 重算 hash 后仍拒绝，准确保护 policy binding。 |
| c23-m4 | real foreground smoke | agree | stdout 由执行命令直接派生。 |
| c23-m4 | tmux smoke isolation | agree | 仅操作生成 session，环境不可用时 skip。 |
| c23-m4 | interruption recovery choice | agree | strategy/event 是协议，缺 checkpoint evidence 的零写合理。 |
| c23-m4 | recovered rerun parent binding | revise: keep | L371-408 的 invalid variants逐一破坏 parent、时间、唯一 restarted event 或 immutable plan；不是因“完整数组”误报。L426-433 的 exact state sequence 是恢复合同。 |
| c23-m4 | operational completion evidence | agree | 失败只对应 exit/evidence/temporal 合同破坏。 |
| c23-m4 | scientific review compilation | agree | observation binding 与多因判断是业务合同。 |
| c23-m4 | unsafe/one-cause/drift rejection | agree | 保留 `probe`：安全 evidence scheme 的扩展性需要反事实确认。 |
| c23-m4 | persisted review binding | agree | tree equality 用于验证拒绝零写，不锁成功布局。 |
| c23-m4 | recomputed hash bypass rejected | agree | forge variants 都是 policy bypass。 |
| c23-m4 | one-shot Receipt resolution | agree | target binding/one-shot 是安全合同。 |
| c23-m4 | activated recovery | agree | 同 actor 幂等恢复。 |
| c23-m4 | forged actor recovery | agree | actor substitution 必须失败且不消费 Receipt。 |
| c23-m4 | fresh reread merge | agree | 并发 Attempt 不丢失。 |
| c23-m4 | CAS authority drift | agree | fresh-read CAS 边界。 |
| c23-m4 | expected_hash preconditions | agree | matching/missing file 两类 precondition 是协议。 |
| c23-m4 | review temporal order | agree | 固定时间是边界 fixture。 |
| c23-m4 | target/state drift | agree | target substitution 和 state drift 均是合同破坏。 |
| c23-m4 | Core no runner authority | agree | L1029-1036 源码 regex 可被 alias/间接依赖绕过，也会被注释误报；改依赖图/禁用模块规则。 |
| c23-m4 | persistence facts only | agree | JSON 全文 forbidden-word regex 会误杀合法字段；改 schema/capability 与真实 side-effect 断言。 |
| claude-model-routing | default routing metadata | agree | 默认模型在多测试/文档重复；保留单一权威默认合同，其余派生。 |
| claude-model-routing | rendering/tool guidance | agree | 多个完整英文句子使文案修改产生无关失败；应使用 section/rule IDs。 |
| claude-model-routing | non-DeepSeek exclusion | agree | model 是输入 fixture；negative routing 有效。 |
| claude-model-routing | artifact ownership | agree | `8` 与默认模型复制；count 应从 routing inventory 派生。 |
| claude-model-routing | explicit overrides | agree | synthetic override 行为稳定。 |
| claude-model-routing | dynamic role selection | agree | 每条 mapping 是产品路由合同。 |
| claude-model-routing | project sync | agree | 当前重复默认模型和整句 guidance，端到端只需查派生一致性/ownership。 |
| command-exposure | discoverable API | agree | generator-facing API。 |
| command-exposure | compatibility metadata complete | agree | registry 自身作为 inventory。 |
| command-exposure | exposure taxonomy | agree | command→exposure 是产品表，不是参考仓库数据。 |
| command-exposure | Codex discovery | agree | 性质断言，不锁完整输出全集。 |
| command-exposure | re-check backend | agree | 正确验证 projected backend。 |
| command-exposure | no leak custom projection | agree | 负面 exposure fixture 有效。 |
| daily-project-summary | Shanghai 00:30 window | agree | timezone/window 是明确默认合同。 |
| daily-project-summary | aggregate/dedupe | agree | 数量从 PROJECTS/EVENTS/PROGRESS fixture 派生。 |
| daily-project-summary | Chinese failure-first rendering | agree | `M13 ... completed` 和整句英文 fixture 文案造成润色误报；保留事实、语言和 section order。 |
| daily-project-summary | notification dry-run | revise: keep | L216-219 只要求多段、无损拼接、关键内容不截断，不锁 segment 数或边界；合法 segmentation 算法变化仍可通过，无需 probe。 |
| daily-project-summary | scheduler dry-run | agree | 本地 evidence 和 no remote side effect。 |
| daily-project-summary | notify confirmation/injected runner | agree | 远端副作用必须显式授权。 |
| daily-project-summary | CLI cron dry-run | agree | CLI 是公开入口。 |
| delivery-bootstrap-promotion | atomic promotion | agree | AC/M/time 为输入 fixture；原子创建是合同。 |
| delivery-bootstrap-promotion | refuse unaccepted | agree | 未接受时零写。 |
| delivery-bootstrap-promotion | reject already promoted | agree | one-shot promotion 行为明确。 |
| explore-lifecycle | parallel status | agree | ID/path/time 全部 fixture-derived。 |
| explore-lifecycle | end retains worktree | agree | changed files/commit 由真实临时 git fixture 产生。 |
| explore-lifecycle | archive deletion gate | agree | 显式删除确认是安全合同。 |
| explore-lifecycle | feed plan/analysis | agree | evidence injection 是用户可见功能。 |
| history-refresh | deterministic mixed preview | agree | `first.files.size === 16` 锁内部输出数量；应用 required subset/关系断言。 |
| history-refresh | generic identity/root C7 | agree | sample-product/C7/C008/C009/2 都由本 case 输入派生；C22/20 negative sentinel 针对已确认回归。 |
| history-refresh | manifest ID precedence | agree | synthetic identity 验证 precedence。 |
| history-refresh | incomplete root state | agree | fallback 值由缺失输入条件派生。 |
| history-refresh | naive timestamp without timezone | missing: keep | 当前 L131-143；验证不可信 naive timestamp 不进入 manifest，是通用安全/确定性合同。 |
| history-refresh | equivalent manifest byte preservation | missing: keep | 当前 L145-161；验证 operator comment/等价 manifest byte-preservation，避免无意义重写。 |
| history-refresh | side-by-side/idempotent preview | agree | 真实合同；中文授权句仅一处偶然文案，可改结构化 status。 |
| history-refresh | reviewed preview drift | agree | source digest drift 必须失败。 |
| history-refresh | explicit approval | agree | `approved:true` 是明确安全门。 |
| history-refresh | stale preview | agree | review 后 source drift 必须失败。 |
| history-refresh | target conflict zero-write | agree | conflict 时 INDEX 不得部分写。 |
| history-refresh | activate/idempotent/preserve | agree | 建议 split 结构状态与偶然中文句；counts 均由 fixture 派生。 |
| ledger-jsonl-migration | helper exports | agree | public API。 |
| ledger-jsonl-migration | append-only/parseable | agree | IDs 是输入且验证顺序/前缀。 |
| ledger-jsonl-migration | YAML migration | agree | count/IDs 由两条 fixture event 派生。 |
| ledger-jsonl-migration | compact regeneration | agree | authority/summary schema 是合同。 |
| ledger-jsonl-migration | subsystem JSONL paths | revise: split | 当前五个 subsystem 应保留端到端行为 case；另加 writer registry coverage gate。只“参数化”现有 case 无法自动发现漏接的新 writer。 |
| ledger-jsonl-migration | source scan/no broad barrels | agree | 文本 regex 不是可靠架构门，应以 AST/dependency lint 替代；行为测试继续覆盖实际 writer。 |
| maintenance-ledger | append/redact | agree | synthetic credentials 是安全 fixture。 |
| maintenance-ledger | evidence paths | agree | 五类隔离目录是存储/审计合同。 |
| maintenance-ledger | zh-CN rendering | revise: keep | L113-119 已用 Han script + 宽泛语义 alternation，而非锁整句；合法普通润色可通过，同时能抓语言/意义丢失。 |
| opencode-panels | legacy TUI disabled | agree | VSP host ownership 边界。 |
| opencode-panels | emit server/no deprecated TUI | agree | managed artifact surface/migration contract。 |
| opencode-panels | generated plugin importable | agree | 入口点是 host contract。 |
| opencode-panels | remove deprecated helpers | agree | managed legacy cleanup。 |
| opencode-panels | preserve non-Hypo config | agree | user-owned config preservation。 |
| opencode-panels | render role matrix | agree | custom model literals均为输入回验。 |
| opencode-panels | DeepSeek guidance routing | agree | 完整英文句导致文案级联；改稳定 rule marker + route exclusion。 |
| opencode-panels | metadata matrix | revise: keep | L176-204 的 900000/模型是显式传入 `renderHypoWorkflowMetadata` 的 input，不是读取默认配置；该 case 验证透明投影，literal 是 fixture-derived。 |
| opencode-panels | spec mirrors matrix | agree | 文档 regex 重复默认值且锁格式；应解析/生成语义数据。 |
| opencode-panels | provider-qualified IDs | agree | 默认值重复，expected 应由单一 provider/default authority 派生。 |
| pr-create | dirty worktree plan | agree | action order 是远端安全合同，host/branch/path 是 fixture。 |
| pr-create | runtime path blocking | agree | 应从 protected-path authority 派生，避免漏新增保护面。 |
| pr-create | reusable path policy | agree | review/create 共用 policy 行为。 |
| pr-create | plan-first no writes | agree | 未授权不排 remote write。 |
| pr-create | wait confirmation | agree | provider 写前人工门。 |
| pr-create | ordered remote writes | agree | 副作用顺序变化应显式审阅。 |
| project-stop-event | terminal classifications | agree | TERMINAL_STATES 是手抄 inventory，可能漏新增；应从 transition authority 派生。 |
| project-stop-event | chat pause not stop | agree | 中文文本是负面 fixture。 |
| project-stop-event | intermediate milestone | agree | auto-continue 条件是合同。 |
| project-stop-event | local-only event | agree | L124 全 JSON 禁词会误杀合法 summary/metadata；保留 capability flags/actions。 |
| project-stop-event | stable dedupe | agree | 不锁 hash，只锁同语义稳定关系。 |
| rejection runtime | rejection artifact | agree | IDs/time fixture-derived，schema/links 是合同。 |
| rejection runtime | deterministic rework route | agree | implement+test 是工作流合同。 |
| rejection runtime | blocked approval separation | agree | role separation 是安全合同。 |
| rejection runtime | rework linkage | agree | source prompt preservation 与 scope boundary。 |
| semantic prompts | Chinese-first/no internals | agree | 手列 SKILLS 会漏新增；单个汉字信号偏弱，应从 manifest inventory 与 user-facing sections 驱动。 |
| semantic prompts | Cycle/Plan semantics | agree | 四个完整中文句是偶然措辞，应改结构化 rule/semantic marker。 |
| semantic prompts | Claude thin adapters | agree | `<=16` 行和手列 commands 对空行/注释敏感且漏新增；验证唯一 skill delegation/frontmatter。 |
| semantic prompts | OpenCode thin adapters | agree | 同上。 |
| semantic prompts | exact Hook key set | agree | L95-102 完整数组阻止任何新增合规 Hook，已直接阻碍 `PostToolUse`。改为 required hooks + 每项 schema/capability allowlist。 |
| semantic prompts | Hook context hides internals | agree | split 稳定引用/禁泄漏与偶然中文词。 |
| sync-derived-map | artifact declarations | agree | managed path/authority/writer/trigger 是 compatibility contract。 |
| sync-derived-map | check-only | agree | stale 且零写。 |
| sync-derived-map | standard repair | agree | fixture 内容由输入派生。 |
| sync-derived-map | authority conflict | agree | `repair_hint` 英文句式非合同；应断言 status/reason code/protected refs。 |
| workspace-format | canonical serialization | agree | hash/order/frontmatter 是公开 serialization contract。 |
| workspace-format | six format classification | agree | 六类是当前完整协议枚举；新增格式时聚焦失败并更新是合理的。 |
| workspace-format | manifest precedence | agree | brownfield residue 不覆盖 manifest authority。 |
| workspace-format | sidecars tolerated | agree | 明确兼容 surface。 |
| workspace-format | unknown entries residue | agree | unknown entry fixture 有效。 |
| workspace-format | invalid manifest damaged | agree | schema-invalid fixture 可随 schema 演进调整。 |
| workspace-format | missing root empty | agree | no-create 行为准确。 |

## Scenario 逐项复审

| Scenario | Review | Evidence / disposition |
| --- | --- | --- |
| `c21/s75-accept-reject` | agree: rewrite | `run.sh` L8 绑定自然语言标题。实测绝对不匹配 pattern 仍 exit 0，故必须稳定入口并显式验证实际目标 case 数/行为 evidence 非零。 |
| `v1/s08-subagent-self-review` | agree: remove/archive | 无 runner，pending checklist，依赖退役 `execution.mode=subagent`、`state.yaml/log.md`。 |
| `v2.5/s11-scripts-executability` | agree: remove/archive | 无 runner，固定 v8.4.0、旧 scripts 与 Hook surface；不能代表当前合同。 |
| `v6/s21-check-output` | agree: remove | runner 只 `rg` 六个 label/emoji/句子，既不执行 `/hw:check` 也不验证行为。 |
| `v8.1/s31-import-history-tags` | agree: remove/archive | 仅扫描退役 init 文档、固定 legacy tag/output 名；与当前 History Refresh 无关。 |
| `v8.2/s41-full-view-flags` | agree: remove/archive | 指向已移除 skills 和 legacy state/log/report 路径。 |
| `v9/s51-opencode-capability-matrix` | agree: remove/rewrite from authority | checklist=36、mapping rows/runner=53、手列 commands=42；纯文档 grep 且自相矛盾。若保留目标，应由 command registry 生成并验证投影集合。 |
| `v9/s61-opencode-model-matrix-sync` | agree: split | synthetic override、private-field no-leak 有效；默认模型/900000/文档行 regex 应从 authority 派生或移出该 E2E。 |

## 争议与裁决建议

### 应采纳 primary 的整改

- live C3 archive 改 isolated fixture。
- Hook exact-key 改 required capability/schema gate，允许新增合规 Hook。
- `files.size === 16` 改 required file subset/关系验证。
- source regex 架构门改 AST/dependency/registry 质量门。
- prompt/adapter 的整句与 `<=16` 行断言改稳定结构和 delegation contract。
- S75 禁止 title-only selection 的零匹配 false-pass；S51 删除矛盾计数。

### 应修订 primary 的整改

- 不拆弱 `ANALYSIS_EVALUATION_CRITERIA` 的完整有序合同。
- C23 foreground descriptor 与 recovered event sequence 属公开协议/安全状态，exact failure 是合理的聚焦失败。
- C23 checkpoint invalid variants 当前均是真实 binding 破坏，无需因假设未来扩展而先降级。
- daily segmentation 测试没有锁具体分段算法，现状可保留。
- maintenance 中文测试已使用宽泛语义检查，不是整句锁定，现状可保留。
- OpenCode metadata matrix 是显式 input projection case，不是 default duplication，现状可保留。
- JSONL 五 subsystem 行为测试应保留并另加 registry coverage，而不是只参数化。

## 反事实与执行证据

- 已执行只读 false-pass probe：`node --test --test-name-pattern='__definitely_no_matching_case__' core/test/cycle-lifecycle-vnext.test.js`，结果 exit `0`，输出包含 `1..0`，证实 S75 零匹配可通过。
- 已机械计算 S51：spec mapping rows=`53`，runner explicit command list=`42`，checklist=`36`。
- 未执行源码 mutation；C3、Hook、`files.size` 与 regex finding 已由静态 dependency/assertion 关系充分证明。后续实现后仍应执行 focused tests 和完整 suite。

## Finding 分级

### 高

1. S75 是 false-pass，不只是重命名导致 false-fail；当前 maintained Scenario 可在零目标测试执行时成功。
2. live C3 archive 将参考仓库历史变成产品测试依赖。
3. Hook exact-key 阻塞 `PostToolUse` 等合规扩展。
4. source regex 架构门同时存在 false-positive 与 false-negative。

### 中

1. S51 的 36/42/53 矛盾使 coverage 声明不可置信。
2. History Refresh `files.size === 16` 锁内部产物数量。
3. primary-05 漏记当前新增的两条 History Refresh case，最终 coverage 对账必须基于冻结后的 inventory 重跑。
4. prompt/adapter 行数、整句和默认模型跨多投影复制会造成不合理级联。

### 低

1. 多数 Cycle/项目/时间/路径 literal 均来自 fixture 输入，不应机械删除。
2. schema、安全角色、Receipt、approval、protected authority、timezone 等稳定产品合同允许精确测试。

## 零遗漏自检

- [x] 使用 `rg --files core/test -g '*.test.*' -g '*.spec.*' | sort` 与 `(NR-1) % 10 == 5` 重算，18/18 文件覆盖。
- [x] 与冻结 `INVENTORY.md` shard=5 行机械对账：tests 18/18、Scenarios 8/8，均 0 missing / 0 extraneous。
- [x] 当前每个顶层 case 均标记 agree/revise/missing；动态 rejection/format/invalid variants 在其父 case 中复核。
- [x] catalog maintained + quarantined 按 path 排序取同一分片，8/8 Scenario 覆盖。
- [x] 读取 8 个 Scenario 的全部 checklist/run.sh/config（如存在），并对 S75、S51 做机械 probe/count。
- [x] 仅新增本 reviewer 报告；未修改产品、测试、fixture 或 catalog。
