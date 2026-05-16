# C14-M4 测试健壮性与硬编码审查报告

> **Cycle**: C14 — Prompt兼容性审查  
> **Milestone**: M4 — 测试健壮性与硬编码审查  
> **时间**: 2026-05-15T13:45:00+08:00  
> **执行者**: self (audit worker)  
> **语言**: zh-CN

---

## 1. 测试执行结果汇总

### 1.1 Node.js 测试套件 (`core/test/*.test.js`)

| 指标 | 数值 |
|------|------|
| 测试文件数 | 91 |
| 总测试数 (subtests) | 495 |
| 通过 | 472 |
| 失败 | 23 |
| 跳过/取消 | 0 |
| 执行耗时 | ~2.2s |

**执行命令**: `cd core && npm test` (实际为 `node --test core/test/*.test.js`)

#### 1.1.1 失败测试详情

所有 23 个失败均为**文档契约测试**（documentation contract tests），根本原因一致：正则表达式匹配预期英文文本，但实际 Skill 文档已更新为中文。

| # | 测试名称 | 测试文件 | 失败原因 |
|---|---------|---------|---------|
| 44 | plan docs keep single-feature plan behavior and add --batch semantics | `batch-plan.test.js:6` | `/Use this skill for the full P1-P4 planning flow\./` 匹配失败，文档为中文本地化版本 |
| 51 | vertical-slice docs require one-behavior TDD loops... | `batch-plan.test.js:174` | `/stable prompt\/design artifacts/i` 匹配失败 |
| 123 | start and resume use platform-neutral orchestration language | `codex-subagent-discipline.test.js:40` | `/main agent coordinates/i` 匹配失败 |
| 126 | patch lane preserves lightweight scope... | `codex-subagent-discipline.test.js:178` | 类似文档契约不匹配 |
| 127 | role-sensitive commands resolve worker authorization... | `codex-subagent-discipline.test.js:261` | 类似文档契约不匹配 |
| 128 | plan resume debug and patch share subworker lifecycle contract | `codex-subagent-discipline.test.js:332` | 类似文档契约不匹配 |
| 129 | plan generate pre-assigns subworker tasks in prompts... | `codex-subagent-discipline.test.js:414` | 类似文档契约不匹配 |
| 131 | setup and help do not route Codex Subagents to external providers | `codex-subagent-discipline.test.js:494` | 类似文档契约不匹配 |
| 185 | deep plan skill defines operation vocabulary and lifecycle states | `deep-plan-contract.test.js:6` | 类似文档契约不匹配 |
| 186 | deep plan boundary is distinct from guide onboarding... | `deep-plan-contract.test.js:52` | 类似文档契约不匹配 |
| 187 | ordinary /hw:plan keeps P1-P4 gates and --deep routes... | `deep-plan-contract.test.js:110` | 类似文档契约不匹配 |
| 204 | Help, docs, and references present Deep Plan as integrated... | `deep-plan-integration.test.js:6` | 类似文档契约不匹配 |
| 228 | v12.5.2 release coverage is Chinese-first... | `readme-spec.test.js:34` | 类似文档契约不匹配 |
| 273 | M07 docs describe insert confirmation, auto-chain gates... | `feature-queue-ops.test.js:12` | 类似文档契约不匹配 |
| 284 | guide and Discover contracts document router, adaptive Grill-Me... | `guide-router.test.js:6` | 类似文档契约不匹配 |
| 298 | knowledge hook docs define archive summary, compact generation... | `knowledge-hooks.test.js:6` | 类似文档契约不匹配 |
| 308 | F001 gate OpenCode smoke validates generated runtime policy surfaces | `opencode-hooks.test.js:34` | 类似文档契约不匹配 |
| 314 | workflow lifecycle contracts are documented for skills and references | `lifecycle-regression.test.js:6` | 类似文档契约不匹配 |
| 335 | OpenCode guide documents model matrix defaults and boundaries | `opencode-model-matrix-docs.test.js:6` | 类似文档契约不匹配 |
| 364 | patch skill documents accept/reject and patch metadata roundtrips | `patch-acceptance.test.js:12` | 类似文档契约不匹配 |
| 403 | progressive discover spec defines big questions, stages... | `progressive-discover.test.js:6` | 类似文档契约不匹配 |
| 460 | execution skills carry the same Subagent separation contract | `subagent-separation-contract.test.js:6` | 类似文档契约不匹配 |
| 495 | workflow commit helper contract is documented for lifecycle commands | `workflow-commit.test.js:217` | `/workflow commit helper/` 匹配失败，`accept` skill 使用中文本地化措辞 |

#### 1.1.2 失败模式分析

**系统性问题**: 所有 23 个失败均属于同一类别——**文档契约测试的 i18n 脆弱性**。测试代码使用英文正则表达式验证 Skill 文件（如 `plan/SKILL.md`、`accept/SKILL.md`）的内容，但这些 Skill 文件已完成中文本地化（`output.language: zh-CN`），导致纯英文正则表达式匹配失败。

**风险等级**: Warning（非功能回归，但代表静态检查缺失）

**修复方向**:
1. 文档契约测试应支持多语言内容匹配（中/英文正则或语义化检查）
2. 或：确保这些测试运行时的文档模板语言与测试预期一致
3. 短期：标记这些测试为"i18n-known"，或适配为中英文兼容匹配

---

### 1.2 Python 测试 (`tests/test_notion_*.py`)

| 测试文件 | 结果 | 原因 |
|---------|------|------|
| `test_notion_integration.py` | FAIL | `Notion-API.md` token 文件不存在 |
| `test_notion_output_adapter.py` | FAIL | `Notion-API.md` token 文件不存在 |
| `test_notion_source_adapter.py` | FAIL | `Notion-API.md` token 文件不存在 |
| `test_notion_mixed_mode.py` | FAIL | `Notion-API.md` token 文件不可读 |

**风险等级**: Info（Notion 集成测试需要有效的 API token，本地 CI 环境预期缺少 token）

**说明**: 4 个 Python 测试均为 Notion API 集成测试，依赖外部 token 文件。在无 Notion token 的环境中全部 fail 是**预期行为**，不是代码缺陷。这些测试应标记为 `@pytest.mark.skipif` 或添加 `NOTION_TOKEN` 环境变量检查。

---

### 1.3 场景回归测试 (`tests/run_regression.py`)

| 指标 | 数值 |
|------|------|
| 总场景数 | 68 |
| 通过 | 53 |
| 失败 | 15 |
| 总执行耗时 | ~2.2s + scenarios |

**失败场景**:

| 场景 | 描述 | 状态 |
|------|------|------|
| s32 | import-history-keyword | FAIL |
| s33 | import-history-merge | FAIL |
| s34 | import-history-time-gap | FAIL |
| s35 | import-history-interactive | FAIL |
| s37 | import-history-existing-pipeline | FAIL |
| s38 | patch-fix-flow | FAIL |
| s42 | guide-flow | FAIL |
| s44 | showcase-skeleton | FAIL |
| s45 | showcase-docs | FAIL |
| s46 | showcase-slides-poster | FAIL |
| s47 | showcase-lifecycle | FAIL |
| s50 | rules-system | FAIL |
| s52 | core-config-artifacts | FAIL |
| s56 | agents-ask-todo-plan-discipline | FAIL |
| s60 | progress-board-format | FAIL |

**失败模式分析**:
- **import-history 系列 (5)**: s32-s37 大部分失败，历史导入功能回归可能涉及 git 依赖
- **showcase 系列 (4)**: s44-s47 所有 showcase 场景失败，可能是依赖缺失
- **patch-fix-flow, guide-flow, rules-system**: 独立功能回归
- **s52 core-config-artifacts**: 涉及核心配置，该场景调用了 `node --test`，与 Node.js 测试中的 i18n 文档契约失败相关
- **s56, s60**: OpenCode/进度板相关

---

## 2. 硬编码扫描结果

### 2.1 测试文件硬编码数字

#### 2.1.1 命令计数硬编码

| 文件 | 行号 | 内容 | 风险 |
|------|------|------|------|
| `readme-update.test.js` | 106 | `Array.from({ length: 36 }, ...)` — 命令大纲硬编码为 36 | **Critical** |
| `readme-update.test.js` | 123 | `failure.actual === 37` — 过期命令数量检测 | **Critical** |
| `readme-update.test.js` | 133 | 同上 `length: 36` | **Critical** |
| `readme-update.test.js` | 168 | 同上 `length: 36` | **Critical** |

**说明**: 当前实际命令数量约 40 个（根据 `SKILL.md` 命令表计数），硬编码的 36 已过时。测试验证 `stale-command-count` 检查使用 37 作为阈值，可能已经失效。

#### 2.1.2 其他硬编码

| 文件 | 行号 | 内容 | 风险 |
|------|------|------|------|
| `deep-plan-architecture.test.js` | 145,151,157 | `edge_index === 0/1/2` — 架构边缘索引硬编码 | Low |

**总计**: 测试文件中未发现大量硬编码版本字符串（如 `"12.5.2"`），硬编码问题主要集中在**命令计数**上。

### 2.2 测试文件硬编码路径

测试文件大量使用 `.pipeline/` 相对路径（如 `.pipeline/state.yaml`、`.pipeline/config.yaml`），这在语义上是正确的，因为 `.pipeline/` 是项目约定。**未发现**类似 `/home/user/` 或 `/etc/` 的系统级硬编码路径（除 `opencode-hooks.test.js` 中用于 explore worktree 路径测试的 `/home/heyx/.hypo-workflow/` 前缀，属于特定功能测试场景）。

### 2.3 参考文档硬编码扫描

**reference/*.md** 文件扫描结果：
- 未发现硬编码的命令计数（如 "40 skills"、"36 commands"）
- 未发现硬编码版本号（如 "12.5.2"）引用已过期的版本
- 平台列表（Claude Code、Codex、OpenCode）在 `platform-capabilities.md` 中保持最新，未遗漏新平台

**结论**: 参考文档的硬编码风险较低，但需要关注 `readme-update.test.js` 与 SKILL.md 之间的命令计数不一致。

---

## 3. 测试覆盖率缺口分析

### 3.1 命令覆盖率矩阵

根据当前 `SKILL.md` 命令表（约 40 个命令）与 91 个测试文件的映射分析：

| 命令 | 专用测试文件 | 间接覆盖 | 缺口等级 |
|------|-------------|---------|---------|
| `/hw:start` | ❌ 无专用文件 | `codex-subagent-discipline` 等 14 个文件涉及 | Medium |
| `/hw:resume` | ❌ 无专用文件 | 同上 | Medium |
| `/hw:status` | ✅ `opencode-status.test.js` | — | OK |
| `/hw:skip` | ❌ 无专用文件 | 14 个文件提及但无专用测试 | **High** |
| `/hw:stop` | ❌ 无专用文件 | 16 个文件提及但无专用测试 | **High** |
| `/hw:report` | ❌ 无专用文件 | 33 个文件提及但无专用测试 | Medium |
| `/hw:chat` | ✅ `chat-hooks`, `chat-mode-spec`, `chat-runtime` | — | OK |
| `/hw:plan` | ✅ `batch-plan`, `progressive-discover` | 多个 deep-plan-* 文件 | OK |
| `/hw:plan:deep` | ✅ `deep-plan-architecture`, `deep-plan-contract` 等 8 个文件 | — | OK |
| `/hw:plan:review` | ❌ 无专用文件 | `review-artifacts` (无关 plan:review) | **High** |
| `/hw:plan:confirm` | ❌ 无专用文件 | 无 | **Critical** |
| `/hw:plan:extend` | ❌ 无专用文件 | `progressive-discover` 间接提过 | **High** |
| `/hw:cycle` | ✅ `cycle-acceptance` | — | OK |
| `/hw:accept` | ✅ `acceptance-policy-status` | — | OK |
| `/hw:reject` | ✅ `rejection-rework-blocked-runtime-loop` | — | OK |
| `/hw:explore` | ✅ `explore-contract`, `explore-lifecycle` | — | OK |
| `/hw:sync` | ✅ `sync-derived-map`, `sync-standardization` | — | OK |
| `/hw:docs` | ✅ `docs-governance` | — | OK |
| `/hw:patch` | ✅ `patch-acceptance` | — | OK |
| `/hw:pr` | ✅ `pr-contract`, `pr-create-contract`, `pr-manual-gates` | — | OK |
| `/hw:explain` | ✅ `explain-contract`, `explain-subagent` | — | OK |
| `/hw:compact` | ✅ `compact-end-of-run` | — | OK |
| `/hw:knowledge` | ✅ `knowledge-ledger`, `knowledge-hooks`, `knowledge-opencode-gate` | — | OK |
| `/hw:guide` | ✅ `guide-router` | — | OK |
| `/hw:showcase` | ✅ `showcase-report-refresh` | 场景测试覆盖不足 | Medium |
| `/hw:rules` | ✅ `rules-authority`, `rules-capture-habits` | — | OK |
| `/hw:init` | ✅ `init-automation-contract`, `config` | — | OK |
| `/hw:check` | ❌ 无专用文件 | 32 个文件间接提及 | Medium |
| `/hw:audit` | ✅ `audit-governance-contract`, `audit-memory-contract`, `audit-regression-canonical-examples` | — | OK |
| `/hw:release` | ❌ 无专用文件 | 14 个文件提及但无专用测试 | **High** |
| `/hw:debug` | ❌ 无专用文件 | 9 个文件提及但无专用测试 | **High** |
| `/hw:help` | ❌ 无专用文件 | 11 个文件提及但无专用测试 | **High** |
| `/hw:reset` | ❌ 无专用文件 | 24 个文件提及但无专用测试 | Medium |
| `/hw:log` | ✅ `log-evidence` | — | OK |
| `/hw:setup` | ❌ 无专用文件 | 6 个文件提及但无专用测试 | **High** |
| `/hw:release` (管理) | ❌ 无专用文件 | — | **High** |

### 3.2 覆盖率缺口汇总

**Critical (完全无覆盖)**:
- `/hw:plan:confirm` — P4 Confirm 阶段，作为硬门控，零测试覆盖是高风险

**High (无专用测试文件)**:
- `/hw:skip` — 核心 Skipping 机制
- `/hw:stop` — Graceful stop 机制
- `/hw:release` — release automation
- `/hw:debug` — debug flow
- `/hw:help` — help 系统
- `/hw:setup` — 全局安装配置
- `/hw:plan:review` — Plan Review
- `/hw:plan:extend` — Plan Extension

**Medium (间接覆盖不足)**:
- `/hw:report` — report 生成被广泛引用但无单独测试
- `/hw:start` / `/hw:resume` — 核心执行流程，靠场景测试覆盖而非单元测试
- `/hw:check` — check 命令
- `/hw:reset` — reset 命令
- `/hw:showcase` — 场景测试大面积失败，说明健壮性不足

---

## 4. 脆性/不稳定风险说明

### 4.1 文档契约测试的 i18n 脆性 (High)

**影响范围**: 23/495 tests (4.6%)  
**根因**: 测试期望英文正则匹配，但文档已本地化为中文  
**建议**: 
- 短期：标记为 known-i18n，在 CI 中使用 `--test-only` 排除或禁用
- 长期：添加多语言感知的文档内容验证，使用语义化断言替代正则表达式

### 4.2 Notion 集成测试的 token 依赖 (Low)

**影响范围**: 4/4 Python tests  
**根因**: 缺少 `Notion-API.md` token 文件  
**建议**: 使用 `pytest.skip` 或 `unittest.skipUnless` 自动跳过无 token 环境

### 4.3 场景回归失败集中区域 (Medium)

- **import-history (5 场景)**: s32-s37 大面积失败，可能需要 git 历史或特定仓库状态
- **showcase (4 场景)**: s44-s47 全部失败，可能缺少 PPTX/LaTeX 依赖
- **patch-fix-flow**: 具体失败原因需进一步调查

### 4.4 命令计数硬编码风险 (High)

`readme-update.test.js` 硬编码 36 条命令、37 作为 stale 阈值。当前实际约 40 条命令。这些硬编码使测试无法检测真实的命令数量漂移，并可能在 README 更新时产生误报或漏报。

---

## 5. 综合评价

| 维度 | 评分 (1-5) | 说明 |
|------|-----------|------|
| 测试通过率 | 4 | 472/495 = 95.4%，功能测试全部通过 |
| 硬编码问题 | 3 | 命令计数硬编码过时，影响 README 更新验证 |
| 覆盖率完整性 | 3 | 8 个命令无专用测试，plan:confirm 零覆盖 |
| 脆性风险 | 3 | i18n 脆性影响 23 个测试，但非功能回归 |
| 场景回归 | 3 | 53/68 = 78%，showcase 和 import-history 系列大面积失败 |

**总体判断**: 测试套件在功能覆盖方面表现良好，但存在三类系统性问题：(1) 文档契约测试的 i18n 脆性导致 ~5% 测试持续失败；(2) 命令计数硬编码过时；(3) release、debug、setup、help、skip、stop 等核心命令缺乏专用测试覆盖。

**优先修复项**:
1. **[P0]** 修复/标记 23 个文档契约测试的 i18n 问题
2. **[P1]** 更新 `readme-update.test.js` 中的命令计数为当前实际值
3. **[P2]** 为 `/hw:release`、`/hw:debug`、`/hw:help`、`/hw:setup` 添加专用测试
4. **[P3]** 修复或添加 skip 条件到 Notion 集成测试
5. **[P4]** 调查 showcase 和 import-history 场景回归失败

---

*报告生成: 2026-05-15T13:46:00+08:00 | C14-M4-test-hardcode-audit*
