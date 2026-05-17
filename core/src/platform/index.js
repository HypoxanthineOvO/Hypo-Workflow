export const PLATFORM_CAPABILITIES = Object.freeze({
  codex: {
    commands: "skill",
    ask: "chat",
    plan: "codex-plan-tool",
    subagents: "codex-gpt-runtime",
    events: "limited",
    permissions: "environment",
    recovery: "lease-heartbeat",
    handoff_boundaries: "preserve-host-sandbox",
    rules: "skill-files",
    model_routing: "host-gpt-runtime",
    delegation_policy: "Prefer Codex subagents for substantial work; keep testing/review separate from implementation when practical.",
  },
  "claude-code": {
    commands: "plugin-slash+skills",
    ask: "chat",
    plan: "prompt-managed",
    subagents: "available",
    events: "hooks",
    permissions: "claude-settings",
    recovery: "lease-heartbeat-hooks",
    handoff_boundaries: "preserve-claude-permissions",
    rules: "skill-files",
    model_routing: "claude-agents-from-model-pool",
    settings_merge: "managed-settings-local-json",
  },
  opencode: {
    commands: "native-slash",
    ask: "question-tool",
    plan: "todowrite",
    subagents: "native-agents",
    events: "plugin-events",
    permissions: "native-permissions",
    recovery: "lease-heartbeat-plugin-events",
    handoff_boundaries: "preserve-opencode-permissions-auto-continue",
    rules: "AGENTS.md-instructions",
  },
  cursor: {
    commands: "repository-instructions+skills",
    ask: "chat",
    plan: "host-dependent",
    subagents: "host-dependent",
    events: "host-dependent",
    permissions: "host-dependent",
    recovery: "pipeline-files",
    handoff_boundaries: "preserve-host-permissions",
    model_routing: "cursor-ui-session",
    rules: ".cursor/rules/hypo-workflow.mdc",
    skills: ".cursor/skills/hw-*.md",
    commands_dir: ".cursor/commands/hw-*.md",
    resource_bundle: ".cursor/hypo-workflow",
    adapter_target: ".cursor/rules/hypo-workflow.mdc",
  },
  copilot: {
    commands: "repository-instructions",
    ask: "chat",
    plan: "host-dependent",
    subagents: "host-dependent",
    events: "host-dependent",
    permissions: "host-dependent",
    recovery: "pipeline-files",
    handoff_boundaries: "preserve-host-permissions",
    rules: ".github/copilot-instructions.md",
    adapter_target: ".github/copilot-instructions.md",
  },
  trae: {
    commands: "repository-instructions",
    ask: "chat",
    plan: "host-dependent",
    subagents: "host-dependent",
    events: "host-dependent",
    permissions: "host-dependent",
    recovery: "pipeline-files",
    handoff_boundaries: "preserve-host-permissions",
    rules: ".trae/rules/project_rules.md",
    adapter_target: ".trae/rules/project_rules.md",
  },
});

export function capabilityFor(platform) {
  const key = normalizePlatform(platform);
  if (!PLATFORM_CAPABILITIES[key]) {
    throw new Error(`Unsupported platform: ${platform}`);
  }
  return PLATFORM_CAPABILITIES[key];
}

export function normalizePlatform(platform = "codex") {
  const value = String(platform).toLowerCase();
  if (value === "claude") return "claude-code";
  if (value === "open-code") return "opencode";
  return value;
}
