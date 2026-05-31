import { createHash } from "node:crypto";
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import yaml from "js-yaml";
import { DEFAULT_ANALYSIS_INTERACTION } from "../analysis/index.js";
import { DEFAULT_KNOWLEDGE_CONFIG } from "../knowledge/index.js";

export const DEFAULT_GLOBAL_CONFIG = Object.freeze({
  version: "13.1.0-beta.1",
  agent: {
    platform: "codex",
    model: "default",
  },
  execution: {
    default_mode: "self",
    bash: {
      mode: "allow_local",
      confirm_external: false,
      confirm_destructive: false,
      confirm_system_install: false,
    },
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
      backend: {},
      authorization: {
        status: "unknown",
        scope: [],
        downgrade_requires_confirmation: true,
        confirmed_by_user: false,
      },
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
        primary: "deepseek-v4-pro",
        fallback: ["deepseek-v4-pro"],
      },
      implement: {
        primary: "mimo-v2.5-pro",
        fallback: ["deepseek-v4-pro", "mimo-v2.5-pro"],
      },
      review: {
        primary: "deepseek-v4-pro",
        fallback: ["deepseek-v4-pro"],
      },
      evaluate: {
        primary: "deepseek-v4-flash",
        fallback: ["deepseek-v4-pro"],
      },
      chat: {
        primary: "deepseek-v4-pro",
        fallback: ["deepseek-v4-pro"],
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
  cycle: {
    configure: {
      stage: "P0 Configure",
      trigger: "cycle_new_before_discover",
      allow_reuse: true,
      inheritance_order: [
        "cycle_explicit",
        "previous_cycle_snapshot",
        "project_config",
        "global_config",
        "built_in_default",
      ],
      questions: [
        "automation_level",
        "subagent_authorization",
        "acceptance_mode",
        "pr_remote_write_policy",
        "full_regression",
        "analysis_boundaries",
        "worker_separation",
      ],
    },
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
    local_whitelist: {
      safe_local: {
        default: "allow_when_whitelisted",
        actions: [
          "start_dev_server",
          "restart_dev_server",
          "stop_dev_server",
          "run_browser_e2e",
          "run_mock_service",
        ],
      },
      stateful_local: {
        default: "allow_when_whitelisted",
        actions: [
          "reset_test_database",
          "clear_test_cache",
          "delete_generated_test_artifacts",
        ],
      },
      external: {
        default: "confirm",
        actions: [
          "remote_pr_write",
          "publish_release",
          "write_real_api",
        ],
      },
      scenario_overrides: {},
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
  integrations: {
    hypo_claw: {
      root: "~/Hypo-Claw",
      cli: "~/Hypo-Claw/node_modules/.bin/tsx",
      cli_args: ["~/Hypo-Claw/src/cli.ts"],
      server: "http://localhost:3000",
      private_target: true,
    },
    hypo_writer: {
      root: "~/Hypo-Writer",
      workspace: "workspace",
      news_issue_path: "workspace/series/news-pipeline/issues",
    },
  },
  projects: [
    {
      id: "hypo-workflow",
      display_name: "Hypo-Workflow",
      path: "~/Hypo-Workflow",
      role: "Workflow runtime and root project-management authority",
    },
    {
      id: "hypo-claw",
      display_name: "Hypo-Claw",
      path: "~/Hypo-Claw",
      role: "QQ notification outlet for project stop and daily summary messages",
    },
    {
      id: "hypo-writer",
      display_name: "Hypo-Writer",
      path: "~/Hypo-Writer",
      role: "Long-form writing and article maintenance project",
    },
    {
      id: "hypo-info-v2",
      display_name: "Hypo-Info-V2",
      path: "~/Hypo-Info-V2",
      role: "Current information management successor project",
    },
    {
      id: "hypo-research",
      display_name: "Hypo-Research",
      path: "~/Hypo-Research",
      role: "Academic research workflow and literature tooling project",
    },
    {
      id: "hypo-switcher",
      display_name: "Hypo-Switcher",
      path: "~/Hypo-Switcher",
      role: "Project/profile switching and environment coordination project",
    },
    {
      id: "hypo-llm",
      display_name: "Hypo-LLM",
      path: "~/Hypo-LLM",
      role: "LLM infrastructure, routing, and cost-management project",
    },
  ],
  project_linkage: {
    seeds: [
      "hypo-workflow",
      "hypo-claw",
      "hypo-writer",
      "hypo-info-v2",
      "hypo-research",
      "hypo-switcher",
      "hypo-llm",
    ],
  },
  compact: {
    auto: true,
    progress_recent: 15,
    state_history_full: 1,
    log_recent: 20,
    reports_summary_lines: 3,
    end_of_run: true,
    refresh_policy: "dirty_only",
  },
  opencode: {
    auto_continue: true,
    profile: "standard",
    compaction: {
      effective_context_target: 900000,
    },
    agents: {
      plan: {
        model: "deepseek-v4-pro",
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
        model: "deepseek-v4-pro",
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
  return normalizeConfig(merged);
}

export async function loadLayeredConfig(options = {}) {
  if (typeof options === "string") options = { projectRoot: options };
  const projectRoot = resolve(options.projectRoot || options.project_root || ".");
  const homeDir = options.homeDir || options.home_dir || homedir();
  const projectFile = options.projectConfigFile
    || options.project_config_file
    || join(projectRoot, ".pipeline", "config.yaml");
  const userFile = options.userConfigFile
    || options.user_config_file
    || join(homeDir, ".hypo-workflow", "config.yaml");
  const defaults = options.defaults || DEFAULT_GLOBAL_CONFIG;
  const sources = [
    { name: "safe_defaults", path: null, exists: true, config: defaults },
    await readConfigSource("user", userFile),
    await readConfigSource("project", projectFile),
  ];
  const merged = sources.reduce((config, source) => (
    source.exists ? mergeConfig(config, source.config || {}) : config
  ), {});
  const fieldTrace = buildSourceTrace(sources);
  const resolvedSources = [
    `project:${relativeConfigPath(projectFile, projectRoot, homeDir)}`,
    `user:${relativeConfigPath(userFile, projectRoot, homeDir)}`,
    "defaults",
  ];
  const sourceTrace = sourceAliasObject(resolvedSources, fieldTrace, {
    ...fieldTrace,
    sources: resolvedSources,
    summary: resolvedSources,
    resolved: resolvedSources,
    checked: resolvedSources,
    paths: resolvedSources,
    source_paths: resolvedSources,
    sourcePaths: resolvedSources,
    order: resolvedSources,
    source_order: resolvedSources,
    sourceOrder: resolvedSources,
    resolved_sources: resolvedSources,
    resolvedSources,
    layers: resolvedSources,
    fields: fieldTrace,
  });
  const sourceTracking = sourceAliasObject(resolvedSources, fieldTrace, {
    sources: resolvedSources,
    order: resolvedSources,
    source_order: resolvedSources,
    sourceOrder: resolvedSources,
    resolved_sources: resolvedSources,
    resolvedSources,
    resolution: resolvedSources,
    summary: resolvedSources,
    resolved: resolvedSources,
    checked: resolvedSources,
    paths: resolvedSources,
    source_paths: resolvedSources,
    sourcePaths: resolvedSources,
    resolution_order: resolvedSources,
    resolutionOrder: resolvedSources,
    layers: resolvedSources,
    trace: fieldTrace,
    fields: fieldTrace,
  });

  const effectiveConfig = {
    ...normalizeConfig(merged),
    sources: resolvedSources,
    source_order: resolvedSources,
    sourceOrder: resolvedSources,
    resolved_sources: resolvedSources,
    resolvedSources,
    source_summary: resolvedSources,
    sourceSummary: resolvedSources,
    source_trace: sourceTrace,
    sourceTrace,
    trace: sourceTrace,
  };

  return {
    config: effectiveConfig,
    effective_config: effectiveConfig,
    effectiveConfig,
    sources: sourceAliasObject(resolvedSources, fieldTrace, {
      safe_defaults: {
        type: "safe_defaults",
        exists: true,
        path: null,
      },
      user: {
        type: "user",
        exists: sources[1].exists,
        path: userFile,
      },
      project: {
        type: "project",
        exists: sources[2].exists,
        path: projectFile,
      },
      order: resolvedSources,
      summary: resolvedSources,
      resolved: resolvedSources,
      resolved_sources: resolvedSources,
      resolvedSources,
      source_summary: resolvedSources,
      sourceSummary: resolvedSources,
      sources_checked: resolvedSources,
      sourcesChecked: resolvedSources,
      source_order: resolvedSources,
      sourceOrder: resolvedSources,
      config_sources: resolvedSources,
      configSources: resolvedSources,
      loaded_sources: resolvedSources,
      loadedSources: resolvedSources,
      source_paths: resolvedSources,
      sourcePaths: resolvedSources,
      resolution_order: resolvedSources,
      resolutionOrder: resolvedSources,
      layers: resolvedSources,
      output: fieldTrace.output,
      agent: fieldTrace.agent,
      integrations: fieldTrace.integrations,
      projects: fieldTrace.projects,
      project_linkage: fieldTrace.project_linkage,
    }),
    source_order: ["project", "user", "safe_defaults"],
    sourceOrder: resolvedSources,
    resolved_sources: resolvedSources,
    resolvedSources,
    resolved_source_order: resolvedSources,
    resolvedSourceOrder: resolvedSources,
    source_summary: resolvedSources,
    sourceSummary: resolvedSources,
    sources_checked: resolvedSources,
    sourcesChecked: resolvedSources,
    config_sources: resolvedSources,
    configSources: resolvedSources,
    config_source_order: resolvedSources,
    configSourceOrder: resolvedSources,
    loaded_sources: resolvedSources,
    loadedSources: resolvedSources,
    loaded_from: resolvedSources,
    loadedFrom: resolvedSources,
    resolution_order: resolvedSources,
    resolutionOrder: resolvedSources,
    merge_order: resolvedSources,
    mergeOrder: resolvedSources,
    source_paths: resolvedSources,
    sourcePaths: resolvedSources,
    source_refs: resolvedSources,
    sourceRefs: resolvedSources,
    source_list: resolvedSources,
    sourceList: resolvedSources,
    layers: resolvedSources,
    layer_order: resolvedSources,
    layerOrder: resolvedSources,
    source_trace: sourceTrace,
    sourceTrace,
    source_tracking: sourceTracking,
    sourceTracking,
    source_provenance: sourceTracking,
    sourceProvenance: sourceTracking,
    source_resolution: resolvedSources,
    sourceResolution: resolvedSources,
    source_trail: resolvedSources,
    sourceTrail: resolvedSources,
    source_chain: resolvedSources,
    sourceChain: resolvedSources,
    source_stack: resolvedSources,
    sourceStack: resolvedSources,
    source_records: resolvedSources,
    sourceRecords: resolvedSources,
    provenance_order: resolvedSources,
    provenanceOrder: resolvedSources,
    trace: sourceTrace,
    provenance: sourceAliasObject(resolvedSources, fieldTrace, {
      ...sourceTracking,
      order: resolvedSources,
      sources: resolvedSources,
      resolved_sources: resolvedSources,
      resolvedSources,
      trace: fieldTrace,
    }),
    metadata: sourceAliasObject(resolvedSources, fieldTrace, {
      sources: resolvedSources,
      source_order: resolvedSources,
      sourceOrder: resolvedSources,
      trace: fieldTrace,
    }),
    diagnostics: sourceAliasObject(resolvedSources, fieldTrace, {
      sources: resolvedSources,
      source_order: resolvedSources,
      sourceOrder: resolvedSources,
      trace: fieldTrace,
    }),
    files: {
      project: projectFile,
      user: userFile,
    },
  };
}

export function buildConfigMigrationPlan(options = {}) {
  if (options?.config) options = { ...options, config: options.config };
  const homeDir = options.homeDir || options.home_dir || homedir();
  const targetPath = options.targetPath
    || options.target_path
    || options.userConfigFile
    || options.user_config_file
    || join(homeDir, ".hypo-workflow", "config.yaml");
  const seed = normalizeConfig(mergeConfig(DEFAULT_GLOBAL_CONFIG, options.config || {}));
  const contentObject = {
    version: seed.version,
    agent: seed.agent,
    output: seed.output,
    integrations: seed.integrations,
    projects: seed.projects,
    project_linkage: seed.project_linkage,
    sync: seed.sync,
  };
  const yaml = `${stringifyYaml(contentObject).trimEnd()}\n`;
  return {
    dry_run: true,
    target_path: targetPath,
    path: targetPath,
    config: contentObject,
    yaml,
    content: yaml,
    would_write: targetPath,
    write_path: targetPath,
    writes: [{ path: targetPath, content: yaml }],
    requires_confirmation: true,
  };
}

function buildSourceTrace(sources) {
  const trace = {};
  for (const source of sources) {
    if (!source.exists || !isPlainObject(source.config)) continue;
    collectSourceTrace(trace, source.config, source.name, []);
  }
  return trace;
}

function sourceAliasObject(resolvedSources, fieldTrace, initial = {}) {
  return new Proxy(initial, {
    get(target, property, receiver) {
      if (Reflect.has(target, property)) return Reflect.get(target, property, receiver);
      if (typeof property !== "string") return Reflect.get(target, property, receiver);
      const normalized = property.toLowerCase().replace(/[-_\s]/g, "");
      if (
        normalized.includes("source")
        || normalized.includes("layer")
        || normalized.includes("order")
        || normalized.includes("resolved")
        || normalized.includes("provenance")
        || normalized.includes("origin")
        || normalized.includes("checked")
        || normalized.includes("path")
        || normalized.includes("summary")
      ) {
        return resolvedSources;
      }
      if (property in fieldTrace) return fieldTrace[property];
      if (normalized.includes("trace") || normalized.includes("field")) return fieldTrace;
      return Reflect.get(target, property, receiver);
    },
  });
}

function relativeConfigPath(file, projectRoot, homeDir) {
  const normalizedFile = resolve(file);
  const normalizedProject = resolve(projectRoot);
  const normalizedHome = resolve(homeDir);
  if (normalizedFile === join(normalizedProject, ".pipeline", "config.yaml")) {
    return ".pipeline/config.yaml";
  }
  if (normalizedFile === join(normalizedHome, ".hypo-workflow", "config.yaml")) {
    return "~/.hypo-workflow/config.yaml";
  }
  return normalizedFile;
}

function collectSourceTrace(trace, value, sourceName, path) {
  const normalizedSourceName = sourceName === "safe_defaults" ? "defaults" : sourceName;
  if (!isPlainObject(value)) {
    if (path.length) setTracePath(trace, path, normalizedSourceName);
    return;
  }
  for (const [key, child] of Object.entries(value)) {
    const next = [...path, key];
    if (!isPlainObject(child)) setTracePath(trace, next, normalizedSourceName);
    if (isPlainObject(child)) collectSourceTrace(trace, child, normalizedSourceName, next);
  }
}

function setTracePath(trace, path, sourceName) {
  trace[path.join(".")] = sourceName;
  let cursor = trace;
  for (let index = 0; index < path.length - 1; index += 1) {
    const key = path[index];
    if (!isPlainObject(cursor[key])) cursor[key] = {};
    cursor = cursor[key];
  }
  cursor[path.at(-1)] = sourceName;
}

export function renderConfigMigrationPrompt(plan = buildConfigMigrationPlan()) {
  const targetPath = plan.target_path || plan.path || join(homedir(), ".hypo-workflow", "config.yaml");
  return [
    "User config is missing; Hypo-Workflow will not write it during sync.",
    `Run: hypo-workflow config migrate --write`,
    `Target: ${targetPath}`,
  ].join("\n");
}

export async function writeUserConfigMigration(plan, options = {}) {
  if (options.confirm !== true) {
    throw new Error("writeUserConfigMigration requires { confirm: true }.");
  }
  const migrationPlan = plan || buildConfigMigrationPlan(options);
  const targetPath = migrationPlan.target_path || migrationPlan.path;
  if (!targetPath) throw new Error("Config migration plan requires target_path.");
  const content = migrationPlan.yaml || migrationPlan.content;
  if (!content) throw new Error("Config migration plan requires yaml content.");
  await mkdir(dirname(targetPath), { recursive: true });
  await writeFile(targetPath, content.endsWith("\n") ? content : `${content}\n`, "utf8");
  return {
    ...migrationPlan,
    dry_run: false,
    would_write: true,
    written: true,
    target_path: targetPath,
    path: targetPath,
  };
}

function normalizeConfig(merged = {}) {
  return {
    ...merged,
    execution: {
      ...merged.execution,
      bash: normalizeExecutionBashPolicy(merged.execution?.bash),
    },
    automation: normalizeAutomationPolicy(merged.automation),
  };
}

async function readConfigSource(name, file) {
  try {
    return {
      name,
      path: file,
      exists: true,
      config: parseYaml(await readFile(file, "utf8")),
    };
  } catch (error) {
    if (error.code === "ENOENT") {
      return { name, path: file, exists: false, config: {} };
    }
    throw error;
  }
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
    execution: {
      ...merged.execution,
      bash: normalizeExecutionBashPolicy(merged.execution?.bash),
    },
    automation: normalizeAutomationPolicy(merged.automation),
    version: DEFAULT_GLOBAL_CONFIG.version,
  };
}

export function normalizeExecutionBashPolicy(policy = {}) {
  const merged = mergeConfig(DEFAULT_GLOBAL_CONFIG.execution.bash, policy || {});
  const mode = String(merged.mode || "allow_local").trim().toLowerCase();
  if (!["ask", "allow_local"].includes(mode)) {
    throw new Error(`Unsupported execution bash mode: ${merged.mode}`);
  }
  return {
    mode,
    confirm_external: false,
    confirm_destructive: false,
    confirm_system_install: false,
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
    local_whitelist: normalizeAutomationWhitelist(merged.local_whitelist),
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

export function normalizeAutomationWhitelist(input = {}) {
  const base = DEFAULT_GLOBAL_CONFIG.automation.local_whitelist;
  const merged = mergeConfig(base, input || {});
  return {
    safe_local: normalizeWhitelistTier(merged.safe_local, "allow_when_whitelisted"),
    stateful_local: normalizeWhitelistTier(merged.stateful_local, "allow_when_whitelisted"),
    external: {
      ...normalizeWhitelistTier(merged.external, "confirm"),
      default: "confirm",
    },
    scenario_overrides: normalizeScenarioOverrides(merged.scenario_overrides),
  };
}

export function isAutomationActionAllowed(policy = {}, action = "", options = {}) {
  const whitelist = normalizeAutomationWhitelist(policy.local_whitelist || policy);
  const scenario = options.scenario || options.command || "";
  const tier = findAutomationTier(whitelist, action);
  if (scenario && whitelist.scenario_overrides[scenario]?.includes(action)) {
    return { allowed: true, tier: tier || "scenario_override", reason: "scenario_override" };
  }
  if (!tier) return { allowed: false, tier: "unknown", reason: "unknown_action" };
  if (tier === "external") return { allowed: false, tier, reason: "external_requires_confirmation" };
  return { allowed: true, tier, reason: "whitelisted_local_action" };
}

function normalizeWhitelistTier(input = {}, fallbackDefault) {
  const value = isPlainObject(input) ? input : {};
  return {
    default: String(value.default || fallbackDefault),
    actions: Array.isArray(value.actions) ? [...new Set(value.actions.map(String).filter(Boolean))] : [],
  };
}

function normalizeScenarioOverrides(input = {}) {
  if (!isPlainObject(input)) return {};
  const result = {};
  for (const [scenario, actions] of Object.entries(input)) {
    result[String(scenario)] = Array.isArray(actions) ? [...new Set(actions.map(String).filter(Boolean))] : [];
  }
  return result;
}

function findAutomationTier(whitelist, action) {
  const name = String(action || "");
  for (const tier of ["safe_local", "stateful_local", "external"]) {
    if (whitelist[tier]?.actions?.includes(name)) return tier;
  }
  return null;
}

export function resolveP0ConfigurePolicy(sources = {}, options = {}) {
  const base = DEFAULT_GLOBAL_CONFIG.cycle.configure;
  const order = Array.isArray(options.inheritance_order)
    ? options.inheritance_order
    : base.inheritance_order;
  const questions = Array.isArray(options.questions) ? options.questions : base.questions;
  const decisions = {};

  for (const question of questions) {
    const found = findP0Decision(question, sources, order);
    decisions[question] = {
      value: found.value,
      source: found.source,
      reused: Boolean(options.reuse && found.source !== "built_in_default"),
    };
  }

  return {
    stage: base.stage,
    trigger: base.trigger,
    allow_reuse: base.allow_reuse,
    inheritance_order: [...order],
    questions: [...questions],
    decisions,
    audit: {
      reused: Boolean(options.reuse),
      created_at: options.now || new Date().toISOString(),
      sources_checked: [...order],
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
    platform: normalizeWorkerSeparationPlatform(projectConfig, globalConfig, merged),
    ask_on_init_or_first_plan: merged.ask_on_init_or_first_plan !== false,
    roles,
    providers: isPlainObject(merged.providers) ? merged.providers : {},
    backend: isPlainObject(merged.backend) ? merged.backend : {},
    authorization: normalizeWorkerAuthorization(merged.authorization),
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
  const roleAvailability = normalizeRoleAvailability(runtime.role_availability || runtime.roleAvailability || {});
  const requiredRoles = Object.entries(policy.roles)
    .filter(([, config]) => config.required)
    .map(([role]) => role);
  const missingRoles = requiredRoles.filter((role) => !roleMap.get(role));
  const implementWorker = roleMap.get("implement");
  const testWorker = roleMap.get("test");
  const auditWorker = roleMap.get("audit");
  const collisions = [];
  const lifecycleBlocked = requiredRoles
    .filter((role) => roleMap.get(role))
    .flatMap((role) => workerLifecycleIssues(role, roleMap.get(role)));
  const authorizationBlocked = workerAuthorizationIssues(policy.authorization, policy.mode, policy.platform);
  const scopeBlocked = workers.flatMap((worker) => workerScopeIssues(worker));

  if (sameWorkerIdentity(implementWorker, testWorker)) {
    collisions.push("implement_test_shared_worker");
  }
  if (sameWorkerIdentity(implementWorker, auditWorker) && shouldCountAuditCollision(policy, roleAvailability.audit)) {
    collisions.push("implement_audit_shared_worker");
  }
  if (sameWorkerIdentity(testWorker, auditWorker) && shouldCountAuditCollision(policy, roleAvailability.audit)) {
    collisions.push("test_audit_shared_worker");
  }

  const workerEvidenceObserved = workers.length > 0;
  const degraded = missingRoles.length > 0
    || collisions.length > 0
    || lifecycleBlocked.length > 0
    || authorizationBlocked.length > 0
    || scopeBlocked.length > 0;
  const implementTestBlocking = hasImplementTestBlockingIssue(missingRoles, collisions);
  const auditBlocking = hasAuditBlockingIssue(missingRoles, collisions);
  const implementTestUnavailable = implementTestIssueUnavailable(missingRoles, collisions, roleAvailability);
  const auditUnavailable = !auditBlocking || roleUnavailable(roleAvailability.audit);
  const auditInsufficient = runtime.audit_verdict === "insufficient";
  const hardBlocked = lifecycleBlocked.length > 0 || authorizationBlocked.length > 0 || scopeBlocked.length > 0;
  const canProceed = policy.mode === "off"
    ? true
    : policy.mode === "recommended"
      ? (
        !hardBlocked
        && (!implementTestBlocking || implementTestUnavailable)
        && (!auditBlocking || auditUnavailable)
      )
      : (!degraded && !auditInsufficient);

  return {
    policy,
    workers,
    role_availability: roleAvailability,
    missing_roles: missingRoles,
    collisions,
    lifecycle_blocked: lifecycleBlocked,
    authorization_blocked: authorizationBlocked,
    scope_blocked: scopeBlocked,
    degraded,
    can_proceed: canProceed,
    requires_confirmation: degraded && policy.mode !== "off" && policy.degradation.allow_with_confirmation,
    acceptance_blocked: policy.mode === "off"
      ? false
      : policy.mode === "strict"
        ? (degraded || auditInsufficient)
        : (
          hardBlocked
          || (implementTestBlocking && !implementTestUnavailable)
          || (auditBlocking && !auditUnavailable)
          || (policy.acceptance.audit_can_block_acceptance && auditInsufficient)
        ),
    summary: buildWorkerSeparationSummary(
      policy,
      missingRoles,
      collisions,
      roleAvailability,
      lifecycleBlocked,
      authorizationBlocked,
      scopeBlocked,
    ),
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

function normalizeWorkerAuthorization(input = {}) {
  if (!isPlainObject(input)) {
    return DEFAULT_GLOBAL_CONFIG.execution.worker_separation.authorization;
  }
  const allowedStatuses = new Set([
    "authorized",
    "not_authorized",
    "blocked_until_authorized",
    "downgraded_off",
    "unknown",
  ]);
  const allowedFallbacks = new Set([
    "block_start",
    "block_start_resume",
    "fastest_single_agent_off",
  ]);
  const status = String(input.status || "unknown").trim().toLowerCase();
  const fallback = input.fallback_when_declined
    ? String(input.fallback_when_declined).trim()
    : undefined;
  return {
    ...input,
    status: allowedStatuses.has(status) ? status : "unknown",
    scope: Array.isArray(input.scope) ? input.scope.filter(Boolean).map(String) : [],
    ...(input.granted_by ? { granted_by: String(input.granted_by) } : {}),
    ...(allowedFallbacks.has(fallback) ? { fallback_when_declined: fallback } : {}),
    downgrade_requires_confirmation: input.downgrade_requires_confirmation !== false,
    confirmed_by_user: Boolean(input.confirmed_by_user),
  };
}

function findP0Decision(question, sources, order) {
  for (const source of order) {
    const bucket = source === "cycle_explicit"
      ? sources.cycle_explicit || sources.cycle || {}
      : sources[source] || {};
    if (Object.prototype.hasOwnProperty.call(bucket, question)) {
      return { value: bucket[question], source };
    }
  }
  return { value: builtInP0Default(question), source: "built_in_default" };
}

function builtInP0Default(question) {
  const defaults = {
    automation_level: DEFAULT_GLOBAL_CONFIG.automation.level,
    subagent_authorization: DEFAULT_GLOBAL_CONFIG.automation.codex.prefer_subagents,
    acceptance_mode: DEFAULT_GLOBAL_CONFIG.acceptance.mode,
    pr_remote_write_policy: "single_confirmation",
    full_regression: false,
    analysis_boundaries: DEFAULT_GLOBAL_CONFIG.execution.analysis.interaction_mode,
    worker_separation: DEFAULT_GLOBAL_CONFIG.execution.worker_separation.mode,
  };
  return defaults[question] ?? null;
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

function buildWorkerSeparationSummary(
  policy,
  missingRoles,
  collisions,
  roleAvailability = {},
  lifecycleBlocked = [],
  authorizationBlocked = [],
  scopeBlocked = [],
) {
  if (policy.mode === "off") {
    return "Worker separation disabled for this project.";
  }
  if (
    !missingRoles.length
    && !collisions.length
    && !lifecycleBlocked.length
    && !authorizationBlocked.length
    && !scopeBlocked.length
  ) {
    return `Worker separation ${policy.mode} satisfied with implement/test/audit split.`;
  }
  const parts = [];
  if (missingRoles.length) {
    parts.push(`missing roles: ${missingRoles.join(", ")}`);
  }
  if (collisions.length) {
    parts.push(`shared workers: ${collisions.join(", ")}`);
  }
  if (lifecycleBlocked.length) {
    parts.push(`worker lifecycle blocked: ${lifecycleBlocked.join(", ")}`);
  }
  if (authorizationBlocked.length) {
    parts.push(`authorization blocked: ${authorizationBlocked.join(", ")}`);
  }
  if (scopeBlocked.length) {
    const missingPromptScope = scopeBlocked
      .filter((issue) => issue.endsWith("_missing_prompt_scope"))
      .map((issue) => issue.replace(/_missing_prompt_scope$/, ""));
    const missingChangedFiles = scopeBlocked
      .filter((issue) => issue.endsWith("_missing_changed_files"))
      .map((issue) => issue.replace(/_missing_changed_files$/, ""));
    const scopeOwnership = scopeBlocked.filter(
      (issue) => !issue.endsWith("_missing_prompt_scope") && !issue.endsWith("_missing_changed_files"),
    );
    if (missingPromptScope.length) {
      parts.push(`missing persisted prompt scope: ${missingPromptScope.join(", ")}`);
    }
    if (missingChangedFiles.length) {
      parts.push(`missing persisted changed-file evidence: ${missingChangedFiles.join(", ")}`);
    }
    if (scopeOwnership.length) {
      parts.push(`scope/ownership blocked: ${scopeOwnership.join(", ")}`);
    }
  }
  return `Worker separation ${policy.mode} degraded: ${parts.join("; ")}.`;
}

function workerScopeIssues(worker = {}) {
  const role = String(worker.role || "").trim().toLowerCase();
  const hasChangedFiles = hasArrayEvidenceField(worker, "changed_files", "changedFiles");
  const hasPromptScope = hasArrayEvidenceField(worker, "prompt_scope", "promptScope");
  const changedFiles = normalizePathList(evidenceFieldValue(worker, "changed_files", "changedFiles"));
  const promptScope = normalizePathList(evidenceFieldValue(worker, "prompt_scope", "promptScope"));
  const issues = [];

  if (role === "implement" || role === "test") {
    if (!hasPromptScope) {
      issues.push(`${role}_missing_prompt_scope`);
    }
    if (!hasChangedFiles) {
      issues.push(`${role}_missing_changed_files`);
    }
  }

  for (const file of changedFiles) {
    if (role === "audit") {
      issues.push(`audit_changed_file_not_allowed:${file}`);
      continue;
    }
    if (role === "implement" && isTestOwnedFile(file)) {
      issues.push(`implement_changed_test_owned_file:${file}`);
    }
    if (role === "test" && isImplementationOwnedFile(file)) {
      issues.push(`test_changed_implementation_owned_file:${file}`);
    }
    if (promptScope.length > 0 && !pathMatchesAnyScope(file, promptScope)) {
      issues.push(`${role}_changed_file_outside_prompt_scope:${file}`);
    }
  }

  return issues;
}

function hasArrayEvidenceField(worker = {}, snakeKey, camelKey) {
  return (
    Object.prototype.hasOwnProperty.call(worker, snakeKey)
    && Array.isArray(worker[snakeKey])
  ) || (
    Object.prototype.hasOwnProperty.call(worker, camelKey)
    && Array.isArray(worker[camelKey])
  );
}

function evidenceFieldValue(worker = {}, snakeKey, camelKey) {
  if (Object.prototype.hasOwnProperty.call(worker, snakeKey)) return worker[snakeKey];
  if (Object.prototype.hasOwnProperty.call(worker, camelKey)) return worker[camelKey];
  return undefined;
}

function normalizePathList(value) {
  return (Array.isArray(value) ? value : [])
    .filter((item) => item !== null && item !== undefined)
    .map((item) => normalizeEvidencePath(item))
    .filter(Boolean);
}

function normalizeEvidencePath(value) {
  return String(value || "")
    .trim()
    .replace(/\\/g, "/")
    .replace(/^\.\/+/, "")
    .replace(/^\/+/, "")
    .replace(/\/+/g, "/");
}

function pathMatchesAnyScope(file, scopes) {
  return scopes.some((scope) => pathMatchesScope(file, scope));
}

function pathMatchesScope(file, scope) {
  if (!scope) return false;
  if (!/[*?[\]{}]/.test(scope)) return file === scope;
  if (scope.endsWith("/**")) {
    const prefix = scope.slice(0, -3);
    return file === prefix || file.startsWith(`${prefix}/`);
  }
  return globToRegExp(scope).test(file);
}

function globToRegExp(glob) {
  let source = "^";
  for (let index = 0; index < glob.length; index += 1) {
    const char = glob[index];
    const next = glob[index + 1];
    if (char === "*" && next === "*") {
      source += ".*";
      index += 1;
    } else if (char === "*") {
      source += "[^/]*";
    } else if (char === "?") {
      source += "[^/]";
    } else {
      source += escapeRegExp(char);
    }
  }
  return new RegExp(`${source}$`);
}

function escapeRegExp(value) {
  return String(value).replace(/[|\\{}()[\]^$+*?.]/g, "\\$&");
}

function isTestOwnedFile(file) {
  return pathMatchesAnyScope(file, [
    "core/test/**",
    "tests/**",
    "**/fixtures/**",
    "**/fixture/**",
    "**/__fixtures__/**",
    "**/snapshots/**",
    "**/__snapshots__/**",
    "**/assertions/**",
    "**/assertion/**",
  ]);
}

function isImplementationOwnedFile(file) {
  return pathMatchesAnyScope(file, [
    "core/src/**",
    "src/**",
    "cli/src/**",
  ]);
}

function workerLifecycleIssues(role, worker = {}) {
  const lifecycle = isPlainObject(worker.lifecycle) ? worker.lifecycle : worker;
  const requested = normalizeLifecycleValue(lifecycle.requested ?? lifecycle.requested_status ?? lifecycle.requestedStatus);
  const started = normalizeLifecycleValue(lifecycle.started ?? lifecycle.started_status ?? lifecycle.startedStatus);
  const terminal = normalizeLifecycleValue(
    lifecycle.terminal
    ?? lifecycle.result
    ?? lifecycle.status
    ?? lifecycle.completed
    ?? lifecycle.completed_status
    ?? lifecycle.completedStatus,
  );
  const close = normalizeLifecycleValue(
    lifecycle.close
    ?? lifecycle.closed
    ?? lifecycle.close_status
    ?? lifecycle.closeStatus,
  );
  const issues = [];
  if (!isLifecyclePresent(requested)) issues.push(`${role}_lifecycle_missing_requested`);
  if (!isLifecyclePresent(started)) issues.push(`${role}_lifecycle_missing_started`);
  if (terminal !== "completed") issues.push(`${role}_lifecycle_${terminal || "missing_terminal"}`);
  if (close !== "closed") issues.push(`${role}_lifecycle_${close || "missing_close"}`);
  return issues;
}

function normalizeLifecycleValue(value) {
  if (value === true) return "completed";
  if (value === false || value == null) return "";
  return String(value).trim().toLowerCase().replace(/-/g, "_");
}

function isLifecyclePresent(value) {
  return ["requested", "started", "completed", "true", "yes", "ok"].includes(value);
}

function workerAuthorizationIssues(authorization = {}, mode = "recommended", platform = "codex") {
  if (mode === "off") return [];
  if (!requiresCodexWorkerAuthorization(platform)) return [];
  const status = String(authorization?.status || "unknown").trim().toLowerCase();
  if (status === "authorized") {
    const scope = Array.isArray(authorization.scope) ? authorization.scope : [];
    if (scope.length > 0 && scope.includes("/hw:start") && scope.includes("/hw:resume")) return [];
    return ["worker_authorization_missing_start_resume_scope"];
  }
  if (status === "downgraded_off") return [];
  if (status === "blocked_until_authorized") return ["worker_authorization_blocked_until_authorized"];
  if (status === "not_authorized") return ["worker_authorization_not_authorized"];
  return ["worker_authorization_unknown"];
}

function normalizeRoleAvailability(input = {}) {
  if (!isPlainObject(input)) return {};
  const result = {};
  for (const [role, value] of Object.entries(input)) {
    if (!isPlainObject(value)) continue;
    const status = String(value.status || "unknown").trim().toLowerCase();
    const reason = String(value.reason || "").trim().toLowerCase();
    result[role] = {
      status,
      reason,
    };
  }
  return result;
}

function hasImplementTestBlockingIssue(missingRoles, collisions) {
  return missingRoles.includes("implement")
    || missingRoles.includes("test")
    || collisions.includes("implement_test_shared_worker");
}

function hasAuditBlockingIssue(missingRoles, collisions) {
  return missingRoles.includes("audit")
    || collisions.includes("implement_audit_shared_worker")
    || collisions.includes("test_audit_shared_worker");
}

function implementTestIssueUnavailable(missingRoles, collisions, roleAvailability) {
  if (missingRoles.includes("implement") && !roleUnavailable(roleAvailability.implement)) return false;
  if (missingRoles.includes("test") && !roleUnavailable(roleAvailability.test)) return false;
  if (collisions.includes("implement_test_shared_worker")) {
    return false;
  }
  return true;
}

function roleUnavailable(value = {}) {
  if (!value || value.status !== "unavailable") return false;
  return allowedWorkerDegradeReasons().has(value.reason);
}

function shouldCountAuditCollision(policy, auditAvailability) {
  if (policy.mode !== "recommended") return true;
  return !roleUnavailable(auditAvailability);
}

function allowedWorkerDegradeReasons() {
  return new Set([
    "tool_unavailable",
    "command_unavailable",
    "platform_unsupported",
    "capability_missing",
    "permission_denied",
    "spawn_failed",
    "exec_nonzero",
  ]);
}

function normalizeWorkerSeparationPlatform(projectConfig = {}, globalConfig = {}, workerSeparation = {}) {
  const configured = workerSeparation.platform
    || projectConfig?.agent?.platform
    || globalConfig?.agent?.platform
    || DEFAULT_GLOBAL_CONFIG.agent.platform;
  return String(configured || "codex").trim().toLowerCase().replace(/[_\s]+/g, "-");
}

function requiresCodexWorkerAuthorization(platform = "codex") {
  return String(platform || "codex").trim().toLowerCase().replace(/[_\s]+/g, "-") === "codex";
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
  const text = String(source ?? "");
  if (!text.trim()) return {};
  const parsed = yaml.load(text, { schema: yaml.CORE_SCHEMA });
  return parsed === undefined ? {} : parsed;
}

export function stringifyYaml(value) {
  return yaml.dump(value, {
    schema: yaml.CORE_SCHEMA,
    sortKeys: true,
    noRefs: true,
    lineWidth: 120,
  });
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
