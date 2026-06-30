# C19-M4 Source Closure Report

生成时间：2026-06-08T19:32:40+08:00

## 结论

C19-M4 已完成源仓侧闭环。Plan Skills、根 `SKILL.md`、配置/命令参考、用户指南、README 生成源、progressive discover 核心指导和相关测试已同步到命名阶段模型：

`Discover -> Technical Stack -> Architecture -> Decompose -> Generate -> Implementation`

本 Milestone 未写入目标仓库，未触碰 `~/Codex-VSP` 或 `~/VSP-Open-Code`。

## 改动摘要

- 将当前用户面 Plan 语义从 `P1/P2/P3/P4` 收敛为 `Discover / Technical Stack / Architecture / Decompose / Generate`。
- 保留 `P2 technical route` 作为 legacy/internal compatibility alias，并明确它等价于 Decompose technical route contract。
- 同步 `README`、`docs/*/user-guide.md`、`docs/*/reference/configuration.md`、`references/config-spec.md`、`references/commands-spec.md`、`references/progressive-discover-spec.md`、`references/subagent-spec.md`。
- 同步 `skills/plan*`、`skills/init`、`skills/guide`、根 `SKILL.md` 和 `plan/PLAN-SKILL.md`。
- 更新 `core/src/docs/index.js` 和 `core/src/progressive-discover/index.js`，避免文档修复或核心 Discover 输出重新投影旧阶段名。
- 更新相关测试断言，使测试锁定命名阶段模型，而不是旧 `P1 -> P2` 文案。

## 验证结果

- `uv run -- node --test core/test/progressive-discover.test.js core/test/p0-configure-contract.test.js core/test/codex-subagent-discipline.test.js core/test/batch-plan.test.js core/test/commands-rules-artifacts.test.js core/test/docs-governance.test.js core/test/c18-instruction-quality-contract.test.js`：55/55 PASS
- `npm test`：674/674 PASS
- `git diff --check`：PASS
- `/hw:plan:confirm` 扫描：PASS；仅剩兼容说明和负向测试。
- stale Plan phase wording 扫描：PASS with classified residuals；残留仅为 legacy/compatibility alias 或架构说明。

## 残留分类

允许残留：

- `.pipeline/architecture.md` 说明旧 `P1/P2/P3/P4` 语义迁移到命名阶段。
- `P2 technical route` / `P2 checkpoint` 作为 legacy/internal compatibility alias，指向 Decompose technical route contract。
- `skills/plan-confirm/SKILL.md` 作为旧生成产物兼容说明；新命令面不暴露 `/hw:plan:confirm`。

不允许残留：

- 当前用户面文档把普通 Plan 描述为 `P1-P4`。
- 当前命令面暴露 `/hw:plan:confirm`。
- Question Tool / Ask gate 在展示阶段产物前推进。

## M5 Gate 输入

进入 C19-M5 前必须讨论并确认：

- 是否适配 `~/Codex-VSP`、`~/VSP-Open-Code`，以及是否还有其他目标仓库。
- 目标仓库的具体文件清单。
- 目标仓库写入前后的验证命令。
- VSP-OpenCode 是否需要围绕 Question Tool / Ask、计划工具、AGENTS.md 四规则和 Plan gate visibility 做额外微调。

在该 Gate 确认前，目标仓库写入保持阻塞。
