# Independent Reviewer Audit 02

## Scope and conclusion

- 分片规则：规范化路径排序，zero-based index `% 10 == 2`。
- 独立重建 inventory：可执行测试文件 **18/18**，顶层或参数展开 case **94/94**；Scenario **8/8**。
- 复审结果：case 级 **agree 89 / revise 5 / inventory missing 0**。另外发现 primary 的 3 项事实或影响面遗漏。
- 审计方式：重新阅读测试、直接 fixture/support、catalog 和 Scenario runner；没有把 primary 结论当作事实。
- 只读 probe：对 `core/test/cycle-lifecycle-vnext.test.js` 使用不可能命中的 `--test-name-pattern`，Node 输出 `1..0` 后仍返回 `node_exit=0`，证实 s72 存在零执行假绿。
- 总结：primary 的主要方向正确，但错误地把一个 maintained 测试标成 quarantined，并把两组完全由输入派生的期望误判为仓库硬编码。默认 gate 的最高风险仍是 s72 零执行假绿、`workflow-commit` 维护旧 authority 写入，以及 maintained Deep Plan 测试依赖 C12 仓库 playbook。

`agree` 表示同意 primary 的合同、敏感性和处置；`revise` 表示本报告给出替代判断。表中 fixture literal 只有在被提升为所有项目真值时才算缺陷。

## Executable case review

### `analysis-command-entry.test.js` (5, quarantined)

| Item | Review | Hardcode / valid-change / failure judgment | Verdict and evidence |
| --- | --- | --- | --- |
| canonical/OpenCode entry | agree | `/hw:analysis` 与 skill route 是公开合同；要求四份文档都包含同一路径会因文档重组误报，且 L37-38 是重复断言 | split；保留 registry、生成物与文件存在性，文档一致性另测 |
| investigation semantics | agree | mode/evidence 字段是合同；整篇 Markdown 的中英短语与负向文案是偶然表达 | rewrite；语义丢失应失败，改写文案不应失败 |
| status/report summary | agree | compact summary 与 ledger pointer 是合同；源码函数名和源码 regex 是实现布局 | split；从公开行为验证，不扫描内部符号 |
| debug promotion | agree | 长调试可转 Analysis 是合同；关键词出现不证明路由有效 | rewrite；当前可因同义改写误报，也可关键词存在而假绿 |
| generated command/metadata | agree | 命令路径、canonical、skill metadata 和 interaction mode 来自显式输入/公开格式 | keep；失败局部且表示生成合同变化 |

### `authority-nonduplication.test.js` (2, maintained)

| Item | Review | Hardcode / valid-change / failure judgment | Verdict and evidence |
| --- | --- | --- | --- |
| root exports | agree | API 名是显式公开合同，不是仓库样例 | keep；API 破坏时失败合理 |
| emitted authority separation | agree | fixture sentinel 合法；全树 literal 出现次数把“唯一 authority”误写成“唯一文本出现” | probe；结构化 ownership 断言可靠，L200-208 可能因合法 projection 误报 |

### `c23-m1-recovery-remediation.test.js` (5, maintained)

| Item | Review | Hardcode / valid-change / failure judgment | Verdict and evidence |
| --- | --- | --- | --- |
| retry `after_prepare` | agree | C23/AceSim 是输入标签；transaction phase 是恢复协议 | keep；故障恢复、Receipt 消费、清理与幂等失败均合理 |
| retry `after_manifest_activation` | agree | 同上，phase 为显式 fault seam | keep |
| unknown rerun parent | agree | 被破坏的 ID 来自 fixture；lineage 完整性是合同 | keep；持久化读取若接受未知 parent 应失败 |
| self rerun parent | agree | self mutation 是反例输入，不是项目真值 | keep |
| forward rerun parent | agree | forward mutation 是反例输入；历史顺序是合同 | keep |

### `claude-adapter-config.test.js` (5, quarantined)

| Item | Review | Hardcode / valid-change / failure judgment | Verdict and evidence |
| --- | --- | --- | --- |
| default Claude config | agree | profile/settings 结构与当前 defaults 混合；固定第三方 model 名会在正常模型轮换时失败 | split；单独保留有意的 release-policy defaults snapshot |
| profile normalization | agree | developer/standard/strict 权限映射是配置合同 | keep；政策变化时局部更新合理 |
| role model mapping | agree | model 字符串由输入 pool/override 派生 | keep |
| capability declaration | agree | capability key/value 是 adapter 协议，不是项目数据 | keep |
| schema/docs coverage | agree | 字段覆盖可测，`DeepSeek.*Mimo` 等品牌文案不能代表 adapter 功能 | rewrite；结构化 schema 校验与文档 prose 分离 |

### `codex-hook-process.test.js` (2, maintained)

| Item | Review | Hardcode / valid-change / failure judgment | Verdict and evidence |
| --- | --- | --- | --- |
| Hook registration/process schema | agree | event set、command process schema、秒级 timeout 是当前 host contract | keep；新增受支持 Hook 会只使此合同测试要求显式更新，失败合理且局部 |
| wrapper fail-open output | agree | stdout 唯一 `{}`、stderr 诊断和 invalid-input fail-open 是 host 协议 | keep；破坏会影响真实 Hook 调用 |

### `context-capsule.test.js` (8, maintained)

| Item | Review | Hardcode / valid-change / failure judgment | Verdict and evidence |
| --- | --- | --- | --- |
| API exports | agree | Capsule API 名是公开合同 | keep |
| incremental/full byte equivalence | agree | IDs/actions 都由 fixture 输入；byte determinism 是合同 | keep |
| generated sequence/chunk equivalence | agree | seeds/chunks 是覆盖输入，不是全局真值 | keep |
| validated cursor delta | **revise** | primary 把 4 segments 判为实现敏感；实际显式配置 `maxEventsPerSegment: 1`，主 writer 三事件加 worker 一事件，4 是输入派生 | **keep**；若无额外写入却生成额外 segment，失败合理；不可读旧 segment 仍是核心反事实 |
| bad cursor fail-closed | agree | mutation 数字与 ID 是反例输入 | keep；必须 zero-write |
| derived authority boundary | agree | forbidden authority keys 是稳定边界 | keep |
| reduction checkpoints | agree | 预期 goal/scope/evidence/workers 全由输入事件派生 | keep |
| secret/hidden reasoning fail-closed | agree | marker 是安全 probe | keep；泄漏或残留即合同破坏 |

### `deep-plan-real-scenario.test.js` (2, **maintained**, not quarantined)

| Item | Review | Hardcode / valid-change / failure judgment | Verdict and evidence |
| --- | --- | --- | --- |
| Deep Plan lifecycle | **revise** | primary 把大量 FQ/A/R/U ID 当历史细节，但这些值由本测试输入并验证 round-trip/order；真正脆弱的是 exact rendered heading/prose 与旧 protected fixture files | **split**, not wholesale rewrite；保留 ask/research/map/drill/readiness/convert 行为和输入派生 ID，改写 renderer 文案断言并移除不必要的 `state.yaml/cycle.yaml/rules.yaml` fixture 写入 |
| research-code playbooks | **revise** | 同意 rewrite，但 primary 错称本文件 quarantined；catalog 实际 maintained，固定 `.pipeline/playbooks/C12-*` 和全文 regex 会污染默认 gate | rewrite with **high maintained-gate priority**；用通用 fixture/结构化 policy contract 替代参考仓库 C12 路径 |

### `explain-contract.test.js` (7, quarantined)

| Item | Review | Hardcode / valid-change / failure judgment | Verdict and evidence |
| --- | --- | --- | --- |
| command map | agree | route metadata 是 compatibility contract | reclassify；只在兼容面保留期间成立 |
| evidence packet | agree | packet mode/confidence/files 是合同；中文 headings 是 renderer copy | split |
| framework inference | agree | fixture 路径可作为输入场景，但 exact 全列表会拒绝合法新增 evidence | parameterize/required subset |
| recent-change inference | agree | 固定 legacy `PROGRESS/log/state` 是退役 authority 布局 | reclassify/rewrite for Runtime/Continuation |
| read-only files | agree | byte comparison 保护只读安全边界 | keep as compatibility safety test |
| redaction | agree | secret marker 是 probe | keep |
| unknowns | agree | `needs_context` 是合同；“无法确认”和 headings 是偶然文案 | split |

### `global-knowledge-index.test.js` (3, quarantined)

| Item | Review | Hardcode / valid-change / failure judgment | Verdict and evidence |
| --- | --- | --- | --- |
| safe global projection | agree | project/secret 值来自输入；surface 已被 Records/Maintain 取代 | reclassify/remove when compatibility ends |
| infrastructure projection | agree | metadata preservation/redaction 是有效旧合同 | reclassify |
| Notion-safe summary | agree | fixture IDs 合法；外部存储 projection 已 superseded | reclassify |

### `knowledge-ledger.test.js` (9, quarantined)

| Item | Review | Hardcode / valid-change / failure judgment | Verdict and evidence |
| --- | --- | --- | --- |
| fixture schema | agree | C4/M01 是 compatibility fixture | reclassify |
| recursive redaction | agree | markers 是安全输入 | keep |
| SessionStart defaults | agree | exact 六类与 legacy 路径是旧产品布局 | reclassify |
| project relevance | agree | `hypo-workflow` 和 machine path 来自输入，未被提升为通用输出 | reclassify with superseded feature |
| docs semantics | agree | headings/prose/path regex 对合法文档改写高度敏感 | rewrite |
| internal route | agree | `commands.length === 54` 是无关全局计数，新增任意命令会误报 | rewrite；只断言目标 route 唯一性/属性 |
| normalization | agree | C4/M02/P006/E001 是输入，预期由 normalization 合同派生 | keep compatibility test |
| append/index/compact | agree | category union 多数由输入派生，但固定 inventory/line presentation 与行为混合 | split；保留确定性与 redaction，隔离 presentation policy |
| no raw records in state | agree | fallback 到固定 C4 archive 是参考仓库历史依赖 | rewrite/remove；不得读取当前仓库 protected state 作为通用 fixture |

### `maintenance-backfill.test.js` (3, quarantined)

| Item | Review | Hardcode / valid-change / failure judgment | Verdict and evidence |
| --- | --- | --- | --- |
| daily shards | **revise** | primary 称存在“global 2026-03-01 / exact 76 count”，源码没有 76；日期、三天 shard、cursor、source order 全由显式输入派生 | **keep**（在功能仍受支持时）；建议改测试标题避免“starts at”被误读，但不是硬编码缺陷 |
| weekly shards | agree | boundary/IDs 从注入区间派生 | keep |
| resume state | agree | IDs、refs、now 是 fixture 输入，no raw content 是合同 | reclassify only because feature superseded, not hardcode |

### `notion-project-home-dry-run.test.js` (4, quarantined)

| Item | Review | Hardcode / valid-change / failure judgment | Verdict and evidence |
| --- | --- | --- | --- |
| dry-run no writes | agree | phase exact order可能对新增 evidence stage 敏感；write trap 与 capability flags 是强合同 | split；保留零写入，stage inventory 单独作为有意流程合同 |
| classify before merge | agree | block/slot IDs 来自 fixture；ordering 是行为 | keep |
| deterministic hashes | agree | time/page/order 都是输入 | keep |
| secret redaction | agree | raw markers 是 probe；`hypo-workflow` 仅为 template input | keep |

### `pr-contract.test.js` (5, quarantined)

| Item | Review | Hardcode / valid-change / failure judgment | Verdict and evidence |
| --- | --- | --- | --- |
| command map | agree | `/hw:pr` compatibility route 是公开面 | reclassify |
| source normalization | agree | URL/owner/repo/number 是输入样例；host formats 是合同 | keep |
| local archive contract | agree | remote gate 是安全合同；六文件清单与双语 summary 是布局/copy | split |
| existing ID input | agree | ID 是显式输入 | keep |
| stable non-overwrite/redaction | agree | sequence/date 从输入和已有 archive 派生 | keep |

### `project-linkage-e2e.test.js` (2, quarantined)

| Item | Review | Hardcode / valid-change / failure judgment | Verdict and evidence |
| --- | --- | --- | --- |
| orchestration export | agree | function 是旧公开 API | reclassify |
| full dry-run bundle | agree | project/channel/output 均来自 scenario fixture；exact sections 和中文 daily-summary prose 会对合法扩展误报 | split；side-effect traps 和 input-derived outcomes 应保留 |

### `recovery-journal.test.js` (12, maintained)

| Item | Review | Hardcode / valid-change / failure judgment | Verdict and evidence |
| --- | --- | --- | --- |
| API/taxonomy export | agree | API/type 名是 recovery protocol | keep |
| stream partitioning | agree | exact derived path 是持久化格式合同，segment 数由 limit/events 派生 | keep |
| vector cursor delta | agree | schema/fields 是协议 | keep |
| append cursor stability | agree | IDs 是输入；delta/order 是合同 | keep |
| same-process concurrency | agree | 24 是负载参数，预期序列由它派生 | keep/probe flake |
| multiprocess concurrency | agree | 12 是负载输入，真实 child process 有必要 | probe CI stability |
| stale reaper | agree | 180s 隐含当前 120s threshold；合法 timeout policy 调整会误报 | parameterize/expose threshold |
| blob contention | agree | 32/524288 是负载输入；一致 digest/单 blob 是合同 | probe resource flake |
| taxonomy/hidden reasoning | agree | event types/forbidden reasoning 是协议与安全边界 | keep |
| sensitive routing metadata | agree | 四字段是安全边界，markers 是 probe | keep |
| redaction before persistence | agree | seeded value 只用于泄漏检测 | keep |
| large blob/on-demand read | **revise** | primary 建议允许 additive descriptor field；生产 `normalizeBlobDescriptor` 使用 `assertExactKeys`, 当前 descriptor 是明确 closed schema，不是偶然对象布局 | **keep**；若要 additive compatibility，必须先明确版本化协议变化，再同步改生产与此单一合同测试，当前失败是合理且局部的 |

### `rules-capture-habits.test.js` (5, quarantined)

| Item | Review | Hardcode / valid-change / failure judgment | Verdict and evidence |
| --- | --- | --- | --- |
| remember proposal | agree | flags/fields 是旧协议，IDs/text 是输入 | reclassify |
| candidate nonblocking | agree | nonblocking 是合同；exact Chinese confirm copy 不是 | rewrite |
| force write/effective habits | agree | 内容由输入；authority path 已 superseded | reclassify |
| nested directories | agree | requested path/ID 是输入 | keep |
| adapter projection | agree | active rule presence 是行为，headings/prose 是 presentation | split |

### `snapshot-store.test.js` (9, maintained)

| Item | Review | Hardcode / valid-change / failure judgment | Verdict and evidence |
| --- | --- | --- | --- |
| API exports | agree | API 名是公开合同 | keep |
| Goal/Cycle reconstruction | agree | C21/IDs 是 fixture；semantic preservation 是合同 | keep |
| clone stability | agree | manifest/runtime 差异是反事实输入 | keep |
| portable sources | agree | local paths 是拒绝 probe，locator kinds 是协议 | keep |
| semantic change hash | agree | changed body 是输入 | keep |
| exclusion/security | agree | sentinels 是 probe，forbidden local/sensitive classes 是边界 | keep |
| prepared transaction recovery | agree | phase 是 transaction protocol | keep |
| schema/path safety | agree | exact schema/path constraints 是安全合同 | keep |
| derived contained path | agree | derived path ownership 是 authority contract | keep |

### `workflow-commit.test.js` (6, maintained)

| Item | Review | Hardcode / valid-change / failure judgment | Verdict and evidence |
| --- | --- | --- | --- |
| legacy atomic commit | agree | C3 是输入，但写 protected legacy authority 是退役架构 | reclassify/remove from maintained gate |
| legacy invalid state | agree | validator behavior旧且 exact error prose 脆弱 | reclassify |
| legacy derived failure | agree | `PROGRESS.md`, marker 与 `hw:sync` 是旧布局 | reclassify |
| legacy revision pointer | agree | C12/legacy schemas 是 fixture/obsolete format | reclassify |
| legacy accept/reject warning | agree | 维护旧 state/log/feedback 写入会让 Runtime migration 大面积误报 | reclassify |
| current Delivery transaction | agree | transaction ID/Receipt/phases/resume-read-only 是当前合同，末尾 skill prose regex 不是 | split current behavior from docs/legacy compatibility |

## Scenario review (8/8)

| Item | Review | Hardcode / valid-change / failure judgment | Verdict and evidence |
| --- | --- | --- | --- |
| `c21/s72-cycle-delivery` | agree | exact test title 是 runner-to-test implementation coupling；rename 后真实合同仍在但 runner 执行 0 case | rewrite, highest priority；本 reviewer 的 impossible-pattern probe 得到 `1..0` 且 exit 0 |
| `v0/s04-skip-step` | agree | 无 runner，checklist 已明确 FAIL/blocked；旧 state/log/step 语义 | remove；catalog presence不能提供自动验证 |
| `v11/s68-rejection-rework-blocked-runtime-loop` | agree | runner 真正执行测试，无 title filter；语义 legacy 且已有 s75 replacement | keep quarantined until compatibility removal |
| `v5/s18-template-library` | agree | 固定 5 template、每项 >=3 prompt、C2 archive 和旧命令是历史仓库布局 | remove；不是通用 template contract |
| `v6/s28-log-filters` | agree | exact docs prose、新est 10、当前仓库 `log.yaml` 是旧快照 | remove |
| `v8.2/s38-patch-fix-flow` | agree | P001、步骤文案、commit format、旧 skill path 都是退役 surface | remove；若 Patch compatibility 必须另建行为测试，s72 replacement 不充分 |
| `v8.3/s48-i18n-templates` | agree | exact 文件 inventory、emoji heading、legacy-report path 对正常 template 迁移误报 | remove/rewrite only if i18n contract remains |
| `v9/s58-opencode-full-v84-parity` | agree | 固定 14 commands、八步 prose、V8.4 docs 是版本快照 | remove；当前 Hook replacement 不等价于完整 platform parity，应修正 catalog 说明 |

## Primary disagreements and missed impact

### High

1. **Primary 错误标注 Deep Plan 分类。** `tests/regression-catalog.json` 将 `core/test/deep-plan-real-scenario.test.js` 列为 `maintained`，不是 primary 所写的 quarantined。于是固定 `.pipeline/playbooks/C12-*`、全文 regex 和测试临时写 protected legacy files 都属于默认门风险，必须按 maintained 优先级处理。
2. **s72 零执行假绿已实证。** 不可能命中的 pattern 得到 `1..0` 和 exit 0；这不是理论风险。runner 必须绑定专用文件/稳定 machine-readable case ID，或解析并拒绝零匹配。
3. **`workflow-commit.test.js` 的 maintained 分类确实错误。** 前五 case 维护 protected legacy authority 写入；应拆文件或支持 case-level catalog，否则任何 Runtime-only 合法演进仍会触发无关失败。

### Medium

1. **Backfill 硬编码判断应撤回。** `maintenance-backfill.test.js` 没有 primary 所称的 76；所有日期、shard 和 cursor 由明确输入派生。这里的问题至多是 feature 已 superseded 和标题误导，不是通用性硬编码。
2. **Capsule segment count 判断应撤回。** 4 由显式 segment limit 和四条事件派生，能检测额外写入；删除会削弱测试价值。
3. **Recovery blob descriptor 当前是 closed protocol。** 生产读取明确 `assertExactKeys`；在未决定版本兼容策略前，把 exact key 测试参数化会令测试与生产合同不一致。
4. `analysis-command-entry` L37-38 重复同一 regex，却用两条消息声称分别验证 canonical 与 OpenCode mapping；这是冗余/覆盖错觉，应在 rewrite 时修掉。

### Low

1. Deep Plan 生命周期中的 FQ/A/R/U/C12-like 值多数是 fixture 输入和 round-trip expectation，不应因为具体就整体 rewrite；只应隔离 renderer copy 与仓库 playbook 依赖。
2. Notion 的 `object_id: hypo-workflow`、project-linkage 的项目名、C23/AceSim/C21 labels 都是显式 fixture 输入；本分片未发现它们被实现当作所有工作区的固定真值。

## Counterfactual probes and actions

1. **Completed:** s72 zero-match probe，结果 exit 0；立即 rewrite runner。
2. Authority occurrence count：增加一个带明确 `authority_role: projection` 的合法 projection，判断 literal count 是否误报；预期应迁移到结构化 ownership assertion。
3. Deep Plan：将 fixture IDs 全量替换但保持引用一致，生命周期应通过；只改 rendered headings，应仅 presentation test 受影响。
4. Workflow commit：把前五 legacy case 与当前 Delivery case 分开执行，验证 Runtime-only change 只影响 current case。
5. Recovery concurrency：在 CI 重复 multiprocess/blob case，记录 flake/resource 分布；不因一次通过认定稳定。
6. Stale lock：暴露或注入 stale threshold，再以 `threshold + delta` 构造 fixture，避免政策调整误报。

## Catalog, fixture, and protected-file findings

| Surface | Finding | Action |
| --- | --- | --- |
| `tests/regression-catalog.json` | Deep Plan 被 primary 错读；实际 maintained。`workflow-commit` 整文件 maintained，无法隔离 legacy cases。多个 Scenario replacement 只提供相邻能力，不是等价合同。 | 修正 gate 粒度和 replacement 说明；catalog 验证应检测零执行 runner |
| `deep-plan-real-scenario.test.js::fixtureRoot` | 在 temp workspace 写 `.pipeline/state.yaml`, `cycle.yaml`, `rules.yaml` sentinels；虽非当前 repo 写入，但会让 maintained 测试继续合理化旧 protected authority。 | 当前行为测试不需要则删除；若只测 preservation，改成专门 quarantine compatibility fixture |
| C21 M2/M3/M6 helpers | IDs、timestamps、counts 是注入数据；大多数 expectations 从输入派生。 | keep；不要用具体值搜索直接判硬编码 |
| C23 AceSim fixture | project/attempt/rerun IDs 都是输入；lineage expectations 正确派生。 | keep |
| Knowledge / project-linkage fixtures | 具体 C4/project/channel 值合法；caller 的 legacy fallback 与 exact rendering 才是问题。 | fixture keep，caller reclassify/split |
| Scenario shell runners | 多数旧 runner 只做 `rg`/文件存在性；s72 则可零匹配 green。 | 行为 runner 必须证明至少一个目标 case 执行并通过 |

## Zero-omission self-check

- Assigned executable paths: **18**; independently read/audited: **18**.
- Expanded top-level cases: **94**; rows above: **94**.
- Dynamic coverage inspected: C23 recovery phases 2 + malformed lineage 3；Context Capsule seeds 3、cursor corruptions 2；Recovery routing fields 4；Snapshot kinds 2 和 locator/path nested cases。
- Assigned Scenarios: **8**; runners/checklists/config/catalog independently read: **8**.
- Primary comparison: **agree 89 / revise 5 / missing inventory 0**；另列 primary 漏报/事实错误，不将其伪装成新增 test case。
- Production files modified: **none**. Test files modified: **none**. Only this reviewer report was written.

### Frozen inventory reconciliation

- Authority: `audits/INVENTORY.md`, frozen at commit `cd829923957ba09d5d0f1d0aa7ec9b5eecab9d93` with 179 executable files and 76 registered Scenarios.
- Shard 2 executable rows in frozen inventory: **18**; primary paths: **18**; reviewer paths: **18**.
- Executable path diff: **missing 0 / extraneous 0** for both primary and reviewer.
- Shard 2 Scenario rows in frozen inventory: **8**; primary paths: **8**; reviewer paths: **8**.
- Scenario path diff: **missing 0 / extraneous 0** for both primary and reviewer.
- Frozen indices mechanically matched: executable `2,12,...,172`; Scenario `2,12,...,72`. No path was inferred from primary prose alone.
