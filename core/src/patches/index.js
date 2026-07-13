import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { parseYaml, writeConfig } from "../config/index.js";
import { createRejectionFeedbackTemplate } from "../acceptance/index.js";
import { appendProgressEvent } from "../progress/index.js";
import { assertLegacyWorkspaceWritable } from "../workspace-format/index.js";

export async function readPatch(projectRoot = ".", patchId) {
  const file = await findPatchFile(projectRoot, patchId);
  const source = await readFile(file, "utf8");
  return parsePatchFile(file, source);
}

export async function requestPatchAcceptance(projectRoot = ".", patchId, options = {}) {
  await assertLegacyWorkspaceWritable(projectRoot, "legacy.patches");
  const patch = await readPatch(projectRoot, patchId);
  const now = options.now || new Date().toISOString();
  const metadata = {
    ...patch.metadata,
    status: options.mode === "auto" ? "closed" : "pending_acceptance",
    iteration: patch.metadata.iteration || 1,
    acceptance_requested_at: now,
  };
  const updated = await writePatchMetadata(patch, metadata);
  await appendPatchLog(projectRoot, {
    id: `PATCH-PENDING-${patch.id}-${compactTimestamp(now)}`,
    type: "patch_pending_acceptance",
    patch: patch.id,
    status: metadata.status,
    timestamp: now,
    summary: `Patch ${patch.id} is pending acceptance.`,
    trigger: "auto",
  });
  await appendProgressRow(projectRoot, now, "Patch", `${patch.id} pending_acceptance`, patch.title);
  return { patch: updated };
}

export async function acceptPatch(projectRoot = ".", patchId, options = {}) {
  await assertLegacyWorkspaceWritable(projectRoot, "legacy.patches");
  const patch = await readPatch(projectRoot, patchId);
  const now = options.now || new Date().toISOString();
  const metadata = {
    ...patch.metadata,
    status: "closed",
    accepted_at: now,
  };
  const updated = await writePatchMetadata(patch, metadata);
  await appendPatchLog(projectRoot, {
    id: `PATCH-ACCEPT-${patch.id}-${compactTimestamp(now)}`,
    type: "patch_accept",
    patch: patch.id,
    status: "closed",
    timestamp: now,
    summary: `Patch ${patch.id} accepted.`,
    trigger: "manual",
  });
  await appendProgressRow(projectRoot, now, "Patch", `${patch.id} accepted`, patch.title);
  return { patch: updated };
}

export async function rejectPatch(projectRoot = ".", patchId, options = {}) {
  await assertLegacyWorkspaceWritable(projectRoot, "legacy.patches");
  const patch = await readPatch(projectRoot, patchId);
  const now = options.now || new Date().toISOString();
  const feedbackRef = options.feedback_ref || `.pipeline/patches/feedback/${patch.id}-rejection-${compactTimestamp(now)}.yaml`;
  const rejectionRefs = [...(patch.metadata.rejection_refs || []), feedbackRef];
  const metadata = {
    ...patch.metadata,
    status: "open",
    iteration: Number(patch.metadata.iteration || 1) + 1,
    rejection_refs: rejectionRefs,
  };

  await mkdir(join(projectRoot, ".pipeline", "patches", "feedback"), { recursive: true });
  await writeConfig(join(projectRoot, feedbackRef), {
    ...createRejectionFeedbackTemplate({
      scope: "patch",
      ref: patch.id,
      iteration: metadata.iteration,
      created_at: now,
      context: options.context || `Patch ${patch.id} acceptance`,
    }),
    rejected_at: now,
    problem: String(options.feedback || "").trim(),
    feedback: String(options.feedback || "").trim(),
  });
  const updated = await writePatchMetadata(patch, metadata);
  const escalation = {
    recommended: metadata.iteration >= Number(options.escalateAt || 3),
    reason: metadata.iteration >= Number(options.escalateAt || 3)
      ? "repeated rejection; recommend escalation to a Cycle"
      : null,
  };
  await appendPatchLog(projectRoot, {
    id: `PATCH-REJECT-${patch.id}-${compactTimestamp(now)}`,
    type: "patch_reject",
    patch: patch.id,
    status: "open",
    timestamp: now,
    summary: `Patch ${patch.id} rejected; feedback stored at ${feedbackRef}.`,
    report: feedbackRef,
    trigger: "manual",
  });
  await appendProgressRow(projectRoot, now, "Patch", `${patch.id} rejected`, escalation.recommended ? "建议升级为 Cycle" : `反馈已保存到 ${feedbackRef}`);
  return { patch: updated, feedback_ref: feedbackRef, escalation };
}

export async function buildPatchFixContext(projectRoot = ".", patchId) {
  const patch = await readPatch(projectRoot, patchId);
  const feedback = [];
  for (const ref of patch.metadata.rejection_refs || []) {
    feedback.push(await readYaml(join(projectRoot, ref)));
  }
  return { patch, feedback };
}

async function findPatchFile(projectRoot, patchId) {
  const dir = join(projectRoot, ".pipeline", "patches");
  const id = normalizePatchId(patchId);
  const entries = await readdir(dir);
  const found = entries.find((entry) => entry.startsWith(`${id}-`) && entry.endsWith(".md"));
  if (!found) throw new Error(`Patch not found: ${id}`);
  return join(dir, found);
}

function parsePatchFile(file, source) {
  const lines = source.split(/\r?\n/);
  const titleMatch = /^#\s+(P\d+):\s*(.*)$/.exec(lines[0] || "");
  const metadata = {};
  let bodyStart = lines.length;
  for (let index = 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (!line.trim()) {
      bodyStart = index + 1;
      break;
    }
    const match = /^-\s+([^:]+):\s*(.*)$/.exec(line);
    if (!match) continue;
    metadata[normalizeMetadataKey(match[1])] = parsePatchValue(match[2]);
  }
  return {
    id: titleMatch?.[1] || normalizePatchId(basename(file)),
    title: titleMatch?.[2] || basename(file),
    file,
    metadata: normalizePatchMetadata(metadata),
    body: lines.slice(bodyStart).join("\n"),
  };
}

async function writePatchMetadata(patch, metadata) {
  const normalized = normalizePatchMetadata(metadata);
  const lines = [
    `# ${patch.id}: ${patch.title}`,
    ...renderMetadata(normalized),
    "",
    patch.body.trimEnd(),
    "",
  ];
  await writeFile(patch.file, lines.join("\n"), "utf8");
  return { ...patch, metadata: normalized };
}

function renderMetadata(metadata) {
  const order = [
    "status",
    "severity",
    "iteration",
    "discovered_in",
    "acceptance_requested_at",
    "accepted_at",
    "rejection_refs",
  ];
  const keys = [...order, ...Object.keys(metadata).filter((key) => !order.includes(key))];
  return keys
    .filter((key, index) => metadata[key] !== undefined && keys.indexOf(key) === index)
    .map((key) => `- ${key}: ${formatPatchValue(metadata[key])}`);
}

function normalizePatchMetadata(metadata = {}) {
  return {
    ...metadata,
    status: metadata.status || "open",
    iteration: Number(metadata.iteration || 1),
    rejection_refs: Array.isArray(metadata.rejection_refs) ? metadata.rejection_refs : [],
  };
}

async function readYaml(file) {
  return parseYaml(await readFile(file, "utf8"));
}

async function appendPatchLog(projectRoot, entry) {
  const file = join(projectRoot, ".pipeline", "log.yaml");
  let log = {};
  try {
    log = parseYaml(await readFile(file, "utf8"));
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  const entries = Array.isArray(log.entries) ? log.entries : [];
  await writeConfig(file, { ...log, entries: [entry, ...entries] });
}

async function appendProgressRow(projectRoot, timestamp, type, event, result) {
  const file = join(projectRoot, ".pipeline", "PROGRESS.md");
  let source = "";
  try {
    source = await readFile(file, "utf8");
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  const next = appendProgressEvent(source, {
    timestamp,
    type,
    name: event,
    result,
    patch: event.match(/^(P\d+)/)?.[1] || null,
  });
  await writeFile(file, next, "utf8");
}

function normalizeMetadataKey(key) {
  const trimmed = key.trim();
  const map = {
    "状态": "status",
    "严重级": "severity",
    "发现于": "discovered_in",
    "创建时间": "created_at",
  };
  return map[trimmed] || trimmed;
}

function parsePatchValue(value) {
  const trimmed = String(value || "").trim();
  if (/^\[.*\]$/.test(trimmed)) {
    const inner = trimmed.slice(1, -1).trim();
    return inner ? inner.split(",").map((item) => item.trim()).filter(Boolean) : [];
  }
  if (/^\d+$/.test(trimmed)) return Number(trimmed);
  if (trimmed === "null") return null;
  return trimmed;
}

function formatPatchValue(value) {
  if (Array.isArray(value)) return `[${value.join(", ")}]`;
  return value === null || value === undefined ? "null" : String(value);
}

function normalizePatchId(value) {
  return /P\d+/.exec(String(value || ""))?.[0] || String(value || "").trim();
}

function compactTimestamp(value) {
  return String(value)
    .replace(/[-:]/g, "")
    .replace(/\.\d+/, "")
    .replace(/\+/, "+")
    .replace(/Z$/, "Z");
}
