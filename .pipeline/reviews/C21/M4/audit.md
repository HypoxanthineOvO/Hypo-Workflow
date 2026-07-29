# C21-M4 独立最终审计

## 元数据

- Milestone: `C21-M4`
- 审计时间: `2026-07-12T05:44:18+08:00`
- 输出语言: `zh-CN`
- 时区: `Asia/Shanghai`
- Verdict: `NEEDS_CHANGES`
- Audit worker: `/root/m4_audit`
- Mode: 全新独立 audit identity；仓库只读，除本报告外未修改任何文件
- Findings: `1 Critical / 2 Warning / 0 Info`
- 评分尺度: `1=最好`、`5=最差`；adaptive threshold: `3`

## Intake

- **触发原因:** C21-M4 完成 GREEN 后的 Milestone 最终验收门禁。
- **用户与关键 workflow:** 新项目或 Brownfield 项目的首次 Init、Legacy 项目的只读识别，以及 Root Skill 对可用命令的渐进路由。
- **良好状态:** Init 只在明确 intent 后通过一次 manifest-last transaction 形成完整 current workspace；Legacy/current/mixed/no-input 路径零写；Brownfield 证据可追溯且不泄露敏感或隐藏上下文；命令只在真实、安全的 Child Skill backend 存在时可发现。
- **正确性契约:** M4 prompt、C21 architecture、M1 transaction、M2 Runtime/Records、M3 Capsule 边界，以及父任务列出的九组强制验证项。
- **范围:** `core/src/init/**`、Legacy inspector/barrel、command registry/router、Core root M4 exports、Root/Init/Guide Skills、四个 M4 tests、fixtures、两份 worker evidence、M1-M3 兼容边界与 Workflow worker state。
- **排除项:** General migration、Goal/Cycle backend、平台 adapter 重构、旧 Skill 删除、网络/依赖安装/远程操作、M8 Deletion Manifest 之前的清理。
- **风险容忍度:** 可复现的 secret/authority/path-trust 缺口阻断 M4；已认证且明确记录的 M1 空目录残留可作为 residual boundary 保留。
- **Handoff:** 返回 TDD；test worker 先发布下述三个 RED contracts，implement worker 只接收行为契约，之后必须使用新的 audit identity 复审。

## 方法

- **GQM:** 以“Init 是否只形成可重建的新 authority、Legacy 是否真正零写、Router 是否只暴露可信 backend”为目标，分别提出 transaction、evidence、availability 三组问题并用真实临时仓库测量。
- **ISO/IEC 25010:** 检查 functional suitability、reliability、security、maintainability、compatibility 和 portability。
- **ATAM-lite:** 重点检查 manifest-last 原子性、派生视图方向、Legacy/raw evidence 边界，以及物理 Skill backend availability 的敏感点。
- **SWEBOK:** 对 requirements、construction、testing、configuration management、maintenance 和 worker separation 进行交叉核对。

## 结论

M4 的主流程和已声明测试均为 GREEN：独立 focused suite 为 `25/25`，Empty/Brownfield 输出可由 M2/M3 readers 重开，Record 两个 index 与 empty-Journal Capsule 均可字节一致重建；Registry/legacy inventory/discovery 分别为 `54/53/2`，legacy generator 不读取或生成 Goal，Root Skill 保持在 routing scale。

但 M4 **不能完成验收**。独立 `/tmp` 反证发现一个阻断性的敏感元数据持久化缺口，以及两个物理路径信任缺口。它们不推翻整体架构，却违反了本 Milestone 明确的 fail-closed、安全证据和 non-symlink backend 契约。现有 `25/25` 未覆盖这些边界。

## Findings

### Critical 1: Brownfield 证据元数据可绕过 secret/hidden-reasoning gate 并进入权威 Record

- **Dimension:** Risk
- **Tags:** security, authority, tests
- **Location:** `core/src/init/index.js:194`, `core/src/init/index.js:403`, `core/src/init/index.js:532`
- **现象:** Request 的普通值会经过敏感检查，但 Brownfield 文件路径被直接转换成 fact/source ref；同时 `assertExactKeys(...)` 先于完整的 secret-like key 检查运行，并会把未知字段名写入错误消息。
- **原因:** secret/hidden-reasoning 检查只覆盖 request values、显式 identifiers 和 package name，没有覆盖 repository-derived path metadata、所有 package metadata keys，以及 schema error 中将被呈现的未知 key。
- **独立证据:** 在自建临时 Brownfield repo 中放入一个 basename 匹配项目既有 bounded `password-seed-<high-entropy>` 规则的文件，Init 返回 `initialized`；`adoption_brief.facts` 与磁盘上的 Adoption Brief Record 都包含该 marker。另一个 `chain_of_thought.txt` 路径也被接受并返回。将相同敏感 marker 用作未知 request key 时，Init 虽拒绝输入，但错误消息原样回显该 key。所有探针都只在 `/tmp` 运行；报告未保存 marker 原值。
- **影响:** 受控或接手的仓库可以把 secret-like path metadata 或 forbidden reasoning label 写入 `.pipeline/memory/records/**`、派生 index/Capsule source chain 和用户可见返回值；错误路径还可能把敏感 key 带入会话或日志。这违反 Init 的持久化安全与无回显契约。
- **Required remediation:** 在创建任何 fact、source ref、错误文本或 transaction 之前，对所有 repository-derived metadata 与未知 input keys 使用同一套不回显的 secret/hidden-context validator。匹配时以固定错误 envelope fail closed；不要只在渲染阶段过滤。保留合法的普通文件名，继续使用有限且高置信度的敏感样式。
- **RED acceptance:** 分别覆盖敏感 basename、隐藏推理 basename/package key、敏感未知 request key；要求 Clock/path/write 之前拒绝，错误不含输入，workspace/source tree 零变化，返回值、Record、index、Capsule 均无残留。
- **Route:** `fix-now`

### Warning 1: Router 将 symlink `repoRoot` 视为可信 Skill bundle

- **Dimension:** Risk
- **Tags:** security, compatibility, architecture
- **Location:** `core/src/commands/index.js:230`
- **现象:** `inspectSkillBackend(...)` 从 `resolve(repoRoot)` 开始检查 `skills/...` 子组件，却从未 `lstat`/验证 `repoRoot` 本身。
- **独立证据:** 创建真实 bundle 后，以一个 symlink 作为 `repoRoot` 调用 `resolveCommandRoute('/hw:guide', ...)`，结果为 `available`；`discoverableCommandMap(...)` 同时广告 `/hw:guide` 和 `/hw:init`。同一实现能正确降级 missing/child-symlink backend，缺口仅在 root trust anchor。
- **影响:** availability gate 可以把 symlink 另一端的外部或被替换 Skill 当作当前 bundle backend；随后遵循 Root Skill 的 host 可能加载不属于所声明仓库根的指令。
- **Required remediation:** 在遍历 Child Skill 前验证 resolved `repoRoot` 本身是 regular directory、不是 symlink，并建立 realpath containment anchor；backend 每个组件与最终文件继续要求 non-symlink。诊断必须不暴露外部 target path。
- **RED acceptance:** symlink `repoRoot` 下 route 返回 `unavailable` 且 `writes: []`，discovery 排除对应命令；普通 root、missing backend、child directory/file symlink 与 near-prefix 行为保持不变。
- **Route:** `fix-now`

### Warning 2: Direct Legacy inspector 未验证中间 `.pipeline` 目录

- **Dimension:** Engineering
- **Tags:** reliability, security, API-contract
- **Location:** `core/src/migration/legacy-inspector.js:15`, `core/src/migration/legacy-inspector.js:35`
- **现象:** Inspector 验证 workspace root 和五个固定 leaf，但不验证 `.pipeline` ancestor。若 `.pipeline` 是指向一个不含这五个 leaf 的目录 symlink，每次 leaf `lstat` 都得到 `ENOENT`，函数最终返回 `classification: legacy`、`sources: []`，而不是拒绝 symlink。
- **独立证据:** 自建临时 workspace 的 `.pipeline` 指向另一个空临时目录；直接调用 exported `inspectLegacyWorkspace(...)` 被接受。若外部 leaf 存在，后续 realpath 检查能够拒绝，因此这是“无 leaf 时绕过 ancestor gate”的边界。`initializeWorkspace(...)` 的前置 `.pipeline` 检查仍能保护主 Init 路径。
- **影响:** Root-exported inspector 的独立 fail-closed contract 与 Init/Guide Skill 描述不一致；调用者绕过 Init wrapper 时会错误地认可一个 symlink authority root。
- **Required remediation:** Inspector 开始时显式验证 `.pipeline` 是 workspace 内的 non-symlink directory；随后再读取固定 leaf。缺失 `.pipeline` 与 symlink/non-directory 必须使用不同、安全、无目标路径回显的结果。
- **RED acceptance:** empty-target 与 internal-target `.pipeline` symlink 都拒绝且 root/external bytes+mtime 不变；普通 Legacy、malformed leaf、leaf symlink 与 missing optional leaf 维持现有行为。
- **Route:** `fix-now`

## 已通过的架构与 Authority 检查

- **单次 manifest-last Init:** Empty 与 Brownfield 都只调用一次 M1 transaction；所有 Runtime、Continuation、active ref、两条 Record、两个 derived index 和 Capsule 在 manifest 激活前一起 staging。没有先激活半成品 workspace。
- **故障恢复:** `after_prepare` 时无 manifest 或业务 target file；`recoverWorkspaceTransaction(...)` 返回 `rolled_back` 且恢复为零 authority/data files。只保留已知的空 `.pipeline/runtime/transactions/` 祖先目录，这是 M1 已记录的 filesystem residual，不是新的 M4 writer authority。
- **M2/M3 可重建性:** 独立 Init 后，manifest、active pointer、bootstrap Runtime/Continuation、两条 Records 和 Capsule 都能通过 certified readers 重开；重建后的 `index.yaml`、`INDEX.md` 和 Capsule 与 Init bytes 完全一致。
- **Authority non-duplication:** `initial_snapshot` 为 `null`；文件清单没有 Receipt、Journal event、Recovery Pack、Goal、Cycle、legacy state/config/log 或 adapter/global-registry 输出。
- **Workspace classes:** Focused tests确认 no-input、current、mixed、legacy、damaged、empty 和 brownfield 行为分离；current/mixed 返回磁盘 manifest 且零写，damaged 不 fallback legacy，Init wrapper 在 classification 前拒绝 symlink/non-directory `.pipeline`。
- **Brownfield 正常证据:** fixture source bytes/hash/nanosecond mtime 不变；正常 facts 均有 existing repo-relative source ref、basis 与 confidence，inference 不标记 `confirmed`，未制造无证据技术栈。Critical 1 仅否定其敏感元数据 gate。
- **Legacy raw parsing:** 五个存在的 YAML 文件直接 `parseYaml`，没有调用 default-filled config loader；malformed source 为 `unreadable` 且不含 document，读取前后 bytes/mtime 一致；summary 只从实际 document 派生。
- **Registry:** 54 个 canonical entries 均有合法 exposure/availability；52 个 unavailable entries 都有 reason；仅 Guide/Init 为 public+available；Goal 存在于 canonical/router 但 unavailable。
- **兼容库存:** `commandMap()` 为 53 条且不含 Goal；所有 53 个 backend 当前都是 regular non-symlink files。真实 `/tmp` `writeCursorSkillBundle(...)` 成功，生成 53 个 command files 且没有 Goal Skill/command。
- **Discovery/Router 正常路径:** 三种 namespace、trailing arguments、longest command 均通过；五个近似前缀全部得到 `unknown`/`canonical: null`；internal/deferred/removed/unavailable 返回明确 message、`writes: []` 且无 executable flag。Warning 1 仅否定 symlink root anchor。
- **Skill surface:** Root `SKILL.md` 为 105 行 / 7,183 bytes，保持 progressive-disclosure router；Init/Guide description 与 canonical `## 输出语言规则` 存在；Root 保留 consultation-first、显式 start、Ask 上下文、report-in-chat、`.pipeline` authority、dirty-worktree 与 destructive gate。没有恢复旧 Setup/Rules/global sync/min_rounds writer 流程。
- **平台边界:** M4 未新增 adapter/plugin/CLI/manifest 写入或平台支持声明；platform-neutral discovery 只投影 registry metadata。

## Validation

- 独立 focused command: `25/25` passed，`0` failed，`0` skipped，exit `0`。
- 独立反证 probes: 正常重建/Registry/near-prefix 路径通过；上列 3 个 production gaps 可重复复现。
- Record/Capsule rebuild: machine index、Markdown index、Capsule 均 byte-identical。
- Registry counts: `54 canonical / 53 legacy inventory / 2 discoverable`；Goal 不进入 legacy inventory。
- Skill quality: `0 issues across 45 Skill files`；53 user-facing legacy commands、43 unique Skill paths、1 internal Skill。
- Legacy generator smoke: 54 skill files（含 root）/53 command files；无 Goal 输出。
- `node --check`: Init、Legacy inspector/barrel、command router、Core root 全部通过。
- Scoped `git diff --check`: 通过；TODO/FIXME marker scan 与高置信度 credential-pattern scan无发现。
- Main-thread evidence reviewed, not rerun: full `885/885`、M1 `76/76`、M2 `61/61`、M3 `47/47`、lifecycle log `7/7`、4 M4 exports、config/diff/syntax/whitespace/credential checks均通过。
- 本审计没有重复 full suite；这是父任务明确允许的边界。

## Scoring

| Dimension | Score |
| --- | ---: |
| `diff_score` | 2 |
| `code_quality` | 3 |
| `test_coverage` | 3 |
| `complexity` | 2 |
| `architecture_drift` | 3 |
| **overall** | **4** |

虽然局部结构、兼容层和主流程质量良好，但 Critical secret-persistence finding 直接违反 authority/security acceptance contract，因此 overall 超过 threshold，不能用平均分掩盖阻断项。

## Worker Separation

- Test identity: `/root/m4_test`；仅拥有四个 M4 tests、fixtures 与 test evidence，最终状态 `TEST_REVISION_READY`。
- Implement identity: `/root/m4_implement`；仅拥有 M4 production/Skill scope 与 implementation evidence，最终状态 `IMPLEMENTED_REVISION_3`；其证据声明未读取或运行 M4 tests。
- Audit identity: `/root/m4_audit`；全新 identity，未参与 test/implement，只读取审计范围并只写本报告。
- Main agent 负责 focused/full orchestration 与 protected Workflow lifecycle updates。三种角色保持分离，没有 silent downgrade。

## Dirty Worktree

审计开始和写报告前的 `git status --short` 内容字节一致，SHA-256 均为 `30922011cc61799b031f22f2912f40349f1eeee4d80581e9eab764c8b8aaafdd`。所有行为探针与 generator smoke 都在自建 `/tmp` workspace 中执行。没有 reset、checkout、clean、依赖安装、网络、远程、service restart 或 destructive action；现有 dirty changes 未被回退或清理。

写报告前 protected files 的 SHA-256 已记录；本 worker 未写 `.pipeline/state.yaml`、`.pipeline/cycle.yaml`、`.pipeline/log.yaml` 或 `.pipeline/PROGRESS.md`。本报告写入后会再次核对。

## Residual Risks

1. M1 transaction 在 pristine rollback 后保留空 transaction ancestor directories；authority/data files 已恢复，精确空目录清理仍属于已知 M1 residual。
2. Missing project root 的创建发生在 `.pipeline` transaction 之外；no-input/rejected input 不创建 root，有效 intent 才创建。此边界已由实现证据明确声明。
3. Brownfield inference 仍是有限、浅层扫描；修复 Critical 1 后也不应把它当成后续 Architecture discovery 的替代品。
4. Secret detection 是有限的声明语料，不是通用 classifier；本次 finding 要求已识别样式在所有 metadata surface 一致生效，而不是扩展为任意秘密识别。
5. Skill backend check 仍存在一般 filesystem TOCTOU；本次 Warning 1 只要求建立正确的 non-symlink root/containment anchor，不声称跨进程锁定。

## Completion Narrative

- **改动摘要:** 本审计未修改实现、测试、fixtures、Skills 或 Workflow state；仅新增本报告。结论为 `NEEDS_CHANGES`，发现 `1 Critical / 2 Warning / 0 Info`。
- **技术思路:** 将 M4 prompt 与 C21 architecture 映射为 Init transaction、evidence safety、Legacy zero-write、Registry availability 和 progressive Skill 五组不变量；先做静态 authority tracing，再运行 focused、reader/rebuild、generator/Skill quality 与独立 `/tmp` falsification probes。
- **修改/审阅文件与模块:** 唯一修改文件是 `.pipeline/reviews/C21/M4/audit.md`。审阅了 `core/src/init/**`、`core/src/migration/{legacy-inspector,index}.js`、`core/src/commands/index.js`、`core/src/index.js`、Root/Init/Guide Skills、四个 M4 tests、M4 fixtures/evidence、M1-M3 certified boundaries 和 Workflow worker state。
- **测试设计:** 主流程使用真实 filesystem focused tests；派生一致性使用 byte-for-byte rebuild；安全边界使用敏感/隐藏元数据、unknown-key echo、symlink repoRoot、symlink `.pipeline` ancestor、near-prefix 与 generator probes。所有写测试均隔离在 `/tmp`。
- **验证结果:** Focused `25/25`、正常重建/Registry/Skill/generator checks通过；三个额外边界按 findings 可重复失败。Main full `885/885` 与 M1-M3/log evidence一致，但未覆盖这些 failures。
- **预期结果:** Test worker 将三个 acceptance contracts 变成 RED；implement worker 修复后，focused/full 与跨 M1-M3 继续 GREEN，敏感元数据零持久化/零回显，symlink root/ancestor fail closed；新的 audit identity 再决定 PASS。
- **遇到的问题:** 无工具、权限或 worker-separation 降级。唯一需要区分的是 M1 已认证的空目录 residual，它不被误报为新的 M4 authority defect。
- **风险/后续:** 当前不能生成 M4 completion report 或进入 Architecture Plan Review/M5。先完成三项窄修复与测试，再以新 audit identity 做累计复审；M8 之前仍禁止 destructive cleanup。
