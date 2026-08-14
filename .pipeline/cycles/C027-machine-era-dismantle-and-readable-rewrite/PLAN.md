---
kind: plan
cycle: C027-machine-era-dismantle-and-readable-rewrite
mode: plan
status: closed
updated: 2026-08-14
progress: PROGRESS.md
execution: EXECUTION.md
---

# 机器时代拆除与人类可读重写

## 执行目的

把 C1–C21 机器时代彻底拆除：删除哈希/校验/恢复/规则引擎等机器与其测试，memory 与 .pipeline 全部改为人类可读命名与结构，AGENTS.md 生成做实，Kimi/zcode/DSH 最小适配落位。最终 Hypo-Workflow = 人读指令 + 少量可执行件 + git 兜底。

## 执行边界

- 不碰 git 历史（正常 commit 除外）；不碰 VSPi 仓库（影响记入其后续候选）。
- 旧历史按新规则重写整理（提取有效人读文本），不搬出仓库。
- 文件清理严格按 S1 逐项勾选清单执行；未勾选的一律不动。
- 受保护文件（`.pipeline/rules.yaml` 等）的删除必须在 S1 清单中单独勾选。
- 本轮不执行远端发布、插件重装、服务重启。

## 验证目标

- `.pipeline` 收敛为 INDEX / cycles / memory / experiments / local 五块，全部人读命名，无哈希目录/文件名残留。
- 测试退化为约 12 个存活测试的小契约集；catalog 不再需要 excluded/quarantined 三重分类。
- `sync --platform opencode` 能从原则源真正重新生成 AGENTS.md。
- hooks.json 只剩 4 个事件，删除保护门移除，反脚手架原则写入指令面。
- memory 三条约束级（约束/指导/参考）可被人读索引一眼区分。
- 删除动作全部可经 C027 审计矩阵与 git tag 追溯。

## 完整计划

ID 在本 Cycle 内保持稳定。开始执行后不重排或复用已经出现的 ID。

| ID | 阶段 | 期望结果 | 验证方式 |
| --- | --- | --- | --- |
| `M1` | 产出审计矩阵与文件清理清单 | 覆盖十项范围、逐目录处置、逐文件勾选清单的 `AUDIT-MATRIX.md` | 与仓库 grep/du/read 证据对账；无证据的行不被接受 |
| `S1` | 审阅矩阵与勾选清理清单 | 用户逐项确认（尤其文件清单、受保护文件删除、dist/docs 去留） | 明确接受或带反馈拒绝 |
| `M2` | 哈希根除与 Memory 可读化 | 75 条记录改名可读、目录分层（global/rules·requirements·knowledge + cycle）、index.yaml 退役、三约束级标注、收尾整理流程写入 cycle skill | 改名后无哈希残留；引用点无悬空；maintained 测试不回归 |
| `M3` | 测试瘦身与 catalog 简化 | 删除机器测试与全部 excluded 历史测试；catalog 退化为 maintained 小清单 | `npm test` 绿；catalog 对账机制移除；存活清单与矩阵一致 |
| `M4` | .pipeline 重写与文件清理 | archives 核对删除；runtime 文本提取归位；散落目录审计处置；顶层文件按 S1 勾选清理 | 目录收敛为五块；git tag 可回滚；无孤儿引用 |
| `M5` | 规则引擎退役、删除保护移除、反脚手架原则、AGENTS.md 生成做实 | rules/builtin/presets/rules-summary/HABITS 删除；hooks 6→4；反脚手架写入指令面；sync 真正生成 AGENTS.md | 重新生成结果与手工版语义一致；hook 事件数对账 |
| `M6` | 实验旧机器删除与适配器落位 | 旧实验机器删除；Kimi 最小适配生成；zcode 能力画像；DSH 面=AGENTS.md | Kimi skill 目录可被宿主识别；画像文档存在 |
| `S2` | 审阅清理结果 | 用户检查真实产物与验证结果，决定接受或拒绝 | 最终接受或带反馈拒绝 |

## 未决问题

- S1 之前：无。S1 若新增勾选外目标，回到 Discussion 确认。
