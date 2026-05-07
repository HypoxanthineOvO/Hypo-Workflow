# Architecture Baseline - C9 配置治理、PR/MR、Explain 与 Claude Resume

## Current Baseline

- Active Cycle: C9, "Hypo-Workflow 配置治理、PR 管理、Explain 命令与 Claude Resume 修复"。
- Workflow kind: build。
- Preset: tdd。
- `.pipeline/` 继续作为 Cycle、state、Feature Queue、rules、progress、logs、prompts、reports、reviews、metrics、Knowledge、patches 和 archives 的 source of truth。
- Hypo-Workflow 不是 runner；它生成计划、命令协议、文档、adapter、审查证据和恢复指针，实际工作由宿主 Agent 执行。
- C9 使用 Feature Queue，6 个 Feature，12 个 serial Milestone。

## Architecture Direction

C9 增加四条用户可见能力线：

1. **Configuration Governance**：把散落在 config、Cycle、rules、analysis、automation、review 和 platform profile 中的边界整理为中文可读矩阵。
2. **Change Request Workflow**：用 `/hw:pr` 处理已有 GitHub PR / GitLab MR，并在 `.pipeline/pr/` 留下本地归档。
3. **Evidence-first Explain**：用 `/hw:explain` 回答代码、配置、变更和命令问题，默认查证据，支持 `--subagent` 独立取证。
4. **Claude Resume Namespace Boundary**：修复 Claude Code 原生 `/resume` 和 Hypo `/hw:resume` 的自动补全/路由歧义。

## Expected Code Areas

- `references/config-spec.md`
- `docs/user-guide.md`
- `docs/developer.md`
- `docs/reference/*.md`
- `docs/platforms/*.md`
- `references/commands-spec.md`
- `references/platform-claude.md`
- `references/platform-capabilities.md`
- new PR/MR reference contract, likely `references/pr-spec.md`
- new Explain reference contract, likely `references/explain-spec.md`
- new or updated skills under `skills/pr/`, `skills/explain/`, `skills/resume/`
- `.claude-plugin/plugin.json`
- `core/src/commands/`
- `core/src/docs/`
- `core/src/artifacts/claude.js`
- `core/src/claude-*`
- `core/test/*config*.test.js`
- `core/test/*pr*.test.js`
- `core/test/*explain*.test.js`
- `core/test/*claude*resume*.test.js`
- `core/test/docs-governance.test.js`
- `.opencode/commands/` and generated command map when new commands are added

## Source-Of-Truth Boundaries

- `.pipeline/config.yaml` and `~/.hypo-workflow/config.yaml` define effective configuration, but docs must explain project > global > default precedence.
- `.pipeline/cycle.yaml` defines Cycle-local lifecycle policy and must not be silently overwritten.
- `.pipeline/pr/` stores PR/MR local evidence. It does not replace GitHub/GitLab as remote source of truth.
- `/hw:explain` is read-only. It must not update state, create patches, or advance workflow unless a future explicit flag is designed.
- Claude Code native `/resume` belongs to Claude. Hypo-Workflow owns only `/hw:resume` and exact `hw` namespace entries.

## Review And Evidence

C9 requires durable review artifacts for generated plan and final delivery:

```text
.pipeline/reviews/
  C9-plan-generation/
    subagent-audit/
  F002-pr/
    M03/
  F003-explain/
    M07/
  F006-validation/
    M12/
```

Every new command contract should record:

- command name and supported flags;
- read/write side effects;
- protected file writes;
- network/remote behavior;
- user confirmation gates;
- fixture-based validation;
- documentation and adapter generation requirements.

## Milestone Strategy

1. M01 配置字段盘点与严格度矩阵。
2. M02 默认配置组合。
3. M03 Change Request 合同与本地归档。
4. M04 只读 inspect/review 流程。
5. M05 fix/merge/close 手动门。
6. M06 Evidence-first Explain 合同。
7. M07 `--subagent` 取证流程。
8. M08 Explain 测试与文档。
9. M09 Claude `/resume` 冲突审计。
10. M10 Claude 适配修复与烟测。
11. M11 人读文档中文主体化。
12. M12 C9 Agent Review 与全量回归。

## Cross-Cutting Constraints

- 不自动安装插件、改 user-level config、push、merge、close、publish 或执行远端写操作。
- PR/MR live remote 读取受网络/remote boundary 约束，测试默认用 fixture/mock。
- Explain 输出必须引用证据或声明无法确认。
- 文档中文化不得改变命令、配置键和 schema field 的精确拼写。
- 新命令必须更新 command map、help、platform docs、generated artifacts 和 adapter surfaces。
- 所有用户可见说明按 `output.language=zh-CN`。
