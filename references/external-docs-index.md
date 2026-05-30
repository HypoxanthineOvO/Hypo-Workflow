# External Docs Index

## 中文主体说明

本索引用于记录需要外部核验的官方文档入口。修改平台 adapter、生成配置、model routing、MCP/docs lookup 或 OpenCode/Claude/Codex 兼容行为前，Agent 应优先查这些官方来源。表格中的 URL、provider、model、config、CLI flag 和路径保持英文原文。

Last verified: 2026-05-02.

This index records external official documentation surfaces that Hypo-Workflow agents should consult before changing platform adapters, generated config, model routing, or documentation lookup behavior. It is a lookup map, not a vendored copy of external docs.

## OpenCode

| Surface | Official source | Use in Hypo-Workflow |
|---|---|---|
| Config schema and precedence | https://opencode.ai/docs/config/ | Validate which fields may live in project-root `opencode.json`, how global/project/inline config merges, and why HW-only metadata belongs in `.opencode/hypo-workflow.json`. |
| Config JSON schema | https://opencode.ai/config.json | Check generated `opencode.json` compatibility before adding OpenCode-native config fields. |
| Agents and subagents | https://opencode.ai/docs/agents/ | Confirm primary/subagent modes, agent markdown/frontmatter options, permissions, model overrides, and task permissions before changing generated `.opencode/agents/*.md`. |
| Models | https://opencode.ai/docs/models/ | Confirm provider-qualified model IDs, variants, and per-model options before changing the model matrix or TUI model display. |
| Providers | https://opencode.ai/docs/providers/ | Confirm provider configuration and custom provider shape before adding provider defaults. |
| CLI | https://opencode.ai/docs/cli/ | Confirm `opencode models --refresh`, `opencode run`, `opencode serve`, and `--model provider/model` behavior used by smoke tests and docs. |
| Server HTTP API | https://opencode.ai/docs/server/ | Confirm `opencode serve`, OpenAPI endpoint behavior, auth environment variables, and API groups before adding programmatic integrations. |
| SDK | https://opencode.ai/docs/sdk/ | Confirm generated SDK usage when replacing raw HTTP calls or building dashboard/server integrations. |
| Plugins | https://opencode.ai/docs/plugins/ | Confirm plugin events, hooks, and custom tool extension points before editing `.opencode/plugins/hypo-workflow.ts`. |
| TUI plugins | https://opencode.ai/docs/tui/ | Confirm TUI extension behavior before reintroducing generated TUI slot plugins; VSP OpenCode uses built-in Workflow UI, so the legacy `plugin-tui.tsx` / `tui.json` path is disabled. |
| MCP servers | https://opencode.ai/docs/mcp-servers/ | Confirm local/remote MCP config, context cost caveats, headers, OAuth, and docs lookup patterns. |
| Context7 MCP example | https://opencode.ai/docs/mcp-servers/#context7 | Use as the official OpenCode-backed pattern for on-demand documentation lookup through `context7`, including optional `CONTEXT7_API_KEY`. |
| Slash commands | https://opencode.ai/docs/commands/ | Confirm `.opencode/commands/*.md` command behavior before changing `/hw-*` generation. |
| Tools | https://opencode.ai/docs/tools/ | Confirm `question` and `todowrite` availability and behavior before changing Plan Mode discipline. |
| Permissions | https://opencode.ai/docs/permissions/ | Confirm allow/ask/deny behavior before changing file guard or analysis boundary defaults. |
| Rules/instructions | https://opencode.ai/docs/rules/ | Confirm `AGENTS.md` and instruction loading before changing generated instruction surfaces. |

## Model Lookup Policy

- Prefer official vendor or platform documentation for unstable fields such as provider IDs, model IDs, API schemas, CLI flags, and extension points.
- Do not infer OpenCode schema support from Hypo-Workflow private metadata. Generated root `opencode.json` must stay within OpenCode-supported config fields.
- Treat `.opencode/hypo-workflow.json` as the HW sidecar for private sync metadata such as role model matrix, command map, file guard, and auto-continue policy.
- Use Context7/MCP as an optional documentation lookup channel, not as a required runtime dependency.

## Related Internal References

- `references/opencode-spec.md`
- `references/opencode-command-map.md`
- `references/opencode-parity.md`
- `references/platform-capabilities.md`
- `references/v9-architecture.md`
- `.pipeline/architecture.md`
