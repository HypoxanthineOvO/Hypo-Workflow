# Independent Reviewer：shard 0/10

## 结论

独立复审覆盖了 METHODOLOGY 定义下规范化路径索引 `% 10 == 0` 的 18 个 Core 文件、8 个 Scenario，以及共享 `tests/run_core_tests.mjs` / `tests/regression-catalog.json` inventory。Primary 的主要高风险结论成立：当前审计 inventory 是递归 `179`，runner/catalog 只认识顶层 `.test.js` 的 `178`；live `.pipeline/log.yaml` 不是封闭测试输入；`7/6/22`、`54/53`、`>=35/internal=1` 等固定规模不能代替行为合同。

但 primary 有两处需要实质修订：

1. `project-events` 的项目名、URL 和日期大多只是由测试传入并原样检查的 fixture，不是“所有项目必须等于这些值”的生产硬编码。真正的耦合是 `writer.news.issue` adapter 的 CLI argv、Writer 目录布局，以及退役 CLI/脚本文案。不能因为 literal 具体就判定测试无效。
2. “118 个顶层 case + 15 个 nested case”无法从源码机械复现。18 个文件有 104 个外层 `test`/`writerBehavior`/`recordTest` 注册，另有 15 个显式子测试（placement 7、writer rejection 3、root symlink 5）；`concurrent-work-placement-contract` 还把多个逻辑合同放在同一个外层测试中。Primary 的逻辑项覆盖完整，但 case 计数口径必须改正或由 AST/runtime inventory 自动生成。

## 覆盖清单

Core：`acceptance-policy-status`、`audit-memory-contract`、`c23-m1-experiment-boundary`、`chat-mode-spec`、`claude-status-surface`、`concurrent-work-placement-contract`、`deep-plan-integration`、`execution-lease`、`global-config-registry`、`ink-tui`、`log-evidence`、`new-format-single-writer`、`plan-stone-lifecycle`、`project-events`、`record-store`、`root-skill-router`、`skill-quality`、`watchdog-lease`。

Scenario：`c21/s70-init-current`、`v0/s02-resume-interrupt`、`v11/s65-audit-memory-handoff`、`v5/s16-plan-discover`、`v6/s26-release-dry-run`、`v8.1/s36-import-history-non-git`、`v8.3/s46-showcase-slides-poster`、`v9/s56-agents-ask-todo-plan-discipline`。

以冻结清单 `audits/INVENTORY.md`（commit `cd829923957ba09d5d0f1d0aa7ec9b5eecab9d93`）机械比对：shard 0 应有上述 `18` 个 Core 文件和 `8` 个 Scenario；primary-00 与本 reviewer 报告均为 `missing=0`、`extraneous=0`。共享 runner/catalog 是 METHODOLOGY 额外指定的 shard 0 支撑面，不计作 frozen Core item。

## 逐项复审

`agree` 表示合同、敏感性和处置均同意 primary；`revise` 表示以下记录替代 primary；没有发现 `missing` 测试项。

### Acceptance / memory / Experiment

| Item | Review | 独立结论 |
| --- | --- | --- |
| acceptance defaults/override | revise | `72/3` 若仍是公开默认策略，就是应测试的合同；默认值改变导致这一项失败是合理的。保留 override 行为分离可读性，但不能把所有数字 literal 都当偶然值。Verdict：`keep` 或仅按语义拆分，不因 hardcode 删除。 |
| timeout deterministic status | agree | 固定时间是封闭 fixture，失败准确指向 timeout 派生合同。 |
| rejection template | agree | `P001`、时间、文案是输入 fixture。 |
| OpenCode/TUI acceptance status | agree | 模型字段是合同；footer/sidebar 措辞与其拆分。 |
| audit-insufficient blocks | agree | 安全/验收 gate 行为应保留。 |
| shared implement/test blocks | agree | worker separation 合同。 |
| Codex authorization/scope | agree | 公开 intent 和授权范围是协议常量。 |
| non-Codex authorization | agree | 从 host registry 参数化可避免新增 host 漏测。 |
| unavailable evidence no bypass | agree | 失败应准确阻止绕过。 |
| mode off allows sharing | agree | `off` 是稳定枚举。 |
| runtime worker mirror | agree | 输入样例具体但断言派生关系。 |
| ignore internal subtasks | agree | evidence scope 是安全边界。 |
| cycle audit-memory fixture | agree | 固定 `length=2` 只证明样本规模；应断言所需语义项存在。 |
| milestone audit delta fixture | agree | `C11/M02` 可作 fixture，固定条目数不应成为通用合同。 |
| scoped handoff fixtures | agree | 命令是公开协议；refs 应由 fixture identity 派生。 |
| audit-memory merge/render | revise | path builder 对传入 `C11/M02` 的精确结果是有效合同，不必参数化；需要 probe 的是不同 ID/条目数仍正确 merge，而不是禁止 fixture literal。 |
| raw conversation not authority | agree | authority 字段是稳定安全合同。 |
| Experiment boundary 10 cases | agree | Store 单写者、Receipt target binding/replay、baseline identity、时间、duplicate ID 与三类 recovery 均是精确合同；样例 ID/名称不是生产 hardcode。 |

### Legacy/deferred UI 与 placement

| Item | Review | 独立结论 |
| --- | --- | --- |
| chat spec/commands append mode | agree | 纯文档句子断言应改成 registry/parser 行为。 |
| state optional chat session | agree | YAML 示例字符串不能替代 validator。 |
| log/progress chat rows | agree | Markdown 表头/措辞漂移不代表行为破坏。 |
| hook recovery/fallback docs | agree | 应执行 hook-off recovery。 |
| OpenCode map chat | agree | 公开 route mapping 可精确测试。 |
| Claude compact model | agree | 固定 milestone、行数和标题混合了模型与文案。 |
| Claude markdown shared model | agree | 结构/脱敏与措辞拆分。 |
| Claude monitor manifest | agree | 若 event/command 是 adapter 协议，失败合理。 |
| Claude Progress refresh | agree | 固定 M06 应由输入派生。 |
| generalized placement API | agree | API exports 是兼容合同。 |
| Work Item refs | agree | kind 枚举是协议。 |
| repository identity/locator | agree | 名称/路径是 fixture，安全 traversal 与 generation 是合同。 |
| placement matrix parent + 7 children | agree | decision 枚举、snapshot/source/cache/fixed-output/dirty/GPU 条件均直接保护资源隔离。 |
| Cryo dual lanes | revise | Cryo/Accel-Sim/Trace 是命名 fixture，不会天然把实现硬编码到 Cryo；可增加 rename probe 证明通用性，但现有 case 不应因此降级。Verdict：`keep + probe`。 |
| Session selection | agree | 单 Session 绑定和 foreground 隔离准确。 |
| exclusive race | agree | 原子 lease/fencing 的失败范围合理。 |
| expiry/renewal | agree | clock/TTL 是注入 fixture。 |
| integration gate | agree | source-changing Delivery 的验证证据是 acceptance 安全合同。 |
| legacy coexistence | agree | 明确兼容路径，合法新路径不应破坏旧例。 |

### Config / TUI / docs-oriented cases

| Item | Review | 独立结论 |
| --- | --- | --- |
| Deep Plan single route | agree | `54` 是无关总规模；唯一 route 和 route metadata 才是合同。 |
| Deep Plan OpenCode generation | agree | registry 同源与无旁路拼接有效。 |
| Deep Plan Claude generation | agree | 去掉 `command_count=54`，保留唯一生成物。 |
| Deep Plan docs/references | agree | 大段 wording grep 不应成为行为 gate。 |
| execution lease 5 cases | agree | 固定 clock、ID、429 是输入；fresh/expired/reported/malformed/strict handoff 行为边界准确。 |
| global config defaults | agree | schema 默认与部署模型选择拆分；若某枚举被声明为产品默认，则可精确测试。 |
| role-to-agent matrix | agree | 已退役 deployment matrix 不应回到 maintained。 |
| config migration | agree | read-zero-write/save-backup 是合同。 |
| project registry identity | agree | C4/name 是输入 fixture。 |
| init-project registration | agree | 退役 CLI 删除。 |
| schema/spec fields | agree | validator/link 检查替代章节文案。 |
| TUI global model | agree | model capabilities 与 exact action/text 分开。 |
| no-command CLI | agree | 退役 CLI 删除。 |
| package alias/deps | agree | 发布 package keys 是稳定合同。 |
| init registry TUI | agree | 退役 init/TUI surface 删除。 |
| config target separation | agree | 不混写边界准确。 |
| config edit gate | agree | protected path/confirm/zero-write 保留，命令提示文案拆分。 |
| dashboard canonical model | agree | snapshot 文案/固定 M02 参数化。 |

### Log / writer / lifecycle

| Item | Review | 独立结论 |
| --- | --- | --- |
| current lifecycle log | agree | 直接读取仓库当前 `.pipeline/log.yaml` 是非 hermetic live-state dependency；普通项目进展可能让 CI 失败。改用封闭 fixture，live log 仅可作为非阻塞诊断。 |
| gate feedback statuses | agree | enum/status 是协议，日期是 fixture。 |
| Recent sorting/filtering | agree | 排序、noise filter 是直接行为。 |
| release/quality records | agree | event family/status 应验证。 |
| status feed redaction | agree | secret 样例具体但安全结果稳定。 |
| shared redaction | agree | credential pattern 是安全合同。 |
| writer redaction/leak block | agree | 零泄漏比措辞更重要。 |
| writer API exports | agree | 公开 writer API 可精确测试。 |
| fixture exact file list | revise | exact list 的目标“防止 fixture 偷带 live pipeline”有价值，但列表内嵌在测试会让任何合法 fixture 扩展失败。应拆出经审阅的 fixture manifest，并分别验证 manifest 一一覆盖、禁止 live `.pipeline`/secret/path/hidden reasoning。Verdict：`split + manifest`，不是简单删除 exact coverage。 |
| clone byte identity | agree | 两 clone 树相等有效；固定标题 regex 无关。 |
| extractor order determinism | agree | mtime 是 fixture；byte/hash 不受完成顺序影响是核心合同。 |
| stage rejection parent + 3 subcases | agree | 三类拒绝均必须零写，失败范围准确。 |
| writer Record ownership | agree | `records=7`、`keys=6`、特定 body/dedupe 应从 proposal/candidates 派生；保留 ID/hash/唯一 active leaf/supersedes 行为。 |
| legacy writer fence | agree | `length=22` 是脆弱的删除哨兵且不能证明 22 项完整。以独立 authority/manifest 对 registry 做集合覆盖，再逐项验证 frozen；新增/退役 adapter 时只更新明确 authority。 |
| Goal approve-and-start | agree | 只证明有效 Receipt 的原子 transition，不把普通“可以”当授权。 |
| Stone reject/revision | agree | feedback 与 revision transition 准确。 |
| Stone pause/resume | agree | scoped receipt 和下一 milestone transition 准确。 |

### Project events / Records / routers

| Item | Review | 独立结论 |
| --- | --- | --- |
| artifact.ready ledger | revise | `hypo-info-v2`、`hypo-writer`、URL/date 是函数输入并被检查原样落盘，属于有效 fixture；不会让另一个项目失败。Verdict：`keep`，可另加第二组 arbitrary identity 做通用性 probe，但无需仅为去 literal 参数化。 |
| writer route/dry-run | revise | route 本身就是专用 `writer.news.issue` adapter，argv 和 issue path 可能是 adapter 合同，不应冒充通用 router。由于 catalog 已判定该 automation surface 被 C21 Records/Maintain 取代，处置依据应是“产品面退役”而非“出现 Hypo-Writer 名字”。若保留则 `split` generic selection/safety 与 focused adapter contract；若退役则整体 `remove`。 |
| notify confirmation | revise | 项目/URL 是 fixture；未确认不得 spawn 是独立安全合同，应 `keep` 或迁入当前 notification gate 测试。 |
| CLI cron flow | agree | 退役 CLI + stdout wording，删除。 |
| noon scheduler defaults | agree | grep shell 实现且默认确认外部动作风险高，重写为显式授权行为或随退役面删除。 |
| Record Store 13 cases | agree | API、typed roundtrip、validation、writer-owned ID、secret/hidden reasoning、index rebuild、supersession、dedupe conflict、多 active leaf、cycle/path integrity、transaction recovery 均保护真实 authority/safety；具体 record IDs/body 是输入 fixture。 |
| root resolver API | agree | API export 是合同。 |
| compatibility aliases | agree | public aliases/child skill path 是兼容合同。 |
| unavailable route classes | agree | 状态/零写保留，`message>=12` 不稳定。 |
| missing backend downgrade | agree | 不可用/零写/不泄漏保留，文案 regex 分离。 |
| symlink root resolver/discovery | agree | exact empty discovery 是必要 fail-closed 安全结果。 |
| child symlink/near-prefix 3 subcases | agree | traversal/alias confusion 安全合同。 |
| Root SKILL bounded | agree | `18KB/320` 只有在明确质量预算下才是允许的固定阈值；旧 manual wording regex 移除。 |
| malformed skill fixture | agree | 断言必需 issue codes，不冻结 issue 总数和顺序。 |
| shared asset ambiguity | agree | path resolution 安全合同。 |
| child-local paths | agree | positive path resolution。 |
| explicit root paths | agree | 显式 `../../assets` 行为。 |
| current repository quality | agree | `>=35/internal=1/watchdog` 固定规模/拓扑会在合法增删时误失败；从 command/skill registry 派生集合。 |
| rules summary/presets | agree | 解析结构化 authority，不 grep summary 文案。 |
| watchdog stale/fresh | agree | lease 行为有效，但 shell log wording 不应是主 oracle。 |

## Scenario 复审

| Scenario | Review | 独立结论 |
| --- | --- | --- |
| `c21/s70-init-current` | agree | 执行真实 Init focused test；test-name pattern 仍有重命名耦合。 |
| `v0/s02-resume-interrupt` | agree | 无 runner，checklist 自报结果；只能是历史 fixture。 |
| `v11/s65-audit-memory-handoff` | agree | 只是 quarantined Core wrapper，不增加 E2E 证据。 |
| `v5/s16-plan-discover` | agree | 全部是旧文件/句子 `rg`，删除。 |
| `v6/s26-release-dry-run` | agree | checklist 7 步而 runner grep 8 标题，既漂移又不执行 release 行为。 |
| `v8.1/s36-import-history-non-git` | agree | 精确错误文案 grep 改成临时 non-Git workspace 的行为/退出码/零写。 |
| `v8.3/s46-showcase-slides-poster` | agree | 退役 Showcase 文档/schema grep，删除。 |
| `v9/s56-agents-ask-todo-plan-discipline` | agree | 固定 6 agents、旧 CLI/commands/`.plan-state`，删除。 |

## Shared runner / inventory

| Item | Review | 独立结论 |
| --- | --- | --- |
| CLI argument parser | agree | options/set 是 runner contract。 |
| catalog schema/path safety/replacements | agree | schema、exact keys、canonical path 是稳定治理/安全合同。 |
| both classes non-empty | agree | quarantine 清零是健康终态，runner 不得阻止。 |
| Core discovery | agree | 当前 `readdir(core/test)` + `.test.js` 与 METHODOLOGY 递归 glob 不同源。 |
| Scenario discovery | agree | 两层/`s*`/checklist/placeholder-name 是隐式约定，应以显式 registry 或统一 inventory 为 authority。 |
| exact inventory gate | agree | gate 算法可保留，但 discovery 修复前只证明较窄自洽。 |
| path canonicalization | agree | traversal/absolute/backslash/dot rejection 是安全合同。 |
| execution/selection payload | agree | selected set 与 paths/counts 应从 partition 派生。 |

### 179 vs 178 实证

- METHODOLOGY 的递归规则发现 `179` 个文件。
- 顶层 `core/test/*.test.js` 为 `178`，catalog 也是 `178`；当前 dry-run 报 `maintained=68`、`quarantined=110`、`selected=178` 并成功。
- 唯一差异是 `core/test/fixtures/c21-m4/brownfield/test/server.test.js`。它确实是一个可执行 Node test，但语义上是 brownfield 项目 fixture 内的素材，而不是 Core suite 自身测试。
- 因此正确修复不是机械把它加入 catalog：应在唯一 inventory authority 中明确 `fixture tree excluded`，并另设 fixture-integrity/fixture-execution 合同；或者明确将嵌套测试作为独立 suite 执行。方法、runner、catalog 必须消费同一规则。

## Findings 与争议

### 高

1. **Inventory authority 分叉，CI 会静默漏项。** exact gate 只和 runner 自己的 shallow discovery 比较，不能证明审计定义的完整性。
2. **固定规模被误当合同。** `7/6/22`、`54/53`、`>=35/internal=1` 会把合法输入/registry 演进变成失败，且通常不能证明集合完整。
3. **非 hermetic live log。** `log-evidence` 依赖当前项目数据，CI 结果受开发活动影响。

### 中

1. `project-events` 需要按通用 ledger、安全 gate、Writer adapter、退役 CLI 四个 ownership 边界拆分；primary 将 fixture literal 与生产 hardcode 混为一谈。
2. 多个 quarantine test/Scenario 只 grep 文案和文件布局，不是行为验证。
3. Case inventory 统计口径不稳定；零遗漏应由测试 AST/runtime IDs 自动生成，不应手算“顶层/子 case”。

### 低

1. error regex 可逐步替换为稳定 error code + 独立用户提示测试。
2. Root SKILL 预算值可以保留，但必须在产品质量规则中有明确来源。

## 必需 probes

1. Inventory：加入临时 nested `.spec.mjs`，验证唯一 inventory authority 要么明确排除 fixture、要么 runner/catalog 同时报未分类。
2. Writer：给 proposal 增加合法 candidate，`records/active keys` 从输入派生后仍验证唯一 active leaf；给 legacy writer manifest 增删一项，只有集合覆盖相关测试失败。
3. Project events：用完全不同的 project IDs、URL、日期运行 ledger/confirmation；结果应保持通用。Writer adapter 的 argv/path 变化只应影响 adapter focused test。
4. Live log：在仓库 `.pipeline/log.yaml` 变化前后运行封闭 validator fixture，测试结果必须相同。
5. Fixed counts：新增合法 command/skill 不应触发 Deep Plan/skill-quality 无关失败；删除必需 route/skill 则应由 registry coverage 精确失败。

## 零遗漏自检

- 文件：`18/18`；Scenario：`8/8`；共享 runner/catalog：`2/2`。
- Frozen inventory 机械差集：`missing=0`、`extraneous=0`（primary 与 reviewer 相同）。
- Primary 表中的每个逻辑项均标记 `agree` 或 `revise`；`missing=0`。
- 机械 inventory 差异已复现为 `179 vs 178`，唯一文件已定位。
- 未修改产品代码、测试、fixture、catalog 或 runner；仅新增本 reviewer 报告。
