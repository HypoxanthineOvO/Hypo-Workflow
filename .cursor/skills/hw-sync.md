---
name: hw-sync
description: "Hypo-Workflow Cursor skill for /hw-sync; use when the user invokes /hw-sync or canonical /hw:sync."
---

# /hw-sync

Canonical command: `/hw:sync`
Cursor command: `/hw-sync`
Route: `tool`
Embedded authority source: `skills/sync/SKILL.md`

## Cursor Execution

1. Treat this file as the command-specific Cursor Skill for the requested `/hw-*` command.
2. Read `.cursor/skills/hypo-workflow.md` when global routing, output-language, or shared runtime rules are needed.
3. Execute the canonical `/hw:sync` semantics using the embedded command authority below and any user-provided arguments.
4. Before writes, inspect `.pipeline/config.yaml`, `.pipeline/cycle.yaml`, `.pipeline/state.yaml`, and `.pipeline/rules.yaml` when present.
5. Do not treat Hypo-Workflow as a runner; Cursor Agent performs the actual work and records evidence in project files when the active command owns those writes.
6. Cursor chooses the active model in the UI/session; treat provider-specific model defaults as non-Cursor examples and do not write or recommend them unless explicitly requested.

## Cursor Reference Resolution

- Local Cursor references live under `.cursor/skills/` and `.cursor/hypo-workflow/`.
- Source-repository paths mentioned by the embedded authority but absent from `.cursor/hypo-workflow/` are external/non-local for Cursor targets.
- Fallback: use the embedded command authority in this file first, then mirrored `.cursor/hypo-workflow/` resources; ask the user for source-repository context only if the missing external reference is required.

## Command Skill Authority

---
name: sync
description: Synchronize Hypo-Workflow project adapters and lightweight derived context without executing pipeline milestones.
---

# /hw:sync

当用户调用 `/hw:sync` 或要求从 Hypo-Workflow 工作区内运行项目同步时，使用此技能。

## 输出语言规则

遵循根 Hypo-Workflow 输出语言配置。当 `output.language` 为 `zh-CN` 或 `zh` 时，使用中文进行面向用户的输出；当为 `en` 时使用英语；当为 `auto` 时跟随对话语言。

## 契约

`/hw:sync` 是一个显式的项目同步入口点。它与 `hypo-workflow sync` 共享语义，并且从不执行 pipeline milestones。

支持的模式：

- `/hw:sync --light`：刷新注册表状态，当源记录更改时刷新 Knowledge Ledger compact/index，检测外部变化，并报告需要关注的内容。
- `/hw:sync`：运行轻量同步，同步 OpenCode 适配器，验证配置加载，检查声明的派生产物，并刷新轻量级 compact 视图。
- `/hw:sync --check-only`：检测外部变化和声明的过时派生产物，而不写入适配器、compact 文件、报告或受保护的权威文件。
- `/hw:sync --repair`：运行标准同步加上声明的派生产物的安全刷新，例如 `PROGRESS.compact.md`、指标/报告 compact 视图、`PROJECT-SUMMARY.md` 和派生健康状态。
- `/hw:sync --deep`：运行标准修复同步加上依赖扫描和架构重新扫描提示。

## 派生产物映射

同步契约区分受保护的权威文件和派生视图。

- 受保护的权威文件：`.pipeline/state.yaml`、`.pipeline/cycle.yaml`、`.pipeline/rules.yaml`。
- 安全的派生视图：compact 文件、指标/报告镜像、项目摘要、OpenCode 状态输入、生成的参考文献和托管的文档块。
- 权威冲突必须报告为需要修复，不得猜测或静默修复。
- 派生健康状态仅在修复/深度同步期间写入 `.pipeline/derived-health.yaml`，然后由状态/仪表板读取器显示。

## SessionStart

SessionStart 仅执行轻量级的外部变化检测。它可能会提示用户运行 `/hw:sync --light` 或标准 `/hw:sync`，但它本身不得运行适配器生成、compact 刷新、依赖扫描或 pipeline milestones。

## 边界

- 不要执行 pipeline prompts 或 milestone 步骤。
- 不要修改 `.pipeline/state.yaml`、`.pipeline/cycle.yaml` 或 `.pipeline/rules.yaml`。
- `--check-only` 不得写入。
- `--repair` 只能写入声明的安全派生产物。
- 深度同步必须是显式的。
- SessionStart 轻量检测不允许进行重度扫描、适配器写入和 compact 写入。

## 参考文件

- `references/commands-spec.md`
- `references/opencode-command-map.md`
- `references/opencode-spec.md`
- `cli/README.md`
