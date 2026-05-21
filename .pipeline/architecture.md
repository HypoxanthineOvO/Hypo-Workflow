# C17 Architecture — Audit Remediation And Structural Debt Reduction

## 工作类型

C17 是 refactor Cycle，目标是关闭 2026-05-21 审计发现的 Critical、Warning 和 Info 问题。C17 接受 breaking cleanup：根目录测试入口、配置 authority、workspace 模块边界、YAML parser、ledger 存储和 public exports 都可以在本 Cycle 一次性调整，但必须通过真实测试、扫描和审计 closure report 证明改动安全。

## 架构目标

1. Root Test And Audit Baseline
   - 仓库根目录必须提供可直接运行的 `npm test`。
   - 审计 inventory 记录 hardcoded paths、重复 helper、workspace stale imports、parser 分裂、ledger 写入模式和 barrel export 状态。

2. Shared Utils Layer
   - `core/src/utils/index.js` 成为低层工具函数 authority。
   - 重复的 `isPlainObject`、clone、timestamp、YAML write、stable stringify、safe id 等 helper 必须迁移或有明确理由保留。

3. Layered Configuration Authority
   - 配置读取顺序为项目 `.pipeline/config.yaml`、用户级 `~/.hypo-workflow/config.yaml`、安全默认值。
   - 项目路径、Hypo-Claw、Hypo-Writer、timezone 和 project linkage seed 不再硬编码在 runtime source。
   - 配置迁移通过显式命令触发；`sync/start` 只能提示，不能静默写用户级配置。

4. YAML Parser Authority
   - `js-yaml` 是 config 与 knowledge YAML 的统一 parser/dumper。
   - 自研 partial parser 不再分裂维护。

5. Workspace Clean Split
   - `workspace/index.js` God Module 拆为明确领域模块：
     - `workspace-authority`
     - `project-linkage`
     - `project-stop-events`
     - `codex-capture`
     - `notification-sender`
   - 不保留 `workspace/index.js` re-export 兼容 shim。
   - 所有 runtime/test/docs imports 一次迁移到新模块边界。

6. Append-Only Ledger Layer
   - 高频 ledger 新写入采用 append-only JSONL。
   - 旧 YAML ledger 一次性迁移到 JSONL。
   - compact YAML 只作为人读摘要，不作为长期双写 authority。

7. Explicit Public Exports
   - `core/src/index.js` 不再大面积 `export *` 平铺所有模块。
   - public exports 尽量改为显式或 namespace export。
   - README、docs 和 examples 必须同步新 import 路径。

## 外部副作用边界

- C17 不需要真实 Notion 写入、真实 QQ 发送或服务重启。
- 用户级配置迁移只在显式命令下写入。
- `sync/start` 可检测缺失配置并提示迁移命令，但不得静默写入 `~/.hypo-workflow/config.yaml`。
- 系统级依赖安装不自动执行；Node 依赖变更必须反映在 package manifest/lockfile 中。

## Milestone 顺序

1. Audit Baseline And Root Test Entry
2. Shared Utils Layer Extraction
3. Layered Config And Integration Migration
4. YAML Parser Unification With js-yaml
5. Workspace Clean Module Split
6. Ledger JSONL Migration And Barrel Export Cleanup
7. Full Audit Closure And Release Readiness

## 验收规则

- 每个实现 Milestone 必须保留 P2 技术路线字段。
- 每个 prompt 必须包含 Subworker Assignment Plan。
- 每个 Milestone 至少运行 focused tests、`npm test` 和 `git diff --check`。
- 最终审计必须扫描 hardcoded path、workspace stale import、parser split、ledger authority 和 barrel export 状态。
- 审计工作器必须拒绝伪测试、静默用户配置写入、workspace shim、长期 YAML/JSONL 双写和 stale docs/examples。
