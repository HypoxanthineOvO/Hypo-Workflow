import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { parseYaml, stringifyYaml } from "../config/index.js";
import { assertLegacyWorkspaceWritable } from "../workspace-format/index.js";

const DEFAULT_CONTINUATION_PATH = ".pipeline/continuation.yaml";
const SAFE_RESUME_COMMANDS = new Set(["/hw:resume", "继续", "下一步", "执行下一步"]);

export function buildContinuationState(input = {}) {
  const updatedAt = input.updated_at || input.updatedAt || new Date().toISOString();
  const nextAction = input.next_action || input.nextAction || "continue_execution";
  const safeResumeCommand = input.safe_resume_command || input.safeResumeCommand || "/hw:resume";
  if (!SAFE_RESUME_COMMANDS.has(safeResumeCommand)) {
    throw new Error(`safe_resume_command must be one of: ${[...SAFE_RESUME_COMMANDS].join(", ")}`);
  }
  return {
    schema_version: "1",
    status: input.status || "active",
    next_action: nextAction,
    reason: input.reason || "unfinished_work",
    updated_at: updatedAt,
    safe_resume_command: safeResumeCommand,
    context: input.context || {},
  };
}

export async function readContinuationState(projectRoot = ".", options = {}) {
  const path = join(projectRoot, options.path || DEFAULT_CONTINUATION_PATH);
  try {
    const value = parseYaml(await readFile(path, "utf8"));
    return normalizeContinuationState(value);
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}

export async function writeContinuationState(projectRoot = ".", continuation = {}, options = {}) {
  await assertLegacyWorkspaceWritable(projectRoot, "legacy.continuation");
  const path = join(projectRoot, options.path || DEFAULT_CONTINUATION_PATH);
  const normalized = normalizeContinuationState(continuation);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${stringifyYaml(normalized).trimEnd()}\n`, "utf8");
  return normalized;
}

export function resolveResumeTarget(input = {}) {
  const continuation = normalizeContinuationState(input.continuation, { nullable: true });
  if (continuation && continuation.status === "active") {
    return {
      source: "continuation",
      next_action: continuation.next_action,
      reason: continuation.reason,
      safe_resume_command: continuation.safe_resume_command,
      context: continuation.context || {},
    };
  }

  const state = input.state || {};
  const current = state.current || {};
  const phase = current.phase || "idle";
  return {
    source: "state",
    next_action: phase === "executing" ? "continue_execution" : phase || "resume",
    reason: state.pipeline?.status || "state_pointer",
    safe_resume_command: "/hw:resume",
    context: {
      prompt_file: current.prompt_file || null,
      prompt_name: current.prompt_name || null,
      step: current.step || null,
      phase,
    },
  };
}

function normalizeContinuationState(value, options = {}) {
  if (!value && options.nullable) return null;
  const source = value || {};
  return buildContinuationState({
    ...source,
    status: source.status || "active",
    next_action: source.next_action || source.nextAction || "continue_execution",
    safe_resume_command: source.safe_resume_command || source.safeResumeCommand || "/hw:resume",
    updated_at: source.updated_at || source.updatedAt || new Date().toISOString(),
  });
}
