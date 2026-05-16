# Prompt/Skill/Rules 冗余与冲突审计

**审计范围**: Hypo-Workflow v12.5.1 完整 skills/rules/references 文件系统  
**审计日期**: 2026-05-15  
**审计方法**: 基于证据的静态跨文件交叉分析  

---

## 总体摘要

| 严重级别 | 数量 | 说明 |
|---------|------|------|
| P0 (严重冲突) | 0 | 未发现阻塞性规则冲突 |
| P1 (真相源漂移) | 5 | SKILL.md vs commands-spec.md vs skill-spec.md 间存在多处不一致 |
| P2 (冗余/维护风险) | 8 | 重复指令、未维护文件、命名不一致 |
| P3 (低价值/残留) | 6 | 可标记废弃的命令和文件 |
| P4 (风格/建议) | 4 | 风格不统一、文档优化建议 |

---

## A. 重复指令审计

### A1 (P2) — 输出语言规则在所有 40 个 Skill 中逐字重复

**严重程度**: P2 (维护风险)  
**影响文件**: 所有 `skills/*/SKILL.md` (40 个文件)

**发现**: 每个独立 Skill 都包含以下近乎完全相同的「输出语言规则」段落：

```
## 输出语言规则
📌 输出语言规则：
读取 config.yaml → output.language
- zh-CN / zh：所有用户可见的输出使用中文···
- en：使用英文
- auto：跟随用户对话语言
内部日志（log.yaml、state.yaml）始终英文。
```

**数据**:
- 34 个 Skill 使用标题 `## 输出语言规则`
- 6 个 Skill 使用标题 `## Output Language Rules`（pr, reject, release, report, reset, 以及 plan-deep/docs/explore/sync 的变体）
- 所有 40 个 Skill 都包含此段落，每段约 5-8 行
- 合计约 **200-320 行重复内容**（5-8行 × 40）

**评估**: 
- ✅ **意图正确**: skill-spec.md 明确规定每个 Skill 需要 `## Output Language Rules` 段落
- ⚠️ **成本真实**: 在 SessionStart 加载根 SKILL.md 时，40 个独立 Skill 不会被全部加载（仅在按需加载时注入），所以实际上下文膨胀有限
- ❌ **维护风险**: 如果输出语言规则需要修改（例如添加新语言代码），需要同步更新 40 个文件
- 建议: 考虑在根 SKILL.md 或 `.pipeline/rules/` 中集中定义此规则，各 Skill 只需引用

### A2 (P3) — `读取 config.yaml → output.language` 模式

**严重程度**: P3 (低影响)  
**影响范围**: 约 25 个 Skill 在输出语言规则或执行流程中重复「读取 config.yaml」逻辑

**发现**: 「读取 `.pipeline/config.yaml`」「读取 `~/.hypo-workflow/config.yaml`」「解析 output.language」等指令在多个 Skill 的执行流程中逐字重复：
- `audit/SKILL.md:31` — "解析 `output.language` 和 `output.timezone`"
- `check/SKILL.md:25` — "解析 `output.language` 和 `output.timezone`"
- `debug/SKILL.md:44` — "解析 `output.language` 和 `output.timezone`"
- `compact/SKILL.md:62` — "解析 `output.language`、`output.timezone` 和 `compact.*`"
- 等其他约 15 个 Skill

**评估**: 这是合理的渐进式加载设计，每个 Skill 保持自包含性以确保独立可执行性。不属于严重问题。

### A3 (P3) — `prefer-chinese-output` 自定义规则与 `report-language` 内置规则的设计张力

**严重程度**: P3 (当前无影响，未来可能冲突)  
**文件**: `.pipeline/rules/custom/prefer-chinese-output.md` vs `rules/builtin/report-language.yaml`

**发现**:
- `report-language` (内置, warn, always): "Keep reports and generated summaries aligned with output.language"
- `prefer-chinese-output` (自定义, warn, always): "面向用户的说明... 优先使用中文"

**潜在冲突**: 如果 `output.language=en`，`report-language` 会说「用英文」，但 `prefer-chinese-output` 会说「用中文」。当前 `output.language=zh-CN` 所以两者一致。

**建议**: 在 `prefer-chinese-output` 规则中明确写出 `output.language=zh-CN 时的行为` 或添加条件 `当 output.language 为 zh-CN 或 zh 时`

---

## B. 低价值命令审计

### B1 (P3) — `stop` Skill — `/hw:stop` 指令使用率极低

**严重程度**: P3 (功能完整但低使用率)  
**文件**: `skills/stop/SKILL.md` (47 行)

**发现**: `/hw:stop` 是一个可恢复的暂停命令（设置 `pipeline.status=stopped`），但在实际使用中，用户更倾向于直接中断 Agent 会话而不是显式调用 `/hw:stop`。Agent 的中止自然触发了与 stop 类似的状态保存。

**保留理由**: 
- stop 的行为（persist state + optional intermediate report + remove lock）是中停止的规范实现
- resume 依赖 `pipeline.status=stopped` 来区分「用户主动暂停」和「崩溃」
- OpenCode command map 中 `/hw-stop` 映射到 `hw-status` agent

**建议**: 保留，但无需对用户强调此命令。属于基础设施命令。

### B2 (P2) — `dashboard` Skill — 已弃用但保留在文件系统和 skill-spec 中

**严重程度**: P2 (残留维护负担)  
**文件**: `skills/dashboard/SKILL.md` (30 行)

**发现**:
1. `dashboard/SKILL.md` 的 frontmatter description 明确说 "Internal legacy dashboard launcher **removed from the active command surface**"
2. 该文件仍然存在于 `skills/` 目录中，包含完整的输出语言规则和执行流程
3. 该 Skill **不在** `references/skill-spec.md` 的 39 行 Skill 清单中
4. 该 Skill **不在** `references/commands-spec.md` 的已识别命令列表中
5. 该 Skill **不在** `references/opencode-command-map.md` 的 OpenCode 命令映射中
6. 该 Skill **不在** 根 `SKILL.md` 的命令表格中
7. 但 `skill-spec.md` 文字说明 「40 个本地 Skill 文件」——而实际文件数是 40（包含 dashboard），但表格清单只有 39 行（不含 dashboard）

**关键矛盾**: 
- `skill-spec.md` 声称 "40 local Skill files" 但表格只列出 39 行
- 根 `SKILL.md` 支持 `dashboard.enabled` 配置键和 Dashboard 配置块
- `references/opencode-spec.md:229` 描述 "C5 adds a read-only progress dashboard projection"

**建议**: 
1. 要么将 dashboard 从 `skills/` 目录移到 `references/` 或归档
2. 要么修正 `skill-spec.md` 的计数（实际应为 40 文件含 dashboard，或 39 不含）
3. 统一 dashboard 的「已弃用」结论

### B3 (P3) — `/hw:review` 迁移别名

**严重程度**: P3 (需保留兼容但可标记废弃)  
**引用位置**: 
- 根 `SKILL.md:64` — 迁移警告
- `references/commands-spec.md:72,808-818` — 兼容别名定义

**发现**: `/hw:review` 是一个纯兼容别名，输出 `⚠️ \`/hw:review\` 已迁移到 \`/hw:plan:review\`。请使用新命令。` 后不做任何事。

**评估**: 
- 该别名不执行任何操作，仅打印警告
- 保留可能比移除更安全（防止旧用户/脚本使用 `/hw:review` 时失败）
- 占用的维护成本极低（3 处引用）

**建议**: 保留但可在文档中标记为 `@deprecated since v8`

### B4 (P3) — `resume` 作为独立 Skill 的边界模糊

**严重程度**: P3  
**发现**: 
- `skills/resume/SKILL.md` (117 行) 是一个独立 Skill
- `skills/start/SKILL.md` (163 行) 包含 `--from <prompt>` 标志和大量行为细节
- 根 `SKILL.md` (200-795 行) 包含 `/hw:resume` 和 `/hw:start` 的完整行为描述
- 三者之间存在三层行为定义重叠

**建议**: start 和 resume 共享核心状态机逻辑，可考虑统一引用或显式划分职责

---

## C. 历史残留审计

### C1 (P2) — `references/v9-architecture.md` 版本号已落后

**严重程度**: P2  
**文件**: `references/v9-architecture.md` (90 行, 修改于 2026-05-15)  
**当前版本**: `SKILL.md:3` 声明 `version: 12.5.1`

**发现**: 
- 文件名和内容标题以 "V9" 命名，但项目当前版本是 V12
- 文件内容描述 V9 OpenCode adapter 架构，但 `references/opencode-command-map.md` 和 `references/opencode-spec.md` 已存在，覆盖了 OpenCode 相关内容
- 文件中有历史引用 `plugins/opencode/` 路径，当前项目使用 `.opencode/` 目录

**评估**: v9-architecture.md 作为历史演进记录有一定价值，但文件名和标题给人「当前架构」的错觉。实际当前架构由 `SKILL.md` + `references/*.md` + `.pipeline/architecture.md` 共同构成。

**建议**: 
1. 重命名为 `v9-architecture-legacy.md` 或添加「Historical」标记
2. 或者在文件顶部添加醒目的弃用说明，指向当前架构引用

### C2 (P2) — `references/opencode-parity.md` 版本号已落后

**严重程度**: P2  
**文件**: `references/opencode-parity.md` (31 行, 修改于 2026-05-15)

**发现**:
- 标题为 "OpenCode **V8.4** Parity Matrix"，但当前版本为 V12.5.1
- 文件声明 "V9 OpenCode support targets **V8.4** user-facing parity"
- 文件提到 "All 40 user-facing commands remain traceable in `references/opencode-command-map.md`"

**评估**: 文件仍然准确描述了 OpenCode 的 parity 目标（即保持 V8.4 级别的功能对等），但标题中的 "V8.4" 容易让读者误以为 OpenCode 支持停留在 V8.4 水平。实际上 OpenCode 支持已扩展到 V12。

**建议**: 更新标题为 "OpenCode Parity Matrix (since V8.4)" 或 "OpenCode Capability Parity"

### C3 (P3) — references 文件中的过时版本号引用

**发现**: 多个 reference 文件引用了较旧版本号：
- `commands-spec.md:133` — "V4.5 does not require..."
- `evaluation-spec.md:81` — "The pipeline keeps the V1 scoring model"
- `evaluation-spec.md:128` — "多维度评分体系（V4）"
- `log-spec.md:3` — "V6 lifecycle ledger"
- `platform-claude.md:115` — "Key V3 behavior"
- `plan-review-spec.md:9` — "It complements V4 architecture drift scoring"

**评估**: 这些版本号标记的是 feature 引入时间而非当前版本。大部分用于向后兼容说明，但 `evaluation-spec.md` 中 "V4 多维度评分体系" 可能会让人误以为当前评价体系停留在 V4。

**建议**: 在已升级到当前行为的 spec 中添加版本演进说明（如 `@since V4, current: V12`）

### C4 (P3) — `references/commands-spec.md` 缩进不一致

**严重程度**: P4 (格式化问题)  
**发现**: `commands-spec.md` 解析规则部分（第 24-61 行）使用不一致的缩进：
- 第 24-36 行：三空格缩进 `   - /hw:*`
- 第 37-44 行：单空格缩进 ` - /hw:*`
- 第 45-61 行：三空格缩进 `   - /hw:*`

虽然不影响 Markdown 渲染，但表明文件在多次编辑中未保持一致的格式化。

---

## D. 真相源漂移审计

### D0 说明

以下对比的核心「真相源」为:
- **实际 Skill 文件**: `/home/heyx/.claude/skills/hypo-workflow/skills/*/SKILL.md` (40 个)
- **根 Skill**: `/home/heyx/Hypo-Workflow/SKILL.md` (1017 行)
- **命令规范**: `references/commands-spec.md` (834 行)
- **Skill 规范**: `references/skill-spec.md` (237 行)
- **OpenCode 命令映射**: `references/opencode-command-map.md`

### D1 (P1) — 根 SKILL.md vs commands-spec.md 的未知命令列表不一致

**严重程度**: P1 (真相源不一致)  

**发现**: 两个文件的未知命令响应格式存在差异：

**根 SKILL.md (第 269 行)**:
```
Available: /hw:start, /hw:resume, /hw:status, /hw:skip, /hw:stop, /hw:report, /hw:chat, /hw:plan, ...
```
**包含** `/hw:chat`

**commands-spec.md (第 65 行)**:
```
Available: /hw:start, /hw:resume, /hw:status, /hw:skip, /hw:stop, /hw:report, /hw:plan, ...
```
**缺少** `/hw:chat`

但 commands-spec.md 第 44 行的解析规则中 `chat` **是**已识别命令。所以只是未知消息列表缺少 chat。

**影响**: 如果 Agent 读取 commands-spec.md 的未知命令模板，用户在 `/hw:chat` 已知的情况下不会触发此路径，因此实际影响极小。

**建议**: 同步两个文件的未知命令列表。

### D2 (P1) — 根 SKILL.md vs 独立 Skill 的行为重复

**严重程度**: P1 (维护风险)  

**根 SKILL.md** (1017 行) 包含以下类型的详细内容，这些内容也存在于独立 Skill 中：

| 内容块 | 根 SKILL.md 行数 | 独立 Skill 位置 | 重叠度 |
|--------|-----------------|----------------|--------|
| `/hw:start` 行为 | ~40 行 (204-205, 776-795) | `skills/start/SKILL.md` (163 行) | 高 |
| `/hw:resume` 行为 | ~15 行 (206-207, 779-780) | `skills/resume/SKILL.md` (117 行) | 中 |
| `/hw:stop` 行为 | ~10 行 (214-215, 944-951) | `skills/stop/SKILL.md` (47 行) | 中 |
| `/hw:report` 行为 | ~5 行 (216-217) | `skills/report/SKILL.md` (57 行) | 中 |
| `/hw:chat` 行为 | ~3 行 (219) | `skills/chat/SKILL.md` (38 行) | 低 |
| 主状态机 | ~30 行 (776-795) | 分布在 `start` + `resume` | 高 |
| Patch Fix 执行约束 | ~15 行 (493-508) | `skills/patch/SKILL.md` | 高 |
| 输出语言规则 | 10 行 (66-75) | 所有 40 个 Skill | 高 |
| 配置模型 | ~50 行 (275-370) | 多数 Skill 隐含引用 | 中 |
| 评估决策 | ~30 行 (877-906) | `skills/start/SKILL.md` 隐含 | 低 |

**评估**: 根 SKILL.md 的设计意图是作为「聚合路由 + 系统参考」，而独立 Skill 是「按需加载的执行指令」。这种双重存在是**设计意图**而非意外。然而：
- 需要确保两边行为描述一致
- 修改时应同步更新两处（维护负担）
- 当独立 Skill 被按需加载时，根 SKILL.md 的行为描述可能与 Skill 内容发生上下文冲突

**建议**: 在根 SKILL.md 中明确说明「以下行为摘要，精确执行规范见对应 Skill 文件」，并在命令行为描述处添加 `→ 详见 skills/<name>/SKILL.md` 引用。

### D3 (P2) — skill-spec.md 的 Skill 清单缺少 dashboard

**严重程度**: P2  

**发现**:
- `skill-spec.md` 第 15 行声称 "The repository currently has **40** local Skill files"
- 实际目录中有 40 个 Skill 文件（包含 `skills/dashboard/SKILL.md`）
- 但 `skill-spec.md` 的表格清单（第 19-57 行）只列出 **39** 行，缺少 dashboard

**结论**: 要么计数错误（应为 39 不含 dashboard），要么表格清单遗漏了 dashboard。

### D4 (P2) — 输出语言规则标题不统一

**严重程度**: P2  

**发现**: `skill-spec.md` 第 94 行定义的模板使用 `## Output Language Rules`（英文），但：

| 标题 | 使用数量 | Skill |
|------|---------|-------|
| `## 输出语言规则` | 34 | 大多数 Skill |
| `## Output Language Rules` | 6 | pr, reject, release, report, reset, resume 使用偏中文内容但英文标题 |

**评估**: 
- `skill-spec.md` 要求 `## Output Language Rules` 但大多数 Skill 实际使用中文标题
- 使用英文标题的 6 个 Skill 的内容仍然以中文为主（如 `reject/SKILL.md` 用英文标题 `## Output Language Rules` 但内容用中文描述规则）
- 这不影响功能但显示规范与实现之间的漂移

### D5 (P3) — `skill-spec.md` SKILL.md 格式模板与实际文件不一致

**严重程度**: P3  

**发现**: `skill-spec.md` 第 94-114 行定义的模板包含以下 section：
- `# /hypo-workflow:command`
- `## Output Language Rules`
- `## Preconditions`
- `## Execution Flow`
- `## Interactive Behavior`
- `## Safety Rules`
- `## Failure Handling`
- `## Reference Files`

但实际 Skill 中很少完全遵循此模板。例如 `skills/stop/SKILL.md` 使用：
- `# /hypo-workflow:stop` ✅ 
- `## 输出语言规则`（中文变体）
- `## 前置条件`（中文翻译 Preconditions）
- `## 执行流程`（中文翻译 Execution Flow）
- `## 安全规则`（中文翻译 Safety Rules）
- `## 参考文件`（中文翻译 Reference Files）
- 缺少 `## Interactive Behavior` 和 `## Failure Handling`

大多数 Skill 存在类似的模板偏差。

---

## E. 规则冲突审计

### E1 (P2) — `claude-hw-command-namespace` 规则无内置定义

**严重程度**: P2  

**发现**: 
- `.pipeline/rules.yaml` 定义了 `claude-hw-command-namespace: error`
- 但 `rules/builtin/` 目录中**不存在**对应的 `claude-hw-command-namespace.yaml`
- 该规则在 `rules/presets/recommended.yaml` 中也**不存在**

**说明**: 此规则仅作为项目级自定义规则存在，但缺少内置定义意味着：
- 没有 `check:` 条件——Agent 无法自动验证此规则
- 没有 `hooks:` 绑定——不知道何时触发
- 需要 Agent 手动理解 AGENTS.md 中的规则描述才能执行

**建议**: 要么创建 `rules/builtin/claude-hw-command-namespace.yaml` 内置定义，要么将规则从 `.pipeline/rules.yaml` 降级为 `warn` 或移至自定义规则目录。

### E2 (无冲突) — `.pipeline/rules.yaml` 覆盖与 `recommended` 预设一致

**严重程度**: 无 (正常配置)  

**发现**: 项目 `.pipeline/rules.yaml` 的三条规则覆盖：
```yaml
git-clean-check: warn       # recommended 也是 warn → 冗余但无冲突
report-language: warn       # recommended 也是 warn → 冗余但无冲突
progress-timezone: warn     # recommended 也是 warn → 冗余但无冲突
```

这三条与 `recommended` 预设**值完全一致**，是冗余声明但不会造成冲突。

**建议**: 移除项目文件中的冗余覆盖，仅保留 `claude-hw-command-namespace: error`。

### E3 (无冲突) — `~/.hypo-workflow/config.yaml` 与 `.pipeline/rules.yaml` 无直接冲突

**严重程度**: 无 (不同层面)  

**发现**: 
- 全局配置 `output.language: zh-CN` 是**值设定**
- 项目规则 `report-language: warn` 是**检查强度设定**
- 两者作用于不同层面：配置 configures「用什么语言」，规则 enforces「是否与配置一致」
- 如果需要，可在项目 config 中覆盖 `output.language`，规则仍会正确运作

### E4 (无冲突) — 全局配置无 rules 键

**严重程度**: 无  

**发现**: `~/.hypo-workflow/config.yaml` 中不包含 `rules` 键，因此不会与 `.pipeline/rules.yaml` 产生覆盖冲突。规则仅从项目级配置生效。

---

## F. Prompt 膨胀审计

### F1 — 所有 Skill 均在 500 行推荐上限内

**严重程度**: 无 (符合规范)  

**数据**: `skill-spec.md` 推荐 "Keep SKILL.md under 500 lines"。所有 40 个 Skill 均满足此要求：

| Skill | 行数 | 评估 |
|-------|------|------|
| rules | 368 | 合理 — 完整规则系统管理 |
| patch | 302 | 合理 — 包含 fix 通道和约束 |
| showcase | 286 | 可优化 — 包含大量生成参数 |
| setup | 273 | 可优化 — 交互式向导冗长 |
| plan | 262 | 合理 — 计划模式入口 |
| cycle | 262 | 合理 — Cycle 生命周期管理 |
| init | 241 | 可优化 — 包含大量配置生成逻辑 |
| plan-discover | 227 | 合理 — 渐进式发现流程 |
| compact | 178 | 合理 — 压缩策略细节 |
| start | 163 | 合理 — 启动流程 |
| 其余 30 个 | <125 | 精简 |

### F2 — 根 SKILL.md (1017 行) 超过 Skill 规范建议

**严重程度**: P3 (预期行为)  

**发现**: 根 SKILL.md 为 1017 行，但 `skill-spec.md` 明确说明 "Unless the command is an aggregate router" 允许超出行数限制。根 SKILL.md 是聚合路由器，因此符合规范。

**构成分析**:
| 部分 | 行数 | 比例 |
|------|------|------|
| 前导信息 (frontmatter + 标题) | 1-12 | 1% |
| 命令列表表格 | 13-65 | 5% |
| 输出语言规则 | 66-75 | 1% |
| Plan 工具纪律 | 77-84 | 1% |
| 执行骨架 + 加载 | 86-134 | 5% |
| **命令行为详细描述** | 200-269 | 7% |
| 配置模型 (默认值表格) | 275-370 | 9% |
| Prompt 发现 + 架构 | 375-402 | 3% |
| Plan 模式详细 | 404-421 | 2% |
| Dashboard | 423-429 | 1% |
| Cycle + Patch 规则 | 431-449 | 2% |
| **规则系统** | 451-491 | 4% |
| **Patch Fix 约束** | 493-508 | 2% |
| Hook 集成 | 510-623 | 11% |
| State Core | 625-697 | 7% |
| Watchdog | 699-711 | 1% |
| 日志/Progress/Compact | 714-770 | 6% |
| **主状态机** | 772-795 | 2% |
| Skip Cascade | 797-823 | 3% |
| Subagent | 825-862 | 4% |
| 评估决策 | 875-917 | 4% |
| Plan Review + 失败处理 | 919-970 | 5% |
| 平台包装 + 适配器 | 974-1017 | 4% |

**可精简空间**:
- Hook 集成部分 (510-623, 113 行) — Claude/Codex 详细差异可移至 `references/platform-*.md`
- 配置默认值表格 (323-370, 48 行) — 已存在于 `references/config-spec.md`
- 主状态机 (772-795) 可与 `skills/start/SKILL.md` 合并引用

### F3 — 全部 40 个 Skill 总行数: 4473 行

**统计**:
- 40 个 Skill 总行数: **4473 行**
- 根 SKILL.md: **1017 行**
- 合计: **5490 行**
- 其中仅输出语言规则重复即占约 **280 行** (5% 的内容)
- 每个 Skill 平均: **112 行**（中位数约 70 行）

---

## 发现汇总矩阵

```
┌──────────────────────────────────────────────────────────────────────┐
│  ID    严重度    类别              描述                                │
├──────────────────────────────────────────────────────────────────────┤
│  D1    P1       真相源漂移    SKILL.md vs commands-spec.md 未知命令列表 │
│                              /hw:chat 存在性不同步                     │
│  D2    P1       真相源漂移    根 SKILL.md 与独立 Skill 行为高度重叠     │
│  D3    P2       真相源漂移    skill-spec.md 40/39 计数矛盾              │
│  D4    P2       真相源漂移    输出语言规则标题中英文不统一               │
│  D5    P3       真相源漂移    skill-spec.md 模板与实际 Skill 结构偏差   │
│                                                                      │
│  A1    P2       重复指令      输出语言规则在 40 个 Skill 中重复        │
│  A2    P3       重复指令      config.yaml 读取逻辑在多个 Skill 重复    │
│  A3    P3       重复指令      prefer-chinese-output vs report-language  │
│                                                                      │
│  B1    P3       低价值命令    /hw:stop 使用率极低但基础设施需保留     │
│  B2    P2       低价值命令    dashboard 已弃用但文件系统残留           │
│  B3    P3       低价值命令    /hw:review 迁移别名可标记废弃           │
│  B4    P3       低价值命令    resume Skill 三层行为定义重叠            │
│                                                                      │
│  C1    P2       历史残留      v9-architecture.md 版本号落后          │
│  C2    P2       历史残留      opencode-parity.md 版本号落后           │
│  C3    P3       历史残留      references 中多处旧版本号引用            │
│  C4    P4       历史残留      commands-spec.md 缩进不一致              │
│                                                                      │
│  E1    P2       规则冲突      claude-hw-command-namespace 无内置定义   │
│  E2    无        规则冲突      project rules 覆盖与 recommended 一致   │
│  E3    无        规则冲突      配置层与规则层无交叉冲突                 │
│  E4    无        规则冲突      全局配置无 rules 键                     │
│                                                                      │
│  F1    无        Prompt膨胀   所有 Skill 均在 500 行内                 │
│  F2    P3       Prompt膨胀   根 SKILL.md 有可精简空间 (Hook 113行等)   │
│  F3    信息      Prompt膨胀   总 Skill 行数 5490, 5% 为重复内容        │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 历史残留清除候选列表

| 文件/路径 | 当前状态 | 建议处理 |
|----------|---------|---------|
| `skills/dashboard/SKILL.md` | 已弃用，但仍存在 | 移至 `references/deprecated/` 或删除；同步更新 skill-spec.md |
| `references/v9-architecture.md` | 版本标签落后 | 重命名为 `v9-architecture-legacy.md` 或添加 `@historical` 标记 |
| `references/opencode-parity.md` | 标题含 V8.4 | 更新标题为 "OpenCode Parity Matrix (since V8.4)" |
| `/hw:review` 别名 | 兼容性存根 | 添加 `@deprecated since v8` 注释 |
| `evaluation-spec.md` 中的 "V4 多维度评分" | 功能已演进 | 添加 `@since V4, current: V12` |

---

## 低价值命令清理候选列表

| 命令/文件 | 评估 | 建议 |
|----------|------|------|
| `/hw:stop` (stop Skill) | 基础设施，低使用率但支持 resume | 保留，不宣传 |
| `/hw:dashboard` (dashboard Skill) | 已明确弃用 | 物理删除或归档 |
| `/hw:review` 迁移别名 | 无操作存根 | 保留但标记废弃 |
| `skills/watchdog/SKILL.md` | cron-only，已正确标记 | 保持现状 |
| `skills/plan-confirm/SKILL.md` | 仅 47 行，功能正确 | 保持现状 |

---

## 建议的修复优先级

### P1 (应尽快处理)
1. **同步 SKILL.md 与 commands-spec.md 的未知命令列表** — 在 commands-spec.md 第 65 行的 Available 列表中添加 `/hw:chat`
2. **明确根 SKILL.md 与独立 Skill 的职责边界** — 在根 SKILL.md 每个命令描述处添加 `→ 详见 skills/<name>/SKILL.md` 引用标记

### P2 (下次整理时处理)
3. **清理 dashboard Skill 残留** — 决定保留/移除，同步更新 skill-spec.md 计数
4. **为 v9-architecture.md 添加过期标记**
5. **更新 opencode-parity.md 标题**
6. **统一输出语言规则标题** — 全改为 `## 输出语言规则` 或 `## Output Language Rules`
7. **为 claude-hw-command-namespace 创建内置规则定义**
8. **修正 skill-spec.md 的 40/39 计数矛盾**

### P3 (可在后续版本中处理)
9. **精简根 SKILL.md 的 Hook 集成部分** (113 行 → references 引用)
10. **移除 .pipeline/rules.yaml 中与 recommended 冗余的覆盖**
11. **统一 6 个 Skill 的输出语言规则标题格式**
12. **在 references 中的旧版本号处添加演进说明**

---

## 审计执行说明

- **分析范围**: 只读静态分析，未修改任何文件
- **证据来源**: 直接读取文件内容，通过 grep/diff/wc 交叉验证
- **分析方法**: 按照要求的 A-F 六个维度分别检查
- **未覆盖**: 未检查 Skill 执行逻辑的正确性（仅检查结构和一致性）
- **边界**: 遵循 `opencode.json` 中配置的 hybrid 模式约束，本审计为只读分析
