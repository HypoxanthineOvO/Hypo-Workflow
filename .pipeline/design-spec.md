# C9 Design Spec - 配置治理、PR/MR、Explain、Claude Resume 与中文文档

## Product Scope

C9 把 Hypo-Workflow 的用户可理解性和协作能力补齐到可交付状态。Cycle 目标不是增加一个后台 runner，而是继续强化 `.pipeline/` 作为本地 workflow authority 的设计：让用户能看懂配置，能让 Agent 处理已有 PR/MR，能要求 Agent 证据优先地解释代码和决策，并修复 Claude Code 原生 `/resume` 与 Hypo `/hw:resume` 的命名冲突。

本 Cycle 使用 Batch Plan Mode，包含 6 个 Feature 和 12 个 Milestone。

## Confirmed Decisions

- 配置治理文档必须整理不同自动程度、严格程度、确认边界和平台差异。
- 默认配置组合至少包含 `solo-auto`、`manual-review`、`team-strict`、`analysis-hybrid`。
- PR/MR 抽象为平台中立的 Change Request；GitHub 映射为 Pull Request，GitLab 映射为 Merge Request。
- `/hw:pr` 第一版以处理已有 PR/MR 为主：`inspect`、`review`、`fix`、`merge`、`close`。
- 后续创建入口预留为 `/hw:pr create`，但 C9 不要求完整创建实现。
- PR/MR 远端写操作永远是高风险手动门，包括 `push`、`merge`、`close`、修改 reviewer、label、target branch。
- `/hw:pr` 必须写本地归档，记录来源、状态快照、Agent 审查、修改、测试、确认和最终结果。
- `/hw:explain` 是证据优先的只读问答命令，不是 `/hw:status` 的替代。
- Explain 默认读取相关代码、diff、`.pipeline` 状态、日志、报告和文档证据，避免凭空回答。
- Explain 支持 `--subagent`，由独立 Subagent 先整理上下文和证据，主 Agent 再回答。
- Claude 修复重点是避免 Claude Code 内置 `/resume` 被自动补全或误路由到 Hypo `/hw:resume`。
- 给人看的主文档和 README 引用链必须中文主体；命令名、配置键、文件名、平台名和专有英文术语保留英文。

## Feature Queue

| Feature | Title | Dependencies | Validation focus |
|---|---|---|---|
| F001 | 配置治理与默认配置组合 | none | config 矩阵、默认 profile、确认边界 |
| F002 | PR/MR 管理与本地归档 | F001 | Change Request contract、只读 fixture、高风险门 |
| F003 | Evidence-first Explain 命令 | F001 | 只读问答、证据引用、Subagent handoff |
| F004 | Claude Resume 命名冲突修复 | F001 | exact namespace、alias/autocomplete fixture、Claude smoke |
| F005 | 中文主体文档治理 | F001-F004 | README 引用链、docs/references 中文主体、命令新鲜度 |
| F006 | C9 总体验收 | F001-F005 | Subagent 审计、文档自检、全量回归 |

## Configuration Governance

配置治理文档必须从用户视角解释以下层次：

- project config `.pipeline/config.yaml`；
- global config `~/.hypo-workflow/config.yaml`；
- Cycle metadata `.pipeline/cycle.yaml`；
- `automation.*`、legacy auto fields 和 hard gates 的关系；
- `plan.mode`、`plan.interaction_depth`、`plan.interactive.*`；
- `execution.mode`、`execution.worker_separation.mode`、`execution.step_overrides.*`；
- `execution.analysis.interaction_mode` 和 analysis boundary；
- `review strict`、`evaluation.*` 和 Agent Review blocking policy；
- platform profile，如 Codex、Claude Code、OpenCode、team-strict。

默认配置组合必须以稳定 key 表示，中文解释面向用户：

- `solo-auto`：个人全自动开发，普通执行自动推进，高风险外部动作确认；
- `manual-review`：手动检查，规划和关键阶段都更频繁停顿；
- `team-strict`：团队严格，worker separation、review、CI/PR 边界更保守；
- `analysis-hybrid`：分析优先，代码变更前确认，允许证据收集和只读检查。

## PR/MR Change Request Model

`/hw:pr` 的核心对象是 Change Request。它必须支持 GitHub PR 和 GitLab MR 的平台差异，但用户命令保持统一。

第一版本地归档建议：

```text
.pipeline/pr/
  PR-YYYYMMDD-001/
    request.yaml
    summary.md
    review-notes.md
    changes.md
    evidence/
    decisions.yaml
```

归档记录：

- provider、URL、编号、源分支、目标分支、作者；
- 标题、描述、CI/checks、review/approval、冲突状态；
- Agent 风险评估和关键 diff；
- 本地修复 diff、commit、测试命令和结果；
- 人工确认记录；
- final status：merged、closed、abandoned、deferred。

远端动作规则：

- `inspect` 和 `review` 默认只读；
- `fix` 可改本地代码，push 前必须确认；
- `merge` 和 `close` 必须确认；
- live remote 读取也应按网络/remote boundary 处理，测试默认用 fixture/mock。

## Explain Model

`/hw:explain` 回答自然语言问题，例如：

- “这个新项目代码框架是什么？”
- “为什么刚才这样写？”
- “这个配置为什么是 strict？”
- “这个命令会做什么？”

Explain 默认只读，并应先收集证据再回答。它可以读取：

- 用户指定文件；
- `git diff`、recent changes；
- `.pipeline/cycle.yaml`、`state.yaml`、`PROGRESS.md`、`log.yaml`；
- 近期 report 和 review artifact；
- README、docs、references；
- relevant source/test files。

`--subagent` 模式要求独立 Subagent 生成 evidence packet，主 Agent 基于该 packet 和必要的复核回答。报告中要标明证据来源和无法确认的部分。

## Claude Resume Boundary

Claude Code 原生 `/resume` 是宿主平台能力，Hypo-Workflow 的 `/hw:resume` 是 workflow command。两者不能因为自动补全、别名、plugin 命名或 generated instruction 混在一起。

C9 必须审计：

- `.claude-plugin/plugin.json`；
- `skills/resume/SKILL.md`；
- Claude command/skill generation；
- `core/src/artifacts/claude.js`；
- Claude alias/autocomplete tests；
- docs/platforms/claude-code.md；
- references/platform-claude.md 和 commands spec。

## Documentation Language Policy

给人看的文档必须中文主体，包括 README 引用链、`docs/**` 和主要 `references/**`。历史 showcase/release 文档可以低优先级，但入口和仍被 README 引用的文档必须中文。

保留英文的内容：

- 命令名；
- 配置键；
- 文件名和路径；
- 平台名；
- API、PR/MR 等专有术语；
- 代码、测试名和 schema field。

## Validation Strategy

每个实现 Milestone 走 TDD：写测试、审查测试、red、实现、green、审查代码。最终 M12 必须执行：

- focused tests for config/pr/explain/claude/docs；
- `npm test --prefix core`；
- `python3 tests/run_regression.py`；
- `bash scripts/validate-config.sh .pipeline/config.yaml`；
- `node cli/bin/hypo-workflow sync --check-only --project .`；
- `claude plugin validate .`；
- `git diff --check`；
- 文档 Agent 自检；
- Subagent 审计生成产物、prompt 闭环、PR/Explain 风险边界和 Claude Resume 修复。

## Open Risks

- GitHub PR 和 GitLab MR 的 live API 行为会变化；C9 应以 fixture/mock 为测试基线。
- PR/MR 写操作很容易越界；所有远端写都必须人工确认。
- Explain 如果没有证据约束会变成普通聊天；默认行为必须收集证据并声明不确定性。
- 中文化 references 可能造成 spec 漂移；命令、schema 和测试预期必须保持精确。
- Claude Code 自动补全行为受宿主影响；修复要避免声称能控制平台内置命令，只能控制 Hypo plugin/alias/instruction surface。
