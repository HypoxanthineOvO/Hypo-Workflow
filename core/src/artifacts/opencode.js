import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { normalizeAnalysisInteraction } from "../analysis/index.js";
import { commandMap } from "../commands/index.js";
import { DEFAULT_GLOBAL_CONFIG, buildModelPoolOpenCodeAgents, mergeConfig, normalizeExecutionBashPolicy } from "../config/index.js";
import { normalizeProfile, selectProfile } from "../profile/index.js";
import {
  loadStructuredRulesAuthority,
  renderStructuredRulesInstructionBlock,
  writeStructuredHabitsDocument,
} from "../rules/index.js";
import { ASK_QUESTIONS_GUIDANCE, renderDeepSeekToolCallingRules } from "./agent-guidance.js";

const HW_VERSION = "12.8.1";
const MODULE_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(MODULE_DIR, "..", "..", "..");

export const OPENCODE_AGENTS = Object.freeze([
  {
    name: "hw-plan",
    modelRole: "plan",
    mode: "primary",
    tools: ["read", "grep", "glob", "question", "todowrite"],
    description: "Plan, discovery, guide, and confirmation work.",
  },
  {
    name: "hw-build",
    modelRole: "code-a",
    mode: "primary",
    tools: ["read", "grep", "glob", "edit", "bash", "todowrite"],
    description: "Pipeline execution, patch fix, debug, release, and showcase generation.",
  },
  {
    name: "hw-status",
    mode: "primary",
    tools: ["read", "grep", "glob"],
    description: "Status, help, log, compact, check, and rules inspection.",
  },
  {
    name: "hw-compact",
    modelRole: "compact",
    mode: "primary",
    tools: ["read", "grep", "glob", "edit", "todowrite"],
    description: "Context compaction and compact summary generation.",
  },
  {
    name: "hw-test",
    modelRole: "test",
    mode: "subagent",
    tools: ["read", "grep", "glob", "bash", "todowrite"],
    description: "Test design, execution, and focused validation.",
  },
  {
    name: "hw-code-a",
    modelRole: "code-a",
    mode: "subagent",
    tools: ["read", "grep", "glob", "edit", "bash", "todowrite"],
    description: "Primary implementation worker for scoped code changes.",
  },
  {
    name: "hw-code-b",
    modelRole: "code-b",
    mode: "subagent",
    tools: ["read", "grep", "glob", "edit", "bash", "todowrite"],
    description: "Secondary implementation worker for parallel scoped code changes.",
  },
  {
    name: "hw-report",
    modelRole: "report",
    mode: "primary",
    tools: ["read", "grep", "glob", "todowrite"],
    description: "Report synthesis, evidence summaries, and final delivery notes.",
  },
  {
    name: "hw-review",
    modelRole: "debug",
    mode: "subagent",
    tools: ["read", "grep", "glob", "todowrite"],
    description: "Audit, review, and architecture drift analysis.",
  },
  {
    name: "hw-explore",
    mode: "subagent",
    tools: ["read", "grep", "glob"],
    description: "Bounded codebase exploration.",
  },
  {
    name: "hw-debug",
    modelRole: "debug",
    mode: "subagent",
    tools: ["read", "grep", "glob", "bash", "todowrite", "question"],
    description: "Symptom-driven debugging with hypothesis tracking and user Ask gates.",
  },
  {
    name: "hw-docs",
    modelRole: "docs",
    mode: "subagent",
    tools: ["read", "grep", "glob", "edit", "todowrite"],
    description: "Documentation, showcase, and release-note assistance.",
  },
]);

export async function writeOpenCodeArtifacts(outDir, options = {}) {
  const profile = normalizeArtifactProfile(options);
  const adapterDir = outDir.endsWith(".opencode") ? outDir : join(outDir, ".opencode");
  const projectRoot = dirname(adapterDir);
  const rootConfig = renderOpenCodeConfig(profile, { includePlugins: true });
  const tuiConfig = renderOpenCodeTuiConfig();
  const adapterConfig = renderOpenCodeConfig(profile, { includePlugins: false });
  await mkdir(join(adapterDir, "commands"), { recursive: true });
  await mkdir(join(adapterDir, "agents"), { recursive: true });
  await mkdir(join(adapterDir, "plugins"), { recursive: true });
  await mkdir(join(adapterDir, "runtime"), { recursive: true });
  await mkdir(join(adapterDir, "tui"), { recursive: true });
  await rm(join(adapterDir, "plugins", "hypo-workflow.js"), { force: true });
  await rm(join(adapterDir, "plugins", "hypo-workflow-status.js"), { force: true });
  await rm(join(adapterDir, "plugins", "hypo-workflow-tui.tsx"), { force: true });
  await rm(join(adapterDir, "commands", "hw-dashboard.md"), { force: true });

  for (const command of commandMap("opencode")) {
    await writeFile(
      join(adapterDir, "commands", `${command.opencode.slice(1)}.md`),
      renderCommand(command),
      "utf8",
    );
  }

  for (const agent of renderableOpenCodeAgents(profile)) {
    await writeFile(join(adapterDir, "agents", `${agent.name}.md`), renderAgent(agent, profile), "utf8");
  }

  await writeFile(join(adapterDir, "opencode.json"), `${JSON.stringify(adapterConfig, null, 2)}\n`, "utf8");
  await writeFile(join(adapterDir, "hypo-workflow.json"), `${JSON.stringify(renderHypoWorkflowMetadata(profile), null, 2)}\n`, "utf8");
  await writeFile(join(projectRoot, "opencode.json"), `${JSON.stringify(injectCommands(rootConfig), null, 2)}\n`, "utf8");
  await writeFile(join(projectRoot, "tui.json"), `${JSON.stringify(tuiConfig, null, 2)}\n`, "utf8");
  const rulesAuthority = await loadArtifactRulesAuthority(projectRoot, options);
  if (rulesAuthority) {
    await writeStructuredHabitsDocument(projectRoot, REPO_ROOT, {
      ...options,
      authority: rulesAuthority,
      title: "Hypo-Workflow Habits",
    });
  }
  await writeFile(join(projectRoot, "AGENTS.md"), await renderAgentsInstruction(projectRoot, { ...options, rulesAuthority }), "utf8");
  await writeFile(join(adapterDir, "package.json"), await renderTemplate("package.json"), "utf8");
  await writeFile(join(adapterDir, "plugins", "hypo-workflow.ts"), await renderPluginTemplate(profile), "utf8");
  await writeFile(
    join(adapterDir, "runtime", "hypo-workflow-status.js"),
    await renderOpenCodeStatusModule(),
    "utf8",
  );
  await writeFile(
    join(adapterDir, "runtime", "hypo-workflow-hooks.js"),
    await renderOpenCodeHookPolicyModule(),
    "utf8",
  );
  await writeFile(
    join(adapterDir, "tui", "hypo-workflow-tui.tsx"),
    await renderOpenCodeStatusTuiPlugin(),
    "utf8",
  );
}

export function renderCommand(command) {
  const planGuidance = command.route === "plan"
    ? "\nPlan discipline: use `question` / Ask for every hard interactive gate unless automation is explicitly configured, and keep `todowrite` synchronized for P1/P2/P3/P4 checkpoint state. Progressive Discover starts with task category, desired effect, and verification method, then moves through assumptions, ambiguities, tradeoffs, and validation criteria as needed. Adaptive Grill-Me is only for architecture, source-of-truth, workflow semantic, product concept, or long-running coordination risk; low-risk tasks stay light. For `/hw:guide`, use the intent router contract and recommend one next path before confirmation. For `/hw:plan --deep`, treat it as an alias and route to `/hw:plan:deep` before ordinary decomposition; ordinary `/hw:plan` keeps P1-P4 gates and must not skip them after Deep Plan conversion. For `/hw:plan --batch`, collect multiple Features in one Discover pass, then generate Feature Queue tables and Mermaid diagrams according to `batch.decompose_mode`. For `/hw:plan --insert`, convert the natural-language request into a structured queue operation, summarize the queue diff, and wait for explicit confirmation before writing `.pipeline/feature-queue.yaml`.\n"
    : "";
  const routeGuidance = commandSpecificGuidance(command);
  const knowledgeContext = command.canonical === "/hw:knowledge"
    ? "- `.pipeline/knowledge/knowledge.compact.md`\n- `.pipeline/knowledge/index/*.yaml`\n"
    : "";
  return `---\nagent: ${command.agent}\ndescription: Hypo-Workflow mapping for ${command.canonical}\n---\n\n# ${command.opencode}\n\nCanonical command: \`${command.canonical}\`\nRoute: \`${command.route}\`\nSkill: \`${command.skill}\`\n\nLoad the corresponding Hypo-Workflow skill instructions from \`${command.skill}\`, then execute the canonical command semantics with any user-provided arguments.${planGuidance}${routeGuidance}\nBefore acting, inspect the relevant context when present:\n\n- \`.pipeline/config.yaml\`\n- \`.pipeline/cycle.yaml\`\n- \`.pipeline/state.yaml\`\n- \`.pipeline/rules.yaml\`\n${knowledgeContext}- current prompt/report files for pipeline commands\n- open patches for Patch commands\n\nKeep this command as an OpenCode-native slash mapping, not a separate runner. The OpenCode Agent performs the work and Hypo-Workflow files remain the source of truth.\n`;
}

function commandSpecificGuidance(command) {
  if (command.canonical === "/hw:patch fix") {
    return "\nPatch Fix lane:\n- Step 1: Read Patch\n- Step 2: Locate Code\n- Step 3: Authorize/resolve worker separation\n- Step 4: Start `test` worker first for reproduction, test design, and test/fixture/assertion/snapshot edits when needed\n- Step 5: Apply the minimal production/runtime/documentation fix through `implement`; `implement` must not write tests or spawn validation roles\n- Step 6: Run tests and obtain independent `test` worker validation plus `audit` closure review\n- Step 7: Commit\n- Step 8: Close or gate pending acceptance only after worker lifecycle is recorded as requested/started/completed-or-blocked/closed-or-close_failed\n\nOpenCode uses configured native agents/subagents without an extra subworker authorization gate, but code/test Patch fixes still need distinct `implement`, `test`, and `audit` worker identities before auto-close. `review_tests` is a TDD step name, not a Patch worker role.\n\ndo not run Plan Discover, do not enter full TDD pipeline, do not mutate `state.yaml` for Patch Fix, and do not leave opened subworkers without wait/close lifecycle evidence.\n";
  }
  if (command.canonical === "/hw:release") {
    return "\nRelease lane:\n- run `claude plugin validate .`\n- run the regression suite\n- update versioned files\n- run `update_readme` after version updates and before the release commit\n- run `readme-freshness` before commit/tag/push gates\n- perform a dirty check before release mutations\n- require an Ask gate before tag or push\n- use `git tag` and `git push` only after confirmation\n";
  }
  if (command.canonical === "/hw:compact") {
    return "\nCompact lane: generate compact context files and coordinate with OpenCode `session.compacted` context restore.\n";
  }
  if (command.canonical === "/hw:knowledge") {
    return "\nKnowledge lane: inspect `.pipeline/knowledge/` records, indexes, compact summaries, and secret references. Load compact and index context by default; only open raw records when the user requests `view` or a narrow `search` result.\n";
  }
  if (command.canonical === "/hw:chat") {
    return "\nChat lane:\n- reload `state.yaml + cycle.yaml + PROGRESS.md + recent report`\n- write chat entries instead of Milestone reports\n- keep small edits lightweight\n- suggest `/hw:patch` when scope grows beyond append conversation\n";
  }
  if (command.canonical === "/hw:explain") {
    return "\nExplain lane:\n- stay read-only and evidence-first\n- cite local files, reports, logs, or diff context before answering\n- use `--subagent` for independent evidence collection when available\n- if Subagent support is unavailable, record `fallback_reason` and continue in self evidence-first mode\n- answer unknowns explicitly instead of inventing unsupported details\n";
  }
  if (command.canonical === "/hw:showcase") {
    return "\nShowcase lane: Agent generates showcase artifacts; the plugin only provides context and file guard support.\n";
  }
  if (command.canonical === "/hw:sync") {
    return "\nSync lane: support `--light`, standard, and `--deep`; never execute pipeline milestones. SessionStart may only perform light external-change detection and prompt before heavier sync.\n";
  }
  return "";
}

export function renderAgent(agent, profile = {}) {
  const model = agent.model ? `model: ${renderOpenCodeModelId(agent.model, profile)}\n` : "";
  const deepSeekRules = renderDeepSeekToolCallingRules(agent.model, "OpenCode");
  return `---\ndescription: ${agent.description}\nmode: ${agent.mode}\n${model}permission:\n${renderAgentPermissions(agent.tools, profile)}---\n\n# ${agent.name}\n\n${agent.description}\n\nAnalysis boundary: read \`.opencode/hypo-workflow.json.analysis\` before executing an \`analysis\` preset. Manual mode denies code changes, hybrid mode confirms before code changes, and auto mode may change code within the configured boundaries. Always honor restart, system dependency, network, destructive, and external side-effect boundaries.\n\n${ASK_QUESTIONS_GUIDANCE}\n\nUse \`question\` / Ask for required user interaction and \`todowrite\` for visible plan discipline when those tools are available. For Plan work, every P1/P2/P3/P4 checkpoint must be represented in the todo state before continuing.\n${deepSeekRules ? `\n${deepSeekRules}\n` : ""}`;
}

export function renderOpenCodeModelId(model, profile = {}) {
  if (!model || model.includes("/")) return model;
  const provider = providerForModel(model, profile);
  return provider ? `${provider}/${model}` : model;
}

function providerForModel(model, profile = {}) {
  for (const [providerId, provider] of Object.entries(profile.providers || {})) {
    if (provider?.models && Object.prototype.hasOwnProperty.call(provider.models, model)) {
      return providerId;
    }
  }
  if (model.startsWith("gpt-")) return "openai";
  if (model.startsWith("claude-")) return "anthropic";
  if (model.startsWith("mimo-")) return "mimo";
  if (model.startsWith("deepseek-")) return "deepseek";
  return undefined;
}

function renderAgentPermissions(tools, profile = {}) {
  const permissions = new Map();
  for (const tool of tools) {
    const key = permissionKeyForTool(tool);
    if (!key) continue;
    permissions.set(key, defaultPermissionForKey(key, profile));
  }
  return [...permissions.entries()]
    .map(([key, value]) => `  ${key}: ${value}\n`)
    .join("");
}

function permissionKeyForTool(tool) {
  if (["read", "grep", "glob", "list", "bash", "task", "todowrite", "question"].includes(tool)) {
    return tool;
  }
  if (["write", "edit", "apply_patch"].includes(tool)) {
    return "edit";
  }
  return null;
}

function defaultPermissionForKey(key, profile = {}) {
  return "allow";
}

export function renderOpenCodeConfig(profile, options = {}) {
  const config = {
    $schema: "https://opencode.ai/config.json",
    instructions: ["AGENTS.md", ".pipeline/rules.yaml"],
    compaction: {
      auto: true,
      prune: true,
    },
    permission: {
      "*": "allow",
      edit: "allow",
      bash: "allow",
      question: "allow",
    },
  };
  if (options.includePlugins !== false) {
    config.plugin = [
      ".opencode/plugins/hypo-workflow.ts",
    ];
  }
  if (profile.providers && Object.keys(profile.providers).length) {
    config.provider = profile.providers;
  }
  return config;
}

export function injectCommands(config) {
  const commands = {};
  for (const cmd of commandMap("opencode")) {
    const opencodeName = cmd.opencode?.slice(1); // /hw-start -> hw-start
    if (!opencodeName) continue;
    const skillName = (cmd.skill || "").replace("skills/", "").replace("/SKILL.md", "");
    commands[opencodeName] = {
      template: `Load the Hypo-Workflow skill instructions from \`skills/${skillName}/SKILL.md\`, then execute the canonical command semantics.\n\nKeep this command as an OpenCode-native slash mapping. The OpenCode Agent performs the work and Hypo-Workflow files remain the source of truth.`,
      description: cmd.description || `Hypo-Workflow ${cmd.canonical}`,
    };
  }
  config.command = commands;
  return config;
}

export function renderOpenCodeTuiConfig() {
  return {
    $schema: "https://opencode.ai/tui.json",
    plugin: [
      ".opencode/tui/hypo-workflow-tui.tsx",
    ],
  };
}

export function renderHypoWorkflowMetadata(profile) {
  const normalized = withOpenCodeRenderingDefaults(normalizeProfile(profile));
  return {
    profile: normalized.name,
    autoContinue: normalized.auto_continue,
    auto_continue: {
      enabled: normalized.auto_continue,
      mode: normalized.auto_continue_mode || "safe",
    },
    compaction: normalized.compaction,
    providers: normalized.providers,
    agents: normalized.agents,
    model_pool: normalized.model_pool,
    analysis: normalizeAnalysisInteraction(normalized.analysis || {}),
    execution_bash: normalizeExecutionBashPolicy(normalized.execution_bash || normalized.execution?.bash || {}),
    fileGuard: normalized.file_guard,
    version: HW_VERSION,
    commandMap: commandMap("opencode"),
  };
}

function normalizeArtifactProfile(options = {}) {
  if (options.config) {
    const config = mergeConfig(
      options.config,
      typeof options.profile === "string"
        ? { opencode: { profile: options.profile } }
        : typeof options.profile === "object" && options.profile
          ? { opencode: options.profile }
          : {},
    );
    const selected = selectProfile(config);
    return withOpenCodeRenderingDefaults({
      ...selected,
      agents: buildModelPoolOpenCodeAgents(config),
      model_pool: config.model_pool,
      analysis: normalizeAnalysisInteraction(config),
      execution_bash: normalizeExecutionBashPolicy(config.execution?.bash || {}),
    });
  }
  return withOpenCodeRenderingDefaults(normalizeProfile(options.profile || "standard"));
}

function withOpenCodeRenderingDefaults(profile) {
  return {
    ...profile,
    compaction: mergeConfig(DEFAULT_GLOBAL_CONFIG.opencode.compaction, profile.compaction || {}),
    providers: profile.providers,
    agents: mergeConfig(DEFAULT_GLOBAL_CONFIG.opencode.agents, profile.agents || {}),
  };
}

function renderableOpenCodeAgents(profile) {
  return OPENCODE_AGENTS.map((agent) => {
    const model = agent.modelRole ? profile.agents?.[agent.modelRole]?.model : undefined;
    return model ? { ...agent, model } : agent;
  });
}

async function renderAgentsInstruction(projectRoot, options = {}) {
  const template = await renderTemplate("AGENTS.md");
  const ruleBlock = await renderProjectRulesInstructionBlock(projectRoot, options);
  return ruleBlock ? `${template.trimEnd()}\n\n${ruleBlock}` : template;
}

async function renderProjectRulesInstructionBlock(projectRoot, options = {}) {
  const authority = options.rulesAuthority || await loadArtifactRulesAuthority(projectRoot, options);
  if (!authority) return "";
  return renderStructuredRulesInstructionBlock(authority);
}

async function loadArtifactRulesAuthority(projectRoot, options = {}) {
  try {
    return options.rulesAuthority || await loadStructuredRulesAuthority(projectRoot, REPO_ROOT, options);
  } catch {
    return null;
  }
}

async function renderPluginTemplate(profile = {}) {
  const template = await renderTemplate("plugin.ts");
  return template
    .replace("__COMMAND_MAP_JSON__", JSON.stringify(commandMap("opencode"), null, 2))
    .replace("__BASH_POLICY_JSON__", JSON.stringify(normalizeExecutionBashPolicy(profile.execution_bash || profile.execution?.bash || {}), null, 2));
}

export async function renderOpenCodeStatusTuiPlugin() {
  return renderTemplate("plugin-tui.tsx");
}

export async function renderOpenCodeStatusModule() {
  const status = await readFile(resolve(REPO_ROOT, "core", "src", "opencode-status", "index.js"), "utf8");
  const log = await readFile(resolve(REPO_ROOT, "core", "src", "log", "index.js"), "utf8");
  const recentHelpers = extractRecentEventHelpers(log);
  return status
    .replace('import { buildRecentEvents } from "../log/index.js";\n', "")
    .replace("const NA = \"n/a\";", `${recentHelpers}\n\nconst NA = "n/a";`);
}

export async function renderOpenCodeHookPolicyModule() {
  return readFile(resolve(REPO_ROOT, "core", "src", "opencode-hooks", "index.js"), "utf8");
}

async function renderTemplate(name) {
  const templatePath = resolve(REPO_ROOT, "plugins", "opencode", "templates", name);
  const template = await readFile(templatePath, "utf8");
  return template.replaceAll("__HW_VERSION__", HW_VERSION);
}

function extractRecentEventHelpers(source) {
  const helpers = [
    "const RECENT_FAMILIES",
    "const INTERNAL_TYPES",
    "export function buildRecentEvents",
    "export function logFamily",
    "function isRecentEvent",
    "function compareByTimestampDesc",
    "function normalizeLogType",
  ].map((marker) => extractDeclaration(source, marker).replace(/^export\s+/, ""));
  return [
    ...helpers,
    "function redactSecrets(value) { return value; }",
  ].join("\n\n");
}

function extractDeclaration(source, marker) {
  const start = source.indexOf(marker);
  if (start < 0) throw new Error(`Unable to extract OpenCode status helper: ${marker}`);
  const functionLike = /^(export\s+)?function\b/.test(source.slice(start));
  const brace = functionLike ? functionBodyStart(source, start) : source.indexOf("{", start);
  const semicolon = source.indexOf(";", start);
  if (semicolon >= 0 && (brace < 0 || semicolon < brace)) {
    return source.slice(start, semicolon + 1).trim();
  }
  let depth = 0;
  for (let index = brace; index < source.length; index += 1) {
    const char = source[index];
    if (char === "{") depth += 1;
    if (char === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(start, index + 1).trim();
    }
  }
  throw new Error(`Unable to extract OpenCode status helper body: ${marker}`);
}

function functionBodyStart(source, start) {
  const openParen = source.indexOf("(", start);
  if (openParen < 0) return source.indexOf("{", start);
  let depth = 0;
  for (let index = openParen; index < source.length; index += 1) {
    const char = source[index];
    if (char === "(") depth += 1;
    if (char === ")") {
      depth -= 1;
      if (depth === 0) return source.indexOf("{", index);
    }
  }
  return source.indexOf("{", start);
}
