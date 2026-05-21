import { createHash } from "node:crypto";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, relative, sep } from "node:path";
import { parseYaml, stringifyYaml } from "../config/index.js";

export const STRUCTURED_RULE_SCOPES = Object.freeze(["builtin", "global", "project", "cycle"]);
export const STRUCTURED_RULE_SEVERITIES = Object.freeze(["off", "warn", "error"]);
export const STRUCTURED_RULE_HOOKS = Object.freeze([
  "on-session-start",
  "pre-milestone",
  "post-milestone",
  "pre-step",
  "post-step",
  "pre-commit",
  "pre-release",
  "on-fail",
  "on-evaluate",
  "always",
]);
export const STRUCTURED_RULE_CHECK_KINDS = Object.freeze([
  "agent_judgment",
  "deterministic",
  "command",
  "checklist",
]);

const STRUCTURED_RULE_SCOPE_PRIORITY = Object.freeze({
  cycle: 4,
  project: 3,
  global: 2,
  builtin: 1,
});

export async function loadRulesSummary(projectRoot = ".", repoRoot = process.cwd(), options = {}) {
  const builtin = await loadBuiltinRules(
    join(repoRoot, "rules", "builtin"),
    join(repoRoot, "rules", "packs"),
  );
  const preset = await loadPreset(repoRoot, projectRoot, builtin, options);
  const lines = [`Rules: ${preset.name}`, `Source: ${preset.source}`];
  for (const pack of preset.activePacks) {
    lines.push(`Pack: ${pack}`);
  }
  lines.push("", "[Built-in Rules]");
  let enabled = 0;
  let errors = 0;
  let warns = 0;
  let off = 0;

  for (const rule of builtin) {
    const severity = resolveSeverity(rule, preset.rules, preset.activePacks);
    if (severity === "error") {
      errors += 1;
      enabled += 1;
    } else if (severity === "warn") {
      warns += 1;
      enabled += 1;
    } else {
      off += 1;
    }
    const ruleId = getRuleId(rule);
    lines.push(`${ruleId}\t${rule.label || "workflow"}\t${severity}\t${(rule.hooks || []).join(",") || "—"}`);
  }

  lines.push("");
  lines.push(`Summary: ${enabled}/${builtin.length} enabled | ${errors} error | ${warns} warn | ${off} off`);
  lines.push("");
  lines.push("[Always Rules]");
  for (const rule of builtin) {
    const severity = resolveSeverity(rule, preset.rules, preset.activePacks);
    if (severity !== "off" && Array.isArray(rule.hooks) && rule.hooks.includes("always")) {
      lines.push(`- ${getRuleId(rule)} (${severity})`);
    }
  }

  return `${lines.join("\n")}\n`;
}

export function normalizeStructuredRule(rule = {}, options = {}) {
  const id = slugifyRuleId(rule.id || rule.name || "");
  if (!id) throw new Error("Structured rule id is required");

  const scope = String(rule.scope || options.scope || "project").trim();
  if (!STRUCTURED_RULE_SCOPES.includes(scope)) {
    throw new Error(`Unsupported rule scope: ${scope}`);
  }

  const severity = String(rule.severity || rule.default_severity || "warn").trim();
  if (!STRUCTURED_RULE_SEVERITIES.includes(severity)) {
    throw new Error(`Unsupported rule severity: ${severity}`);
  }

  const hooks = normalizeStringList(rule.hooks);
  for (const hook of hooks) {
    if (!STRUCTURED_RULE_HOOKS.includes(hook)) {
      throw new Error(`Unsupported rule hook: ${hook}`);
    }
  }

  const source = isPlainObject(rule.source) ? { ...rule.source } : {};
  const content = normalizeRuleContent(rule.content, rule);
  const enforcement = normalizeRuleEnforcement(rule.enforcement, rule);

  return {
    id,
    scope,
    label: String(rule.label || "workflow").trim() || "workflow",
    severity,
    hooks,
    source,
    source_path: rule.source_path || options.source_path || null,
    content,
    enforcement,
  };
}

export function resolveEffectiveStructuredRules(authority = {}) {
  const allRules = [
    ...normalizeRuleCollection(authority.builtin, "builtin"),
    ...normalizeRuleCollection(authority.global, "global"),
    ...normalizeRuleCollection(authority.project, "project"),
    ...normalizeRuleCollection(authority.cycle, "cycle"),
    ...normalizeRuleCollection(authority.rules, "project"),
  ];

  const byId = new Map();
  for (const rule of allRules) {
    if (!byId.has(rule.id)) byId.set(rule.id, []);
    byId.get(rule.id).push(rule);
  }

  const rules = [];
  const conflicts = [];
  for (const [id, entries] of [...byId.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    const sorted = [...entries].sort(compareRulePrecedence);
    const [winner, ...overridden] = sorted;
    const effective = {
      ...winner,
      overrides: overridden.map((rule) => ruleRef(rule)),
    };
    rules.push(effective);

    if (overridden.length) {
      conflicts.push({
        rule_id: id,
        winner: ruleRef(winner),
        overridden: overridden.map((rule) => ruleRef(rule)),
      });
    }
  }

  return { rules, conflicts };
}

export function buildEffectiveRulesMatrix(authority = {}) {
  const allRules = [
    ...normalizeRuleCollection(authority.builtin, "builtin"),
    ...normalizeRuleCollection(authority.global, "global"),
    ...normalizeRuleCollection(authority.project, "project"),
    ...normalizeRuleCollection(authority.cycle, "cycle"),
    ...normalizeRuleCollection(authority.rules, "project"),
  ].map((rule) => withProjectionEvidence(rule));

  const byId = new Map();
  for (const rule of allRules) {
    if (!byId.has(rule.id)) byId.set(rule.id, []);
    byId.get(rule.id).push(rule);
  }

  const rules = [];
  const conflicts = [];
  for (const [id, entries] of [...byId.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    const sorted = [...entries].sort(compareRulePrecedence);
    const [winner, ...overridden] = sorted;
    const effective = ruleProjectionRef(winner);
    const overrides = overridden.map((rule) => ruleProjectionRef(rule));
    rules.push({
      id,
      effective,
      overrides,
    });

    if (overrides.length) {
      conflicts.push({
        rule_id: id,
        winner: effective,
        overridden: overrides,
      });
    }
  }

  return {
    projection: "effective_rules_matrix",
    project_id: authority.project_id || null,
    precedence: "cycle > project > global > builtin",
    rules,
    conflicts,
  };
}

export async function loadStructuredRulesAuthority(projectRoot = ".", repoRoot = process.cwd(), options = {}) {
  const builtinRules = await loadBuiltinRules(
    join(repoRoot, "rules", "builtin"),
    join(repoRoot, "rules", "packs"),
  );
  const builtin = builtinRules.map((rule) => normalizeStructuredRule({
    id: rule.name || rule.id,
    scope: "builtin",
    label: rule.label || "workflow",
    severity: rule.default_severity || "warn",
    hooks: rule.hooks || [],
    source: { format: "builtin", pack: rule.pack || null },
    content: {
      instruction: rule.description || rule.check || rule.name,
      rationale: rule.check || "",
    },
    enforcement: {
      check_kind: rule.check ? "deterministic" : "agent_judgment",
      evidence_required: false,
    },
  }));

  const global = options.globalRulesDir
    ? await loadStructuredRuleFiles(options.globalRulesDir, "global")
    : [];
  const project = [
    ...(await loadStructuredRuleFiles(join(projectRoot, ".pipeline", "rules", "structured", "project"), "project")),
    ...(await loadStructuredRuleFiles(join(projectRoot, ".pipeline", "rules", "structured"), "project", { shallow: true })),
    ...(await loadMarkdownCustomRules(join(projectRoot, ".pipeline", "rules", "custom"), "project")),
  ];
  const cycle = await loadStructuredRuleFiles(join(projectRoot, ".pipeline", "rules", "structured", "cycle"), "cycle");
  const projectRules = await loadProjectRulesConfig(projectRoot, options);
  const legacy_summary = await loadRulesSummary(projectRoot, repoRoot, options);
  const effective = applySeverityOverrides(
    resolveEffectiveStructuredRules({ builtin, global, project, cycle }),
    projectRules.rules || {},
  );

  return {
    builtin,
    global,
    project,
    cycle,
    rules: [...builtin, ...global, ...project, ...cycle],
    effective,
    legacy_summary,
  };
}

export function buildRememberRuleProposal(input = "", options = {}) {
  const parsed = parseRememberInput(input);
  const force = Boolean(parsed.flags.force || options.force || /\bforce-write\b/i.test(input) || /强制写入/.test(input));
  const instruction = String(parsed.body || options.instruction || "").trim();
  if (!instruction) throw new Error("Remember rule instruction is required");

  const id = parsed.flags.id || options.id || deriveRuleId(instruction, parsed.flags.label || options.label || "rule");
  const scope = parsed.flags.scope || options.scope || "project";
  const severity = parsed.flags.severity || options.severity || "warn";
  const label = parsed.flags.label || options.label || "workflow";
  const hooks = [
    ...normalizeStringList(options.hooks),
    ...normalizeStringList(parsed.flags.hook),
    ...normalizeStringList(parsed.flags.hooks),
  ];
  const rule = normalizeStructuredRule({
    id,
    scope,
    label,
    severity,
    hooks: hooks.length ? hooks : ["always"],
    source: {
      captured_from: force ? "force-command" : "command",
      author: "user",
      ...(isPlainObject(options.source) ? options.source : {}),
    },
    content: {
      instruction,
      ...(options.rationale ? { rationale: options.rationale } : {}),
    },
    enforcement: {
      check_kind: options.check_kind || "agent_judgment",
      evidence_required: options.evidence_required !== false,
    },
  });

  return {
    ...rule,
    force,
    requires_confirmation: !force,
    confirmation_prompt: force ? null : renderRememberConfirmationPrompt([rule]),
  };
}

export function detectRememberRuleCandidates(text = "", options = {}) {
  const source = String(text || "");
  const patterns = [
    /(?:记住这条规则|把这个记下来|请记住|以后请记住)[:：]\s*(.+)$/im,
    /(?:remember this rule|remember that|save this as a rule)[:：]\s*(.+)$/im,
  ];
  const candidates = [];
  for (const pattern of patterns) {
    const match = pattern.exec(source);
    if (!match) continue;
    candidates.push(buildRememberRuleProposal(match[1].trim(), {
      ...options,
      source: {
        captured_from: "chat-candidate",
        author: "user",
        ...(isPlainObject(options.source) ? options.source : {}),
      },
    }));
  }
  return {
    blocking: false,
    candidates,
    confirmation_prompt: candidates.length ? renderRememberConfirmationPrompt(candidates) : null,
  };
}

export async function writeConfirmedStructuredRule(projectRoot = ".", proposal = {}, options = {}) {
  const rule = normalizeStructuredRule({
    ...proposal,
    source: {
      format: "structured",
      ...(isPlainObject(proposal.source) ? proposal.source : {}),
      ...(isPlainObject(options.source) ? options.source : {}),
    },
  });
  const path = structuredRuleAuthorityPath(projectRoot, rule, options);
  await mkdir(dirname(path), { recursive: true });
  const record = {
    id: rule.id,
    scope: rule.scope,
    label: rule.label,
    severity: rule.severity,
    hooks: rule.hooks,
    source: rule.source,
    content: rule.content,
    enforcement: rule.enforcement,
  };
  await writeFile(path, `${stringifyYaml(record)}\n`, "utf8");
  return { ...rule, path };
}

export function structuredRuleAuthorityPath(projectRoot = ".", rule = {}, options = {}) {
  const normalized = normalizeStructuredRule(rule);
  const fileName = `${normalized.id}.yaml`;
  if (normalized.scope === "global") {
    if (!options.globalRulesDir) {
      throw new Error("globalRulesDir is required before writing a global rule");
    }
    return join(options.globalRulesDir, fileName);
  }
  if (normalized.scope === "cycle") {
    return join(projectRoot, ".pipeline", "rules", "structured", "cycle", fileName);
  }
  if (normalized.scope === "project") {
    return join(projectRoot, ".pipeline", "rules", "structured", "project", fileName);
  }
  throw new Error(`Cannot write structured rule with scope: ${normalized.scope}`);
}

export function renderStructuredHabitsDocument(authority = {}, options = {}) {
  const title = options.title || "Hypo-Workflow Habits";
  const effective = authority.effective || resolveEffectiveStructuredRules(authority);
  const active = effective.rules.filter((rule) => rule.severity !== "off");
  const lines = [
    `# ${title}`,
    "",
    "This file is generated from structured Rules/Habits authority. Edit structured rule records, then regenerate derived views.",
    "",
    "## Active Rules",
    "",
  ];

  if (!active.length) {
    lines.push("No active structured rules.");
  } else {
    for (const rule of active) {
      lines.push(`- **${rule.id}** [${rule.scope}/${rule.severity}/${rule.label}]`);
      lines.push(`  - ${rule.content.instruction}`);
      if (rule.hooks?.length) lines.push(`  - hooks: ${rule.hooks.join(", ")}`);
      if (rule.source_path) lines.push(`  - source: ${rule.source_path}`);
    }
  }

  lines.push("", "## Conflicts", "");
  if (!effective.conflicts?.length) {
    lines.push("No structured rule conflicts.");
  } else {
    for (const conflict of effective.conflicts) {
      lines.push(`- **${conflict.rule_id}** winner: ${conflict.winner.scope}${conflict.winner.source_path ? ` (${conflict.winner.source_path})` : ""}`);
      for (const item of conflict.overridden || []) {
        lines.push(`  - overrides ${item.scope}${item.source_path ? ` (${item.source_path})` : ""}`);
      }
    }
  }

  return `${lines.join("\n")}\n`;
}

export function renderStructuredRulesInstructionBlock(authority = {}, options = {}) {
  const effective = authority.effective || resolveEffectiveStructuredRules(authority);
  const active = effective.rules
    .filter((rule) => rule.severity !== "off")
    .filter((rule) => {
      if (options.includeAll) return true;
      const hooks = rule.hooks || [];
      return hooks.length === 0 || hooks.includes("always") || hooks.includes("on-session-start");
    })
    .slice(0, options.maxRules || 20);

  if (!active.length) return "";
  const lines = [
    "## Active Rules/Habits",
    "",
    "Structured Rules/Habits are authority; Markdown habits and platform instructions are derived views.",
    "",
  ];
  for (const rule of active) {
    lines.push(`- ${rule.id} (${rule.scope}/${rule.severity}/${rule.label}): ${rule.content.instruction}`);
  }
  if (effective.conflicts?.length) {
    lines.push("", "Conflicts are resolved by `cycle > project > global > builtin`; review reports should list overridden sources.");
  }
  return `${lines.join("\n")}\n`;
}

export async function writeStructuredHabitsDocument(projectRoot = ".", repoRoot = process.cwd(), options = {}) {
  const authority = options.authority || await loadStructuredRulesAuthority(projectRoot, repoRoot, options);
  const path = options.path || join(projectRoot, ".pipeline", "HABITS.md");
  await mkdir(dirname(path), { recursive: true });
  const content = renderStructuredHabitsDocument(authority, options);
  await writeFile(path, content, "utf8");
  return { path, content };
}

async function loadBuiltinRules(dir, packDir) {
  const entries = await readdir(dir);
  const rules = [];
  for (const entry of entries.filter((name) => name.endsWith(".yaml")).sort()) {
    const content = await readFile(join(dir, entry), "utf8");
    rules.push(parseYaml(content));
  }
  for (const file of await walkYaml(packDir)) {
    const content = await readFile(file, "utf8");
    const rule = parseYaml(content);
    const pack = derivePackId(packDir, file);
    rules.push({ ...rule, pack });
  }
  return rules;
}

async function loadPreset(repoRoot, projectRoot, builtin, options = {}) {
  const projectRulesFile = options.rulesFile || join(projectRoot, ".pipeline", "rules.yaml");
  let projectRules = {};
  let presetName = "recommended";
  let source = "builtin defaults";
  let activePacks = [];
  try {
    projectRules = parseRulesYaml(await readFile(projectRulesFile, "utf8"));
    ({ presetName, activePacks } = resolveExtends(projectRules.extends));
    source = ".pipeline/rules.yaml";
  } catch {
    projectRules = {};
  }

  if (!["recommended", "strict", "minimal"].includes(presetName)) presetName = "recommended";
  const presetFile = join(repoRoot, "rules", "presets", `${presetName}.yaml`);
  const preset = parseYaml(await readFile(presetFile, "utf8"));
  const packRules = {};
  for (const rule of builtin) {
    if (rule.pack && activePacks.includes(rule.pack)) {
      packRules[getRuleId(rule)] = rule.pack_default_severity || "warn";
    }
  }
  return {
    name: presetName,
    source,
    activePacks,
    rules: {
      ...(preset.rules || {}),
      ...packRules,
      ...(projectRules.rules || {}),
    },
  };
}

function resolveSeverity(rule, rules, activePacks) {
  const ruleId = getRuleId(rule);
  if (rules[ruleId]) {
    return rules[ruleId];
  }
  if (rule.pack && activePacks.includes(rule.pack)) {
    return rule.pack_default_severity || "warn";
  }
  return rule.default_severity || "warn";
}

function getRuleId(rule = {}) {
  return rule.name || rule.id;
}

function parseRulesYaml(raw) {
  try {
    return parseYaml(raw);
  } catch (error) {
    const quotedPackExtends = raw.replace(/^(\s*-\s*)(@[^\s#]+)(\s*(?:#.*)?)$/gm, "$1\"$2\"$3");
    if (quotedPackExtends === raw) throw error;
    return parseYaml(quotedPackExtends);
  }
}

function resolveExtends(value) {
  const list = Array.isArray(value) ? value : value ? [value] : ["recommended"];
  const presetName = list.find((item) => ["recommended", "strict", "minimal"].includes(item)) || "recommended";
  const activePacks = list.filter((item) => /^@[^/]+\/[^/]+$/.test(item));
  return { presetName, activePacks };
}

async function walkYaml(dir) {
  let entries = [];
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  const files = [];
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walkYaml(full)));
    } else if (entry.isFile() && entry.name.endsWith(".yaml")) {
      files.push(full);
    }
  }
  return files.sort();
}

function derivePackId(packDir, file) {
  const rel = relative(packDir, file);
  const parts = rel.split(sep);
  if (parts.length < 3) {
    return null;
  }
  return `@${parts[0]}/${parts[1]}`;
}

async function loadStructuredRuleFiles(dir, scope, options = {}) {
  let entries = [];
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }

  const files = [];
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!options.shallow) files.push(...(await collectYamlFiles(full)));
    } else if (entry.isFile() && entry.name.endsWith(".yaml")) {
      files.push(full);
    }
  }

  const rules = [];
  for (const file of files.sort()) {
    const parsed = parseYaml(await readFile(file, "utf8"));
    const source = isPlainObject(parsed.source) ? parsed.source : {};
    rules.push(normalizeStructuredRule({
      ...parsed,
      scope: parsed.scope || scope,
      source: { format: "structured", ...source },
      source_path: relative(".", file),
    }));
  }
  return rules;
}

async function collectYamlFiles(dir) {
  let entries = [];
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }

  const files = [];
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await collectYamlFiles(full)));
    if (entry.isFile() && entry.name.endsWith(".yaml")) files.push(full);
  }
  return files;
}

async function loadMarkdownCustomRules(dir, scope) {
  let entries = [];
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }

  const rules = [];
  for (const entry of entries.filter((item) => item.isFile() && item.name.endsWith(".md")).sort((a, b) => a.name.localeCompare(b.name))) {
    const file = join(dir, entry.name);
    const source = await readFile(file, "utf8");
    const id = entry.name.replace(/\.md$/i, "");
    rules.push(normalizeStructuredRule({
      id,
      scope,
      label: markdownMeta(source, "标签") || "custom",
      severity: markdownMeta(source, "严格度") || "warn",
      hooks: splitHooks(markdownMeta(source, "钩子点") || "always"),
      source: { format: "markdown" },
      source_path: relative(".", file),
      content: { instruction: markdownRuleBody(source) || source.trim() },
      enforcement: { check_kind: "agent_judgment", evidence_required: true },
    }));
  }
  return rules;
}

function normalizeRuleCollection(rules, scope) {
  return (Array.isArray(rules) ? rules : []).map((rule) => normalizeStructuredRule(rule, { scope }));
}

function normalizeRuleContent(content, rule) {
  const source = isPlainObject(content) ? content : {};
  const instruction = String(source.instruction || rule.description || rule.check || "").trim();
  if (!instruction) throw new Error(`Structured rule ${rule.id || rule.name || ""} content.instruction is required`);
  return {
    instruction,
    ...(source.rationale ? { rationale: String(source.rationale) } : {}),
    ...(source.examples ? { examples: source.examples } : {}),
    ...(Array.isArray(source.non_goals) ? { non_goals: source.non_goals } : {}),
  };
}

function normalizeRuleEnforcement(enforcement, rule) {
  const source = isPlainObject(enforcement) ? enforcement : {};
  const checkKind = String(source.check_kind || (rule.check ? "deterministic" : "agent_judgment")).trim();
  if (!STRUCTURED_RULE_CHECK_KINDS.includes(checkKind)) {
    throw new Error(`Unsupported rule enforcement check_kind: ${checkKind}`);
  }
  return {
    check_kind: checkKind,
    evidence_required: Boolean(source.evidence_required),
    ...(source.review_prompt ? { review_prompt: String(source.review_prompt) } : {}),
  };
}

function applySeverityOverrides(effective, overrides = {}) {
  const rules = effective.rules.map((rule) => {
    const severity = overrides[rule.id];
    if (!severity) return rule;
    if (!STRUCTURED_RULE_SEVERITIES.includes(severity)) {
      throw new Error(`Unsupported rule severity override for ${rule.id}: ${severity}`);
    }
    return {
      ...rule,
      severity,
      severity_override: {
        source: ".pipeline/rules.yaml",
        severity,
      },
    };
  });
  return { ...effective, rules };
}

function parseRememberInput(input = "") {
  const commandless = String(input || "")
    .replace(/^\/hw:rules\s+remember\b/i, "")
    .replace(/^\/hw-rules\s+remember\b/i, "")
    .replace(/^remember\s+rule\b/i, "")
    .trim();
  const tokens = commandless.match(/"[^"]*"|'[^']*'|\S+/g) || [];
  const flags = {};
  const body = [];
  for (let index = 0; index < tokens.length; index += 1) {
    const token = stripTokenQuotes(tokens[index]);
    if (token === "--force" || token === "-f") {
      flags.force = true;
      continue;
    }
    if (token.startsWith("--")) {
      const [rawKey, inlineValue] = token.slice(2).split("=", 2);
      const key = rawKey.replace(/-([a-z])/g, (_, char) => char.toUpperCase());
      const value = inlineValue === undefined ? stripTokenQuotes(tokens[index + 1] || "") : inlineValue;
      if (inlineValue === undefined) index += 1;
      if (key === "hooks" || key === "hook") {
        flags[key] = flags[key] ? `${flags[key]},${value}` : value;
      } else {
        flags[key] = value;
      }
      continue;
    }
    body.push(stripTokenQuotes(tokens[index]));
  }
  return { flags, body: body.join(" ").trim() };
}

function stripTokenQuotes(value = "") {
  const text = String(value);
  if ((text.startsWith('"') && text.endsWith('"')) || (text.startsWith("'") && text.endsWith("'"))) {
    return text.slice(1, -1);
  }
  return text;
}

function deriveRuleId(instruction, label) {
  const base = slugifyRuleId(instruction);
  if (base) return base.split("-").slice(0, 8).join("-");
  const prefix = slugifyRuleId(label) || "rule";
  const hash = createHash("sha1").update(String(instruction)).digest("hex").slice(0, 8);
  return `${prefix}-${hash}`;
}

function renderRememberConfirmationPrompt(candidates = []) {
  const lines = [
    "是否把以下要求记为规则？请确认 scope 和 severity；未确认前不会写入 authority。",
    "",
  ];
  for (const candidate of candidates) {
    lines.push(`- ${candidate.id} [${candidate.scope}/${candidate.severity}/${candidate.label}]: ${candidate.content.instruction}`);
  }
  return lines.join("\n");
}

async function loadProjectRulesConfig(projectRoot, options = {}) {
  const projectRulesFile = options.rulesFile || join(projectRoot, ".pipeline", "rules.yaml");
  try {
    return parseYaml(await readFile(projectRulesFile, "utf8"));
  } catch {
    return {};
  }
}

function compareRulePrecedence(a, b) {
  const priority = STRUCTURED_RULE_SCOPE_PRIORITY[b.scope] - STRUCTURED_RULE_SCOPE_PRIORITY[a.scope];
  if (priority !== 0) return priority;
  return String(a.source_path || "").localeCompare(String(b.source_path || ""));
}

function ruleRef(rule) {
  return {
    id: rule.id,
    scope: rule.scope,
    source_path: rule.source_path || null,
  };
}

function ruleProjectionRef(rule) {
  return {
    id: rule.id,
    scope: rule.scope,
    severity: rule.severity,
    label: rule.label,
    hooks: rule.hooks || [],
    source_path: rule.source_path || null,
    source: rule.source || {},
    evidence_refs: normalizeEvidenceRefs(rule.evidence_refs, rule.source_path),
    content: rule.content,
    enforcement: rule.enforcement,
  };
}

function withProjectionEvidence(rule) {
  return {
    ...rule,
    evidence_refs: normalizeEvidenceRefs(rule.evidence_refs, rule.source_path),
  };
}

function normalizeEvidenceRefs(value, sourcePath = null) {
  const refs = normalizeStringList(value);
  if (sourcePath && !refs.includes(sourcePath)) refs.push(sourcePath);
  return refs;
}

function normalizeStringList(value) {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  if (!value) return [];
  return String(value).split(",").map((item) => item.trim()).filter(Boolean);
}

function splitHooks(value) {
  return normalizeStringList(String(value || "").replace(/\s+/g, ""));
}

function slugifyRuleId(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function markdownMeta(source, key) {
  const pattern = new RegExp(`^- \\*\\*${key}\\*\\*: +(.+)$`, "m");
  const match = pattern.exec(source);
  return match ? match[1].trim() : null;
}

function markdownRuleBody(source) {
  const parts = source.split(/^## 规则内容\s*$/m);
  return parts[1]?.trim() || "";
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
