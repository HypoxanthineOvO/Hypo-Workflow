# Primary Test Contract Audit 05

## 覆盖

按规范化路径排序后，本报告覆盖 zero-based index `% 10 == 5` 的 18 个测试文件与 8 个 Scenario。审计为只读；未执行 mutation，也未修改产品或测试。

测试文件：

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

Scenario：

- maintained: `tests/scenarios/c21/s75-accept-reject`
- quarantined: `tests/scenarios/v1/s08-subagent-self-review`
- quarantined: `tests/scenarios/v2.5/s11-scripts-executability`
- quarantined: `tests/scenarios/v6/s21-check-output`
- quarantined: `tests/scenarios/v8.1/s31-import-history-tags`
- quarantined: `tests/scenarios/v8.2/s41-full-view-flags`
- quarantined: `tests/scenarios/v9/s51-opencode-capability-matrix`
- quarantined: `tests/scenarios/v9/s61-opencode-model-matrix-sync`

## Case 审计

表中“fixture-derived”表示 literal 是本 case 的输入样例并由输入回验，不是所有项目的真值；“contract”表示公开协议或明确产品默认值。

### `analysis-runtime.test.js`

| Item | Contract | Hardcode | Valid-change sensitivity | Failure appropriate | Verdict | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| real execution/boundary decisions | Analysis 记录执行结果并执行边界决定 | action/status/metrics 为 fixture-derived；边界枚举为 contract | 增字段不失败；改协议字段才失败 | 准确 | keep | L18-49，输入与期望同 case |
| outcomes/follow-up proposal | outcome 枚举和 analysis→build handoff | outcome/mode 是 contract；路径为 fixture-derived | 新增 outcome 会因完整数组失败，即协议变化应审阅 | 合理 | keep | L52-69 |
| evidence-oriented evaluation | 评价证据完整性，非代码分析不要求 change validation | criteria ID 是 contract；`M06` 是 fixture | 评价内部重排会因完整数组失败，顺序未见合同 | 可能误报重排 | parameterize | L72-91；断言完整有序 criteria 数组 |
| report contract | 报告绑定 ledger、证据与 telemetry unavailable | 路径/时间由输入派生；字段是 contract | 路径策略合法调整会集中失败于此，合理 | 准确 | keep | L94-116 |
| templates/guidance discoverable | Analysis 模板可发现且不污染 build report | 文件清单与关键词是实现布局；`<cycle-or-milestone>` 是模板合同 | 模板拆分/同义改写会失败 | 可能是偶然文案/布局 | rewrite | L119-144，应验证渲染产物/结构而非散落关键词 |
| batch plan/C3 queue | batch 保留 analysis 字段且 queue 无 confirm gate | `C3` 和真实 `.pipeline/archives/C3-*` 是参考仓库数据 | 移除/归档 C3 即失败，产品未坏 | 不合理，污染全套测试 | rewrite | L147-176，直接读取当前仓库历史归档而非 fixture |

### `bootstrap-migration.test.js`

| Item | Contract | Hardcode | Valid-change sensitivity | Failure appropriate | Verdict | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| proposal APIs exported | migration/root 暴露四个 Bootstrap proposal API | API 名是 contract；`M5/C21` 仅标题/skip 文案 | API 重命名会失败，属公开面变化 | 准确；但 skip 文案过时 | keep | L23-46 |
| Bootstrap remains internal | Bootstrap 不成为公开命令 | `/hw:migrate` 等是负面兼容样例 | 新增正式公开迁移命令会失败，届时合同确实改变 | 准确 | keep | L49-65 |
| proposal authority separation | worker 只产 proposal，不能写 Record；角色隔离、零写 | hash/schema/role 为 contract；IDs 为 fixture | 内部实现重构不影响 | 准确 | keep | L68-109 |
| selection rubric | 只纳入会影响未来决定的有界事实 | candidate 文本为直接 fixture；错误 regex 绑定具体英文 reason | 合法改写 reason 会失败 | 部分偶然文案 | rewrite | L112-143；改为 reason code/schema，不扫英文同义词 |
| deterministic merge | 完成顺序/重复交付不改变结果 | candidate 分片位置是 fixture | 新增字段仍可稳定比较 | 准确 | keep | L146-164 |
| one active leaf | 保留 superseded 且每 dedupe key 一条 active leaf | key 为 fixture；active 总数 `6` 是固定 fixture 数量 | 增加有效独立 candidate 会无意义失败 | 不合理 | parameterize | L167-189；应从 dedupe groups 推导 active 数 |
| conflict/non-proposal fail closed | 多 active leaf 与非 proposal 输入拒绝 | keys/body 是 fixture | 新增合法输入类型会要求合同更新 | 准确 | keep | L192-213 |
| caller Record ID rejected | writer 拥有 Record ID 且拒绝 caller ID、零写 | ID 是 fixture | 内部 writer 重构不影响 | 准确 | keep | L216-227 |
| approved audit zero-write | 完整 source-bound curation 可批准且不改 legacy | fixture-derived | 新增 proposal 元数据不应失败 | 准确 | keep | L230-241 |
| rejection variants | missing/drift/inference/secret/hidden context 全拒绝、不回显、零写 | source path 与 synthetic secret 是刻意 fixture；错误 code regex 是 contract family | 新增 finding 不失败；重命名 code 会失败 | 准确，code 应稳定 | keep | L244-314；五个动态 subcase 均覆盖 |

直接 fixture：`fixtures/c21-m5` 的 C21、项目 ID 与文本均明确标记 synthetic/reference，可作为输入；问题仅是测试把 `active.length === 6` 从样例提升成了行为真值。

### `c23-m4-experiment-supervision.test.js`

| Item | Contract | Hardcode | Valid-change sensitivity | Failure appropriate | Verdict | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| API surface | 纯编译器、store resolution API 可用 | API 名/schema 是 contract；C23/M4 仅标签 | API 兼容破坏才失败 | 准确 | keep | L39-45 |
| fixture modes/review diversity | fixture 同时表达 foreground/tmux、checkpoint 与多因审阅 | 全部为 fixture 输入 | fixture 内容演进会同步审阅 | 准确 | keep | L47-56 |
| deterministic foreground plan | 纯、确定、host authority、无进程事实 | 完整 launch/observation object 含协议字段；argv 来自输入 | 添加可选字段会因 deepEqual 失败 | 可能阻止向后兼容扩展 | split | L59-95；分别断言必需字段与禁用 authority |
| isolated tmux descriptor | session 隔离、长度限制、checkpoint descriptor | 128/哈希长度/字段是协议约束；project ID fixture-derived | 合法 session 格式变化会失败但若仍满足合同不应失败 | regex 过度绑定实现格式 | rewrite | L98-155；验证唯一、字符集、上限、稳定/变化关系即可 |
| checkpoint command binding | resume 只能扩展原命令并绑定 declared artifact | 4 invalid variants 是安全 fixture | 扩展支持更多合法 checkpoint 形式可能误报 | 需逐 variant 审核 | probe | L158-175 |
| tampered tmux rejection | 重算 plan_id 不能绕过 session policy，零写 | fixture-derived | hash 实现变化由 helper 重算，不敏感 | 准确 | keep | L178-200 |
| real foreground smoke | host 可按 descriptor 执行短命令 | stdout literal 来自命令输入 | runner 实现重构不影响 | 准确 | keep | L203-212 |
| tmux smoke isolation | 只创建/清理自身 session，保留既有 sessions | 环境依赖 tmux；name 来自 plan | tmux 不可用会 skip，不污染 | 准确 | keep | L215-246 |
| interruption recovery choice | interrupted 事实与 checkpoint/fallback 策略正确，缺 artifact 零写 | event sequence/refs 由 fixture；策略名 contract | 添加无关字段不失败 | 准确 | keep | L249-303 |
| recovered rerun parent binding | restart evidence 严格绑定 parent Attempt | 时间与 sequence 是 fixture；多 invalid variants | 合法事件扩展或允许额外状态可能被完整数组卡住 | 局部过严 | split | L306-434；保留 parent/顺序不变量，避免整数组等值 |
| operational completion evidence | exit=0 且 log/config/metrics 完整才 completed | 11 invalid variants、路径/时间是 fixture | 新增合法 evidence 类型不应使旧输入失败 | 准确；variant 数不作为断言 | keep | L437-549 |
| scientific review compilation | review 绑定 observation；怀疑不静默确认；多类原因 | status/category 是 contract；fixture 文本 | 新增 cause/category 不失败 | 准确 | keep | L552-579 |
| unsafe/one-cause/drift rejection | review 防单因断言、危险路径、secret、时间漂移 | synthetic secret/time 是安全边界 fixture | 新证据 scheme 可能被当前路径规则拒绝 | 需验证扩展性 | probe | L582-633 |
| persisted review binding | 存储 review 必须绑定 recorded Attempt observation | fixture-derived | 内部存储布局变化可能触发 snapshotTree，但零写是合同 | 准确 | keep | L636-682 |
| recomputed hash bypass rejected | 重算 hash 不能绕过 compiler policy | 5 forge variants 为安全 fixture | policy 扩展需更新相应 case | 准确 | keep | L685-715 |
| one-shot Receipt resolution | target-bound Receipt 只消费一次且保存 decision/rationale | Receipt 字段为 contract | 存储增字段不影响 | 准确 | keep | L718-745 |
| activated recovery | authority 已激活时为同 actor 完成恢复且幂等 | actor/IDs fixture-derived | recovery 内部重构不影响 | 准确 | keep | L748-773 |
| forged actor recovery | forged persisted actor 不消费 Receipt、零写 | fixture-derived | actor model 合法扩展需审阅 | 准确 | keep | L776-810 |
| fresh reread merge | reserve 后并发新增 Attempt 不丢失 | injected attempt fixture-derived | store 内部布局变化不应失败 | 准确 | keep | L813-844 |
| CAS authority drift | fresh read 后 authority drift 拒绝且不消费 Receipt | fixture-derived | CAS 实现替换不影响行为 | 准确 | keep | L847-883 |
| expected_hash preconditions | 文件存在/缺失 hash precondition 均执行 | hash sentinel/schema 为 contract | workspace implementation refactor 不影响 | 准确 | keep | L886-936 |
| review temporal order | resolution 不能早于 review，不预留 Receipt | fixed time 是 fixture | 时间解析实现重构不影响 | 准确 | keep | L939-965 |
| target/state drift | review target substitution 与 Experiment drift 均拒绝 | fixture-derived | 新状态字段不应失败 | 准确 | keep | L968-1026 |
| Core no runner authority | Core 源码不 import child_process/scheduler/tmux execution | 用 regex 扫源码与 import 文案，易漏别名/误报注释 | 合法拆文件/注释/间接 import 可能误报或漏检 | 不可靠架构门 | rewrite | L1029-1036；应使用依赖图/受禁模块规则 |
| persistence facts only | 持久化只含 Experiment facts，不创建 tmux/process/job authority | 文件路径与 forbidden regex；fixture-derived | 新增名含 `job` 的合法研究字段可能误报 | 可能误报 | rewrite | L1039-1077；断言允许 schema 与实际 side effects |

直接 fixture：`c23-m3/{nerf,acesim}.json` 与 `c23-m4/supervision-review.json` 使用不同 project ID，schema/version 和数据均由 case 输入消费，没有把 `hypo-workflow` 或 C23 当全局项目真值；固定时间用于可重复的时序边界，合理。

### `claude-model-routing.test.js`

| Item | Contract | Hardcode | Valid-change sensitivity | Failure appropriate | Verdict | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| default routing metadata | Claude 默认角色模型映射可检查 | 5 个具体模型和 source string 是 target-owned 默认配置的复制 | 任何合理模型升级都失败 | 失败应集中在单一默认合同测试，不应多点爆炸 | parameterize | L15-23；从权威 config 生成 expected |
| rendering/tool guidance | managed frontmatter、角色和 DeepSeek 特有指导 | 大量完整英文片段是偶然文案 | 文案润色导致失败 | 不合理级联 | rewrite | L26-40；验证 frontmatter 与规则 section/semantic marker |
| non-DeepSeek exclusion | 非 DeepSeek 不注入专属规则 | 模型名为 fixture input | 新模型输入不影响 | 准确 | keep | L43-47 |
| artifact ownership | 写 managed agents，保留 user-owned 冲突 | `agent_count=8`、默认模型为复制值 | 合法新增角色或模型升级失败 | 不应因新增角色失败 | parameterize | L50-65；count/expected 从 routing metadata 派生 |
| explicit overrides | project override 胜过 derived defaults | synthetic model strings 是 fixture | 新角色不影响 | 准确 | keep | L68-95 |
| dynamic role selection | task/profile/failure 映射到角色 | category/role 是路由 contract | 新映射不影响旧 case | 准确 | keep | L98-103 |
| project sync | sync 生成 artifacts/metadata/guidance | 再次复制 agent_count、模型、英文文案 | 配置/文案合法变化造成多点失败 | 过度级联 | rewrite | L106-127；保留端到端 override/ownership，expected 派生 |

### `command-exposure.test.js`

| Item | Contract | Hardcode | Valid-change sensitivity | Failure appropriate | Verdict | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| discoverable API | generator-facing discovery API 公开 | API 名为 contract | API 破坏才失败 | 准确 | keep | L24-27 |
| compatibility metadata complete | 每个 compatibility command 有 exposure/backend | registry 条目作为权威输入 | 新命令若缺字段应失败 | 准确 | keep | L29-39 |
| exposure taxonomy | delivery/internal/deferred/removed 分类诚实 | 具体 command→分类映射是产品表，不是仓库样例 | 合法改分类需要合同更新 | 合理 | keep | L42-96 |
| Codex discovery | 仅公开/contextual 且有真实 backend 的命令可发现 | projected 文件路径/命令是适配器合同 | 新公开命令不应因精确全集失败（实现为性质检查） | 准确 | keep | L99-120 |
| re-check backend | discovery 不盲信 registry availability | fixture platform projection | 内部实现变化不影响 | 准确 | keep | L123-132 |
| no leak custom projection | removed/deferred/internal/unavailable 不泄漏 | fixture entries | 扩展 exposure 分类需审阅 | 准确 | keep | L135-结束 |

### `daily-project-summary.test.js`

| Item | Contract | Hardcode | Valid-change sensitivity | Failure appropriate | Verdict | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| Shanghai 00:30 window | 日报窗口的时区与含前不含后边界 | 日期为 fixture；Asia/Shanghai 00:30 是产品配置合同 | 若窗口可配置化，固定默认仍应保留一例 | 准确 | keep | L88-109 |
| aggregate/dedupe | 窗口内跨项目聚合且 stop event 去重 | `hypo-workflow` 等均为输入样例；count 由 fixture | 新字段不影响 | 准确 | keep | L112-134 |
| Chinese failure-first rendering | zh-CN 输出且通知失败先于活动 | 中英文片段来自 fixture；顺序是合同 | 合法文案润色可能失败于具体片段 | 部分偶然 | rewrite | L137-161；验证结构/事实包含，不锁内部 milestone 文案 |
| notification dry-run | 复用 segmentation 且无 QQ/Notion 写 | 服务名是边界合同；segments 数由输入 | segmentation 算法合法调整可能导致完整结构失败 | 需探测 | probe | L164-221 |
| scheduler dry-run | 仅本地证据、CLI entry，无 remote side effect | 路径/时间 fixture-derived | ledger schema 合法扩展不影响 | 准确 | keep | L224-258 |
| notify confirmation/injected runner | notify 需确认，仅显式后调用 injected runner | runner calls 是 fixture | 新通知后端若默认加入可能引发合理失败（远端边界应显式） | 准确 | keep | L261-304 |
| CLI cron dry-run | CLI 可 cron 调用、dry-run 无远端副作用 | `cli/bin/hypo-workflow` 是公开入口 | CLI 重定位会破坏公开接口 | 准确 | keep | L307-334 |

### `delivery-bootstrap-promotion.test.js`

| Item | Contract | Hardcode | Valid-change sensitivity | Failure appropriate | Verdict | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| atomic promotion | accepted Bootstrap 原子创建 proposed Cycle | `AC1/M1` 与时间来自 fixture | 新增 optional manifest 字段不应失败 | 准确 | keep | L116-139 |
| refuse unaccepted | 未 accepted workspace 零写拒绝 | fixture-derived | 状态命名协议变更需更新 | 准确 | keep | L142-153 |
| reject already promoted | placeholder 只能 promote 一次 | fixture-derived | 幂等策略若改为返回 unchanged 属合同变化 | 准确 | keep | L156-结束 |

### `explore-lifecycle.test.js`

| Item | Contract | Hardcode | Valid-change sensitivity | Failure appropriate | Verdict | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| parallel status | 列 active exploration 且不折叠 worktree | IDs/path/time 是 fixture | 新增字段不影响 | 准确 | keep | L19-40 |
| end retains worktree | end 汇总 changed files/commits 且保留 worktree | commit count/path 由输入 fixture | 新 summary 字段不影响 | 准确 | keep | L43-70 |
| archive deletion gate | archive 保留 metadata，删除需明确确认 | fixture-derived | 状态内部实现变化不影响 | 准确 | keep | L73-100 |
| feed plan/analysis | exploration evidence 可进入 discover/analysis | 路径/IDs fixture-derived | 新 consumer 不影响 | 准确 | keep | L103-结束 |

### `history-refresh-preview.test.js`

| Item | Contract | Hardcode | Valid-change sensitivity | Failure appropriate | Verdict | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| deterministic mixed preview | 混合 legacy 生成确定 preview、关联 Plan/Progress、暴露不确定性 | archived/memory counts 从 fixture；`files.size=16` 是内部输出布局 | 合法新增 index/report 文件直接失败 | 不合理 | rewrite | L14-38；删除固定总文件数，断言所需文件集合/关系 |
| generic identity/root C7 | identity 从目标派生，root legacy C7 不漏，动态计数与 marker | sample-product/C7/C008/C009/2 均由本 case 输入派生；`not C22/20` 是回归哨兵 | 新增无关 Cycle 需同步 fixture 期望，合理 | 准确 | keep | L41-93 |
| manifest ID precedence | manifest project_id 胜过 clone/package 名 | synthetic IDs 是 fixture | 添加 identity source 可按 precedence 合同审阅 | 准确 | keep | L96-103 |
| incomplete root state | 无 cycle metadata 仍保留 legacy work item | fallback ID/name 来自输入/明确 fallback contract | 更丰富恢复不应使旧 case 失败 | 准确 | keep | L106-122 |
| naive timestamp without timezone | 不把缺少显式时区、无法可靠比较的 legacy 时间提升为 manifest `created_at`，保持跨机器确定性 | `C001-naive`、`2026-01-01T10:00:00` 是刻意的无时区 fixture；epoch fallback 是当前确定性合同，不是参考仓库数据 | 若未来引入显式且确定的 naive-time policy，此单一 case 应随合同更新；内部 parser 重构不应失败 | 准确表示时间信任边界破坏，不会引发无关级联 | keep | 当前 L133-145；独立临时 workspace，仅从输入构造一个 naive legacy Cycle |
| equivalent manifest byte preservation | 已存在且语义等价的 current manifest 必须原字节保留，包括 operator comment，并记录 `manifest_changed: false` | `existing-project`、comment 和 epoch 是 fixture 输入；`preserve-current`/`manifest_changed` 是激活协议字段 | YAML parser/serializer 或内部比较重构不应失败；只有开始无意义改写等价 authority 时失败 | 准确；byte equality 正是此兼容/所有权合同，而非偶然快照 | keep | 当前 L147-163；expected bytes 直接取本 case 写入的 `manifest` 变量 |
| side-by-side/idempotent | preview 不改 legacy，重复写 unchanged | output path 是公开布局 contract | 新增 preview 文件不影响 | 准确 | keep | L125-137 |
| reviewed preview drift | source 改变不得覆盖已审 preview | C001 path 是 fixture | hash 实现重构不影响行为 | 准确 | keep | L140-149 |
| explicit approval | activation 必须 `approved:true` | approval key 是安全 contract | 新授权机制若兼容旧键不影响 | 准确 | keep | L152-159 |
| stale preview | review 后 source drift 拒绝 | fixture-derived | 新 digest 算法只要一致不影响 | 准确 | keep | L162-174 |
| target conflict zero-write | 已存在冲突 Cycle 时激活前失败 | C001 是 fixture | conflict 合并能力未来若引入需合同更新 | 准确 | keep | L177-192 |
| activate/idempotent/preserve | 激活创建索引、保留 bytes/manifest、可修复、幂等 | counts/paths 来自 fixture；具体中文句是输出文案 | 文案润色可能使最后两 regex 失败 | 局部偶然 | split | L195-结束；保留结构/状态，中文文案仅做语言存在性 |

### `ledger-jsonl-migration.test.js`

| Item | Contract | Hardcode | Valid-change sensitivity | Failure appropriate | Verdict | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| helper exports | 四个 ledger helper 可从 public Core 使用 | API 名为 contract | API 破坏才失败 | 准确 | keep | L16-20 |
| append-only/parseable | append 保留前缀、逐行 JSON 可解析且有序 | event IDs fixture-derived | 添加序列化字段不影响 | 准确 | keep | L22-49 |
| YAML migration | migration 幂等、summary 确定、无重复 | count/IDs/path 从 fixture 派生 | 新 summary optional field 不影响 | 准确 | keep | L52-101 |
| regenerate compact summary | JSONL 为 authority，summary 可覆盖重建且不含 long-form events | `authority=jsonl` 与字段是 contract | 增加其他 compact 字段不影响 | 准确 | keep | L104-134 |
| subsystems use JSONL | 五个子系统写 JSONL authority 而非 ledger.yaml | `hypo-workflow`、时间、路径为 fixture；五 subsystem 是当前影响面 | 新 subsystem 不会自动被覆盖，可能漏检 | 覆盖会陈旧 | parameterize | L137-175；从 ledger writer registry/inventory 驱动 |
| source scan/no broad barrels | 禁止 ledger.yaml 长期写与 public `export *` | regex 扫文本和函数名，是实现细节且可误报/漏报 | 注释、重命名、别名 import 可错误通过/失败 | 不适合作行为测试 | rewrite | L178-197；用 AST/依赖规则及 writer registry |

### `maintenance-ledger.test.js`

| Item | Contract | Hardcode | Valid-change sensitivity | Failure appropriate | Verdict | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| append/redact | maintenance ledger append-only，raw secret 不落盘 | synthetic secret/IDs 是安全 fixture | redaction 扩展不影响 | 准确 | keep | L9-47 |
| evidence path surfaces | scan/dry-run/apply/verify/backup 均有隔离 evidence path | queue ID 是输入；目录名是 storage contract | 合法目录迁移会失败，属于兼容变化 | 准确 | keep | L50-64 |
| zh-CN rendering | status/log 为中文且含关键信息 | 具体中文短语/项目名来自 fixture | 文案润色可能失败 | 偶然文案风险 | rewrite | L67-结束；验证 locale、结构与事实，不锁句子 |

### `opencode-panels.test.js`

| Item | Contract | Hardcode | Valid-change sensitivity | Failure appropriate | Verdict | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| legacy TUI renderer disabled | VSP built-in dashboard 时不生成 plugin TUI | 返回值/平台边界是 contract | 新 dashboard 模式需合同更新 | 准确 | keep | L12-15 |
| emit server/no deprecated TUI | 生成 server/runtime/root config 且无 TUI | managed paths 是 adapter contract | 文件重组会失败，即适配器布局变化 | 合理 | keep | L18-33 |
| generated plugin importable | server plugin 可 import 且暴露 entrypoints | 临时 node-import 文件名是测试实现；入口字段 contract | bundling 改变可能失败，即产物应仍 importable | 准确 | keep | L36-63 |
| remove deprecated helpers | sync 清理自己的旧 managed artifacts | 旧路径列表是 migration contract | 新遗留路径需新增 case | 准确 | keep | L66-88 |
| preserve non-Hypo config | 清 deprecated 引用但保留 user TUI plugin | 路径/字符串为 fixture | config 排序变化不影响 | 准确 | keep | L91-110 |
| render role matrix | 每个配置 role 写到对应 agent/metadata | synthetic overrides 是 fixture | 新 role 不影响旧映射 | 准确 | keep | L113-152 |
| DeepSeek guidance routing | 仅 DeepSeek agents 注入专属工具规则 | 多个英文句子是偶然文案 | 指导润色导致失败大片 | 不合理 | rewrite | L155-173；断言 section marker/选择条件 |
| default metadata matrix | 默认 agent matrix/compaction 被投影 | 900000 与 8 个模型为默认合同复制 | 一次合法模型升级使本文件多个 case 失败 | 级联过大 | parameterize | L176-204；从单一权威 defaults 派生 |
| spec mirrors matrix | spec 文档与默认配置一致且说明非 runner | 固定 YAML 文本/模型是复制值 | 格式或模型更新失败 | 应校验语义数据而非 regex | rewrite | L207-214；生成文档或解析结构 |
| provider-qualified IDs | agent frontmatter 使用 provider-qualified model | 4 个具体模型再次复制 | 合法模型/provider 更新多点失败 | 级联过大 | parameterize | L217-232；输入 defaults→期望 qualification |

### `pr-create.test.js`

| Item | Contract | Hardcode | Valid-change sensitivity | Failure appropriate | Verdict | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| dirty worktree plan | plan 描述 provider/branches/files/确认与远端动作 | host/path/branch 是输入 fixture；action order 是 contract | 新可选 action 若默认加入会失败，需显式安全审阅 | 准确 | keep | L12-42 |
| runtime path blocking | protected runtime 文件默认 block，local PR archive allowed | PR ID/path 是 fixture；protected paths 是安全 contract | 新 protected file 不会自动覆盖 | 可能漏检 | parameterize | L45-64；从 protected-path authority 清单生成 |
| reusable path policy | review/create 共用保护策略 | fixture-derived | 新 archive layout 需合同更新 | 准确 | keep | L67-76 |
| plan-first no writes | 未实现前不安排 remote writes | command flow 是公开 workflow contract | 命令改名需兼容审阅 | 准确 | keep | L79-90 |
| wait confirmation | provider write 前等待确认 | fixture provider | 内部执行重构不影响 | 准确 | keep | L93-110 |
| ordered remote writes | 确认后按顺序 push/create/reviewer/labels 并归档 | call order 是副作用安全合同；PR/time/host 是 fixture-derived | 新 optional remote step 会失败并应审阅 | 准确 | keep | L113-结束 |

### `project-stop-event.test.js`

| Item | Contract | Hardcode | Valid-change sensitivity | Failure appropriate | Verdict | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| terminal classifications | terminal statuses 映射 stop reason 并携 project identity | `hypo-workflow` 从 BASE_INPUT 派生，不是全局真值 | 新 terminal status 不自动覆盖 | 可能漏检 | parameterize | L36-53；从状态枚举/transition table 驱动 |
| chat pause not stop | 普通 pause/user 文本不触发 stop | 文本为负面 fixture | classifier 扩展不影响 | 准确 | keep | L56-77 |
| intermediate milestone | 可自动继续时 milestone completion 不 stop | fixture-derived | continuation policy 改变属合同变化 | 准确 | keep | L80-97 |
| local-only event | event 是本地 append-only evidence，无外部 action | `/home/heyx/...` 等均为输入 fixture并逐项回验；禁词 regex 较宽 | 新合法字段含 `send` 可能误报 | 局部过严 | rewrite | L100-124；断言 capability flags/actions，而非 JSON 禁词 |
| stable dedupe | 同 terminal state 跨 occurred_at 得相同 id/key | fixture-derived | ID hash实现变化只要稳定可通过（未锁完整 hash） | 准确 | keep | L127-143 |

### `rejection-rework-blocked-runtime-loop.test.js`

| Item | Contract | Hardcode | Valid-change sensitivity | Failure appropriate | Verdict | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| rejection artifact | rejection 结构携审计/rework/block 信息 | C11/M05/F001/time 均由 input 回验；schema 1 是 contract | 新字段不影响 | 准确 | keep | L53-72 |
| deterministic rework route | rejection 路由 implement+test，非静默/非 acceptance | role/action/reason 是 workflow contract | 新必需 reviewer role 会失败，属合同变化 | 准确 | keep | L75-88 |
| blocked approval separation | 仅 implement 提议 blocked，仅 audit 批准且不得自批 | roles/status 为安全 contract | 新角色 alias 需兼容审阅 | 准确 | keep | L91-129 |
| rework linkage | 保留 source prompt，仅增量 scope，不允许无关范围 | fixture-derived；role set contract | 新可选 evidence 不影响 | 准确 | keep | L132-146 |

### `semantic-workflow-prompts.test.js`

| Item | Contract | Hardcode | Valid-change sensitivity | Failure appropriate | Verdict | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| Chinese-first/no internals | Router/skills 有中文且不暴露 model internals | 文件清单是公开 skill surface；regex 是安全/语言启发式 | 新 skill 不自动覆盖；技术英文为主的合法内容可能仍有一个汉字而误过 | 覆盖和信号偏弱 | parameterize | L31-38；从 manifest skill inventory 驱动并检查 user-facing sections |
| Cycle/Plan semantics | Cycle container、Plan 完整镜像语义存在 | 四句完整中文是偶然文案 | 同义改写会失败 | 不合理 | rewrite | L41-52；解析稳定 requirement IDs/结构化规则 |
| Claude thin adapters | 每 adapter 薄且委托单一 skill、不泄漏 internals | `<=16` 是任意行数阈值，command 文件列表可能手写 | 注释/格式化即失败，新增 command 可能漏检 | 不准确 | rewrite | L55-70；验证 frontmatter+唯一 skill reference，取消固定行数 |
| OpenCode thin adapters | 同上，OpenCode adapter | 同样 `<=16` 与手写 command list | 同上 | 不准确 | rewrite | L73-90 |
| exact Hook key set | Codex 仅注册语义 conversation/recovery/progress/safety Hooks | 对 hook keys 做完整数组等值 | 合法新增 `PostToolUse` 会让测试失败，即当前需求会触发大面积无关阻塞 | 过度封闭 | rewrite | L93-102；按每 hook capability/allowlist 分类，允许新增合规 hook |
| Hook context hides internals | 注册 Hook 输出上下文且不暴露内部协议 | `PLAN.md/PROGRESS.md/Discussion Ledger` 是恢复 contract；中文“长期”偏文案 | 同义文案会失败 | 局部偶然 | split | L105-122；结构化检查 required refs + forbidden protocol |

### `sync-derived-map.test.js`

| Item | Contract | Hardcode | Valid-change sensitivity | Failure appropriate | Verdict | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| artifact declarations | derived map 声明 authority/writer/trigger/protection | `.pipeline/PROGRESS.compact.md/state.yaml` 是 storage contract | 新 artifact 不影响 | 准确 | keep | L13-30 |
| check-only | check 报 stale 且零写 adapter | path 是 contract；fixture root synthetic | 新 check operation 不影响 | 准确 | keep | L33-49 |
| standard repair | repair 刷新 safe derived，不写 protected authority | output contents 来自 fixture | 文案仅匹配输入片段 | 准确 | keep | L52-66 |
| authority conflict | conflict 报告且 protected file 不变 | repair_hint 英文 regex 是偶然文案 | 同义改写会失败 | 局部不合理 | rewrite | L69-91；断言 reason code/status/authority refs |

### `workspace-format.test.js`

| Item | Contract | Hardcode | Valid-change sensitivity | Failure appropriate | Verdict | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| canonical serialization | legacy YAML/frontmatter 语义、稳定 hash/order | sample content/timestamp 是 fixture；hash shape contract | serializer 内部替换不影响 | 准确 | keep | L31-76 |
| six format classification | 六类 workspace 检测且零写 | “six”来自当前枚举，cases 定义输入；完整分类是 contract | 新格式加入时此 case 应明确更新 | 准确 | keep | L79-135；六个动态 subcase 均覆盖 |
| manifest precedence | valid manifest 胜过 brownfield residue | fixture-derived | 新 residue 不影响 | 准确 | keep | L138-146 |
| sidecars tolerated | chats/inbox 不成为 authority | sidecar paths 是兼容 contract | 新 sidecar 可新增 case | 准确 | keep | L149-163 |
| unknown entries residue | 未知 top-level pipeline entry 仍为 legacy residue | entry name fixture | detector 内部重构不影响 | 准确 | keep | L166-175 |
| invalid manifest damaged | 可解析但 schema-invalid manifest 是 damaged_current | schema字段是 contract | schema 扩展若使 fixture 合法，case 需换 invalid input | 准确 | keep | L178-187 |
| missing root empty | 不存在 root 分类 empty 且不创建 | temporary path fixture | 内部实现不影响 | 准确 | keep | L190-200 |

## Scenario 审计

| Item | Contract | Hardcode | Valid-change sensitivity | Failure appropriate | Verdict | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| c21/s75 accept-reject | 当前 Cycle reject→revise→restart→accept 的 Receipt/manual acceptance E2E | `C21/S75/M6` 仅场景标签；test-name regex 锁具体测试标题和文件 | 测试重命名/拆分会无行为破坏却失败或匹配零项 | 不合理 | rewrite | `run.sh` 应调用稳定 scenario entry/API，并验证实际执行 test 数非零 |
| v1/s08 subagent-self-review | 历史 subagent reviewer/fallback | `state.yaml/log.md`、`execution.mode=subagent` 是已退役 runtime；无 run.sh，pending | 当前架构任何变化都无法由此有效判定 | quarantined 合理但无执行价值 | remove | checklist-only legacy evidence 可移 archive，不应作为 test inventory |
| v2.5/s11 scripts executability | 历史 shell helpers 可执行 | 固定 plugin version `8.4.0`、旧 scripts/state/log/plugin hooks | 任意正常版本升级必失败；且无 run.sh | 完全错误硬编码 | remove | checklist 明确锁旧版本/退役接口 |
| v6/s21 check output | `/hw:check` 六项与 emoji 文本格式 | 固定 6 项、emoji、英文 label、旧 spec | 合法增减检查或本地化即失败 | 保护偶然文案 | remove | quarantined run.sh 仅 `rg` 文档，无行为验证 |
| v8.1/s31 import-history-tags | 旧 init import-history tag splitting 文档 | `M0-v1.0/cycle-0-legacy` 与命令文案固定 | 新 History Refresh 架构下必然陈旧 | 失败不代表当前合同破坏 | remove | quarantined，纯文档字符串扫描 |
| v8.2/s41 full-view-flags | 旧 status/log/report compact bypass | 已移除 skills 与 legacy state/log 文件名；`M3` 固定 | 当前语义架构变化会整组失败 | 不再适用 | remove | quarantined，run.sh 指向退役命令文件 |
| v9/s51 capability matrix | OpenCode capability docs/command mapping | checklist 说 36、run.sh 锁 53；枚举 42 command，README 固定“53” | 增删命令或文档改版造成大片失败；内部自相矛盾 | 无可信合同信号 | remove | quarantined 且 count/列表三者不一致 |
| v9/s61 model matrix sync | override 渲染、不泄漏私有键、legacy defaults | override 为良好 fixture；legacy 部分复制具体模型和 900000，文档表格字符串 | 合法默认模型升级导致多处失败；override 行为仍有价值 | 应拆当前 override 合同与旧 defaults | split | 保留 synthetic override/E2E；默认值从权威配置派生，删除文档行 regex |

## Findings

### 高

1. `analysis-runtime.test.js` 直接读取 `.pipeline/archives/C3-*` 的真实项目历史。它把参考仓库状态变成全套测试前置条件；历史整理、移除或项目复用都会产生与产品行为无关的失败。应改成隔离 fixture。
2. `semantic-workflow-prompts.test.js` 对 Hook key 做完整集合等值。任何新增合规 Hook（包括本 Cycle 讨论的 `PostToolUse`）都会立即失败，测试保护的是旧实现封闭集合而非 Hook 能力/安全合同。
3. quarantined `v9/s51` 同时声称 36、检查 53、手列 42 个 command，且再扫描 README 的固定数量。该测试自相矛盾，不能作为发布证据。
4. `ledger-jsonl-migration` 与 C23 M4 使用源码正则承担架构边界，既可被别名/间接调用绕过，也会因注释、命名或合法字段误报；属于“看似严格、实际信号不可信”的测试。

### 中

1. Claude/OpenCode 默认模型、agent count、900000 context target 在多个 unit、生成物、spec 和 Scenario 中重复。一次有效默认模型升级会造成跨文件失败大片；应从单一权威配置派生，仅保留一个默认合同验证与各投影一致性验证。
2. `history-refresh-preview` 的 `files.size === 16` 固化内部输出数量；History Refresh 新增合法索引/报告也会失败。新加入的 generic identity/root C7 case 本身是输入派生的有效回归测试，不应删除。
3. 多个 prompt/rendering test 锁整句中英文与 `<=16` 行，文案、换行和注释调整会无意义失败。应改稳定语义标识、frontmatter、结构和禁止能力检查。
4. bootstrap active leaf 数量 `6`、project-stop terminal status 列表、PR protected paths、ledger subsystem 列表均手工复制 inventory；容易漏新增项或在 fixture 扩展时误报，应由权威 registry/schema 推导。
5. maintained S75 用 `--test-name-pattern` 绑定另一个测试的自然语言标题，重命名会失败，且需显式确认至少执行一个匹配测试。

### 低

1. 多数 Cycle/Milestone/项目名/时间 literal 是直接 fixture 输入并由输出回验，属于合理样例，不是全局硬编码；不应机械删除。
2. schema version、协议字段、公开命令、安全角色分离、Receipt one-shot、protected authority 与明确默认时区属于合法合同常量，可继续测试。
3. C23 M4 的完整 object/数组 deepEqual 有少量向后兼容扩展风险，宜拆成必需字段、禁止字段与关系不变量，而不是取消行为测试。

## 反事实 Probe 候选

1. `analysis-runtime`: 临时移动/重命名真实 C3 archive，确认该 case 在产品代码未变时失败；随后用临时 fixture 证明可隔离。
2. `semantic-workflow-prompts`: 增加一个内容安全的空 `PostToolUse` registration，确认 exact hook key 集合产生无关失败；验证 capability-based 替代断言。
3. Claude/OpenCode routing: 仅通过权威默认配置将一个模型升级为 synthetic next model，统计当前失败 case，确认是否跨 unit/spec/scenario 过度级联。
4. `history-refresh-preview`: 仅新增一个合法 preview metadata 文件，确认 `files.size === 16` 失败而行为合同仍成立。
5. C23 M4 session: 改用另一种仍满足字符集、唯一性、128-byte 上限的合法 session name 格式，确认格式 regex 是否误杀。
6. C23 M4 review path: 增加一种安全的 evidence URI scheme，判断 unsafe-path rejection 是否把扩展能力误判为漏洞。
7. daily summary segmentation: 保持内容/remote-write 边界不变，仅调整分段长度，观察断言是否无关失败。
8. maintained S75: 改名被调用的 node:test 标题，确认 scenario 可能运行零 case 或错误失败；替换为稳定 entry 后复测。

## Catalog / Fixture 问题

- Catalog 对 7 个明显退役且多为纯 `rg`/checklist 的 Scenario 使用 `quarantined` 是分类事实，但仍把它们留在可执行 inventory 会制造维护噪声。建议 archive/remove 无当前合同价值的 6 个，拆分保留 s61 的 override E2E。
- `fixtures/c21-m5`、`c23-m3`、`c23-m4` 的具体项目/Cycle/时间均明确是 synthetic 输入，可保留；不要把具体值变成 output 总数或全局默认。
- `analysis-runtime` 缺少自己的 batch queue fixture，错误借用真实 `.pipeline/archives/C3-*`。
- 默认 model matrix 缺少“单一权威 expected provider”；测试、spec 和 Scenario 各自复制 literal。
- protected path、terminal status、ledger writer/subsystem 清单需要可枚举 authority，避免手工测试列表漂移。

## 零遗漏自检

- [x] 依据 `rg --files core/test | sort` 使用 `(NR-1) % 10 == 5` 重算，18/18 文件均在报告中。
- [x] 每个顶层 `test(...)`、`migrationBehavior(...)`、`discoveryBehavior(...)`、`supervisionTest/storeTest/reviewTest(...)` 均有独立表格行；bootstrap 五个动态 rejection subcase、workspace 六个 format subcase和 C23 M4 动态 invalid variants已在对应行明确覆盖。
- [x] 并行修改后重新扫描 `history-refresh-preview.test.js`；新增的 naive timestamp 与 equivalent manifest byte-preservation 两个顶层 case 已补审，均完成五项判断，与 reviewer-05 形成双覆盖。
- [x] 依据 catalog 两类 Scenario 合并后按 path 排序并取 `% 10 == 5`，8/8 Scenario 均有独立表格行。
- [x] 已读取每个 Scenario 的 checklist/run.sh（若存在）及测试直接 fixture；未把 fixture literal 自动判作非法硬编码。
- [x] 每行均回答保护合同、硬编码分类、有效修改敏感性、失败合理性和处置，并给出 evidence。
- [x] 仅写入本报告；未改产品、测试、catalog 或 fixture。
