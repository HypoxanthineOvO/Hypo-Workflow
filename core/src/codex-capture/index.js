import { readFile, readdir, stat } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

export async function parseCodexFinalAssistantOutput(input = {}) {
  const sessionPath = input.session_path || input.sessionPath || input.path;
  if (!hasText(sessionPath)) {
    return captureFailure("codex", "missing_session_path", {
      lookup: { mode: "explicit_path" },
    });
  }

  let raw;
  try {
    raw = await readFile(sessionPath, "utf8");
  } catch (error) {
    return captureFailure("codex", `session_read_failed: ${error.code || error.message}`, {
      source: { kind: "codex_jsonl", path: sessionPath },
      lookup: { mode: "explicit_path" },
    });
  }

  let lastOutput = null;
  let lastTimestamp = null;
  for (const line of raw.split(/\r?\n/)) {
    if (!line.trim()) continue;
    let record;
    try {
      record = JSON.parse(line);
    } catch {
      continue;
    }
    const payload = record.payload || record;
    if (payload.type !== "message" || payload.role !== "assistant") continue;
    const text = extractCodexMessageText(payload.content);
    if (text === null) continue;
    lastOutput = text;
    lastTimestamp = record.timestamp || payload.timestamp || null;
  }

  if (lastOutput === null) {
    return captureFailure("codex", "assistant output not found", {
      source: { kind: "codex_jsonl", path: sessionPath },
      lookup: { mode: "explicit_path" },
    });
  }

  return {
    status: "captured",
    platform: "codex",
    output: lastOutput,
    captured_at: lastTimestamp,
    source: { kind: "codex_jsonl", path: sessionPath },
    side_effect: "local_read",
    planned_external_actions: [],
  };
}

export async function captureFinalAssistantOutput(input = {}) {
  const platform = String(input.platform || "codex").trim().toLowerCase();
  if (platform !== "codex") {
    return probeFinalAssistantOutputSource(input);
  }

  if (hasText(input.session_path || input.sessionPath || input.path)) {
    const sessionPath = input.session_path || input.sessionPath || input.path;
    const result = await parseCodexFinalAssistantOutput({ session_path: sessionPath });
    return {
      ...result,
      lookup: { mode: "explicit_path" },
    };
  }

  if (hasText(input.session_id || input.sessionId)) {
    const sessionId = input.session_id || input.sessionId;
    const sessionsRoot = input.sessions_root || input.sessionsRoot || join(homedir(), ".codex", "sessions");
    const sessionPath = await findCodexSessionById(sessionsRoot, sessionId);
    if (!sessionPath) {
      return captureFailure("codex", `session id not found: ${sessionId}`, {
        lookup: { mode: "session_id", session_id: sessionId, sessions_root: sessionsRoot },
      });
    }
    const result = await parseCodexFinalAssistantOutput({ session_path: sessionPath });
    return {
      ...result,
      lookup: { mode: "session_id", session_id: sessionId, sessions_root: sessionsRoot },
    };
  }

  return captureFailure("codex", "missing session path or session id", {
    lookup: { mode: "unresolved" },
  });
}

export async function probeFinalAssistantOutputSource(input = {}) {
  const platform = String(input.platform || "unknown").trim().toLowerCase();
  return {
    status: platform === "opencode" ? "probe_only" : "unsupported",
    platform,
    source: input.session_path ? { path: input.session_path } : null,
    exact_extraction_verified: false,
    side_effect: "local_read",
    planned_external_actions: [],
  };
}

function extractCodexMessageText(content) {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return null;
  const parts = content
    .filter((item) => item?.type === "output_text" && typeof item.text === "string")
    .map((item) => item.text);
  return parts.length > 0 ? parts.join("") : null;
}

function captureFailure(platform, reason, extra = {}) {
  return {
    status: "capture_failed",
    platform,
    reason,
    side_effect: "local_read",
    planned_external_actions: [],
    ...extra,
  };
}

async function findCodexSessionById(root, sessionId) {
  const files = await listJsonlFiles(root);
  for (const file of files) {
    let text;
    try {
      text = await readFile(file, "utf8");
    } catch {
      continue;
    }
    if (text.includes(`"id":"${sessionId}"`) || text.includes(`"id": "${sessionId}"`) || file.includes(sessionId)) {
      return file;
    }
  }
  return null;
}

async function listJsonlFiles(root) {
  let info;
  try {
    info = await stat(root);
  } catch {
    return [];
  }
  if (info.isFile()) return String(root).endsWith(".jsonl") ? [root] : [];
  if (!info.isDirectory()) return [];

  const entries = await readdir(root, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(root, entry.name);
    if (entry.isDirectory()) {
      files.push(...await listJsonlFiles(path));
    } else if (entry.isFile() && entry.name.endsWith(".jsonl")) {
      files.push(path);
    }
  }
  return files.sort();
}

function hasText(value) {
  return typeof value === "string" && value.trim().length > 0;
}
