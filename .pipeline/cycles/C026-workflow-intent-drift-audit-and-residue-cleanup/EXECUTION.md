---
kind: execution
cycle: C026-workflow-intent-drift-audit-and-residue-cleanup
updated: 2026-08-14T15:53:00+08:00
---

# 执行记录

## Checkpoint: M1 产出完整审计矩阵（2026-08-14）

### 做了什么

对"模型每日实际读取的表面"做闭合审计，而不是只审计 Skills 一层：

- 逐文件核查 `skills/plan/SKILL.md`、`skills/goal/SKILL.md`、`skills/cycle/SKILL.md`、`skills/guide/SKILL.md`、`templates/semantic/*`、`AGENTS.md`（生成适配器）、`hooks/README.md`、`hooks/hooks.json`、`core/src/codex-hooks/index.js`。
- 对照 memory authority：`index.yaml` active 条目与 `.pipeline/memory/inbox/` 10 条 staged 条目逐条比对，确认"需求已确认但未传播"的断裂点（A3/D1/C5）。
- 对照旧机制存活情况：`core/src/planning|batch-plan|deep-plan|progressive-discover`、`core/src/delivery` 旧契约、`.pipeline/config.yaml`、`rules/builtin` 与 presets 的 hook gate 严重度。
- 对照权威链：`AGENTS.md` Runtime contract 与 `.pipeline/runtime/objects/delivery/*`、`active.yaml` 的实际状态。
- 验证排除项：grep 确认 `core/src/history-refresh` 已无 C022 常量（C023 已修）；skills/commands 无旧 API 术语。

### 关键发现

1. 讨论 gate 需求 2026-08-09 已确认并进入 memory active，但 `skills/plan/SKILL.md` 与 `AGENTS.md` 两个执行面仍是旧语义，`AGENTS.md` L14/L36 甚至与新需求字面相反——这是"跳过讨论"的直接原因。
2. Plan 部分从未被明示排除在 M/S ID 空间外，C12–C22 的实践惯性（规划阶段=M1）无规则切断。
3. Hooks 存在两套教义：`hooks/README.md` 说"非正确性来源、fail-open"，`rules/builtin/session-start-context-load.yaml` 却以 error 级 gate 注入每日指令；core 10 事件 / hooks.json 6 事件 / README 声称不注册逐工具证据，三方漂移。
4. 审计链条自身残留：10 条 staged inbox 未审阅，其中 history-refresh 条目的报错已被 C023 修复却无人闭环；7 个 runtime delivery 半终态对象与语义 Cycle 两条权威链并存。

### 产物

- `.pipeline/cycles/C026-workflow-intent-drift-audit-and-residue-cleanup/AUDIT-MATRIX.md`（20 个残留面 + 4 项排除项，全部带证据路径）。

### 验证

- 矩阵中每个残留面均可通过对应文件路径复核；排除项均经实际 grep/read 验证。
- 本 checkpoint 未修改任何被审计文件（只新增 Cycle 文件与索引），M2–M5 清理动作尚未执行。

## Checkpoint: S1 接受（2026-08-14）

用户接受审计矩阵与清理范围，授权执行 M2–M5。

## Checkpoint: M2 讨论范围门落地（2026-08-14）

- `skills/plan/SKILL.md`：Discussion 段改写为已确认的范围门语义（定范围 → 逐项讨论 → 复盘并明确询问可否写 Proposal → 只有明确确认才授权写 Proposal；"可以/对"不关闭讨论；四段不折叠）。
- `skills/goal/SKILL.md`：Goal 的 Discussion 同样增加复盘确认门，明示 Goal 只是没有中间 Stone，两道门仍独立。
- `AGENTS.md`：Consultation-First 与 Ask Questions 两节删掉"不设单独确认门/只问最终 Proposal"旧语义，写入范围门与反折叠条款。
- `core/src/artifacts/agent-guidance.js`：生成源同步，未来适配器生成携带同一语义。
- inbox 条目 `maintain-plan-discussion-scope-gate-20260809.yaml` 审阅结论 applied（见 M5）。

## Checkpoint: M3 Plan/Execute 二分与旧阶段机制退役（2026-08-14）

- `skills/plan/SKILL.md`：明示 Plan 部分（Discussion 与 Proposal）不进入 M/S ID 空间，并引用 C12/C19/C22 反例。
- `templates/semantic/plan.md`：表格前增加同一声明。
- `core/src/planning|batch-plan|deep-plan|progressive-discover|delivery`：文件头添加 LEGACY (C026) 注释，指明日常语义 Cycle 不调用、仅旧宿主/迁移兼容。
- `.pipeline/config.yaml`：文件头添加退役标记注释（不移动文件，旧 CLI 仍可读）。

## Checkpoint: M4 Hooks 单一教义收敛（2026-08-14）

- `rules/builtin/session-start-context-load.yaml`：error → warn，描述与 check 改为提醒语义，保留 "knowledge compact and category indexes" 短语；新增 "Hook 缺失或失败不得阻塞" 条款。
- `rules/builtin/stop-hook-self-check.yaml`：error → warn，block → remind，补 fail-open 条款。
- `rules/presets/{minimal,recommended,strict}.yaml`：两条 hook 规则 error → warn；minimal 描述同步为 "hook reminders"。
- `references/rules-spec.md`：preset 描述与规则表 error → warn。
- `hooks/README.md`：新增三方对齐声明（core 保留 PostToolUse/PostCompact/SubagentStart/SubagentStop 处理路径但只作兼容实现，不注册不触发；注册面/实现面/文档面以此为准）与未绑定 Session 不阻塞条款。
- 原 `experiment-protocol-hooks-simplification`（pending_acceptance）经 C026 S1 用户接受方向一并确认，legacy 索引更新为 accepted (C026 S1)。
- C6：工作区未提交的 `core/src/codex-hooks/index.js` 修复（`selection_required` 候选为空时不渲染选择上下文）与教义一致，maintained 测试覆盖通过，本轮保留。
- 8 条 hook inbox 逐条审阅（见 M5）。

## Checkpoint: M5 审计闭环与权威链收敛（2026-08-14）

- 10 条 staged inbox 全部审阅：结论 applied ×3、covered ×5、superseded ×1、dismissed ×1；审阅记录 `.pipeline/memory/inbox/REVIEWED-2026-08-14-C026.md`，原文件移入 `reviewed/` 保留不删。
- `.pipeline/legacy/INDEX.md`：7 个 runtime delivery 全部归档标记；新增退役配置/prompt 与旧阶段制 Plan 实现路径说明。
- `.pipeline/prompts/README-LEGACY.md`：C21 机器时代 prompt 标记 legacy、只读。
- `AGENTS.md`：Runtime contract 与 Hook-optional 两节权威链统一——日常权威是 `.pipeline/INDEX.md` 与当前 Cycle 四个文件；manifest/runtime/Records/旧 Cycle 是 legacy 兼容面。
- 索引同步：`.pipeline/cycles/INDEX.md`（C026 active）、`.pipeline/INDEX.md`（1 active + 24 closed）。

## Checkpoint: 验证（2026-08-14）

- Maintained Core 709/709 通过（`npm test`）。
- Maintained Scenario 8/8 通过（s70–s77）。
- `git diff --check` 干净；rules-summary 渲染 hook 规则全 warn、仅 2 条项目治理规则 error。
- 3 个 excluded 历史 lane 测试（knowledge-hooks/rules-capture-habits/analysis-interaction）失败为模块导出退役所致，catalog 已标注 excluded，非本轮回归。

## Checkpoint: M6 过度防御性设计审计（2026-08-14，S2 反馈新增）

- 矩阵新增 E 组 9 项，判定依据：用户明确要求的语义不算过度防御，纯仪式/重复表述/为不存在机制做的验证/已退役仍挡在每日指令里的 gate 算残留防御。
- 本轮直接清除：E1（AGENTS.md + 生成源删除"Validate the Receipt binding internally"——语义世界无 Receipt）、E2（删除重复的提问纪律三连句）。
- 判定保留：E5 四道门链（用户明确要求）、E6 删除双层保护（安全边界）、E7 记录面（用户 C022 要求）、E8 legacy 机器（只读）、E9 反幻觉条款（正确性保障）。
- 留待单独确认：E3 Claude 旧 Stop hook（阻断式 stop-check.sh，388 行）与 InstructionsLoaded 冲突检测未对齐新教义，涉及 Claude 宿主面；E4 规则引擎 off 项瘦身为后续候选。

## Checkpoint: M7 澄清先行讨论模式落地（2026-08-14，用户补充要求）

- `skills/plan/SKILL.md` Discussion 节新增"澄清先行"：先搜索仓库与历史 → 展示三项分析（未明说的假设、缺失关键信息及其影响、这类问题最常犯的错误）→ 提最关键的一个或少数几个问题（目标是理解真实目标，不是通用建议）→ 等用户回答后再继续；未过讨论完成门不得写 Proposal。
- `skills/goal/SKILL.md` 第 1 步同步同一纪律。
- `AGENTS.md` 与生成源 `core/src/artifacts/agent-guidance.js` 的协商优先节同步"clarification-first"表述。
- Maintain 持久化：新增 `requirement-dee5b35939cfe5774c148570aafd6cdb`（clarification-first-discussion）并登记 `memory/INDEX.md`（Records: 75）。

