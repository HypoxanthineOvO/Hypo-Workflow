---
kind: plan
cycle: C026-workflow-intent-drift-audit-and-residue-cleanup
mode: plan
status: closed
updated: 2026-08-14
progress: PROGRESS.md
execution: EXECUTION.md
---

# 意图漂移审计与残留清理

## 执行目的

找出并清理 2026-08 语义简化（C022）之后仍然存活、且与初衷相矛盾的残留表面：讨论先行的范围门没有被模型实际读取的指令执行、Plan 部分被编成 Milestone、Hooks 存在两套互相矛盾的教义、已确认需求停在 staged inbox 不落地、旧机器时代机制未退役。清理后，模型每日实际读取的指令面必须与新语义教义一致。

## 执行边界

- 只修改源端 Hypo-Workflow 的 Skills、语义模板、Hooks 契约、规则严重度/预设、适配器生成面（含 `AGENTS.md`）、文档与本地索引。
- 不执行 commit、tag、push、远端发布、插件重装、marketplace/config 修改、app-server 重启或 kill。
- 旧 archives、legacy 目录与旧 Cycle 历史保持只读；runtime delivery 对象只归档不删除。
- S1 通过前不执行 M2–M5 的任何清理动作。

## 验证目标

- `skills/plan/SKILL.md` 与 `AGENTS.md` 等模型每日读取面包含已确认的讨论范围门语义，不再出现"不设单独确认门、只问最终 Proposal"的相反表述。
- Plan 部分（Discussion + Proposal）被明示为不在 Milestone/Stone ID 空间内；模板与 Skill 无歧义。
- Hooks 只存在一套教义：辅助、fail-open、注册事件与 core 实际处理一致；不再有 error 级 hook gate 注入每日指令。
- 全部 10 条 staged inbox 条目都有明确归宿（应用/已满足/噪音/被取代）。
- 半终态 runtime delivery 对象归档，`active.yaml` 与实际状态一致，权威链表述统一。

## 完整计划

ID 在本 Cycle 内保持稳定。开始执行后不重排或复用已经出现的 ID。

| ID | 阶段 | 期望结果 | 验证方式 |
| --- | --- | --- | --- |
| `M1` | 产出完整审计矩阵 | 覆盖全部残留面、证据路径、冲突说明、建议动作与优先级的 `AUDIT-MATRIX.md` | 与仓库 grep/read 证据逐项对账；矩阵无证据的空行不被接受 |
| `S1` | 审阅审计矩阵与清理范围 | 用户确认矩阵覆盖完整、优先级合理，授权 M2–M5 清理 | 明确接受或带反馈拒绝 |
| `M2` | 讨论范围门落地 | `skills/plan/SKILL.md` 与适配器生成面编码已确认的范围门语义；`maintain-plan-discussion-scope-gate` inbox 关闭 | grep 对账 AGENTS.md 无相反表述；focused 指令合同测试通过 |
| `M3` | Plan/Execute 二分与旧阶段机制退役 | Skill/模板明示 Plan 部分不占 ID 空间；旧阶段机制（planning/batch-plan/deep-plan/progressive-discover、`.pipeline/config.yaml`）退役或标记 legacy | 文档一致性检查；maintained 测试不回归 |
| `M4` | Hooks 单一教义收敛 | hook 类规则不再以 error 级 gate 注入；hooks.json 与 core 事件一致；pending_acceptance 的 hooks Goal 闭环；8 条 hook inbox 归类处理 | 规则生成面检查；Codex Hook focused 测试；用户可见规则清单核对 |
| `M5` | 审计闭环与权威链收敛 | 全部 staged inbox 条目有归宿；半终态 runtime 对象归档；`active.yaml`、索引与 AGENTS.md 权威表述一致 | 索引对账；staged 计数归零；索引/文档一致性检查 |
| `M6` | 过度防御性设计审计（S2 反馈新增） | 矩阵新增 E 组：识别因模型不信任产生的仪式性防御，判定保留/裁剪/对齐 | 逐项证据 + 判定；本轮直接清除的冗余已改 AGENTS.md 与生成源 |
| `M7` | 澄清先行讨论模式落地（用户补充要求） | Plan/Goal 的 Discussion 增加：先搜仓库与历史 → 展示假设/缺口/常见错误 → 提最关键问题 → 等回答；AGENTS.md 与生成源同步；Maintain 记录持久化 | grep 对账四处执行面一致；maintained 测试通过 |
| `S2` | 审阅清理结果 | 用户检查真实清理产物与验证结果，决定接受或拒绝 | 最终接受或带反馈拒绝 |

## 未决问题

- S1 通过后，M2–M5 若出现需要扩大边界的发现（例如涉及远端或发布面），回到 Discussion 另行确认，不静默扩大 scope。
