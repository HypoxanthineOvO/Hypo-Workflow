# Deep Research Backlog

Deep Plan: C16 根目录项目管理模式

本清单记录进入普通 `/hw:plan` 前还需要完成的 Deep Research 项。所有任务默认 dry-run / read-only；除非用户另行授权，不写 Notion，不修改其他项目。

| ID | 状态 | 主题 | 产物 | 说明 |
|---|---|---|---|---|
| DR001 | completed | 三方项目对账 | `global-project-reconciliation.md` | 对齐 `~/.hypo-workflow/projects.yaml`、`/home/heyx` 顶层项目、Notion `Hypo Projects` 子页，生成 canonical mapping draft。 |
| DR002 | completed | 项目分类规则 | `project-classification-taxonomy.md` | 定义 `workflow-managed`、`legacy/partial-workflow`、`git-only`、`notion-only`、`archived/test`、`ignore` 等分类。 |
| DR003 | completed | Global Workspace source of truth | `global-workspace-source-of-truth.md` | 决定 `~/.hypo-workflow/workspace.yaml` 作为用户级 authority，`projects.yaml` 作为兼容派生视图，maintenance 目录存队列/ledger/cache。 |
| DR004 | completed | Global Secret Store | `global-secret-store-schema.md` | 设计可用型 `~/.hypo-workflow/secrets.yaml`：第一版不加密但要求 `0600`；任务匹配 capability 时 Agent 可自动读 raw secret；health check 默认真实 provider 调用；Hypo-Claw 允许通知/读状态/拉任务/同步报告；workspace/Notion/Knowledge 只投影引用和能力摘要。 |
| DR005 | completed | 代表性 Notion 页面深读 | `representative-notion-page-deep-read.md` | 完成 `Hypo-Info`、`Hypo-Agent`、`Hypo-GPU — 教学级 GPU Simulator`、`Hypo-Image` 只读深读；验证 successor/legacy、pre-Workflow、Notion-only/skill-backed 模板。 |
| DR006 | completed | Artifact Catalog 实际盘点 | `sample-artifact-inventory.md` | 完成 `Hypo-Info-V2` + `Hypo-Info`、`Hypo-Claw` + `Hypo-Agent`、`Hypo-GPU`、`Hypo-Writer`、`~/.codex/skills/hypo-image` 本地只读盘点。 |
| DR007 | completed | Global Knowledge 聚合策略 | `global-knowledge-aggregation.md` | 决定全局 Knowledge 采用 global authored records + per-project compact/index derived aggregation，不复制 raw records。 |
| DR008 | completed | Project Link Graph 关系类型 | `project-link-graph-taxonomy.md` | 定义 typed edges，确认 `Hypo-Info -> Hypo-Info-V2` 和 `Hypo-Agent -> Hypo-Claw` 为 `replaced_by`。 |
| DR009 | completed | 同步冲突策略 | `sync-authority-conflict-matrix.md` | 定义字段级 authority、direction、conflict states 和 dry-run-first flow。 |
| DR010 | completed | Maintenance Queue 语义 | `maintenance-queue-lifecycle.md` | 定义 user-level queue/ledger/evidence store、side-effect levels 和 scan/diff/dry-run/apply/verify/record lifecycle。 |
| DR011 | completed | 全局规则研究 | `global-rules-projection.md` | 确认 structured rules 是 authority，Notion 只做全局/项目/周期规则投影和冲突展示。 |
| DR012 | completed | 第一版验收标准 | `conversion-readiness-checklist.md` | 定义 Deep Research 结束、进入普通 `/hw:plan` 的最低产物、建议 Milestones 和验收条件。 |

## 当前执行状态

DR001-DR012 已完成，Deep Research 产物足以进入普通 `/hw:plan` 前的确认阶段。

下一步只剩一个边界问题：第一版实现是否严格停在 local schema + scanner + dry-run + queue/ledger，还是在 dry-run 之后加入一个显式确认门控的 Notion apply path。
