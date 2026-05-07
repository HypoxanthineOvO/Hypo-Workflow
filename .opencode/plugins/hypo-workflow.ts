// Hypo-Workflow managed OpenCode adapter scaffold.
// This plugin bridges native OpenCode events to Hypo-Workflow file contracts.
// It does not implement business tasks, write product code, fix bugs, or generate reports by itself.

import {
  decideOpenCodePermission,
  evaluateOpenCodeFileGuard,
  isOpenCodeStopEquivalent,
  serializeOpenCodePermissionEvent,
  shouldOpenCodeAutoContinue,
} from "../runtime/hypo-workflow-hooks.js";

const metadata = {
  name: "hypo-workflow",
  version: "12.1.0",
  commandMap: [
  {
    "canonical": "/hw:start",
    "opencode": "/hw-start",
    "agent": "hw-build",
    "route": "pipeline",
    "skill": "skills/start/SKILL.md"
  },
  {
    "canonical": "/hw:resume",
    "opencode": "/hw-resume",
    "agent": "hw-build",
    "route": "pipeline",
    "skill": "skills/resume/SKILL.md"
  },
  {
    "canonical": "/hw:status",
    "opencode": "/hw-status",
    "agent": "hw-status",
    "route": "read",
    "skill": "skills/status/SKILL.md"
  },
  {
    "canonical": "/hw:skip",
    "opencode": "/hw-skip",
    "agent": "hw-build",
    "route": "pipeline",
    "skill": "skills/skip/SKILL.md"
  },
  {
    "canonical": "/hw:stop",
    "opencode": "/hw-stop",
    "agent": "hw-status",
    "route": "pipeline",
    "skill": "skills/stop/SKILL.md"
  },
  {
    "canonical": "/hw:report",
    "opencode": "/hw-report",
    "agent": "hw-report",
    "route": "read",
    "skill": "skills/report/SKILL.md"
  },
  {
    "canonical": "/hw:chat",
    "opencode": "/hw-chat",
    "agent": "hw-build",
    "route": "lifecycle",
    "skill": "skills/chat/SKILL.md"
  },
  {
    "canonical": "/hw:plan",
    "opencode": "/hw-plan",
    "agent": "hw-plan",
    "route": "plan",
    "skill": "skills/plan/SKILL.md"
  },
  {
    "canonical": "/hw:plan:discover",
    "opencode": "/hw-plan-discover",
    "agent": "hw-plan",
    "route": "plan",
    "skill": "skills/plan-discover/SKILL.md"
  },
  {
    "canonical": "/hw:plan:decompose",
    "opencode": "/hw-plan-decompose",
    "agent": "hw-plan",
    "route": "plan",
    "skill": "skills/plan-decompose/SKILL.md"
  },
  {
    "canonical": "/hw:plan:generate",
    "opencode": "/hw-plan-generate",
    "agent": "hw-plan",
    "route": "plan",
    "skill": "skills/plan-generate/SKILL.md"
  },
  {
    "canonical": "/hw:plan:confirm",
    "opencode": "/hw-plan-confirm",
    "agent": "hw-plan",
    "route": "plan",
    "skill": "skills/plan-confirm/SKILL.md"
  },
  {
    "canonical": "/hw:plan:extend",
    "opencode": "/hw-plan-extend",
    "agent": "hw-plan",
    "route": "plan",
    "skill": "skills/plan-extend/SKILL.md"
  },
  {
    "canonical": "/hw:plan:review",
    "opencode": "/hw-plan-review",
    "agent": "hw-review",
    "route": "review",
    "skill": "skills/plan-review/SKILL.md"
  },
  {
    "canonical": "/hw:cycle",
    "opencode": "/hw-cycle",
    "agent": "hw-status",
    "route": "lifecycle",
    "skill": "skills/cycle/SKILL.md"
  },
  {
    "canonical": "/hw:accept",
    "opencode": "/hw-accept",
    "agent": "hw-build",
    "route": "lifecycle",
    "skill": "skills/accept/SKILL.md"
  },
  {
    "canonical": "/hw:reject",
    "opencode": "/hw-reject",
    "agent": "hw-build",
    "route": "lifecycle",
    "skill": "skills/reject/SKILL.md"
  },
  {
    "canonical": "/hw:explore",
    "opencode": "/hw-explore",
    "agent": "hw-explore",
    "route": "explore",
    "skill": "skills/explore/SKILL.md"
  },
  {
    "canonical": "/hw:sync",
    "opencode": "/hw-sync",
    "agent": "hw-build",
    "route": "tool",
    "skill": "skills/sync/SKILL.md"
  },
  {
    "canonical": "/hw:docs",
    "opencode": "/hw-docs",
    "agent": "hw-docs",
    "route": "docs",
    "skill": "skills/docs/SKILL.md"
  },
  {
    "canonical": "/hw:patch",
    "opencode": "/hw-patch",
    "agent": "hw-build",
    "route": "lifecycle",
    "skill": "skills/patch/SKILL.md"
  },
  {
    "canonical": "/hw:patch fix",
    "opencode": "/hw-patch-fix",
    "agent": "hw-build",
    "route": "fix",
    "skill": "skills/patch/SKILL.md"
  },
  {
    "canonical": "/hw:pr",
    "opencode": "/hw-pr",
    "agent": "hw-review",
    "route": "change-request",
    "skill": "skills/pr/SKILL.md"
  },
  {
    "canonical": "/hw:explain",
    "opencode": "/hw-explain",
    "agent": "hw-review",
    "route": "explain",
    "skill": "skills/explain/SKILL.md"
  },
  {
    "canonical": "/hw:compact",
    "opencode": "/hw-compact",
    "agent": "hw-compact",
    "route": "tool",
    "skill": "skills/compact/SKILL.md"
  },
  {
    "canonical": "/hw:knowledge",
    "opencode": "/hw-knowledge",
    "agent": "hw-compact",
    "route": "tool",
    "skill": "skills/knowledge/SKILL.md"
  },
  {
    "canonical": "/hw:guide",
    "opencode": "/hw-guide",
    "agent": "hw-plan",
    "route": "plan",
    "skill": "skills/guide/SKILL.md"
  },
  {
    "canonical": "/hw:showcase",
    "opencode": "/hw-showcase",
    "agent": "hw-build",
    "route": "artifact",
    "skill": "skills/showcase/SKILL.md"
  },
  {
    "canonical": "/hw:rules",
    "opencode": "/hw-rules",
    "agent": "hw-status",
    "route": "rules",
    "skill": "skills/rules/SKILL.md"
  },
  {
    "canonical": "/hw:init",
    "opencode": "/hw-init",
    "agent": "hw-plan",
    "route": "lifecycle",
    "skill": "skills/init/SKILL.md"
  },
  {
    "canonical": "/hw:check",
    "opencode": "/hw-check",
    "agent": "hw-status",
    "route": "read",
    "skill": "skills/check/SKILL.md"
  },
  {
    "canonical": "/hw:audit",
    "opencode": "/hw-audit",
    "agent": "hw-review",
    "route": "review",
    "skill": "skills/audit/SKILL.md"
  },
  {
    "canonical": "/hw:release",
    "opencode": "/hw-release",
    "agent": "hw-build",
    "route": "release",
    "skill": "skills/release/SKILL.md"
  },
  {
    "canonical": "/hw:debug",
    "opencode": "/hw-debug",
    "agent": "hw-debug",
    "route": "debug",
    "skill": "skills/debug/SKILL.md"
  },
  {
    "canonical": "/hw:help",
    "opencode": "/hw-help",
    "agent": "hw-status",
    "route": "read",
    "skill": "skills/help/SKILL.md"
  },
  {
    "canonical": "/hw:reset",
    "opencode": "/hw-reset",
    "agent": "hw-status",
    "route": "lifecycle",
    "skill": "skills/reset/SKILL.md"
  },
  {
    "canonical": "/hw:log",
    "opencode": "/hw-log",
    "agent": "hw-status",
    "route": "read",
    "skill": "skills/log/SKILL.md"
  },
  {
    "canonical": "/hw:setup",
    "opencode": "/hw-setup",
    "agent": "hw-status",
    "route": "setup",
    "skill": "skills/setup/SKILL.md"
  }
],
};

const protectedFiles = [
  ".pipeline/state.yaml",
  ".pipeline/cycle.yaml",
  ".pipeline/rules.yaml",
];

const compactContextFiles = [
  ".pipeline/state.compact.yaml",
  ".pipeline/state.yaml",
  ".pipeline/PROGRESS.compact.md",
  ".pipeline/PROGRESS.md",
  ".pipeline/cycle.yaml",
  ".pipeline/rules.yaml",
  ".pipeline/patches.compact.md",
  ".pipeline/patches",
];

const autoContinue = {
  enabled: true,
  mode: "safe",
};

const server = async ({ client }) => {
  const log = createLogger(client);
  return {
    event: async ({ event }) => {
      if (event?.type === "session.compacted") restoreCompactContext(event, log);
      if (event?.type === "session.idle" || event?.type === "session.status") {
        recordStopEquivalentStatus(event, log);
      }
      if (event?.type === "permission.asked" || event?.type === "permission.replied") {
        recordPermissionEvent(event.type, event, log);
      }
      if (event?.type === "command.executed") recordCommandContext(event, log);
    },
    "command.execute.before": async (input) => {
      recordCommandContext({ command: input.command, args: input.arguments, cwd: undefined }, log);
    },
    "tool.execute.before": async (_input, output) => {
      const decision = evaluateOpenCodeFileGuard({ args: output.args || {} });
      log(`${decision.severity} file guard ${decision.path || ""}`);
      if (decision?.behavior === "deny") {
        throw new Error(decision.message);
      }
    },
    "tool.execute.after": async () => {
      log("tool.execute.after heartbeat bridge");
    },
    "permission.ask": async (input, output) => {
      const permission = decideOpenCodePermission({ args: input?.args || input?.input || input });
      output.status = permission.status;
      recordPermissionEvent("permission.ask", { ...input, decision: permission.status }, log);
    },
    "experimental.session.compacting": async (_input, output) => {
      const restored = restoreCompactContext({}, log);
      output.context.push(`Hypo-Workflow compact context files: ${restored.files.join(", ")}`);
    },
    "experimental.compaction.autocontinue": async (_input, output) => {
      output.enabled = shouldOpenCodeAutoContinue({ ...autoContinue, testsPassed: output.enabled !== false });
    },
  };
};

export default server;

async function activate({ app, client }) {
  const log = createLogger(client);

  app.on("command.executed", async (event) => {
    recordCommandContext(event, log);
  });

  app.on("tool.execute.before", async (event) => {
    const decision = evaluateOpenCodeFileGuard({ args: event?.tool?.args || event?.args || event });
    log(`${decision.severity} file guard ${decision.path || ""}`);
    return decision;
  });

  app.on("tool.execute.after", async () => {
    log("tool.execute.after heartbeat bridge");
  });

  app.on("session.idle", async (event) => {
    recordStopEquivalentStatus(event, log);
    if (shouldOpenCodeAutoContinue({ ...event, autoContinue }, log)) {
      log("session.idle auto-continue approved");
    }
  });

  app.on("session.compacted", async (event) => {
    restoreCompactContext(event, log);
  });

  app.on("permission.asked", async (event) => {
    recordPermissionEvent("permission.asked", event, log);
  });

  app.on("permission.replied", async (event) => {
    recordPermissionEvent("permission.replied", event, log);
  });

  app.on("todo.updated", async (event) => {
    log("todo.updated sync to .plan-state/todo.yaml");
    // The concrete file write is intentionally left to the host Agent or a later
    // runtime integration pass. The scaffold records the contract early so Plan
    // recovery has one stable path: .plan-state/todo.yaml.
    return event;
  });
}

function createLogger(client) {
  return (message) => {
    if (client?.log) client.log(`[hypo-workflow] ${message}`);
  };
}

function recordCommandContext(event, log) {
  log(`command.executed ${event?.command || ""}`);
  return {
    command: event?.command,
    args: event?.args || [],
    cwd: event?.cwd,
  };
}

function restoreCompactContext(event, log) {
  log(`session.compacted restoreCompactContext ${compactContextFiles.join(",")}`);
  return {
    event,
    files: compactContextFiles,
  };
}

function recordPermissionEvent(type, event, log) {
  const serialized = serializeOpenCodePermissionEvent(type, event);
  log(`${type} recorded ${serialized.paths.join(",")}`);
  return serialized;
}

function recordStopEquivalentStatus(event, log) {
  if (isOpenCodeStopEquivalent(event || {})) {
    log("stop-equivalent status observed");
  }
}
