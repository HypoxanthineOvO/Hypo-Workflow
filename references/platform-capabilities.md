# Platform Capabilities

## 中文主体说明

本规格对比 Codex、Claude Code、OpenCode、Cursor、GitHub Copilot 和 Trae 的能力边界。它不定义新的 runner，只说明各平台如何消费同一套 `.pipeline/` contract。平台名、hook、command、agent、config key 和路径保持英文 literal。

Hypo-Workflow remains a single workflow system with platform adapters. OpenCode, Claude Code, Codex, and third-party IDE instruction surfaces consume the same `.pipeline/` file contract at different levels of native capability.

## Capability Matrix

| Capability | Codex | Claude Code | OpenCode | Cursor | GitHub Copilot | Trae |
|---|---|---|---|---|---|---|
| User command surface | `/hw:*` skill invocation | `/hw:*` plugin slash commands backed by Skills | `/hw-*` native slash commands | repository instructions | repository instructions | repository instructions |
| Instruction surface | `SKILL.md` + rules files | Claude plugin `commands/`, skills, hooks, and agents | OpenCode command/agent files plus plugin context | `.cursor/rules/hypo-workflow.mdc` | `.github/copilot-instructions.md` | `.trae/rules/project_rules.md` |
| Interactive questions | Direct chat or Codex UI prompts where available | Direct chat / tool prompts where available | Native `question` tool | chat | chat | chat |
| Plan tool / todos | Codex plan tool, best-effort discipline | Prompt-managed plan/checklists | Native `todowrite` | host dependent | host dependent | host dependent |
| Subagents | Codex/GPT runtime workers | Claude subagents where configured | Native agents and subagents | host dependent | host dependent | host dependent |
| Hooks/events | `notify` only from HW side | Claude hooks | Plugin events | not claimed | not claimed | not claimed |
| Recovery signal | Structured lease + heartbeat + continuation files | Structured lease + heartbeat/hooks | Structured lease + heartbeat/plugin events | `.pipeline/` files | `.pipeline/` files | `.pipeline/` files |
| Rules/instructions | skill/rules files | plugin context | `AGENTS.md`, instructions, plugin context | generated rule | generated instruction | generated rule |
| Model routing | Host GPT runtime only | Claude agent model declarations | Native provider/model/variant config | host dependent | host dependent | host dependent |

Third-party IDE adapters are instruction surfaces, not runners or hook enforcers.

## No degradation

V9 must not degrade Codex or Claude Code.

- Existing `/hw:*` command behavior remains valid across hosts; Claude Code gets that namespace from the plugin name.
- Shared workflow semantics stay in common specs and generated skill content, not in an OpenCode-only runner.
- OpenCode-only features are additive adapter capabilities. They may improve Ask, todowrite, hooks, and permissions on OpenCode, but cannot become required for Codex/Claude execution.
- Codex/OpenCode/Claude handoff must preserve the strictest permission, network, destructive/external-side-effect, and auto-continue boundaries. Handoff may not widen permissions without explicit confirmation.
- Codex Subagent guidance must stay inside Codex/GPT runtime assumptions. It must not require DeepSeek, Mimo, Claude, or other external model routing.
- Cursor, Copilot, and Trae adapters must not claim lifecycle hook enforcement unless a later implementation adds real host support.
- New `core/` helpers must emit the same `.pipeline/` contracts currently consumed by Codex and Claude Code.
- Regression tests continue to validate existing scenarios before OpenCode-specific smoke tests are considered green.

## Adapter Responsibilities

| Layer | Codex adapter | Claude Code adapter | OpenCode adapter |
|---|---|---|---|
| Command rendering | Keep root `SKILL.md` and child skills. | Generate plugin-root `commands/*.md` and keep child Skills authoritative. | Generate `.opencode/commands/*.md`. |
| Context bootstrap | Read compact/runtime files through skill policy. | SessionStart hook loads runtime files. | Plugin injects compact runtime files and current command context. |
| Interactive gates | Ask user in chat and wait. | Ask user in chat/tool flow and wait. | Use `question` tool whenever interaction is required. |
| Plan discipline | Strengthen prompt instructions to use the available plan tool. | Strengthen prompt instructions and checkpoints. | Bind `/hw-plan*` to `hw-plan` and require `todowrite`. |
| Auto continue | Respect `evaluation.auto_continue`; limited by host support. | Respect existing hooks and watchdog. | Use OpenCode events with safe default enabled. |

## Installation and Sync Responsibilities

README should stay platform-neutral: it explains shared `.pipeline/` workflow behavior and links to platform guides. Concrete install commands belong in `docs/platforms/*.md` so platform-specific support does not get blurred.

| Platform | Concrete setup lives in | What setup may write |
|---|---|---|
| Codex | `docs/platforms/codex.md` | local Codex skill source under `$CODEX_HOME/skills` or a development symlink |
| Claude Code | `docs/platforms/claude-code.md` | plugin validation/install instructions, project-local `.claude/` settings/hooks/agents/monitors from sync |
| OpenCode | `docs/platforms/opencode.md` | `.opencode/` commands, agents, plugin/status/TUI files, root `opencode.json`, `AGENTS.md` |
| Cursor | `docs/platforms/cursor.md` | `.cursor/rules/hypo-workflow.mdc` |
| GitHub Copilot | `docs/platforms/copilot.md` | `.github/copilot-instructions.md` |
| Trae | `docs/platforms/trae.md` | `.trae/rules/project_rules.md` |

Claude Code has two distinct plugin flows:

- Hypo-Workflow plugin: exposes the `hw` namespace and `/hw:*` skills.
- Official OpenAI Codex plugin: optional implementation delegation inside Claude Code. It uses `/plugin marketplace add openai/codex-plugin-cc`, `/plugin install codex@openai-codex`, `/reload-plugins`, and `/codex:setup`; Hypo-Workflow may propose these commands but must not execute them automatically.

## Third-Party Adapter Targets

| Platform | Target | Contract |
|---|---|---|
| Cursor | `.cursor/rules/hypo-workflow.mdc` | Project rule that explains install/import, `/hw:*`, `.pipeline/`, protected files, and Subagent/test separation guidance. |
| GitHub Copilot | `.github/copilot-instructions.md` | Repository custom instructions with the same workflow contract. |
| Trae | `.trae/rules/project_rules.md` | Conservative Markdown rule file with the same workflow contract. |

## Open Questions Deferred Past M0

- Exact TypeScript API shape for generated OpenCode plugin code.
- Whether OpenCode model variants are sufficient for every HW model-router use case.
- Whether MCP should be configured by `/hw:setup` in V9 or kept as a later optional pack.
