# Cursor 指南

Hypo-Workflow 不直接运行项目工作；宿主 Agent 读取 `.pipeline/` 文件并完成实际实现、测试和审查。

## 能力摘要

- Commands: repository-instructions.
- Ask gates: chat.
- Plan support: host-dependent.
- Subagents: host-dependent.
- Events/hooks: host-dependent.
- Rules/instructions: .cursor/rules/hypo-workflow.mdc.
- Recovery: pipeline-files.

## 安装 / 同步

生成 Cursor rule file：

```bash
hypo-workflow sync --platform cursor --project .
```

Target: `.cursor/rules/hypo-workflow.mdc`.

## 支持能力

- 读取 `.pipeline/` state、config、Cycle、Rules/Habits、prompts、reports、logs 和 review artifacts。
- 使用 canonical `/hw:*` workflow vocabulary：init、plan、start/resume、status/report、sync/docs、rules、patch、release。
- 支持 `/hw:explain` 作为只读 evidence-first 问答命令，用于解释代码、配置、命令、报告和近期改动。
- 除非生命周期命令明确拥有写入权，否则保护 protected authority files。
- 提供 repository-level instructions，让宿主 IDE Agent 可以遵循 Hypo-Workflow contract。
- 携带 protected-file、preflight、rules 和 implementation/test separation 指导。

## 边界

- Hypo-Workflow 不是 runner；implementation、tests 和 review 由宿主 Agent 执行。
- `.pipeline/state.yaml`、`.pipeline/cycle.yaml` 和 `.pipeline/rules.yaml` 是 protected authority files。
- External installs、user-level config writes、destructive commands 和 network side effects 必须显式确认。
- 这个 adapter 只是 instruction surface，不声明 native hooks、lifecycle enforcement、background execution 或 automatic recovery。

## 仓库指令文件

Adapter target: `.cursor/rules/hypo-workflow.mdc`.

这些 adapters 是仓库级 instruction files。它们告诉宿主 IDE Agent 阅读 `HypoxanthineOvO/Hypo-Workflow` 并遵循 README 快速入口；它们不提供 native Hook 或 lifecycle enforcement。

继续保护 protected files，在完成前执行 preflight checks；当宿主支持 delegated work 时，尽量把 implementation 与 testing/review 分离。
