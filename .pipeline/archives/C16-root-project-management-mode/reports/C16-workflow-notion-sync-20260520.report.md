# C16 Workflow 自身 Notion 同步报告

生成时间：2026-05-20T01:42:00+08:00

## 同步结论

- Workflow 自身内容已进入可同步状态：C16 九个 Milestone 全部完成，当前本地 Cycle 状态为 `pending_acceptance`。
- 本次同步目标是现有 Notion 页面 `Hypo-Workflow` 下的新增子页面，不覆盖主页已有内容。
- 同步范围限于安全摘要、报告索引、维护方案和验证结果；不写入 raw secret、Notion token、QQ openid、Authorization header、原始聊天全文或未脱敏 raw block。
- 本次远程写入由用户在 2026-05-20 对话中明确授权。

## 当前完成情况

- C16-M1：Workspace Authority Schema And Object Registry，完成。
- C16-M2：Artifact Catalog Scanner，完成。
- C16-M3：Storage Sync Template And Notion Merge Dry-Run，完成。
- C16-M4：Maintenance Command Surface Queue Ledger And Evidence Store，完成。
- C16-M5：Maintenance Run Engine And Template Learning，完成。
- C16-M6：Scheduled Global Consolidation And Chat Backfill，完成。
- C16-M7：Global Knowledge Rules And Secret Reference Projections，完成。
- C16-M8：End To End Dry-Run Review Pack，完成。
- C16-M9：Final Gated Notion Apply And Verification，完成。
- 验收反馈修订：新增每日 04:00 沉淀真实入口 `hypo-workflow maintain-scheduler --dry-run` 与 `scripts/maintenance-scheduler.sh`，完成。

## 验证结果

- `cd core && npm test`：587/587 通过。
- scheduler focused / related tests：16/16 通过。
- `scripts/maintenance-scheduler.sh --dry-run`：smoke 通过。
- `git diff --check`：通过。
- `python3 -m pytest tests/test_notion_integration.py tests/test_notion_output_adapter.py tests/test_notion_mixed_mode.py`：本仓库未收集到 pytest 用例，退出码 5，已记录为测试覆盖空洞。

## Notion 同步边界

- 目标主页：`Hypo-Workflow`，page id `528322b7-e9d5-40bd-a2e8-8350602c9feb`。
- 写入方式：在目标主页下创建子页面，标题为 `C16 根目录项目管理模式同步 2026-05-20`。
- 不采用 `existing-page-id` 覆盖模式，因为该模式会删除目标页面既有 children 后再 append。
- 本次同步是 Workflow 自身状态与方案同步，不执行其他项目的 Notion 写入。

## 现在可使用的 Maintain 能力

- `/hw:maintain status`：查看维护队列、ledger 和 evidence 摘要。
- `/hw:maintain scan`：生成维护扫描 evidence，默认只读。
- `/hw:maintain plan`：把候选维护事项整理为 queue item 或执行计划。
- `/hw:maintain queue`：查看、添加、延期、跳过或阻塞维护项。
- `/hw:maintain run`：执行已批准的维护 run，支持分块维护、暂停、恢复和验收。
- `/hw:maintain apply`：执行已确认的写入类维护操作。
- `/hw:maintain verify`：验证 apply 结果并写入 verify evidence。
- `/hw:maintain log`：读取脱敏 append-only 维护 ledger。
- `hypo-workflow maintain-scheduler --dry-run`：每日 04:00 调度入口，生成 safe-local 全局沉淀 evidence 与 ledger 事件。

## 已沉淀的知识

- Workspace Authority：`~/.hypo-workflow/workspace.yaml` 作为用户级权威对象源。
- Project Registry：本地项目、Notion 项目页和派生 `projects.yaml` 的三方对账模型。
- Artifact Catalog：项目 artifact 分类、状态、stale derived summary 和 secret-ref metadata-only 策略。
- Storage Sync Template：后端无关同步模板，Notion 是第一后端。
- Maintenance Queue / Ledger / Evidence：维护事项、执行证据和脱敏审计记录的持久目录。
- Maintenance Run：支持系统自发维护、用户指挥维护、分块对象维护和模板候选沉淀。
- Global Consolidation：每日沉淀、聊天记录回填、Notion dry-run projection 和中文五类候选输出。
- Global Knowledge / Rules / Secret Reference：全局知识、规则矩阵、基础设施事实和 secret capability metadata-only 投影。
- Notion Apply Gate：显式确认、dry-run hash 绑定、target binding、stale/drift/raw payload 拒绝和 re-read verification。

## 本地其他同步方案

- 方案一：Global Workspace Authority 本地同步。把 `~/.hypo-workflow/workspace.yaml` 作为权威源，派生 `projects.yaml`、项目索引和 Project Link Graph；只在本地执行，不触发 Notion 写入。
- 方案二：Project Registry 三方对账。本地 `.pipeline` 项目、git/README/package 候选项目、Notion `Hypo Projects` 页面先做 reconciliation manifest；冲突只进入 review queue。
- 方案三：Artifact Catalog 本地分发。各项目输出 artifact summary、report index、doc index、service/infrastructure metadata；默认写入本地 cache/evidence。
- 方案四：Knowledge Ledger 沉淀。将 accepted consolidation candidate 晋升到 `.pipeline/knowledge/` 或全局 knowledge projection；raw session 和 raw secret 不进入知识库。
- 方案五：Global Rules 与 Secret Reference 投影。规则、习惯、能力边界和 secret 引用只同步 metadata、用途和健康状态；raw value 只留在本地 secret store。
- 方案六：Daily 04:00 Global Consolidation。本地 cron 或 systemd timer 调用 `scripts/maintenance-scheduler.sh --dry-run`；每天生成沉淀候选、evidence 和 ledger，Notion 发布另走 apply gate。
- 方案七：Hypo-Claw 通知通道。维护完成、阻塞、需要验收或需要外部动作时，将脱敏摘要发送到 QQ；不发送 raw secret 或未经压缩的长日志。
- 方案八：Notion Project Home 增量同步。每个项目先生成 dry-run review bundle，用户确认后再按 target binding 执行 Notion 写入；禁止直接覆盖 legacy 内容。
- 方案九：本地分发控制台。通过 `/hw:maintain status|log|verify` 和未来 TUI 查看 queue、ledger、evidence、项目状态、同步候选和最近沉淀。

## 后续建议

- 接受 C16 后，将 `scripts/maintenance-scheduler.sh --dry-run` 安装为本机每日 04:00 cron 或 systemd timer。
- 第一次历史回填建议按周分片，从 2026-03-01 到当前日期生成 resume-safe backfill shards。
- Notion 项目主页整理应按 dry-run review bundle 分批确认，优先处理 `Hypo-Workflow`、`Hypo-Claw`、`Hypo-Info-V2` 和 `Hypo-Writer`。
