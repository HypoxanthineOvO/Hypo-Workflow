import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { DEFAULT_GLOBAL_CONFIG, loadConfig, loadProjectRegistry, mergeConfig, writeConfig } from "../config/index.js";
import { resolveAcceptancePolicy } from "../acceptance/index.js";
import { buildOpenCodeStatusModel } from "../opencode-status/index.js";
import { assertLegacyWorkspaceWritable } from "../workspace-format/index.js";

const PROTECTED_LIFECYCLE_FILES = Object.freeze([
  ".pipeline/state.yaml",
  ".pipeline/cycle.yaml",
  ".pipeline/rules.yaml",
]);

const GLOBAL_CONFIG_CONTROLS = Object.freeze([
  { path: "agent.platform", label: "Agent Platform", type: "select", values: ["codex", "claude-code"], sync: true },
  { path: "agent.model", label: "Agent Model", type: "text" },
  { path: "execution.default_mode", label: "Execution Mode", type: "select", values: ["self", "subagent"] },
  { path: "execution.analysis.interaction_mode", label: "Analysis Mode", type: "select", values: ["manual", "hybrid", "auto"] },
  { path: "subagent.provider", label: "Subagent Provider", type: "select", values: ["codex", "claude"], sync: true },
  { path: "dashboard.enabled", label: "Dashboard Enabled", type: "boolean" },
  { path: "dashboard.port", label: "Dashboard Port", type: "integer", min: 1, max: 65535 },
  { path: "plan.default_mode", label: "Plan Mode", type: "select", values: ["interactive", "auto"] },
  { path: "plan.interaction_depth", label: "Interaction Depth", type: "select", values: ["low", "medium", "high"] },
  { path: "plan.interactive.min_rounds", label: "Plan Min Rounds", type: "integer", min: 1 },
  { path: "plan.interactive.require_explicit_confirm", label: "Plan Confirm", type: "boolean" },
  { path: "output.language", label: "Output Language", type: "text" },
  { path: "output.timezone", label: "Output Timezone", type: "text" },
  { path: "watchdog.enabled", label: "Watchdog Enabled", type: "boolean" },
  { path: "watchdog.interval", label: "Watchdog Interval", type: "integer", min: 1 },
  { path: "watchdog.heartbeat_timeout", label: "Watchdog Heartbeat Timeout", type: "integer", min: 1 },
  { path: "compact.auto", label: "Compact Auto", type: "boolean" },
  { path: "compact.log_recent", label: "Compact Recent Logs", type: "integer", min: 1 },
  { path: "sync.register_projects", label: "Sync Project Registry", type: "boolean", sync: true },
  { path: "sync.platforms.opencode.profile", label: "OpenCode Sync Profile", type: "text", sync: true },
  { path: "sync.platforms.opencode.auto_continue_mode", label: "OpenCode Auto Continue Mode", type: "select", values: ["ask", "safe", "aggressive"], sync: true },
  { path: "release.readme.mode", label: "README Mode", type: "select", values: ["loose", "strict"] },
  { path: "release.readme.full_regen", label: "README Regeneration", type: "select", values: ["auto", "ask", "deny"] },
  { path: "batch.decompose_mode", label: "Batch Decompose Mode", type: "select", values: ["upfront", "just_in_time"] },
  { path: "batch.failure_policy", label: "Batch Failure Policy", type: "select", values: ["stop", "skip_defer", "retry"] },
  { path: "batch.auto_chain", label: "Batch Auto Chain", type: "boolean" },
  { path: "acceptance.mode", label: "Acceptance Mode", type: "select", values: ["auto", "confirm", "manual", "timeout"] },
  { path: "acceptance.timeout_hours", label: "Acceptance Timeout Hours", type: "number", min: 1 },
  { path: "model_pool.roles.plan.primary", label: "Plan Model", type: "text", sync: true },
  { path: "model_pool.roles.implement.primary", label: "Implement Model", type: "text", sync: true },
  { path: "model_pool.roles.review.primary", label: "Review Model", type: "text", sync: true },
  { path: "model_pool.roles.evaluate.primary", label: "Evaluate Model", type: "text", sync: true },
  { path: "model_pool.roles.chat.primary", label: "Chat Model", type: "text", sync: true },
]);

const PROJECT_CONFIG_CONTROLS = Object.freeze([
  { path: "platform", label: "Project Platform", type: "select", values: ["auto", "claude", "codex"], sync: true },
  { path: "default_workflow_kind", label: "Default Workflow Kind", type: "select", values: ["build", "analysis", "showcase"] },
  { path: "execution.mode", label: "Execution Mode", type: "select", values: ["self", "subagent"] },
  { path: "execution.subagent_tool", label: "Subagent Tool", type: "text", sync: true },
  { path: "execution.steps.preset", label: "Execution Preset", type: "select", values: ["tdd", "analysis", "implement-only"] },
  { path: "execution.analysis.interaction_mode", label: "Analysis Mode", type: "select", values: ["manual", "hybrid", "auto"] },
  { path: "evaluation.auto_continue", label: "Auto Continue", type: "boolean" },
  { path: "evaluation.max_diff_score", label: "Max Diff Score", type: "integer", min: 0 },
  { path: "plan.mode", label: "Plan Mode", type: "select", values: ["interactive", "auto"] },
  { path: "plan.interaction_depth", label: "Interaction Depth", type: "select", values: ["low", "medium", "high"] },
  { path: "plan.interactive.min_rounds", label: "Plan Min Rounds", type: "integer", min: 1 },
  { path: "plan.interactive.require_explicit_confirm", label: "Plan Confirm", type: "boolean" },
  { path: "output.language", label: "Output Language", type: "text" },
  { path: "output.timezone", label: "Output Timezone", type: "text" },
  { path: "watchdog.enabled", label: "Watchdog Enabled", type: "boolean" },
  { path: "watchdog.interval", label: "Watchdog Interval", type: "integer", min: 1 },
  { path: "watchdog.heartbeat_timeout", label: "Watchdog Heartbeat Timeout", type: "integer", min: 1 },
  { path: "compact.auto", label: "Compact Auto", type: "boolean" },
  { path: "compact.log_recent", label: "Compact Recent Logs", type: "integer", min: 1 },
  { path: "sync.register_projects", label: "Sync Project Registry", type: "boolean", sync: true },
  { path: "sync.platforms.opencode.profile", label: "OpenCode Sync Profile", type: "text", sync: true },
  { path: "sync.platforms.opencode.auto_continue_mode", label: "OpenCode Auto Continue Mode", type: "select", values: ["ask", "safe", "aggressive"], sync: true },
  { path: "opencode.auto_continue", label: "OpenCode Auto Continue", type: "boolean", sync: true },
  { path: "opencode.profile", label: "OpenCode Profile", type: "text", sync: true },
  { path: "opencode.compaction.effective_context_target", label: "OpenCode Context Target", type: "integer", min: 1, sync: true },
  { path: "opencode.agents.plan.model", label: "OpenCode Plan Model", type: "text", sync: true },
  { path: "opencode.agents.compact.model", label: "OpenCode Compact Model", type: "text", sync: true },
  { path: "opencode.agents.test.model", label: "OpenCode Test Model", type: "text", sync: true },
  { path: "opencode.agents.code-a.model", label: "OpenCode Code A Model", type: "text", sync: true },
  { path: "opencode.agents.code-b.model", label: "OpenCode Code B Model", type: "text", sync: true },
  { path: "opencode.agents.debug.model", label: "OpenCode Debug Model", type: "text", sync: true },
  { path: "opencode.agents.report.model", label: "OpenCode Report Model", type: "text", sync: true },
  { path: "release.readme.mode", label: "README Mode", type: "select", values: ["loose", "strict"] },
  { path: "release.readme.full_regen", label: "README Regeneration", type: "select", values: ["auto", "ask", "deny"] },
  { path: "batch.decompose_mode", label: "Batch Decompose Mode", type: "select", values: ["upfront", "just_in_time"] },
  { path: "batch.failure_policy", label: "Batch Failure Policy", type: "select", values: ["stop", "skip_defer", "retry"] },
  { path: "batch.auto_chain", label: "Batch Auto Chain", type: "boolean" },
  { path: "acceptance.mode", label: "Acceptance Mode", type: "select", values: ["auto", "confirm", "manual", "timeout"] },
  { path: "acceptance.timeout_hours", label: "Acceptance Timeout Hours", type: "number", min: 1 },
  { path: "model_pool.roles.plan.primary", label: "Plan Model", type: "text", sync: true },
  { path: "model_pool.roles.implement.primary", label: "Implement Model", type: "text", sync: true },
  { path: "model_pool.roles.review.primary", label: "Review Model", type: "text", sync: true },
  { path: "model_pool.roles.evaluate.primary", label: "Evaluate Model", type: "text", sync: true },
  { path: "model_pool.roles.chat.primary", label: "Chat Model", type: "text", sync: true },
]);

export async function buildGlobalTuiModel(options = {}) {
  const homeDir = options.homeDir || homedir();
  const configFile = options.configFile || join(homeDir, ".hypo-workflow", "config.yaml");
  const registryFile = options.registryFile || join(homeDir, ".hypo-workflow", "projects.yaml");
  const config = await loadConfig(configFile).catch(() => DEFAULT_GLOBAL_CONFIG);
  const acceptancePolicy = resolveAcceptancePolicy(config, DEFAULT_GLOBAL_CONFIG);
  const registry = await loadProjectRegistry(registryFile);
  const projects = registry.projects || [];
  const selectedProject = options.selectedProjectId
    ? projects.find((project) => project.id === options.selectedProjectId) || null
    : registry.selected_project_id
      ? projects.find((project) => project.id === registry.selected_project_id) || projects[0] || null
      : projects[options.selectedIndex || 0] || null;

  return {
    title: "Hypo-Workflow Global TUI",
    homeDir,
    config_file: configFile,
    registry_file: registryFile,
    projects,
    detail: {
      project: selectedProject,
      status: selectedProject?.pipeline_status || "no project selected",
      acceptance: selectedProject?.acceptance || {
        mode: acceptancePolicy.mode,
        state: acceptancePolicy.default_state,
      },
      knowledge: selectedProject?.knowledge || { status: "missing" },
    },
    config: {
      agent: config.agent || DEFAULT_GLOBAL_CONFIG.agent,
      dashboard: config.dashboard || DEFAULT_GLOBAL_CONFIG.dashboard,
      output: config.output || DEFAULT_GLOBAL_CONFIG.output,
      acceptance: acceptancePolicy,
      sync: config.sync || DEFAULT_GLOBAL_CONFIG.sync,
    },
    model_pool: config.model_pool || DEFAULT_GLOBAL_CONFIG.model_pool,
    actions: [
      { id: "open", label: "Open Project", side_effect: "explicit" },
      { id: "edit-model-pool", label: "Edit Model Pool", side_effect: "confirm" },
      { id: "add-project", label: "Add Project", side_effect: "confirm" },
      { id: "scan-projects", label: "Scan Projects", side_effect: "confirm" },
      { id: "refresh-projects", label: "Refresh Registry", side_effect: "explicit" },
      { id: "sync", label: "Sync Project", side_effect: "confirm" },
      { id: "doctor", label: "Run Doctor", side_effect: "explicit" },
      { id: "quit", label: "Quit", side_effect: "none" },
    ],
  };
}

export function renderGlobalTuiSnapshot(model = {}) {
  const lines = [
    model.title || "Hypo-Workflow Global TUI",
    "",
    "Projects",
  ];

  if (model.projects?.length) {
    for (const project of model.projects) {
      lines.push(`- ${project.display_name} [${project.pipeline_status}] ${project.path}`);
      lines.push(`  ${project.platform}/${project.profile} cycle=${project.current_cycle || "n/a"} patches=${project.open_patch_count ?? 0} acceptance=${project.acceptance?.mode || "auto"}/${project.acceptance?.state || "pending"}`);
    }
  } else {
    lines.push("- No registered projects");
  }

  lines.push(
    "",
    "Project Detail",
    `- Selected: ${model.detail?.project?.display_name || "n/a"}`,
    `- Status: ${model.detail?.status || "n/a"}`,
    `- Acceptance: ${model.detail?.acceptance?.mode || "auto"}/${model.detail?.acceptance?.state || "pending"}`,
    `- Knowledge: ${model.detail?.knowledge?.status || "missing"}`,
    "",
    "Global Config",
    `- Platform: ${model.config?.agent?.platform || "auto"}`,
    `- Dashboard: ${model.config?.dashboard?.enabled ? "enabled" : "disabled"}:${model.config?.dashboard?.port || 7700}`,
    `- Output: ${model.config?.output?.language || "zh-CN"} ${model.config?.output?.timezone || "Asia/Shanghai"}`,
    `- Acceptance: ${model.config?.acceptance?.mode || "auto"}`,
    "",
    "Model Pool",
  );

  for (const [role, config] of Object.entries(model.model_pool?.roles || {})) {
    lines.push(`- ${role}: ${config.primary}${config.fallback?.length ? ` -> ${config.fallback.join(" -> ")}` : ""}`);
  }

  lines.push("", "Sync/Actions");
  for (const action of model.actions || []) {
    lines.push(`- ${action.label} (${action.side_effect})`);
  }

  return `${lines.join("\n").trimEnd()}\n`;
}

export async function buildConfigTuiModel(options = {}) {
  const target = resolveConfigTuiTarget(options);
  assertNotProtectedLifecycleFile(target.config_file, target.project_root);
  const rawConfig = await loadConfig(target.config_file, {}).catch(() => ({}));
  const defaults = target.id === "global" ? DEFAULT_GLOBAL_CONFIG : {};
  const effective = target.id === "global" ? mergeConfig(DEFAULT_GLOBAL_CONFIG, rawConfig) : rawConfig;
  const controls = controlsForTarget(target.id).map((control) => ({
    ...control,
    value: getPath(effective, control.path) ?? getPath(defaults, control.path) ?? null,
  }));

  return {
    title: "Hypo-Workflow Config TUI",
    read_only: false,
    target,
    targets: [
      {
        id: "global",
        label: "Global Defaults",
        config_file: resolveGlobalConfigPath(options),
        scope: "user",
      },
      {
        id: "project",
        label: "Current Project",
        config_file: resolveProjectConfigPath(options),
        scope: "project",
      },
    ],
    config: effective,
    controls,
    confirmation_required: true,
    protected_files: [...PROTECTED_LIFECYCLE_FILES],
  };
}

export async function stageConfigTuiEdit(options = {}) {
  const model = await buildConfigTuiModel(options);
  const before = await loadConfig(model.target.config_file, {}).catch(() => ({}));
  const after = cloneConfig(before);
  const errors = [];
  const edits = options.edits || {};
  const controls = new Map(model.controls.map((control) => [control.path, control]));

  for (const [path, value] of Object.entries(edits)) {
    const control = controls.get(path);
    if (!control) {
      errors.push(`${path}: unsupported config field for ${model.target.id} target`);
      continue;
    }
    const normalized = normalizeControlValue(control, value, errors);
    if (!errors.some((error) => error.startsWith(`${path}:`))) {
      setPath(after, path, normalized);
    }
  }

  errors.push(...validateConfigTuiShape(model.target.id, after));
  const diff = diffEditedPaths(before, after, Object.keys(edits));
  const sync = buildConfigTuiSyncGuidance(model.target.id, diff, controls);

  return {
    target: model.target,
    valid: errors.length === 0,
    errors,
    before,
    after,
    diff,
    sync,
    confirmation_required: true,
    protected_files: [...PROTECTED_LIFECYCLE_FILES],
  };
}

export async function applyConfigTuiEdit(staged, options = {}) {
  if (!staged || typeof staged !== "object") {
    throw new Error("staged config edit is required");
  }
  if (!staged.valid) {
    throw new Error(`Cannot apply invalid config edit: ${(staged.errors || []).join("; ")}`);
  }
  if (!options.confirm) {
    return {
      written: false,
      reason: "confirmation_required",
      target: staged.target,
      diff: staged.diff || [],
      sync: staged.sync,
    };
  }

  if (staged.target.id === "project") {
    await assertLegacyWorkspaceWritable(staged.target.project_root, "legacy.tui.project-config");
  }

  assertNotProtectedLifecycleFile(staged.target.config_file, staged.target.project_root);
  const config = staged.target.id === "global"
    ? {
      ...staged.after,
      version: staged.after.version || DEFAULT_GLOBAL_CONFIG.version,
      updated: options.now || staged.after.updated || new Date().toISOString(),
    }
    : staged.after;
  await writeConfig(staged.target.config_file, config);
  return {
    written: true,
    target: staged.target,
    diff: staged.diff || [],
    sync: staged.sync,
  };
}

export async function buildReadOnlyProgressDashboardModel(projectRoot = ".", options = {}) {
  const root = resolve(projectRoot);
  const status = await buildOpenCodeStatusModel(root, options);
  const activeConfig = await loadActiveConfigSummary(root, options);
  return {
    title: "Read-Only Progress Dashboard",
    read_only: true,
    project_root: root,
    phase: status.lifecycle?.phase || status.current?.phase || status.pipeline?.status || "unknown",
    next_action: status.lifecycle?.next_action || "none",
    lease: status.lease || { action: "none", reason: "no_lease", repair_hint: null },
    recent_events: status.recent_events || [],
    derived_health: status.derived || { ok: true, stale_count: 0, error_count: 0, artifacts: [] },
    active_config: activeConfig,
    status,
  };
}

export function renderReadOnlyProgressDashboardSnapshot(model = {}) {
  const derived = model.derived_health || {};
  const config = model.active_config || {};
  const events = model.recent_events || [];
  const lines = [
    model.title || "Read-Only Progress Dashboard",
    "",
    `Phase: ${model.phase || "unknown"}`,
    `Next: ${model.next_action || "none"}`,
    `Lease: ${model.lease?.action || "none"} (${model.lease?.reason || "n/a"})`,
    `Derived: ${derived.ok === false ? "needs_repair" : "fresh"} stale=${derived.stale_count || 0} errors=${derived.error_count || 0}`,
    "",
    "Active Config",
    `- Platform: ${config.platform || "auto"}`,
    `- Execution: ${config.execution_mode || "self"} preset=${config.preset || "n/a"}`,
    `- Plan: ${config.plan_mode || "interactive"} depth=${config.interaction_depth || "medium"}`,
    `- Output: ${config.language || "zh-CN"} ${config.timezone || "Asia/Shanghai"}`,
    `- OpenCode: ${config.opencode_profile || "standard"} auto_continue=${formatDashboardBoolean(config.opencode_auto_continue)}`,
    "",
    "Recent Events",
  ];

  if (events.length) {
    for (const event of events.slice(0, 8)) lines.push(`- ${event.summary}`);
  } else {
    lines.push("- No recent events");
  }
  return `${lines.join("\n").trimEnd()}\n`;
}

function resolveConfigTuiTarget(options = {}) {
  const id = options.target || "global";
  if (!["global", "project"].includes(id)) {
    throw new Error(`Unsupported config TUI target: ${id}`);
  }
  const projectRoot = resolve(options.projectRoot || ".");
  return {
    id,
    label: id === "global" ? "Global Defaults" : "Current Project",
    scope: id === "global" ? "user" : "project",
    project_root: projectRoot,
    config_file: options.configFile || (id === "global" ? resolveGlobalConfigPath(options) : resolveProjectConfigPath(options)),
  };
}

function resolveGlobalConfigPath(options = {}) {
  return options.globalConfigFile || join(options.homeDir || homedir(), ".hypo-workflow", "config.yaml");
}

function resolveProjectConfigPath(options = {}) {
  return options.projectConfigFile || join(resolve(options.projectRoot || "."), ".pipeline", "config.yaml");
}

function controlsForTarget(target) {
  return target === "global" ? GLOBAL_CONFIG_CONTROLS : PROJECT_CONFIG_CONTROLS;
}

function assertNotProtectedLifecycleFile(file, projectRoot = ".") {
  const normalized = resolve(file);
  const root = resolve(projectRoot || ".");
  for (const protectedPath of PROTECTED_LIFECYCLE_FILES) {
    if (normalized === resolve(root, protectedPath)) {
      throw new Error(`Refusing to edit protected lifecycle file: ${protectedPath}`);
    }
  }
}

function normalizeControlValue(control, value, errors) {
  const path = control.path;
  if (control.type === "boolean") {
    if (typeof value === "boolean") return value;
    if (value === "true") return true;
    if (value === "false") return false;
    errors.push(`${path}: expected boolean`);
    return value;
  }
  if (control.type === "integer") {
    const number = Number(value);
    if (!Number.isInteger(number)) {
      errors.push(`${path}: expected integer`);
      return value;
    }
    if (control.min !== undefined && number < control.min) errors.push(`${path}: must be >= ${control.min}`);
    if (control.max !== undefined && number > control.max) errors.push(`${path}: must be <= ${control.max}`);
    return number;
  }
  if (control.type === "number") {
    const number = Number(value);
    if (!Number.isFinite(number)) {
      errors.push(`${path}: expected number`);
      return value;
    }
    if (control.min !== undefined && number < control.min) errors.push(`${path}: must be >= ${control.min}`);
    if (control.max !== undefined && number > control.max) errors.push(`${path}: must be <= ${control.max}`);
    return number;
  }
  if (control.type === "select") {
    const text = String(value || "").trim();
    if (!control.values.includes(text)) {
      errors.push(`${path}: expected one of ${control.values.join(", ")}`);
    }
    return text;
  }
  if (Array.isArray(control.values)) {
    const text = String(value || "").trim();
    if (!control.values.includes(text)) errors.push(`${path}: expected one of ${control.values.join(", ")}`);
    return text;
  }
  const text = String(value ?? "").trim();
  if (!text) errors.push(`${path}: value is required`);
  return text;
}

function validateConfigTuiShape(target, config = {}) {
  const errors = [];
  const controls = controlsForTarget(target);
  for (const control of controls) {
    const value = getPath(config, control.path);
    if (value === undefined || value === null) continue;
    validateValue(control, value, errors);
  }
  if (target === "global") {
    if (config.agent?.platform && !["codex", "claude-code"].includes(config.agent.platform)) {
      errors.push("agent.platform: expected one of codex, claude-code");
    }
    if (config.dashboard?.port !== undefined && (!Number.isInteger(Number(config.dashboard.port)) || Number(config.dashboard.port) < 1 || Number(config.dashboard.port) > 65535)) {
      errors.push("dashboard.port: expected integer between 1 and 65535");
    }
  } else {
    if (config.platform && !["auto", "claude", "codex"].includes(config.platform)) {
      errors.push("platform: expected one of auto, claude, codex");
    }
    if (!config.pipeline && !config.execution && !config.evaluation) {
      errors.push("project config must retain pipeline, execution, or evaluation fields");
    }
  }
  return unique(errors);
}

function validateValue(control, value, errors) {
  if (control.type === "boolean" && typeof value !== "boolean") errors.push(`${control.path}: expected boolean`);
  if (control.type === "integer" && !Number.isInteger(Number(value))) errors.push(`${control.path}: expected integer`);
  if (control.type === "number" && !Number.isFinite(Number(value))) errors.push(`${control.path}: expected number`);
  if (control.min !== undefined && Number(value) < control.min) errors.push(`${control.path}: must be >= ${control.min}`);
  if (control.max !== undefined && Number(value) > control.max) errors.push(`${control.path}: must be <= ${control.max}`);
  if (control.type === "text" && String(value || "").trim() === "") errors.push(`${control.path}: value is required`);
  if (control.type === "select" && !control.values.includes(value)) {
    errors.push(`${control.path}: expected one of ${control.values.join(", ")}`);
  }
}

function diffEditedPaths(before, after, editedPaths) {
  return unique(editedPaths).flatMap((path) => {
    const from = getPath(before, path);
    const to = getPath(after, path);
    return deepEqual(from, to) ? [] : [{ path, before: from ?? null, after: to ?? null }];
  });
}

function buildConfigTuiSyncGuidance(target, diff, controls) {
  const syncPaths = diff.filter((entry) => controls.get(entry.path)?.sync).map((entry) => entry.path);
  const required = syncPaths.length > 0;
  return {
    required,
    paths: syncPaths,
    guidance: required
      ? `Adapter-affecting config changed (${syncPaths.join(", ")}). Run /hw:sync --light for the ${target} project before relying on regenerated adapters.`
      : null,
  };
}

async function loadActiveConfigSummary(projectRoot, options = {}) {
  const projectConfigFile = join(projectRoot, ".pipeline", "config.yaml");
  const projectConfig = await loadConfig(projectConfigFile, {}).catch(() => ({}));
  const globalConfig = options.homeDir
    ? await loadConfig(join(options.homeDir, ".hypo-workflow", "config.yaml")).catch(() => DEFAULT_GLOBAL_CONFIG)
    : DEFAULT_GLOBAL_CONFIG;
  const effective = mergeConfig(globalConfig, projectConfig);
  return {
    platform: projectConfig.platform || effective.agent?.platform || "auto",
    execution_mode: effective.execution?.mode || effective.execution?.default_mode || "self",
    preset: effective.execution?.steps?.preset || "n/a",
    subagent_tool: effective.execution?.subagent_tool || effective.subagent?.provider || "auto",
    plan_mode: effective.plan?.mode || effective.plan?.default_mode || "interactive",
    interaction_depth: effective.plan?.interaction_depth || "medium",
    language: effective.output?.language || "zh-CN",
    timezone: effective.output?.timezone || "Asia/Shanghai",
    opencode_profile: effective.opencode?.profile || effective.sync?.platforms?.opencode?.profile || "standard",
    opencode_auto_continue: effective.opencode?.auto_continue ?? effective.sync?.platforms?.opencode?.auto_continue ?? true,
  };
}

function getPath(object, path) {
  return String(path).split(".").reduce((value, part) => value?.[part], object);
}

function setPath(object, path, value) {
  const parts = String(path).split(".");
  let cursor = object;
  for (const part of parts.slice(0, -1)) {
    if (!cursor[part] || typeof cursor[part] !== "object" || Array.isArray(cursor[part])) cursor[part] = {};
    cursor = cursor[part];
  }
  cursor[parts.at(-1)] = value;
}

function cloneConfig(value) {
  return JSON.parse(JSON.stringify(value || {}));
}

function deepEqual(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function unique(values) {
  return [...new Set(values)];
}

function formatDashboardBoolean(value) {
  return value === false ? "false" : "true";
}
