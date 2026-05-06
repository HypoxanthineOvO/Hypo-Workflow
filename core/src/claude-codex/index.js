const DEFAULT_PLUGIN_NAME = "codex@openai-codex";
const DEFAULT_MIN_VERSION = "0.4.0";
const OFFICIAL_CODEX_PLUGIN_IDENTIFIERS = Object.freeze([
  "codex@openai-codex",
  "@openai/codex-plugin-cc",
  "openai/codex-plugin-cc",
]);

export async function detectClaudeCodexPluginCapability(options = {}) {
  const command = options.command || "claude";
  const pluginName = options.pluginName || DEFAULT_PLUGIN_NAME;
  const minVersion = options.minVersion || DEFAULT_MIN_VERSION;
  const evidence = {
    command: { name: command },
    plugin: { name: pluginName },
    required_min_version: minVersion,
  };

  if (typeof options.runCommand !== "function") {
    return capability("command_unavailable", evidence, "No command runner was provided.");
  }

  let versionResult;
  try {
    versionResult = await options.runCommand(command, ["--version"]);
  } catch (error) {
    if (isCommandUnavailable(error)) {
      evidence.command.error = error.message;
      return capability("command_unavailable", evidence, "Claude Code command is unavailable.");
    }
    evidence.command.error = error.message;
    return capability("command_unavailable", evidence, "Claude Code command could not be inspected.");
  }

  evidence.command.path = versionResult.path || versionResult.commandPath || "";
  evidence.command.version = parseVersion(`${versionResult.stdout || ""}\n${versionResult.stderr || ""}`);

  let listResult;
  try {
    listResult = await options.runCommand(command, ["plugin", "list", "--json"]);
  } catch (error) {
    if (isCommandUnavailable(error)) {
      evidence.command.error = error.message;
      return capability("command_unavailable", evidence, "Claude Code plugin command is unavailable.");
    }
    evidence.plugin.error = error.message;
    return capability("missing", evidence, "Codex plugin could not be found from Claude Code plugin list.");
  }

  const plugins = parsePluginList(listResult.stdout);
  const plugin = plugins.find((item) => pluginMatches(item, pluginName));
  if (!plugin) return capability("missing", evidence, "Official OpenAI Codex plugin is not installed.");

  evidence.plugin.matched_identity = pluginIdentity(plugin);
  evidence.plugin.matched_identifiers = pluginIdentifiers(plugin);
  evidence.plugin.version = plugin.version || "";
  evidence.plugin.path = plugin.path || plugin.location || "";
  if (compareVersions(evidence.plugin.version, minVersion) < 0) {
    return capability("unsupported_version", evidence, `Codex plugin version ${evidence.plugin.version || "unknown"} is below ${minVersion}.`);
  }

  return capability("installed", evidence, "Official OpenAI Codex plugin is installed and supported.");
}

export function renderClaudeCodexInstallProposal(options = {}) {
  const target = options.target || "Claude Code official OpenAI Codex plugin";
  const commands = options.commands || [
    "/plugin marketplace add openai/codex-plugin-cc",
    "/plugin install codex@openai-codex",
    "/reload-plugins",
    "/codex:setup",
  ];
  const command = options.command || commands.join("\n");
  const commandKind = options.commandKind || "claude_slash_commands";
  const scope = options.scope || "user";
  const sideEffects = options.externalSideEffects || [
    "contacts the Claude Code plugin source or marketplace",
    "writes Claude Code plugin metadata in the selected scope",
    "may download OpenAI Codex plugin package assets",
  ];
  const rollback = options.rollback || [
    "remove the plugin with the matching Claude Code plugin uninstall command",
    "fall back to Claude Code native planning/review/test agents",
    "run implementation in the current worker when Codex capability remains unavailable",
  ];

  return {
    target,
    command,
    command_kind: commandKind,
    commands,
    scope,
    shell_command: false,
    requires_confirmation: true,
    default_action: "do_not_execute",
    external_side_effects: sideEffects,
    rollback_fallback: rollback,
    markdown: [
      "## Claude Code Codex Plugin Install Proposal",
      "",
      `Target: ${target}`,
      "Commands:",
      ...commands.map((item) => `- \`${item}\``),
      `Scope: ${scope}`,
      "Requires explicit confirmation: yes",
      "Default action: do not execute",
      "",
      "External side effects:",
      ...sideEffects.map((item) => `- ${item}`),
      "",
      "Rollback/fallback:",
      ...rollback.map((item) => `- ${item}`),
    ].join("\n"),
  };
}

export function buildClaudeCodexPlanningProfiles() {
  return {
    premium: {
      planning: "claude",
      implementation: "codex",
      review: "claude",
      test: "claude",
      intent: "Use Codex only for implementation while keeping planning, review, and test judgment in Claude Code.",
    },
    balanced: {
      planning: "claude",
      implementation: "codex",
      review: "claude",
      test: "claude",
      intent: "Delegate scoped implementation to Codex when configured and available.",
    },
    cost_saver: {
      planning: "claude",
      implementation: "codex",
      review: "claude",
      test: "claude",
      intent: "Prefer Codex implementation delegation for eligible scoped edits.",
    },
  };
}

export function planClaudeCodexDelegation(options = {}) {
  const profiles = buildClaudeCodexPlanningProfiles();
  const profileName = profiles[options.profile] ? options.profile : "balanced";
  const profile = profiles[profileName];
  const capabilityPresent = options.capability?.status === "installed";
  const configured = options.configured === true;

  const plan = {
    profile: profileName,
    configured,
    capability_status: options.capability?.status || "unknown",
    planning: route(profile.planning, "planning stays in Claude Code"),
    review: route(profile.review, "review stays separated from implementation"),
    test: route(profile.test, "test validation stays separated from implementation"),
  };

  if (profile.implementation === "codex" && capabilityPresent && configured) {
    plan.implementation = {
      delegate_to: "codex",
      requires_capability: "installed",
      reason: "codex capability present and configured",
    };
  } else if (profile.implementation === "codex" && !capabilityPresent) {
    plan.implementation = {
      delegate_to: "claude",
      requires_capability: "installed",
      reason: "codex capability unavailable",
    };
  } else {
    plan.implementation = {
      delegate_to: "claude",
      requires_capability: "installed",
      reason: configured ? "codex delegation disabled by profile" : "codex delegation not configured",
    };
  }

  return plan;
}

export function validateClaudeCodexWorkerOwnership(options = {}) {
  const workers = Array.isArray(options.workers) ? options.workers : [];
  if (options.capability?.status !== "installed" && workers.length > 1) {
    return {
      valid: true,
      mode: "single_worker",
      errors: [],
      workers: workers.slice(0, 1),
      reason: "Codex capability missing; multi-worker delegation falls back to one worker.",
    };
  }

  const claims = [];
  for (const worker of workers) {
    for (const file of worker.files || []) claims.push({ worker: worker.id, type: "file", value: normalizeClaim(file) });
    for (const module of worker.modules || []) claims.push({ worker: worker.id, type: "module", value: normalizeClaim(module) });
  }

  const errors = [];
  for (let i = 0; i < claims.length; i += 1) {
    for (let j = i + 1; j < claims.length; j += 1) {
      const left = claims[i];
      const right = claims[j];
      if (left.worker === right.worker) continue;
      if (claimsOverlap(left, right)) {
        errors.push(`ownership overlap between ${left.worker} (${left.value}) and ${right.worker} (${right.value})`);
      }
    }
  }

  if (errors.length > 0) return { valid: false, mode: "rejected", errors, workers };
  return { valid: true, mode: workers.length > 1 ? "multi_worker" : "single_worker", errors: [], workers };
}

function capability(status, evidence, message) {
  return {
    status,
    capability_present: status === "installed",
    evidence,
    message,
    side_effects: [],
  };
}

function route(delegateTo, reason) {
  return { delegate_to: delegateTo, reason };
}

function parsePluginList(source = "") {
  try {
    const parsed = JSON.parse(source || "[]");
    if (Array.isArray(parsed)) return parsed;
    if (Array.isArray(parsed.plugins)) return parsed.plugins;
    return [];
  } catch {
    return source
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [name, version] = line.split(/\s+/);
        return { name, version };
      });
  }
}

function pluginMatches(plugin = {}, expected) {
  const names = new Set(pluginIdentityIdentifiers(plugin));
  if (names.has(String(expected || "").trim())) return true;
  if (expected === "codex@openai-codex") {
    return OFFICIAL_CODEX_PLUGIN_IDENTIFIERS.some((identifier) => names.has(identifier));
  }
  return false;
}

function pluginIdentityIdentifiers(plugin = {}) {
  return [
    plugin.name,
    plugin.id,
    plugin.package,
    plugin.slug,
  ].filter(Boolean).map((item) => String(item).trim()).filter(Boolean);
}

function pluginIdentifiers(plugin = {}) {
  return [
    ...pluginIdentityIdentifiers(plugin),
    plugin.displayName,
  ].filter(Boolean).map((item) => String(item).trim()).filter(Boolean);
}

function pluginIdentity(plugin = {}) {
  return pluginIdentityIdentifiers(plugin)[0] || "";
}

function isCommandUnavailable(error) {
  return ["ENOENT", "EACCES"].includes(error?.code);
}

function parseVersion(source) {
  const match = String(source).match(/\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?/);
  return match ? match[0] : "";
}

function compareVersions(left, right) {
  const a = versionParts(left);
  const b = versionParts(right);
  for (let i = 0; i < Math.max(a.length, b.length); i += 1) {
    const diff = (a[i] || 0) - (b[i] || 0);
    if (diff !== 0) return diff > 0 ? 1 : -1;
  }
  return 0;
}

function versionParts(version) {
  return String(version)
    .split(/[.-]/)
    .slice(0, 3)
    .map((part) => Number.parseInt(part, 10) || 0);
}

function normalizeClaim(value) {
  const cleaned = String(value || "")
    .trim()
    .replace(/\\/g, "/")
    .replace(/\/+/g, "/")
    .toLowerCase();
  const segments = [];
  for (const segment of cleaned.split("/")) {
    if (!segment || segment === ".") continue;
    if (segment === "..") {
      if (segments.length > 0 && segments.at(-1) !== "..") {
        segments.pop();
      } else {
        segments.push(segment);
      }
      continue;
    }
    segments.push(segment);
  }
  return segments.join("/");
}

function claimsOverlap(left, right) {
  if (!left.value || !right.value) return false;
  if (left.value === right.value) return true;
  if (left.type === "module" && right.value.startsWith(`${left.value}/`)) return true;
  if (right.type === "module" && left.value.startsWith(`${right.value}/`)) return true;
  return false;
}
