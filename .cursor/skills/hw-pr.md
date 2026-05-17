---
name: hw-pr
description: "Hypo-Workflow Cursor skill for /hw-pr; use when the user invokes /hw-pr or canonical /hw:pr."
---

# /hw-pr

Canonical command: `/hw:pr`
Cursor command: `/hw-pr`
Route: `change-request`
Embedded authority source: `skills/pr/SKILL.md`

## Cursor Execution

1. Treat this file as the command-specific Cursor Skill for the requested `/hw-*` command.
2. Read `.cursor/skills/hypo-workflow.md` when global routing, output-language, or shared runtime rules are needed.
3. Execute the canonical `/hw:pr` semantics using the embedded command authority below and any user-provided arguments.
4. Before writes, inspect `.pipeline/config.yaml`, `.pipeline/cycle.yaml`, `.pipeline/state.yaml`, and `.pipeline/rules.yaml` when present.
5. Do not treat Hypo-Workflow as a runner; Cursor Agent performs the actual work and records evidence in project files when the active command owns those writes.
6. Cursor chooses the active model in the UI/session; treat provider-specific model defaults as non-Cursor examples and do not write or recommend them unless explicitly requested.

## Cursor Reference Resolution

- Local Cursor references live under `.cursor/skills/` and `.cursor/hypo-workflow/`.
- Source-repository paths mentioned by the embedded authority but absent from `.cursor/hypo-workflow/` are external/non-local for Cursor targets.
- Fallback: use the embedded command authority in this file first, then mirrored `.cursor/hypo-workflow/` resources; ask the user for source-repository context only if the missing external reference is required.

## Command Skill Authority

---
name: pr
description: Manage GitHub PRs or GitLab MRs through a local Change Request archive; use when the user invokes /hw:pr inspect, review, fix, merge, close, or create.
---

# /hypo-workflow:pr

## Output Language Rules

读取 `.pipeline/config.yaml` 和全局配置（如果可用）。面向用户的说明、存档摘要和确认提示应遵循 `output.language`；命令名称、提供商名称、配置键和文件名保持原样。

## Prerequisites

- 项目本地的 `.pipeline/` 工作区应已存在。
- 输入应为现有的 GitHub Pull Request URL、GitLab Merge Request URL、`.pipeline/pr/` 下的本地存档 ID，或 `/hw:pr create` 的引导创建详情。
- 测试或本地存档创建不需要实时的 GitHub/GitLab 访问。

## Execution Flow

1. 加载 `references/pr-spec.md` 以获取 Change Request 契约。
2. 解析子命令：`inspect`、`review`、`fix`、`merge`、`close` 或 `create`。
3. 将 GitHub PR / GitLab MR 术语规范化为 Change Request 记录。
4. 创建或重用 `.pipeline/pr/PR-YYYYMMDD-NNN/`。
5. 将本地证据写入 `request.yaml`、`summary.md`、`review-notes.md`、`changes.md`、`decisions.yaml` 和 `evidence/`。
6. 对于 `inspect`，读取元数据、diff、评论和检查，然后写入 `summary.md` 加上编辑后的证据。
7. 对于 `review`，使用检查证据写入 `review-notes.md`，包含发现、失败的检查、风险文件、评论、未知项和人工合并建议。
8. 对于 `fix`，在 `changes.md` 中保持本地更改可追溯，记录测试，并将推送标记为需要确认。
9. 对于 `merge`，检查 CI/检查、批准、冲突、可合并性、目标分支和存档证据；写入提案并停止等待确认。
10. 对于 `close`，需要关闭原因，将其写入 `decisions.yaml`，并停止等待确认。
11. 对于 `create`，引导用户通过以下三种模式之一：
   - `/hw:pr create`：询问本地工作树更改是否已存在。
   - `/hw:pr create --from-worktree`：检查本地更改、文件范围、`.pipeline/` 路径策略、分支、提交、目标分支、标题/正文、审查者和标签。
   - `/hw:pr create --plan`：移交给 `/hw:plan`，然后在实现和验证后返回到 `/hw:pr create --from-worktree`。
12. 在任何创建远程写入之前，显示一个确认摘要，列出推送分支、创建 Pull Request / Merge Request、审查者写入、标签写入和目标分支写入。

## Interaction Behavior

- 如果缺少 PR/MR URL 或存档 ID，请询问。
- 在实时网络读取之前询问，除非当前分析/网络边界已允许。
- 在推送、创建、合并、关闭、审查者/标签写入或目标分支写入之前始终询问。

## Safety Rules

- `/hw:pr` 不是自动合并机器人。
- `.pipeline/pr/` 是本地证据，不是远程真实来源。
- `inspect` 和 `review` 可以写入本地存档文件，但不能写入远程平台状态。
- PR/MR 载荷默认不得包含 `.pipeline/` 运行时/生成的文件。将 `.pipeline/state.yaml`、`.pipeline/cycle.yaml`、`.pipeline/log.yaml`、`.pipeline/PROGRESS.md`、`.pipeline/prompts/**`、`.pipeline/reports/**`、`.pipeline/archives/**`、紧凑视图和派生健康视为阻塞，除非用户明确要求工作流状态迁移。`.pipeline/pr/**` 作为本地 Change Request 存档例外被允许。
- 远程写入是高风险门控，需要明确的用户确认。
- 在写入证据或生命周期日志之前编辑密钥。
- `/hw:pr create` 可以在确认之前创建本地方案存档，但在用户确认完整的远程写入摘要之前，提供商写入方法不得运行。

## Failure Handling

- 不支持的提供商或格式错误的 URL 应停止并显示清晰的错误。
- 缺少的本地存档 ID 应尽可能列出附近的 `.pipeline/pr/` 候选项。
- 如果 CI/检查、批准或可合并性未知，则说明未知而不是猜测。
- 如果证据包含无法安全编辑的密钥标记，请停止并要求提供清理后的输入。

## Reference Files

- `references/pr-spec.md`
- `references/commands-spec.md`
- `docs/user-guide.md`
- `docs/reference/commands.md`
