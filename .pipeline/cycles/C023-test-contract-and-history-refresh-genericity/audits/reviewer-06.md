# Independent Reviewer Test Contract Audit 06

## 结论

本复审按 `METHODOLOGY.md` 重新计算 `% 10 == 6` 分片，独立读取冻结 inventory 指定的 18 个 Core test 文件、106 个源码声明的顶层 case、18 个 nested case 与 7 个 Scenario。机械覆盖为 `18/18 test files`、`106/106 top-level cases`、`18/18 nested cases`、`7/7 scenarios`，没有路径遗漏或额外项。

总体同意 primary-06 对以下缺陷的判断：maintained Delivery preflight 可整组 skip、全局命令数量被多处手抄、普通 maintained gate 读取已提交 ZIP/checksum、Feature Queue 测试读取本仓 `.pipeline/config.yaml` 与 C3 archive、源码布局/导出语法被当作行为合同，以及旧 S52 用 wildcard 重跑全部测试。需要修订 primary 的三点：

1. fixture 中明确写入的 Cycle 7、phase、ID 等值可以是聚焦 parser oracle；它们不是项目通用真值，不能仅因 fixture 合法变化时需同步修改单个测试就一律参数化。
2. `delivery-proposal-preflight.test.js` 应修复一次公共 fail-open 注册逻辑；七个行为 case 本体可保留，仅并发 case 的存储文件数量/目录形状需要拆分。没有必要把八个行为测试全部重写。
3. 当前 `npm test` 已通过 catalog 只运行 maintained set，因此 9 个基线失败不会污染默认 gate。问题存在于显式 wildcard/`--set all`、`test:quarantine` 的可执行噪声，以及 quarantined S52 内部递归运行 wildcard；不能把它描述成当前默认 CI 必然失败。仓库内未发现 `.github` workflow 或 `.gitlab-ci.yml`，所以这里没有可核验的远端 CI 配置，只有 package runner 与 Scenario runner。

## 机械覆盖

测试文件（18/18）：

- `core/test/analysis-state-ledger.test.js`
- `core/test/c21-m7-adversarial.test.js`
- `core/test/c23-m5-experiment-status.test.js`
- `core/test/claude-plugin-alias.test.js`
- `core/test/command-skill-root-routing.test.js`
- `core/test/deep-plan-architecture.test.js`
- `core/test/delivery-proposal-preflight.test.js`
- `core/test/feature-queue-metrics.test.js`
- `core/test/host-contract-v1.test.js`
- `core/test/legacy-workspace-inspection.test.js`
- `core/test/maintenance-queue.test.js`
- `core/test/opencode-status.test.js`
- `core/test/pr-manual-gates.test.js`
- `core/test/readme-feature-queue.test.js`
- `core/test/response-contract.test.js`
- `core/test/semantic-workflow-runtime.test.js`
- `core/test/sync-standardization.test.js`
- `core/test/workspace-module-split.test.js`

Scenario（7/7）：S76、S09、S12、S22、S32、S42、S52，路径与 primary-06 一致。

基线重跑注册 120 项：111 pass、9 fail、0 skip。`claude-plugin-alias` 因 import 失败只注册一个 file-level failure，故五个源码 case 未注册；计数关系仍是 `106 + 18 - 5 + 1 = 120`。

## 逐项交叉复审

`agree` 表示合同、hardcode 分类、合法演进敏感性、失败意义与 verdict 均同意；`revise` 给出替代裁决。nested variants 在所属父 case 内复核。

| File | Item | Review | Independent evidence / correction |
| --- | --- | --- | --- |
| analysis-state-ledger | fixture parses/evidence contract | agree: parameterize | `M06`、commit、计数和叙述是样例；schema/required evidence 才是合同。 |
| analysis-state-ledger | summary stays small/external | agree: split | 外置引用、bounded summary 与省略 full arrays 是合同；样例计数/结论不是。 |
| analysis-state-ledger | explicit legacy ledger preserved | agree: keep | caller path 是输入回验，兼容行为聚焦。 |
| analysis-state-ledger | docs define fields | agree: rewrite | 当前 grep headings/整句，编辑改写会无行为失败。 |
| c21-m7-adversarial | Maintain rejects secret before writes | agree: keep | secret 是对抗样例；拒绝且 byte-for-byte zero-write 是安全合同。 |
| c21-m7-adversarial | deletion manifest protected descendants | agree: keep | protected authority path 是明确安全边界。 |
| c21-m7-adversarial | deletion Receipt crafted descendants | agree: keep | 重签 crafted body 后仍拒绝，准确验证 semantic binding。 |
| c23-m5-experiment-status | status Store API | agree: keep | 三个公开方法由无条件 case fail-closed 检查；additive API 不影响。 |
| c23-m5-experiment-status | rich fixture concepts | agree: rewrite | fixture richness 值得测，但 exact event-type 全集和项目 ID 把样例锁成封闭集合；应检查 required subset/relationships。 |
| c23-m5-experiment-status | immutable events/logical drift | agree: parameterize | path regex 手写 `acesim-qv100`，应由 `fixture.project_id` 派生；hash/dedupe/zero-write 保留。 |
| c23-m5-experiment-status | invalid event variants | agree: keep | 三个 nested case 分别破坏 project、event type、safe reference，失败范围准确。 |
| c23-m5-experiment-status | project-scoped query mismatch | agree: keep | foreign project 是对抗输入，rebuild/read 都必须零写拒绝。 |
| c23-m5-experiment-status | bounded materialized read | agree: split | no-rescan、boundedness、digest/lineage 是合同；fixture IDs/counts 应从 events 派生。 |
| c23-m5-experiment-status | later query widens | agree: keep | 1/20 是边界样例，验证 materialization 不因早期 query 丢行。 |
| c23-m5-experiment-status | complete view bounded/newest | agree: parameterize | 200 rows 与 64 KiB 若为产品上限应来自命名常量；newest IDs 从生成输入推导。 |
| c23-m5-experiment-status | persisted bounded validation | agree: parameterize | 三个 nested case 保护真实 row invariants，但重复未导出的 200 limit。 |
| c23-m5-experiment-status | semantic/secret projection rejection | agree: parameterize | 七个 nested case 都有独立安全意义；只需集中 size limit，不能删除对抗 payload。 |
| c23-m5-experiment-status | Attempt authoritative ID/alias | agree: keep | 三个 nested identity case 都准确破坏协议，literal 为构造输入。 |
| c23-m5-experiment-status | Attempt scoped by Experiment | agree: keep | 相同 local ID 跨 Experiment 共存是明确 identity 合同。 |
| c23-m5-experiment-status | two-clone deterministic union | agree: keep | expected 从 AB/BA 输入关系派生，不锁项目通用事实。 |
| c23-m5-experiment-status | Git-like merge/conflict | agree: keep | 真实临时 Git workspace，冲突失败与 zero-write 对应合同。 |
| c23-m5-experiment-status | source/released Experiment surface | agree: split | `/hw:experiment` presence 有效；exact 10 与已提交 release artifact 属独立 release-candidate gate。 |
| c23-m5-experiment-status | current guides | agree: rewrite | forbidden retired command tokens 可保留；host-name prose/整句应改结构化 surface lint。 |
| claude-plugin-alias | namespace metadata | agree: rewrite | exact 54、手列文件和 prompt 句是历史 inventory；当前文件甚至因退役 export 无法注册。 |
| claude-plugin-alias | route guidance/DeepSeek | agree: rewrite | exact prompt 句锁 renderer 实现，不验证稳定 route metadata。 |
| claude-plugin-alias | remove legacy aliases | agree: keep | before/after filesystem 行为聚焦且 additive canonical skills 不失败。 |
| claude-plugin-alias | platform docs namespace | agree: rewrite | `/hw:*` 与 native `/resume` ownership 可结构化验证，不需整句。 |
| claude-plugin-alias | project namespace rule | agree: split | rule id/scope/severity/semantic instruction 是合同；exact hook array 与 rationale prose 不是。 |
| command-skill-root-routing | route separates roots | agree: keep | `/hw:goal` 是公共样例，关键是 external target zero-write 与 explicit skill root。 |
| command-skill-root-routing | intent explicit skill root | agree: keep | authority intent 与 root separation 是公开合同。 |
| command-skill-root-routing | command discovery root | agree: rewrite | exact 十命令数组使新增合法命令击穿无关 routing test；应对 authoritative registry coherence。 |
| deep-plan-architecture | public APIs | agree: keep | 五个 API 是公开 surface，新增 export 不失败。 |
| deep-plan-architecture | normalize tracks | agree: rewrite | exact `Object.keys` 拒绝 compatible additive field；保留 required subset、legacy key removal 与关系 normalization。 |
| deep-plan-architecture | relationship errors | agree: keep | adversarial IDs 为输入，issue kind/relationship 是协议。 |
| deep-plan-architecture | architecture edge errors | agree: keep | 三条 edge 各自破坏 source/target/self 合同。 |
| deep-plan-architecture | derive module tracks | agree: parameterize | evidence/source refs 从 fixture 派生；除非排序公开，不应锁 incidental order。 |
| deep-plan-architecture | render Markdown/Mermaid | agree: rewrite | exact headings、arrow 和英文 section 对本地化/renderer 演进过敏。 |
| deep-plan-architecture | persist artifacts | agree: split | filenames/schema/round-trip 保留；Markdown 只验 semantic coverage。 |
| delivery-proposal-preflight | accepted Goal vs same Goal | revise: keep after harness fix | 行为与 zero-write 精确；修复公共 `preflightTest` fail-open 即可，不需重写 case。 |
| delivery-proposal-preflight | accepted Goal vs Cycle | revise: keep after harness fix | kind-swap rejection 是聚焦 authority 合同。 |
| delivery-proposal-preflight | different ID/pointer switch | revise: keep after harness fix | coexistence 与 atomic foreground pointer 是用户可见 lifecycle 合同。 |
| delivery-proposal-preflight | concurrent same-ID | agree: split | one winner/one reject 保留；exact 2 YAML 与 record directory count 移至 storage-specific test。 |
| delivery-proposal-preflight | accepted Goal/new Goal | revise: keep after harness fix | 新 identity 与 accepted history immutability 精确，无其他 hardcode。 |
| delivery-proposal-preflight | accepted Goal/new Cycle | revise: keep after harness fix | cross-kind coexistence 同上。 |
| delivery-proposal-preflight | rejection blocks approval | revise: keep after harness fix | revision/approval lifecycle 与 zero-write 精确，时间/transaction ID 为输入。 |
| delivery-proposal-preflight | stale pre-rejection Receipt | revise: keep after harness fix | stale Receipt 必须拒绝；far-future expiry 只是 fixture。 |
| feature-queue-metrics | batch planning defaults/live config | agree: remove | 同一 case 直接 `loadConfig('.pipeline/config.yaml')`，把当前项目配置当 library fixture；lane 已退役。 |
| feature-queue-metrics | Feature Queue spec prose | agree: remove | 纯 headings/phrase grep，且 surface 已 superseded。 |
| feature-queue-metrics | metrics spec prose | agree: remove | 退役 prose 不是 telemetry 行为 gate。 |
| feature-queue-metrics | unavailable telemetry normalization | agree: reclassify | duration/sentinel 是有效 helper contract，应迁至当前 metrics owner。 |
| feature-queue-metrics | telemetry rollup | agree: reclassify | totals 从输入派生，失败准确；不应随 Feature Queue 一起删除。 |
| feature-queue-metrics | archived fixtures present | agree: remove | 直接读 `.pipeline/archives/C3-*`，是确认的 reference-repo hardcode。 |
| host-contract-v1 | release manifest/ten commands | agree: rewrite | exact ten inventory 在 routing、Experiment、Host 多处复制；应从单一 command authority 生成/核对。 |
| host-contract-v1 | committed release artifacts | agree: reclassify | ZIP/checksum/installed descriptor/frozen hooks 对普通 source 改动过敏；只适合显式 candidate-release freeze gate。 |
| host-contract-v1 | projection lifecycle states | agree: keep | version/state 为协议，IDs/generation 来自隔离 fixture。 |
| host-contract-v1 | secret/private rejection | agree: keep | allowlist 与 secret rejection 是安全合同。 |
| host-contract-v1 | monotonic invalidation | agree: keep | generation 从输入递增，visible authority 清空准确。 |
| host-contract-v1 | generic bundle tamper | agree: keep | 使用隔离临时 bundle，不依赖 committed release。 |
| legacy-workspace-inspection | inspector API | agree: keep | 无条件 import/export case fail-closed。 |
| legacy-workspace-inspection | parse/read-only evidence | revise: keep | Cycle 7、phase、language 是已写 fixture 的明确 oracle；单个聚焦 parser test 随 fixture 更新不是无关级联，且 document 已与解析源逐项对应。 |
| legacy-workspace-inspection | Init legacy/zero migration | agree: rewrite | 只有 `initializeWorkspace` 缺失时该 maintained integration 会 skip；必须 fail-closed。 |
| legacy-workspace-inspection | symlink leaf rejection | agree: keep | root/external tree equality 证明安全边界。 |
| legacy-workspace-inspection | malformed/no defaults | agree: rewrite | 保留 structured error/absence，降低 implementation-name regex 耦合。 |
| legacy-workspace-inspection | symlink `.pipeline` ancestor | agree: keep | 两个 nested case 均检查 external tree 不变。 |
| legacy-workspace-inspection | missing optional leaves | agree: keep | source set 与 written leaves 一一对应，Cycle 9 是输入 oracle。 |
| maintenance-queue | operation schema | agree: remove | removed API 造成当前三失败之一，旧 queue surface 已被 Records/Maintain 替代。 |
| maintenance-queue | lifecycle | agree: remove | exact retired enum/transition 不再是当前合同。 |
| maintenance-queue | side-effect gates | agree: reclassify | confirmation/backup 安全矩阵可移植到当前 authority owner，旧 queue/path 删除。 |
| opencode-status | empty workspace | agree: keep | structured degraded state，无 project coupling。 |
| opencode-status | active aggregation | agree: split | 一个 case 混合 state/queue/events/metrics/agents/UI 文案，合法局部演进会大面积失败。 |
| opencode-status | runtime subtask not evidence | agree: reclassify | authority boundary 有效，独立于 deferred UI。 |
| opencode-status | confirm gate no current feature | agree: keep | pending confirmation 可见是明确状态合同。 |
| opencode-status | conditional DAG | agree: split | structured visibility/ready 保留，exact sidebar prose 移除。 |
| opencode-status | compact analysis summary | agree: parameterize | fixture values派生、named size bound；保留 no-ledger-expansion。 |
| opencode-status | malformed optional files | agree: keep | warning 精确对应 malformed source。 |
| opencode-status | malformed lease guidance | agree: rewrite | 应断言 stable action/code，不锁 `hw:check`/Recovery 句式。 |
| opencode-status | scalar milestone | agree: keep | legacy compatibility fixture 有效。 |
| opencode-status | dash-only YAML | agree: keep | parser semantics 与 inline input 对应。 |
| opencode-status | completed summary | agree: parameterize | 12/duration 从 fixture 派生，renderer wording 分离。 |
| opencode-status | status spec prose | agree: remove | quarantined adapter 文档 grep 不是行为 gate。 |
| pr-manual-gates | fix/push manual | agree: rewrite | 保留 zero remote writes/structured gate，删除 `/push/` 文案 regex。 |
| pr-manual-gates | review runtime paths | agree: reclassify | protected paths 应由当前 policy authority 驱动；`.pipeline/log.yaml` 是 legacy layout。 |
| pr-manual-gates | merge blockers | agree: reclassify | zero remote contact 与 blockers 是有效安全合同。 |
| pr-manual-gates | ready merge confirms | agree: rewrite | confirmation gate 保留，URL/自然语言 prompt 不锁。 |
| pr-manual-gates | close reason/confirm | agree: rewrite | reason requirement 与 zero-write 保留，prompt 文案移除。 |
| readme-feature-queue | guide Feature Queue | agree: remove | 当前唯一 prose failure；测试要求退役命令/配置，失败不是产品 regression。 |
| readme-feature-queue | README Feature Queue source | agree: remove | exact retired path/skill，不属于 current surface。 |
| response-contract | conclusion/explanation/next steps | agree: split | semantic required fields 是“说人话”合同；exact `## 结论/解释/下一步` 是 renderer presentation。 |
| response-contract | manual operations/risks | agree: split | 保留 structured sections 和 input value rendering，不锁中文标题。 |
| response-contract | intermediate update | agree: keep | 三字段均为公开 shape，sample text 输入回验。 |
| semantic-workflow-runtime | Plan/Progress alignment | agree: keep | C001/M1/S1/M2 是在 test 内构造的 oracle。 |
| semantic-workflow-runtime | stale Progress error | agree: rewrite | stale detection 保留，完整英文 error 改 stable code+IDs。 |
| semantic-workflow-runtime | Discussion append/redact/dedupe | agree: split | 内容、安全和 dedupe 保留；gitignore 只验 ignore semantics，不锁 bytes。 |
| semantic-workflow-runtime | bounded semantic resume | agree: rewrite | selected refs/bound/leak safety 可结构化验证，section prose/宽泛 blacklist 会误报。 |
| semantic-workflow-runtime | Hooks resume/speakers | agree: rewrite | ledger side effect/structured hook result 保留，exact 中文 context 句移除。 |
| semantic-workflow-runtime | multiple Cycles focus | agree: keep | ambiguous zero-write 与 explicit focus routing 精确。 |
| semantic-workflow-runtime | PreCompact no recovery writes | agree: split | `continue` 与 ENOENT 是合同，exact message 非合同。 |
| sync-standardization | sync surface exposed | agree: remove | retired Sync write 当前按设计抛错，旧 54/paths/operations 不应恢复。 |
| sync-standardization | light sync writes | agree: remove | 同上，旧 global projection 已退役。 |
| sync-standardization | standard/deep/CLI writes | agree: remove | 三个基线失败均是测试期待退役写入，不是产品缺陷。 |
| sync-standardization | SessionStart drift/TUI | agree: split | current read-only/no-write drift 可迁移保留；retired TUI/global pieces 删除。 |
| workspace-module-split | exact modules/files/APIs | agree: remove | 历史 source decomposition 不是用户行为；root API 应由 owning public-surface test 保护。 |
| workspace-module-split | barrel named-export syntax | agree: remove | 当前唯一结构失败；运行 API 仍可用，证明 source-text oracle 无效。 |
| workspace-module-split | legacy entry absent/not shim | agree: remove | historical topology cleanup，不是当前 compatibility behavior。 |
| workspace-module-split | fixed stale-import scan | agree: remove | fixed roots/regex 同时漏检与误报；若 boundary 仍存在应使用 dependency lint。 |
| workspace-module-split | omnibus focused behavior | agree: split | workspace、graph、stop、capture、notification 五类真实行为应迁至各 owner，用 generic fixture；不能保留七项目顺序等 reference facts。 |

## Scenario 逐项复审

| Scenario | Review | Evidence / disposition |
| --- | --- | --- |
| `c21/s76-deletion-drift` | agree: rewrite | runner 用自然语言 title pattern。真实 runner 当前执行 1 parent + 5 nested 并通过；但不匹配 probe 仍 exit 0、TAP `1..0`，可在重命名后 false-pass。改稳定 scenario entry/ID，并断言非零 case/evidence。 |
| `v1/s09-subagent-full-delegation` | agree: remove/archive | 无 runner、pending checklist，依赖退役 `execution.mode=subagent` 与 `state.yaml/log.md`。 |
| `v3/s12-hook-stop-check` | agree: remove | 无 runner，手工检查退役 `stop-check.sh`、legacy `state.yaml` 与 60 秒 policy。 |
| `v6/s22-init-empty-project` | agree: remove | `run.sh` 只 grep 两句旧 Init 文案和 root `SKILL.md`，不初始化 workspace。 |
| `v8.1/s32-import-history-keyword` | agree: remove | 只 grep 固定 commit regex/旧 Skill prose；不是通用 History Refresh 行为。 |
| `v8.2/s42-guide-flow` | agree: remove | 锁 5 行、完整中文问题与退役命令，纯 prompt grep。 |
| `v9/s52-core-config-artifacts` | revise: remove for obsolete contract; primary noise scope narrowed | runner 的 wildcard 会运行所有 quarantined tests 并放大无关失败；但 S52 本身已 quarantined，默认 maintained runner不会调用它。删除旧 Scenario，不需为其设计新的全量 gate。 |

## 关键 Findings

### 高

1. `delivery-proposal-preflight.test.js` 的八个 maintained tests 共用 `HAS_PREFLIGHT ? test : test.skip`。任一关键 module/API 消失可让整组安全合同变为 skip；必须以无条件 setup/import failure 失败。
2. Host Contract、C23 Experiment、command routing 与旧 Claude test 分别手抄 command inventory（10 或 54）。新增一个有效公开命令会击穿多个无关测试；command set 必须只有一个权威来源。
3. `feature-queue-metrics.test.js` 直接读取 live `.pipeline/config.yaml` 和 `.pipeline/archives/C3-*`。这与 History Refresh 的参考仓库 hardcode 属同一缺陷类型。
4. committed ZIP/checksum/hook inventory 在普通 maintained Host Contract test 中验证，会把正常 source 开发与 release freeze 混为一谈。通用 bundle verifier 可 maintained；具体候选发布物应进入显式 release gate。
5. S76 存在可复现 false-pass：test-name pattern 零匹配时 Node 仍成功。Scenario 必须验证目标 case/evidence 非零。

### 中

1. `workspace-module-split.test.js` 读取 source text 要求特定 named-export 语法；当前失败而 root API 可用，是典型无价值 structural failure。
2. 9 个 shard baseline failure 全部来自 quarantined obsolete/deferred/structural lanes：Claude import 1、Maintenance Queue 3、Feature Queue README 1、retired Sync writes 3、barrel source shape 1。它们都不应解释为当前产品 regression。
3. 默认 package test 已正确使用 catalog maintained set；仍应删除/迁移这些 stale tests，避免 `--set all`、`test:quarantine` 和旧 wildcard Scenario 产生噪声。不是所有“full” invocation 都应被设计成绿灯，关键是名称与失败含义必须清楚。
4. exact prose/heading 断言广泛存在于 docs、Claude prompts、Experiment guides、response renderer、semantic resume/Hooks 和 OpenCode UI。它们应拆成 structured contract 与可选 presentation snapshot，避免润色引发级联。

### 低

1. 固定 ID、时间、路径、项目名作为隔离 fixture 输入本身允许；只有它们被提升为所有项目的预期，或直接读取 live reference repo 时才是 hardcode 缺陷。
2. schema version、协议字段、安全角色、protected paths、Receipt binding、公开 command name 与明确 size bound 等稳定合同可以精确测试；“任何 literal 都不能测试”会反而移除必要保护。

## 失败合理性裁决

对“有效功能修改后是否应该失败”的统一裁决如下：

- 应失败：公开协议/schema/security boundary 被破坏、required command 消失、zero-write/authority binding 失效、明确 boundedness 超限。
- 不应失败：新增兼容字段或命令、renderer/文案润色、fixture 样例扩充、内部 module/barrel/storage 布局调整、普通 source 修改但尚未生成 release candidate。
- 可以要求聚焦更新：明确改变公开合同或隔离 fixture 的目标输入输出。此类单个 owner test 失败合理，但不应造成跨命令、跨 renderer、跨历史 Scenario 的大面积级联。
- 本次 9 个基线失败：作为“当前产品回归”均不合理；作为 catalog 已标记的 stale quarantine 证据可解释，但长期处置仍是 remove/reclassify/split，而不是让 wildcard full suite 永久红灯。

## 可复现 Probe

1. `node --test --test-name-pattern='__definitely_no_matching_case__' core/test/deletion-gate.test.js`
   - 结果：exit 0，TAP `1..0`，证实 title-only Scenario 会在零行为执行时 false-pass。
2. `bash tests/scenarios/c21/s76-deletion-drift/run.sh`
   - 结果：1 parent + 5 nested 全部通过，说明当前 title 恰好匹配，但不能消除重命名风险。
3. 对冻结 shard 18 files 执行 `node --test`
   - 结果：120 registered、111 pass、9 fail、0 skip；失败分布与上文一致。
4. 静态 fail-open probe
   - `delivery-proposal-preflight.test.js` 明确将 `preflightTest` 设为 `test.skip`；`legacy-workspace-inspection.test.js` 的 Init wrapper 在 `initializeWorkspace` 缺失时同样 skip。无需修改源码即可证明 destructive export removal 不会由对应行为 case fail closed。

## Catalog、Runner 与 CI 裁决

- `package.json` 与 `core/package.json` 的默认 `test` 均调用 `tests/run_core_tests.mjs --set maintained`；runner 会核验 maintained/quarantined 完整分区与 replacement 引用，默认 gate 不执行本 shard 的 quarantined failures。
- `test:quarantine` 和 `--set all` 是显式非默认集合；应清楚标注其用途，不能把 stale failures 当产品 regression。
- quarantined S52 直接执行 `node --test core/test/*.test.js`，绕过 catalog 并把所有历史 lane 重新引入；应删除。
- 未发现仓库级 `.github` workflow 或 `.gitlab-ci.yml`，因此本 shard 没有证据声称远端 CI 当前使用 wildcard，也没有 CI 配置可在本报告内审计。最终审计应把“无 CI 定义”作为覆盖事实，而非假设存在。

## 零遗漏自检

- [x] 依据冻结 `INVENTORY.md` shard 6 行机械对账：18 expected / 18 reviewed / 0 missing / 0 extraneous。
- [x] primary 的 106 个顶层 item 全部给出 `agree` 或 `revise`；18 个 nested cases 在父项中逐一核验。
- [x] Scenario 7 expected / 7 reviewed / 0 missing / 0 extraneous；读取全部 checklist、runner 和局部 config。
- [x] 复核了 maintained API conditional skip、exact 10/54 commands、committed ZIP/checksum、live config/C3 archive、source-layout tests、quarantine wildcard noise 与 9 个失败的合理性。
- [x] 只写入本 reviewer 报告；未修改生产代码、测试、fixture、catalog、runner、其他报告或 protected files。
