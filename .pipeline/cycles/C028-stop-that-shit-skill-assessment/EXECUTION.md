---
kind: execution
cycle: C028-stop-that-shit-skill-assessment
updated: 2026-08-21T00:00:00+08:00
---

# 执行记录

当前处于 Discussion，尚未授权产品代码修改或集成执行。

## Checkpoint: 来源核验与源代码阅读（2026-08-21）

### 来源

- 原始仓库：`https://github.com/lennney/stop-that-shit`
- 公开、非 fork、MIT；默认分支 `main`；最新 release `0.1.0`（2026-08-19）。
- 仓库在 2026-08-20 仍有提交，不能视为无人维护的静态样例。

### 阅读范围

- `skills/stop-that-shit/SKILL.md`：Stop Ladder、模式和边界语义。
- `src/contracts.cjs`、`src/decision.cjs`、`src/controller.cjs`：合同解析、决策优先级、Hook 响应和审计。
- `src/adapters/*`、`HOST-ADAPTER-CONTRACT.md`：Codex、Claude Code、OpenCode、Hermes 的宿主映射。
- `cases/`、`schemas/`、`test/`：Bad/Good 对照案例、CaseBundle schema、自动化测试。
- `ARCHITECTURE.md`、`EVIDENCE.md`：架构边界和证据声明。

### 结论

这是“短行为 Skill + 可选本地 Guard + 多宿主适配器 + metadata Runtime + paired case/eval”的完整项目，不是只有一段提示词。其核心目标与本项目反脚手架、咨询优先和最小必要改动原则有明显重叠，但 Guard 的模式确认、Hook 覆盖和文件/代理预算属于额外执行层，是否引入需要单独讨论。

### 验证

- `npm ci` 成功，npm audit：0 vulnerabilities。
- `npm test`：182 项中 181 项通过；唯一失败为 OpenCode smoke，环境加载 OpenCode 1.14.30（项目要求 >=1.18.18），并出现本地 `.tgz` 插件入口解析错误。
