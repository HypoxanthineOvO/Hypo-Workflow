# Changelog

## v15.0.0-alpha.1 - 2026-08-06

### Breaking Changes

- `.pipeline/INDEX.md` 与普通语义文件成为新 workspace 的默认入口；manifest Runtime/Receipt/Recovery 只为尚未结束的旧 Delivery 保留兼容读取。
- Codex plugin 从十事件 Hook 集合收敛为 SessionStart、UserPromptSubmit、PreToolUse、PermissionRequest、PreCompact、Stop 六类语义与安全 Hook。

### Features

- 新增可直接审阅的 Cycle、Plan、Progress、Execution、Discussion、Experiment、Memory 与 Handoff 模板及运行时辅助。
- 新增幂等 History Refresh：当前仓库 20 个旧 Cycle 得到摘要和索引层，旧 archives、Manifest 与 live Delivery 原位保留。
- Session 可通过 Work Placement 选择 Delivery/Experiment 并协调 repository、GPU、port、cache 与 output claim；未绑定 Session 不阻塞普通提示、工具或文件记录。
- Experiment 默认使用普通 YAML protocol，旧 events 和 status projection 保留为可选兼容面。

### Fixes

- 辅助 Hook 失败时返回有界 warning；明确删除和真实资源冲突仍保持 fail-closed。
- Root Core 重新导出 sync、TUI、maintenance、project-event 和 notification API，修复 CLI 只读检查的缺失 export。
- Goal/Plan Discussion 一次展示 Discover、Technical 与 Architecture，只在真实决策和最终 Proposal 处询问。

### Tests

- Hypo-Workflow maintained 回归 704/704 通过，History Refresh 场景 7/7 通过，20/20 历史 Plan/Progress 对齐。
- VSP-Codex Host Contract、semantic/legacy routing 与 TUI command routing 合计 25/25 通过。

## v14.0.0-alpha.5 - 2026-07-29

### Fixes

- Codex plugin 与 portable bundle 现在携带锁文件约束的 `js-yaml` 和 `argparse` 运行时依赖，解压后无需额外执行 `npm install` 即可运行 Hook。
- `accepted` 或 `rejected` Delivery 没有 Context Capsule 时，`PreCompact` 与 `PostCompact` 安全返回成功，不再把终态对象当作恢复损坏。
- 发布验证新增从 ZIP 解压后直接加载 serialization 模块的真实进程测试，避免只验证插件登记成功却未执行 Hook。

### Upgrade

- 更新插件时必须保留仍被存量 Session 引用的旧 cache；新版只对新 Session 生效，确认旧 Session 结束后才能清理旧版本。

## v14.0.0-alpha.4 - 2026-07-29

### Features

- 同一 Project 可同时维护多个 Goal、Plan、兼容 Cycle 与 Experiment；每个 Session 必须显式选择一个 Work Item。
- 新增 Repository Target 与 Work Placement registry，在启动前原子判定共享 checkout、独立 worktree、资源隔离或阻断，并以 lease/fencing 防止并发资源争用。
- 源码变更必须通过绑定 registered checkout、branch ref、target HEAD 与 ancestry 的 integration evidence 后才能进入最终验收。

### Fixes

- 合入 v14.0.0-alpha.3 的 Codex Hook reminder 并发修复，并让 Host projection 的并发收尾兼容新增 Work Item/Session 字段。
- 过期 Placement 不再让 Session 管理操作死锁；Experiment compact 在没有 Delivery Recovery Capsule 时安全降级。

## v14.0.0-alpha.3 - 2026-07-19

### Fixes

- Codex `PostToolUse` 不再追加 `tool.completed` Recovery Journal 事件，也不再 replay Journal 做 reminder 去重。
- 相同 reminder 改由 workspace runtime 中的 digest marker 原子去重，`Stop`、compact 和 Subagent writer 语义保持不变。

## v14.0.0-alpha.2 - 2026-07-18

### Features

- 新增 `/hw:experiment` 非线性实验通道，覆盖项目知识、指标与 concept-to-code 映射、Git 代码快照、`uv` 环境、机器/数据集上下文、逻辑 Experiment 与 Attempt 身份、参数扫描、长任务监督、科学审查、trash/restore 和 contextual baseline。
- 新增基于 immutable Experiment events 的 Git 合并与 bounded materialized status projection；普通“现在实验怎么样”查询不再扫描结果目录或全部事件。
- 新增可见 Task Assessment 和确定性 semantic Worker Routing，输出 `mechanical`、`standard`、`explore`、`critical` 或 `escalation`，并跨 Runtime、Continuation、Journal、Capsule 和 Resume 保持一致。

### Fixes

- Codex turn Hooks 允许宿主省略 `turn_id` 或 `tool_use_id`，避免兼容输入反复报错，同时不改变 Hook 信任和启用策略。
- Host Contract v1、Codex plugin ZIP 和 portable ZIP 现包含第十个公开 Experiment Skill 及其 agent metadata，修复源码可发现但发布包漏装的差异。
- Worker Routing 对配置 partial override、输入边界、失败路线计数和 Worker start/stop 路由冻结进行 fail-closed 加固。

### Docs

- README、用户指南、命令/配置参考、Codex 平台说明、插件描述和中英文 release notes 完整说明 Experiment、semantic routing、验证边界和非目标。

### Tests

- C23 最终维护回归 `638/638 PASS`，Worker Routing focused `21/21 PASS`，相关集成 `138/138 PASS`。
- 独立最终审计 `P0=0 / P1=0 / P2=0`；真实 NeRF、AceSim、GitLab、SSH/SCP、大 trace 和多周实验仍保留为后续 Pilot 边界。

## v14.0.0-alpha.1 - 2026-07-13

### Versioning

- 将 manifest-based Workflow Core 正确归入 14.0 主版本：Runtime、Host Contract、命令表面和宿主权威边界均包含破坏性变化。
- 当前仍允许 Schema、安装协议和平台适配发生破坏性调整，因此使用 `alpha.1`，而不是延续 13.1 beta 序列。
- `v13.1.0-beta.3` 保留为已发布历史版本，但由本版本取代。

### Features and Fixes

- 继承 beta.3 已验证的 manifest Core、Records、Receipts、Recovery Journal、Goal/Cycle、Maintain、Bootstrap 和九命令公共表面。
- 继承 Host Contract v1、严格只读 projection、可复现 Codex plugin / portable bundle，以及 OpenCode 原子安装与 rollback。
- 保留精确删除 manifest、单次 Receipt 和独立 test/implement/audit 验收闭环。

### Tests

- Hypo maintained Core `486/486`、scenarios `8/8`、Bootstrap `67/67`。
- Codex Host/routing/TUI/palette 与 OpenCode 真实 portable ZIP 安装链均已在 G22 验证通过。
- Alpha 发行物执行连续双构建 checksum 一致性验证。

## v13.1.0-beta.3 - 2026-07-13

### Features

- 发布 manifest-based Workflow Core：Runtime、Records、Receipts、Recovery Journal、Goal/Cycle、Maintain 与 Bootstrap 采用单一写入权威。
- 新增 Host Contract v1、严格只读 Host Status projection、九命令公共表面，以及可复现的 Codex plugin / portable bundle。
- Codex 与 OpenCode 宿主改为消费经过 checksum 校验的已安装发行版；OpenCode portable ZIP 支持原子激活与一次 rollback。

### Fixes

- 移除旧 Workflow runner、legacy writer、conversation capture 和退役命令路径，避免宿主与 Skill 双重拥有生命周期状态。
- 修复发行来源绑定、递归 schema 校验、Bootstrap projection 原子失效和 ZIP mtime 不稳定问题。
- 破坏性清理改为精确 manifest、单次 Receipt 与执行报告门禁。

### Tests

- Hypo maintained Core `486/486`、scenarios `8/8`、Bootstrap `67/67`。
- Codex Host/routing/TUI/palette `5/5 + 4/4 + 8/8 + 1/1`，`cargo check` 通过。
- OpenCode Host/真实 ZIP `7/7`、相关 broad `26/26`，typecheck 通过。
- 两次构建 checksum 一致，真实 portable ZIP 已通过临时 active-root 完整安装链。

## v13.1.0-beta.2 - 2026-06-30

### Features

- 新增 C19 命名 Plan 阶段模型：`Discover -> Technical Stack -> Architecture -> Decompose -> Generate`，并新增 `/hw:plan:technical-stack` 与 `/hw:plan:architecture` 入口。
- 新增 C20 协商优先修改启动边界：讨论、背景、想法、抱怨、问题和方案讨论先输出 Mini-contract，再等待执行授权。
- 将 C20 共享指导投影到 OpenCode、Claude、根 `AGENTS.md`、命令和 agent managed surfaces，同时保留明确具体任务的 direct execution。
- 新增 C20 目标仓 handoff 包：`Codex-VSP` 与 `VSP-Open-Code` 后续必须在目标仓本地 Cycle 中验证和适配。

### Fixes

- 移除用户态 `/hw:plan:confirm` 暴露面，确认改为阶段内 Question Tool / Ask gate。
- 修复 lifecycle log 对 visible gate feedback family/status 的校验缺口，避免真实 gate 记录阻塞全量回归。
- 修复文档、命令参考和 progressive discover 中旧 P1/P2/P3/P4 用户面阶段残留。

### Docs

- README / README.en 指向 v13.1.0-beta.2 release notes。
- Docs governance map 更新到 v13.1.0-beta.2，并记录 C19/C20 source evidence。
- 版本源同步到 13.1.0-beta.2：`.claude-plugin/plugin.json`、`.claude-plugin/marketplace.json`、`.codex-plugin/plugin.json`、`.opencode/package.json`、`cli/package.json`、`cli/package-lock.json`、`core/package.json`、默认配置版本和 generator `HW_VERSION`。

### Tests

- `npm test`: 687/687 passing。
- `scripts/validate-config.sh`: passing。
- `checkDocs('.')`、release narrative fact check、docs language check 和 README freshness: passing。
- `node --test core/test/c20-consultation-boundary.test.js core/test/commands-rules-artifacts.test.js core/test/c18-instruction-quality-contract.test.js`: 23/23 passing after C20 projection。
- `git diff --check`: passing。

## v13.1.0-beta.1 - 2026-05-31

### Fixes

- 修复 lifecycle log schema 与 runtime：支持 `quality` family，并接受 release 准备/部分发布状态 `prepared` 与 `partially_published`。
- 修复 `release` 事件因包含 `lease` 子串而被错误归类为 `recovery` 的问题。
- 替换 `notificationStdinPayload` 的 `new String()` 包装对象，改为显式 plain object，同时保留 `includes()`、`String(stdin)` 和 `toJSON()` 行为。

### Quality

- 新增 `.pipeline/quality/quality-001.md`、`.pipeline/quality/actions.yaml` 和 `.pipeline/quality/state.yaml`，记录首轮 `/hw:quality` scorecard、action queue 和修复状态。
- 关闭 `QACT-001`、`QACT-002`、`QACT-004`；保留 Python Notion 测试可移植性 `QACT-003` 和 helper 去重 `QACT-005`。

### Docs

- README / README.en 指向 v13.1.0-beta.1 beta 发布说明。
- Docs governance map、release notes、版本源、OpenCode/Claude/Codex package metadata、默认配置版本和 generator `HW_VERSION` 同步到 13.1.0-beta.1。
- `references/log-spec.md` 补充 `quality` type 与 release 状态。

### Tests

- `node --test core/test/log-evidence.test.js core/test/c18-instruction-quality-contract.test.js`: 10/10 passing。
- `node --test core/test/hypo-claw-notification.test.js core/test/project-notifications.test.js`: 15/15 passing。
- `npm test`: 666/666 passing。
- `git diff --check`: passing。

## v13.1.0-alpha.1 - 2026-05-30

### Features

- 新增 `/hw:quality` 一等代码质量评分入口，支持 scorecard、baseline/compare、review notes 和 Action Queue。
- 新增 `/hw:optimize` 闭环优化入口，按 Audit+Quality -> Implement/Test -> Audit+Quality 运行，并保留 backup、correctness、budget 和 validation gates。
- 增强 `/hw:audit`：改为 Intake-first 工程审计，覆盖 Experience、Engineering、Risk 三个视角，并用 Critical blocking 与 Action Queue 收束。
- 新增 integration sync 规范，将跨 `Codex-VSP`、`VSP-Open-Code` 等集成仓库的功能同步定义为开发/发布门禁，而不是用户命令。

### Fixes

- 修正 OpenCode/Cursor/第三方适配器中的命令命名和生成契约，使 `/hw:*` namespace 语义与平台约束一致。
- 明确 Workflow 中 Codex/OpenCode 集成版本的维护边界：源仓库是指令语义与 Skill/spec authority，目标仓库按实际状态因地制宜适配并写入目标侧记录。
- 为普通对话/Journal 回流补充 audit、quality、optimize、integration_sync 候选分类路径，避免把集成反馈直接升级为规则或指令。

### Docs

- 更新 Audit、Quality、Optimize 和 Integration Sync 规范、Skill、命令参考、OpenCode/Codex 适配文档和 README 入口。
- 新增 C18 目标仓库适配计划、矩阵、测试证据、实现证据、审计报告和完成报告。
- 同步版本源、OpenCode/Claude/Codex package metadata、默认配置版本和 generator `HW_VERSION` 到 13.1.0-alpha.1。

### Tests

- `npm test`: 665/665 passing。
- `node cli/bin/hypo-workflow sync --platform opencode --project . --check-only`: derived=fresh。
- `checkDocs('.')` 与 release narrative fact check: passing。
- Codex-VSP focused validation: `cargo fmt --check`、29 个 focused Rust tests、`git diff --check` passing。
- VSP-Open-Code focused validation: 34 个 focused Bun tests、`bun typecheck`、`git diff --check` passing。
- `git diff --check`: passing。

## v13.0.0-alpha.1 - 2026-05-21

### Features

- 新增 C16 根目录项目管理模式：Global Workspace authority、Artifact Catalog、Storage Sync Template、Maintenance Queue/Ledger/Run、Global Consolidation、Global Knowledge/Rules/Secret Reference projection 和最终 Notion apply gate。
- 新增 `/hw:maintain` 命令族，覆盖 `status`、`scan`、`plan`、`queue`、`run`、`apply`、`verify` 和 `log`，将长期维护对象从 Cycle/Patch 中拆出。
- 新增每日 04:00 全局沉淀本地入口 `hypo-workflow maintain-scheduler --dry-run` 与 `scripts/maintenance-scheduler.sh`，生成 safe-local evidence 和 maintenance ledger event。
- 新增项目级 Global Knowledge projection，SessionStart 只读加载 compact/index projection 文件，不加载 raw global records 或 raw candidates。
- 新增 C17 审计修复闭环：根目录 `npm test`、审计 inventory、共享 utils、分层配置迁移、`js-yaml` 统一、workspace clean split、JSONL ledger authority 和显式 public export surface。

### Fixes

- 修订 C16 Notion 同步策略：从“创建额外同步子页”改为 legacy reconciliation，整理现有 Hypo-Workflow 主页及既有子页面，并保留备份、dry-run、显式授权和读回验证证据。
- 强化 Notion apply gate：要求 dry-run hash、reviewed apply plan、精确确认短语、显式 target binding、re-read verification 和 sanitized ledger/evidence。
- 修复 SessionStart hook stdout 契约，确保只输出可解析 JSON，并将 Global Knowledge compact 作为 additional context 注入。
- 修复 `core/src` 与 `scripts` 中的 `/home/heyx/...` runtime/source 假设，相关路径改为分层配置或 `$HOME` 派生。
- 修复 `workspace/index.js` God Module，删除旧 public entry 并拆为 workspace authority、project linkage、project stop events、Codex capture 和 notification sender 五个模块。
- 修复 config/knowledge YAML parser 分裂，统一使用 `js-yaml`。
- 修复 project events、notifications、maintenance、daily summary、global consolidation 的长期 YAML ledger authority 重写，迁移为 append-only JSONL。
- 修复 root broad barrel export，改为显式 named re-export。

### Docs

- README / README.en 更新到 v13.0.0-alpha.1 预发布说明入口，并覆盖 C16 全局维护与 C17 审计修复范围。
- 新增中英文 v13.0.0-alpha.1 release notes。
- 同步版本源、OpenCode/Claude/Codex package metadata、默认配置版本和 generator `HW_VERSION`。

### Tests

- `npm test`: 661/661 passing。
- C17 final scans: `git diff --check` passing；`rg -n '/home/heyx' core/src scripts` 无命中；workspace/parser/export/ledger scans 为 PASS with classified residual。
- `node --test core/test/knowledge-ledger.test.js core/test/global-knowledge-index.test.js core/test/sync-standardization.test.js`: 16/16 passing，来自 Global Knowledge projection 修订记录。
- SessionStart hook JSON parse: passing。
- `git diff --check`: passing。
- Python Notion pytest 路径仍收集 0 个测试，记录为覆盖空洞。

## v12.8.1 - 2026-05-17

### Features

- 合入 PR #8，Cursor adapter 现在同步每个 `/hw-*` 入口的平铺 Skill 文件和 command 文件。
- 新增 `.cursor/hypo-workflow/` compact shared resource bundle，镜像 Cursor 执行所需的 references、assets、adapters 和 scripts。
- Cursor adapter 文档、平台能力矩阵和 generated artifacts reference 更新为新的 flat Skills/commands 结构。

### Fixes

- 修复 Cursor `/hw-setup` 生成内容指向未镜像 `references/config-spec.md` 的问题；当前 setup Skill 自包含，并声明 external/non-local fallback 行为。
- 新增 generated Cursor Skill reference 回归检查，防止生成 Skill 引用目标项目中不存在且无 fallback 的本地路径。
- lifecycle log validator 和 `references/log-spec.md` 新增 `pr` family 及 PR review/merge 状态，修复 PR #8 归档事件导致完整回归失败的问题。

### Docs

- README / README.en 更新到 v12.8.1 发布说明入口。
- 新增中英文 v12.8.1 release notes。
- 同步版本源、OpenCode/Claude/Codex package metadata、默认配置版本和 generator `HW_VERSION`。

### Tests

- `node --test core/test/platform-adapters.test.js core/test/profile-platform.test.js`: 13/13 passing.
- Docs/readme/skill/sync focused smoke: 42/42 passing.
- `node --test core/test/*.test.js`: 516/516 passing.
- `uv run python tests/run_regression.py`: 68/68 passing.
- `checkDocs('.')`, `checkDocsLanguage('.')`, `checkNarrativeDocsForRelease('.')`, and `checkReadmeFreshness('README.md')`: passing.
- `node cli/bin/hypo-workflow sync --platform opencode --project . --check-only`: derived=fresh.
- `git diff --check`: passing.

## v12.8.0 - 2026-05-16

### Features

- 强化 P2 Decompose：除 Milestone 拆分外，必须展示可审核的技术方案、技术路线、调研依据、风险和不确定性。
- 新增完成汇报契约，覆盖 Milestone、Cycle、Debug、Audit 和 Patch，要求说明改动内容、技术思路、修改范围、测试设计、验证结果、预期结果、遇到的问题和风险/后续。
- 恢复并一等化 `/hw:analysis`，补齐 skill、命令映射、OpenCode/Claude/Codex 状态展示、ledger 路径和 compact summary。
- 明确 shared skill asset path contract，修复子技能误引用 `assets/state-init.yaml` 时在子目录查找失败的问题。

### Fixes

- 发布前回归从 55/68 修复到 68/68，主要更新中文化和当前契约后的 scenario/Core 测试断言。
- lifecycle log validator 新增 `completed_with_transport_error` 合法状态，匹配真实 worker transport-error 完成记录。
- OpenCode TUI panel 测试适配 rich plugin surface，并补齐测试 fake `solid-js` 的 `For` export。

### Docs

- README / README.en 更新到 v12.8.0 发布说明入口。
- 新增中英文 v12.8.0 release notes。
- 同步版本源、OpenCode/Claude/Codex package metadata、默认配置版本和 generator `HW_VERSION`。

### Tests

- `uv run python tests/run_regression.py`: 68/68 passing.
- Focused contract suite: 56/56 passing.
- Focused scenario smoke s32/s33/s34/s35/s37/s42/s44/s45/s46/s47/s56/s60 passing.
- `git diff --check`: passing.

## v12.7.0 - 2026-05-15

### Features

- C14 兼容性审查：Workflow 语义、跨平台适配、Prompt/规则冗余、测试健壮性、文档/引导 5 个审查域，24 项正式发现（P0=6, P1=11, P2=14）。
- 修复 `code_quality` 评分方向矛盾（V1 vs V4 量表方向统一）。
- 明确 V4 STOP 规则在 `adaptive_threshold=false` 时的兼容性行为。
- 创建 `.opencode/hypo-workflow.json.analysis` analysis sidecar 文件。
- 创建 `rules/builtin/claude-hw-command-namespace.yaml` Claude Code 命名空间规则。
- 输出语言规则集中化为 `@include: output-language-rule`。
- SKILL.md 角色分层：索引 + 路由摘要，指向独立 Skill 文件。

### Fixes

- 移除退役的 `skills/dashboard/SKILL.md`。
- 同步 SKILL.md 与 commands-spec.md 命令列表（补 `/hw:chat`）。
- commandMap 增加 source-of-truth 注释。
- Core 生成器 `HW_VERSION` 常量从 12.5.2 更新到 12.7.0。
- 测试：i18n 正则双语化，`readme-update.test.js` 命令计数动态化（5 文件/31 测试通过）。
- 模板级 TUI 颜色方案持久化（sync 不再清除颜色）。

### Docs

- 创建 CONTRIBUTING.md（159 行）。
- 扩展 developer.md 从 10 行到 211 行（zh+en）。
- 同步 configuration.md 英文版从 64 行到 261 行。
- AGENTS.md 增加 Workflow state persistence 段落。
- session-start hook 增加 Hypo-Workflow 状态注入。

## v12.6.0 - 2026-05-14

- 将 OpenCode bash 自动批准从无效 `permission: bypass` 配置改为合法的 `ask`/`allow` schema + Hypo-Workflow plugin policy。
- 新增 `execution.bash.mode=allow_local` 配置、schema、profile 默认值和 OpenCode metadata 注入。
- 保留 `git push`、PR/MR remote write、网络命令、破坏性命令、系统安装和 release publish 的 Ask gate。

### Tests

- 通过 OpenCode bash policy、config/profile、adapter artifacts 和 `opencode debug config` 验证。

## v12.5.1 - 2026-05-12

### Features

- 为 Claude Code plugin 生成 plugin-root `commands/*.md` slash command files，恢复 `/hw:*` 在 Claude Code 中的补全和入口发现。
- 新增 37 个 Claude Code command mappings，覆盖 `/hw:patch`、`/hw:resume`、`/hw:plan:discover` 等入口，并保持现有 `skills/*/SKILL.md` 为唯一语义 authority。
- 新增 project structured rule `claude-hw-command-namespace`，以 `error` 级别强制检查 `hw` namespace、`/hw:*` 暴露和 `/hw:resume` / Claude 原生 `/resume` 分离。

### Fixes

- 修复本机 Claude Code 只显示 `/hypo-workflow` 聚合入口、`/hw:` 无补全的问题。
- 修复 setup skill 和 Claude Code 文档中的旧 `/hypo-workflow:<command>` 主入口描述。
- 将 v12.3.0、v12.4.0、v12.5.0 中文 release notes 调整为规范分类结构。
- 同步 package、plugin、adapter 和 Skill 版本到 `12.5.1`。

### Tests

- `uv run -- node --test core/test/*.test.js`: 437/437 passing.
- `uv run -- node --test core/test/claude-plugin-alias.test.js core/test/claude-adapter-config.test.js core/test/claude-resume-namespace.test.js core/test/rules-authority.test.js core/test/docs-governance.test.js core/test/readme-spec.test.js`: 30/30 passing.
- `claude plugin validate .`: passing.
- `bash scripts/rules-summary.sh .`: `claude-hw-command-namespace` appears as `error`.
- `uv run -- git diff --check`: passing.

## v12.5.0 - 2026-05-12

### Features

- 干净移植 GitHub PR #7 的 audit governance hardening：允许 audit 在 milestone 完成前介入，并明确 `milestone`、`feature`、`cycle` 三级 rejection scope。
- 新增 audit memory runtime helper，支持 cycle-level audit memory、milestone-level audit delta 和 scoped audit summary，避免把 raw free-form conversation 当作 authority。
- 新增 rejection rework 与 blocked runtime helper：`implement` 只能 propose blocked，`audit` 才能 approve blocked；rework prompt 保留原 prompt 引用和增量 scope。
- 强化 worker separation acceptance：检查持久化 `prompt_scope` 和 `changed_files`，阻止跨角色 ownership、scope 越界和 audit 写文件。
- 为 `/hw:pr` create/review 增加 `.pipeline` 路径策略，默认阻止 `.pipeline/**` runtime 文件进入 PR payload，同时允许 `.pipeline/pr/**` 本地证据归档。

### Fixes

- 没有直接合入 PR #7 原分支里的 `.pipeline/**` runtime state、prompts、release docs、README/CHANGELOG 大包和 `/hw:achieve` alias。
- 补齐 acceptance/config 旧测试的 worker scope evidence fixture，使新 worker separation 规则与既有 audit-degradation 语义兼容。
- 同步 package、plugin、adapter 和 Skill 版本到 `12.5.0`。

### Tests

- `uv run -- node --test core/test/*.test.js`: 436/436 passing.
- `uv run -- node --test core/test/audit-governance-contract.test.js core/test/audit-memory-contract.test.js core/test/audit-regression-canonical-examples.test.js core/test/rejection-rework-blocked-runtime-loop.test.js core/test/worker-separation-spawn-enforcement.test.js core/test/cycle-acceptance.test.js core/test/config.test.js core/test/pr-create.test.js core/test/pr-manual-gates.test.js core/test/pr-contract.test.js core/test/pr-create-contract.test.js`: 71/71 passing.
- `uv run python tests/run_regression.py`: 68/68 passing.
- `uv run -- git diff --check`: passing.

## v12.4.0 - 2026-05-11

### Features

- 完成 C11 工作流体验改进：Skills 和关键 references 改为中文主体结构，并保留命令、配置键、文件名和平台术语的英文原文。
- 强化 Plan Discover 的 P0/P1 访谈、例子抽象、自动化授权白名单和 Codex Subagent 授权记录。
- 补齐 Subagent Layer 1 host envelope 与 Layer 2 task checks，明确 worker separation、hidden tests 和 degraded mode 边界。

### Fixes

- 修复 `s19-help-list` 与 `s56-agents-ask-todo-plan-discipline` 仍依赖旧英文标题的问题，改为验证中文化后的 canonical anchors。
- 刷新 OpenCode / Claude Code adapters、compact 派生视图和 release/docs 入口。

### Tests

- `uv run -- npm --prefix core test`: 407/407 passing.
- `uv run python tests/run_regression.py`: 63/63 passing.
- `uv run -- node --test core/test/docs-governance.test.js core/test/readme-spec.test.js core/test/platform-adapters.test.js`: 14/14 passing.
- `uv run -- bash scripts/validate-config.sh .pipeline/config.yaml`: passing.
- OpenCode / Claude Code sync repair: `derived=fresh`.
- `uv run -- git diff --check`: passing.

## v12.3.0 - 2026-05-09

### Features

- 新增 worker-separation acceptance hardening：`/hw:accept` 现在会检查 `test` / `implement` / `audit` worker 证据、身份碰撞、Codex 授权、role availability 和 worker lifecycle，避免把运行时观测误当成验收证据。
- 强化 `/hw:plan`、`/hw:start`、`/hw:resume`、`/hw:patch fix`、`/hw:debug`、`/hw:audit` 的 Subworker 规范，明确 `test`、`implement`、`audit` 三个角色的授权、作用域、生命周期和 degraded/downgrade 边界。
- 新增运行结束后的 dirty-only compact refresh：成功完成 `/hw:start` 或 `/hw:resume` 后按需刷新 compact 派生上下文，避免每步执行都压缩 authoritative runtime 文件。
- 更新 OpenCode status/runtime 展示，将 active subagent 标记为 runtime-only，避免把 OpenCode/Codex 运行态信息误用为持久 worker evidence。

### Fixes

- 干净集成 GitHub PR `#5`，保留 `feat: harden worker separation acceptance` 的功能内容，丢弃旧 PR `#3` 的 `13.0.0` 版本 bump 和过期 `.pipeline/` 运行态。
- 修复新增 worker-separation 回归测试对外部 `rg -g` 行为的依赖，改为纯 Node 文件扫描，保证场景回归里的 `tests/bin/rg` 环境也稳定。
- 收紧 Cycle acceptance 的 follow-up continuation 清理逻辑，避免非 follow-up 接受路径残留旧 continuation。

### Tests

- `npm test --prefix core`: 398/398 passing.
- `python3 tests/run_regression.py`: 63/63 passing.
- `bash scripts/validate-config.sh .pipeline/config.yaml`: passing.
- `git diff --check`: passing.

## v12.2.0 - 2026-05-09

### Features

- 新增 Cycle 级 `P0 Configure` 阶段，在 `P1 Discover` 前确认或沿用自动化程度、Subagent 授权、验收方式、PR/MR 远端写确认、完整回归、analysis 边界和 worker separation。
- 新增 `/hw:pr create` 一等命令入口，支持 GitHub PR / GitLab MR 的问答式创建、已有本地改动的 `--from-worktree` 流程、plan-first 的 `--plan` 流程，以及远端写动作的一次性确认。
- 新增 Subagent 授权、implementation/test/audit 隔离和 degraded mode 治理；implementation worker 不读取测试源码、fixtures、snapshots 或 assertion 细节。
- 新增英文文档入口 [README.en.md](README.en.md) 和 `docs/en/` 英文子页面，中文 README 可一键切换到英文版，英文版子页面全部指向英文文档树。

### Fixes

- 刷新 OpenCode command map、generated docs、README 命令数量、Skill inventory、regression scenarios 和平台文档到 39-command surface。
- 强化 PR/MR Create provider fake 与执行适配，确保确认前不会调用 push/create/reviewer/label 远端写方法。
- 修复 Claude Code sync CLI 测试对用户 HOME 的依赖，避免 release 回归污染真实用户配置。

### Tests

- `npm test --prefix core`: 365/365 passing.
- `python3 tests/run_regression.py`: 63/63 passing.
- `bash scripts/validate-config.sh .pipeline/config.yaml`: passing.
- `checkDocs('.')`, readme freshness, sync check-only derived health, and `git diff --check`: passing.

## v12.1.0 - 2026-05-07

### Features

- Added configuration governance docs for automation levels, strictness, confirmation boundaries, platform differences, and default profiles such as solo-auto, manual-review, team-strict, and analysis-hybrid.
- Added `/hw:pr` for existing GitHub PR and GitLab MR handling, including remote-readonly inspect/review, local `.pipeline/pr/` archives, manual-gated fix/merge/close proposals, and local archive id reuse.
- Added `/hw:explain` as an evidence-first read-only explanation command, including `--subagent` evidence packet handoff for independent context collection.
- Fixed Claude Code `/resume` namespace ambiguity by keeping Claude native `/resume` separate from Hypo `/hw:resume` and removing bare resume skill metadata.
- Converted the human-facing README/docs/reference chain to Chinese-body documentation while keeping command names, config keys, file paths, and platform terms literal.

### Fixes

- Redacted secret-like text before Explain evidence excerpts, Subagent-rendered explanations, PR review findings, and PR review notes.
- Refreshed OpenCode command maps and regression scenarios for the 39-command surface, including `/hw:pr` and `/hw:explain`.
- Distributed refreshed project adapters and local skill copies for Codex, Claude Code, OpenCode, Cursor, Copilot, and Trae.

### Tests

- `npm test --prefix core`: 349/349 passing.
- `python3 tests/run_regression.py`: 63/63 passing.
- Docs Chinese-body checks, release narrative checks, config validation, Claude plugin validation, sync check-only, and `git diff --check` passing.

## v12.0.1 - 2026-05-07

### Features

- Merged PR #2 worker separation policy for implement/test/audit ownership, acceptance readiness checks, and closed-loop validation planning guidance.
- Isolated scenario regression logs under per-user temporary paths without depending on fixed `/tmp/hw-*` files.

### Fixes

- Fixed clean-checkout test behavior by generating Knowledge compact content inside the Knowledge Ledger gate test instead of requiring ignored compact artifacts to exist before tests run.
- Bumped adapter and package metadata to `12.0.1`, including the OpenCode adapter package metadata.

### Tests

- `npm test --prefix core`: 315/315 passing after sync repair.
- `python3 tests/run_regression.py`: 63/63 passing after sync repair.
- Targeted unset-`USER` scenario checks passed for `s55` and `s63`.

## v12.0.0 - 2026-05-06

### Features

- Added structured Rules/Habits authority with generated platform instruction views so user preferences can survive context loss and be checked during review.
- Added Agent Review artifacts and multi-round `needs_changes -> repair -> review` iteration records for plan, test, implementation, and release closeout scrutiny.
- Added Domain Pack infrastructure with the built-in RTL reference pack and boundary protocol for future local or external language/domain packages.
- Added Claude Code Codex-plugin support modeling, including explicit-confirmation install boundaries and Codex worker ownership guidance.

### Documentation

- Reworked README around platform-neutral common capabilities instead of per-platform command duplication.
- Restored concrete install and sync instructions in the generated Codex, Claude Code, OpenCode, Cursor, Copilot, and Trae platform guides.
- Recorded the platform installation documentation policy in the Knowledge Ledger and platform capability reference.

### Tests

- Core Node suite: 311/311 passing.
- Scenario regression: 63/63 passing.
- Config validation, Claude plugin validation, docs repair/checks, sync check-only, and `git diff --check` passing.

## v11.1.0 - 2026-05-06

### Features

- Added Codex automation governance with stable `automation.level` values, protected planning/destructive/release gates, and config validation.
- Added Codex continuation and preflight helpers for safe resume targets, protected-file checks, README/docs freshness, generated artifact freshness, evidence checks, and secret-marker blocking.
- Added Cursor, GitHub Copilot, and Trae repository instruction adapters with `sync --platform cursor|copilot|trae`.
- Added non-Git `init-project` bootstrap with `--automation manual|balanced|full`.

### Documentation

- Rewrote README as a Chinese-first Quick Start with six platform entry points and repository import guidance.
- Strengthened Codex Subagent guidance across shared skills and references: Codex/GPT runtime only, prefer Subagents for non-trivial Codex work, and keep implementation separate from testing/review.
- Updated platform guides, generated artifact references, README governance, setup/help guidance, and C7 lifecycle reports.

### Tests

- Core Node suite: 281/281 passing.
- Scenario regression: 63/63 passing.
- C7 focused tests: 52/52 passing.
- Config validation, README freshness, docs checks, generated adapter smoke, derived repair, and `git diff --check` passing.

## v11.0.0 - 2026-05-05

### Features

- Added the Claude Code adapter plugin contract with the `hw` namespace, project-local settings merge, managed hooks, subagent model routing, and a Progress-style status surface.
- Added project-local Claude Code API overrides through `claude_code.api`, including `ANTHROPIC_BASE_URL` / `ANTHROPIC_API_KEY` env rendering for Anthropic-compatible DeepSeek gateways.
- Added Claude hook runtime coverage for SessionStart, UserPromptSubmit, Stop, compact resume, PermissionRequest, tool/batch refresh, and Progress updates.
- Added Claude subagent artifacts and routing metadata for docs, code, test, review, debug, report, and compact roles.
- Added deterministic Claude smoke fixture and live manual smoke guidance covering `/hw:status`, `/hw:resume`, Stop hook behavior, DeepSeek routing, and Mimo role routing.

### Fixes

- Removed legacy `skills/hw-*` Claude alias skills so the `hw` plugin namespace exposes canonical commands such as `/hw:status` instead of duplicate `/hw:hw-status` entries.
- Fixed Claude Code hook schema compliance for warning-only Stop responses and permission decisions.
- Fixed Claude live smoke hook installation by generating project-local `hooks/claude-hook.mjs` during `sync --platform claude-code`.

### Documentation

- Added and restored the Claude Code platform guide with API/env override, hook, agent, status, safety-profile, and manual-smoke details.
- Updated README, command count checks, OpenCode parity wording, Skill inventory tests, and release readiness docs for the 36-command contract.
- Recorded C6 live-smoke lessons in PROGRESS/log evidence, including plugin namespace behavior, project-local API configuration, and status read-only boundaries.

### Tests

- Core Node suite: 256/256 passing.
- Scenario regression: 62/62 passing.
- Claude plugin validation, deterministic Claude smoke fixture, config validation, docs/readme freshness, release narrative checks, sync check-only, and `git diff --check` passing.

## v10.2.0 - 2026-05-04

### Features

- Completed the C5 follow-up redesign across workflow kind policy, lifecycle commit invariants, Guide routing, vertical-slice TDD contracts, Feature DAG board, execution leases, layered sync, log/evidence safety, docs governance, config TUI, metrics, and lifecycle regression coverage.
- Added `/hw:docs` and reorganized documentation into a concise README, user/developer guides, platform guides, and generated references.
- Added stale execution lease takeover, heartbeat recovery, Codex/OpenCode handoff boundaries, derived artifact repair, and read-only progress dashboard data.
- Added config TUI helpers with global/project target separation, staged diffs, schema validation, explicit confirmation, protected-file guards, and sync guidance.
- Added metrics helpers that compute wall-clock duration and record missing token/cost data as `telemetry_unavailable`.

### Documentation

- Updated README, command references, OpenCode command map, platform docs, Skill inventory, and regression scenarios for 37 user-facing commands.
- Documented OpenCode model matrix status, generated artifacts, docs governance, lifecycle contracts, and release safety boundaries.

### Tests

- Core Node suite: 217/217 passing.
- Scenario regression: 62/62 passing.
- Config validation, docs freshness, OpenCode artifact sync, and `git diff --check` passing.

## v10.1.0 - 2026-05-03

### Features

- Completed C4 Knowledge Ledger, Global TUI, Acceptance Loop, Explore Mode, and `/hw:sync` standardization across 14 milestones.
- Added Knowledge Ledger records, indexes, compact context, SessionStart loading, Stop Hook self-check, and OpenCode workflow-control hooks.
- Added global config/model pool/project registry actions, Ink TUI snapshot, selected project sync, and CLI package metadata.
- Added Cycle and Patch acceptance loops with structured rejection feedback, timeout policy/status display, and accept/reject command surfaces.
- Added Explore Mode contract, isolated global worktrees, dirty-worktree gates, lifecycle status/end/archive, and plan/analysis upgrade contexts.
- Added `/hw:sync` light/standard/deep modes, shared CLI sync logic, SessionStart light external-change detection, TUI sync action, and OpenCode `/hw-sync` artifact.

### Documentation

- Updated README, command map, Skill inventory, OpenCode parity/spec references, CLI docs, and regression scenarios for 36 user-facing commands.
- Closed and archived C4 under `.pipeline/archives/C4-knowledge-ledger-global-tui-acceptance-loop-explore-mode/`.

### Tests

- Core Node suite: 156/156 passing.
- Scenario regression: 62/62 passing.
- Config validation, OpenCode/root/TUI JSON parse, and `git diff --check` passing.

## v10.0.2 - 2026-05-02

### Documentation

- Renamed C2 to `Maintainability, Observability, and Showcase Expansion` across archived Cycle metadata, confirm summary, project summary, and status fixtures.
- Added `references/external-docs-index.md` as the official documentation lookup index for OpenCode Config, Agents, Models, CLI, Server, SDK, MCP, and Context7.
- Updated the C3 architecture baseline with a completed Plan Review and archived C3 runtime context.

### Lifecycle

- Archived C3 runtime artifacts into `.pipeline/archives/C3-opencode-multi-agent-matrix-and-v10-analysis-preset/`.
- Updated project summary and lifecycle log to reflect three completed archived Cycles and no active Cycle.

### Tests

- Updated C3 queue, metrics, progress, and design validation to read archived artifacts after Cycle close.
- Core Node suite: 105/105 passing.
- Scenario regression: 62/62 passing.
- Claude plugin validation and config validation passing.

## v10.0.1 - 2026-05-02

### Fixes

- Fixed OpenCode agent frontmatter to render known model IDs in `provider/model` form, including MiMo and DeepSeek custom providers.
- Added OpenCode TUI status visibility for the current agent/model, latest active subagent/model, and configured subagent model matrix.
- Isolated the OpenCode events/file-guard regression scenario from local global profile settings.

### Tests

- Core Node suite: 105/105 passing.
- Scenario regression: 62/62 passing.
- OpenCode sync and `hw-build` smoke tests passing against `/home/heyx/Hypo-Agent`.

## v10.0.0 - 2026-05-02

### Features

- Added V10 Analysis Preset runtime contracts: experiment execution records, evidence ledgers, outcomes, follow-up proposals, analysis templates, and preset-aware evaluation criteria.

### Tests

- Added Node coverage for analysis experiment results, outcome semantics, report/ledger templates, evaluation criteria, planning hints, and C3 no-confirm queue policy.

## v9.1.2 - 2026-05-02

### Documentation

- Added README coverage for Feature Queue long-range planning, including `--batch`, `--insert`, gates, auto-chain, failure policy, metrics, and lifecycle usage.
- Recorded the next-cycle OpenCode multi-agent model matrix candidate as the first draft task for the next Cycle.
- Reworked the C2 technical report Slides into a 51-page command-oriented deck with seven lived-experience path pages, section highlights, command enumeration, and Demo Route.
- Added future work in both the report and Slides on whether Harness can reduce the need for model-engineering intelligence.

### Fixes

- Fixed the Slides cover layout so the title metadata is no longer clipped.
- Removed the draft visual/evidence page and replaced the V9 timeline page with a clearer Codex-to-OpenCode motivation section.
- Enlarged and rerouted the Execution Loop diagram and simplified the OpenCode Adapter figure to avoid overlap.
- Restored the Slides GPT Image 2 / Image Gen visual-system evidence marker required by the showcase refresh contract.

### Tests

- Scenario regression: 60/60 passing.
- Showcase refresh target: 3/3 passing.
- PDF builds: `make report` and `make slides` passing.

## v9.1.1 - 2026-05-01

### Documentation

- Added the canonical `docs/showcase/c2-report/` source package for the expanded technical book report and Beamer slides.
- Added GPT Image generated visual assets for the cover, tool-evolution narrative, and file-first architecture.
- Added the `vendor/Hypoxanthine-LaTeX` submodule and LaTeX build packaging for report/slides compilation.

### Tests

- Added report refresh coverage for canonical source placement, submodule metadata, narrative anchors, and GPT Image 2 slide evidence.
- Verified report and slides PDF builds from the new source directory.

## v9.1.0 - 2026-05-01

### Features

- 新增 README 自动维护与 release freshness 检查，将动态文档更新纳入发布门禁。
- 新增 Skill 质量规范、结构检查和 `skill-quality` 规则，覆盖 Codex、Claude Code 与 OpenCode 的技能面一致性。
- 新增 Feature Queue、Batch Plan、queue insert、auto-chain、JIT decomposition 和 metrics fallback。
- 新增 `/hw:chat` 轻量会话轨道、恢复上下文、日志记录和 Patch 升级提示。
- 新增 Progressive Discover、可选 Karpathy rule pack，以及 webapp、agent-service、research 三类 Test Profile。
- 新增 OpenCode 只读状态模型、sidebar/footer TUI plugin 和独立 runtime helper。

### Improvements

- OpenCode 命令映射扩展到 31 个用户命令，并补齐 `/hw-chat` adapter。
- 更新 release 规范，加入 README Update 和 readme-freshness 发布步骤。
- 更新规则、进度、配置、日志、评估和命令规范以匹配 C2 的非 Report 能力。

### Tests

- Node core suite: 73/73 passing.
- Scenario regression: 60/60 passing.

## v9.0.0 - 2026-04-30

### Features

- Added the OpenCode Native Adapter baseline with capability mapping, platform matrix, command map, parity docs, and architecture references.
- Added `core/` deterministic helpers for config/profile/platform/commands/rules and OpenCode artifact generation.
- Added `cli/bin/hypo-workflow` as a setup-only global CLI for setup, doctor, profile, sync, install, and init-project.
- Added OpenCode project scaffold generation for `opencode.json`, `AGENTS.md`, `.opencode/commands/`, `.opencode/agents/`, `.opencode/plugins/hypo-workflow.ts`, and `.opencode/package.json`.
- Added OpenCode agents, Ask/question guidance, todowrite plan discipline, and the `plan-tool-required` built-in rule.
- Added OpenCode plugin event policy scaffold for command context, safe auto-continue, compact context restore, file guard, todo sync, and permission logging.

### Improvements

- Documented full V8.4 parity expectations for OpenCode without making OpenCode runtime a CI dependency.
- Updated command templates so all 30 user commands are traceable from `/hw:*` to OpenCode `/hw-*`.
- Preserved Codex and Claude Code behavior while adding OpenCode-specific generated artifacts.

### Tests

- Added V9 scenarios `s51` through `s59`, covering capability matrix, core helpers, CLI setup, plugin scaffold, command map, agents/Ask/todowrite, events/file guard, V8.4 parity, and V9 regression bundle.
- Regression suite expanded to `59/59`.

## v8.4.0 - 2026-04-30

### Features

- 新增 `/hw:rules`，用于列出规则、调整严格度、创建自定义 Markdown 规则，并导入/导出规则包。
- 新增 `rules/builtin/`，内置 12 条规则，覆盖 guard、style、hook 和 workflow 四类语义标签。
- 新增 `rules/presets/`，提供 `recommended`、`strict`、`minimal` 三套规则集。
- 新增 `.pipeline/rules.yaml` 和 `.pipeline/rules/custom/`，作为项目侧规则配置和自然语言规则入口。
- 新增 `scripts/rules-summary.sh`，供 hook 和测试稳定汇总有效规则、启用数量和 always 规则。

### Improvements

- SessionStart Hook 现在注入 Rules Context，让 active `always` 规则在会话恢复时持续生效。
- `/hw:init` 和 `/hw:setup` 文档加入 Rules 初始化和默认规则集说明。
- `config.schema.yaml` 支持 `rules.extends` 和 `rules.rules`，保持旧项目向后兼容。
- README、命令规范、配置规范和 Showcase 自举物料更新到 V8.4，用户指令数更新为 30。

### Tests

- 新增 `s50-rules-system` 回归场景，覆盖规则资产、命令注册、helper 输出和 SessionStart 注入。
- 回归测试扩展为 `50/50`。
