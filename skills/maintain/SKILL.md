---
name: maintain
description: Manage Hypo-Workflow maintenance operations when the user invokes /hw:maintain or needs queue, ledger, evidence, backup, scan, dry-run, apply, verify, or log handling under ~/.hypo-workflow/maintenance/.
---

# /hw:maintain

## Output Language Rules

读取 config.yaml -> output.language：

- zh-CN / zh：所有用户可见输出使用中文。
- en：使用英文。
- auto：跟随用户对话语言。

内部结构键、queue/ledger YAML 字段、event type、command name、file path 保持英文。

## Preconditions

- `/hw:maintain` 是维护命令入口，不是 `/hw:sync` 的别名。
- `/hw:maintain` 不是 pipeline runner；它管理维护 run、queue、ledger、evidence、backup 和确认门禁。
- 维护权威目录是 `~/.hypo-workflow/maintenance/`：
  - `queue.yaml`
  - `ledger.yaml`
  - `cache/`
  - `evidence/`
  - `backups/`
- Queue item 必须表示 `maintenance_operation`，不得伪装成 Feature、Cycle 或 Patch。
- Maintenance run 必须表示 `kind: maintenance_run`，不得伪装成 Feature、Cycle 或 Patch。
- 远程写入、破坏性远程写入、外部动作、authority 写入、文档写入必须先通过 side-effect gate。

## Command Forms

- `/hw:maintain`：显示维护队列摘要和可用子命令。
- `/hw:maintain status`：读取 queue 和 ledger，显示维护状态。
- `/hw:maintain scan`：创建或更新 scan evidence；默认只做 local/remote read。
- `/hw:maintain plan`：把候选维护操作转为 queue item 或执行计划。
- `/hw:maintain queue`：查看、添加、延期、跳过或阻塞维护 queue item。
- `/hw:maintain run`：编排或恢复 maintenance run，按 run 的 `planned_items` 或 discovery 结果生成 queue items；高风险 apply 必须先确认。
- `/hw:maintain apply`：执行已确认的写入类维护操作。
- `/hw:maintain verify`：验证 apply 结果并写入 verify evidence。
- `/hw:maintain log`：读取 sanitized append-only maintenance ledger。

## Daily Scheduler Entry

每日 04:00 全局沉淀有真实本地调度入口：

```bash
0 4 * * * /home/heyx/Hypo-Workflow/scripts/maintenance-scheduler.sh /home/heyx/Hypo-Workflow
```

等价 CLI：

```bash
hypo-workflow maintain-scheduler --dry-run --schedule "04:00 Asia/Shanghai"
```

该入口只创建 safe-local dry-run evidence 和 append-only maintenance ledger event：

- 默认读取本地 Codex/OpenCode/Claude session 与 Notion export 来源。
- 输出 `global-consolidation` evidence：run、sources、backfill、outputs、Notion dry-run projection。
- 写入 `~/.hypo-workflow/maintenance/ledger.yaml` 的 `global_consolidation_scheduled` 事件。
- 固定 `remote_writes_enabled=false`、`apply_required=false`，不会执行真实 Notion apply、发布、服务重启或 pipeline milestone。

## Execution Flow

1. 读取项目 `.pipeline/config.yaml` 和全局 `~/.hypo-workflow/config.yaml`，解析输出语言和 side-effect policy。
2. 读取 `~/.hypo-workflow/maintenance/queue.yaml` 和 `~/.hypo-workflow/maintenance/ledger.yaml`；缺失时按空 queue/ledger 处理。
3. 校验 queue item：
   - `kind: maintenance_operation`
   - 必填字段包括 `id`、`object_ref`、`operation`、`target_ref`、`scope`、`status`、`priority`、`side_effect`、`confirmation_required`、`dependencies`、`policy_refs`、`evidence_refs`、`created_at`、`updated_at`
   - 允许状态：`queued`、`planned`、`approved`、`running`、`completed`、`deferred`、`skipped`、`blocked`
4. 按子命令执行维护动作，并写入相应 evidence path：
   - scan: `maintenance/evidence/scan/`
   - dry-run: `maintenance/evidence/dry-runs/`
   - global consolidation scheduler: `maintenance/evidence/global-consolidation/`
   - apply: `maintenance/evidence/apply-results/`
   - verify: `maintenance/evidence/verify-results/`
   - backup: `maintenance/backups/`
5. 每个有意义状态变化都追加 ledger event，event type 使用 `queue_item_*` 或维护操作事件名。
6. 输出用户摘要；zh-CN 时使用中文摘要，命令名、字段名、路径保持英文。

## Maintenance Run Semantics

- Run 状态：`planned`、`discovering_items`、`in_progress`、`waiting_review`、`waiting_confirmation`、`applying`、`verifying`、`completed`、`paused`、`failed`。
- `planMaintenanceRun` 按通用 `planned_items` 生成多个 `maintenance_operation` queue items；不得硬编码为单一 noon-report 模板。
- `discoverMaintenanceRunItems` 支持 local docs folder 和 Notion child-page tree adapter fixtures；分区对象生成 `subitems`，再生成 queue items。
- `review_mode: per_item` 时每个 queue item 使用目标对象作为 `review_group`；`review_mode: batch` 时同一 run 的 queue items 使用 run 级 review group。
- `transitionMaintenanceRun` 支持 `start`、`pause`、`resume`、`review`、`approve`、`verify`、`complete`，并保留 `resumable.cursor`、`resumable.resume_token` 和 `evidence_refs`。
- `applyMaintenanceRun` 必须绑定 side-effect gate；未通过 gate 时 run 保持或回到 `waiting_confirmation`，通过后进入 `applying`。
- Run apply 输入不得暴露 `ledgerFile` override；ledger authority 固定为 `root/maintenance/ledger.yaml`。

## Template Learning

- Template candidate 只从 recurring completed maintenance runs 学习生成。
- 学习产物必须是 `kind: maintenance_template_candidate`，默认 `authority: non_authoritative`、`status: pending_review`、`authoritative: false`。
- 只有用户显式确认 review 后，candidate 才能 approve/promote 为 authoritative。
- 校验、学习和 review 输出必须经过 shared redaction，不记录 raw secret。

## Side-Effect Gates

Side-effect levels:

- `local_read`：默认允许。
- `remote_read`：默认允许，但不得写入远程。
- `local_derived_write`：默认允许，用于 cache/evidence 等派生产物。
- `local_authority_write`：需要明确确认。
- `local_document_write_with_backup`：必须有 backup metadata，包括 `path`、`checksum_sha256`、`created_at`。
- `remote_write`：默认不允许，必须明确确认。
- `destructive_remote_write`：默认不允许，必须明确确认并有 backup evidence。
- `external_action`：默认不允许，必须明确确认。

## Safety Rules

- 不得把 `/hw:maintain` 当作 `/hw:sync`。`/hw:sync` 负责项目 adapter/derived context 同步；`/hw:maintain` 负责长期维护 queue/ledger/evidence。
- 不得把 Maintenance Queue 当作 Cycle、Patch 或 Feature backlog。
- 不得把 queue/ledger 状态写入 `.pipeline/state.yaml`、`.pipeline/cycle.yaml` 或 `.pipeline/log.yaml`。
- Ledger append 必须脱敏，不能记录 raw token、api_key、password、cookie、Authorization header 或 private key。
- 对文档写入、authority 写入、远程写入、破坏性操作和外部动作，必须先报告 gate 结果；未确认时停止。

## Failure Handling

- queue item schema 不合法：标记为 blocked 或返回校验错误，不猜测 Feature/Cycle/Patch 语义。
- 缺少 backup metadata：阻塞 `local_document_write_with_backup` 和 `destructive_remote_write`。
- 检测到 raw secret：写入前脱敏；如果仍无法确认脱敏安全，阻塞成功报告。
- 远程访问失败：记录 sanitized blocked event，不创建重复远程对象。
- 验证失败：保持 item 为 blocked 或 running 后的失败状态，不标记 completed。

## Reference Files

- `references/commands-spec.md` — command parsing and command boundary.
- `references/skill-spec.md` — command-to-skill traceability and Skill inventory.
- `.pipeline/deep-plans/DP001-root-project-management-mode/maintenance-queue-lifecycle.md` — maintenance queue lifecycle design.
- `core/src/maintenance/index.js` — deterministic queue, ledger, gate, evidence, and rendering helpers.
