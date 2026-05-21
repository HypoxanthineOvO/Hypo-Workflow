# C16 Architecture — Root Workspace Maintenance Mode

## 工作类型

C16 是 feature Cycle，目标是把“根目录项目管理模式”实现为 Global Workspace Maintenance 系统。该系统独立于普通 Cycle/Patch，但会读取并维护多个项目、文档、服务、技能、Notion 页面、Knowledge、Rules 和 Secret refs 的长期状态。

## 核心组件

1. Global Workspace Authority
   - `~/.hypo-workflow/workspace.yaml` 是全局对象、关系、sync target refs、policy refs 和 secret refs 的 authority。
   - `~/.hypo-workflow/projects.yaml` 只作为 Global TUI/project switcher derived view。

2. Artifact Catalog
   - 只读扫描项目、legacy 项目、pre-Workflow 项目、skill/service、publication 和 infrastructure artifacts。
   - 输出 authority、freshness、parseability、sensitivity、projection 和 evidence refs。

3. Storage Sync Template
   - 后端中立的 projection contract。
   - Notion 是第一版 adapter，先支持 Project Home merge dry-run，最后阶段才 gated apply。

4. Maintenance Substrate
   - `/hw:maintain status|scan|plan|queue|run|apply|verify|log`
   - `~/.hypo-workflow/maintenance/queue.yaml`
   - `~/.hypo-workflow/maintenance/ledger.yaml`
   - `cache/`、`evidence/`、`backups/`

5. Maintenance Run Engine
   - 支持 orchestration run、partitioned run、system-initiated run、scheduled consolidation run、historical backfill run。
   - 支持 pause/resume、per-item/batch/risk-tiered review、local backup、notification 和 template candidate learning。

6. Global Consolidation
   - 每日 04:00 读取 Codex/OpenCode/Claude sessions 和 Notion。
   - 首次从 2026-03-01 起分片回填。
   - 输出中文沉淀结果，并可进入 Notion projection dry-run。

7. Global Projections
   - Global Knowledge、infrastructure facts、effective rules matrix、secret refs/capability projections。
   - 不复制 raw project records，不输出 raw secrets。

## 外部副作用边界

- C16-M1 到 C16-M8 不允许真实 Notion 写入。
- C16-M9 只能消费已审核 dry-run bundle，并要求显式用户确认、target page ids、hash 匹配和 re-read verification。
- 本地文档自动更新必须先写集中备份；git repo 目标还要提供 diff/patch evidence。
- 发布渠道和 destructive remote writes 必须额外显式确认。
- Raw secrets 只属于本地 Secret Store，不进入 workspace、Knowledge、Notion、报告、日志或 diff。

## Milestone 顺序

1. Workspace Authority Schema And Object Registry
2. Artifact Catalog Scanner
3. Storage Sync Template And Notion Merge Dry-Run
4. Maintenance Command Surface Queue Ledger And Evidence Store
5. Maintenance Run Engine And Template Learning
6. Scheduled Global Consolidation And Chat Backfill
7. Global Knowledge Rules And Secret Reference Projections
8. End To End Dry-Run Review Pack
9. Final Gated Notion Apply And Verification

## 验收规则

- 每个实现 Milestone 必须保留 P2 技术路线字段。
- 每个 prompt 必须包含 Subworker Assignment Plan。
- 测试必须是真实命令或可执行场景，不能用伪测试替代。
- 审计必须检查 side-effect gates、redaction、worker separation 和状态/证据一致性。
