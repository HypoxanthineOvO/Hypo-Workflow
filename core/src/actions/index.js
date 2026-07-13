import { access, readFile, readdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import {
  DEFAULT_GLOBAL_CONFIG,
  loadConfig,
  loadGlobalConfigForSave,
  loadProjectRegistry,
  mergeConfig,
  parseYaml,
  registerProject,
  saveMigratedGlobalConfig,
  saveProjectRegistry,
} from "../config/index.js";
import { writeOpenCodeArtifacts } from "../artifacts/opencode.js";
import { assertLegacyWorkspaceWritable } from "../workspace-format/index.js";

export const MODEL_POOL_ROLES = Object.freeze(["plan", "implement", "review", "evaluate", "chat"]);

export function updateModelPoolRole(config = {}, role, edit = {}) {
  if (!MODEL_POOL_ROLES.includes(role)) {
    throw new Error(`Unsupported model pool role: ${role}`);
  }
  const primary = normalizeModelName(edit.primary);
  if (!primary) {
    throw new Error(`${role} primary model is required`);
  }
  const fallback = normalizeFallbackChain(edit.fallback || [], primary);
  const currentRoles = mergeConfig(DEFAULT_GLOBAL_CONFIG.model_pool.roles, config.model_pool?.roles || {});
  return {
    ...config,
    model_pool: {
      ...(config.model_pool || {}),
      roles: {
        ...currentRoles,
        [role]: {
          ...currentRoles[role],
          primary,
          fallback,
        },
      },
    },
  };
}

export async function saveGlobalModelPoolEdit(file, role, edit, options = {}) {
  const loaded = await loadGlobalConfigForSave(file);
  const updated = updateModelPoolRole(loaded.config, role, edit);
  await saveMigratedGlobalConfig(file, updated, options);
  return { config: await loadConfig(file), backup: true };
}

export async function addProjectAction(registryFile, projectPath, options = {}) {
  const inspected = await inspectProject(projectPath, options);
  return registerProject(registryFile, inspected, {
    platform: options.platform || inspected.platform,
    profile: options.profile || inspected.profile,
    now: options.now,
  });
}

export async function scanProjectsAction(registryFile, rootDir, options = {}) {
  const projectPaths = await scanProjectPaths(rootDir, options);
  const added = [];
  let registry = await loadProjectRegistry(registryFile);
  for (const projectPath of projectPaths) {
    const result = await addProjectAction(registryFile, projectPath, options);
    registry = result.registry;
    added.push(result.project);
  }
  return { registry, added };
}

export async function refreshProjectRegistryAction(registryFile, options = {}) {
  const registry = await loadProjectRegistry(registryFile);
  const projects = [];
  for (const project of registry.projects || []) {
    projects.push(await inspectProject(project.path, { ...options, existing: project }));
  }
  const saved = await saveProjectRegistry(registryFile, { ...registry, projects });
  return { registry: saved, refreshed: projects };
}

export async function syncSelectedProjectAction(registryFile, projectId, options = {}) {
  const registry = await loadProjectRegistry(registryFile);
  const selected = (registry.projects || []).find((project) => project.id === projectId);
  if (!selected) {
    throw new Error(`Unknown project id: ${projectId}`);
  }

  const project = await inspectProject(selected.path, { ...options, existing: selected });
  const config = await loadSyncConfig(project.path, options);
  if (options.platform === "opencode" || project.platform === "opencode") {
    await assertLegacyWorkspaceWritable(project.path, "legacy.actions.project-sync");
    await writeOpenCodeArtifacts(project.path, { config, profile: project.profile || options.profile || "standard" });
  }

  const projects = (registry.projects || []).map((entry) => entry.id === project.id ? project : entry);
  const saved = await saveProjectRegistry(registryFile, { ...registry, selected_project_id: project.id, projects });
  return { registry: saved, project };
}

export async function inspectProject(projectPath, options = {}) {
  const normalizedPath = resolve(String(projectPath || ".")).replace(/\/+$/g, "");
  const existing = options.existing || {};
  const pipelineConfig = await loadConfig(join(normalizedPath, ".pipeline", "config.yaml"), {}).catch(() => ({}));
  const state = await readYamlFile(join(normalizedPath, ".pipeline", "state.yaml"));
  const cycle = await readYamlFile(join(normalizedPath, ".pipeline", "cycle.yaml"));
  const patches = await readTextFile(join(normalizedPath, ".pipeline", "patches.compact.md"));
  const knowledgeAvailable = await exists(join(normalizedPath, ".pipeline", "knowledge", "knowledge.compact.md"));
  const now = options.now || new Date().toISOString();

  return {
    ...existing,
    display_name: existing.display_name || basename(normalizedPath),
    pipeline_name: pipelineConfig.pipeline?.name || existing.pipeline_name || null,
    path: normalizedPath,
    platform: options.platform || existing.platform || "unknown",
    profile: options.profile || existing.profile || "default",
    current_cycle: cycle.cycle?.id || cycle.id || existing.current_cycle || null,
    pipeline_status: state.pipeline?.status || existing.pipeline_status || "unknown",
    current_prompt: state.current?.prompt_name || existing.current_prompt || null,
    open_patch_count: countOpenPatches(patches),
    acceptance: {
      mode: existing.acceptance?.mode || pipelineConfig.acceptance?.mode || DEFAULT_GLOBAL_CONFIG.acceptance.mode,
      state: existing.acceptance?.state || pipelineConfig.acceptance?.state || DEFAULT_GLOBAL_CONFIG.acceptance.default_state,
    },
    knowledge: {
      status: knowledgeAvailable ? "available" : "missing",
    },
    updated_at: now,
  };
}

async function loadSyncConfig(projectPath, options = {}) {
  const globalConfig = options.homeDir
    ? await loadConfig(join(options.homeDir, ".hypo-workflow", "config.yaml")).catch(() => DEFAULT_GLOBAL_CONFIG)
    : DEFAULT_GLOBAL_CONFIG;
  const projectConfig = await loadConfig(join(projectPath, ".pipeline", "config.yaml"), {}).catch(() => ({}));
  return mergeConfig(globalConfig, projectConfig);
}

async function scanProjectPaths(rootDir, options = {}) {
  const root = resolve(String(rootDir || "."));
  const maxDepth = Number(options.maxDepth ?? 4);
  const results = [];

  async function visit(dir, depth) {
    if (await exists(join(dir, ".pipeline", "config.yaml"))) {
      results.push(dir);
      return;
    }
    if (depth >= maxDepth) return;
    let entries = [];
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (!entry.isDirectory() || entry.name.startsWith(".")) continue;
      await visit(join(dir, entry.name), depth + 1);
    }
  }

  await visit(root, 0);
  return results.sort();
}

async function readYamlFile(file) {
  const source = await readTextFile(file);
  if (!source) return {};
  return parseYaml(source);
}

async function readTextFile(file) {
  try {
    return await readFile(file, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") return "";
    throw error;
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

function normalizeFallbackChain(fallback, primary) {
  const seen = new Set([primary]);
  const values = [];
  for (const item of Array.isArray(fallback) ? fallback : [fallback]) {
    const model = normalizeModelName(item);
    if (!model || seen.has(model)) continue;
    seen.add(model);
    values.push(model);
  }
  return values;
}

function normalizeModelName(value) {
  return String(value || "").trim();
}

function countOpenPatches(source) {
  return source
    .split(/\r?\n/)
    .filter((line) => /^-\s+.*\bopen\b/i.test(line.trim()))
    .length;
}

function basename(path) {
  const parts = String(path || "").split("/").filter(Boolean);
  return parts.at(-1) || "project";
}
