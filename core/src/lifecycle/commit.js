import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { parseYaml, stringifyYaml } from "../config/index.js";
import { assertLegacyWorkspaceWritable } from "../workspace-format/index.js";

const CORE_AUTHORITY_PATHS = Object.freeze([
  ".pipeline/state.yaml",
  ".pipeline/cycle.yaml",
  ".pipeline/rules.yaml",
]);

export async function commitWorkflowUpdate(projectRoot = ".", update = {}) {
  await assertLegacyWorkspaceWritable(projectRoot, "legacy.lifecycle.commit");
  const root = resolve(projectRoot);
  const now = update.now || new Date().toISOString();
  const id = update.id || `workflow-${compactTimestamp(now)}`;
  const authority = normalizeWriteSet(root, update.authority || update.authorityWrites || {});
  if (!authority.length) throw new Error("commitWorkflowUpdate requires authority writes");

  const snapshot = await buildAuthoritySnapshot(root, authority);
  validateWorkflowAuthority(snapshot, { phase: "pre" });

  const renderedAuthority = authority.map((entry) => ({
    ...entry,
    content: renderWorkflowContent(entry.value),
  }));
  await atomicWriteMany(renderedAuthority);

  const committedSnapshot = await buildAuthoritySnapshot(root, []);
  validateWorkflowAuthority(committedSnapshot, { phase: "post" });

  const warnings = await refreshDerivedTargets(root, normalizeDerivedSet(root, update.derived || []), {
    id,
    now,
    authority: committedSnapshot,
  });
  if (warnings.length) {
    await writeDerivedRefreshMarker(root, {
      id,
      now,
      warnings,
      authority: renderedAuthority.map((entry) => entry.relPath),
    });
  } else {
    await removeDerivedRefreshMarker(root);
  }

  return {
    ok: warnings.length === 0,
    id,
    authority: renderedAuthority.map((entry) => entry.relPath),
    warnings,
    marker: warnings.length ? ".pipeline/derived-refresh.yaml" : null,
  };
}

export function validateWorkflowAuthority(snapshot = {}, options = {}) {
  const state = snapshot[".pipeline/state.yaml"] || {};
  const cycle = snapshot[".pipeline/cycle.yaml"]?.cycle || snapshot[".pipeline/cycle.yaml"] || {};
  const errors = [];

  validateStepPointer(state, errors);
  validatePromptCompletionCount(state, errors);
  validateRejectedAcceptance(state, cycle, errors);
  validateFollowUpContinuation(state, cycle, errors);

  if (errors.length) {
    const prefix = options.phase ? `${options.phase} workflow invariant failed` : "workflow invariant failed";
    throw new Error(`${prefix}: ${errors.join("; ")}`);
  }
  return true;
}

function validateStepPointer(state, errors) {
  const current = state.current || {};
  const steps = Array.isArray(state.prompt_state?.steps) ? state.prompt_state.steps : [];
  if (!current.step || !steps.length) return;
  if (current.phase !== "executing") return;

  const index = Number(current.step_index);
  if (!Number.isInteger(index) || index < 0 || index >= steps.length) {
    errors.push("current.step_index must point inside prompt_state.steps");
    return;
  }
  if (steps[index]?.name !== current.step) {
    errors.push("current.step_index must match current.step");
  }
  if (current.phase === "executing" && steps[index]?.status === "done") {
    errors.push("current.step must not point at an already done step during executing phase");
  }
}

function validatePromptCompletionCount(state, errors) {
  const completed = state.pipeline?.prompts_completed;
  const history = state.history?.completed_prompts;
  if (completed === undefined || !Array.isArray(history)) return;

  const successful = history.filter((entry) => !entry.result || entry.result === "pass").length;
  if (Number(completed) !== successful) {
    errors.push("pipeline.prompts_completed must equal successful history.completed_prompts");
  }
}

function validateRejectedAcceptance(state, cycle, errors) {
  const stateAcceptance = state.acceptance || {};
  const cycleAcceptance = cycle.acceptance || {};
  const stateRejected = stateAcceptance.state === "rejected";
  const cycleRejected = cycleAcceptance.state === "rejected";
  if (!stateRejected && !cycleRejected) return;

  if (state.pipeline?.status !== "running") {
    errors.push("rejected acceptance requires pipeline.status=running");
  }
  if (!["needs_revision", "executing"].includes(state.current?.phase)) {
    errors.push("rejected acceptance requires current.phase=needs_revision or executing");
  }
  const feedbackRef = stateAcceptance.feedback_ref || cycleAcceptance.feedback_ref;
  if (!feedbackRef) {
    errors.push("rejected acceptance requires feedback_ref");
  }
}

function validateFollowUpContinuation(state, cycle, errors) {
  const phase = state.current?.phase;
  const cycleStatus = cycle.status;
  const continuation = state.continuation;
  if (phase !== "follow_up_planning" && cycleStatus !== "follow_up_planning") return;

  if (phase !== "follow_up_planning") {
    errors.push("follow_up_planning cycle requires current.phase=follow_up_planning");
  }
  if (state.pipeline?.status !== "stopped") {
    errors.push("follow_up_planning requires pipeline.status=stopped");
  }
  if (cycleStatus !== "follow_up_planning") {
    errors.push("follow_up_planning state requires cycle.status=follow_up_planning");
  }
  if (continuation?.kind !== "follow_up_plan" || continuation?.status !== "active") {
    errors.push("follow_up_planning requires active state.continuation follow_up_plan");
  }
}

async function buildAuthoritySnapshot(root, writes) {
  const paths = unique([...CORE_AUTHORITY_PATHS, ...writes.map((entry) => entry.relPath)]);
  const snapshot = {};
  for (const relPath of paths) {
    snapshot[relPath] = await readYamlIfPresent(resolve(root, relPath));
  }
  for (const entry of writes) {
    if (entry.relPath.endsWith(".yaml") || entry.relPath.endsWith(".yml")) {
      snapshot[entry.relPath] = typeof entry.value === "string" ? parseYaml(entry.value) : entry.value;
    }
  }
  return snapshot;
}

async function atomicWriteMany(entries) {
  const staged = [];
  try {
    for (const [index, entry] of entries.entries()) {
      await mkdir(dirname(entry.absPath), { recursive: true });
      const tmpPath = `${entry.absPath}.tmp-${process.pid}-${Date.now()}-${index}`;
      await writeFile(tmpPath, entry.content, "utf8");
      staged.push({ ...entry, tmpPath });
    }
    for (const entry of staged) {
      await rename(entry.tmpPath, entry.absPath);
    }
  } catch (error) {
    await Promise.allSettled(staged.map((entry) => rm(entry.tmpPath, { force: true })));
    throw error;
  }
}

async function refreshDerivedTargets(root, targets, context) {
  const warnings = [];
  for (const target of targets) {
    try {
      const source = await readTextIfPresent(target.absPath);
      const next = await target.refresh(source, {
        ...context,
        path: target.relPath,
        projectRoot: root,
      });
      if (next === undefined) continue;
      await atomicWriteMany([{
        relPath: target.relPath,
        absPath: target.absPath,
        value: next,
        content: renderWorkflowContent(next),
      }]);
    } catch (error) {
      warnings.push({
        path: target.relPath,
        error: error.message || String(error),
      });
    }
  }
  return warnings;
}

async function writeDerivedRefreshMarker(root, marker) {
  const path = resolve(root, ".pipeline/derived-refresh.yaml");
  const value = {
    status: "warning",
    commit_id: marker.id,
    updated_at: marker.now,
    authority_committed: marker.authority,
    failures: marker.warnings,
    repair_hint: "Run /hw:sync --light after fixing the derived artifact, or rerun the lifecycle command if the warning persists.",
  };
  await atomicWriteMany([{
    relPath: ".pipeline/derived-refresh.yaml",
    absPath: path,
    value,
    content: renderWorkflowContent(value),
  }]);
}

async function removeDerivedRefreshMarker(root) {
  await rm(resolve(root, ".pipeline/derived-refresh.yaml"), { force: true });
}

function normalizeWriteSet(root, writes) {
  if (Array.isArray(writes)) {
    return writes.map((entry) => normalizeWriteEntry(root, entry.path, entry.value ?? entry.content));
  }
  return Object.entries(writes).map(([path, value]) => normalizeWriteEntry(root, path, value));
}

function normalizeDerivedSet(root, targets) {
  return targets.map((target) => {
    const entry = normalizeWriteEntry(root, target.path, target.value ?? target.content ?? "");
    return {
      ...entry,
      refresh: typeof target.refresh === "function"
        ? target.refresh
        : () => target.value ?? target.content ?? "",
    };
  });
}

function normalizeWriteEntry(root, path, value) {
  if (!path) throw new Error("workflow write requires path");
  const absPath = resolve(root, path);
  const relPath = toProjectRelative(root, absPath);
  return { relPath, absPath, value };
}

function toProjectRelative(root, absPath) {
  const relPath = relative(root, absPath).split("\\").join("/");
  if (!relPath || relPath.startsWith("..") || relPath.includes("/../")) {
    throw new Error(`workflow write path must stay inside project root: ${absPath}`);
  }
  return relPath;
}

function renderWorkflowContent(value) {
  if (typeof value === "string") return value.endsWith("\n") ? value : `${value}\n`;
  return `${stringifyYaml(value).trimEnd()}\n`;
}

async function readYamlIfPresent(file) {
  const source = await readTextIfPresent(file);
  return source ? parseYaml(source) : {};
}

async function readTextIfPresent(file) {
  try {
    return await readFile(file, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") return "";
    throw error;
  }
}

function unique(values) {
  return [...new Set(values)];
}

function compactTimestamp(value) {
  return String(value)
    .replace(/[-:]/g, "")
    .replace(/\.\d+/, "")
    .replace(/\+/, "+")
    .replace(/Z$/, "Z");
}
