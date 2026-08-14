---
kind: audit-matrix
cycle: C027-machine-era-dismantle-and-readable-rewrite
milestone: M1
updated: 2026-08-14T18:00:00+08:00
status: waiting-review
---

# 机器时代拆除审计矩阵

判定标准：机器（可执行代码与其测试）要么为明确目标而存在、要么删除；文件要么人读、要么提取人读文本后删除；git 历史不动。

## A. 测试与 catalog

现状：Core 179（maintained 67 / excluded 112）、Scenario 76（maintained 8 / excluded 68）。

**存活（约 12，机器删除后保留）：**

| 测试 | 守护对象 |
| --- | --- |
| `codex-hook-process` / `codex-hooks-vnext` | hook 求值器（安全拦截 + 提醒） |
| `deletion-gate` | 随 M5 删除保护移除后一并删除（改为人读提醒） |
| `secret-ref-projection` | 敏感信息遮蔽（安全，保留） |
| `semantic-workflow-prompts` / `-runtime` / `-templates` | 语义文件协议 |
| `command-skill-root-routing` / `root-skill-router` | 命令/技能路由 |
| `init-bootstrap` | 初始化脚手架 |
| `utils` / `yaml-parser-unification` | 基础工具 |

**死亡（约 55，随机器删除）：** delivery/receipts/recovery/runtime/records/snapshot/capsule/transaction 全家桶约 20（`receipt-store`、`recovery-*`、`workspace-transaction`、`delivery-*`、`goal/cycle/plan-lifecycle`、`revision-start-boundary`、`new-format-single-writer`、`workspace-concurrency-recovery`、`workspace-format`、`runtime-store`、`record-store`、`snapshot-store`、`context-capsule`、`authority-nonduplication`、`bootstrap-*`、`history-refresh-preview`、`legacy-workspace-inspection`、`maintain-ambient`、`workflow-commit`、`adaptive-plan`、`host-contract-v1`）；deep-plan 7；C21-M7/M8 + C23-M1~M7 历史合同约 17；并发/VSPi 8（`concurrent-work-*`、`vspi-workstream-contract`、`execution-topology`、`c23-m7-worker-routing`、`explain-subagent` 等）。

**批量删除：** excluded 112 core + 68 scenario 历史测试全部删文件、从 catalog 移除（按模块前缀批量，不逐行审）。

**catalog 简化：** `tests/regression-catalog.json` 退化为 maintained 小清单；删除 excluded/quarantined 分类、replacement 校验、精确清单对账断言与 retired_surfaces 机制；`run_core_tests.mjs` 相应删繁。约定：不跑的测试不进仓库、不登记。

## B. 实验

- 保留：`skills/experiment/SKILL.md`（语义文件协议）、`.pipeline/experiments/INDEX.md`。C23 讨论史（decision-861cb235）已核对。
- 删除：`core/src/experiment` 机器（hashed events、materialized 状态、projection）及其测试（`c23-m1~m6-experiment*` 等）。

## C. 适配器

| 目标 | 现状证据 | 处置 |
| --- | --- | --- |
| Kimi Code | 已安装 `/home/heyx/.kimi-code`，全局 `skills/` 用 SKILL.md 格式 | 最小适配：语义 skills 落成 Kimi skills + AGENTS.md；不写宿主专属机器 |
| zcode（智谱） | 未安装（用户确认） | 只做能力画像文档 + 占位说明，不生成产物 |
| DSH（当前环境） | 读取根 `AGENTS.md`（本会话即注入） | 见 E：AGENTS.md 生成做实即为其适配面 |

## D. .pipeline 目录审计（30+ → 5 块）

| 目录/文件 | 处置 |
| --- | --- |
| `cycles/`（含 C1–C26 语义目录） | 保留，平铺不动 |
| `memory/` | 重写（见 F） |
| `experiments/`、`local/` | 保留 |
| `archives/` | 是 cycles/C1–C20 的机器时代副本；与语义版核对后整体删除 |
| `runtime/` | 提取有效人读文本（evidence 报告、事件中可见对话）→ 归对应 Cycle 或 memory/knowledge；哈希壳（objects/receipts/transactions/recovery/journal/events/snapshots/coordination/migrations）删除 |
| `state.yaml` `cycle.yaml` `log.yaml` `log.compact.yaml` `PROGRESS.md` `PROGRESS.compact.md` `metrics*` `patches*` `reports.compact.md` `state.compact.yaml` | 机器权威文件，提取后删除 |
| `manifest.yaml` `config.yaml` `continuation.yaml` `derived-health.yaml` `design-spec.md` `confirm-summary.md` `HABITS.md` | 删除（HABITS 由 M5 规则引擎退役覆盖） |
| `prompts/`（00-07 + README-LEGACY） | 提取后删除 |
| `deep-plans/` | 提取后删除 |
| `knowledge/` `chats/` `chat/` `patches/` `pr/` `quality/` `release/` `reports/` `reviews/` `audits/` `acceptance/` `integrations/` `snapshots/` `debug/` `playbooks/` `history-refresh/` | 逐目录审计：人读内容提取进对应 Cycle 或 memory/knowledge，壳删除 |
| `inbox/`（memory 下） | 归 `memory/inbox`，可读名 |
| `legacy/` | 实体目录取消；删除记录 = 本矩阵 + git tag |
| `rules/`（pipeline 下） | 随 M5 退役 |

## E. AGENTS.md 生成

源段：`core/src/artifacts/agent-guidance.js` 的原则段（协商优先/澄清先行、Four-Rule、Ask Questions、Hook-optional）+ Runtime contract + Active Rules 列表 + Analysis boundary。`sync --platform opencode` 真实写出根 `AGENTS.md`；生成逻辑简单拼装，不加新引擎。DSH 直接读根 AGENTS.md。

## F. Memory 可读化

- 结构：`memory/global/rules/`（规则）、`memory/global/requirements/`（requirement/decision/preference/feedback）、`memory/global/knowledge/`（方法经验）、`memory/cycle/<slug>/`（按需）、`memory/inbox/`、`memory/inbox/reviewed/`。
- 重命名规则：文件名 = `dedupe_key` 净化后的 slug（如 `plan-discussion-scope-gate.md`、`clarification-first-discussion.md`、`roadmap-deferred-scope.md`）；目录名可读（`global/requirements/`）。75 条记录按规则批量迁移，映射表随 M2 产出供核对。
- `index.yaml`（哈希映射层）退役；`INDEX.md` 改为按三条约束级分组的人读索引。
- 三约束级（每条记录 frontmatter 标注 `level`）：
  - `constraint`（必须）：违反即错（讨论完成门、反脚手架、git 不碰）；
  - `guideline`（应该）：默认遵守，有理由可偏离（澄清先行、协商优先、中文输出）；
  - `reference`（参考）：方法经验，供选用（"需求要传播到执行面"等教训）。
- "收尾之前整理 Memory"写入 `skills/cycle/SKILL.md` 关闭步骤：关闭前检查新记忆可读命名、等级已标、索引已更新。

## G. 删除保护移除与反脚手架

- 删除：`core/src/deletion` 删除门与其测试；hook 层 PreToolUse/PermissionRequest 的删除 deny；`hooks/hooks.json` 6 → 4 事件（SessionStart/UserPromptSubmit/PreCompact/Stop）；受保护文件清单从"机器拦截"改为 AGENTS.md 里的人读提醒。
- 新增原则（写入 AGENTS.md Four-Rule 与 goal/plan skills）：
  > **必要性前置（反脚手架）**：写任何功能、模块或文件之前，先自问"没有它，能不能完成已规定好的目标？"能，就不写。目标里没要求的东西一律不先搭——脚手架、预留接口、防御性分支同理。

## H. rules 引擎退役与 legacy 取消

- 删除：`rules/builtin/`（17 条）、`rules/presets/`（3 档）、`scripts/rules-summary.sh`、`.pipeline/HABITS.md`、`references/rules-spec.md`；根目录 `rules/` 取消。
- 活跃规则落位：`memory/global/rules/*.md`（人读）+ AGENTS.md Active Rules 列表。
- ⚠️ 受保护文件：`.pipeline/rules.yaml`、`.pipeline/state.yaml`、`.pipeline/cycle.yaml` 的删除需要在 S1 清单中单独勾选。

## I. 顶层文件清理清单（S1 逐项勾选）

| 路径 | 大小 | 处置建议 |
| --- | --- | --- |
| `tmp.md` | 8.8K | 删除 |
| `tmp/` | 468K | 删除 |
| `PROJECT-SUMMARY.md` | 382B | 删除（README 已覆盖） |
| `dashboard/` | 148K | 删除（TUI/仪表盘已决定不做） |
| `monitors/` | 4K | 删除 |
| `domains/` | 12K | 删除（rtl 域示例，audit 后无需） |
| `redskill-package/` | 12K | 删除 |
| `plan/` | 116K | 删除（旧 PLAN-SKILL 19K 已由 skills/plan 取代） |
| `examples/` | 84K | 候选：留 1 个作为外部项目示例，其余删（S1 定） |
| `vendor/` | 836K | 删除（LaTeX submodule，与 Workflow 无关） |
| `dist/` | 8.4M | 候选：只留 `15.0.0-alpha.2+codex.20260809052356` 两个 ZIP（S1 定） |
| `tests/results/` | JSON 历史 | 删除 |
| `scripts/` 调度/通知类 | — | 删除 daily-summary-scheduler、maintenance-scheduler、news-noon-scheduler、project-notification-dispatcher、notion_api.py、watchdog.sh、state-summary.sh、log-append.sh、validate-config.sh；保留 build-host-artifacts、diff-stats、测试相关 |
| `contracts/` | 44K | 候选：VSPi 只读适配器是否读 release-manifest 需复核；若不读则删（S1 定） |
| `plugins/` `adapters/` | 40K | 删除（opencode 插件/notion 适配器，旧宿主面） |
| `.plan-state` | 2.4K | 删除 |
| `SKILL.md`（根） | 4.5K | 候选：仓库自述 skill；删除（S1 定） |
| `opencode.json` | 19.7K | 候选：旧 opencode 宿主配置；删除或按新规则重写（S1 定） |
| `config.schema.yaml` | 60K | 删除（配置机器退役后无消费者） |
| `assets/` | 20K | 候选：仅 config 示例；随 examples 一并定（S1 定） |
| `docs/` | 42M | 保留（发布文档面） |
| `CHANGELOG.md` `README*.md` `CONTRIBUTING.md` `LICENSE` `package*.json` `core/` `skills/` `templates/` `hooks/`（收敛后）`commands/` `references/`（收敛后）`.gitignore` `.gitmodules`（若 vendor 删则一并删） | 保留/收敛 |

## J. VSPi 影响

VSPi 0.6.2 的 `hypo-adapter.ts` 通过旧 `createDeliveryStore().resume()` 只读投影。旧机器删除后其投影返回"未初始化"（已有兜底分支）。本轮不碰 VSPi 仓库；其适配器改读语义 Cycle 文件的改动记入 VSPi 侧后续候选（target-owned）。

## K. 已排除

git 历史重写；VSPi 仓库修改；cycles 语义目录搬移；docs/README 发布面删除；`.worktrees/`（git 托管，另行处理，不在本轮删除）。

## S1 接受标准

用户确认：矩阵覆盖完整、I 节清单逐项勾选完毕、M2–M6 可开工。
