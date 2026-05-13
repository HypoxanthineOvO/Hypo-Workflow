import { access, chmod, copyFile, mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { DEFAULT_GLOBAL_CONFIG, loadConfig, parseYaml, stringifyYaml } from "../config/index.js";
import { writeOpenCodeArtifacts } from "../artifacts/opencode.js";
import { writeClaudeCodeAgentArtifacts, writeClaudeCodePluginArtifacts } from "../artifacts/claude.js";
import { writeThirdPartyAdapterArtifacts } from "../artifacts/third-party.js";
import { renderClaudeCodeSettingsHooks, renderClaudeHookWrapper } from "../claude-hooks/index.js";
import { refreshProjectRegistryAction } from "../actions/index.js";
import { rebuildKnowledgeLedger } from "../knowledge/index.js";

const PROTECTED_AUTHORITY_PATHS = Object.freeze([
  ".pipeline/state.yaml",
  ".pipeline/cycle.yaml",
  ".pipeline/rules.yaml",
]);

export async function runProjectSync(projectRoot = ".", options = {}) {
  const root = resolve(projectRoot);
  const mode = normalizeSyncMode(options);
  const now = options.now || new Date().toISOString();
  const platform = normalizeSyncPlatform(options.platform || "opencode");

  if (options.checkOnly || options.check_only) {
    const externalChanges = await detectExternalChanges(root, options);
    const derivedHealth = await checkDerivedArtifacts(root, { ...options, now });
    return {
      mode,
      check_only: true,
      heavy: false,
      operations: ["external_change_detection", "derived_check"],
      external_changes: externalChanges,
      derived_health: derivedHealth,
    };
  }

  if (mode === "light") return runLightSync(root, { ...options, now });

  const light = await runLightSync(root, { ...options, now });
  const operations = ["light_sync", ...light.operations];
  const config = await loadConfig(join(root, ".pipeline", "config.yaml")).catch(() => DEFAULT_GLOBAL_CONFIG);
  operations.push("config_check");
  let claudeCodeSettings = null;
  let claudeCodeAgents = null;
  let claudeCodeHooks = null;
  let claudeCodePlugin = null;
  let thirdPartyAdapter = null;

  if (platform === "opencode") {
    await writeOpenCodeArtifacts(root, {
      config,
      profile: options.profile,
    });
    operations.push("opencode_artifacts");
  } else if (platform === "claude-code") {
    claudeCodePlugin = await writeClaudeCodePluginArtifacts(root, {
      version: config.version || DEFAULT_GLOBAL_CONFIG.version,
      model: config.claude_code?.model || DEFAULT_GLOBAL_CONFIG.claude_code.model,
    });
    operations.push("claude_code_plugin");
    claudeCodeAgents = await writeClaudeCodeAgentArtifacts(root, { config });
    operations.push("claude_code_agents");
    claudeCodeHooks = await writeClaudeHookArtifacts(root);
    operations.push("claude_code_hooks");
    claudeCodeSettings = await syncClaudeCodeSettings(root, { ...options, config, now });
    operations.push("claude_code_settings");
  } else if (isThirdPartyAdapterPlatform(platform)) {
    thirdPartyAdapter = await writeThirdPartyAdapterArtifacts(root, { platform });
    operations.push(`${platform}_adapter`);
  }

  let compact = { files: [] };
  let derivedHealth = null;
  if (options.repair || mode === "deep") {
    const repair = await repairDerivedArtifacts(root, { ...options, now, config });
    compact = { files: repair.refreshed };
    derivedHealth = repair.health;
    operations.push("derived_repair");
  } else {
    compact = await refreshCompactViews(root, { ...options, config });
    derivedHealth = await checkDerivedArtifacts(root, { ...options, now });
    operations.push("derived_check");
  }
  if (compact.files.length) operations.push("compact_refresh");

  const result = {
    mode,
    heavy: mode === "deep",
    operations: unique(operations),
    external_changes: light.external_changes,
    compact_files: compact.files,
    derived_health: derivedHealth,
  };
  if (claudeCodePlugin) result.claude_code_plugin = claudeCodePlugin;
  if (claudeCodeSettings) result.claude_code_settings = claudeCodeSettings;
  if (claudeCodeAgents) result.claude_code_agents = claudeCodeAgents;
  if (claudeCodeHooks) result.claude_code_hooks = claudeCodeHooks;
  if (thirdPartyAdapter) result.third_party_adapter = thirdPartyAdapter;

  if (mode === "deep") {
    result.dependency_scan = await scanDependencies(root);
    result.architecture_hint = "Deep sync completed dependency scan; run architecture rescan when source layout changed.";
    result.operations.push("dependency_scan", "architecture_rescan_hint");
  }

  return result;
}

function isThirdPartyAdapterPlatform(platform) {
  return platform === "cursor" || platform === "copilot" || platform === "trae";
}

const MANAGED_BY = "hypo-workflow";
const LEGACY_CLAUDE_PLUGIN_REF = "../.claude-plugin/plugin.json";

export async function writeClaudeHookArtifacts(projectRoot = ".", options = {}) {
  const root = resolve(projectRoot);
  const relative = "hooks/claude-hook.mjs";
  const hookFile = join(root, relative);
  const existing = await readOptionalText(hookFile);
  if (existing && !/^\/\/ hypo_workflow_managed_hook:\s*true$/m.test(existing)) {
    return {
      path: relative,
      changed: false,
      conflicts: [{ path: relative, reason: "user-owned-hook-wrapper" }],
      manual_confirmation_required: true,
    };
  }

  const coreImport = options.coreImport || new URL("../index.js", import.meta.url).href;
  const rendered = renderClaudeHookWrapper({ coreImport });
  await mkdir(dirname(hookFile), { recursive: true });
  await writeFile(hookFile, rendered, "utf8");
  await chmod(hookFile, 0o755);
  return {
    path: relative,
    changed: rendered !== existing,
    conflicts: [],
    manual_confirmation_required: false,
    core_import: coreImport,
  };
}

export function mergeClaudeCodeSettings(existing = {}, options = {}) {
  const settings = deepClone(isPlainObject(existing) ? existing : {});
  const config = options.config || DEFAULT_GLOBAL_CONFIG;
  const conflicts = detectClaudeSettingsShapeConflicts(settings);
  const desiredHooks = renderClaudeCodeSettingsHooks(config);
  const desiredModel = config.claude_code?.model || DEFAULT_GLOBAL_CONFIG.claude_code.model;
  const desiredEnv = resolveClaudeCodeApiEnv(config, options.env || process.env);
  conflicts.push(...detectClaudeManagedTargetConflicts(settings, desiredHooks));
  conflicts.push(...detectClaudeModelConflict(settings, desiredModel));
  conflicts.push(...detectClaudeEnvConflicts(settings, desiredEnv));

  if (conflicts.length) {
    return {
      settings,
      changed: false,
      conflicts,
      manual_confirmation_required: true,
      managed_keys: managedClaudeSettingsKeys(desiredEnv),
    };
  }

  const next = deepClone(settings);
  dropLegacyClaudePluginRef(next);
  next.model = desiredModel;
  if (Object.keys(desiredEnv).length) {
    next.env = {
      ...(isPlainObject(next.env) ? next.env : {}),
      ...desiredEnv,
    };
  }
  next.hooks = mergeClaudeHooks(next.hooks || {}, desiredHooks);
  next.hypo_workflow = {
    managed_by: MANAGED_BY,
    settings_version: 1,
    version: config.version || DEFAULT_GLOBAL_CONFIG.version,
    managed_keys: managedClaudeSettingsKeys(desiredEnv),
  };

  return {
    settings: next,
    changed: stableJson(next) !== stableJson(settings),
    conflicts: [],
    manual_confirmation_required: false,
    managed_keys: managedClaudeSettingsKeys(desiredEnv),
  };
}

export async function syncClaudeCodeSettings(projectRoot = ".", options = {}) {
  const root = resolve(projectRoot);
  const config = options.config || DEFAULT_GLOBAL_CONFIG;
  const localFile = config.claude_code?.settings?.local_file || ".claude/settings.local.json";
  const settingsFile = join(root, localFile);
  const existingText = await readOptionalText(settingsFile);
  const existing = existingText ? JSON.parse(existingText) : {};
  const merged = mergeClaudeCodeSettings(existing, options);

  const result = {
    path: localFile,
    changed: false,
    backups: [],
    conflicts: merged.conflicts,
    manual_confirmation_required: merged.manual_confirmation_required,
    managed_keys: merged.managed_keys,
  };

  if (merged.conflicts.length || !merged.changed) return result;

  await mkdir(dirname(settingsFile), { recursive: true });
  if (existingText && config.claude_code?.settings?.backup !== false) {
    const backup = `${settingsFile}.bak.${formatSyncBackupTimestamp(options.now || new Date().toISOString())}`;
    await copyFile(settingsFile, backup);
    result.backups.push(`${localFile}.bak.${formatSyncBackupTimestamp(options.now || new Date().toISOString())}`);
  }
  await writeFile(settingsFile, `${JSON.stringify(merged.settings, null, 2)}\n`, "utf8");
  result.changed = true;
  return result;
}

export function buildDerivedArtifactMap() {
  return [
    {
      id: "progress_compact",
      path: ".pipeline/PROGRESS.compact.md",
      authority: [".pipeline/PROGRESS.md"],
      derived_from: [".pipeline/PROGRESS.md"],
      protected_authorities: [],
      writer_commands: ["/hw:compact", "/hw:sync --repair", "/hw:sync --deep"],
      refresh_triggers: ["progress_update", "compact_refresh", "sync_repair"],
      staleness_severity: "warning",
      repair_behavior: "safe_refresh",
      refresh: renderProgressCompact,
    },
    {
      id: "state_compact",
      path: ".pipeline/state.compact.yaml",
      authority: [".pipeline/state.yaml"],
      derived_from: [".pipeline/state.yaml"],
      protected_authorities: [],
      writer_commands: ["/hw:compact", "/hw:sync --repair", "/hw:sync --deep"],
      refresh_triggers: ["state_update", "compact_refresh", "sync_repair"],
      staleness_severity: "warning",
      repair_behavior: "safe_refresh",
      refresh: renderStateCompact,
    },
    {
      id: "log_compact",
      path: ".pipeline/log.compact.yaml",
      authority: [".pipeline/log.yaml"],
      derived_from: [".pipeline/log.yaml"],
      protected_authorities: [],
      writer_commands: ["/hw:compact", "/hw:sync --repair", "/hw:sync --deep"],
      refresh_triggers: ["log_update", "compact_refresh", "sync_repair"],
      staleness_severity: "warning",
      repair_behavior: "safe_refresh",
      refresh: renderLogCompact,
    },
    {
      id: "metrics_compact",
      path: ".pipeline/metrics.compact.yaml",
      authority: [".pipeline/metrics.yaml"],
      derived_from: [".pipeline/metrics.yaml"],
      protected_authorities: [],
      writer_commands: ["/hw:sync --repair", "/hw:sync --deep"],
      refresh_triggers: ["metrics_update", "sync_repair"],
      staleness_severity: "warning",
      repair_behavior: "safe_refresh",
      refresh: renderMetricsCompact,
    },
    {
      id: "reports_compact",
      path: ".pipeline/reports.compact.md",
      authority: [".pipeline/reports"],
      derived_from: [".pipeline/reports"],
      protected_authorities: [],
      writer_commands: ["/hw:compact", "/hw:sync --repair", "/hw:sync --deep"],
      refresh_triggers: ["report_written", "sync_repair"],
      staleness_severity: "warning",
      repair_behavior: "safe_refresh",
      refresh: renderReportsCompact,
    },
    {
      id: "patches_compact",
      path: ".pipeline/patches.compact.md",
      authority: [".pipeline/patches"],
      derived_from: [".pipeline/patches"],
      protected_authorities: [],
      writer_commands: ["/hw:compact", "/hw:sync --repair", "/hw:sync --deep"],
      refresh_triggers: ["patch_closed", "compact_refresh", "sync_repair"],
      staleness_severity: "warning",
      repair_behavior: "safe_refresh",
      refresh: renderPatchesCompact,
    },
    {
      id: "project_summary",
      path: "PROJECT-SUMMARY.md",
      authority: [".pipeline/state.yaml", ".pipeline/cycle.yaml", ".pipeline/config.yaml", ".pipeline/PROGRESS.md"],
      derived_from: [".pipeline/state.yaml", ".pipeline/cycle.yaml", ".pipeline/config.yaml", ".pipeline/PROGRESS.md"],
      protected_authorities: PROTECTED_AUTHORITY_PATHS,
      writer_commands: ["/hw:sync --repair", "/hw:sync --deep"],
      refresh_triggers: ["lifecycle_commit", "progress_update", "sync_repair"],
      staleness_severity: "warning",
      repair_behavior: "safe_refresh",
      refresh: renderProjectSummary,
    },
    {
      id: "opencode_metadata",
      path: ".opencode/hypo-workflow.json",
      authority: [".pipeline/config.yaml", "core/src/commands/index.js"],
      derived_from: [".pipeline/config.yaml", "core/src/commands/index.js"],
      protected_authorities: [],
      writer_commands: ["hypo-workflow sync --platform opencode", "/hw:sync", "/hw:sync --repair"],
      refresh_triggers: ["config_update", "adapter_sync", "sync_repair"],
      staleness_severity: "warning",
      repair_behavior: "adapter_refresh",
    },
    {
      id: "readme_managed_blocks",
      path: "README.md",
      authority: ["core/src/commands/index.js", "core/src/platform/index.js"],
      derived_from: ["core/src/commands/index.js", "core/src/platform/index.js"],
      protected_authorities: [],
      writer_commands: ["/hw:docs repair", "/hw:release"],
      refresh_triggers: ["command_registry_update", "platform_matrix_update", "docs_repair"],
      staleness_severity: "info",
      repair_behavior: "explicit_docs_repair",
    },
  ].map((entry) => ({
    protected_authority: false,
    ...entry,
  }));
}

export async function checkDerivedArtifacts(projectRoot = ".", options = {}) {
  const root = resolve(projectRoot);
  const map = options.map || buildDerivedArtifactMap();
  const artifacts = [];
  for (const entry of map) {
    artifacts.push(await assessDerivedArtifact(root, normalizeDerivedEntry(entry)));
  }
  const staleCount = artifacts.filter((artifact) => ["missing", "stale"].includes(artifact.status)).length;
  const errors = artifacts.filter((artifact) => artifact.status === "authority_conflict");
  return {
    ok: errors.length === 0 && staleCount === 0,
    checked_at: options.now || new Date().toISOString(),
    stale_count: staleCount,
    error_count: errors.length,
    artifacts,
  };
}

export async function repairDerivedArtifacts(projectRoot = ".", options = {}) {
  const root = resolve(projectRoot);
  const map = (options.map || buildDerivedArtifactMap()).map(normalizeDerivedEntry);
  const refreshed = [];
  const skipped = [];
  const failures = [];

  for (const entry of map) {
    const assessment = await assessDerivedArtifact(root, entry);
    if (assessment.status === "authority_conflict") {
      failures.push({ id: entry.id, path: entry.path, reason: assessment.reason });
      continue;
    }
    if (entry.repair_behavior !== "safe_refresh") {
      skipped.push({ id: entry.id, path: entry.path, reason: entry.repair_behavior });
      continue;
    }
    try {
      const content = await entry.refresh(root, entry, options);
      if (content === null || content === undefined) {
        skipped.push({ id: entry.id, path: entry.path, reason: "source_missing" });
        continue;
      }
      await writeText(join(root, entry.path), content);
      refreshed.push(entry.path);
    } catch (error) {
      failures.push({ id: entry.id, path: entry.path, reason: error.message || String(error) });
    }
  }

  const health = await checkDerivedArtifacts(root, { ...options, map });
  const record = {
    ok: health.ok,
    checked_at: health.checked_at,
    stale_count: health.stale_count,
    error_count: health.error_count,
    refreshed,
    skipped,
    failures,
    artifacts: health.artifacts.map((artifact) => ({
      id: artifact.id,
      path: artifact.path,
      status: artifact.status,
      severity: artifact.severity,
      repair_hint: artifact.repair_hint,
    })),
  };
  await writeText(join(root, ".pipeline", "derived-health.yaml"), `${stringifyYaml(record).trimEnd()}\n`);

  return {
    refreshed,
    skipped,
    failures,
    health,
  };
}

export async function runSessionStartLightSyncCheck(projectRoot = ".", options = {}) {
  const root = resolve(projectRoot);
  const externalChanges = await detectExternalChanges(root, options);
  const promptRequired = externalChanges.length > 0;
  return {
    mode: "session-start-light",
    heavy: false,
    operations: ["external_change_detection"],
    external_changes: externalChanges,
    prompt_required: promptRequired,
    prompt: promptRequired
      ? "External changes detected. Review them or run /hw:sync --light before heavier sync."
      : null,
  };
}

async function runLightSync(root, options = {}) {
  const operations = ["external_change_detection"];
  const externalChanges = await detectExternalChanges(root, options);

  if (options.registryFile && await exists(options.registryFile)) {
    await refreshProjectRegistryAction(options.registryFile, {
      platform: options.platform || "opencode",
      profile: options.profile || "standard",
      now: options.now,
    });
    operations.push("registry_refresh");
  }

  if (await exists(join(root, ".pipeline", "knowledge", "records"))) {
    await rebuildKnowledgeLedger(root);
    operations.push("knowledge_refresh");
  }

  return {
    mode: "light",
    heavy: false,
    operations: unique(operations),
    external_changes: externalChanges,
  };
}

async function detectExternalChanges(root, options = {}) {
  const changes = [];
  const status = git(root, ["status", "--short"], { allowFailure: true });
  const files = status.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (files.length) {
    changes.push({ type: "git_dirty", files });
  }

  const platform = normalizeSyncPlatform(options.platform || "opencode");
  const adapterMetadataPath = platform === "claude-code"
    ? ".claude/settings.local.json"
    : ".opencode/hypo-workflow.json";
  const adapterMetadata = join(root, adapterMetadataPath);
  if (!await exists(adapterMetadata)) {
    changes.push({ type: "adapter_missing", path: adapterMetadataPath });
  } else {
    const configFile = join(root, ".pipeline", "config.yaml");
    if (await isNewer(configFile, adapterMetadata)) {
      changes.push({ type: "adapter_stale", path: adapterMetadataPath, source: ".pipeline/config.yaml" });
    }
  }

  if (options.includeKnowledge !== false && await isKnowledgeSourceNewer(root)) {
    changes.push({ type: "knowledge_stale", path: ".pipeline/knowledge/knowledge.compact.md" });
  }

  return changes;
}

async function refreshCompactViews(root, options = {}) {
  const files = [];
  const compactConfig = resolveCompactConfig(options);
  const entries = buildDerivedArtifactMap().filter((entry) => (
    entry.path.includes(".compact.")
    && typeof entry.refresh === "function"
    && entry.repair_behavior === "safe_refresh"
  ));
  for (const entry of entries) {
    const compact = await entry.refresh(root, entry, { ...options, compact: compactConfig });
    if (compact === null || compact === undefined) continue;
    await writeFile(join(root, entry.path), compact, "utf8");
    files.push(entry.path);
  }
  return { files };
}

async function scanDependencies(root) {
  const pkgFile = join(root, "package.json");
  if (await exists(pkgFile)) {
    const pkg = JSON.parse(await readFile(pkgFile, "utf8"));
    return {
      source: "package.json",
      dependencies: pkg.dependencies || {},
      devDependencies: pkg.devDependencies || {},
    };
  }
  return {
    source: null,
    dependencies: {},
    devDependencies: {},
  };
}

function normalizeSyncMode(options = {}) {
  if (options.light) return "light";
  if (options.deep) return "deep";
  const mode = String(options.mode || "standard").replace(/^--/, "");
  if (["light", "standard", "deep"].includes(mode)) return mode;
  throw new Error(`Unsupported sync mode: ${options.mode}`);
}

function normalizeSyncPlatform(platform) {
  const value = String(platform || "opencode").toLowerCase();
  if (value === "claude") return "claude-code";
  return value;
}

function managedClaudeSettingsKeys(desiredEnv = {}) {
  const keys = [
    "model",
    "hooks.Stop",
    "hooks.SessionStart",
    "hooks.PreCompact",
    "hooks.PostCompact",
    "hooks.PostToolUse",
    "hooks.PostToolBatch",
    "hooks.UserPromptSubmit",
    "hooks.PermissionRequest",
    "hooks.FileChanged",
    "hypo_workflow",
  ];
  for (const key of Object.keys(desiredEnv).sort()) {
    keys.push(`env.${key}`);
  }
  return keys;
}

function detectClaudeSettingsShapeConflicts(settings) {
  const conflicts = [];
  if ("hooks" in settings && !isPlainObject(settings.hooks)) {
    conflicts.push({
      code: "hooks-shape-conflict",
      path: "hooks",
      message: "Expected hooks to be an object before Hypo-Workflow can merge managed hooks.",
    });
  }
  if ("env" in settings && !isPlainObject(settings.env)) {
    conflicts.push({
      code: "env-shape-conflict",
      path: "env",
      message: "Expected env to be an object before Hypo-Workflow can merge managed Claude API settings.",
    });
  }
  if ("hypo_workflow" in settings) {
    const metadata = settings.hypo_workflow;
    if (!isPlainObject(metadata) || (metadata.managed_by && metadata.managed_by !== MANAGED_BY)) {
      conflicts.push({
        code: "managed-key-conflict",
        path: "hypo_workflow",
        message: "Existing hypo_workflow metadata is not owned by Hypo-Workflow.",
      });
    }
  }
  if (isPlainObject(settings.agents)) {
    const agentKey = settings.agents.hypo_workflow || settings.agents["hypo-workflow"];
    if (agentKey && !agentKey.hypo_workflow_managed) {
      conflicts.push({
        code: "agent-key-conflict",
        path: "agents.hypo_workflow",
        message: "Existing Claude agent key overlaps Hypo-Workflow managed namespace.",
      });
    }
  }
  return conflicts;
}

function resolveClaudeCodeApiEnv(config = {}, env = process.env) {
  const api = config.claude_code?.api || {};
  const desired = {};
  if (api.base_url) {
    desired.ANTHROPIC_BASE_URL = String(api.base_url);
  } else if (api.base_url_env && env?.[api.base_url_env]) {
    desired.ANTHROPIC_BASE_URL = String(env[api.base_url_env]);
  }
  if (api.api_key) {
    desired.ANTHROPIC_API_KEY = String(api.api_key);
  } else if (api.api_key_env && env?.[api.api_key_env]) {
    desired.ANTHROPIC_API_KEY = String(env[api.api_key_env]);
  }
  return desired;
}

function dropLegacyClaudePluginRef(settings) {
  const wasManagedByHypo = settings.hypo_workflow?.managed_by === MANAGED_BY;
  if (!wasManagedByHypo || !Array.isArray(settings.plugins)) return;
  if (!settings.plugins.includes(LEGACY_CLAUDE_PLUGIN_REF)) return;

  const plugins = settings.plugins.filter((plugin) => plugin !== LEGACY_CLAUDE_PLUGIN_REF);
  if (plugins.length) {
    settings.plugins = plugins;
  } else {
    delete settings.plugins;
  }
}

function detectClaudeModelConflict(settings, desiredModel) {
  if (!desiredModel || !settings.model || settings.model === desiredModel) return [];
  const managedKeys = settings.hypo_workflow?.managed_keys;
  const modelManagedByHypo = settings.hypo_workflow?.managed_by === MANAGED_BY
    && Array.isArray(managedKeys)
    && managedKeys.includes("model");
  if (modelManagedByHypo) return [];

  return [{
    code: "model-conflict",
    path: "model",
    existing: settings.model,
    desired: desiredModel,
    message: "Existing user-owned Claude model differs from the Hypo-Workflow managed main model.",
  }];
}

function detectClaudeEnvConflicts(settings, desiredEnv) {
  if (!Object.keys(desiredEnv).length) return [];
  const env = settings.env || {};
  if (!isPlainObject(env)) return [];
  const managedKeys = settings.hypo_workflow?.managed_keys;
  const envManagedByHypo = settings.hypo_workflow?.managed_by === MANAGED_BY
    && Array.isArray(managedKeys);
  const conflicts = [];
  for (const [key, desired] of Object.entries(desiredEnv)) {
    if (!env[key] || env[key] === desired) continue;
    if (envManagedByHypo && managedKeys.includes(`env.${key}`)) continue;
    conflicts.push({
      code: "env-conflict",
      path: `env.${key}`,
      existing: key === "ANTHROPIC_API_KEY" ? "[redacted]" : env[key],
      desired: key === "ANTHROPIC_API_KEY" ? "[redacted]" : desired,
      message: "Existing user-owned Claude API env differs from the Hypo-Workflow managed API setting.",
    });
  }
  return conflicts;
}

function detectClaudeManagedTargetConflicts(settings, desiredHooks) {
  const conflicts = [];
  const hooks = settings.hooks || {};
  if (!isPlainObject(hooks)) return conflicts;

  for (const [event, desiredGroups] of Object.entries(desiredHooks)) {
    const existingGroups = hooks[event] || [];
    if (!Array.isArray(existingGroups)) {
      conflicts.push({
        code: "hook-shape-conflict",
        path: `hooks.${event}`,
        message: `Expected hooks.${event} to be an array before Hypo-Workflow can merge managed hooks.`,
      });
      continue;
    }
    const desiredCommands = new Set(desiredGroups.flatMap(hookCommands));
    for (const [index, group] of existingGroups.entries()) {
      if (isManagedClaudeHookGroup(group)) continue;
      for (const command of hookCommands(group)) {
        if (desiredCommands.has(command)) {
          conflicts.push({
            code: "hook-command-conflict",
            path: `hooks.${event}[${index}]`,
            command,
            message: "Existing user-owned hook command overlaps a Hypo-Workflow managed hook.",
          });
        }
      }
    }
  }
  return conflicts;
}

function mergeClaudeHooks(hooks, desiredHooks) {
  const next = { ...hooks };
  for (const [event, desiredGroups] of Object.entries(desiredHooks)) {
    const existingGroups = Array.isArray(next[event]) ? next[event] : [];
    const userGroups = existingGroups.filter((group) => !isManagedClaudeHookGroup(group));
    next[event] = [...userGroups, ...deepClone(desiredGroups)];
  }
  return next;
}

function isManagedClaudeHookGroup(group) {
  return Boolean(group && typeof group === "object" && (
    group.hypo_workflow_managed === true
    || group.managed_by === MANAGED_BY
    || group.hypo_workflow?.managed_by === MANAGED_BY
  ));
}

function hookCommands(group) {
  if (!group || typeof group !== "object" || !Array.isArray(group.hooks)) return [];
  return group.hooks
    .map((hook) => hook && typeof hook === "object" ? hook.command : null)
    .filter(Boolean);
}

function formatSyncBackupTimestamp(value) {
  const compact = String(value).replace(/\D/g, "");
  return compact.slice(0, 14) || "backup";
}

function stableJson(value) {
  return JSON.stringify(sortJson(value));
}

function sortJson(value) {
  if (Array.isArray(value)) return value.map(sortJson);
  if (!isPlainObject(value)) return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, sortJson(value[key])]));
}

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function isPlainObject(value) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

async function isKnowledgeSourceNewer(root) {
  const recordsDir = join(root, ".pipeline", "knowledge", "records");
  const compactFile = join(root, ".pipeline", "knowledge", "knowledge.compact.md");
  if (!await exists(recordsDir)) return false;
  if (!await exists(compactFile)) return true;
  const compactStat = await stat(compactFile);
  let entries = [];
  try {
    entries = await readdir(recordsDir);
  } catch {
    return false;
  }
  for (const entry of entries) {
    if (await isNewer(join(recordsDir, entry), compactFile, compactStat)) return true;
  }
  return false;
}

async function isNewer(source, target, targetStat = null) {
  try {
    const sourceStat = await stat(source);
    const resolvedTargetStat = targetStat || await stat(target);
    return sourceStat.mtimeMs > resolvedTargetStat.mtimeMs;
  } catch {
    return false;
  }
}

async function exists(file) {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
}

async function assessDerivedArtifact(root, entry) {
  if (PROTECTED_AUTHORITY_PATHS.includes(entry.path)) {
    return {
      id: entry.id,
      path: entry.path,
      status: "authority_conflict",
      severity: "error",
      reason: "derived target overlaps protected authority",
      authority: entry.authority,
      derived_from: entry.derived_from,
      writer_commands: entry.writer_commands,
      refresh_triggers: entry.refresh_triggers,
      repair_behavior: "requires_confirmation",
      repair_hint: `Refusing to treat protected authority ${entry.path} as a derived artifact; repair requires explicit confirmation.`,
    };
  }

  const target = await maxMtime(root, entry.path);
  const sources = [];
  for (const source of entry.derived_from) {
    const sourceMtime = await maxMtime(root, source);
    sources.push({ path: source, exists: sourceMtime.exists, mtimeMs: sourceMtime.mtimeMs });
  }
  const existingSources = sources.filter((source) => source.exists);
  if (!target.exists && !existingSources.length) {
    return derivedStatus(entry, "missing_sources", target, sources);
  }
  if (!target.exists) {
    return derivedStatus(entry, "missing", target, sources);
  }
  if (existingSources.some((source) => source.mtimeMs > target.mtimeMs)) {
    return derivedStatus(entry, "stale", target, sources);
  }
  return derivedStatus(entry, "fresh", target, sources);
}

function derivedStatus(entry, status, target, sources) {
  const needsRepair = ["missing", "stale"].includes(status);
  return {
    id: entry.id,
    path: entry.path,
    status,
    severity: needsRepair ? entry.staleness_severity : "ok",
    authority: entry.authority,
    derived_from: entry.derived_from,
    protected_authorities: entry.protected_authorities,
    writer_commands: entry.writer_commands,
    refresh_triggers: entry.refresh_triggers,
    repair_behavior: entry.repair_behavior,
    target_mtime_ms: target.exists ? target.mtimeMs : null,
    sources,
    repair_hint: needsRepair ? repairHint(entry) : null,
  };
}

function repairHint(entry) {
  if (entry.repair_behavior === "safe_refresh") return `Run /hw:sync --repair to refresh ${entry.path}.`;
  if (entry.repair_behavior === "adapter_refresh") return "Run /hw:sync to refresh platform adapters.";
  return `Run ${entry.writer_commands[0] || "/hw:docs repair"} to repair ${entry.path}.`;
}

function normalizeDerivedEntry(entry = {}) {
  return {
    id: entry.id || entry.path,
    path: entry.path,
    authority: arrayOfStrings(entry.authority || entry.authorities || entry.derived_from),
    derived_from: arrayOfStrings(entry.derived_from || entry.authority || entry.authorities),
    protected_authorities: arrayOfStrings(entry.protected_authorities),
    writer_commands: arrayOfStrings(entry.writer_commands || entry.writers),
    refresh_triggers: arrayOfStrings(entry.refresh_triggers || entry.triggers),
    staleness_severity: entry.staleness_severity || "warning",
    repair_behavior: entry.repair_behavior || "manual_repair",
    refresh: entry.refresh,
  };
}

async function renderProgressCompact(root, _entry = null, options = {}) {
  const source = await readOptionalText(join(root, ".pipeline", "PROGRESS.md"));
  if (!source) return null;
  const limit = compactInteger(options, "progress_recent", 15);
  return `${source.split(/\r?\n/).slice(0, limit).join("\n").trimEnd()}\n`;
}

async function renderStateCompact(root, _entry = null, options = {}) {
  const source = await readOptionalText(join(root, ".pipeline", "state.yaml"));
  if (!source) return null;
  const state = parseYaml(source);
  const fullCount = compactInteger(options, "state_history_full", 1, { allowZero: true });
  const compact = {};
  for (const key of ["pipeline", "current", "last_heartbeat", "acceptance", "continuation"]) {
    if (state[key] !== undefined) compact[key] = state[key];
  }
  if (Array.isArray(state.milestones)) {
    compact.milestones = state.milestones.map((milestone) => ({
      ...(milestone.id ? { id: milestone.id } : {}),
      ...(milestone.name ? { name: milestone.name } : {}),
      ...(milestone.feature_id ? { feature_id: milestone.feature_id } : {}),
      ...(milestone.status ? { status: milestone.status } : {}),
    }));
  }
  if (state.history?.completed_prompts) {
    const completed = state.history.completed_prompts;
    const recent = fullCount > 0 ? completed.slice(-fullCount) : [];
    const older = completed.slice(0, Math.max(0, completed.length - fullCount)).map((entry) => ({
      prompt: entry.prompt || entry.prompt_name || entry.name,
      status: entry.status || entry.result,
      score_summary: entry.score_summary || entry.scores || entry.score || null,
    }));
    compact.history = {
      completed_prompts: [...older, ...recent],
    };
  }
  return `${stringifyYaml(compact).trimEnd()}\n`;
}

async function renderLogCompact(root, _entry = null, options = {}) {
  const source = await readOptionalText(join(root, ".pipeline", "log.yaml"));
  if (!source) return null;
  const log = parseYaml(source);
  const entries = Array.isArray(log.entries) ? log.entries : [];
  if (!entries.length) return null;
  const limit = compactInteger(options, "log_recent", 20);
  const sorted = entries
    .map((entry, index) => ({ entry, index, timestamp: Date.parse(entry.timestamp || "") }))
    .sort(compareLogEntries)
    .map((item) => item.entry);
  const recent = sorted.slice(0, limit);
  const older = sorted.slice(limit);
  const compact = { entries: recent };
  if (older.length) {
    const timestamps = older.map((entry) => entry.timestamp).filter(Boolean).sort();
    const counts = {};
    for (const entry of older) counts[entry.type || "unknown"] = (counts[entry.type || "unknown"] || 0) + 1;
    compact.older = {
      count: older.length,
      earliest: timestamps[0] || null,
      latest: timestamps[timestamps.length - 1] || null,
      summary: Object.entries(counts).map(([type, count]) => `${type}:${count}`).join(", "),
    };
  }
  return `${stringifyYaml(compact).trimEnd()}\n`;
}

async function renderMetricsCompact(root) {
  const source = await readOptionalText(join(root, ".pipeline", "metrics.yaml"));
  if (!source) return null;
  return `${source.split(/\r?\n/).slice(0, 120).join("\n").trimEnd()}\n`;
}

async function renderReportsCompact(root, _entry = null, options = {}) {
  const reportsDir = join(root, ".pipeline", "reports");
  const summaryLines = compactInteger(options, "reports_summary_lines", 3);
  let entries = [];
  try {
    entries = await readdir(reportsDir);
  } catch {
    return null;
  }
  const reports = [];
  for (const entry of entries.filter((name) => name.endsWith(".md")).sort()) {
    const source = await readOptionalText(join(reportsDir, entry));
    if (!source) continue;
    const title = source.split(/\r?\n/).find((line) => /^#\s+/.test(line)) || `# ${entry}`;
    const result = /-\s*Result:\s*(.+)/i.exec(source)?.[1] || /Decision:\s*(.+)/i.exec(source)?.[1] || "unknown";
    const summary = source
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !/^#\s+/.test(line))
      .slice(0, summaryLines)
      .join(" | ");
    reports.push(`- ${title.replace(/^#\s+/, "")} (${entry}) result=${result}${summary ? ` summary=${summary}` : ""}`);
  }
  if (!reports.length) return null;
  return `# Reports Compact\n\n${reports.join("\n")}\n`;
}

async function renderPatchesCompact(root) {
  const patchDir = join(root, ".pipeline", "patches");
  let entries = [];
  try {
    entries = await readdir(patchDir);
  } catch {
    return null;
  }
  const patches = [];
  for (const entry of entries.filter((name) => /^P\d+.*\.md$/.test(name)).sort()) {
    const source = await readOptionalText(join(patchDir, entry));
    if (!source) continue;
    if (!/^- (状态|Status|status):\s*(closed|done|resolved|已关闭)/im.test(source)) continue;
    const title = source.split(/\r?\n/).find((line) => /^#\s+/.test(line))?.replace(/^#\s+/, "") || entry;
    const change = /^- (改动|Change|Summary):\s*(.+)$/im.exec(source)?.[2]
      || /^- commit:\s*(.+)$/im.exec(source)?.[1]
      || "closed";
    patches.push(`- ${title}: ${change}`);
  }
  if (!patches.length) return null;
  return `# Patches Compact\n\n${patches.join("\n")}\n`;
}

function resolveCompactConfig(options = {}) {
  return {
    ...(DEFAULT_GLOBAL_CONFIG.compact || {}),
    ...(options.config?.compact || {}),
    ...(options.compact || {}),
  };
}

function compactInteger(options = {}, key, fallback, settings = {}) {
  const compact = resolveCompactConfig(options);
  const value = Number(compact[key]);
  const minimum = settings.allowZero ? 0 : 1;
  return Number.isInteger(value) && value >= minimum ? value : fallback;
}

function compareLogEntries(left, right) {
  const leftValid = Number.isFinite(left.timestamp);
  const rightValid = Number.isFinite(right.timestamp);
  if (leftValid && rightValid && left.timestamp !== right.timestamp) return right.timestamp - left.timestamp;
  if (leftValid !== rightValid) return leftValid ? -1 : 1;
  return left.index - right.index;
}

async function renderProjectSummary(root) {
  const config = await readYaml(join(root, ".pipeline", "config.yaml"));
  const state = await readYaml(join(root, ".pipeline", "state.yaml"));
  const cycle = await readYaml(join(root, ".pipeline", "cycle.yaml"));
  const progress = await readOptionalText(join(root, ".pipeline", "PROGRESS.md"));
  const pipelineName = state.pipeline?.name || config.pipeline?.name || "Hypo-Workflow Project";
  const cycleId = cycle.cycle?.id || cycle.cycle?.number || "n/a";
  const current = state.current?.prompt_name || "n/a";
  const progressLine = progress
    .split(/\r?\n/)
    .find((line) => /M\d+|F\d+|进度|Status|状态/.test(line))
    || "See .pipeline/PROGRESS.md";
  return [
    `# ${pipelineName}`,
    "",
    "This file is a generated Hypo-Workflow project summary. Edit authority files under `.pipeline/`, then run `/hw:sync --repair`.",
    "",
    `- Pipeline status: ${state.pipeline?.status || "unknown"}`,
    `- Cycle: ${cycleId}`,
    `- Current: ${current}`,
    `- Step: ${state.current?.step || "n/a"}`,
    `- Progress: ${state.pipeline?.prompts_completed ?? "n/a"}/${state.pipeline?.prompts_total ?? "n/a"}`,
    `- Progress note: ${progressLine.replace(/^#+\s*/, "")}`,
  ].join("\n") + "\n";
}

async function readYaml(file) {
  const source = await readOptionalText(file);
  return source ? parseYaml(source) : {};
}

async function readOptionalText(file) {
  try {
    return await readFile(file, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") return "";
    throw error;
  }
}

async function writeText(file, content) {
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, content.endsWith("\n") ? content : `${content}\n`, "utf8");
}

async function maxMtime(root, relativePath) {
  const path = join(root, relativePath);
  try {
    const stats = await stat(path);
    if (!stats.isDirectory()) return { exists: true, mtimeMs: stats.mtimeMs };
    const childTimes = await maxDirectoryMtime(path);
    return { exists: true, mtimeMs: Math.max(stats.mtimeMs, childTimes) };
  } catch (error) {
    if (error.code === "ENOENT") return { exists: false, mtimeMs: 0 };
    throw error;
  }
}

async function maxDirectoryMtime(dir) {
  let max = 0;
  let entries = [];
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return max;
  }
  for (const entry of entries) {
    const path = join(dir, entry.name);
    const stats = await stat(path);
    max = Math.max(max, stats.mtimeMs);
    if (entry.isDirectory()) max = Math.max(max, await maxDirectoryMtime(path));
  }
  return max;
}

function arrayOfStrings(value) {
  if (Array.isArray(value)) return value.map((item) => String(item)).filter(Boolean);
  if (!value) return [];
  return [String(value)];
}

function git(cwd, args, options = {}) {
  const result = spawnSync("git", args, { cwd, encoding: "utf8" });
  if (result.status !== 0 && !options.allowFailure) {
    throw new Error(result.stderr || result.stdout || `git ${args.join(" ")} failed`);
  }
  return result.stdout.trim();
}

function unique(values) {
  return [...new Set(values)];
}
