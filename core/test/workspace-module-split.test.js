import test from "node:test";
import assert from "node:assert/strict";
import { access, readFile, readdir, stat } from "node:fs/promises";
import { constants } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const coreRoot = join(__dirname, "..");
const repoRoot = join(coreRoot, "..");
const srcRoot = join(coreRoot, "src");
const thisTestPath = fileURLToPath(import.meta.url);

const targetModules = Object.freeze([
  {
    name: "workspace-authority",
    path: join(srcRoot, "workspace-authority", "index.js"),
    apis: [
      "validateWorkspaceAuthority",
      "loadWorkspaceAuthority",
      "deriveProjectRegistryFromWorkspace",
    ],
  },
  {
    name: "project-linkage",
    path: join(srcRoot, "project-linkage", "index.js"),
    apis: [
      "buildProjectLinkageRegistry",
      "buildProjectLinkGraph",
      "validateWorkspaceRelations",
    ],
  },
  {
    name: "project-stop-events",
    path: join(srcRoot, "project-stop-events", "index.js"),
    apis: [
      "classifyProjectStopEvent",
      "buildProjectStopEvent",
    ],
  },
  {
    name: "codex-capture",
    path: join(srcRoot, "codex-capture", "index.js"),
    apis: [
      "parseCodexFinalAssistantOutput",
      "captureFinalAssistantOutput",
      "probeFinalAssistantOutputSource",
    ],
  },
  {
    name: "notification-sender",
    path: join(srcRoot, "notification-sender", "index.js"),
    apis: [
      "formatProjectStopNotification",
      "segmentProjectStopNotification",
      "sendProjectStopNotification",
    ],
  },
]);

test("workspace split modules exist and export explicit public APIs", async () => {
  for (const moduleSpec of targetModules) {
    await access(moduleSpec.path, constants.R_OK);
    const moduleApi = await import(pathToFileURL(moduleSpec.path));
    for (const apiName of moduleSpec.apis) {
      assert.equal(
        typeof moduleApi[apiName],
        "function",
        `${moduleSpec.name} must export ${apiName}`,
      );
    }
  }
});

test("core public barrel exports split modules and no longer exports the old workspace entry", async () => {
  const indexPath = join(srcRoot, "index.js");
  const content = await readFile(indexPath, "utf8");
  const legacyWorkspaceEntry = ["workspace", "index.js"].join("/");

  for (const moduleSpec of targetModules) {
    assertNamedExportBlock(content, moduleSpec.name, moduleSpec.apis);
  }

  assert.doesNotMatch(
    content,
    new RegExp(`export\\s+\\*\\s+from\\s+["']\\./${legacyWorkspaceEntry.replace("/", "\\/")}["'];?`),
    "core/src/index.js must not export the legacy workspace entry",
  );
  assert.doesNotMatch(
    content,
    /export\s+\*\s+from\s+["']\.\/workspace-authority\/index\.js["'];?/,
    "core/src/index.js must not broad-export workspace-authority",
  );
  assert.doesNotMatch(
    content,
    /export\s+\*\s+from/,
    "core/src/index.js must use explicit root exports only",
  );

  const rootApi = await import(pathToFileURL(indexPath));
  for (const moduleSpec of targetModules) {
    for (const apiName of moduleSpec.apis) {
      assert.equal(typeof rootApi[apiName], "function", `root public API must export ${apiName}`);
    }
  }
});

test("legacy workspace entry is absent or not a compatibility re-export shim", async () => {
  const legacyPath = join(srcRoot, "workspace", "index.js");
  let content;
  try {
    content = await readFile(legacyPath, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") return;
    throw error;
  }

  for (const moduleSpec of targetModules) {
    assert.doesNotMatch(
      content,
      new RegExp(`export\\s+\\*\\s+from\\s+["'][^"']*${moduleSpec.name}/index\\.js["']`),
      `legacy workspace entry must not re-export ${moduleSpec.name}`,
    );
    assert.doesNotMatch(
      content,
      new RegExp(`export\\s+\\{[^}]*\\}\\s+from\\s+["'][^"']*${moduleSpec.name}/index\\.js["']`, "s"),
      `legacy workspace entry must not named-re-export ${moduleSpec.name}`,
    );
  }
});

test("runtime, tests, and docs have no stale legacy workspace imports", async () => {
  const scanRoots = [
    join(srcRoot),
    join(coreRoot, "test"),
    join(repoRoot, "docs"),
    join(repoRoot, "README.md"),
    join(repoRoot, "README.en.md"),
  ];
  const findings = [];
  const legacyWorkspaceEntry = ["workspace", "index"].join("/");
  const legacyPathPattern = /(?:import|export)\s+(?:[^"']*?\s+from\s+)?["'][^"']*(?<!-)workspace(?:\/index\.js)?["']/;

  for (const scanRoot of scanRoots) {
    for await (const filePath of walkFiles(scanRoot)) {
      if (filePath === thisTestPath) continue;
      const content = await readFile(filePath, "utf8");
      const lines = content.split(/\r?\n/);
      lines.forEach((line, index) => {
        if (line.includes(legacyWorkspaceEntry) || legacyPathPattern.test(line)) {
          findings.push(`${relative(repoRoot, filePath)}:${index + 1}:${line.trim()}`);
        }
      });
    }
  }

  assert.deepEqual(findings, [], `stale legacy workspace imports found:\n${findings.join("\n")}`);
});

test("focused behavior is available through split module imports", async () => {
  const workspaceAuthority = await importModule("workspace-authority");
  const projectLinkage = await importModule("project-linkage");
  const projectStopEvents = await importModule("project-stop-events");
  const codexCapture = await importModule("codex-capture");
  const notificationSender = await importModule("notification-sender");

  const workspace = validWorkspace();
  assert.equal(workspaceAuthority.validateWorkspaceAuthority(workspace).valid, true);

  const derived = workspaceAuthority.deriveProjectRegistryFromWorkspace(workspace, {
    existingProjects: [{ id: "hypo-workflow", display_name: "Spoofed", path: "/tmp/spoofed" }],
  });
  assert.equal(derived.projects[0].display_name, "Hypo-Workflow");
  assert.ok(derived.drift.some((item) => item.field === "display_name"));

  const graph = projectLinkage.buildProjectLinkGraph(workspace);
  assert.deepEqual(graph.successorsOf("hypo-info"), ["hypo-info-v2"]);
  assert.deepEqual(graph.predecessorsOf("hypo-info-v2"), ["hypo-info"]);

  const registry = projectLinkage.buildProjectLinkageRegistry();
  assert.deepEqual(
    registry.projects.map((project) => project.id),
    ["hypo-workflow", "hypo-claw", "hypo-writer", "hypo-info-v2", "hypo-research", "hypo-switcher", "hypo-llm"],
  );

  const stop = projectStopEvents.classifyProjectStopEvent({
    project: { id: "hypo-workflow", display_name: "Hypo-Workflow" },
    source_platform: "codex",
    session: { id: "session-1" },
    terminal_at: "2026-05-20T23:14:30+08:00",
    workflow_state: {
      pipeline: { status: "waiting_acceptance" },
      current: { phase: "waiting_acceptance" },
      continuation: { auto_continue_available: false },
    },
  });
  assert.equal(stop.should_emit, true);
  assert.equal(stop.event.stop_reason, "waiting_acceptance");

  const sessionPath = join(
    __dirname,
    "fixtures",
    "final-assistant-output",
    "codex-sessions",
    "2026",
    "05",
    "20",
    "rollout-2026-05-20T09-15-00-final-output-fixture.jsonl",
  );
  const captured = await codexCapture.parseCodexFinalAssistantOutput({ session_path: sessionPath });
  assert.equal(captured.status, "captured");
  assert.match(captured.output, /Final assistant output starts here\./);
  assert.deepEqual(captured.planned_external_actions, []);

  const message = notificationSender.formatProjectStopNotification({
    project_id: "hypo-workflow",
    project: { display_name: "Hypo-Workflow" },
    stop_reason: "waiting_acceptance",
    progress_summary: { milestone_id: "C17-M4", summary: "module split focused behavior" },
    final_assistant_output: captured.output,
  });
  const segments = notificationSender.segmentProjectStopNotification(message, { max_chars: 120 });
  assert.equal(segments.map((segment) => segment.body).join(""), message);

  const sendResult = await notificationSender.sendProjectStopNotification({}, {
    mode: "dry-run",
    message,
    spawn: () => {
      throw new Error("dry-run must not spawn");
    },
  });
  assert.equal(sendResult.external_contacted, false);
  assert.equal(sendResult.spawned, false);
});

async function importModule(name) {
  const moduleSpec = targetModules.find((item) => item.name === name);
  assert.ok(moduleSpec, `unknown test module ${name}`);
  return import(pathToFileURL(moduleSpec.path));
}

async function* walkFiles(root) {
  let rootStat;
  try {
    rootStat = await stat(root);
  } catch (error) {
    if (error.code === "ENOENT") return;
    throw error;
  }

  if (rootStat.isFile()) {
    yield root;
    return;
  }

  const entries = await readdir(root, { withFileTypes: true });
  for (const entry of entries) {
    const filePath = join(root, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".git") continue;
      yield* walkFiles(filePath);
    } else if (entry.isFile() && isScannable(filePath)) {
      yield filePath;
    }
  }
}

function isScannable(filePath) {
  return /\.(?:js|mjs|cjs|ts|tsx|md|mdx|json|yaml|yml)$/.test(filePath);
}

function assertNamedExportBlock(content, moduleName, apiNames) {
  const blocks = [...content.matchAll(/export\s+\{(?<names>[^}]*)\}\s+from\s+["']\.\/(?<module>[^"']+)\/index\.js["'];?/g)];
  const match = blocks.find((block) => block.groups.module === moduleName);
  assert.ok(match, `core/src/index.js must explicitly named-export ${moduleName}`);
  const names = new Set(
    match.groups.names
      .split(",")
      .map((name) => name.trim())
      .filter(Boolean)
      .map((name) => name.split(/\s+as\s+/i)[0].trim()),
  );
  for (const apiName of apiNames) {
    assert.ok(names.has(apiName), `core/src/index.js must explicitly export ${apiName} from ${moduleName}`);
  }
}

function validWorkspace() {
  return {
    schema_version: "1",
    workspace: {
      id: "hypoxanthine-main",
      display_name: "Hypoxanthine Workspace",
      roots: ["/home/heyx"],
      authority: "workspace_yaml",
      updated_at: "2026-05-19T15:30:00+08:00",
    },
    objects: [
      {
        id: "hypo-workflow",
        type: "project",
        status: "current",
        display_name: "Hypo-Workflow",
        aliases: ["workflow-root"],
        local: {
          path: "/home/heyx/Hypo-Workflow",
          state_authority: ".pipeline/state.yaml",
          artifact_authority: ".pipeline",
        },
      },
      {
        id: "hypo-info",
        type: "project",
        status: "archived",
        display_name: "Hypo-Info",
        aliases: [],
      },
      {
        id: "hypo-info-v2",
        type: "project",
        status: "current",
        display_name: "Hypo-Info-V2",
        aliases: ["info-v2"],
      },
    ],
    relations: [
      {
        id: "edge-hypo-info-replaced-by-v2",
        from: "hypo-info",
        to: "hypo-info-v2",
        type: "replaced_by",
        status: "confirmed",
        authority: "user",
        direction: "from_to",
        evidence_refs: ["user-confirmation-2026-05-18"],
        projection: { project_home: true, global_graph: true, notion: "summary_link_only" },
        created_at: "2026-05-18T23:15:30+08:00",
        updated_at: "2026-05-18T23:15:30+08:00",
      },
    ],
    sync_targets: [],
    policies: [],
    secret_refs: [],
    derived_views: {
      projects_yaml: {
        path: "~/.hypo-workflow/projects.yaml",
        authority: "derived_from_workspace",
      },
    },
  };
}
