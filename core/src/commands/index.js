import { lstat, readFile, realpath } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { isAbsolute, join, relative, resolve } from "node:path";
import { parseFrontmatter } from "../serialization/index.js";

const DEFAULT_REPO_ROOT = fileURLToPath(new URL("../../../", import.meta.url));

const COMMAND_DEFINITIONS = Object.freeze([
  { canonical: "/hw:guide", agent: "hw-plan", route: "plan", skill: "skills/guide/SKILL.md" },
  { canonical: "/hw:init", agent: "hw-plan", route: "lifecycle", skill: "skills/init/SKILL.md" },
  { canonical: "/hw:goal", agent: "hw-plan", route: "delivery", skill: "skills/goal/SKILL.md" },
  { canonical: "/hw:plan", agent: "hw-plan", route: "plan", skill: "skills/plan/SKILL.md" },
  { canonical: "/hw:cycle", agent: "hw-build", route: "delivery", skill: "skills/cycle/SKILL.md" },
  { canonical: "/hw:maintain", agent: "hw-build", route: "maintenance", skill: "skills/maintain/SKILL.md" },
  { canonical: "/hw:resume", agent: "hw-build", route: "delivery", skill: "skills/resume/SKILL.md" },
  { canonical: "/hw:accept", agent: "hw-build", route: "delivery", skill: "skills/accept/SKILL.md" },
  { canonical: "/hw:reject", agent: "hw-build", route: "delivery", skill: "skills/reject/SKILL.md" },
]);

const CONTEXTUAL = new Set(["/hw:accept", "/hw:reject"]);
const INTERNAL = Object.freeze([
  "/hw:start", "/hw:status", "/hw:report", "/hw:chat", "/hw:sync", "/hw:explain",
  "/hw:compact", "/hw:knowledge", "/hw:check", "/hw:debug", "/hw:log",
  "/hw:plan:deep", "/hw:plan:discover", "/hw:plan:technical-stack", "/hw:plan:architecture",
  "/hw:plan:decompose", "/hw:plan:generate", "/hw:plan:extend", "/hw:plan:review",
]);
const DEFERRED = Object.freeze([
  "/hw:analysis", "/hw:audit", "/hw:quality", "/hw:docs", "/hw:pr", "/hw:release",
  "/hw:explore", "/hw:optimize",
]);
const REMOVED = Object.freeze([
  "/hw:setup", "/hw:rules", "/hw:stop", "/hw:skip", "/hw:reset", "/hw:showcase",
  "/hw:patch", "/hw:help", "/hw:watchdog", "/hw:plan:confirm", "/hw:plan-confirm",
  "/hw:patch fix", "/hw:maintain status", "/hw:maintain scan",
  "/hw:maintain plan", "/hw:maintain queue", "/hw:maintain run", "/hw:maintain apply",
  "/hw:maintain verify", "/hw:maintain log",
]);

export const CANONICAL_COMMANDS = Object.freeze(COMMAND_DEFINITIONS.map((entry) => Object.freeze({
  ...entry,
  opencode: openCodeCommandName(entry.canonical),
  exposure: CONTEXTUAL.has(entry.canonical) ? "contextual" : "public",
  availability: "available",
})));

const COMPATIBILITY_DIAGNOSTICS = Object.freeze([
  ...INTERNAL.map((canonical) => diagnosticCommand(canonical, "internal")),
  ...DEFERRED.map((canonical) => diagnosticCommand(canonical, "deferred")),
  ...REMOVED.map((canonical) => diagnosticCommand(canonical, "removed")),
]);
const ROUTABLE_COMMANDS = Object.freeze([...CANONICAL_COMMANDS, ...COMPATIBILITY_DIAGNOSTICS]);

export function commandMap(platform = "opencode") {
  if (platform !== "opencode") return CANONICAL_COMMANDS.map((command) => ({ ...command }));
  return CANONICAL_COMMANDS.map((command) => ({
    ...command,
    opencode: openCodeCommandName(command.canonical),
  }));
}

export function commandByCanonical(name) {
  const command = CANONICAL_COMMANDS.find((item) => item.canonical === name);
  if (!command) return undefined;
  return {
    ...command,
    opencode: openCodeCommandName(command.canonical),
  };
}

export async function resolveCommandRoute(input, options = {}) {
  const parsed = parseCommandInput(input);
  if (!parsed) {
    return unavailableRoute("unknown", "Unknown Hypo-Workflow command.");
  }

  const status = routeStatus(parsed.command);
  if (status !== "available") return diagnosticRoute(parsed);

  const skillRoot = await resolveSkillBundleRoot(options, { allowLegacyRepoRootAlias: true });
  const backend = await inspectSkillBackend(skillRoot, parsed.command.skill);
  if (!backend.available) {
    return {
      status: "unavailable",
      canonical: parsed.command.canonical,
      exposure: parsed.command.exposure,
      availability: "unavailable",
      skill: parsed.command.skill,
      arguments: parsed.arguments,
      reason: backend.reason,
      availability_reason: backend.reason,
      message: "This command is registered, but its focused Skill backend is unavailable.",
      writes: [],
    };
  }
  return {
    status: "available",
    canonical: parsed.command.canonical,
    exposure: parsed.command.exposure,
    availability: parsed.command.availability,
    skill: parsed.command.skill,
    arguments: parsed.arguments,
    writes: [],
  };
}

export async function discoverableCommandMap(platform = "codex", options = {}) {
  const skillRoot = await resolveSkillBundleRoot(options, { allowLegacyRepoRootAlias: true });
  const discoverable = [];
  for (const command of CANONICAL_COMMANDS) {
    if (!new Set(["public", "contextual"]).has(command.exposure) || command.availability !== "available") continue;
    const backend = await inspectSkillBackend(skillRoot, command.skill);
    if (!backend.available) continue;
    discoverable.push({
      ...command,
      opencode: openCodeCommandName(command.canonical),
      platform,
      name: platformCommandName(command, platform),
    });
  }
  return discoverable;
}

export async function resolveWorkflowIntent(input, context = {}) {
  if (typeof input !== "string" || !input.trim()) return unavailableRoute("unknown", "No Workflow intent was provided.");
  const text = input.trim();
  const slash = parseCommandInput(text);
  let canonical = slash?.command?.canonical ?? inferNaturalIntent(text, context);
  if (!canonical) return unavailableRoute("unknown", "No supported Workflow intent matched this request.");

  if (canonical === "/hw:start") {
    if (context.active_delivery?.status !== "waiting_to_start") {
      return { status: "unavailable", canonical, authority_intent: "delivery.start", discoverable: false, message: "Explicit start requires an approved Delivery waiting to start.", writes: [] };
    }
    return { status: "available", canonical, authority_intent: "delivery.start", discoverable: false, writes: [] };
  }

  if (slash && routeStatus(slash.command) !== "available") {
    return {
      ...diagnosticRoute(slash),
      discoverable: false,
    };
  }

  const command = commandByCanonical(canonical);
  if (!command) return unavailableRoute("unknown", "No supported Workflow intent matched this request.");
  if (["/hw:accept", "/hw:reject"].includes(canonical) && context.active_delivery?.status !== "pending_acceptance") {
    return {
      status: "unavailable",
      canonical,
      authority_intent: authorityIntentFor(canonical),
      discoverable: true,
      message: "This contextual route requires an active Delivery pending manual acceptance.",
      writes: [],
    };
  }
  const backend = await inspectSkillBackend(context.skillRoot ?? DEFAULT_REPO_ROOT, command.skill);
  if (!backend.available) {
    return {
      status: "unavailable",
      canonical,
      authority_intent: authorityIntentFor(canonical),
      discoverable: ["public", "contextual"].includes(command.exposure),
      message: backend.reason,
      writes: [],
    };
  }
  return {
    status: "available",
    canonical,
    authority_intent: authorityIntentFor(canonical),
    discoverable: ["public", "contextual"].includes(command.exposure),
    ...(canonical === "/hw:goal" ? { delivery_kind: "goal" } : {}),
    ...(canonical === "/hw:cycle" ? { delivery_kind: "cycle" } : {}),
    writes: [],
  };
}

export function openCodeCommandName(canonical) {
  return `/${canonical.slice(1).replace(/\s+/g, ":")}`;
}

export function legacyOpenCodeCommandName(canonical) {
  return `/${canonical.slice(1).replace(/[:\s]+/g, "-")}`;
}

function inferNaturalIntent(input, context) {
  const normalized = input.toLowerCase();
  if (/验收不通过|不接受|reject|拒绝/.test(normalized)) return "/hw:reject";
  if (/验收通过|接受这次|accept|通过验收/.test(normalized)) return "/hw:accept";
  if (/开始做|开始执行|开干|explicit start/.test(normalized) && context.active_delivery?.status === "waiting_to_start") return "/hw:start";
  if (/继续.*(?:交付|刚才|没有做完)|resume|续跑/.test(normalized)) return "/hw:resume";
  if (/日常修改|维护记录|记录到项目|maintain/.test(normalized)) return "/hw:maintain";
  if (/接手.*项目|识别.*架构|初始化|initialize|init/.test(normalized)) return "/hw:init";
  if (/不知道.*(?:工作流|开始)|怎么开始|guide|引导/.test(normalized)) return "/hw:guide";
  if (/不拆里程碑|单一验收目标|\bgoal\b/.test(normalized)) return "/hw:goal";
  if (/有顺序的阶段|分成.*阶段|整体验收|\bcycle\b/.test(normalized)) return "/hw:cycle";
  if (/制定方案|规划|\bplan\b/.test(normalized)) return "/hw:plan";
  return null;
}

function authorityIntentFor(canonical) {
  return ({
    "/hw:guide": "workflow.guide",
    "/hw:init": "workspace.initialize",
    "/hw:goal": "delivery.propose_goal",
    "/hw:plan": "delivery.plan",
    "/hw:cycle": "delivery.propose_cycle",
    "/hw:maintain": "maintain.record",
    "/hw:resume": "delivery.resume",
    "/hw:accept": "delivery.accept",
    "/hw:reject": "delivery.reject",
    "/hw:start": "delivery.start",
  })[canonical];
}

function diagnosticCommand(canonical, exposure) {
  const reason = routeMessage(exposure);
  return Object.freeze({
    canonical,
    opencode: openCodeCommandName(canonical),
    exposure,
    availability: "unavailable",
    reason,
    availability_reason: reason,
    skill: null,
  });
}

function parseCommandInput(input) {
  if (typeof input !== "string" || !input.trim()) return null;
  const normalized = normalizeCommandNamespace(input.trim());
  if (!normalized) return null;
  const candidates = ROUTABLE_COMMANDS
    .flatMap((command) => [command.canonical, openCodeCommandName(command.canonical)].map((spelling) => ({ command, spelling })))
    .sort((left, right) => right.spelling.length - left.spelling.length);
  for (const candidate of candidates) {
    if (normalized !== candidate.spelling && !normalized.startsWith(`${candidate.spelling} `)) continue;
    return {
      command: candidate.command,
      arguments: normalized.slice(candidate.spelling.length).trim(),
    };
  }
  return null;
}

function normalizeCommandNamespace(input) {
  if (input.startsWith("/hw:")) return input;
  if (input.startsWith("/hypo-workflow:")) return `/hw:${input.slice("/hypo-workflow:".length)}`;
  if (input.startsWith("$hypo-workflow:")) return `/hw:${input.slice("$hypo-workflow:".length)}`;
  return null;
}

async function inspectSkillBackend(repoRoot, skill) {
  if (typeof repoRoot !== "string" || !repoRoot.trim()) {
    return { available: false, reason: "Repository root is unavailable." };
  }
  const components = skill.split("/");
  if (components.some((component) => !component || component === "." || component === "..")) {
    return { available: false, reason: "Skill path is invalid." };
  }
  const root = resolve(repoRoot);
  let rootStats;
  try {
    rootStats = await lstat(root);
  } catch (error) {
    if (error.code === "ENOENT" || error.code === "ENOTDIR") {
      return { available: false, reason: "Repository root is missing." };
    }
    return { available: false, reason: "Repository root cannot be inspected." };
  }
  if (rootStats.isSymbolicLink() || !rootStats.isDirectory()) {
    return { available: false, reason: "Repository root must be a regular non-symlink directory." };
  }
  let rootAnchor;
  try {
    rootAnchor = await realpath(root);
  } catch {
    return { available: false, reason: "Repository root cannot be inspected." };
  }
  let cursor = root;
  for (const [index, component] of components.entries()) {
    cursor = resolve(cursor, component);
    let stats;
    try {
      stats = await lstat(cursor);
    } catch (error) {
      if (error.code === "ENOENT" || error.code === "ENOTDIR") {
        return { available: false, reason: "Focused Skill backend is missing." };
      }
      return { available: false, reason: "Focused Skill backend cannot be inspected." };
    }
    if (stats.isSymbolicLink()) return { available: false, reason: "Focused Skill backend must not use symbolic links." };
    if (index < components.length - 1 && !stats.isDirectory()) {
      return { available: false, reason: "Focused Skill backend path is not a directory." };
    }
    if (index === components.length - 1 && !stats.isFile()) {
      return { available: false, reason: "Focused Skill backend is not a regular file." };
    }
    let candidateReal;
    try {
      candidateReal = await realpath(cursor);
    } catch {
      return { available: false, reason: "Focused Skill backend cannot be inspected." };
    }
    if (!isContainedPath(rootAnchor, candidateReal)) {
      return { available: false, reason: "Focused Skill backend escapes the repository root." };
    }
  }
  return { available: true };
}

async function resolveSkillBundleRoot(options, { allowLegacyRepoRootAlias = false } = {}) {
  if (options.skillRoot !== null && options.skillRoot !== undefined) return options.skillRoot;
  if (allowLegacyRepoRootAlias && await isHypoWorkflowBundleRoot(options.repoRoot)) return options.repoRoot;
  return DEFAULT_REPO_ROOT;
}

async function isHypoWorkflowBundleRoot(candidateRoot) {
  if (typeof candidateRoot !== "string" || !candidateRoot.trim()) return false;
  try {
    const source = await readFile(join(resolve(candidateRoot), "SKILL.md"), "utf8");
    return parseFrontmatter(source).attributes.name === "hypo-workflow";
  } catch {
    return false;
  }
}

function isContainedPath(root, candidate) {
  const rel = relative(root, candidate);
  return rel === "" || (rel !== ".." && !rel.startsWith("../") && !isAbsolute(rel));
}

function routeStatus(command) {
  if (command.availability === "available") return "available";
  if (new Set(["removed", "deferred", "internal"]).has(command.exposure)) return command.exposure;
  return "unavailable";
}

function diagnosticRoute(parsed) {
  const status = routeStatus(parsed.command);
  return {
    status,
    canonical: parsed.command.canonical,
    exposure: parsed.command.exposure,
    availability: "unavailable",
    skill: null,
    arguments: parsed.arguments,
    reason: parsed.command.reason,
    availability_reason: parsed.command.availability_reason,
    message: routeMessage(status),
    writes: [],
  };
}

function routeMessage(status) {
  if (status === "removed") return "This compatibility command was removed from the supported user surface.";
  if (status === "deferred") return "This workflow is intentionally deferred and cannot execute in the current release.";
  if (status === "internal") return "This behavior is handled internally and is not an executable user command.";
  return "This command is planned but its backend is not available in the current release.";
}

function unavailableRoute(status, message) {
  return { status, canonical: null, message, writes: [] };
}

function platformCommandName(command, platform) {
  return platform === "opencode" ? openCodeCommandName(command.canonical) : command.canonical;
}
