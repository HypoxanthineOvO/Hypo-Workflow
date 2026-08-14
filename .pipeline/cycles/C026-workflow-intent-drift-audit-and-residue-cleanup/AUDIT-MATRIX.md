---
kind: audit-matrix
cycle: C026-workflow-intent-drift-audit-and-residue-cleanup
milestone: M1
updated: 2026-08-14T15:53:00+08:00
status: accepted-s1
---

# 残留面完整审计矩阵

审计对象：C022 语义简化之后，模型每日实际读取的指令/契约表面（Skills、适配器 `AGENTS.md`、Hooks 契约、规则引擎、索引与权威链）。每一行都有可复核的仓库证据。

## A. 讨论先行（症状①：模型跳过讨论直接开干）

| ID | 残留面 | 证据 | 与初衷的冲突 | 建议动作 | 优先级 |
| --- | --- | --- | --- | --- | --- |
| `A1` | `skills/plan/SKILL.md` 的 `## Discussion` 段仍是旧语义："信息已经充分时直接说明，不为了轮数继续提问"，没有"定范围 → 逐项讨论 → 复盘 → 显式检查点"的门 | `skills/plan/SKILL.md` L16-22 | 与 active requirement `plan-discussion-scope-gate`（`requirement-f5aec7e…`）要求的讨论完成检查点相反 | 改写为范围门语义，保留"不过度提问、信息充分时高效"的边界 | P0 |
| `A2` | `AGENTS.md` 仍写 "do not create separate confirmation gates"、"Ask only for … the final Proposal choice" | `AGENTS.md` L14、L36 | 与 A1 同一需求字面相反，且这是模型每日必读面，直接授权跳过讨论 | 重新生成适配器（生成源 `core/src/rules/index.js` L374/417），使协商优先章节与新门一致 | P0 |
| `A3` | 已确认需求停在 staged inbox 未应用 | `.pipeline/memory/inbox/maintain-plan-discussion-scope-gate-20260809.yaml`（`status: staged`，2026-08-09 用户确认） | 需求"记录"了但"落地"这一步从未发生——审计链条断裂的典型残留 | A1/A2 落地后将该条目标记为已应用并关闭 | P0 |
| `A4` | 缺少"确认即落地"的传播纪律 | 对照：memory active 有该需求、而两个执行面均无 | 用户确认的持久需求可能永远停在记忆层 | 在 Maintain/审计流程中固定 `staged → applied/closed` 闭环，杜绝"只记录不传播" | P1 |

## B. Plan/Execute 二分（症状②：Plan 被编成 Milestone）

| ID | 残留面 | 证据 | 与初衷的冲突 | 建议动作 | 优先级 |
| --- | --- | --- | --- | --- | --- |
| `B1` | `skills/plan/SKILL.md` 与 `templates/semantic/plan.md` 从未声明 Discussion + Proposal 是"Plan 部分"、不占用 M/S ID 空间；模板首行固定为 `M1` | `skills/plan/SKILL.md` L24-33；`templates/semantic/plan.md` L24-32 | Plan 与 Execute 两个部分被模型折叠进同一条 ID 序列，Plan 部分自然变成 M1 | Skill 明示"Plan 部分（Discussion/Proposal）不进入 ID 空间，Milestone/Stone 只编码执行部分"；模板加说明行 | P0 |
| `B2` | 历史实践惯性：规划阶段本身被写成 M1 的案例遍布旧 Cycle | C022 `PLAN.md` M1=「定义语义合同、模板和真实样例」；C12 M1=「Discussion Package 数据模型与持久化」；C19 M1=「Plan phase model and command contract」 | C12–C19"阶段制 Plan"的行为模式没有显式退役，模型沿惯性复制 | 在 Skill 中以反例引用，切断惯性；新 Cycle 一律按新二分写 | P1 |
| `B3` | 旧阶段制 Plan 机器仍在 core：`planning`、`batch-plan`、`deep-plan`、`progressive-discover` | `core/src/planning/`、`core/src/batch-plan/`、`core/src/deep-plan/`、`core/src/progressive-discover/` | 两套概念体系并存，模型可选旧路径 | 退役或标记 legacy（保持测试挂接，不进日常提示词） | P1 |
| `B4` | `core/src/delivery` 旧契约：`delivery_mode: "plan"` 强制 milestone 含 stone；Goal 禁止 milestones | `core/src/delivery/index.js` L703、L725-729 | 与语义文件流（Goal 无 S、Plan 有 S）两套状态机并存 | 定义唯一契约；旧 API 标 legacy，供迁移/旧宿主使用 | P1 |
| `B5` | `.pipeline/config.yaml` 仍是 C17 机器时代配置（tdd preset、strict worker separation、deep_plan/batch/evaluation），当前流程无人读取 | `.pipeline/config.yaml`（全文） | 误导审计，让人以为旧执行拓扑仍是现役 | 归档到 legacy 或删除，避免与新教义并存 | P2 |

## C. Hooks 单一教义（症状③：Hooks 设计别扭）

| ID | 残留面 | 证据 | 与初衷的冲突 | 建议动作 | 优先级 |
| --- | --- | --- | --- | --- | --- |
| `C1` | 规则引擎仍把 Hooks 当 gate：`session-start-context-load`（`error`）、`stop-hook-self-check`（preset 里 `error`） | `rules/builtin/session-start-context-load.yaml`；`rules/presets/recommended.yaml` | 与 hooks/README.md"轻量辅助、fail-open、非正确性来源"字面矛盾 | 降级 off/warn 或从 recommended preset 移除，确立单一教义 | P0 |
| `C2` | 上述 hook 规则被注入每日指令的 Active Rules 列表 | `AGENTS.md` L92：`session-start-context-load (builtin/error/hook)` | error 级 hook gate 每天提醒模型"hook 是正确性来源" | 随 C1 处理后重新生成适配器 | P0 |
| `C3` | 三方漂移：core 支持 10 类事件、`hooks.json` 只注册 6 类、README 宣称"不再注册逐工具证据" | `core/src/codex-hooks/index.js` L27-40；`hooks/hooks.json`；`hooks/README.md` L18 | 注册面、实现面、文档面互相不一致 | 对齐：6 类事件裁掉其余实现路径（或补注册），并修正 README 表述 | P0 |
| `C4` | "Hooks 非阻塞化"Goal 未闭环 | `.pipeline/runtime/objects/delivery/experiment-protocol-hooks-simplification/runtime.yaml`：`status: pending_acceptance` | 改造做了、验收没做，教义悬在半空 | 与 C 组动作一起验收并关闭，或明确记录未通过项 | P1 |
| `C5` | 8 条 `codex-hook-userpromptsubmit-*.yaml` staged 条目从未审阅；其中既有真实需求（"除非明确说按你的方案来，否则必须详细讨论"、"删掉最小轮次"、"测试要求写成文档要求而非硬编码"），也有泛泛噪音 | `.pipeline/memory/inbox/`（8 条，2026-07-23 至 07-30） | 用户真实意见被 Hook 捕获后沉底，恰是本次抱怨的历史回声 | 逐条归类：已满足的关闭、真实需求应用或并入本 Cycle、噪音丢弃 | P1 |
| `C6` | 工作区悬空的未提交 Hook 改动 | `git status`：`core/src/codex-hooks/index.js`(+4)、`core/test/semantic-workflow-runtime.test.js`(+14) | 状态不明、未审计、可能被误打包 | 本轮决定去留：纳入 C3 或独立提交，并过 diff 审计 | P1 |

## D. 审计链条与权威链（元问题）

| ID | 残留面 | 证据 | 与初衷的冲突 | 建议动作 | 优先级 |
| --- | --- | --- | --- | --- | --- |
| `D1` | stale 条目无人闭环：history-refresh 通用性 bug 条目仍 staged，但所报 C022 常量已被 C023 修复 | `.pipeline/memory/inbox/maintain-history-refresh-genericity-bug-20260809.yaml`；已验证 `core/src/history-refresh/index.js` 无 C022 引用 | 审计产物本身变成残留，掩盖真实状态 | 标记 superseded 并关闭 | P1 |
| `D2` | 7 个 runtime delivery 对象以半终态并存（`delivery_complete`×4、`superseded_by_goal`、`pending_acceptance`、旧 `c21`），`active.yaml` 指向 pending_acceptance 对象 | `.pipeline/runtime/objects/delivery/*/continuation.yaml`；`.pipeline/runtime/active.yaml` | 日常实践已搬到语义 Cycle，旧权威链仍"活着" | 终态对象归档、`active.yaml` 与真实状态一致 | P1 |
| `D3` | 同一份指令内两条权威链：AGENTS.md 称 manifest/runtime/Records 是 current authority；语义教义称日常不需要 API/hash/receipt | `AGENTS.md` L40-46 vs `.pipeline/cycles/C022…/DISCUSSION-SUMMARY.md` L18 | 模型恢复时不知该信哪条链 | 统一表述：语义 Cycle 文件为日常权威，runtime 对象为 legacy 兼容 | P0 |
| `D4` | 旧协议文件仍可见：`.pipeline/prompts/00-07`（C21 机器时代 prompt）、`state.yaml`/`cycle.yaml` 等 | `.pipeline/prompts/`；`.pipeline/state.yaml` 等 | 视觉噪音，容易误当现役 | 归入 legacy 入口并标注只读（`state/cycle/rules.yaml` 保持受保护） | P2 |

## 已排除项（已核对、无需处理）

- `core/src/history-refresh` 的 C022 常量：C023 已修复，grep 无残留。
- `min_rounds`：已从 Plan 语义移除（C21-M6），当前 Skill 无轮次配额表述。
- 九命令公开面：`commands/` 已存在，与确认面一致。
- Skills/commands 已无旧 API 术语（Receipt/hash/写 API）：grep 干净。
- 输出语言/时区规则：与 `output.language=zh-CN`、`Asia/Shanghai` 一致。

## 建议执行顺序与分组

- P0 先行：`M2`=A 组（A1/A2/A3）→ `M4`=C 组（C1/C2/C3）→ `M3`=B 组（B1/B4）+ `M5`=D 组（D3）。
- P1/P2 随对应 Milestone 收尾：A4、B2/B3/B5、C4/C5/C6、D1/D2/D4。

## S1 接受标准

用户确认：矩阵覆盖完整无遗漏、优先级合理、M2–M5 的清理范围与边界可开工（2026-08-14 已接受）。

## E. 过度防御性设计审计（M6，应 S2 反馈新增）

审计问题：哪些设计是"因为不信任模型（GPT 劣根性：跳步、自作主张、编造证据、忘记上下文、无意义提问）"而加的过度防御，其成本已超过收益。判定标准：直接来自用户明确决定的语义（讨论门、完整 Progress 镜像）不算过度防御；纯仪式、重复表述、为不存在的机制做的验证、以及已退役却仍挡在每日指令里的 gate 算残留防御。

| ID | 候选面 | 证据 | 判定 | 动作 |
| --- | --- | --- | --- | --- |
| `E1` | AGENTS.md 要求"Validate the Receipt binding internally and report it" | 旧 AGENTS.md L20（本轮已删） | 语义世界里没有 Receipt 可验证，是 C21 机器时代的验证仪式 | 已删除（AGENTS.md + 生成源） |
| `E2` | Ask Questions 一节重复三连句（"不发明问题/不重复推荐答案/不用轮次配额"出现两次） | AGENTS.md 旧 L36-38；生成源同款重复 | 同一防御意图写两遍，属于仪式冗余 | 已删除重复句（AGENTS.md + 生成源） |
| `E3` | Claude Stop hook 仍注册 388 行阻断式 `stop-check.sh`；InstructionsLoaded 冲突检测 hook | `hooks/claude/hooks.json`；`hooks/stop-check.sh` | C22 教义已改为"remind 不 block"，Claude 适配器未对齐；阻断式 Stop 是典型的防模型偷懒 gate | 候选：对齐为提醒式或标 legacy（本轮不动，涉及 Claude 宿主面，单独确认） |
| `E4` | 规则引擎 16 条 builtin + 3 预设 + rules-summary + HABITS.md | `rules/builtin/`、`rules/presets/`、`scripts/rules-summary.sh` | 风格/时区/报告语言等机械检查作为"规则"是防遗忘的低价值仪式，但均为 warn 级提醒，成本可控 | 保留为"做笔记提醒"；候选后续瘦身（off 的规则可直接从推荐预设移除） |
| `E5` | 四道门链：讨论完成门 → Proposal 选择 → 开始授权 → Stone/最终接受 | `skills/plan/SKILL.md`、AGENTS.md 协商优先节 | 用户 2026-08-09 与 07-30 明确要求的语义（"除非明确说按你的方案来，否则必须详细讨论"），不是模型不信任的产物 | 保留，维持现状 |
| `E6` | 删除双层保护：PreToolUse/PermissionRequest 钩子 deny + 宿主权限确认 | `hooks/hooks.json`；`core/src/codex-hooks/index.js` L311-329 | 只拦截明显直接删除，属安全边界（教义允许），非防御仪式 | 保留 |
| `E7` | 记录签发多层：PROGRESS 全镜像 / EXECUTION checkpoint / DISCUSSION-SUMMARY / 本地 ledger / memory index.yaml 派生视图 | `templates/semantic/*`、`skills/cycle` | PROGRESS 全镜像与可见原文保存是用户 C022 明确要求；`index.yaml`/`INDEX.md` 双视图是派生层，无需日常手工维护 | 保留记录面；双视图只由工具重建，不进日常提示词 |
| `E8` | promotion 哈希匹配、Receipt、Recovery Pack、snapshot、hash 事件 | `core/src/maintain`、`core/src/receipts`、`core/src/recovery` | 防篡改/防丢失机器，已随 C022/C026 归 legacy，不进日常 | 保持 legacy 只读 |
| `E9` | 反幻觉条款（"推断必须明确标记"、"运行结束不等于科学成功"） | `skills/init/SKILL.md` L22、`skills/experiment/SKILL.md` L27 | 针对模型编造行为，但属于正确性保障而非仪式 | 保留 |

**结论**：语义层（Skills/模板/AGENTS.md）整体已经足够瘦；过度防御集中在三处——已删的 Receipt 验证仪式与重复句（本轮直接清除）、待对齐的 Claude 旧 hook（E3，需单独确认）、以及可作为后续瘦身候选的规则引擎 off 项（E4）。四道门链与完整 Progress 镜像虽"看起来防御"，但全部是你本人明确要的语义，不是劣根性防御，保留。
