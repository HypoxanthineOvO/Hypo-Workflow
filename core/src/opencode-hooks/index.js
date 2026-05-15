const PATH_KEYS = new Set(["file", "path", "filePath"]);

const PROTECTED_PIPELINE_FILES = Object.freeze([
  ".pipeline/state.yaml",
  ".pipeline/cycle.yaml",
  ".pipeline/rules.yaml",
]);

const SECRET_KEYS = Object.freeze([
  "api_key",
  "token",
  "secret",
  "password",
  "authorization",
  "access_token",
  "refresh_token",
  "client_secret",
]);

export function collectOpenCodeToolPaths(value) {
  const paths = [];
  collectPaths(value, paths);
  return [...new Set(paths)];
}

export function evaluateOpenCodeFileGuard(input = {}) {
  const paths = collectOpenCodeToolPaths(input.args || input.tool?.args || input);
  return {
    behavior: "allow",
    severity: "info",
    paths,
    message: "OpenCode YOLO permissions are enabled; file guard is informational only.",
  };
}

export function decideOpenCodePermission(input = {}) {
  const bash = evaluateOpenCodeBashPolicy(input);
  return {
    status: "allow",
    reason: bash.applies ? bash.reason : "OpenCode YOLO permissions are enabled.",
    decision: bash.applies ? bash : evaluateOpenCodeFileGuard(input),
  };
}

export function evaluateOpenCodeBashPolicy(input = {}) {
  const permission = String(input.permission || input.tool?.permission || input.tool?.name || input.tool || "").toLowerCase();
  const command = extractBashCommand(input);
  const applies = permission === "bash" || Boolean(command);
  if (!applies) {
    return { applies: false, status: "allow", category: "not_bash", reason: "Not a bash permission request." };
  }

  const policy = normalizeBashPolicy(input.bash || input.execution?.bash || input.policy || {});
  if (!command) {
    return { applies: true, status: "allow", category: "unknown", reason: "OpenCode YOLO bash permissions are enabled." };
  }

  const category = classifyOpenCodeBashCommand(command);
  return { applies: true, status: "allow", category, command, reason: `OpenCode YOLO bash permissions are enabled by execution.bash.mode=${policy.mode}.` };
}

export function classifyOpenCodeBashCommand(command = "") {
  const text = normalizeCommand(command);
  if (!text) return "unknown";
  if (/\brm\s+-[^\s]*r[^\s]*\b|\brm\s+--recursive\b|\bgit\s+(reset\s+--hard|clean\s+-|push\s+.*--force)\b|\bchmod\s+(-[^\s]*r|--recursive)\b|\bchown\s+(-[^\s]*r|--recursive)\b|\bmkfs\b|\bdd\s+if=|\btruncate\s+-s\s+0\b/.test(text)) {
    return "destructive";
  }
  if (/\b(sudo\s+)?(apt|apt-get|dnf|yum|pacman|zypper|brew)\s+(install|remove|upgrade|update)|\b(pip|pip3|uv\s+pip|npm|pnpm|yarn)\s+.*\s(-g|--global)\b/.test(text)) {
    return "system_install";
  }
  if (/\b(git\s+(push|fetch|pull|clone)|gh\s+(pr|release|repo|api)|glab\s+(mr|release|repo|api)|curl|wget|ssh|scp|rsync|npm\s+publish|pnpm\s+publish|yarn\s+npm\s+publish)\b/.test(text)) {
    return "external";
  }
  return "local";
}

export function shouldOpenCodeAutoContinue(input = {}) {
  const mode = input.mode || input.autoContinue?.mode || "safe";
  if (input.enabled === false || input.autoContinue?.enabled === false) return false;
  if (mode === "ask") return false;
  if (mode === "aggressive") return !input.interactiveGateOpen && input.status !== "error";
  if (mode === "safe") {
    return Boolean(
      input.testsPassed &&
      !input.errorRules &&
      !input.interactiveGateOpen &&
      !input.protectedFileDirty &&
      input.status !== "error",
    );
  }
  return false;
}

export function isOpenCodeStopEquivalent(input = {}) {
  return Boolean(
    ["idle", "completed", "stopped"].includes(input.status) &&
    Number(input.unfinishedMilestones || 0) === 0 &&
    !input.missingReport &&
    !input.stepRunning,
  );
}

export function serializeOpenCodePermissionEvent(type, event = {}) {
  return {
    type,
    tool: event.tool,
    decision: event.decision || event.status,
    args: redactOpenCodeSecrets(event.args || event.input || {}),
    paths: collectOpenCodeToolPaths(event.args || event.input || {}),
  };
}

export function redactOpenCodeSecrets(value) {
  if (Array.isArray(value)) return value.map((item) => redactOpenCodeSecrets(item));
  if (!isPlainObject(value)) return value;

  const result = {};
  for (const [key, child] of Object.entries(value)) {
    if (isSecretKey(key)) {
      result[key] = "[REDACTED]";
    } else {
      result[key] = redactOpenCodeSecrets(child);
    }
  }
  return result;
}

function collectPaths(value, paths) {
  if (Array.isArray(value)) {
    for (const item of value) collectPaths(item, paths);
    return;
  }
  if (!isPlainObject(value)) return;

  for (const [key, child] of Object.entries(value)) {
    if (PATH_KEYS.has(key) && typeof child === "string") {
      paths.push(normalizePath(child));
    } else {
      collectPaths(child, paths);
    }
  }
}

function evaluatePath(path, input) {
  const normalized = normalizePath(path);
  const homeDir = normalizePath(input.homeDir || "");
  if (isHypoSecretsPath(normalized, homeDir)) {
    return {
      behavior: "deny",
      severity: "error",
      path: normalized,
      message: "Hypo-Workflow secrets file is never writable through OpenCode plugin automation.",
    };
  }

  if (isProtectedPipelineFile(normalized)) {
    if (input.workflowMutationActive) {
      return {
        behavior: "allow",
        severity: "info",
        path: normalized,
        message: `Explicit workflow mutation allowed protected file: ${normalized}`,
      };
    }
    return {
      behavior: "deny",
      severity: "error",
      path: normalized,
      message: `Hypo-Workflow protected file requires explicit workflow mutation: ${normalized}`,
    };
  }

  if (isPipelineKnowledgePath(normalized)) {
    return {
      behavior: "allow",
      severity: "info",
      path: normalized,
      message: `Hypo-Workflow Knowledge Ledger path allowed through controlled helpers: ${normalized}`,
    };
  }

  if (isExploreWorktreePath(normalized, homeDir)) {
    return {
      behavior: "allow",
      severity: "info",
      path: normalized,
      message: `Hypo-Workflow Explore worktree path allowed: ${normalized}`,
    };
  }

  if (normalized.includes(".pipeline/")) {
    return {
      behavior: "allow",
      severity: "warn",
      path: normalized,
      message: `Hypo-Workflow observed ordinary .pipeline write: ${normalized}`,
    };
  }

  return {
    behavior: "allow",
    severity: "info",
    path: normalized,
    message: `Path allowed: ${normalized}`,
  };
}

function isProtectedPipelineFile(path) {
  return PROTECTED_PIPELINE_FILES.some((file) => path === file || path.endsWith(`/${file}`));
}

function isPipelineKnowledgePath(path) {
  return path === ".pipeline/knowledge" || path.includes(".pipeline/knowledge/");
}

function isExploreWorktreePath(path, homeDir) {
  if (!homeDir) return path.includes("/.hypo-workflow/worktrees/");
  return path.startsWith(`${homeDir}/.hypo-workflow/worktrees/`);
}

function isHypoSecretsPath(path, homeDir) {
  const suffix = ".hypo-workflow/secrets.yaml";
  return path.endsWith(`/${suffix}`) || (homeDir ? path === `${homeDir}/${suffix}` : path.endsWith(suffix));
}

function normalizePath(path) {
  return String(path || "").replace(/\\/g, "/").replace(/\/+/g, "/");
}

function extractBashCommand(input = {}) {
  const candidates = [
    input.command,
    input.pattern,
    input.args?.command,
    input.args?.cmd,
    input.args?.script,
    input.args?.bash,
    input.input?.command,
    input.input?.cmd,
    input.tool?.args?.command,
    input.tool?.args?.cmd,
    input.tool?.args?.script,
  ];
  const found = candidates.find((candidate) => typeof candidate === "string" && candidate.trim());
  return found ? found.trim() : "";
}

function normalizeBashPolicy(policy = {}) {
  const mode = String(policy.mode || "allow_local").trim().toLowerCase();
  return {
    mode: mode === "ask" ? "ask" : "allow_local",
    confirm_external: false,
    confirm_destructive: false,
    confirm_system_install: false,
  };
}

function normalizeCommand(command) {
  return String(command || "").trim().replace(/\s+/g, " ").toLowerCase();
}

function isSecretKey(key) {
  const normalized = String(key).toLowerCase().replace(/[-\s]+/g, "_");
  return SECRET_KEYS.some((secretKey) => normalized === secretKey || normalized.includes(secretKey));
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
