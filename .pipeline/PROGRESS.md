# Hypo-Workflow C9 配置治理、PR 管理、Explain 命令与 Claude Resume 修复 - 开发进度

> 最后更新：2026-05-07 16:55 +08:00 | 状态：已完成 | 进度：12/12 Milestone

> 发布：2026-05-07 20:07 +08:00 | 版本：v12.1.0 | 状态：本地分发完成，远端发布进行中

## 当前状态

C9 已完成 6 个 Feature、12 个 Milestone。最终 Agent Review、Subagent 审计、全量 Node 测试、Python 场景回归、配置校验、同步检查、Claude plugin validate 和 diff whitespace 检查均通过。

## Feature Queue

| Feature | 标题 | 状态 | 依赖 |
|---|---|---|---|
| F001 | 配置治理与默认配置组合 | Done | 无 |
| F002 | PR/MR 管理与本地归档 | Done | F001 |
| F003 | Evidence-first Explain 命令 | Done | F001 |
| F004 | Claude Resume 命名冲突修复 | Done | F001 |
| F005 | 中文主体文档治理 | Done | F001-F004 |
| F006 | C9 总体验收 | Done | F001-F005 |

## Milestone 计划

| # | Feature | Milestone | 状态 | Prompt |
|---|---|---|---|---|
| M01 | F001 | 配置字段盘点与严格度矩阵 | Done | `00-configuration-field-audit-and-strictness-matrix.md` |
| M02 | F001 | 默认配置组合 | Done | `01-default-configuration-profiles.md` |
| M03 | F002 | Change Request 合同与本地归档 | Done | `02-change-request-contract-and-local-archive.md` |
| M04 | F002 | 只读 inspect/review 流程 | Done | `03-pr-mr-inspect-review-readonly-flow.md` |
| M05 | F002 | fix/merge/close 手动门 | Done | `04-pr-mr-fix-merge-close-manual-gates.md` |
| M06 | F003 | Evidence-first Explain 合同 | Done | `05-evidence-first-explain-contract.md` |
| M07 | F003 | `--subagent` 取证流程 | Done | `06-explain-subagent-evidence-handoff.md` |
| M08 | F003 | Explain 测试与文档 | Done | `07-explain-tests-and-docs.md` |
| M09 | F004 | Claude `/resume` 冲突审计 | Done | `08-claude-resume-conflict-audit.md` |
| M10 | F004 | Claude 适配修复与烟测 | Done | `09-claude-resume-adapter-fix-and-smoke.md` |
| M11 | F005 | 人读文档中文主体化 | Done | `10-chinese-human-docs-conversion.md` |
| M12 | F006 | C9 Agent Review 与全量回归 | Done | `11-c9-agent-review-and-full-regression.md` |

## 规划决策

- 配置文档提供 `solo-auto`、`manual-review`、`team-strict`、`analysis-hybrid` 四组默认组合。
- `/hw:pr` 第一版处理已有 GitHub PR / GitLab MR；后续预留 `/hw:pr create`。
- PR/MR 远端写操作都必须人工确认，包括 push、merge、close、修改 reviewer/label/target branch。
- `.pipeline/pr/` 作为本地 PR/MR 处理归档区，记录状态、审查、修改、测试、确认和最终结果。
- `/hw:explain` 默认只读并读取证据；`--subagent` 可让独立 Subagent 先整理 evidence packet。
- Claude Code 原生 `/resume` 必须与 Hypo `/hw:resume` 分离，禁止自动补全或别名误路由。
- 给人看的 README 引用链、`docs/**` 和主要 `references/**` 要中文主体。

## 预期验证

- `npm test --prefix core`
- `python3 tests/run_regression.py`
- `bash scripts/validate-config.sh .pipeline/config.yaml`
- `node cli/bin/hypo-workflow sync --check-only --project .`
- `claude plugin validate .`
- `git diff --check`
- 文档 Agent 自检
- Subagent 审计 C9 计划、prompt、风险边界和验证闭环

## Subagent 审计

- 审计路径：`.pipeline/reviews/C9-plan-generation/subagent-audit/summary.md`
- 初始 verdict：`needs_changes`
- 已修复：`cycle.yaml` high-risk/destructive/plugin/PR remote gates 改为 confirm；`.pipeline/config.yaml` 和 state 名称同步为显式 C9；`.plan-state/discover.yaml` 和 `.plan-state/decompose.yaml` 改为 C9 兼容视图；PR/MR inspect/review 文案统一为 remote-readonly + local archive。
- 最终审计路径：`.pipeline/reviews/C9-final-validation/subagent-audit/summary.md`
- 最终结论：Subagent 审计发现的阻塞项已修复；M12 可交付。

## 最终验证

- `node --test core/test/explain-contract.test.js core/test/explain-subagent.test.js core/test/pr-contract.test.js core/test/pr-readonly-flow.test.js core/test/pr-manual-gates.test.js`：25/25 通过。
- `npm test --prefix core`：349/349 通过。
- `python3 tests/run_regression.py`：63/63 通过。
- `bash scripts/validate-config.sh .pipeline/config.yaml`：通过。
- `node cli/bin/hypo-workflow sync --check-only --project .`：derived=fresh。
- `claude plugin validate .`：Validation passed。
- `git diff --check`：通过。

## 最近动作

- 2026-05-07 15:30 +08:00：创建执行 lease `.pipeline/.lock`，进入 M01 `write_tests`。
- 2026-05-07 15:37 +08:00：M01 完成；新增 `docs/reference/configuration.md`，docs/config focused tests 和全 core 测试通过；自动推进到 M02。
- 2026-05-07 15:44 +08:00：M02 完成；新增四组默认配置组合和配置参考 YAML 片段，core 319/319 通过；自动推进到 M03。
- 2026-05-07 15:55 +08:00：M03 完成；新增 `/hw:pr`、Change Request 归档合同和 PR/MR secret-safe 本地证据写入，core 323/323 通过；自动推进到 M04。
- 2026-05-07 15:59 +08:00：M04 完成；新增 remote-readonly inspect/review helper 和 fixture provider 合同，core 326/326 通过；自动推进到 M05。
- 2026-05-07 16:04 +08:00：M05 完成；新增 fix/merge/close 手动确认提案和 blocker 检查，core 330/330 通过；F002 完成并自动推进到 M06。
- 2026-05-07 16:12 +08:00：M06 完成；新增 `/hw:explain`、Explain evidence packet 和只读 unknown 合同，core 334/334 通过；自动推进到 M07。
- 2026-05-07 16:20 +08:00：M07 完成；新增 `/hw:explain --subagent` 独立只读取证 handoff、schema 校验和 fallback 说明，core 338/338 通过；自动推进到 M08。
- 2026-05-07 16:25 +08:00：M08 完成；补齐 Explain fixture、中文用户文档和 OpenCode `/hw-explain` adapter guidance，core 340/340 通过；F003 完成并自动推进到 M09。
- 2026-05-07 16:30 +08:00：M09 完成；确认裸 `/resume` 未被 registry/plugin manifest 注册，定位 `skills/resume/SKILL.md` 的 bare skill name 为主要风险，core 343/343 通过；自动推进到 M10。
- 2026-05-07 16:34 +08:00：M10 完成；移除 resume skill bare name metadata，补充 Claude `/resume` vs `/hw:resume` 文档边界，core 344/344 通过；F004 完成并自动推进到 M11。
- 2026-05-07 16:40 +08:00：M11 完成；新增中文主体文档自检，中文化 README 引用链、docs 生成源和关键 references 入口，core 345/345 通过；自动推进到 M12。
- 2026-05-07 16:55 +08:00：M12 完成；修复 Subagent 审计发现的 Explain/PR 脱敏和 PR archive id 问题，完成 38 命令派生面回归；core 349/349、Python 63/63、config/sync/Claude plugin/diff check 均通过；C9 完成。
- 2026-05-07 20:07 +08:00：准备发布 v12.1.0；更新版本、CHANGELOG、中文文档和项目级 adapter；同步到 Codex/Claude skills、`~/.hypo-workflow/hypo-workflow`、Claude marketplace/cache 活动副本；发布前 core 349/349、Python 63/63、config/plugin/sync/diff check 均通过。
