# C18 Architecture — 指令质量审查与集成同步方案

## 工作类型

C18 是 refactor/build Cycle，目标是把 Hypo-Workflow 的质量治理指令升级为可执行、可评分、可闭环优化的命令体系，并建立源仓库到 `~/Codex-VSP` 与 `~/VSP-Open-Code` 的集成同步开发流程。

## 架构目标

1. Audit Engineering Method
   - `/hw:audit` 保留治理 gate 定位，但升级为 Intake-first 的工程审计。
   - 方法论采用 GQM、ISO/IEC 25010、ATAM-lite 和 SWEBOK。
   - 顶层输出模型从旧六维扫描改为 Experience / Engineering / Risk。
   - Critical finding 默认阻断，非阻断质量改进进入 Action Queue 或 `/hw:quality`。

2. Quality Command
   - `/hw:quality` 成为一等命令。
   - 支持一次性 scorecard、baseline、compare、review 和 action queue。
   - 评分采用 1-5 evidence-backed rubric，核心维度为 Correctness、Maintainability、Structure/Organization。
   - Quality 可以 gate 质量阈值，但不替代 Audit 的风险治理职责。

3. Optimize Command
   - `/hw:optimize` 是闭环编排命令，不是后台自动重构器。
   - Canonical loop 为 `Audit + Quality -> Optimize Implement/Test -> Audit + Quality`。
   - 开始实现前必须定义 correctness contract、backup、budget、validation path 和手动/自动边界。
   - 大范围或边界不清的优化必须转 Plan，小修复可转 Patch。

4. Integration Sync Workflow
   - 集成同步是开发流程和 release gate，不新增用户命令。
   - 每次源仓库功能或指令语义变化后，必须做 source summary、target inspection、gap analysis、target adaptation plan、target validation、target records 和 source backlink。
   - 不复制源仓库 runtime `.pipeline/state.yaml`、`.pipeline/cycle.yaml` 或 `.pipeline/log.yaml` 到目标仓库。

5. Target Adaptation Boundary
   - `~/Codex-VSP` 和 `~/VSP-Open-Code` 是目标集成仓库，不是源仓库派生目录。
   - C18-M5 只读检查目标仓库并生成适配计划。
   - C18-M6 必须在用户确认具体文件清单后才能写目标仓库。

## 外部副作用边界

- C18-M1 到 C18-M5 不写 `~/Codex-VSP` 或 `~/VSP-Open-Code`。
- C18-M6 写目标仓库前必须读取 C18-M5 适配计划并获得用户确认。
- 目标仓库已有 dirty worktree 时，必须保留用户未提交改动，不得回滚或覆盖无关文件。
- 不需要网络、系统级依赖安装或服务重启。

## Milestone 顺序

1. Audit Engineering Method Upgrade
2. Quality Command And Report Contract
3. Optimize Closed-Loop Command
4. Integration Sync Workflow As Development And Release Gate
5. Source-Side Status, Docs, And Full Regression Closure
6. Target Repository Adaptation After Confirmation

## 验收规则

- 每个实现 Milestone 必须保留 P2 技术路线字段。
- 每个 prompt 必须包含 Subworker Assignment Plan。
- 每个 Milestone 至少运行 focused tests 和 `git diff --check`；最终运行 `npm test`。
- 测试必须覆盖命令注册、Skill/spec、OpenCode adapter/docs、report/state/action paths 和 no-command integration sync contract。
- Audit worker 必须拒绝只验证文本存在但不覆盖命令映射、生成 docs、adapter 或状态契约的伪测试。
