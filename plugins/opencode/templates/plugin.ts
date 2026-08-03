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
  version: "__HW_VERSION__",
  commandMap: __COMMAND_MAP_JSON__,
};

const protectedFiles = [
  ".pipeline/state.yaml",
  ".pipeline/cycle.yaml",
  ".pipeline/rules.yaml",
];

const compactContextFiles = [
  ".pipeline/manifest.yaml",
  ".pipeline/runtime/active.yaml",
  ".pipeline/runtime/placements.yaml",
  ".pipeline/rules.yaml",
  ".pipeline/memory/index.yaml",
];

const autoContinue = {
  enabled: true,
  mode: "safe",
};

const bashExecution = __BASH_POLICY_JSON__;

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
      const permission = decideOpenCodePermission({ ...(input || {}), args: input?.args || input?.input || input, bash: bashExecution });
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
