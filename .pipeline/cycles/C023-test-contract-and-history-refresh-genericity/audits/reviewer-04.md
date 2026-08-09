# Independent Test Contract Review - Shard 04

## 结论

- 覆盖：重新核对 `% 10 == 4` 的 18 个 Core 测试文件、其中全部顶层/动态 case，以及 8 个 catalog Scenario；未修改产品、测试、fixture 或 catalog。
- 总体判断：primary-04 对 bootstrap 的 C21/M5/M6/固定计数耦合、重复 prose regex、`s74` 零匹配假绿、`s50` 固定 counts 和多数失败归因问题判断成立。
- 重大修订：primary 未读取 Scenario 的共享执行器 `tests/run_regression.py`，所以把 `s06`、`s10` 误判为“无 runner、不可执行”。它们实际由 `scenario_specific()` 执行，但只验证配置/全局文件计数，不能证明各自声称的运行时合同。
- 处置边界：fixture 中具体的 C21/M5/M6、项目名、路径可以作为样例输入；缺陷在于把它们手抄为唯一通用真值、只跑一个同构 fixture，或用固定数量替代派生/行为断言。稳定 schema、命令、状态枚举和安全边界仍应测试。

## 完整覆盖

### Core 测试文件

- [x] `core/test/analysis-preset.test.js`
- [x] `core/test/bootstrap-activation.test.js`
- [x] `core/test/c23-m3-experiment-runs.test.js`
- [x] `core/test/claude-hooks.test.js`
- [x] `core/test/codex-subagent-discipline.test.js`
- [x] `core/test/cycle-lifecycle-vnext.test.js`
- [x] `core/test/deletion-gate.test.js`
- [x] `core/test/explore-contract.test.js`
- [x] `core/test/guide-router.test.js`
- [x] `core/test/layered-config-integration.test.js`
- [x] `core/test/maintenance-command-map.test.js`
- [x] `core/test/opencode-model-matrix-docs.test.js`
- [x] `core/test/pr-create-execution.test.js`
- [x] `core/test/project-notifications.test.js`
- [x] `core/test/reference-contract.test.js`
- [x] `core/test/secret-ref-projection.test.js`
- [x] `core/test/subagent-separation-contract.test.js`
- [x] `core/test/workspace-concurrency-recovery.test.js`

### Catalog Scenario

- [x] maintained `tests/scenarios/c21/s74-resume-recovery`
- [x] quarantined `tests/scenarios/v0/s06-custom-sequence`
- [x] quarantined `tests/scenarios/v2.5/s10-progressive-disclosure`
- [x] quarantined `tests/scenarios/v6/s20-help-init`
- [x] quarantined `tests/scenarios/v6/s30-init-rescan`
- [x] quarantined `tests/scenarios/v8.2/s40-compact-session-start`
- [x] quarantined `tests/scenarios/v8.4/s50-rules-system`
- [x] quarantined `tests/scenarios/v9/s60-progress-board-format`

## 逐项复审

`Status` 针对 primary 的合同、敏感性和处置结论：`agree` 表示成立，`revise` 表示需改判，`missing` 表示 primary 未覆盖的直接执行面或风险。

### `analysis-preset.test.js`

| Item | Status | Reviewer verdict | Evidence / reason |
| --- | --- | --- | --- |
| spec defines preset chain/taxonomy | agree | split | schema/step tokens有合同意义；标题和英文解释是编辑性 prose。 |
| preset step sequences | agree | keep | preset 顺序与 custom passthrough 是明确 API 合同。 |
| taxonomy normalization/artifacts | agree | split | 结构化对象断言有效，`Workflow`/`Analysis Kind` 表头不应承担行为合同。 |
| config accepts analysis | agree | keep | 以 CLI 状态验证公开配置能力，失败归因集中。 |

### `bootstrap-activation.test.js`

| Item | Status | Reviewer verdict | Evidence / reason |
| --- | --- | --- | --- |
| activation APIs exported | agree | keep | 导出名是公开合同；标题中的 M5 仅叙事。 |
| manifest-last complete activation | agree | parameterize + second fixture | L102/L111-L125/L147-L160 手抄项目、C21/M5/M6、7/6 counts 和 `c21` 路径；这些虽来自 fixture，却没有证明通用性。应从 fixture/返回 ref 派生，并增加不同 identity/cardinality fixture。 |
| four activation fault phases | agree | probe | 原子性行为有效；确认 phase 名是稳定测试 seam，而非内部函数布局。 |
| pending activation exclusivity | agree | keep | 零二次写入与单 writer 是准确合同；样例 ID 不会扩大失败面。 |
| source digest revalidation | agree | parameterize | 攻击动作有效，但应从 audited source 集合选择目标，避免绑定 `accepted-outcome.md` 布局。 |
| rollback checkpoint | agree | split | legacy byte 保留有效；断言整个 memory/snapshots 不存在会约束合法的恢复证据布局。 |
| fresh child restore | agree | parameterize + second fixture | L309-L317 再次硬写 `/delivery/c21`、object ref 和 budget；M5/M6 期望应由输入派生。read-only、corrupt-head rejection 与 anti-transcript 断言应保留。 |
| genericity proof | missing | add metamorphic matrix | 单纯把 literals 改成 helper 常量仍可能是假通用；同一测试必须用至少两个不同 project/object/cycle/milestone/cardinality 输入运行，并验证输出只随输入变化。 |

### `c23-m3-experiment-runs.test.js`

| Item | Status | Reviewer verdict | Evidence / reason |
| --- | --- | --- | --- |
| public run APIs | agree | keep | API 导出合同明确。 |
| fixture dimensions | agree | keep | 具体 fixture 值是样例输入；这里检查 fixture 能覆盖所需维度。 |
| canonical reproducible run | agree | probe | deterministic/no local probe 有效；精确 canonical representation 是否公开合同需确认。 |
| argv/output materialization | agree | keep | 从输入 binding 派生且选择性断言。 |
| NeRF eight scenes | agree | parameterize | “8”与场景列表重复 fixture；应从 scan declaration 派生数量/顺序。 |
| AceSim frequency ordering | agree | parameterize | 算法顺序应测，期望列表应从声明构造。 |
| AceSim L1/L2 Cartesian expansion | agree | parameterize | 同上，避免 fixture cardinality 改动造成无关维护墙。 |
| host-memory exhaustion Attempt | agree | keep | 错误、时间、id 都是显式输入，失败准确。 |
| same-identity rerun parent | agree | keep | 身份隔离是安全/溯源合同。 |
| invalid provenance/secret/path variants | agree | split | 零写与拒绝有效；共享宽泛 message regex 可能接受错误拒绝原因，应按 error code 分类。 |
| ambiguous scans/collisions | agree | split | 拒绝行为有效；宽 regex 归因不足。 |
| `recordRun` boundary | revise | keep schema enumeration; split error attribution | log/config/metrics 是当前 `runSpec.output` 明确必需字段，枚举遗漏项正是合同测试，不应仅因枚举就 parameterize；可用 schema helper 集中定义，并把宽错误 regex 拆开。 |
| no scheduler authority | agree | rewrite | 文件名含 `process` 并不等于 scheduler authority；应检查允许的 authority object/schema，当前会误杀合法 evidence 文件名。 |

### `claude-hooks.test.js`

| Item | Status | Reviewer verdict | Evidence / reason |
| --- | --- | --- | --- |
| SessionStart/compact context | agree | rewrite | 固定 M04/F001、`write_tests` 与英文句子是旧 fixture/prose；应断言结构化 refs/稳定 marker。 |
| Stop critical/warning policy | agree | reclassify | 只保护 legacy `PROGRESS.md`/metrics，需明确兼容期限。 |
| PermissionRequest profiles | agree | keep | profile/decision 枚举和安全结果是产品合同。 |
| tool/progress refresh | agree | keep compatibility | fixture path 可接受，验证事件输出结构。 |
| generated hook event inventory | agree | rewrite | 精确 9 项与 canonical registry 重复，新增事件也可能漏检 parity。 |
| wrapper JSON | agree | split | parseability 保留，Resume 英文措辞移除。 |

### `codex-subagent-discipline.test.js`

| Item | Status | Reviewer verdict | Evidence / reason |
| --- | --- | --- | --- |
| shared guidance encourages subagents | agree | rewrite | 四条英文句子测试 prose，不测试结构化 policy/projection。 |
| platform-neutral wording | agree | rewrite | blacklist/whitelist 可被同义改写绕过或误杀。 |
| implementation/validation policy | agree | rewrite | 大量 prose regex 应改为 canonical structured policy 与 projection parity。 |
| hidden-test/degraded mode | agree | rewrite | 拼接文件会让一个 surface 替另一个 surface 假通过。 |
| Patch lane policy prose wall | agree | rewrite (high) | L100-L117 的双语 mega-regex 会让一次合理编辑触发大量失败。 |
| topology selection | agree | keep | profile、roles、constraints 是明确 policy API。 |
| evidence coverage/identity | agree | split | 行为保留，identity collision 改断言稳定 code。 |
| Plan/Resume lifecycle projection | agree | rewrite | 要测逐 surface projection 完整性，不测七句英文。 |
| repository-wide legacy phrase scan | agree | rewrite | 扫描范围过宽，历史/audit 文本能引发无关失败；限定 active generated surfaces。 |
| setup/help provider routing | agree | split | `53` command count 与 provider routing 无关，必须移除固定 count。 |

### `cycle-lifecycle-vnext.test.js`

| Item | Status | Reviewer verdict | Evidence / reason |
| --- | --- | --- | --- |
| peer Delivery APIs | agree | keep | 公开导出。 |
| ordered Milestones/no gates | agree | keep | M1/M2 是输入样例，断言输出顺序合理。 |
| order/aggregate acceptance | agree | keep | 失败对应生命周期合同破坏。 |
| two-Milestone reject/revise/resume/accept E2E | agree | split + thin E2E | 输入 IDs/times 不是通用硬编码；但单 case 覆盖过长，失败定位差。 |

### `deletion-gate.test.js`

| Item | Status | Reviewer verdict | Evidence / reason |
| --- | --- | --- | --- |
| manifest binds hash/Git and protected set | revise | parameterize/probe classifier | C21/M5 路径作为攻击样例本身合法；缺陷是只有一组路径，无法证明 classifier 对不同 ref/新 protected class 通用。不要仅把 literal 删除，应加多 identity/property matrix。 |
| missing/wrong/expired/content/Git drift | agree | keep | 五类独立 fail-closed 条件，失败范围合理；message 可改 code。 |
| controlled one-time executor | agree | keep | receipt consumption、删除一次、evidence ownership 均准确。 |
| repository authority separation | agree | keep | authority 与 target repo 分离是关键安全合同。 |

### `explore-contract.test.js`

| Item | Status | Reviewer verdict | Evidence / reason |
| --- | --- | --- | --- |
| metadata and isolated worktree | revise | keep core generation; split legacy side effects | E001、slug、branch/path 是给定空仓库+topic 下的确定公开输出，并非天然错误硬编码。`.pipeline/log.yaml`/knowledge 的 legacy 布局可拆分；应另加不同 topic/default branch 输入，而非削弱确定性断言。 |
| dirty worktree decision | agree | keep | 未授权零写与显式 override 合同准确。 |
| route/skill/artifact/path | agree | split | `batch.default_gate=auto` 与 Explore 无关；route、projection、path 分开可降低级联。 |

### `guide-router.test.js`

| Item | Status | Reviewer verdict | Evidence / reason |
| --- | --- | --- | --- |
| lifecycle/intent routing table | revise | keep compatibility or reclassify by explicit retirement | 公共 route 改变本来就应让相应 case 失败；legacy state 是兼容输入。只有确认旧 lifecycle 不再支持时才 quarantine，不能因出现 C5 就直接判偶然硬编码。 |
| plan/batch/patch/explore intents | agree | keep | route IDs 是结果合同，样例自然语言只是输入。 |
| adaptive Discover risk | agree | split | risk mode/reason 有效；精确 `first_questions` 顺序过耦合。 |
| design concept artifacts | agree | keep | 多数字段从输入回显；旧 protected path 是否退役另行决定。 |
| route + docs layering | agree | split | 行为、中文样例和多个 prose surface 混在一个失败点。 |

### `layered-config-integration.test.js`

| Item | Status | Reviewer verdict | Evidence / reason |
| --- | --- | --- | --- |
| precedence/provenance | agree | keep | 权威顺序明确。 |
| portable defaults + named integrations | revise | split for locality, not delete names | `/home/heyx` portability与 bundled `hypo-workflow`/`hypo-writer` 默认项是两个合同；命名集成若属发布默认就应测，但不要拿它证明通用 portability。 |
| migration dry-run/prompt | agree | split | 零写有效，精确 prompt prose 不稳定。 |
| explicit write API vs sync | agree | split/reclassify adapter | Core 权限边界保留，retired CLI 兼容另测。 |
| only `/home/heyx` forbidden scan | agree | rewrite | 只捕获一位开发者，无法发现 `/Users/alice`、其他 `/home/*` 或 Windows machine path；需解析/allowlist。 |

### `maintenance-command-map.test.js`

| Item | Status | Reviewer verdict | Evidence / reason |
| --- | --- | --- | --- |
| maintain command family | agree | keep | canonical commands/route/skill 是公开合同。 |
| maintain separated from sync | agree | keep | alias projection与所有权边界明确。 |

### `opencode-model-matrix-docs.test.js`

| Item | Status | Reviewer verdict | Evidence / reason |
| --- | --- | --- | --- |
| command/parity Markdown rows | agree | rewrite | 精确表格格式重复 canonical map；应从 source 解析比较。 |
| model/context defaults prose | agree | reclassify or canonical parity | model 名、900000、中文句子属于 target-owned tuning/文档，不应在 Core 以手抄 regex 锁死。 |
| scenario source contains artifact names | agree | rewrite | 读取另一个 Scenario 的 shell 文本不等于执行或证明 artifact；属于 meta-test 假覆盖。 |

### `pr-create-execution.test.js`

| Item | Status | Reviewer verdict | Evidence / reason |
| --- | --- | --- | --- |
| no writes before confirmation | agree | keep | provider call ledger 精确证明远程零副作用。 |
| deterministic provider order | agree | probe then keep/simplify | push-before-create 很可能是安全合同；reviewers/labels 是否必须串行需由公开契约决定。 |
| worktree summary | agree | split | dirty/scope 有效；固定建议 branch 和中文/英文 guidance 是策略/prose。 |

### `project-notifications.test.js`

| Item | Status | Reviewer verdict | Evidence / reason |
| --- | --- | --- | --- |
| enqueue local queue/no QQ | revise | keep behavior; centralize storage path | 精确 queue path 可以是存储协议合同；不必因绝对 fixture project path而 parameterize。应从 canonical storage helper 获取，保留 local-only/append authority。 |
| confirmed dispatcher only | revise | reclassify compatibility | 代码与 later tests 的“retired”状态矛盾，需产品 retirement 决定；不能仅因 provider 旧就否定安全合同。 |
| Claude Stop retired path | agree | split | 零外联/retired status 有效，replacement prose/name 不稳定。 |
| Codex notify excludes QQ | agree | split/rewrite | no enqueue/dispatch 有效；`workflow_root`和注释 regex 是实现文本。 |
| dispatcher wrapper retired | agree | split | no dispatch 保留，固定 PATH 段与英文提示不应锁死。 |
| CLI exposes retired commands | revise | reclassify, not unconditional remove | CLI 可能是兼容入口并返回 retired/status；删除会改变公开 surface。先确定 deprecation/compatibility contract，再决定 remove。 |

### `reference-contract.test.js`

| Item | Status | Reviewer verdict | Evidence / reason |
| --- | --- | --- | --- |
| response/audit/whitelist docs | agree | split | schema/config tokens可测；全文件 loose prose token 可在错误位置假绿且对编辑敏感。 |

### `secret-ref-projection.test.js`

| Item | Status | Reviewer verdict | Evidence / reason |
| --- | --- | --- | --- |
| metadata-only refs | agree | keep | literal secret/provider/project 是攻击输入；递归 forbidden-key/raw-marker 检查是强安全合同。 |
| supplied refs sanitized | agree | keep | 对已投影输入仍 fail-closed，失败准确。 |

### `subagent-separation-contract.test.js`

| Item | Status | Reviewer verdict | Evidence / reason |
| --- | --- | --- | --- |
| spec concepts | agree | rewrite | 七条 exact prose regex 与另一测试重复。 |
| two-layer prompt assembly | agree | split | 字段是协议，heading/长句不是。 |
| templates carry fields | agree | split | 每文件字段检查有效；固定 heading 和泛化 `evidence/artifact` 文本应去除。 |
| execution skills policy | agree | rewrite | 拼接五文件导致某一 skill 缺失仍可能由别处命中；必须逐 surface parity。 |
| cross-suite duplication | missing | consolidate | 本文件与 `codex-subagent-discipline.test.js` 对同一 prose 重复建墙；一次编辑会跨两个文件级联。保留一个 structured authority test 与逐 projection validator。 |

### `workspace-concurrency-recovery.test.js`

| Item | Status | Reviewer verdict | Evidence / reason |
| --- | --- | --- | --- |
| concurrent atomic writer | agree | probe | 结果合同有效；150ms scheduling/timing 对慢 CI 敏感。 |
| ordinary-failure recovery | agree | keep | 状态与最终字节准确。 |
| forged far-future expiry | agree | probe | 安全合同有效，3s/5s 是环境性失败源。 |
| SIGTERM recovery | agree | keep on declared POSIX lane | signal 是攻击维度，不是偶然输出。 |
| SIGKILL recovery | agree | keep on declared POSIX lane | 同上。 |
| stale stopped writer fenced | agree | probe | fencing 必须测，10/15s与 signal choreography 需确定性 seam。 |
| fence before rename | agree | keep stable test seam | 最终 rename 边界是关键原子性合同。 |

## Scenario 复审

| Item | Status | Reviewer verdict | Evidence / reason |
| --- | --- | --- | --- |
| `c21/s74-resume-recovery` | agree + stronger evidence | rewrite immediately | 实测 `node --test --test-name-pattern='THIS_WILL_NOT_MATCH_04' core/test/goal-lifecycle.test.js` 输出 `1..0` 后仍报告 file pass、exit 0；现 runner 未断言匹配数，因此改测试标题即可假绿。 |
| `v0/s06-custom-sequence` | revise | rewrite/reclassify, not “no runner” | 共享 `tests/run_regression.py` L267-L269 会检查 `preset: custom`、`implement`、`review_code`，且 common validator 检查 checklist/config/results。它可失败，但完全不验证声称的执行顺序、无测试步骤、state/log/evaluation。 |
| `v2.5/s10-progressive-disclosure` | revise | rewrite/reclassify, not “no runner” | 共享 runner L276-L282 检查全仓 references/scripts/assets 固定下限与 `watchdog.sh`，不是 progressive disclosure 加载行为；合法资产整理会失败，Agent 跳过引用却可通过。 |
| `v6/s20-help-init` | agree | reclassify/rewrite | `run.sh` 只 grep 精确 Markdown；格式改动失败，CLI/init 行为破坏未必失败。 |
| `v6/s30-init-rescan` | agree | remove or behavioral rewrite | 只 grep 三处 prose/路径，无 runtime attribution。 |
| `v8.2/s40-compact-session-start` | agree | remove or behavioral rewrite | 固定 shell 函数、日志措辞、skills 参数，锁定退役实现细节并形成多 surface cascade。 |
| `v8.4/s50-rules-system` | agree | rewrite (high) | 精确 17 builtin、3 preset、41 commands、`Summary: 17/20` 与大量 prose；加一个合法 rule/command 会多点失败。行为部分也依赖 legacy protected state/session-start shell，应与 inventory parity 分开。 |
| `v9/s60-progress-board-format` | agree | remove/rewrite from current fixture | 绑定 archived C3 文件与中英文 headings；历史文件移动即可失败，当前 renderer 破坏却可能通过。 |
| shared Scenario runner | missing | audit as first-class owner | primary 声称读取直接 runner，但遗漏 `tests/run_regression.py`；该 runner 对 s01-s15 的 name-based special cases会覆盖/补充本地 `run.sh` 语义，必须纳入所有相应 shard 的合同审计。 |

## 争议与修订摘要

1. **样例 literal 不等于错误 hardcode。** `C21/M5/M6`、E001、C5、project path 可以是 fixture 输入。错误发生在输出期望不从输入派生、只覆盖单一 identity/cardinality，或把样例数量当产品真值。bootstrap 的 primary 结论保留，但理由应按此收窄。
2. **`s06`/`s10` 并非无 runner。** 两者由共享 Python runner 执行；问题是验证目标偏离、固定 counts 与假覆盖，不是完全不可执行。
3. **退役接口不能未经决策直接删除测试。** `project-notifications` 同时存在 retired wrapper 与公开 CLI/dispatch API，说明兼容边界未收敛。先决定公开 deprecation 合同，再 remove/reclassify。
4. **确定性输出可以精确测试。** Explore 的 ID/slug/path、Experiment required output kinds 若属于公开算法/schema，合法功能修改本就应触发聚焦失败；不应为了避免 literals 把断言弱化成只检查“存在”。
5. **跨文件 prose 重复是独立 blast-radius 缺陷。** `codex-subagent-discipline` 与 `subagent-separation-contract` 重复保护相同自然语言；应合并到 structured policy/projection checker。

## 高优先级 findings

1. Bootstrap 当前测试只能证明 C21 reference fixture，不证明激活器对不同项目、Cycle、Milestone 和 record cardinality 通用；必须加入异构 fixture/metamorphic matrix。
2. Subagent policy 由两个测试文件、多个拼接 surface 和数十条双语 regex 重复保护，合理文案编辑会失败一大片，单个 surface 缺失又可能假绿。
3. Scenario 体系存在两种假覆盖：`s74` name-pattern 零匹配退出 0；`s06`/`s10` 的 shared runner checks 与 Scenario 声称合同不一致。
4. `s50` 用固定 inventory/count/prose 快照替代规则系统行为，合法新增 rule/command 会产生错误的级联失败。

## 建议反事实 probes

1. 用第二个非 C21 project/object/milestone fixture 运行 bootstrap 全链路；变更 record 数量但保持 schema/语义，确认所有 path/count 由输入派生。
2. 在 bootstrap 原 fixture 增加一个合法、不同 dedupe key 的 record；当前 `7/6` 应失败，以量化偶然 cardinality 耦合。
3. 对 Subagent policy 只改一个非合同 heading/同义句，记录两个 test files 的失败数；再从单个 skill 删除必要 projection，验证当前 combined regex 是否仍假绿。
4. 将 `goal-lifecycle.test.js` 中 Resume case 改名但不改行为，确认 s74 仍 exit 0；修复后必须对 TAP executed/matched count 断言。
5. 保持 s06 config 不变但完全不产生 state/log/执行序列；当前 shared runner 会通过，证明其合同缺口。
6. 保持 s10 全仓文件数量不变但移除 progressive reference loading；当前 runner 会通过。反向只整理一个无关脚本/资产数量，观察是否错误失败。
7. 新增一个合法 builtin Rule 和一个公开命令；当前 s50 应在 counts、summary、README 多处级联失败。
8. 创建合法 Experiment evidence 文件名含 `process-notes`；当前 no-scheduler filename regex 会误报。

## Catalog / fixture / CI 问题

- `tests/run_regression.py` 是 Scenario 的实际共享 runner，应进入 inventory 支撑面，不能只读各目录的 `run.sh`。
- `s74` 需要稳定 test entry 或 TAP match-count gate；仅依赖 `--test-name-pattern` 的 exit code 不可信。
- `s06`、`s10` 应把 catalog reason 写清楚为“legacy/shared-runner partial checks”，不能让 checklist 宣称完整 PASS。
- `s50`、`s60`、`s20`、`s30`、`s40` 都主要是 source/prose snapshot；quarantine 并不能使失败含义变得正确，只是避免默认 gate。重写前不应作为有效行为覆盖计数。
- bootstrap fixture 的具体身份可保留，但测试 expectation 应读取 fixture metadata/returned refs；第二 fixture 必须改变项目名、object id、Cycle/Milestone、record 数和路径 slug。

## 零遗漏自检

- 已按 primary inventory 重新检查全部 18 个测试文件；覆盖每个顶层 case，并覆盖 activation 四个 fault subcase、Experiment validation loops、Deletion 五类拒绝、workspace 的 SIGTERM/SIGKILL 动态 case。
- 已读取 8 个 Scenario 的 checklist、本地 `run.sh`（若有）及共享 `tests/run_regression.py` 对相关 Scenario 的分支。
- 已实际验证 Node 22 的 unmatched `--test-name-pattern` 返回 0，支撑 s74 假绿结论。
- 本报告只写入 `audits/reviewer-04.md`；未修改产品代码、测试、fixture、catalog 或 Scenario。

## Frozen Inventory 机械对账

- Inventory：`audits/INVENTORY.md`，`frozen_commit=cd829923957ba09d5d0f1d0aa7ec9b5eecab9d93`，全量 `179` test files / `76` Scenarios。
- Shard 4 inventory：18 test files + 8 Scenarios。
- Primary-04 覆盖集合 vs frozen shard 4：`missing=0`，`extraneous=0`。
- Reviewer-04 覆盖集合 vs frozen shard 4：`missing=0`，`extraneous=0`。
- Primary 与 reviewer 的路径集合完全一致；本 reviewer 额外读取 `tests/run_regression.py` 仅作为这 8 个 Scenario 直接消费的共享 runner 支撑面，不把它误计为 shard executable item。
