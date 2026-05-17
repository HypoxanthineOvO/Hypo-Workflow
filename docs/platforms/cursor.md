# Cursor 指南

Hypo-Workflow 不直接运行项目工作；宿主 Agent 读取 `.pipeline/` 文件并完成实际实现、测试和审查。

## 能力摘要

- Commands: repository-instructions+skills.
- Ask gates: chat.
- Plan support: host-dependent.
- Subagents: host-dependent.
- Events/hooks: host-dependent.
- Rules/instructions: .cursor/rules/hypo-workflow.mdc.
- Skills: .cursor/skills/hw-*.md.
- Recovery: pipeline-files.

## 安装 / 同步

生成 Cursor rule file、平铺 Skills 和 slash commands：

```bash
hypo-workflow sync --platform cursor --project .
```

Targets: `.cursor/rules/hypo-workflow.mdc`, `.cursor/skills/hw-*.md`, `.cursor/commands/hw-*.md`, and a compact `.cursor/hypo-workflow/` reference bundle.

## 支持能力

- 读取 `.pipeline/` state、config、Cycle、Rules/Habits、prompts、reports、logs 和 review artifacts。
- 使用 canonical `/hw:*` workflow vocabulary：init、plan、start/resume、status/report、sync/docs、rules、patch、release。
- 支持 `/hw:explain` 作为只读 evidence-first 问答命令，用于解释代码、配置、命令、报告和近期改动。
- 除非生命周期命令明确拥有写入权，否则保护 protected authority files。
- 生成 repository-level rule file，让 Cursor Agent 遵循 Hypo-Workflow contract。
- 为每个 `/hw-*` 入口同步一个平铺 Skill 文件：`.cursor/skills/hw-*.md`。
- 同步 `.cursor/commands/hw-*.md`，让 Cursor 对话中可以发现 `/hw-start`、`/hw-plan`、`/hw-resume` 等指令。
- 命令 authority 直接嵌入 `.cursor/skills/hw-*.md`；`.cursor/hypo-workflow/` 只镜像 compact shared references/assets/scripts/adapters。
- 模型选择由当前 Cursor UI/session 决定；adapter 不写入或推荐具体模型/provider 默认值，除非用户明确要求配置外部后端。
- 携带 protected-file、preflight、rules 和 implementation/test separation 指导。

## 边界

- Hypo-Workflow 不是 runner；implementation、tests 和 review 由宿主 Agent 执行。
- `.pipeline/state.yaml`、`.pipeline/cycle.yaml` 和 `.pipeline/rules.yaml` 是 protected authority files。
- External installs、user-level config writes、destructive commands 和 network side effects 必须显式确认。
- 这个 adapter 只是 instruction surface，不声明 native hooks、lifecycle enforcement、background execution 或 automatic recovery。

## 仓库指令文件

Adapter targets: `.cursor/rules/hypo-workflow.mdc`, `.cursor/skills/hw-*.md`, `.cursor/commands/hw-*.md`, and `.cursor/hypo-workflow`.

Cursor adapter 同步仓库级 rule file、每命令一个平铺 Skill 文件和每命令一个 slash command 文件。`/hw-start` 等入口加载同名 `.cursor/skills/hw-*.md` 并映射到 canonical `/hw:*`；这些文件不提供 native Hook 或 lifecycle enforcement。

继续保护 protected files，在完成前执行 preflight checks；当宿主支持 delegated work 时，尽量把 implementation 与 testing/review 分离。
