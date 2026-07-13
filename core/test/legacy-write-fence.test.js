import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  readlink,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import {
  acceptCycle,
  applyConfigTuiEdit,
  appendLifecycleLogEntry,
  commitWorkflowUpdate,
  markCyclePendingAcceptance,
  repairDocs,
  rejectCycle,
  syncSelectedProjectAction,
  stringifyYaml,
  updateReadme,
  writeClaudeCodeAgentArtifacts,
  writeClaudeCodePluginArtifacts,
  writeConfig,
  writeContinuationState,
  writeCursorSkillBundle,
  writeOpenCodeArtifacts,
  writeThirdPartyAdapterArtifacts,
} from "../src/index.js";
import { createWorkspaceManifest } from "../src/manifest/index.js";
import {
  assertLegacyWorkspaceWritable,
  LEGACY_WORKSPACE_WRITER_INVENTORY,
} from "../src/workspace-format/index.js";

const FIXED_NOW = "2026-07-11T23:00:00+08:00";

const EXPECTED_WRITER_IDS = Object.freeze([
  "legacy.lifecycle.commit",
  "legacy.acceptance",
  "legacy.continuation",
  "legacy.log",
  "legacy.compact",
  "legacy.sync",
  "legacy.rules",
  "legacy.knowledge",
  "legacy.patches",
  "legacy.explore",
  "legacy.deep-plan",
  "legacy.pr",
  "legacy.cli.init-project",
  "legacy.hook.codex-notify",
  "legacy.config.project",
  "legacy.artifacts.opencode",
  "legacy.artifacts.claude",
  "legacy.artifacts.third-party",
  "legacy.docs",
  "legacy.readme",
  "legacy.actions.project-sync",
  "legacy.tui.project-config",
]);

const EXPECTED_WRITER_INVENTORY = Object.freeze({
  "core/src/lifecycle/commit.js": ["commitWorkflowUpdate"],
  "core/src/acceptance/index.js": ["markCyclePendingAcceptance", "acceptCycle", "rejectCycle"],
  "core/src/continuation/index.js": ["writeContinuationState"],
  "core/src/log/index.js": ["appendLifecycleLogEntry"],
  "core/src/compact/index.js": ["runEndOfRunCompact"],
  "core/src/sync/index.js": [
    "runProjectSync",
    "writeClaudeHookArtifacts",
    "syncClaudeCodeSettings",
    "repairDerivedArtifacts",
  ],
  "core/src/rules/index.js": ["writeConfirmedStructuredRule", "writeStructuredHabitsDocument"],
  "core/src/knowledge/index.js": [
    "appendKnowledgeRecord",
    "rebuildKnowledgeIndexes",
    "renderKnowledgeCompact",
    "rebuildKnowledgeLedger",
  ],
  "core/src/patches/index.js": ["requestPatchAcceptance", "acceptPatch", "rejectPatch"],
  "core/src/explore/index.js": [
    "createExploration",
    "endExploration",
    "archiveExploration",
    "createExploreAnalysisContext",
  ],
  "core/src/deep-plan/index.js": [
    "createDeepPlanPackage",
    "updateDeepPlanPackage",
    "recordDeepPlanAskRound",
    "recordDeepPlanResearch",
    "updateDeepPlanArchitectureMap",
    "drillDeepPlanTopic",
    "convertDeepPlanToPlanContext",
    "archiveDeepPlanPackage",
  ],
  "core/src/pr/index.js": [
    "writeChangeRequestArchive",
    "writeChangeRequestCreateProposal",
    "inspectChangeRequest",
    "reviewChangeRequest",
    "planChangeRequestFix",
    "prepareChangeRequestMerge",
    "prepareChangeRequestClose",
    "executeChangeRequestCreatePlan",
  ],
  "cli/bin/hypo-workflow": ["initProject"],
  "hooks/codex-notify.sh": ["hooks/codex-notify.sh#scripts/log-append.sh"],
  "core/src/config/index.js": ["writeConfig"],
  "core/src/artifacts/opencode.js": ["writeOpenCodeArtifacts"],
  "core/src/artifacts/claude.js": ["writeClaudeCodePluginArtifacts", "writeClaudeCodeAgentArtifacts"],
  "core/src/artifacts/third-party.js": ["writeThirdPartyAdapterArtifacts", "writeCursorSkillBundle"],
  "core/src/docs/index.js": ["repairDocs"],
  "core/src/readme/index.js": ["updateReadme"],
  "core/src/actions/index.js": ["syncSelectedProjectAction"],
  "core/src/tui/index.js": ["applyConfigTuiEdit"],
});

test("legacy writer inventory exposes every discovered family and observable entrypoint", () => {
  assert.ok(Array.isArray(LEGACY_WORKSPACE_WRITER_INVENTORY));
  const ids = new Set();
  const byModule = new Map();

  for (const entry of LEGACY_WORKSPACE_WRITER_INVENTORY) {
    assert.equal(typeof entry.id, "string");
    assert.ok(entry.id.length > 0);
    assert.equal(ids.has(entry.id), false, `duplicate writer inventory id: ${entry.id}`);
    ids.add(entry.id);
    assert.equal(typeof entry.module, "string");
    assert.ok(Array.isArray(entry.entrypoints));
    assert.ok(entry.entrypoints.length > 0);
    byModule.set(entry.module, new Set(entry.entrypoints));
  }
  assert.deepEqual([...ids].sort(), [...EXPECTED_WRITER_IDS].sort());

  for (const [module, entrypoints] of Object.entries(EXPECTED_WRITER_INVENTORY)) {
    assert.ok(byModule.has(module), `missing legacy writer family: ${module}`);
    for (const entrypoint of entrypoints) {
      const observableName = entrypoint.includes("#") ? entrypoint : `${module}#${entrypoint}`;
      assert.ok(byModule.get(module).has(entrypoint), `missing legacy writer entrypoint: ${observableName}`);
    }
  }
});

test("central legacy fence rejects every inventoried family in current, mixed, and damaged workspaces", async (t) => {
  for (const kind of ["current", "mixed", "damaged"]) {
    await t.test(kind, async (subtest) => {
      const root = await temporaryRoot(subtest, `hw-fence-inventory-${kind}-`);
      if (kind === "damaged") {
        await writeText(join(root, ".pipeline", "manifest.yaml"), "schema_version: [\n");
      } else {
        await writeManifest(root);
      }
      if (kind === "mixed") await writeLegacyAcceptanceFixture(root);
      const before = await snapshotTree(root);

      for (const writer of LEGACY_WORKSPACE_WRITER_INVENTORY) {
        await assert.rejects(
          assertLegacyWorkspaceWritable(root, writer.id),
          /legacy|current|damaged|manifest|workspace|write.*block|fence/i,
          `writer ${writer.id} must fail closed in ${kind}`,
        );
      }

      assert.deepEqual(await snapshotTree(root), before, "central fence checks must remain read-only");
    });
  }
});

test("high-risk lifecycle, continuation, and log entrypoints reject current workspaces before mutation", async (t) => {
  const attempts = [
    {
      name: "lifecycle commit",
      invoke: (root) => commitWorkflowUpdate(root, {
        id: "legacy-commit-must-block",
        authority: {
          ".pipeline/state.yaml": {
            pipeline: { status: "stopped", prompts_completed: 0 },
            current: { phase: "idle", step: null },
          },
        },
      }),
    },
    {
      name: "continuation writer",
      invoke: (root) => writeContinuationState(root, {
        status: "active",
        next_action: "continue_execution",
        reason: "test",
        updated_at: FIXED_NOW,
        safe_resume_command: "/hw:resume",
      }),
    },
    {
      name: "lifecycle log writer",
      invoke: (root) => appendLifecycleLogEntry(root, {
        id: "legacy-log-must-block",
        type: "milestone_complete",
        status: "completed",
        timestamp: FIXED_NOW,
        summary: "must not be appended",
      }),
    },
  ];

  for (const attempt of attempts) {
    await t.test(attempt.name, async (subtest) => {
      const root = await temporaryRoot(subtest, "hw-fence-current-entrypoint-");
      await writeManifest(root);
      await writeText(join(root, "sentinel.txt"), "unchanged\n");
      const before = await snapshotTree(root);

      await assert.rejects(attempt.invoke(root), /legacy|current|manifest|workspace|write.*block|fence/i);

      assert.deepEqual(await snapshotTree(root), before, `${attempt.name} must be a zero-write rejection`);
    });
  }
});

test("all acceptance entrypoints reject a manifest workspace with legacy residue before mutation", async (t) => {
  const attempts = [
    ["mark pending", (root) => markCyclePendingAcceptance(root, { now: FIXED_NOW })],
    ["accept", (root) => acceptCycle(root, { now: FIXED_NOW })],
    ["reject", (root) => rejectCycle(root, { now: FIXED_NOW, feedback: "must not write" })],
  ];

  for (const [name, invoke] of attempts) {
    await t.test(name, async (subtest) => {
      const root = await temporaryRoot(subtest, "hw-fence-acceptance-mixed-");
      await writeManifest(root);
      await writeLegacyAcceptanceFixture(root);
      const before = await snapshotTree(root);

      await assert.rejects(
        invoke(root),
        /legacy|current|manifest|workspace|write.*block|fence/i,
      );

      assert.deepEqual(await snapshotTree(root), before);
    });
  }
});

test("damaged manifest blocks all high-risk legacy entrypoints and preserves bytes", async (t) => {
  const attempts = [
    {
      name: "lifecycle commit",
      invoke: (root) => commitWorkflowUpdate(root, {
        id: "damaged-commit-must-block",
        authority: {
          ".pipeline/state.yaml": { pipeline: { status: "stopped" }, current: { phase: "idle" } },
        },
      }),
    },
    {
      name: "acceptance mark pending",
      invoke: (root) => markCyclePendingAcceptance(root, { now: FIXED_NOW }),
    },
    {
      name: "acceptance accept",
      invoke: (root) => acceptCycle(root, { now: FIXED_NOW }),
    },
    {
      name: "acceptance reject",
      invoke: (root) => rejectCycle(root, { now: FIXED_NOW, feedback: "must not write" }),
    },
    {
      name: "continuation",
      invoke: (root) => writeContinuationState(root, {
        status: "active",
        next_action: "continue_execution",
        reason: "test",
        updated_at: FIXED_NOW,
        safe_resume_command: "/hw:resume",
      }),
    },
    {
      name: "log",
      invoke: (root) => appendLifecycleLogEntry(root, {
        id: "damaged-log-must-block",
        type: "milestone_complete",
        status: "completed",
        timestamp: FIXED_NOW,
        summary: "must not be appended",
      }),
    },
  ];

  for (const attempt of attempts) {
    await t.test(attempt.name, async (subtest) => {
      const root = await temporaryRoot(subtest, "hw-fence-damaged-entrypoint-");
      await writeLegacyAcceptanceFixture(root);
      await writeText(join(root, ".pipeline", "manifest.yaml"), "schema_version: [\n");
      const before = await snapshotTree(root);

      await assert.rejects(attempt.invoke(root), /damaged|invalid|manifest|workspace|write.*block|fence/i);

      assert.deepEqual(await snapshotTree(root), before, `${attempt.name} must fail closed without cleanup writes`);
    });
  }
});

test("legacy workspace remains writable through the compatibility fence", async (t) => {
  const root = await temporaryRoot(t, "hw-fence-legacy-allowed-");
  await writeLegacyAcceptanceFixture(root);

  await assert.doesNotReject(
    assertLegacyWorkspaceWritable(root, LEGACY_WORKSPACE_WRITER_INVENTORY[0].id),
  );
  await writeContinuationState(root, {
    status: "active",
    next_action: "continue_execution",
    reason: "legacy_resume",
    updated_at: FIXED_NOW,
    safe_resume_command: "/hw:resume",
  });

  assert.match(await readFile(join(root, ".pipeline", "continuation.yaml"), "utf8"), /legacy_resume/);
});

test("public project writers reject a current workspace before their first mutation", async (t) => {
  const attempts = [
    {
      name: "project config",
      writerId: "legacy.config.project",
      invoke: (root) => writeConfig(join(root, ".pipeline", "config.yaml"), {
        pipeline: { name: "must-not-write" },
      }),
    },
    {
      name: "OpenCode artifacts",
      writerId: "legacy.artifacts.opencode",
      invoke: (root) => writeOpenCodeArtifacts(root, { profile: "standard" }),
    },
    {
      name: "Claude plugin artifacts",
      writerId: "legacy.artifacts.claude",
      invoke: (root) => writeClaudeCodePluginArtifacts(root),
    },
    {
      name: "Claude agent artifacts",
      writerId: "legacy.artifacts.claude",
      invoke: (root) => writeClaudeCodeAgentArtifacts(root, { config: {} }),
    },
    {
      name: "third-party artifacts",
      writerId: "legacy.artifacts.third-party",
      invoke: (root) => writeThirdPartyAdapterArtifacts(root, { platform: "copilot" }),
    },
    {
      name: "Cursor Skill bundle",
      writerId: "legacy.artifacts.third-party",
      invoke: (root) => writeCursorSkillBundle(root, { repoRoot: resolve(".") }),
    },
    {
      name: "Docs repair",
      writerId: "legacy.docs",
      invoke: (root) => repairDocs(root),
    },
    {
      name: "README update",
      writerId: "legacy.readme",
      arrange: (root) => writeText(join(root, "README.md"), [
        "manual intro",
        "<!-- HW:README:BEGIN command-count -->",
        "stale count",
        "<!-- HW:README:END command-count -->",
        "manual outro",
        "",
      ].join("\n")),
      invoke: (root) => updateReadme(join(root, "README.md"), {
        blocks: ["command-count"],
        write: true,
      }),
    },
    {
      name: "selected-project sync",
      writerId: "legacy.actions.project-sync",
      arrange: (root) => writeText(join(root, "project-registry.yaml"), `${stringifyYaml({
        schema_version: "1",
        projects: [{
          id: "current-project",
          display_name: "Current Project",
          path: root,
          platform: "opencode",
          profile: "standard",
        }],
      }).trimEnd()}\n`),
      invoke: (root) => syncSelectedProjectAction(
        join(root, "project-registry.yaml"),
        "current-project",
        { platform: "opencode" },
      ),
    },
    {
      name: "project config TUI apply",
      writerId: "legacy.tui.project-config",
      invoke: (root) => applyConfigTuiEdit({
        valid: true,
        target: {
          id: "project",
          project_root: root,
          config_file: join(root, ".pipeline", "config.yaml"),
        },
        after: { pipeline: { name: "must-not-write" } },
        diff: [{ path: "pipeline.name", before: null, after: "must-not-write" }],
      }, { confirm: true, now: FIXED_NOW }),
    },
  ];

  for (const attempt of attempts) {
    await t.test(attempt.name, async (subtest) => {
      const root = await temporaryRoot(subtest, "hw-fence-public-writer-");
      await writeManifest(root);
      await writeText(join(root, "sentinel.txt"), "unchanged\n");
      if (attempt.arrange) await attempt.arrange(root);
      const before = await snapshotTree(root);

      const error = await captureError(() => attempt.invoke(root));
      const after = await snapshotTree(root);

      assert.deepEqual(after, before, `${attempt.name} must reject before any partial write or cleanup`);
      assert.equal(error?.code, "ERR_LEGACY_WORKSPACE_WRITE_BLOCKED");
      assert.match(error?.message || "", new RegExp(escapeRegExp(attempt.writerId)));
    });
  }
});

test("CLI init and the qualified notify log chain reject before process-level mutation", async (t) => {
  await t.test("CLI init-project", async (subtest) => {
    const container = await temporaryRoot(subtest, "hw-fence-cli-process-");
    const root = join(container, "project");
    const home = join(container, "home");
    await mkdir(root, { recursive: true });
    await mkdir(home, { recursive: true });
    await writeManifest(root);
    const before = await snapshotTree(container);

    const result = spawnSync(process.execPath, [
      resolve("cli/bin/hypo-workflow"),
      "init-project",
      "--project",
      root,
      "--platform",
      "opencode",
    ], {
      cwd: resolve("."),
      encoding: "utf8",
      env: { ...process.env, HOME: home },
      timeout: 20_000,
    });

    assert.notEqual(result.status, 0);
    assert.match(`${result.stdout}\n${result.stderr}`, /legacy\.cli\.init-project|Legacy workspace writer/);
    assert.deepEqual(await snapshotTree(container), before);
  });

  await t.test("codex-notify to log-append", async (subtest) => {
    const root = await temporaryRoot(subtest, "hw-fence-notify-process-");
    await writeManifest(root);
    const before = await snapshotTree(root);

    const result = spawnSync("bash", [
      resolve("scripts/log-append.sh"),
      "--pipeline-dir",
      join(root, ".pipeline"),
      "--step",
      "hook:codex-notify",
      "--status",
      "done",
      "--message",
      "must-not-write",
    ], {
      cwd: root,
      encoding: "utf8",
      env: { ...process.env, HYPO_WORKFLOW_LEGACY_WRITER_ID: "legacy.hook.codex-notify" },
      timeout: 20_000,
    });

    assert.notEqual(result.status, 0);
    assert.match(`${result.stdout}\n${result.stderr}`, /legacy\.hook\.codex-notify|Legacy workspace writer/);
    assert.deepEqual(await snapshotTree(root), before);
  });
});

async function writeManifest(root) {
  const value = createWorkspaceManifest({
    workspace_id: "fence-fixture",
    project_id: "fence-project",
    created_at: FIXED_NOW,
  });
  await writeText(join(root, ".pipeline", "manifest.yaml"), `${stringifyYaml(value).trimEnd()}\n`);
}

async function writeLegacyAcceptanceFixture(root) {
  await writeText(join(root, ".pipeline", "config.yaml"), [
    "acceptance:",
    "  mode: manual",
    "execution:",
    "  worker_separation:",
    "    mode: off",
    "",
  ].join("\n"));
  await writeText(join(root, ".pipeline", "cycle.yaml"), [
    "cycle:",
    "  number: 21",
    "  status: active",
    "  acceptance:",
    "    state: pending",
    "",
  ].join("\n"));
  await writeText(join(root, ".pipeline", "state.yaml"), [
    "pipeline:",
    "  status: running",
    "  prompts_total: 0",
    "  prompts_completed: 0",
    "current:",
    "  phase: executing",
    "  step: null",
    "acceptance:",
    "  state: pending",
    "",
  ].join("\n"));
  await writeText(join(root, ".pipeline", "log.yaml"), "entries: []\n");
  await writeText(join(root, ".pipeline", "PROGRESS.md"), "# Progress\n");
}

async function temporaryRoot(t, prefix) {
  const root = await mkdtemp(join(tmpdir(), prefix));
  t.after(() => rm(root, { recursive: true, force: true }));
  return root;
}

async function writeText(path, content) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, content, "utf8");
}

async function captureError(operation) {
  try {
    await operation();
    return null;
  } catch (error) {
    return error;
  }
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function snapshotTree(root) {
  const entries = [];
  await visit(root, ".", entries);
  return entries;
}

async function visit(root, relativePath, entries) {
  const path = relativePath === "." ? root : join(root, relativePath);
  const stat = await lstat(path, { bigint: true });
  const common = { path: relativePath, mode: Number(stat.mode), mtime_ns: stat.mtimeNs };
  if (stat.isSymbolicLink()) {
    entries.push({ ...common, type: "symlink", target: await readlink(path) });
    return;
  }
  if (stat.isDirectory()) {
    entries.push({ ...common, type: "directory" });
    for (const child of (await readdir(path)).sort()) {
      await visit(root, relativePath === "." ? child : join(relativePath, child), entries);
    }
    return;
  }
  entries.push({ ...common, type: "file", content: (await readFile(path)).toString("base64") });
}
