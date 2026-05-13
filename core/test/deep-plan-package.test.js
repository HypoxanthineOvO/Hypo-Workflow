import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  archiveDeepPlanPackage,
  createDeepPlanPackage,
  listDeepPlanPackages,
  parseYaml,
  readDeepPlanPackage,
  updateDeepPlanPackage,
  writeConfig,
} from "../src/index.js";

test("createDeepPlanPackage creates the next durable DP package with core artifacts", async () => {
  const root = await fixtureRoot();
  await createExistingPackage(root, "DP001-existing-plan");

  const created = await createDeepPlanPackage(root, {
    title: "Hypo Agent architecture reset",
    summary: "Re-plan Hypo-Agent from first principles before ordinary plan conversion.",
    conversation_summary: "User wants a durable discussion package before Feature Queue handoff.",
    decisions: [
      {
        id: "D001",
        status: "accepted",
        statement: "Deep planning stores durable discussion packages under .pipeline/deep-plans.",
        rationale: "Planning context must survive across Cycles and future follow-up sessions.",
      },
    ],
    tracks: [
      {
        id: "T001",
        kind: "topic",
        title: "Requirements pressure test",
        status: "active",
        questions: ["What evidence could disprove this direction?"],
      },
    ],
    readiness_depth: "directional",
    now: "2026-05-12T10:00:00+08:00",
  });

  assert.equal(created.id, "DP002");
  assert.equal(created.slug, "hypo-agent-architecture-reset");
  assert.equal(created.status, "drafting");
  assert.equal(created.path, ".pipeline/deep-plans/DP002-hypo-agent-architecture-reset");
  assert.equal(created.active_ref, ".pipeline/deep-plans/active.yaml");

  const packageDir = join(root, ".pipeline", "deep-plans", "DP002-hypo-agent-architecture-reset");
  const files = await readdir(packageDir);
  assert.deepEqual(files.sort(), [
    "architecture.md",
    "architecture.yaml",
    "deep-plan.yaml",
    "plan-context.md",
    "readiness.md",
    "summary.md",
    "tracks.yaml",
  ]);

  const metadata = parseYaml(await readFile(join(packageDir, "deep-plan.yaml"), "utf8"));
  assert.equal(metadata.deep_plan.id, "DP002");
  assert.equal(metadata.deep_plan.title, "Hypo Agent architecture reset");
  assert.equal(metadata.deep_plan.status, "drafting");
  assert.equal(metadata.deep_plan.readiness_depth, "directional");
  assert.equal(metadata.deep_plan.package_path, ".pipeline/deep-plans/DP002-hypo-agent-architecture-reset");
  assert.equal(metadata.deep_plan.summary_path, ".pipeline/deep-plans/DP002-hypo-agent-architecture-reset/summary.md");
  assert.equal(metadata.deep_plan.plan_context_path, ".pipeline/deep-plans/DP002-hypo-agent-architecture-reset/plan-context.md");
  assert.deepEqual(metadata.deep_plan.lifecycle_states, [
    "drafting",
    "researching",
    "architecture_mapping",
    "module_drilldown",
    "ready_for_plan",
    "converted",
    "archived",
  ]);

  const active = parseYaml(await readFile(join(root, ".pipeline", "deep-plans", "active.yaml"), "utf8"));
  assert.equal(active.active.id, "DP002");
  assert.equal(active.active.package_path, ".pipeline/deep-plans/DP002-hypo-agent-architecture-reset");

  assert.match(await readFile(join(packageDir, "summary.md"), "utf8"), /durable discussion package/i);
  assert.match(await readFile(join(packageDir, "architecture.yaml"), "utf8"), /components:/);
  assert.match(await readFile(join(packageDir, "architecture.md"), "utf8"), /```mermaid/);
  assert.match(await readFile(join(packageDir, "tracks.yaml"), "utf8"), /Requirements pressure test/);
  assert.match(await readFile(join(packageDir, "readiness.md"), "utf8"), /directional/);
  assert.match(await readFile(join(packageDir, "plan-context.md"), "utf8"), /Feature Queue|ordinary plan|\/hw:plan/i);
});

test("read/list/update/archive preserve lifecycle and active pointers", async () => {
  const root = await fixtureRoot();

  const first = await createDeepPlanPackage(root, {
    title: "Memory redesign",
    summary: "First active package.",
    readiness_depth: "directional",
    now: "2026-05-12T10:01:00+08:00",
  });
  const second = await createDeepPlanPackage(root, {
    title: "Tool system roadmap",
    summary: "Second active package.",
    readiness_depth: "architecture-ready",
    now: "2026-05-12T10:02:00+08:00",
  });

  const listed = await listDeepPlanPackages(root);
  assert.deepEqual(listed.map((item) => item.id), ["DP001", "DP002"]);
  assert.deepEqual(listed.map((item) => item.status), ["drafting", "drafting"]);

  const read = await readDeepPlanPackage(root, "DP002");
  assert.equal(read.deep_plan.id, second.id);
  assert.equal(read.deep_plan.title, "Tool system roadmap");
  assert.equal(read.deep_plan.readiness_depth, "architecture-ready");

  const updated = await updateDeepPlanPackage(root, "DP002", {
    status: "architecture_mapping",
    conversation_summary: "The package now has enough context to form an initial component map.",
    decisions: [
      {
        id: "D002",
        status: "accepted",
        statement: "Track-level dependencies are machine-readable and rendered for humans.",
      },
    ],
    tracks: [
      {
        id: "T002",
        kind: "module",
        title: "Tool registry",
        status: "active",
        depends_on: ["T001"],
      },
    ],
    architecture: {
      components: [{ id: "tool-registry", title: "Tool Registry" }],
      edges: [{ from: "planner", to: "tool-registry", reason: "Plan conversion needs available tools." }],
    },
    readiness_depth: "implementation-ready",
    now: "2026-05-12T10:03:00+08:00",
  });

  assert.equal(updated.deep_plan.status, "architecture_mapping");
  assert.equal(updated.deep_plan.updated_at, "2026-05-12T10:03:00+08:00");
  assert.equal(updated.deep_plan.readiness_depth, "implementation-ready");
  assert.equal(updated.decisions[0].id, "D002");
  assert.equal(updated.tracks[0].kind, "module");

  const archived = await archiveDeepPlanPackage(root, first.id, {
    reason: "Superseded by DP002",
    now: "2026-05-12T10:04:00+08:00",
  });
  assert.equal(archived.deep_plan.status, "archived");
  assert.equal(archived.deep_plan.archived_at, "2026-05-12T10:04:00+08:00");
  assert.equal(archived.deep_plan.archive_reason, "Superseded by DP002");

  const active = parseYaml(await readFile(join(root, ".pipeline", "deep-plans", "active.yaml"), "utf8"));
  assert.equal(active.active.id, "DP002");
  assert.notEqual(active.active.id, first.id);
});

test("packages retain conversation summaries and structured decisions while compact context excludes raw long conversation", async () => {
  const root = await fixtureRoot();
  const rawConversation = [
    "USER: I have a very long uncertain product discussion.",
    "ASSISTANT: We should pressure-test necessity, minimum loop, and disconfirming evidence.",
    "USER: RAW_LONG_CONVERSATION_MARKER should not be copied into compact plan context.",
  ].join("\n".repeat(40));

  const created = await createDeepPlanPackage(root, {
    title: "Compact context boundary",
    raw_conversation: rawConversation,
    conversation_summary: "The discussion identified unclear implementation depth and required a readiness gate.",
    decisions: [
      {
        id: "D001",
        status: "accepted",
        statement: "Plan conversion reads compact context instead of raw transcript.",
        evidence_refs: ["summary.md", "tracks.yaml", "readiness.md"],
      },
    ],
    readiness_depth: "architecture-ready",
    now: "2026-05-12T10:05:00+08:00",
  });

  const packageDir = join(root, created.path);
  const metadata = parseYaml(await readFile(join(packageDir, "deep-plan.yaml"), "utf8"));
  const summary = await readFile(join(packageDir, "summary.md"), "utf8");
  const planContext = await readFile(join(packageDir, "plan-context.md"), "utf8");

  assert.match(summary, /discussion identified unclear implementation depth/i);
  assert.equal(metadata.decisions[0].id, "D001");
  assert.match(metadata.decisions[0].statement, /compact context/);
  assert.match(planContext, /compact/i);
  assert.match(planContext, /readiness/i);
  assert.ok(planContext.length < rawConversation.length, "compact plan context should be shorter than raw conversation");
  assert.doesNotMatch(planContext, /RAW_LONG_CONVERSATION_MARKER/);
  assert.doesNotMatch(planContext, /USER:|ASSISTANT:/);
});

test("deep plan packages have no Explore worktree semantics or protected authority writes", async () => {
  const root = await fixtureRoot();
  const before = await protectedSnapshot(root);

  const created = await createDeepPlanPackage(root, {
    title: "No worktree package",
    summary: "Deep Plan is a discussion package, not an Explore experiment.",
    now: "2026-05-12T10:06:00+08:00",
  });
  await updateDeepPlanPackage(root, created.id, {
    status: "researching",
    conversation_summary: "Research stores read-only evidence in the package.",
    now: "2026-05-12T10:07:00+08:00",
  });
  await archiveDeepPlanPackage(root, created.id, {
    reason: "Boundary verified.",
    now: "2026-05-12T10:08:00+08:00",
  });

  assert.deepEqual(await protectedSnapshot(root), before);
  await assert.rejects(stat(join(root, ".pipeline", "explorations")), /ENOENT/);

  const packageDir = join(root, created.path);
  const metadata = await readFile(join(packageDir, "deep-plan.yaml"), "utf8");
  const tracks = await readFile(join(packageDir, "tracks.yaml"), "utf8");
  const context = await readFile(join(packageDir, "plan-context.md"), "utf8");
  const combined = [metadata, tracks, context].join("\n");

  assert.doesNotMatch(combined, /worktree_path/);
  assert.doesNotMatch(combined, /git worktree/i);
  assert.doesNotMatch(combined, /\.pipeline\/explorations/);
});

async function fixtureRoot() {
  const root = await mkdtemp(join(tmpdir(), "hw-deep-plan-package-"));
  await writeConfig(join(root, ".pipeline", "config.yaml"), {
    pipeline: { name: "Deep Plan Package Fixture" },
    output: { language: "zh-CN", timezone: "Asia/Shanghai" },
  });
  await writeFile(join(root, ".pipeline", "state.yaml"), "sentinel: state\n", "utf8");
  await writeFile(join(root, ".pipeline", "cycle.yaml"), "sentinel: cycle\n", "utf8");
  await writeFile(join(root, ".pipeline", "rules.yaml"), "sentinel: rules\n", "utf8");
  return root;
}

async function createExistingPackage(root, directory) {
  const packageDir = join(root, ".pipeline", "deep-plans", directory);
  await writeConfig(join(packageDir, "deep-plan.yaml"), {
    deep_plan: {
      id: "DP001",
      title: "Existing plan",
      status: "drafting",
      package_path: `.pipeline/deep-plans/${directory}`,
    },
  });
}

async function protectedSnapshot(root) {
  return {
    state: await readFile(join(root, ".pipeline", "state.yaml"), "utf8"),
    cycle: await readFile(join(root, ".pipeline", "cycle.yaml"), "utf8"),
    rules: await readFile(join(root, ".pipeline", "rules.yaml"), "utf8"),
  };
}
