import { createHash } from "node:crypto";
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { DEFAULT_ANALYSIS_INTERACTION } from "../analysis/index.js";
import { DEFAULT_KNOWLEDGE_CONFIG } from "../knowledge/index.js";

export const DEFAULT_GLOBAL_CONFIG = Object.freeze({
  version: "12.1.0",
  agent: {
    platform: "codex",
    model: "default",
  },
  execution: {
    default_mode: "self",
    analysis: DEFAULT_ANALYSIS_INTERACTION,
    test_profiles: {
      enabled: true,
      selection: "auto",
      compose: true,
      profiles: [],
    },
    worker_separation: {
      mode: "recommended",
      ask_on_init_or_first_plan: true,
      roles: {
        implement: {
          required: true,
        },
        test: {
          required: true,
        },
        audit: {
          required: true,
        },
      },
      providers: {},
      degradation: {
        allow_with_confirmation: true,
        options: [
          "continue_degraded",
          "backfill_missing_roles",
          "switch_provider_and_retry",
          "cancel_execution",
        ],
      },
      acceptance: {
        audit_can_block_acceptance: true,
        audit_blocks_execution_by_default: false,
      },
      evidence: {
        log_roles: true,
        report_roles: true,
      },
    },
  },
  subagent: {
    provider: "codex",
  },
  model_pool: {
    roles: {
      plan: {
        primary: "gpt-5.5",
        fallback: ["deepseek-v4-pro"],
      },
      implement: {
        primary: "mimo-v2.5-pro",
        fallback: ["deepseek-v4-pro", "mimo-v2.5-pro"],
      },
      review: {
        primary: "gpt-5.5",
        fallback: ["deepseek-v4-pro"],
      },
      evaluate: {
        primary: "deepseek-v4-flash",
        fallback: ["deepseek-v4-pro"],
      },
      chat: {
        primary: "deepseek-v4-pro",
        fallback: ["gpt-5.5"],
      },
    },
  },
  acceptance: {
    mode: "auto",
    require_user_confirm: false,
    default_state: "pending",
    timeout_hours: 72,
    reject_escalation_threshold: 3,
  },
  automation: {
    level: "balanced",
    levels: {
      manual: {
        label: "稳妥模式",
        description: "Ask more often; suitable for high-risk or exploratory work.",
      },
      balanced: {
        label: "自动模式",
        description: "Automatically continue ordinary execution while preserving planning and high-risk gates.",
      },
      full: {
        label: "全自动模式",
        description: "Continue as much as possible except planning confirmation and dangerous external side effects.",
      },
    },
    gates: {
      planning: "confirm",
      execution: "auto",
      destructive_external: "confirm",
      release_publish: "confirm",
    },
    codex: {
      prefer_subagents: true,
      separate_test_and_implementation: true,
      external_model_routing: false,
    },
    quality_pass: {
      proposer_challenger: true,
      full_debate_framework: false,
    },
  },
  dashboard: {
    enabled: true,
    port: 7700,
  },
  plan: {
    default_mode: "interactive",
    interaction_depth: "medium",
    interactive: {
      min_rounds: 3,
      require_explicit_confirm: true,
    },
    discover: {
      progressive: true,
      big_questions_first: true,
      plan_extend_mode: "lightweight",
    },
  },
  output: {
    language: "zh-CN",
    timezone: "Asia/Shanghai",
  },
  opencode: {
    auto_continue: true,
    profile: "standard",
    compaction: {
      effective_context_target: 900000,
    },
    agents: {
      plan: {
        model: "gpt-5.5",
      },
      compact: {
        model: "deepseek-v4-flash",
      },
      test: {
        model: "deepseek-v4-pro",
      },
      "code-a": {
        model: "mimo-v2.5-pro",
      },
      "code-b": {
        model: "deepseek-v4-pro",
      },
      debug: {
        model: "gpt-5.5",
      },
      docs: {
        model: "deepseek-v4-pro",
      },
      report: {
        model: "deepseek-v4-flash",
      },
    },
  },
  claude_code: {
    profile: "standard",
    model: "deepseek-v4-pro",
    api: {
      base_url: "",
      base_url_env: "",
      api_key: "",
      api_key_env: "",
    },
    settings: {
      local_file: ".claude/settings.local.json",
      backup: true,
      managed_marker: "hypo-workflow",
    },
    hooks: {
      stop: {
        block_on_missing_state: true,
        block_on_missing_log: true,
        block_on_missing_progress: true,
        block_on_missing_report: true,
        warn_on_metrics_gap: true,
        warn_on_derived_gap: true,
      },
      compact: {
        inject_resume_context: true,
      },
      permission: {
        follow_effective_config: true,
      },
    },
    status: {
      surface: "auto",
      fallback_order: ["monitor", "hw-status", "session-summary", "dashboard"],
    },
    agents: {
      plan: {
        model: "gpt-5.5",
      },
      code: {
        model: "mimo-v2.5-pro",
      },
      test: {
        model: "mimo-v2.5-pro",
      },
      review: {
        model: "gpt-5.5",
      },
      debug: {
        model: "gpt-5.5",
      },
      docs: {
        model: "deepseek-v4-pro",
      },
      report: {
        model: "deepseek-v4-flash",
      },
      compact: {
        model: "deepseek-v4-flash",
      },
    },
  },
  release: {
    readme: {
      mode: "loose",
      full_regen: "auto",
    },
  },
  batch: {
    decompose_mode: "upfront",
    failure_policy: "skip_defer",
    auto_chain: true,
    default_gate: "auto",
  },
  knowledge: DEFAULT_KNOWLEDGE_CONFIG,
  sync: {
    project_registry: "~/.hypo-workflow/projects.yaml",
    register_projects: true,
    platforms: {
      opencode: {
        profile: "standard",
        auto_continue: true,
        auto_continue_mode: "safe",
      },
    },
  },
});

export async function loadConfig(file, defaults = DEFAULT_GLOBAL_CONFIG) {
  const raw = await readFile(file, "utf8");
  const merged = mergeConfig(defaults, parseYaml(raw));
  return {
    ...merged,
    automation: normalizeAutomationPolicy(merged.automation),
  };
}

export async function writeConfig(file, config) {
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, `${stringifyYaml(config).trimEnd()}\n`, "utf8");
}

export async function loadGlobalConfigForSave(file, defaults = DEFAULT_GLOBAL_CONFIG) {
  const raw = await readFile(file, "utf8");
  const parsed = parseYaml(raw);
  const migrated = migrateGlobalConfigShape(parsed, defaults);
  return {
    config: migrated,
    raw,
    needsMigration: JSON.stringify(parsed) !== JSON.stringify(migrated),
  };
}

export async function saveMigratedGlobalConfig(file, config, options = {}) {
  await mkdir(dirname(file), { recursive: true });
  const suffix = formatBackupTimestamp(options.now || new Date().toISOString());
  await copyFile(file, `${file}.bak.${suffix}`);
  await writeConfig(file, {
    ...config,
    version: DEFAULT_GLOBAL_CONFIG.version,
    updated: options.now || config.updated || new Date().toISOString(),
  });
}

export function migrateGlobalConfigShape(config = {}, defaults = DEFAULT_GLOBAL_CONFIG) {
  const merged = mergeConfig(defaults, config);
  const agents = config.opencode?.agents || {};
  if (!config.model_pool && Object.keys(agents).length) {
    merged.model_pool = {
      ...merged.model_pool,
      roles: {
        ...merged.model_pool.roles,
        plan: migrateRole(merged.model_pool.roles.plan, agents.plan?.model),
        implement: migrateRole(
          {
            ...merged.model_pool.roles.implement,
            fallback: [
              agents["code-b"]?.model,
              ...(merged.model_pool.roles.implement.fallback || []),
            ].filter(Boolean),
          },
          agents["code-a"]?.model,
        ),
        review: migrateRole(merged.model_pool.roles.review, agents.debug?.model),
        evaluate: migrateRole(merged.model_pool.roles.evaluate, agents.report?.model),
      },
    };
  }
  return {
    ...merged,
    automation: normalizeAutomationPolicy(merged.automation),
    version: DEFAULT_GLOBAL_CONFIG.version,
  };
}

export function normalizeAutomationPolicy(policy = {}) {
  const merged = mergeConfig(DEFAULT_GLOBAL_CONFIG.automation, policy || {});
  const level = String(merged.level || "balanced");
  if (!Object.prototype.hasOwnProperty.call(DEFAULT_GLOBAL_CONFIG.automation.levels, level)) {
    throw new Error(`Unsupported automation level: ${level}`);
  }
  return {
    ...merged,
    level,
    levels: DEFAULT_GLOBAL_CONFIG.automation.levels,
    gates: {
      ...DEFAULT_GLOBAL_CONFIG.automation.gates,
      ...(merged.gates || {}),
      planning: "confirm",
      destructive_external: "confirm",
      release_publish: "confirm",
    },
    codex: {
      ...DEFAULT_GLOBAL_CONFIG.automation.codex,
      ...(merged.codex || {}),
      external_model_routing: false,
    },
    quality_pass: {
      ...DEFAULT_GLOBAL_CONFIG.automation.quality_pass,
      ...(merged.quality_pass || {}),
    },
  };
}

export function resolveWorkerSeparationPolicy(projectConfig = {}, globalConfig = DEFAULT_GLOBAL_CONFIG) {
  const merged = mergeConfig(
    mergeConfig(DEFAULT_GLOBAL_CONFIG.execution.worker_separation, globalConfig?.execution?.worker_separation || {}),
    projectConfig?.execution?.worker_separation || {},
  );
  const mode = normalizeWorkerSeparationMode(merged.mode);
  const roles = normalizeWorkerRoles(merged.roles);
  const degradation = {
    allow_with_confirmation: merged.degradation?.allow_with_confirmation !== false,
    options: normalizeDegradationOptions(merged.degradation?.options),
  };
  return {
    ...merged,
    mode,
    ask_on_init_or_first_plan: merged.ask_on_init_or_first_plan !== false,
    roles,
    providers: isPlainObject(merged.providers) ? merged.providers : {},
    degradation,
    acceptance: {
      audit_can_block_acceptance: merged.acceptance?.audit_can_block_acceptance !== false,
      audit_blocks_execution_by_default: Boolean(merged.acceptance?.audit_blocks_execution_by_default),
    },
    evidence: {
      log_roles: merged.evidence?.log_roles !== false,
      report_roles: merged.evidence?.report_roles !== false,
    },
  };
}

export function assessWorkerSeparationStatus(policyInput = {}, runtime = {}) {
  const policy = resolveWorkerSeparationPolicy({ execution: { worker_separation: policyInput } });
  const workers = Array.isArray(runtime.workers) ? runtime.workers : [];
  const roleMap = new Map(workers.map((worker) => [worker.role, worker]));
  const requiredRoles = Object.entries(policy.roles)
    .filter(([, config]) => config.required)
    .map(([role]) => role);
  const missingRoles = requiredRoles.filter((role) => !roleMap.get(role));
  const implementWorker = roleMap.get("implement");
  const testWorker = roleMap.get("test");
  const auditWorker = roleMap.get("audit");
  const collisions = [];

  if (sameWorkerIdentity(implementWorker, testWorker)) {
    collisions.push("implement_test_shared_worker");
  }
  if (sameWorkerIdentity(implementWorker, auditWorker)) {
    collisions.push("implement_audit_shared_worker");
  }
  if (sameWorkerIdentity(testWorker, auditWorker)) {
    collisions.push("test_audit_shared_worker");
  }

  const degraded = missingRoles.length > 0 || collisions.length > 0;
  const canProceed = policy.mode === "off"
    ? true
    : policy.mode === "recommended"
      ? (!degraded || policy.degradation.allow_with_confirmation)
      : !degraded;

  return {
    policy,
    workers,
    missing_roles: missingRoles,
    collisions,
    degraded,
    can_proceed: canProceed,
    requires_confirmation: degraded && policy.mode !== "off" && policy.degradation.allow_with_confirmation,
    acceptance_blocked: policy.mode === "strict"
      ? degraded
      : policy.acceptance.audit_can_block_acceptance && runtime.audit_verdict === "insufficient",
    summary: buildWorkerSeparationSummary(policy, missingRoles, collisions),
  };
}

export function buildModelPoolOpenCodeAgents(config = {}) {
  const roles = mergeConfig(DEFAULT_GLOBAL_CONFIG.model_pool.roles, config.model_pool?.roles || {});
  const derived = {
    plan: { model: roles.plan.primary },
    compact: { model: roles.evaluate.primary },
    test: { model: firstModel(roles.evaluate, roles.review.primary) },
    "code-a": { model: roles.implement.primary },
    "code-b": { model: firstModel(roles.implement, roles.implement.primary) },
    debug: { model: roles.review.primary },
    docs: { model: firstModel(roles.review, roles.review.primary) },
    report: { model: roles.evaluate.primary },
  };
  if (!config.model_pool) {
    return mergeConfig(DEFAULT_GLOBAL_CONFIG.opencode.agents, config.opencode?.agents || {});
  }
  return mergeConfig(derived, explicitOpenCodeAgentOverrides(config.opencode?.agents || {}));
}

export function buildModelPoolClaudeAgents(config = {}) {
  const roles = mergeConfig(DEFAULT_GLOBAL_CONFIG.model_pool.roles, config.model_pool?.roles || {});
  const derived = {
    plan: { model: roles.plan.primary },
    code: { model: roles.implement.primary },
    test: { model: roles.implement.primary },
    review: { model: roles.review.primary },
    debug: { model: roles.review.primary },
    docs: { model: firstModel(roles.review, DEFAULT_GLOBAL_CONFIG.claude_code.agents.docs.model) },
    report: { model: roles.evaluate.primary },
    compact: { model: roles.evaluate.primary },
  };
  if (!config.model_pool) {
    return mergeConfig(DEFAULT_GLOBAL_CONFIG.claude_code.agents, config.claude_code?.agents || {});
  }
  return mergeConfig(derived, explicitClaudeAgentOverrides(config.claude_code?.agents || {}));
}

export function projectRegistryId(projectPath) {
  const normalized = normalizeProjectPath(projectPath);
  const hash = createHash("sha256").update(normalized).digest("hex").slice(0, 12);
  return `prj-${hash}`;
}

export async function loadProjectRegistry(file) {
  try {
    const raw = await readFile(file, "utf8");
    const parsed = parseYaml(raw);
    return {
      schema_version: String(parsed.schema_version || "1"),
      ...(parsed.selected_project_id ? { selected_project_id: parsed.selected_project_id } : {}),
      projects: Array.isArray(parsed.projects) ? parsed.projects : [],
    };
  } catch (error) {
    if (error.code === "ENOENT") return { schema_version: "1", projects: [] };
    throw error;
  }
}

export async function saveProjectRegistry(file, registry) {
  await mkdir(dirname(file), { recursive: true });
  const normalized = {
    schema_version: String(registry.schema_version || "1"),
    ...(registry.selected_project_id ? { selected_project_id: registry.selected_project_id } : {}),
    projects: [...(registry.projects || [])].sort((a, b) => String(a.id).localeCompare(String(b.id))),
  };
  await writeFile(file, `${stringifyYaml(normalized)}\n`, "utf8");
  return normalized;
}

export async function registerProject(file, project, options = {}) {
  const registry = await loadProjectRegistry(file);
  const normalized = normalizeRegistryProject(project, options);
  const projects = registry.projects.filter((entry) => entry.id !== normalized.id);
  projects.push(normalized);
  const saved = await saveProjectRegistry(file, { ...registry, projects });
  return { registry: saved, project: normalized };
}

export function mergeConfig(base, override) {
  if (!isPlainObject(base) || !isPlainObject(override)) {
    return override === undefined ? base : override;
  }
  const merged = { ...base };
  for (const [key, value] of Object.entries(override)) {
    merged[key] = key in merged ? mergeConfig(merged[key], value) : value;
  }
  return merged;
}

function migrateRole(role, primary) {
  return {
    ...role,
    ...(primary ? { primary } : {}),
  };
}

function normalizeWorkerSeparationMode(value) {
  const normalized = String(value || "recommended").trim().toLowerCase();
  if (["off", "recommended", "strict"].includes(normalized)) {
    return normalized;
  }
  throw new Error(`Unsupported worker separation mode: ${value}`);
}

function normalizeWorkerRoles(input = {}) {
  const base = DEFAULT_GLOBAL_CONFIG.execution.worker_separation.roles;
  return {
    implement: { required: input.implement?.required !== false && base.implement.required },
    test: { required: input.test?.required !== false && base.test.required },
    audit: { required: input.audit?.required !== false && base.audit.required },
  };
}

function normalizeDegradationOptions(input) {
  const allowed = new Set([
    "continue_degraded",
    "backfill_missing_roles",
    "switch_provider_and_retry",
    "cancel_execution",
  ]);
  const values = Array.isArray(input) ? input : DEFAULT_GLOBAL_CONFIG.execution.worker_separation.degradation.options;
  return values.filter((value) => allowed.has(value));
}

function sameWorkerIdentity(left, right) {
  if (!left || !right) return false;
  const leftId = workerIdentity(left);
  const rightId = workerIdentity(right);
  return leftId && rightId && leftId === rightId;
}

function workerIdentity(worker = {}) {
  return worker.session_id || worker.worker_id || worker.id || worker.name || null;
}

function buildWorkerSeparationSummary(policy, missingRoles, collisions) {
  if (policy.mode === "off") {
    return "Worker separation disabled for this project.";
  }
  if (!missingRoles.length && !collisions.length) {
    return `Worker separation ${policy.mode} satisfied with implement/test/audit split.`;
  }
  const parts = [];
  if (missingRoles.length) {
    parts.push(`missing roles: ${missingRoles.join(", ")}`);
  }
  if (collisions.length) {
    parts.push(`shared workers: ${collisions.join(", ")}`);
  }
  return `Worker separation ${policy.mode} degraded: ${parts.join("; ")}.`;
}

function firstModel(role, fallback) {
  return role?.fallback?.find(Boolean) || fallback || role?.primary;
}

function explicitOpenCodeAgentOverrides(agents = {}) {
  const overrides = {};
  for (const [role, value] of Object.entries(agents)) {
    if (!value?.model) continue;
    if (value.model !== DEFAULT_GLOBAL_CONFIG.opencode.agents?.[role]?.model) {
      overrides[role] = value;
    }
  }
  return overrides;
}

function explicitClaudeAgentOverrides(agents = {}) {
  const overrides = {};
  for (const [role, value] of Object.entries(agents)) {
    if (!value?.model) continue;
    if (value.model !== DEFAULT_GLOBAL_CONFIG.claude_code.agents?.[role]?.model) {
      overrides[role] = value;
    }
  }
  return overrides;
}

function normalizeRegistryProject(project = {}, options = {}) {
  const normalizedPath = normalizeProjectPath(project.path || options.path || ".");
  const now = options.now || new Date().toISOString();
  return {
    id: project.id || projectRegistryId(normalizedPath),
    display_name: project.display_name || project.name || basename(normalizedPath),
    path: normalizedPath,
    platform: project.platform || "unknown",
    profile: project.profile || "default",
    current_cycle: project.current_cycle || null,
    pipeline_status: project.pipeline_status || "unknown",
    open_patch_count: Number(project.open_patch_count || 0),
    acceptance: {
      mode: project.acceptance?.mode || DEFAULT_GLOBAL_CONFIG.acceptance.mode,
      state: project.acceptance?.state || DEFAULT_GLOBAL_CONFIG.acceptance.default_state,
    },
    updated_at: project.updated_at || now,
  };
}

function normalizeProjectPath(projectPath) {
  return resolve(String(projectPath || ".")).replace(/\/+$/g, "");
}

function basename(path) {
  const parts = String(path || "").split("/").filter(Boolean);
  return parts.at(-1) || "project";
}

function formatBackupTimestamp(value) {
  return String(value)
    .replace(/[-:]/g, "")
    .replace(/\.\d+/, "")
    .replace(/\+/, "+")
    .replace(/Z$/, "Z");
}

export function parseYaml(source) {
  const lines = source
    .split(/\r?\n/)
    .filter((raw) => raw.trim() && !raw.trimStart().startsWith("#"))
    .map((raw) => ({
      indent: raw.match(/^ */)[0].length,
      text: raw.trim(),
    }));
  let index = 0;

  function parseNode(indent) {
    return lines[index]?.text.startsWith("-") ? parseArray(indent) : parseObject(indent);
  }

  function parseArray(indent) {
    const value = [];
    while (index < lines.length && lines[index].indent === indent && lines[index].text.startsWith("-")) {
      const rest = lines[index].text.slice(1).trim();
      index += 1;
      if (!rest) {
        value.push(index < lines.length && lines[index].indent > indent ? parseNode(lines[index].indent) : null);
        continue;
      }

      const pair = parseYamlKeyValue(rest);
      if (!pair) {
        value.push(parseScalar(rest));
        continue;
      }

      const item = {};
      item[pair.key] = pair.rawValue
        ? parseScalar(pair.rawValue)
        : index < lines.length && lines[index].indent > indent
          ? parseNode(lines[index].indent)
          : {};
      if (index < lines.length && lines[index].indent > indent) {
        Object.assign(item, parseObject(lines[index].indent));
      }
      value.push(item);
    }
    return value;
  }

  function parseObject(indent) {
    const object = {};
    while (index < lines.length && lines[index].indent === indent && !lines[index].text.startsWith("-")) {
      const pair = parseYamlKeyValue(lines[index].text);
      index += 1;
      if (!pair) continue;
      object[pair.key] = pair.rawValue
        ? parseScalar(pair.rawValue)
        : index < lines.length && lines[index].indent > indent
          ? parseNode(lines[index].indent)
          : {};
    }
    return object;
  }

  return lines.length ? parseNode(lines[0].indent) : {};
}

export function stringifyYaml(value, indent = 0) {
  if (!isPlainObject(value)) return `${" ".repeat(indent)}${formatScalar(value)}`;
  const lines = [];
  for (const [key, child] of Object.entries(value)) {
    if (Array.isArray(child)) {
      lines.push(`${" ".repeat(indent)}${key}:`);
      for (const item of child) {
        if (isPlainObject(item)) {
          lines.push(`${" ".repeat(indent + 2)}-`);
          lines.push(stringifyYaml(item, indent + 4));
        } else {
          lines.push(`${" ".repeat(indent + 2)}- ${formatScalar(item)}`);
        }
      }
    } else if (isPlainObject(child)) {
      lines.push(`${" ".repeat(indent)}${key}:`);
      lines.push(stringifyYaml(child, indent + 2));
    } else {
      lines.push(`${" ".repeat(indent)}${key}: ${formatScalar(child)}`);
    }
  }
  return lines.join("\n");
}

function nextMeaningful(lines, start) {
  for (let i = start; i < lines.length; i += 1) {
    const line = lines[i];
    if (line.trim() && !line.trimStart().startsWith("#")) return line;
  }
  return null;
}

function parseYamlKeyValue(text) {
  const match = /^([^:]+):(.*)$/.exec(text);
  if (!match) return null;
  return {
    key: match[1].trim(),
    rawValue: match[2].trim(),
  };
}

function parseScalar(value) {
  const trimmed = value.trim();
  if (trimmed === "true") return true;
  if (trimmed === "false") return false;
  if (trimmed === "null") return null;
  if (/^-?\d+$/.test(trimmed)) return Number(trimmed);
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    const inner = trimmed.slice(1, -1).trim();
    return inner ? inner.split(",").map((item) => parseScalar(item.trim())) : [];
  }
  return trimmed;
}

function formatScalar(value) {
  if (typeof value === "string") {
    if (!value || /[:#\n]/.test(value) || /^\s|\s$/.test(value)) {
      return JSON.stringify(value);
    }
    return value;
  }
  return String(value);
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
