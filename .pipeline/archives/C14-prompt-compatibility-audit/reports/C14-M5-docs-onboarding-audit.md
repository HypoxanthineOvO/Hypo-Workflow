# C14-M5 文档/入门/贡献者体验审计报告

**审计日期**：2026-05-15
**审计范围**：Hypo-Workflow 全部面向开发者和用户的文档、平台指南、发布说明、翻译一致性和 AGENTS.md

---

## A. 开发者文档差距分析

**审计文件**：`docs/developer.md`（10 行，zh）、`docs/en/developer.md`（19 行，en）

### 评分表

| 主题 | zh | en | 差距 | 说明 |
|------|----|----|------|------|
| 如何添加新命令/Skill | ❌ 无 | ❌ 无 | **P0** | 未提及 command registry、Skill 创建流程、或如何将新 Skill 挂载到 `/hw:*` 命令命名空间 |
| 如何添加新平台适配器 | ❌ 无 | ❌ 无 | **P1** | 未描述适配器模式、适配器 helper 位置、或第三方 IDE adapter 的生成模式 |
| `state.yaml` schema 变更 | ⚠️ 部分 | ⚠️ 部分 | **P2** | 提到 `.pipeline/` 是 "source of truth"，但未解释 schema 结构、字段含义或修改 schema 的契约式影响 |
| 测试执行与编写 | ❌ 无 | ❌ 无 | **P0** | 仓库中存在 88 个测试文件（`core/test/*.test.js`），但 developer.md 中没有任何关于运行测试、编写新测试或测试约定的说明 |
| 派生文档刷新流程 | ✅ 有 | ✅ 有 | **P3** | "优先修改这些源头，再通过 docs/sync 刷新派生文档" 已经覆盖 |
| Protected authority files | ✅ 有 | ✅ 有 | **P3** | 合同段落清楚定义了 protected files 和写入边界 |
| 文档生成机制 | ❌ 无 | ✅ 有 | **P2** | en 版本有 "Documentation" 段落说明 `docs/reference/*.md` 由 core helpers 生成，zh 版本缺少此段落 |

### 总体评分：P0（关键差距）

`developer.md` 中文版仅 10 行，英文版仅 19 行。作为唯一的开发者入门文档，严重不足。对于想贡献代码的社区开发者来说，完全无法从中获取：
- 项目架构概览
- 开发环境搭建指引
- 测试运行命令
- Skill/命令/适配器的添加流程

---

## B. 用户入门体验差距分析

**审计文件**：`docs/user-guide.md`（58 行，zh）、`docs/en/user-guide.md`（59 行，en）

### 评分表

| 主题 | 覆盖情况 | 差距 | 说明 |
|------|---------|------|------|
| OpenCode 首次安装设置 | ⚠️ 部分 | **P2** | 安装形态表列出了命令 (`hypo-workflow init-project --platform opencode --project .`) 但没有 step-by-step 教程。新用户不知道初始化后应该做什么。 |
| 如何规划新功能 | ✅ 有 | **P3** | 提到 `/hw:plan`、Feature Queue、`/hw:plan --batch`。可以更具体地展示一个 "hello world" 级 Plan 示例。 |
| 如何开始和恢复 | ✅ 有 | **P3** | 常用流程段落明确列出了 start/resume/status/report 流程。 |
| Cycle 管理（创建、P0 Configure、验收） | ⚠️ 部分 | **P2** | 提到 `/hw:cycle new` 和 P0 Configure 的 8 个决策点，但没有解释 Cycle state 转换（active → executing → pending_acceptance → accepted/closed）的完整生命周期。 |
| 遇到阻塞时怎么办 | ⚠️ 弱 | **P1** | "恢复"段落仅一行（"结构化 execution lease 和生命周期日志会保存足够上下文，便于安全 resume 或 handoff"）。没有提及 `/hw:debug`、常见错误场景、如何诊断卡住的 pipeline、或 `/hw:stop` 后如何安全恢复。 |
| Subagent 与降级 | ✅ 有 | **P2** | Subagent 与降级段落非常详细，但概念密度高，不适合首次阅读用户。缺少直观示例。 |
| Explain/Status/Debug/Audit 区别 | ✅ 有 | **P3** | 明确区分了四个命令的定位。 |
| PR/MR 创建 | ✅ 有 | **P3** | 覆盖了 inspect/review/fix/create 子命令。 |

### 总体评分：P2（中等差距）

用户指南适合有一定 Hypo-Workflow 概念的用户参考，但对真正的「新用户入门」来说不够友好：
- 缺少 first-run 教程风格的内容
- "遇到阻塞怎么办" 是最薄弱的环节
- Cycle 生命周期文档可以更完整

---

## C. 贡献者指南差距分析

### 现状

❌ **仓库中不存在 `CONTRIBUTING.md` 文件。** （根目录、`.github/` 目录均无此文件）

### 缺失内容

| 需要的章节 | 必要性 | 说明 |
|-----------|--------|------|
| **如何添加测试** | **P0** | 88 个测试文件在 `core/test/`，但没有文档说明测试框架（Node `--test`）、测试结构约定、或如何跑单个测试 vs 全量测试 |
| **如何更新 Skills** | **P0** | Skills 是核心工件（`skills/*/SKILL.md`），但没有解释 Skill 结构、加载机制、或修改 Skill 后如何验证 |
| **如何同步适配器** | **P1** | `hypo-workflow sync --platform <name>` 是再生适配器的关键命令，但开发者必须从代码中推断操作 |
| **代码风格/规则** | **P1** | 未声明代码格式化标准、lint 规则、commit message 约定、或 PR/MR 流程 |
| **环境搭建** | **P1** | 未说明 Python/Node 依赖、uv 虚拟环境、或开发模式的 symlink 操作 |
| **架构概览** | **P1** | 没有端到端架构图说明 core、skills、adapters、CLI 之间的关系 |

### 总体评分：P0（关键差距）

缺少 `CONTRIBUTING.md` 是外部贡献者的最大障碍。没有这个文件，社区贡献者完全不知道从何入手。

---

## D. 平台文档完整性分析

### D1. OpenCode（zh：84 行 / en：62 行）

| 检查项 | zh | en | 差距 |
|-------|----|----|------|
| 命令注册机制 | ✅ 有 | ✅ 有 | **P3** |
| TUI 插件使用 | ✅ 有 | ✅ 有 | **P3** (插件 events、status sidecars 均已提及) |
| 初始化命令 | ✅ 有 | ✅ 有 | **P3** |
| Model Matrix | ✅ 有 | ✅ 有 | **P3**（zh 版多了 YAML 配置块） |
| 边界说明 | ✅ 有 | ✅ 有 | **P3** |

### D2. Claude Code（zh：87 行 / en：64 行）

| 检查项 | zh | en | gap |
|-------|----|----|-----|
| Hooks 说明 | ✅ 有 | ✅ 有 | **P3** (SessionStart, Stop, PermissionRequest, compact resume 均已覆盖) |
| Namespace 说明 | ✅ 有 | ✅ 有 | **P3** (完整 "Plugin Namespace" 段落) |
| Settings 说明 | ✅ 有 | ✅ 有 | **P3** (settings merge, settings.local.json) |
| 可选 Codex Plugin | ✅ 有 | ❌ 无 | **P2**（zh 版有独立段落，en 版仅一行提及） |
| Claude Code Smoke 清单 | ✅ 有 (`claude-code-smoke.md`) | ❌ 无 | **P1**（68 行 smoke 测试文档无英文版） |

### D3. Codex（zh：47 行 / en：47 行）

| 检查项 | zh | en | gap |
|-------|----|----|-----|
| Skill 安装 | ✅ 有 | ✅ 有 | **P3** (git clone + symlink 两种方式) |
| AGENTS.md 集成 | ❌ 无 | ❌ 无 | **P2**（未解释 Codex 如何使用 `hypo-workflow` skill 仓库中的 SKILL.md 文件和 AGENTS.md 的关系） |
| Subagent 隔离 | ✅ 有 | ✅ 有 | **P3** |

### 总体评分：P2（中等差距）

核心平台（OpenCode、Claude Code、Codex）的文档基本完整。主要差距：
- Claude Code 英文版缺少 Smoke 测试清单和 Codex Plugin 集成段落
- Codex 平台的 AGENTS.md 集成机制未说明

---

## E. 发布说明完整性分析

### v12.7.0（zh：30 行 / en：30 行）

对照 `CHANGELOG.md` v12.7.0 条目：

| CHANGELOG 条目 | 发布说明覆盖 | 问题 |
|--------------|-------------|------|
| Features: command 字段注册 | ✅ 有 | 无 |
| Features: TUI 面板增强（7 项） | ✅ 有，详细列出 | 无 |
| Features: 权限全部设为 allow | ✅ 有 | 无 |
| Fixes: bash 自动批准合法化 | 🔄 隐含 | 发布说明中 TUI/命令/权限覆盖了实质内容，但未显式用 "Fixes" 标签重组 |
| Fixes: execution.bash.mode=allow_local | 🔄 隐含 | 同上 |
| Fixes: Ask gate 保留 | 🔄 隐含 | 同上 |
| Tests: 验证通过 | ❌ 无 | 发布说明未提及测试覆盖 |

### 总体评分：P3（轻微差距）

v12.7.0 发布说明清晰、结构良好。主要的 CHANGELOG "Fixes" 条目未在发布说明中作为独立修复列出，但功能性和权限配置部分涵盖了实际变化。测试信息未包含在内，但这对用户面向的发布说明来说是可接受的。

---

## F. 翻译一致性分析

### 文件数量对比

| 目录 | zh | en | 差异 |
|-----|----|----|------|
| `docs/platforms/` | 7 个 `.md` 文件 | 6 个 `.md` 文件 | **en 缺少 `claude-code-smoke.md`** |
| `docs/release/` | 7 个 `.md` 文件 | 6 个 `.md` 文件 | **en 缺少 `c6-claude-code-readiness.md`** |
| `docs/reference/` | 4 个 `.md` 文件 | 4 个 `.md` 文件 | 一致 |
| 根级 docs | developer.md, user-guide.md | developer.md, user-guide.md | 一致 |

### 关键长度差异

| 文件 | zh | en | 比值 | 差距 |
|------|-----|----|------|------|
| `developer.md` | 10 行 | 19 行 | 0.5x | en 略长（多了 Documentation 段落） |
| `user-guide.md` | 58 行 | 59 行 | 1.0x | 基本一致 |
| `reference/configuration.md` | 260 行 | 64 行 | **4.1x** | **P0** — zh 版包含详细的 Profile YAML 配置片段（solo-auto, manual-review, team-strict, analysis-hybrid）和分析边界矩阵，en 版完全缺失 |
| `reference/commands.md` | 46 行 | 48 行 | 1.0x | 基本一致（en 多了简短前言） |
| `reference/generated-artifacts.md` | 18 行 | 21 行 | 1.2x | 基本一致 |
| `reference/platforms.md` | 12 行 | 14 行 | 1.2x | 基本一致 |
| `platforms/claude-code.md` | 87 行 | 64 行 | 1.4x | zh 版有完整的 Plugin Namespace 和 Codex Plugin 段落 |
| `platforms/opencode.md` | 84 行 | 62 行 | 1.4x | zh 版有完整的 Model Matrix YAML 配置块 |
| `platforms/cursor.md` / `copilot.md` / `trae.md` | 47 行 each | 41 行 each | 1.1x | 基本一致 |

### 总体评分：P1（严重差距）

- **`reference/configuration.md` 翻译严重滞后（zh 260 行 vs en 64 行）** — 英文用户看不到完整的 Profile 配置模板和分析边界详细矩阵
- **2 个文件完全没有英文版**：`claude-code-smoke.md`（68 行）和 `c6-claude-code-readiness.md`（35 行）
- 平台指南 zh 版本普遍更详尽（多了 YAML 配置块和段落）

---

## G. AGENTS.md 有效性评估

### 评估（39 行）

| 维度 | 评分 | 说明 |
|------|------|------|
| 运行时合同清晰度 | ✅ **P3** | "Hypo-Workflow is not a runner" 和 "`.pipeline/` source of truth" 表述清晰 |
| Protected files 声明 | ✅ **P3** | 明确列出三个 protected files，行动要求清晰 |
| Analysis boundary 文档 | ✅ **P3** | manual/hybrid/auto 三种模式边界完整 |
| Active Rules/Habits 可见性 | ✅ **P3** | 列出了 8 条活跃规则及类型/级别 |
| 长度适当性 | ✅ **P3** | 39 行对于 Agent 指令来说紧凑但不失完整 |
| 可操作性 | ✅ **P3** | 每条均为可执行指令，不模糊 |

### 微小建议
- 可以添加一行声明 "This is a generated file" 的位置（当前隐含在第 3 行的 "regenerate adapters" 中）
- Rules/Habits 段落可以考虑添加上下文引擎的引用路径

### 总体评分：P3（充分有效）

AGENTS.md 是文档中做得最好的部分之一。紧凑、可执行、无冗余。

---

## 差距汇总表（按受众）

### 面向开发者

| ID | 差距 | 级别 | 受影响文件 |
|----|------|------|-----------|
| D1 | 无命令/Skill 添加流程文档 | **P0** | `docs/developer.md` (zh/en) |
| D2 | 无测试执行/编写文档 | **P0** | `docs/developer.md` (zh/en) |
| D3 | 无平台适配器添加流程文档 | **P1** | `docs/developer.md` (zh/en) |
| D4 | state.yaml schema 未文档化 | **P2** | `docs/developer.md` (zh/en) |
| D5 | developer.md 仅 10-19 行 | **P0** | 整体 developer.md |

### 面向新用户

| ID | 差距 | 级别 | 受影响文件 |
|----|------|------|-----------|
| U1 | 无首次入门 step-by-step 教程 | **P2** | `docs/user-guide.md` (zh/en) |
| U2 | "遇到阻塞怎么办" 极弱 | **P1** | `docs/user-guide.md` (zh/en) |
| U3 | Cycle 生命周期转换未解释 | **P2** | `docs/user-guide.md` (zh/en) |
| U4 | 无 `/hw:debug` 使用示例 | **P2** | `docs/user-guide.md` (zh/en) |

### 面向贡献者

| ID | 差距 | 级别 | 受影响文件 |
|----|------|------|-----------|
| C1 | **无 `CONTRIBUTING.md`** | **P0** | 新建文件 |
| C2 | 无测试编写/运行文档 | **P0** | `CONTRIBUTING.md`（新建）|
| C3 | 无 Skill 更新流程文档 | **P0** | `CONTRIBUTING.md`（新建）|
| C4 | 无适配器同步流程文档 | **P1** | `CONTRIBUTING.md`（新建）|
| C5 | 无代码风格/规则文档 | **P1** | `CONTRIBUTING.md`（新建）|

### 翻译一致性

| ID | 差距 | 级别 | 受影响文件 |
|----|------|------|-----------|
| T1 | `reference/configuration.md` en 严重滞后（64 vs 260 行） | **P0** | `docs/en/reference/configuration.md` |
| T2 | `claude-code-smoke.md` 无英文版 | **P1** | `docs/en/platforms/claude-code-smoke.md`（缺失）|
| T3 | `c6-claude-code-readiness.md` 无英文版 | **P1** | `docs/en/release/c6-claude-code-readiness.md`（缺失）|

### 平台文档

| ID | 差距 | 级别 | 受影响文件 |
|----|------|------|-----------|
| P1 | Codex AGENTS.md 集成未说明 | **P2** | `docs/platforms/codex.md` (zh/en) |
| P2 | Claude Code Smoke en 缺失 | **P1** | `docs/en/platforms/claude-code-smoke.md`（缺失）|

---

## 建议优先级

| 优先级 | 数量 | 行动项 |
|-------|------|--------|
| **P0** | 6 | 1. 创建 `CONTRIBUTING.md` 2. 补充 developer.md 内容（命令/Skill 添加流程、测试执行与编写）3. 补齐 `reference/configuration.md` en 完整翻译 |
| **P1** | 7 | 4. developer.md 增加平台适配器添加流程 5. user-guide.md "遇到阻塞怎么办" 补充 `/hw:debug` 使用指南 6. 为 `claude-code-smoke.md` 和 `c6-claude-code-readiness.md` 创建英文版 7. 补齐 Claude Code en 版 Codex Plugin 集成段落 |
| **P2** | 6 | 8. user-guide.md 增加 Cycle 生命周期转换说明 9. developer.md 增加 state.yaml schema 参考 10. Codex 平台文档增加 AGENTS.md 集成说明 11. developer.md zh 增加 Documentation 段落（已有 en 内容）|
| **P3** | - | 其余轻微改进（v12.7.0 release notes 添加 Tests 覆盖信息等）|

---

*基于对 36 个文档文件的完整审查生成。*
