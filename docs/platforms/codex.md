# Codex 指南

Hypo-Workflow 不直接运行项目工作；宿主 Agent 读取 `.pipeline/` 文件并完成实际实现、测试和审查。

## 能力摘要

- Commands: skill.
- Ask gates: chat.
- Plan support: codex-plan-tool.
- Subagents: codex-gpt-runtime.
- Events/hooks: limited.
- Rules/instructions: skill-files.
- Recovery: lease-heartbeat.

## 安装 / 同步

本地 checkout 安装：

```bash
git clone https://github.com/HypoxanthineOvO/Hypo-Workflow.git ~/.codex/skills/hypo-workflow
```

开发时建议 symlink 当前 checkout，而不是复制一份：

```bash
mkdir -p ~/.codex/skills
ln -sfn /absolute/path/to/Hypo-Workflow ~/.codex/skills/hypo-workflow
```

随后在 Codex 中调用 Hypo-Workflow skills。若项目已经暴露 `/hw:*`，使用 canonical `/hw:init`、`/hw:plan` 和 `/hw:start` 流程。

## 支持能力

- 读取 `.pipeline/` state、config、Cycle、Rules/Habits、prompts、reports、logs 和 review artifacts。
- 使用 canonical `/hw:*` workflow vocabulary：init、plan、start/resume、status/report、sync/docs、rules、patch、release。
- 支持 `/hw:explain` 作为只读 evidence-first 问答命令，用于解释代码、配置、命令、报告和近期改动。
- 除非生命周期命令明确拥有写入权，否则保护 protected authority files。
- 使用 Codex skills，并在可用时使用 Codex plan tool。
- 对非平凡实现或审查工作优先使用 Codex Subagents，同时保持 implementation 与 testing/review 分离。
- 不要求外部模型路由；Codex Subagents 留在 Codex/GPT runtime。

## 边界

- Hypo-Workflow 不是 runner；implementation、tests 和 review 由宿主 Agent 执行。
- `.pipeline/state.yaml`、`.pipeline/cycle.yaml` 和 `.pipeline/rules.yaml` 是 protected authority files。
- External installs、user-level config writes、destructive commands 和 network side effects 必须显式确认。
