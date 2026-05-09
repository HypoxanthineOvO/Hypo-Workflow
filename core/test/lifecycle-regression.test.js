import test from "node:test";
import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  acceptCycle,
  assessExecutionLease,
  buildExecutionLease,
  buildOpenCodeStatusModel,
  checkDerivedArtifacts,
  parseYaml,
  rejectCycle,
  repairDerivedArtifacts,
  resolveCycleWorkflow,
  resolvePlatformHandoff,
  writeConfig,
} from "../src/index.js";

test("lifecycle regression: stale lease takeover and heartbeat timeout resume evidence", async () => {
  const root = await fixtureRoot("hw-lifecycle-regression-lease-");
  const lease = buildExecutionLease({
    platform: "opencode",
    session_id: "old-session",
    owner: "opencode",
    command: "/hw:resume",
    phase: "executing",
    heartbeat_at: "2026-05-03T10:00:00+08:00",
    expires_at: "2026-05-03T10:01:00+08:00",
    cycle_id: "C12",
    workflow_kind: "build",
  });
  await writeConfig(join(root, ".pipeline", ".lock"), lease);

  const result = assessExecutionLease(lease, {
    now: "2026-05-03T10:05:00+08:00",
    requester: { platform: "codex", session_id: "new-session", owner: "codex" },
  });

  assert.equal(result.action, "takeover");
  assert.equal(result.recovery_signal, "inferred_stall");
  assert.equal(result.log_event.type, "lease_takeover");

  const model = await buildOpenCodeStatusModel(root, {
    now: "2026-05-03T10:05:00+08:00",
  });
  assert.equal(model.lease.action, "takeover_available");
  assert.equal(model.lease.reason, "expired_lease");
});

test("lifecycle regression: compact context still resumes from state authority", async () => {
  const root = await fixtureRoot("hw-lifecycle-regression-compact-");
  await writeFile(join(root, ".pipeline", "state.compact.yaml"), [
    "pipeline:",
    "  status: stale_compact",
    "current:",
    "  phase: blocked",
    "  step: old_step",
    "",
  ].join("\n"), "utf8");

  const model = await buildOpenCodeStatusModel(root);

  assert.equal(model.pipeline.status, "running");
  assert.equal(model.current.step, "write_tests");
  assert.equal(model.lifecycle.phase, "executing");
});

test("lifecycle regression: Codex to OpenCode handoff keeps stricter boundaries", () => {
  const result = resolvePlatformHandoff({
    from: {
      platform: "codex",
      permissions: "ask",
      auto_continue: false,
      network: "ask",
      destructive: "deny",
    },
    to: {
      platform: "opencode",
      permissions: "allow-safe",
      auto_continue: true,
      network: "allow",
      destructive: "allow",
    },
    confirmed: true,
  });

  assert.equal(result.allowed, true);
  assert.deepEqual(result.effective_boundaries, {
    permissions: "ask",
    auto_continue: false,
    network: "ask",
    destructive: "deny",
  });
  assert.ok(result.warnings.length >= 3);
});

test("lifecycle regression: reject and accept continuation paths stay observable", async () => {
  const rejectRoot = await acceptanceRoot("hw-lifecycle-regression-reject-", {
    number: 13,
    status: "pending_acceptance",
    acceptance: { mode: "manual", state: "pending" },
    lifecycle_policy: { reject: { default_action: "needs_revision" } },
  });
  const rejected = await rejectCycle(rejectRoot, {
    feedback: "Needs a revision fixture.",
    now: "2026-05-03T11:00:00+08:00",
  });
  assert.equal(rejected.state.current.phase, "needs_revision");
  assert.equal((await buildOpenCodeStatusModel(rejectRoot)).lifecycle.next_action, "resume_revision");

  const acceptRoot = await acceptanceRoot("hw-lifecycle-regression-accept-", {
    number: 14,
    status: "pending_acceptance",
    acceptance: { mode: "manual", state: "pending" },
    lifecycle_policy: { accept: { next: "follow_up_plan" } },
    continuations: [
      { id: "C14-follow-up", kind: "follow_up_plan", status: "planned", title: "Next build cycle" },
    ],
  });
  const accepted = await acceptCycle(acceptRoot, {
    now: "2026-05-03T11:05:00+08:00",
  });
  assert.equal(accepted.state.current.phase, "follow_up_planning");
  assert.equal((await buildOpenCodeStatusModel(acceptRoot)).lifecycle.next_action, "start_follow_up_plan");
});

test("lifecycle regression: sync derived repair refreshes stale artifacts without authority writes", async () => {
  const root = await fixtureRoot("hw-lifecycle-regression-sync-");
  const stateBefore = await readFile(join(root, ".pipeline", "state.yaml"), "utf8");
  await writeFile(join(root, ".pipeline", "PROGRESS.compact.md"), "stale\n", "utf8");
  await sleepForMtime();
  await writeFile(join(root, ".pipeline", "PROGRESS.md"), "# Progress\n\nfresh lifecycle regression\n", "utf8");

  const health = await checkDerivedArtifacts(root);
  assert.ok(health.artifacts.some((artifact) => artifact.id === "progress_compact" && artifact.status === "stale"));

  const repair = await repairDerivedArtifacts(root, { now: "2026-05-03T11:10:00+08:00" });
  assert.ok(repair.refreshed.includes(".pipeline/PROGRESS.compact.md"));
  assert.match(await readFile(join(root, ".pipeline", "PROGRESS.compact.md"), "utf8"), /fresh lifecycle regression/);
  assert.equal(await readFile(join(root, ".pipeline", "state.yaml"), "utf8"), stateBefore);
});

test("lifecycle regression: workflow_kind analysis and build artifacts remain consistent", () => {
  const analysis = resolveCycleWorkflow({
    cycle: { workflow_kind: "analysis", analysis_kind: "repo_system" },
    config: { execution: { steps: { preset: "tdd" } } },
  });
  assert.equal(analysis.workflow_kind, "analysis");
  assert.equal(analysis.preset, "analysis");
  assert.equal(analysis.analysis_kind, "repo_system");

  const build = resolveCycleWorkflow({
    feature: { workflow_kind: "build", analysis_kind: "metric" },
    config: { execution: { steps: { preset: "analysis" } } },
  });
  assert.equal(build.workflow_kind, "build");
  assert.equal(build.preset, "tdd");
  assert.equal(build.analysis_kind, null);
});

async function fixtureRoot(prefix) {
  const root = await mkdtemp(join(tmpdir(), prefix));
  await mkdir(join(root, ".pipeline"), { recursive: true });
  await writeConfig(join(root, ".pipeline", "config.yaml"), {
    pipeline: { name: "Lifecycle Regression", source: "local", output: "local" },
    platform: "codex",
    execution: { mode: "self", steps: { preset: "tdd" } },
    evaluation: { auto_continue: true, max_diff_score: 3 },
  });
  await writeConfig(join(root, ".pipeline", "state.yaml"), {
    pipeline: { name: "Lifecycle Regression", status: "running", prompts_total: 2, prompts_completed: 1 },
    last_heartbeat: "2026-05-03T10:00:00+08:00",
    current: { phase: "executing", prompt_name: "M02 / F002 - Lifecycle Regression", step: "write_tests", step_index: 0 },
    milestones: [
      { id: "M01", feature_id: "F001", status: "done" },
      { id: "M02", feature_id: "F002", status: "in_progress" },
    ],
    prompt_state: { steps: [{ name: "write_tests", status: "running" }] },
    history: { completed_prompts: [{ prompt_name: "M01", result: "pass" }] },
  });
  await writeConfig(join(root, ".pipeline", "cycle.yaml"), {
    cycle: { number: 12, workflow_kind: "build", status: "active" },
  });
  await writeConfig(join(root, ".pipeline", "rules.yaml"), { extends: "recommended" });
  await writeFile(join(root, ".pipeline", "PROGRESS.md"), "# Progress\n\ninitial\n", "utf8");
  return root;
}

async function acceptanceRoot(prefix, cycle) {
  const root = await mkdtemp(join(tmpdir(), prefix));
  await mkdir(join(root, ".pipeline"), { recursive: true });
  await writeConfig(join(root, ".pipeline", "config.yaml"), {
    execution: { worker_separation: { mode: "off" } },
  });
  await writeConfig(join(root, ".pipeline", "cycle.yaml"), { cycle });
  await writeConfig(join(root, ".pipeline", "state.yaml"), {
    pipeline: { name: "Acceptance Regression", status: "pending_acceptance", prompts_total: 1, prompts_completed: 1 },
    current: { phase: "pending_acceptance", prompt_name: "M01 / Acceptance", step: null },
    prompt_state: { result: "pass", steps: [{ name: "review_code", status: "done" }] },
    acceptance: { scope: "cycle", state: "pending", cycle_id: `C${cycle.number}` },
    history: { completed_prompts: [{ prompt_name: "M01", result: "pass" }] },
  });
  await writeFile(join(root, ".pipeline", "PROGRESS.md"), "# Progress\n\ninitial\n", "utf8");
  return root;
}

async function sleepForMtime() {
  await new Promise((resolve) => setTimeout(resolve, 20));
}
