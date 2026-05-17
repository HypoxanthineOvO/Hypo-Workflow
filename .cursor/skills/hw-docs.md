---
name: hw-docs
description: "Hypo-Workflow Cursor skill for /hw-docs; use when the user invokes /hw-docs or canonical /hw:docs."
---

# /hw-docs

Canonical command: `/hw:docs`
Cursor command: `/hw-docs`
Route: `docs`
Embedded authority source: `skills/docs/SKILL.md`

## Cursor Execution

1. Treat this file as the command-specific Cursor Skill for the requested `/hw-*` command.
2. Read `.cursor/skills/hypo-workflow.md` when global routing, output-language, or shared runtime rules are needed.
3. Execute the canonical `/hw:docs` semantics using the embedded command authority below and any user-provided arguments.
4. Before writes, inspect `.pipeline/config.yaml`, `.pipeline/cycle.yaml`, `.pipeline/state.yaml`, and `.pipeline/rules.yaml` when present.
5. Do not treat Hypo-Workflow as a runner; Cursor Agent performs the actual work and records evidence in project files when the active command owns those writes.
6. Cursor chooses the active model in the UI/session; treat provider-specific model defaults as non-Cursor examples and do not write or recommend them unless explicitly requested.

## Cursor Reference Resolution

- Local Cursor references live under `.cursor/skills/` and `.cursor/hypo-workflow/`.
- Source-repository paths mentioned by the embedded authority but absent from `.cursor/hypo-workflow/` are external/non-local for Cursor targets.
- Fallback: use the embedded command authority in this file first, then mirrored `.cursor/hypo-workflow/` resources; ask the user for source-repository context only if the missing external reference is required.

## Command Skill Authority

---
name: docs
description: Generate, check, repair, and synchronize Hypo-Workflow documentation without hiding documentation governance inside sync or release.
---

# /hw:docs

当用户调用 `/hw:docs` 或要求生成、检查、修复或同步文档时，使用此技能。

## 输出语言规则

遵循根 Hypo-Workflow 输出语言配置。当 `output.language` 为 `zh-CN` 或 `zh` 时使用中文输出用户可见内容，为 `en` 时使用英文，为 `auto` 时跟随对话语言。

## 指令形式

- `/hw:docs check`
- `/hw:docs repair`
- `/hw:docs generate`
- `/hw:docs sync`

## 契约

文档所有权是明确的：

- README 是简洁的用户入口。
- `docs/user-guide.md` 是完整的用户指南。
- `docs/developer.md` 是开发者指南。
- `docs/platforms/*.md` 是平台指南。
- `docs/reference/*.md` 是生成的参考文档。
- `CHANGELOG.md` 属于发布。
- `LICENSE` 是手动权威；如果缺失，报告该缺口。

## 更新类别

- 托管的 README 块可以自动更新。
- 生成的参考文档可以重新生成。
- 叙述性文档需要显式 `repair` 或确认。

## 安全边界

- 不要将 README 变成开发者测试清单。
- 不要从 `/hw:sync` 或 `/hw:release` 静默重写叙述性文档。
- 发布必须事实核查叙述性文档中的过时命令计数和虚假平台声明。

## 参考文件

- `references/commands-spec.md`
- `references/release-spec.md`
- `references/platform-capabilities.md`
- `templates/readme-spec.md`
