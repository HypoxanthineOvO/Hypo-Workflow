# Claude Code 指南

Hypo-Workflow 不直接运行项目工作；宿主 Agent 读取 `.pipeline/` 文件并完成实际实现、测试和审查。

## 能力摘要

- Commands: plugin-skill.
- Ask gates: chat.
- Plan support: prompt-managed.
- Subagents: available.
- Events/hooks: hooks.
- Rules/instructions: skill-files.
- Recovery: lease-heartbeat-hooks.

## 安装 / 同步

校验本地 checkout：

```bash
claude plugin validate /absolute/path/to/Hypo-Workflow
```

作为开发插件运行当前 checkout：

```bash
claude --plugin-dir /absolute/path/to/Hypo-Workflow
```

如需持久安装，在 Claude Code 内添加 marketplace source 并安装 `hw` plugin：

```text
/plugin marketplace add HypoxanthineOvO/Hypo-Workflow
/plugin install hw@hypoxanthine-hypo-workflow
/reload-plugins
```

在项目内生成 project-local settings、hooks、agents、monitors 和 metadata：

```bash
hypo-workflow sync --platform claude-code --project .
```

## 支持能力

- 读取 `.pipeline/` state、config、Cycle、Rules/Habits、prompts、reports、logs 和 review artifacts。
- 使用 canonical `/hw:*` workflow vocabulary：init、plan、start/resume、status/report、sync/docs、rules、patch、release。
- 支持 `/hw:explain` 作为只读 evidence-first 问答命令，用于解释代码、配置、命令、报告和近期改动。
- 除非生命周期命令明确拥有写入权，否则保护 protected authority files。
- 通过 `hw` Claude Code plugin namespace 暴露 `/hw:*`。
- 生成 project-local hooks，用于 SessionStart、Stop、PermissionRequest、compact resume 和 progress/status refresh。
- 为 plan、code、test、review、debug、docs、report、compact 角色生成 Claude agents 和 routing metadata。
- 检测到官方 OpenAI Codex plugin 已安装后，可选择性用于 implementation delegation。

## 边界

- Hypo-Workflow 不是 runner；implementation、tests 和 review 由宿主 Agent 执行。
- `.pipeline/state.yaml`、`.pipeline/cycle.yaml` 和 `.pipeline/rules.yaml` 是 protected authority files。
- External installs、user-level config writes、destructive commands 和 network side effects 必须显式确认。
- Project settings 采用保守 merge；user-owned settings conflicts 不得静默覆盖。
- Claude Code 内的 Codex plugin installation 是独立的 explicit-confirmation flow。

## Plugin Namespace

Claude Code plugin name 有意设为 `hw`，因此现有 workflow skills 以 `/hw:*` 命令暴露。

- The adapter uses the root `skills/` directory and existing workflow skills.
- It does not generate `skills/hw-*` alias skills.
- Claude native `/resume` belongs to Claude Code; Hypo workflow resume is `/hw:resume`.
- `skills/resume/SKILL.md` intentionally omits a bare `name: resume` frontmatter field so metadata does not suggest a `/resume` alias.
- Hook `matcher: resume` means Claude SessionStart resume event, not a user slash command.
- Settings are merged through project-local `settings.local_file` policy.
- DeepSeek and Mimo may be used through Claude Code agent routing when configured; this is separate from Codex Subagents.

## Claude Code 内的可选 OpenAI Codex Plugin

这和 Hypo-Workflow 的 `hw` plugin 是两件事。只有 capability detection 报告 `installed` 后，Claude Code 才能把实现工作委托给官方 OpenAI Codex plugin。

```text
/plugin marketplace add openai/codex-plugin-cc
/plugin install codex@openai-codex
/reload-plugins
/codex:setup
```

Hypo-Workflow 可以把这些命令渲染成确认提案，但不得自动执行这些 slash commands。
