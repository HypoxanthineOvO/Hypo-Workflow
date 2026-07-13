import { createHash } from "node:crypto";
import { lstat, readFile, realpath } from "node:fs/promises";
import { relative, resolve } from "node:path";
import { authorityError } from "../runtime/internal.js";
import { parseYaml } from "../serialization/index.js";

const LEGACY_SOURCES = Object.freeze([
  { kind: "state", path: ".pipeline/state.yaml" },
  { kind: "cycle", path: ".pipeline/cycle.yaml" },
  { kind: "config", path: ".pipeline/config.yaml" },
  { kind: "continuation", path: ".pipeline/continuation.yaml" },
  { kind: "log", path: ".pipeline/log.yaml" },
]);

export async function inspectLegacyWorkspace(root) {
  const workspaceRoot = resolve(root || ".");
  const rootStat = await lstat(workspaceRoot);
  if (!rootStat.isDirectory() || rootStat.isSymbolicLink()) {
    throw authorityError("ERR_LEGACY_EVIDENCE_FORBIDDEN", "Legacy workspace root symlink/path forbidden");
  }
  const rootReal = await realpath(workspaceRoot);
  await assertLegacyPipelineDirectory(workspaceRoot, rootReal);
  const sources = [];
  for (const descriptor of LEGACY_SOURCES) {
    const source = await readLegacySource(workspaceRoot, rootReal, descriptor);
    if (source) sources.push(source);
  }
  return {
    classification: "legacy",
    read_only: true,
    sources,
    summary: summarizeLegacySources(sources),
  };
}

async function assertLegacyPipelineDirectory(root, rootReal) {
  const pipelinePath = resolve(root, ".pipeline");
  let stats;
  try {
    stats = await lstat(pipelinePath);
  } catch (error) {
    if (error.code === "ENOENT" || error.code === "ENOTDIR") {
      throw authorityError("ERR_LEGACY_WORKSPACE_NOT_FOUND", "Legacy workspace .pipeline directory was not found");
    }
    throw error;
  }
  if (stats.isSymbolicLink() || !stats.isDirectory()) {
    throw authorityError("ERR_LEGACY_EVIDENCE_FORBIDDEN", "Legacy workspace .pipeline symlink/path forbidden");
  }
  const pipelineReal = await realpath(pipelinePath);
  const rel = relative(rootReal, pipelineReal);
  if (rel !== ".pipeline") {
    throw authorityError("ERR_LEGACY_EVIDENCE_FORBIDDEN", "Legacy workspace .pipeline path forbidden");
  }
}

async function readLegacySource(root, rootReal, descriptor) {
  const absolutePath = resolve(root, descriptor.path);
  const rel = relative(root, absolutePath);
  if (!rel || rel === ".." || rel.startsWith("../")) {
    throw authorityError("ERR_LEGACY_EVIDENCE_FORBIDDEN", "Legacy evidence path escapes the workspace");
  }
  let stats;
  try {
    stats = await lstat(absolutePath);
  } catch (error) {
    if (error.code === "ENOENT" || error.code === "ENOTDIR") return null;
    throw error;
  }
  if (stats.isSymbolicLink()) {
    throw authorityError("ERR_LEGACY_EVIDENCE_FORBIDDEN", "Legacy evidence symlink/path forbidden");
  }
  if (!stats.isFile()) {
    throw authorityError("ERR_LEGACY_EVIDENCE_FORBIDDEN", "Legacy evidence must be a regular file");
  }
  const targetReal = await realpath(absolutePath);
  const realRel = relative(rootReal, targetReal);
  if (realRel === ".." || realRel.startsWith("../")) {
    throw authorityError("ERR_LEGACY_EVIDENCE_FORBIDDEN", "Legacy evidence resolves outside the workspace");
  }
  const bytes = await readFile(absolutePath);
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  try {
    return {
      kind: descriptor.kind,
      path: descriptor.path,
      sha256,
      document: parseYaml(bytes.toString("utf8")),
    };
  } catch {
    return unreadableSource(descriptor, sha256, "ERR_LEGACY_SOURCE_UNREADABLE");
  }
}

function unreadableSource(descriptor, sha256, code) {
  return {
    kind: descriptor.kind,
    path: descriptor.path,
    ...(sha256 === null ? {} : { sha256 }),
    status: "unreadable",
    error: { code },
  };
}

function summarizeLegacySources(sources) {
  const documents = new Map(
    sources.filter((source) => Object.hasOwn(source, "document")).map((source) => [source.kind, source.document]),
  );
  const state = mapping(documents.get("state"));
  const cycle = mapping(documents.get("cycle"));
  const continuation = mapping(documents.get("continuation"));
  const log = documents.get("log");
  const summary = {};
  const currentPhase = mapping(state.current)?.phase ?? state.phase;
  if (isSummaryScalar(currentPhase)) summary.current_phase = currentPhase;
  const cycleDocument = mapping(cycle.cycle);
  const activeCycle = cycleDocument.number ?? cycleDocument.id ?? cycle.number ?? cycle.id;
  if (isSummaryScalar(activeCycle)) summary.active_cycle = activeCycle;
  const resumeCommand = continuation.safe_resume_command
    ?? mapping(continuation.continuation).safe_resume_command
    ?? mapping(state.continuation)?.safe_resume_command
    ?? mapping(state.current)?.safe_resume_command
    ?? state.safe_resume_command;
  if (typeof resumeCommand === "string" && resumeCommand.trim()) summary.safe_resume_command = resumeCommand.trim();
  const logEvents = Array.isArray(log)
    ? log.length
    : Array.isArray(mapping(log).events)
      ? mapping(log).events.length
      : null;
  if (logEvents !== null) summary.log_events = logEvents;
  return summary;
}

function mapping(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function isSummaryScalar(value) {
  return typeof value === "string" || (typeof value === "number" && Number.isFinite(value));
}
