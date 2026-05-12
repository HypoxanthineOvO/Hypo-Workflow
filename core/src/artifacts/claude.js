import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { renderClaudeStatusMonitorManifest } from "../claude-status/index.js";
import { planClaudeCodexDelegation } from "../claude-codex/index.js";
import { commandMap } from "../commands/index.js";
import { buildModelPoolClaudeAgents, loadConfig } from "../config/index.js";

const HW_VERSION = "12.5.1";

export async function writeClaudeCodePluginArtifacts(outDir = ".", options = {}) {
  const pluginDir = join(outDir, ".claude-plugin");
  const monitorsDir = join(outDir, "monitors");
  const commands = commandMap("claude-code");
  await mkdir(pluginDir, { recursive: true });
  await mkdir(monitorsDir, { recursive: true });

  await writeFile(
    join(pluginDir, "plugin.json"),
    `${JSON.stringify(renderClaudeCodePluginManifest(options), null, 2)}\n`,
    "utf8",
  );
  await writeFile(
    join(pluginDir, "marketplace.json"),
    `${JSON.stringify(renderClaudeCodeMarketplaceManifest(options), null, 2)}\n`,
    "utf8",
  );
  await writeFile(
    join(monitorsDir, "monitors.json"),
    `${JSON.stringify(renderClaudeStatusMonitorManifest(), null, 2)}\n`,
    "utf8",
  );
  const writtenCommands = await writeClaudeCodeSlashCommandArtifacts(outDir, commands);
  const removedAliases = await removeLegacyClaudeAliasSkills(outDir);

  return {
    plugin_dir: ".claude-plugin",
    namespace: "hw",
    command_namespace: "/hw",
    command_count: writtenCommands.length,
    skill_count: commands.length,
    skills_dir: "skills",
    commands_dir: "commands",
    written_commands: writtenCommands,
    monitors_file: "monitors/monitors.json",
    removed_legacy_aliases: removedAliases,
  };
}

async function writeClaudeCodeSlashCommandArtifacts(outDir, commands) {
  const written = [];
  for (const command of commands) {
    const relative = claudeSlashCommandRelativePath(command);
    if (!relative) continue;
    const absolute = join(outDir, relative);
    await mkdir(dirname(absolute), { recursive: true });
    await writeFile(absolute, renderClaudeCodeSlashCommand(command), "utf8");
    written.push(relative);
  }
  return written;
}

function claudeSlashCommandRelativePath(command) {
  const canonical = String(command.canonical || "");
  if (!canonical.startsWith("/hw:")) return null;
  const commandName = canonical.slice("/hw:".length).trim();
  if (!commandName || /\s/.test(commandName)) return null;
  const parts = commandName.split(":").filter(Boolean);
  if (parts.length === 0) return null;
  return join("commands", ...parts.slice(0, -1), `${parts.at(-1)}.md`);
}

export function renderClaudeCodeSlashCommand(command = {}) {
  return [
    "---",
    `description: Hypo-Workflow mapping for ${command.canonical}`,
    "hypo_workflow_managed: true",
    "---",
    "",
    `# ${command.canonical}`,
    "",
    `Canonical command: \`${command.canonical}\``,
    `Route: \`${command.route}\``,
    `Skill: \`${command.skill}\``,
    "",
    `Load the corresponding Hypo-Workflow skill instructions from \`${command.skill}\`, then execute \`${command.canonical}\` semantics with any user-provided arguments.`,
    "",
    "Before acting, inspect the relevant context when present:",
    "",
    "- `.pipeline/config.yaml`",
    "- `.pipeline/cycle.yaml`",
    "- `.pipeline/state.yaml`",
    "- `.pipeline/rules.yaml`",
    "- current prompt/report files for pipeline commands",
    "- open patches for Patch commands",
    "",
    "Keep this command as a Claude Code plugin slash-command mapping, not a separate runner. Claude Code performs the work; Hypo-Workflow files remain the source of truth.",
    "",
  ].join("\n");
}

async function removeLegacyClaudeAliasSkills(outDir) {
  const removed = [];
  for (const command of commandMap("claude-code")) {
    const alias = legacyClaudeAliasName(command);
    const skillDir = join(outDir, "skills", alias);
    const skillFile = join(skillDir, "SKILL.md");
    const existing = await readOptionalText(skillFile);
    if (!existing || !/Thin Claude Code alias/i.test(existing)) continue;
    await rm(skillDir, { recursive: true, force: true });
    removed.push(`skills/${alias}`);
  }
  return removed;
}

function legacyClaudeAliasName(command) {
  return String(command.canonical || "")
    .replace(/^\//, "")
    .replace(/[:\s]+/g, "-");
}

const CLAUDE_AGENT_ROLES = Object.freeze([
  "plan",
  "code",
  "test",
  "review",
  "debug",
  "docs",
  "report",
  "compact",
]);

export async function writeClaudeCodeAgentArtifacts(outDir = ".", options = {}) {
  const config = options.configFile ? await loadConfig(options.configFile) : options.config;
  const metadata = buildClaudeAgentRoutingMetadata(config || {});
  const agentsDir = join(outDir, ".claude", "agents");
  await mkdir(agentsDir, { recursive: true });

  const written = [];
  const conflicts = [];
  for (const role of CLAUDE_AGENT_ROLES) {
    const relative = `.claude/agents/hw-${role}.md`;
    const path = join(outDir, relative);
    const existing = await readOptionalText(path);
    if (existing && !isManagedClaudeAgent(existing)) {
      conflicts.push({ path: relative, reason: "user-owned-agent" });
      continue;
    }
    await writeFile(path, renderClaudeCodeAgent(role, metadata.agents[role]), "utf8");
    written.push(relative);
  }

  const result = {
    agent_count: CLAUDE_AGENT_ROLES.length,
    written,
    conflicts,
    agents: metadata.agents,
    metadata_file: ".claude/hypo-workflow-agents.json",
  };
  await writeFile(
    join(outDir, ".claude", "hypo-workflow-agents.json"),
    `${JSON.stringify({ ...metadata, conflicts }, null, 2)}\n`,
    "utf8",
  );
  return result;
}

export function buildClaudeAgentRoutingMetadata(config = {}) {
  const agents = buildModelPoolClaudeAgents(config);
  const codexPluginConfig = config.claude_code?.codex_plugin || {};
  const codexConfigured = codexPluginConfig.enabled === true;
  const codexCapability = normalizeCodexPluginCapability(codexPluginConfig);
  return {
    source: "model_pool+claude_code",
    routing: "declaration-first",
    codex_plugin: {
      configured: codexConfigured,
      profile: codexPluginConfig.profile || "balanced",
      capability_status: codexCapability.status,
      capability_source: codexCapability.source,
      capability_detection: [
        "installed",
        "missing",
        "command_unavailable",
        "unsupported_version",
      ],
      delegation: planClaudeCodexDelegation({
        profile: codexPluginConfig.profile || "balanced",
        configured: codexConfigured,
        capability: codexCapability,
      }),
    },
    dynamic_selection: {
      task_category: {
        documentation: "docs",
        implementation: "code",
        testing: "test",
        review: "review",
        debug: "debug",
        report: "report",
        compact: "compact",
      },
      test_profile: {
        webapp: "test",
        "agent-service": "test",
        research: "docs",
      },
      failure_state: {
        test_failure: "debug",
        runtime_error: "debug",
        docs_gap: "docs",
      },
    },
    agents,
  };
}

function normalizeCodexPluginCapability(config = {}) {
  if (config.capability && typeof config.capability === "object") {
    return {
      ...config.capability,
      status: config.capability.status || "missing",
      source: config.capability.source || "provided",
    };
  }
  if (config.capability_status) {
    return {
      status: config.capability_status,
      source: "configured_status",
    };
  }
  return {
    status: "missing",
    source: "not_detected",
  };
}

export function renderClaudeCodeAgent(role, agent = {}) {
  const name = `hw-${role}`;
  const model = agent.model || "default";
  return `---\nname: ${name}\ndescription: Hypo-Workflow Claude Code ${role} subagent.\nmodel: ${model}\nhypo_workflow_managed: true\n---\n\n# ${name}\n\nRole: \`${role}\`\nModel: \`${model}\`\n\nUse this Claude Code subagent for Hypo-Workflow ${role} work. The model is generated from the shared \`model_pool.roles\` contract, refined by \`claude_code.agents.${role}.model\` when explicitly configured.\n\nDo not call models directly from Hypo-Workflow core. Claude Code remains responsible for actual model invocation; this file only declares routing intent.\n`;
}

export function selectClaudeAgentRole(context = {}) {
  const failure = String(context.failure_state || "").toLowerCase();
  if (Number(context.retry_count || 0) > 0 && ["test_failure", "runtime_error", "failed"].includes(failure)) {
    return { role: "debug", reason: "retry/failure state favors debug" };
  }

  const profile = String(context.test_profile || "").toLowerCase();
  if (["webapp", "agent-service"].includes(profile)) return { role: "test", reason: `${profile} test profile requires validation` };
  if (profile === "research") return { role: "docs", reason: "research profile favors docs/evidence" };

  const category = String(context.task_category || context.category || "").toLowerCase();
  if (/doc|guide|readme/.test(category)) return { role: "docs", reason: "documentation task" };
  if (/test|qa|validation/.test(category)) return { role: "test", reason: "test task" };
  if (/review|audit/.test(category)) return { role: "review", reason: "review task" };
  if (/debug|bug|failure/.test(category)) return { role: "debug", reason: "debug task" };
  if (/report|release/.test(category) || /report|release/i.test(context.milestone_name || "")) return { role: "report", reason: "report task" };
  if (/compact|context/.test(category)) return { role: "compact", reason: "compact task" };
  if (/implement|code|build/.test(category)) return { role: "code", reason: "implementation task" };
  return { role: "plan", reason: "default planning role" };
}

async function readOptionalText(path) {
  try {
    return await readFile(path, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") return "";
    throw error;
  }
}

function isManagedClaudeAgent(source) {
  return /^hypo_workflow_managed:\s*true$/m.test(source);
}

export function renderClaudeCodePluginManifest(options = {}) {
  return {
    name: "hw",
    version: options.version || HW_VERSION,
    description: "Hypo-Workflow for Claude Code. The plugin namespace is intentionally `hw`; plugin-root commands map /hw:* to existing workflow Skills.",
    author: {
      name: "Hypoxanthine",
      url: "https://github.com/HypoxanthineOvO",
    },
    homepage: "https://github.com/HypoxanthineOvO/Hypo-Workflow",
    license: "MIT",
    keywords: [
      "hypo-workflow",
      "workflow",
      "planning",
      "tdd",
      "prompt-engineering",
      "ai-agent",
      "status",
      "claude-code",
      "codex",
      "opencode",
    ],
    skills: "./skills/",
    monitors: "./monitors/monitors.json",
  };
}

export function renderClaudeCodeMarketplaceManifest(options = {}) {
  return {
    name: "hypoxanthine-hypo-workflow",
    owner: {
      name: "Hypoxanthine",
    },
    metadata: {
      description: "Official Hypo-Workflow marketplace for Claude Code installation.",
    },
    plugins: [
      {
        name: "hw",
        source: "./",
        version: options.version || HW_VERSION,
      description: "Hypo-Workflow Claude Code plugin. Uses the `hw` namespace so plugin-root commands expose /hw:* backed by existing Skills.",
        author: {
          name: "Hypoxanthine",
          url: "https://github.com/HypoxanthineOvO",
        },
        license: "MIT",
        homepage: "https://github.com/HypoxanthineOvO/Hypo-Workflow",
        tags: [
          "hypo-workflow",
          "claude-code",
          "workflow",
          "planning",
          "tdd",
          "release",
        ],
      },
    ],
  };
}
