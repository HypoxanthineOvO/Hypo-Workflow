# Primary 测试合同审计：shard 0/10

## 结论

本分片覆盖 18 个测试文件、118 个顶层 test case、15 个显式或表驱动子 case、8 个 Scenario，并专项审计 `tests/run_core_tests.mjs` 与 inventory 完整性。发现 3 个高风险合同问题：Core runner 的发现规则与 C023 inventory 定义不一致；`new-format-single-writer` 把参考 fixture 的 `7/6/22` 数量冻结为产品真值；`project-events` 把特定项目、URL、日期和 Writer 目录布局写进通用事件路由期望。另有多组已 quarantine 的文档字符串、退役 CLI 和固定规模测试，应删除或改为行为测试，不能重新进入 release gate。

## 覆盖清单

### Core 文件（规范化排序 index `% 10 == 0`）

| Index | Catalog | Path | Top cases | Nested cases |
| ---: | --- | --- | ---: | ---: |
| 0 | quarantined | `core/test/acceptance-policy-status.test.js` | 12 | 0 |
| 10 | quarantined | `core/test/audit-memory-contract.test.js` | 5 | 0 |
| 20 | maintained | `core/test/c23-m1-experiment-boundary.test.js` | 10 | 0 |
| 30 | quarantined | `core/test/chat-mode-spec.test.js` | 5 | 0 |
| 40 | quarantined | `core/test/claude-status-surface.test.js` | 4 | 0 |
| 50 | maintained | `core/test/concurrent-work-placement-contract.test.js` | 10 | 7 |
| 60 | quarantined | `core/test/deep-plan-integration.test.js` | 4 | 0 |
| 70 | quarantined | `core/test/execution-lease.test.js` | 5 | 0 |
| 80 | quarantined | `core/test/global-config-registry.test.js` | 6 | 0 |
| 90 | quarantined | `core/test/ink-tui.test.js` | 7 | 0 |
| 100 | quarantined | `core/test/log-evidence.test.js` | 7 | 0 |
| 110 | maintained | `core/test/new-format-single-writer.test.js` | 7 | 3 |
| 120 | maintained | `core/test/plan-stone-lifecycle.test.js` | 3 | 0 |
| 130 | quarantined | `core/test/project-events.test.js` | 5 | 0 |
| 140 | maintained | `core/test/record-store.test.js` | 13 | 0 |
| 150 | maintained | `core/test/root-skill-router.test.js` | 7 | 5 |
| 160 | quarantined | `core/test/skill-quality.test.js` | 6 | 0 |
| 170 | quarantined | `core/test/watchdog-lease.test.js` | 2 | 0 |

### Scenario（规范化排序 index `% 10 == 0`）

| Index | Catalog | Path |
| ---: | --- | --- |
| 0 | maintained | `tests/scenarios/c21/s70-init-current` |
| 10 | quarantined | `tests/scenarios/v0/s02-resume-interrupt` |
| 20 | quarantined | `tests/scenarios/v11/s65-audit-memory-handoff` |
| 30 | quarantined | `tests/scenarios/v5/s16-plan-discover` |
| 40 | quarantined | `tests/scenarios/v6/s26-release-dry-run` |
| 50 | quarantined | `tests/scenarios/v8.1/s36-import-history-non-git` |
| 60 | quarantined | `tests/scenarios/v8.3/s46-showcase-slides-poster` |
| 70 | quarantined | `tests/scenarios/v9/s56-agents-ask-todo-plan-discipline` |

## 判定图例

- `S`：稳定产品/安全/协议常量；`F`：由 fixture 输入限定的样例值；`R`：参考仓库、退役表面或偶然输出硬编码。
- 敏感性 `低`：内部重构或兼容扩展通常不失败；`中`：合法输出/能力扩展可能需要无关改测；`高`：新增合法数据或任意文案变化即失败。
- “失败合理”中的 `是` 指失败能准确反映合同破坏；`部分` 指同一 case 混合了真实合同与偶然值；`否` 指主要反映快照/文案/规模漂移。

## 逐 case 审计

### `acceptance-policy-status.test.js`

| Item | Contract | Hardcode | Valid-change sensitivity | Failure appropriate | Verdict | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| config defaults/override | acceptance 配置合并优先级 | `72/3` 为当前默认 S，`12/2/24/4` 为 F | 中：默认策略合法调整会失败 | 部分 | split | L26-52；把默认值合同与 override 行为分开 |
| timeout deterministic status | timeout 仅派生状态、不后台写 | 时间和时长均为 F | 低 | 是 | keep | L54-80 |
| rejection template | 拒绝反馈字段完整、迭代保留 | `P001`、时间、文案为 F | 低 | 是 | keep | L82-100 |
| OpenCode/TUI acceptance status | 状态表面显示派生 acceptance | `Demo/C4`、时间、显示词为 F/R | 中：UI 文案调整会失败 | 部分 | split | L102-140；模型字段保留，显示 regex 单测分离 |
| audit-insufficient blocks | 审计不足阻止 acceptance | worker id/路径为 F | 低 | 是 | keep | L142-174 |
| shared implement/test blocks | recommended 分工阻止共享 worker | `self` 为 F | 低 | 是 | keep | L176-204 |
| Codex authorization/scope | Codex 必须授权 start+resume | `/hw:start`,`/hw:resume` 为公开 S | 低 | 是 | keep | L206-252 |
| non-Codex authorization | Codex 专属 gate 不误用于其他 host | host 列表为兼容 S | 中：新增 Claude alias 需改表 | 是 | parameterize | L254-280；从支持 host registry 派生 |
| unavailable evidence no bypass | unavailable 不可绕过角色分离 | reason 为 F | 低 | 是 | keep | L282-312 |
| mode off allows sharing | 显式 off 关闭分工 gate | `off` 为枚举 S | 低 | 是 | keep | L314-336 |
| runtime worker mirror | step evidence 派生角色镜像 | step 名/worker id 为协议样例 F | 中：新增 executor 形态不应破坏旧例 | 是 | keep | L338-357 |
| ignore internal subtasks | runtime observation 不可冒充审计证据 | source/evidence_scope 为协议 S | 低 | 是 | keep | L359-383 |

### `audit-memory-contract.test.js`

| Item | Contract | Hardcode | Valid-change sensitivity | Failure appropriate | Verdict | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| cycle memory fixture | requirement/rule/decision 可持久化且 raw chat 非 authority | `C11` 与三个 `length=2` 为 F | 高：fixture 新增合法条目即失败 | 部分 | parameterize | L10-24；从 fixture 内容/最小非空派生，不冻结数量 |
| milestone delta fixture | delta 继承 cycle memory 并限制可见域 | `C11/M02`、`length=2`、路径为 F | 高 | 部分 | parameterize | L26-39 |
| scoped handoff fixtures | plan/start/resume 保留摘要且隐藏 raw chat | 命令为公开 S，C11/M02 路径为 F | 中 | 是 | parameterize | L41-57；refs 从输入读取 |
| runtime API merge/render | validation/merge/path builder 合同 | C11/M02 和固定合并顺序为 F | 中 | 部分 | probe | L59-92；增加另一组 ID/数量反事实 |
| raw conversation not sole authority | authority 必须来自结构化来源 | 字段名为协议 S | 低 | 是 | keep | L94-129 |

### `c23-m1-experiment-boundary.test.js`

| Item | Contract | Hardcode | Valid-change sensitivity | Failure appropriate | Verdict | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| generic Runtime cannot create Experiment | domain Store 单写者、拒绝零写 | ID/时间为 F；schema `1` 为 S | 低 | 是 | keep | L18-30 |
| supersede target substitution | Receipt 绑定 replacement 全量语义 | NeRF 名称为 F | 低 | 是 | keep | L32-63 |
| baseline target substitution | baseline change Receipt 防目标替换 | baseline IDs/code ref 为 F | 低 | 是 | keep | L65-102 |
| consumed Receipt replay | Receipt 单次消费且 replay 零写 | ACESim 名称为 F | 低 | 是 | keep | L104-123 |
| unknown baseline ID | attempt 必须引用 baseline history | `baseline-does-not-exist` 为 F | 低 | 是 | keep | L125-140 |
| execution timestamps required | attempt 必须有执行时间 | fixture ID 为 F | 低 | 是 | keep | L142-158 |
| duplicate persisted attempt IDs | persisted authority 读取时拒绝重复 identity | runtime path 由 object ID 派生，schema 为 S | 低 | 是 | keep | L160-194 |
| authority-activated recovery | 激活后中断最终化 authority 并终结 Receipt | phase 名为内部 recovery seam S | 中：事务 phase 重构会失败 | 是 | keep | L196-222 |
| pre-activation recovery | 未激活中断回滚并补偿 Receipt | 同上 | 中 | 是 | keep | L224-251 |
| consume interruption recovery | authority/Receipt 已终结时恢复幂等 | 同上 | 中 | 是 | keep | L253-281 |

### `chat-mode-spec.test.js`

| Item | Contract | Hardcode | Valid-change sensitivity | Failure appropriate | Verdict | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| chat spec/commands append mode | `/hw:chat` append 语义 | 文档标题与句子 R | 高：改写文案即失败 | 否 | rewrite | L5-21；改测 registry/解析行为 |
| state optional chat session | chat 不替代 Cycle/Patch authority | YAML 示例字符串 R | 高 | 否 | rewrite | L23-40；schema validator 行为 |
| log/progress chat rows | chat timeline 投影 | Markdown 表头/文案 R | 高 | 否 | rewrite | L42-65 |
| hook recovery/fallback docs | Hook 缺失时仍可恢复 | 文档关键词 R | 高 | 否 | rewrite | L67-93；执行 hook-off 恢复 |
| OpenCode map chat | 公开路由存在且指向正确 agent | command/agent 为兼容 S | 低 | 是 | keep | L95-101 |

### `claude-status-surface.test.js`

| Item | Contract | Hardcode | Valid-change sensitivity | Failure appropriate | Verdict | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| compact status model | PROGRESS/状态派生 compact model | `M05/M06,5/7`、标题、fallback 顺序为 F/R | 高：fixture扩展即失败 | 部分 | parameterize | L14-32；按输入派生，不固定行数/标题 |
| markdown shared model | renderer 呈现关键字段且脱敏 | 精确文案、M06 路径为 F/R | 中 | 部分 | split | L34-47；结构/脱敏与措辞分离 |
| monitor manifest | Claude monitor 触发配置 | 命令、event、名称若公开则 S | 中 | 是 | keep | L49-60 |
| Progress hook refresh | FileChanged 刷新 Claude snapshot | `.pipeline/PROGRESS.md` 为兼容 S，M06为F | 中 | 部分 | parameterize | L62-77 |

### `concurrent-work-placement-contract.test.js`

| Item | Contract | Hardcode | Valid-change sensitivity | Failure appropriate | Verdict | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| generalized root API | Work Item/Repository/Placement API 可用 | 方法名为公开 API S | 中：API 演进可新增但不影响 | 是 | keep | L49-62 |
| Work Item refs | delivery/experiment 合法，activity 非 Work Item | kind 为协议 S | 低 | 是 | keep | L64-77 |
| repository identity/locator | identity 稳定、locator 可更新、拒绝 traversal/旧 generation | Cryo 名称/路径为 F | 低 | 是 | keep | L79-121 |
| placement matrix parent | 决策覆盖 shared/worktree/resource/blocked | fixture 名称为 F，decision 枚举 S | 低 | 是 | keep | L123-229 |
| matrix: pinned read | pinned 同 snapshot 且输出隔离可共享 | IDs/path 为 F | 低 | 是 | keep | L147-154 |
| matrix: immutable snapshot differs | 不同 snapshot 要 worktree | IDs 为 F | 低 | 是 | keep | L156-161 |
| matrix: source build | source mutation 要 worktree | integration target 为 F | 低 | 是 | keep | L163-172 |
| matrix: relocatable cache | mutable relocatable cache 要资源隔离 | locator suffix 由输入 F | 低 | 是 | keep | L174-184 |
| matrix: fixed output overlap | 固定输出冲突阻塞 | `/data/Cryo` 为 F | 低 | 是 | keep | L186-192 |
| matrix: dirty checkout | 无归属 dirty workspace 阻塞 | 枚举为协议 S | 低 | 是 | keep | L194-203 |
| matrix: exclusive GPU | exclusive resource 冲突阻塞 | `gpu-0` 为 F | 低 | 是 | keep | L205-215 |
| Cryo dual lanes | 多仓 lane 可获兼容隔离 placement、host argv 安全 | `Cryo/Accel-Sim/Trace` 为参考场景 F | 中：作为命名场景合理，但不能证明任意项目 | 是 | probe | L231-268；增加匿名/改名 fixture probe |
| Session selection | 一个 Session 选一个 Work Item，未绑定不继承 foreground | host/id 为 F | 低 | 是 | keep | L270-315 |
| cross-process exclusive race | 原子 lease 只能一方获资源，旧 fencing 不能释放赢家 | GPU/id 为 F | 低 | 是 | keep | L317-352 |
| expiry/renewal | 过期解绑、owner 可续、替代 owner 后旧 token 无效 | 固定 clock/TTL 为 F | 低 | 是 | keep | L354-406 |
| integration gate | source-changing Delivery 无验证集成证据不得 acceptance | accel 名称/路径为 F；安全规则 S | 低 | 是 | keep | L408-524 |
| legacy coexistence | 无 Repository registry 时 legacy Delivery/Experiment 共存 | legacy fixture 为兼容 F | 中 | 是 | keep | L526-705 |

### `deep-plan-integration.test.js`

| Item | Contract | Hardcode | Valid-change sensitivity | Failure appropriate | Verdict | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| single compatibility route | Deep Plan 唯一路由及边界 | `54` 为退役规模 R；route 字段可为 S | 高：合法增删命令即失败 | 部分 | rewrite | L16-32；只测唯一目标 route，不测全表数量 |
| OpenCode artifact generation | artifacts 来源于 registry、无旁路拼接 | 文件名/route为S | 低 | 是 | keep | L34-49 |
| Claude generated command | Claude namespace 映射 | `command_count=54` 为 R | 高 | 部分 | rewrite | L51-61；去掉总数断言 |
| docs/references integration | Deep Plan 边界文档存在 | `53` 和大量英文句子 R | 高 | 否 | remove | L63-89；行为合同由 registry/skill parser 覆盖 |

### `execution-lease.test.js`

| Item | Contract | Hardcode | Valid-change sensitivity | Failure appropriate | Verdict | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| fresh foreign blocks | 新鲜外部 lease 阻止 resume | 时间/人名/C5 为 F | 低 | 是 | keep | L9-33 |
| expired takeover | 过期 lease 可接管且生成 inferred stall | 时间/id 为 F | 低 | 是 | keep | L35-59 |
| reported failure takeover | 明确 platform failure 可接管 | `429` 为 F | 低 | 是 | keep | L61-85 |
| malformed repair | malformed lease 给修复指引 | `/hw:check` 若公开为 S | 中：文案变化 regex 宽松 | 是 | keep | L87-97 |
| handoff stricter bounds | handoff 不能扩大权限/自动继续 | permission 枚举 S | 低 | 是 | keep | L99-126 |

### `global-config-registry.test.js`

| Item | Contract | Hardcode | Valid-change sensitivity | Failure appropriate | Verdict | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| default global config | 默认角色/acceptance/sync/knowledge | 模型名和 role 顺序 R，枚举默认可为 S | 高：模型轮换即失败 | 部分 | split | L20-35；schema 默认与部署模型选择分离 |
| role-to-agent matrix | 自定义 role 映射并保留显式 override | agent 名矩阵 R/退役 | 高 | 否 | reclassify | L37-74；若恢复产品面，从 registry 参数化 |
| lazy config migration | read 零写，save backup，语义迁移 | v10/date/backup regex 为 F | 低 | 是 | keep | L76-109 |
| project registry identity | 路径规范化产生稳定 ID并保存摘要 | C4/名称为 F | 低 | 是 | keep | L111-137 |
| init-project registration | CLI init 注册项目 | 退役 CLI R | 高 | 否 | remove | L139-156 |
| schema/spec fields | config 能力在 schema/docs 同步 | 字段名可 S，章节标题 R | 高 | 部分 | rewrite | L158-176；schema validator + docs link checker |

### `ink-tui.test.js`

| Item | Contract | Hardcode | Valid-change sensitivity | Failure appropriate | Verdict | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| global TUI model/snapshot | TUI 投影项目、配置和动作 | exact action 顺序、标题文案、Demo/C4 为 R/F | 高 | 部分 | split | L19-78；model 能力与展示文案分离 |
| no-command setup/TUI | 首次 setup、之后进入 TUI | CLI 输出文案 R | 高 | 否 | remove | L80-99；退役 CLI |
| hw alias/deps | package 暴露 alias 与运行依赖 | package keys 为发布 S | 低 | 是 | keep | L101-111 |
| init registry in TUI | init 后 registry 出现在 snapshot | 退役 CLI与`initialized`文案R | 高 | 否 | remove | L113-134 |
| config target separation | global/project config target 不混写 | path/field为协议S | 低 | 是 | keep | L136-166 |
| config edit gate | stage diff、validate、confirm、保护文件、sync guidance | protected paths S，`hw:sync --light`/文案 R | 中 | 部分 | split | L168-244 |
| read-only dashboard | dashboard 只读且用 canonical model | M02/固定 snapshot 文案 F/R | 高 | 部分 | parameterize | L246-311 |

### `log-evidence.test.js`

| Item | Contract | Hardcode | Valid-change sensitivity | Failure appropriate | Verdict | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| current lifecycle log | validator 接受真实 event families | **读取当前仓库 `.pipeline/log.yaml`，项目数据 R** | 高：任意项目日志变化可失败 | 否 | rewrite | L16-23；必须用封闭 fixture |
| gate feedback statuses | gate 状态合法且 feed 过滤 step noise | 状态枚举若公开 S，日期 F | 低 | 是 | keep | L25-65 |
| Recent sorting/filtering | feed 按时间排序并过滤 heartbeat | IDs/时间为 F | 低 | 是 | keep | L67-82 |
| release/quality records | validator 接受 event family/status | 枚举 S，时间 F | 低 | 是 | keep | L84-96 |
| status feed redaction | status feed 排序、过滤、脱敏 | secret样例F | 低 | 是 | keep | L98-117 |
| shared redaction | key/header/cookie/password/private key 脱敏 | secret key patterns 为安全合同 S | 低 | 是 | keep | L119-135 |
| writer redacts/block leak | 持久化前脱敏，成功报告泄密则 block | event/path为F/S | 低 | 是 | keep | L137-175 |

### `new-format-single-writer.test.js`

| Item | Contract | Hardcode | Valid-change sensitivity | Failure appropriate | Verdict | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| writer APIs published | migration/root 导出 writer API | API names 为公开 S | 低 | 是 | keep | L51-57 |
| fixture portable/bounded | fixture 不复制 live pipeline、无路径/secret/hidden reasoning | **exact 13-file list R**，安全 regex S | 高：增加合法 fixture 输入即失败 | 部分 | split | L59-85；安全检查保留，文件由 fixture manifest 派生 |
| clone byte identity | 同输入在独立 root 字节一致 | `Redacted C21...` 文案 R | 中 | 部分 | rewrite | L87-97；仅比较树，不匹配偶然标题 |
| extractor order determinism | extractor 完成顺序不影响 stage bytes/semantic hash | 固定 mtime 为 F | 低 | 是 | keep | L99-126 |
| stage rejection parent | 非 proposal/拒绝 audit/source drift 均零写拒绝 | case names/codes 为协议样例 | 低 | 是 | keep | L128-169 |
| reject: non-proposal | authority role 不是 proposal 时拒绝 | 字段枚举 S | 低 | 是 | keep | L131-136 |
| reject: rejected audit | audit rejected 时拒绝 | status/code为S/F | 低 | 是 | keep | L138-145 |
| reject: source drift | audit 后 source 内容变化时拒绝 | constraint path为F | 低 | 是 | keep | L147-153 |
| writer record ownership | writer 分配 ID/schema/dedupe/唯一 active leaf | **`records=7`,`keys=6`、具体 dedupe/body R** | 高：新增合法 fixture record 即失败 | 部分 | rewrite | L171-201；期望从 stage proposal 派生 |
| legacy writer fence | activation 冻结 legacy writer、新 writer只写新区域 | **`inventory.length=22` R** | 高：新增/移除合法 legacy adapter 即失败 | 部分 | rewrite | L203-293；逐项测 registry 内容，不冻结数量 |

### `plan-stone-lifecycle.test.js`

| Item | Contract | Hardcode | Valid-change sensitivity | Failure appropriate | Verdict | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| confirm Goal atomically | 完整 Proposal 后 Receipt 可 approve-and-start Goal | IDs/title为F，intent为S | 低 | 是 | keep | L14-33；不代表普通“可以”授权 |
| Stone rejection revision | 拒绝 Stone 保存反馈并返回 Plan revision | IDs/反馈为F | 低 | 是 | keep | L35-74 |
| Plan pauses/resumes at Stone | 只在 Stone 暂停，scoped acceptance 后下一 Milestone | IDs为F | 低 | 是 | keep | L76-120 |

### `project-events.test.js`

| Item | Contract | Hardcode | Valid-change sensitivity | Failure appropriate | Verdict | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| artifact.ready ledger | event 本地 append-only、默认无 remote/external action | **`hypo-info-v2`,`hypo-writer`,URL/date R** | 中 | 部分 | parameterize | L10-47；用任意 project/object fixture |
| writer route/dry-run | route 产生派生事件且 dry-run 不联系外部 | **Writer CLI argv、`/tmp/Hypo-Writer`、issue path R** | 高：Writer 布局演进即大失败 | 否 | split | L49-100；通用路由与 Writer adapter 各自合同 |
| notify confirmation | 未确认 external notify 必须 block | project/URL R，安全 gate S | 低 | 是 | parameterize | L102-134 |
| CLI cron flow | CLI emit/route 可脚本化 | 退役 CLI、项目/URL、输出文案 R | 高 | 否 | remove | L136-189 |
| noon scheduler defaults | 定时器默认已确认外部 QQ 通知 | shell 实现字符串 R；且默认外联是高风险政策 | 高 | 否 | rewrite | L191-205；应测配置解析与显式授权，默认不得靠 grep 固化 |

### `record-store.test.js`

| Item | Contract | Hardcode | Valid-change sensitivity | Failure appropriate | Verdict | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| APIs published | Patch/writer/read/index API 可用 | API names S | 低 | 是 | keep | L35-38 |
| semantic Record roundtrip | 单事实稳定 Markdown Record、重复提交幂等 | project/dedupe/body 为 F，path pattern S | 低 | 是 | keep | L40-70 |
| Patch validation | unsafe scope/kind/source/metadata 拒绝 | invalid variants为安全样例F | 低 | 是 | keep | L72-98 |
| writer owns IDs | caller 不得指定/覆盖 authority ID | IDs/body为F | 低 | 是 | keep | L100-123 |
| secrets zero-write | metadata/body secret 拒绝且错误脱敏 | sentinel为F，规则S | 低 | 是 | keep | L125-147 |
| secret refs/hidden reasoning | secret ref允许，hidden rationale/raw reasoning拒绝 | field names为安全S | 低 | 是 | keep | L149-187 |
| index rebuild byte stability | derived index 可重建且不改 Record bytes | fixture facts为F | 低 | 是 | keep | L189-222 |
| supersession traceability | superseded保留、active index选 replacement | dedupe/body为F | 低 | 是 | keep | L224-257 |
| deterministic dedupe/conflict | 相同事实去重，冲突事实需 supersedes | dedupe/body为F | 低 | 是 | keep | L259-278 |
| ambiguous active leaves | 独立 merge 同 dedupe 多 active leaf fail closed | names为F | 低 | 是 | keep | L280-316 |
| supersedes cycle integrity | 零 active leaf cycle 被 integrity 拒绝 | names为F | 低 | 是 | keep | L318-355 |
| path binding | Record path 必须由 identity 派生 | `misplaced-`为F | 低 | 是 | keep | L357-376 |
| prepared recovery seam | prepare 后中断可 rollback 且恢复原树 | phase `after_prepare` 为事务S | 中：事务 phase 改名会失败 | 是 | keep | L378-403 |

### `root-skill-router.test.js`

| Item | Contract | Hardcode | Valid-change sensitivity | Failure appropriate | Verdict | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| resolver API published | registry/root 导出 resolver | API name S | 低 | 是 | keep | L23-26 |
| compatibility aliases | alias 解析到 focused child Skill、无内嵌 manual | routes/skill paths为公开兼容S | 低 | 是 | keep | L28-50 |
| unavailable classes zero-write | unknown/removed/deferred/internal/unavailable 明确且零写 | route案例为兼容S，`message>=12` R | 中 | 部分 | split | L52-73；状态/零写保留，字符数换非空结构码 |
| missing backend downgrade | 声明 route 后端缺失则 unavailable/零写 | message regex R | 中 | 部分 | split | L75-86 |
| symlink root parent | symlink repoRoot 不可信且不泄露 target | 路径为F | 低 | 是 | keep | L88-111 |
| symlink root: resolver | resolver unavailable/零写/不泄露 | 同上 | 低 | 是 | keep | L96-103 |
| symlink root: discovery | 不可信 root 不广告 backend | **exact `[]` 合理安全合同** | 低 | 是 | keep | L105-109 |
| child symlink parent | child symlink/near-prefix 不越界 | 路径为F | 低 | 是 | keep | L113-143 |
| child-directory-symlink | directory symlink backend不可用 | 路径为F | 低 | 是 | keep | L114-121 |
| child-file-symlink | file symlink backend不可用 | 路径为F | 低 | 是 | keep | L123-131 |
| near-prefix-directory | `guide-copy` 不冒充 `guide` | 路径为F | 低 | 是 | keep | L133-142 |
| Root SKILL bounded | root router 体积有上限且只含路由 | `18000/320` 是显式质量阈值 S；旧 manual regex R | 中 | 部分 | split | L145-153；体积阈值保留，旧文案 regex 删除 |

### `skill-quality.test.js`

| Item | Contract | Hardcode | Valid-change sensitivity | Failure appropriate | Verdict | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| malformed fixture | 缺 frontmatter/language/reference 可诊断 | **exact 3 issues/order R**，codes可S | 高：新增规则即失败 | 部分 | rewrite | L9-40；包含必需 code，不冻结总数/顺序 |
| reject shared asset ambiguity | child 相对 asset 不可误指 root asset | paths为F，code为S | 低 | 是 | keep | L42-81 |
| allow child-local paths | local assets/references/scripts 合法 | paths为F | 低 | 是 | keep | L83-121 |
| allow explicit root paths | `../../assets` 显式 root 引用合法 | path语义S/F | 低 | 是 | keep | L123-156 |
| current repository quality | repo skills 全通过 | **`>=35`, internal=1, watchdog path R** | 高：合法删/增 skill 会误失败 | 否 | rewrite | L158-172；从 command registry 派生集合，不测规模 |
| rules summary/presets | rule 可发现且 preset 生效 | summary 文本 R | 高 | 否 | rewrite | L174-179；解析结构化 Rules authority |

### `watchdog-lease.test.js`

| Item | Contract | Hardcode | Valid-change sensitivity | Failure appropriate | Verdict | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| stale lease dry-run takeover | stale lease 不永久阻塞，dry-run不执行 resume | shell log 文案 R，时间/F | 高：文案变更失败 | 部分 | rewrite | L9-46；断言结构化结果/副作用而非日志句子 |
| fresh lease blocks | fresh lease 阻止 takeover | shell log 文案 R | 高 | 部分 | rewrite | L48-84 |

## Scenario 审计

| Item | Contract | Hardcode | Valid-change sensitivity | Failure appropriate | Verdict | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| c21/s70-init-current | 任意 cwd 下执行当前 empty-repo Init transaction，且不调用退役 CLI | `C21/M4` 仅标题/测试名 F；行为选择由 focused test | 中：测试改名会失败 | 是 | keep | `run.sh` 解析 repo root 后以 name pattern 跑 `init-bootstrap.test.js` |
| v0/s02-resume-interrupt | legacy state 从 implement 恢复且保留已完成步骤 | `00/01`、时间、3 tests、旧 state/log/report R | 高 | 否 | reclassify | 无 `run.sh`，checklist 自报 PASS；仅历史样本 |
| v11/s65-audit-memory-handoff | audit memory handoff 合同 | C11/M02 R/F；只是整文件 wrapper | 中 | 部分 | reclassify | wrapper 跑已 quarantine `audit-memory-contract.test.js`，不提供独立 E2E |
| v5/s16-plan-discover | Plan/Discover 路由与产物 | 旧路径 `plan/PLAN-SKILL.md`、文档句子 R | 高 | 否 | remove | `run.sh` 全为 `rg` 文案断言 |
| v6/s26-release-dry-run | release dry-run 预览 | **checklist 写7步，run实际固定8个标题**，纯文案 R | 高 | 否 | remove | 内部自相矛盾且只 grep headings |
| v8.1/s36-import-history-non-git | non-Git init 明确拒绝 | 精确中文错误/skill句子 R | 高 | 否 | rewrite | 改为临时 non-Git repo 行为测试，否则保持 quarantine |
| v8.3/s46-showcase-slides-poster | slides/poster配置与缺 key 降级 | 文件关键词、`1024x1536`、具体 provider env R | 高 | 否 | remove | 纯 grep 退役 Showcase 文档/schema |
| v9/s56-agents-ask-todo-plan-discipline | Plan agent 使用 Ask/todo 且 rule 生效 | **固定6 agent、旧 commands/`.plan-state`路径、文案 R** | 高 | 否 | remove | 退役 OpenCode CLI 生成面；纯文件/grep |

## 共享 runner 与 inventory 审计

| Item | Contract | Hardcode | Valid-change sensitivity | Failure appropriate | Verdict | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| CLI argument parser | `--catalog/--set/--dry-run/--json/--` 解析且未知参数拒绝 | option/set为公开S | 低 | 是 | keep | `tests/run_core_tests.mjs` L31-66 |
| catalog schema | suite/classification/path安全与 replacement 可达 | schema `1`/keys为S | 中 | 是 | keep | L68-158 |
| non-empty both classes | 每个 suite 强制 maintained 与 quarantined 都非空 | **历史治理状态 R，不是执行合同** | 高：清完 quarantine 后反而失败 | 否 | remove | L128-130 |
| Core discovery | 找到全部可执行 Core tests | **只 shallow `readdir(core/test)` 且仅 `.test.js`** | 高：nested、mjs/ts/spec 合法新增会漏跑 | 否 | rewrite | L180-184；须与 METHODOLOGY 的递归五类扩展统一 |
| Scenario discovery | 找到所有已注册 Scenario | **只两层目录、必须 `s*`、排除 name 含 placeholder、以 checklist 存在判断** | 高 | 部分 | rewrite | L186-199；应由显式 registry 或统一 inventory 派生 |
| exact inventory gate | catalog 与 discovery 一一对应 | 算法本身是必要合同 | 取决于 discovery | 是 | keep-after-fix | L201-211 |
| path canonicalization | 拒绝 absolute/backslash/empty/dot/traversal/escape | 安全规则S | 低 | 是 | keep | L214-231 |
| execution/selection payload | 只执行选择集并报告计数/路径 | payload字段S | 低 | 是 | keep | L9-29, L246-268 |

### Inventory 实证

- C023 方法命令递归发现 `179` 个文件；catalog 当前有 `178` 个 Core entry。
- 唯一差异是 `core/test/fixtures/c21-m4/brownfield/test/server.test.js`。它是 fixture 内测试素材，但按 METHODOLOGY 的原始发现命令属于“可执行测试”；当前 runner shallow discovery 静默排除了它。
- `node tests/run_core_tests.mjs --dry-run --set all --json` 仍成功并报告 `178`，证明当前 exact-inventory gate 只能证明“符合 runner 自己的较窄定义”，不能证明符合 C023 inventory。
- 修复方向必须二选一并显式化：若 fixture 中的测试素材不属于 suite，inventory 规则应明确排除 fixture tree；若属于，则 runner/catalog 必须纳入且给它独立分类。不能让两个发现算法继续各说各话。

## Findings

### 高

1. **Runner inventory 与审计 authority 不一致。** shallow `.test.js` discovery 会漏掉 nested、`.test.mjs/.ts`、`.spec.*`；当前已经出现 179 vs 178 的真实差异，CI dry-run 不会报警。
2. **参考 fixture 数量被测试固化。** `new-format-single-writer` 的 `records.length=7`、dedupe keys `=6`、legacy writers `=22` 和 exact file list 会让合法新增/删改输入产生无关失败。这些应从 fixture manifest、proposal 或 registry 派生。
3. **通用 project-events 测试绑定特定产品拓扑。** `hypo-info-v2 -> hypo-writer`、localhost URL、固定日期、`/tmp/Hypo-Writer` 和 issue 目录同时出现在通用 ledger/router case；任一 Writer 正常演进都会造成跨模块级联。

### 中

1. `log-evidence` 直接读取当前仓库 `.pipeline/log.yaml`，把项目运行数据作为 test fixture，结果不可移植。
2. quarantine 中仍有大量“grep 文案即测试”：Chat、Deep Plan docs、config spec、release、Showcase、Plan agent Scenario。它们的失败通常只代表措辞或文件布局变化。
3. `deep-plan-integration` 的 `54/53` 与 `skill-quality` 的 `>=35/internal=1` 固化退役命令/Skill 规模；合法能力变化会触发无意义失败。
4. `audit-memory`、Claude status 和 TUI 混合了真实模型合同与固定 C11/M02/M06、行数、顺序、显示措辞，需要拆分或参数化。
5. `tests/run_core_tests.mjs` 强制 maintained/quarantined 均非空，使“消除全部 quarantine”这一健康终态本身无法通过验证。

### 低

1. 多个 security/recovery case 使用 error-message regex。当前 regex 较宽，但最好优先断言稳定 error code，再把用户提示作为独立可读性测试。
2. `root-skill-router` 的 18KB/320 行可视为明确质量预算；旧 manual 文案 regex 不应与预算 gate 混在同一 case。
3. maintained Scenario `s70` 通过 test-name pattern 绑定内部测试名；文件重命名不受影响，但 case 合法改名会使 Scenario 无行为执行。

## 需要反事实 probe

1. 将 `new-format-single-writer` fixture 增加一个合法 Record candidate/legacy writer registry entry，确认当前仅因 `7/6/22` 失败；修复后应通过且仍能捕获 active-leaf/单写者破坏。
2. 将 Cryo placement fixture 的项目、repository、Cycle/Experiment ID 全量改名，行为决策应保持不变。
3. 为 audit-memory 使用非 C11/M02 且条目数不同的 fixture，验证 merge/path/scoped visibility，而非样例数字。
4. 为 runner 临时加入 nested `.spec.mjs`（或定义明确的 fixture exclusion），确认 CI inventory 与方法 inventory 同源。
5. 对 project-events 使用两个任意 project id 与非 Writer object ref，通用 ledger/confirmation 合同应通过；Writer adapter 布局只在 adapter focused test 中变化。

## Catalog / fixture 问题

- `regression-catalog.json` 正确把本分片多数退役 CLI、legacy state/log、Claude adapter 和 Watchdog 测试 quarantine；这些不应仅为追求“全绿”而恢复 maintained。
- quarantine Scenario `s65` 只是 quarantine Core 文件的 wrapper，没有新增 E2E 证据。
- `s02` 没有 runner 且 checklist 自报 PASS，属于历史记录而非可执行 Scenario。
- `s26` checklist 声称 7 步，runner 固定检查 8 个 Step heading，fixture 自身已漂移。
- `c21-m5` reference fixture 的具体内容可以固定作为输入，但预期数量必须从 fixture/proposal/registry 派生；安全禁止项可保持常量。

## 零遗漏自检

- 机械 shard 文件数：`18/179`（zero-based `%10 == 0`），报告覆盖 `18/18`。
- 顶层 test case：`118/118`；显式/表驱动 nested case：`15/15`。
- shard Scenario：`8/76`，报告覆盖 `8/8`。
- 支撑面：审计了各文件直接 fixture 用法、对应 catalog classification、8 个 Scenario 的 checklist/run/config/state，以及共享 `tests/run_core_tests.mjs`。
- 未修改任何生产代码、测试、fixture、catalog 或 runner；仅新增本审计报告。
