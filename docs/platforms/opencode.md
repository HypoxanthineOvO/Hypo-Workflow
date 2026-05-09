# OpenCode 指南

Hypo-Workflow 不直接运行项目工作；宿主 Agent 读取 `.pipeline/` 文件并完成实际实现、测试和审查。

## 能力摘要

- Commands: native-slash.
- Ask gates: question-tool.
- Plan support: todowrite.
- Subagents: native-agents.
- Events/hooks: plugin-events.
- Rules/instructions: AGENTS.md-instructions.
- Recovery: lease-heartbeat-plugin-events.

## 安装 / 同步

用 native OpenCode artifacts 初始化项目：

```bash
hypo-workflow init-project --platform opencode --project . --automation balanced
```

刷新已有项目：

```bash
hypo-workflow sync --platform opencode --project . --repair
```

## 支持能力

- 读取 `.pipeline/` state、config、Cycle、Rules/Habits、prompts、reports、logs 和 review artifacts。
- 使用 canonical `/hw:*` workflow vocabulary：init、plan、start/resume、status/report、sync/docs、rules、patch、release。
- 支持 `/hw:explain` 作为只读 evidence-first 问答命令，用于解释代码、配置、命令、报告和近期改动。
- 除非生命周期命令明确拥有写入权，否则保护 protected authority files。
- 生成 native `/hw-*` slash command files。
- 生成 OpenCode role agents、plugin runtime files、status sidecars 和 TUI/status config。
- 用 native `question` 处理必要决策，用 `todowrite` 保持可见计划纪律。
- `/hw-pr-create` 映射到 canonical `/hw:pr create`，用于问答式 GitHub PR / GitLab MR 创建流程。
- 支持 OpenCode provider/model matrix metadata，但不把 Hypo-Workflow 变成 runner。

## 边界

- Hypo-Workflow 不是 runner；implementation、tests 和 review 由宿主 Agent 执行。
- `.pipeline/state.yaml`、`.pipeline/cycle.yaml` 和 `.pipeline/rules.yaml` 是 protected authority files。
- External installs、user-level config writes、destructive commands 和 network side effects 必须显式确认。
- OpenCode-specific events 和 plugins 是增量能力；Codex 和 Claude Code 行为不得依赖它们。

## Model Matrix

OpenCode 负责实际模型调用；Hypo-Workflow 只写入 role-aware agent metadata 和 config defaults。

```yaml
opencode:
  compaction:
    effective_context_target: 900000
  agents:
    plan:
      model: gpt-5.5
    compact:
      model: deepseek-v4-flash
    test:
      model: deepseek-v4-pro
    code-a:
      model: mimo-v2.5-pro
    code-b:
      model: deepseek-v4-pro
    debug:
      model: gpt-5.5
    docs:
      model: deepseek-v4-pro
    report:
      model: deepseek-v4-flash
```

| Agent | Role | 发布默认 |
|---|---|---|
| `hw-compact` | context compaction | `deepseek-v4-flash` |
| `hw-test` | test design and validation | `deepseek-v4-pro` |
| `hw-code-a` | primary implementation | `mimo-v2.5-pro` |
| `hw-code-b` | secondary implementation | `deepseek-v4-pro` |
| `hw-docs` | documentation and release notes | `deepseek-v4-pro` |
| `hw-report` | report synthesis | `deepseek-v4-flash` |
