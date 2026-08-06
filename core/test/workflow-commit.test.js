import test from "node:test";
import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import * as CORE from "../src/index.js";
import {
  acceptCycle,
  commitWorkflowUpdate,
  parseYaml,
  rejectCycle,
  writeConfig,
} from "../src/index.js";
import { snapshotTree } from "./fixtures/c21-m2/helpers.js";
import {
  FIXED_NOW,
  LATER_NOW,
  createDeliveryTestStore,
  goalDesignInput,
  issueDeliveryReceipt,
  soloTopologyInput,
  temporaryCurrentWorkspace,
} from "./fixtures/c21-m6/helpers.js";

test("commitWorkflowUpdate atomically writes authority files and derived views", async () => {
  const root = await fixtureRoot("hw-workflow-commit-ok-");
  await writeConfig(join(root, ".pipeline", "cycle.yaml"), {
    cycle: { number: 3, status: "pending_acceptance", acceptance: { state: "pending" } },
  });
  await writeConfig(join(root, ".pipeline", "state.yaml"), {
    pipeline: { status: "pending_acceptance", prompts_total: 1, prompts_completed: 1 },
    current: { phase: "pending_acceptance", step: null },
    acceptance: { state: "pending", cycle_id: "C3" },
  });

  const result = await commitWorkflowUpdate(root, {
    id: "test-accept",
    authority: {
      ".pipeline/cycle.yaml": {
        cycle: { number: 3, status: "completed", acceptance: { state: "accepted" } },
      },
      ".pipeline/state.yaml": {
        pipeline: { status: "completed", prompts_total: 1, prompts_completed: 1 },
        current: { phase: "completed", step: null },
        acceptance: { state: "accepted", cycle_id: "C3" },
      },
    },
    derived: [
      {
        path: ".pipeline/PROGRESS.md",
        refresh: (source) => `${source.trimEnd()}\naccepted row\n`,
      },
    ],
  });

  assert.equal(result.ok, true);
  assert.deepEqual(result.warnings, []);
  assert.match(await readFile(join(root, ".pipeline", "cycle.yaml"), "utf8"), /status: completed/);
  assert.match(await readFile(join(root, ".pipeline", "state.yaml"), "utf8"), /state: accepted/);
  assert.match(await readFile(join(root, ".pipeline", "PROGRESS.md"), "utf8"), /accepted row/);
});

test("commitWorkflowUpdate rejects invalid authority state before writing files", async () => {
  const root = await fixtureRoot("hw-workflow-commit-invalid-");
  await writeConfig(join(root, ".pipeline", "cycle.yaml"), {
    cycle: { number: 8, status: "pending_acceptance", acceptance: { state: "pending" } },
  });
  await writeConfig(join(root, ".pipeline", "state.yaml"), {
    pipeline: { status: "pending_acceptance", prompts_total: 1, prompts_completed: 1 },
    current: { phase: "pending_acceptance", step: null },
    acceptance: { state: "pending", cycle_id: "C8" },
  });
  const beforeCycle = await readFile(join(root, ".pipeline", "cycle.yaml"), "utf8");

  await assert.rejects(
    commitWorkflowUpdate(root, {
      id: "invalid-rejection",
      authority: {
        ".pipeline/cycle.yaml": {
          cycle: { number: 8, status: "active", acceptance: { state: "rejected" } },
        },
        ".pipeline/state.yaml": {
          pipeline: { status: "completed", prompts_total: 1, prompts_completed: 1 },
          current: { phase: "completed", step: null },
          acceptance: { state: "rejected", cycle_id: "C8" },
        },
      },
    }),
    /rejected acceptance requires pipeline.status=running/,
  );
  assert.equal(await readFile(join(root, ".pipeline", "cycle.yaml"), "utf8"), beforeCycle);
});

test("commitWorkflowUpdate keeps authority committed and records derived refresh failure", async () => {
  const root = await fixtureRoot("hw-workflow-commit-derived-");
  await writeConfig(join(root, ".pipeline", "cycle.yaml"), {
    cycle: { number: 9, status: "pending_acceptance", acceptance: { state: "pending" } },
  });
  await writeConfig(join(root, ".pipeline", "state.yaml"), {
    pipeline: { status: "pending_acceptance", prompts_total: 1, prompts_completed: 1 },
    current: { phase: "pending_acceptance", step: null },
    acceptance: { state: "pending", cycle_id: "C9" },
  });

  const result = await commitWorkflowUpdate(root, {
    id: "derived-fails",
    now: "2026-05-03T11:00:00+08:00",
    authority: {
      ".pipeline/cycle.yaml": {
        cycle: { number: 9, status: "completed", acceptance: { state: "accepted" } },
      },
      ".pipeline/state.yaml": {
        pipeline: { status: "completed", prompts_total: 1, prompts_completed: 1 },
        current: { phase: "completed", step: null },
        acceptance: { state: "accepted", cycle_id: "C9" },
      },
    },
    derived: [
      {
        path: ".pipeline/PROGRESS.md",
        refresh: () => {
          throw new Error("progress disk full");
        },
      },
    ],
  });

  assert.equal(result.ok, false);
  assert.equal(result.warnings.length, 1);
  assert.equal(result.warnings[0].path, ".pipeline/PROGRESS.md");
  assert.match(await readFile(join(root, ".pipeline", "cycle.yaml"), "utf8"), /status: completed/);
  const marker = parseYaml(await readFile(join(root, ".pipeline", "derived-refresh.yaml"), "utf8"));
  assert.equal(marker.status, "warning");
  assert.equal(marker.failures[0].path, ".pipeline/PROGRESS.md");
  assert.match(marker.repair_hint, /hw:sync/);
});

test("commitWorkflowUpdate allows revision-phase step pointers outside executing steps", async () => {
  const root = await fixtureRoot("hw-workflow-commit-revision-");
  await writeConfig(join(root, ".pipeline", "cycle.yaml"), {
    cycle: { number: 12, status: "active", acceptance: { state: "rejected", feedback_ref: ".pipeline/acceptance/cycle-C12-rejection.yaml" } },
  });
  await writeConfig(join(root, ".pipeline", "state.yaml"), {
    pipeline: { status: "running", prompts_total: 1, prompts_completed: 1 },
    current: { phase: "needs_revision", step: "revise", step_index: 0 },
    prompt_state: { steps: [{ name: "write_tests", status: "done" }] },
    acceptance: { scope: "cycle", state: "rejected", cycle_id: "C12", feedback_ref: ".pipeline/acceptance/cycle-C12-rejection.yaml" },
  });

  const result = await commitWorkflowUpdate(root, {
    id: "revision-allowed",
    authority: {
      ".pipeline/state.yaml": {
        pipeline: { status: "running", prompts_total: 1, prompts_completed: 1 },
        current: { phase: "needs_revision", step: "revise", step_index: 0 },
        prompt_state: { steps: [{ name: "write_tests", status: "done" }] },
        acceptance: { scope: "cycle", state: "rejected", cycle_id: "C12", feedback_ref: ".pipeline/acceptance/cycle-C12-rejection.yaml" },
      },
      ".pipeline/cycle.yaml": {
        cycle: { number: 12, status: "active", acceptance: { state: "rejected", feedback_ref: ".pipeline/acceptance/cycle-C12-rejection.yaml" } },
      },
    },
  });

  assert.equal(result.ok, true);
});

test("acceptCycle and rejectCycle use workflow commit warnings for derived refresh failures", async () => {
  const root = await fixtureRoot("hw-workflow-commit-acceptance-");
  await writeConfig(join(root, ".pipeline", "config.yaml"), {
    acceptance: { mode: "manual", require_user_confirm: true },
    execution: { worker_separation: { mode: "off" } },
  });
  await writeConfig(join(root, ".pipeline", "cycle.yaml"), {
    cycle: {
      number: 11,
      status: "pending_acceptance",
      acceptance: { mode: "manual", state: "pending" },
    },
  });
  await writeConfig(join(root, ".pipeline", "state.yaml"), {
    pipeline: { status: "pending_acceptance", prompts_total: 1, prompts_completed: 1 },
    current: { phase: "pending_acceptance", step: null },
    acceptance: { scope: "cycle", state: "pending", cycle_id: "C11" },
  });

  const accepted = await acceptCycle(root, {
    now: "2026-05-03T12:00:00+08:00",
    derivedRefreshers: {
      progress: () => {
        throw new Error("progress unavailable");
      },
    },
  });
  assert.equal(accepted.state.pipeline.status, "completed");
  assert.equal(accepted.commit.ok, false);
  assert.equal(accepted.commit.warnings[0].path, ".pipeline/PROGRESS.md");
  assert.match(await readFile(join(root, ".pipeline", "log.yaml"), "utf8"), /cycle_accept/);

  await writeConfig(join(root, ".pipeline", "cycle.yaml"), {
    cycle: {
      number: 11,
      status: "pending_acceptance",
      acceptance: { mode: "manual", state: "pending" },
    },
  });
  await writeConfig(join(root, ".pipeline", "state.yaml"), {
    pipeline: { status: "pending_acceptance", prompts_total: 1, prompts_completed: 1 },
    current: { phase: "pending_acceptance", step: null },
    acceptance: { scope: "cycle", state: "pending", cycle_id: "C11" },
  });

  const rejected = await rejectCycle(root, {
    feedback: "Needs another pass.",
    now: "2026-05-03T12:05:00+08:00",
    derivedRefreshers: {
      progress: () => {
        throw new Error("progress unavailable");
      },
    },
  });
  assert.equal(rejected.state.current.phase, "needs_revision");
  assert.equal(rejected.commit.ok, false);
  assert.equal(rejected.commit.warnings[0].path, ".pipeline/PROGRESS.md");
  assert.match(await readFile(join(root, rejected.feedback_ref), "utf8"), /Needs another pass/);
});

test("legacy commit helper remains documented while current Delivery mutations use the M1 transaction store", async (t) => {
  const stateContract = await readFile("references/state-contract.md", "utf8");
  const commandsSpec = await readFile("references/commands-spec.md", "utf8");
  const goalSkill = await readFile("skills/goal/SKILL.md", "utf8");
  const cycleSkill = await readFile("skills/cycle/SKILL.md", "utf8");
  const acceptSkill = await readFile("skills/accept/SKILL.md", "utf8");
  const rejectSkill = await readFile("skills/reject/SKILL.md", "utf8");
  const resumeSkill = await readFile("skills/resume/SKILL.md", "utf8");

  assert.match(stateContract, /workflow commit helper/);
  assert.match(stateContract, /derived-refresh.yaml/);
  assert.match(commandsSpec, /Lifecycle-mutating commands must use the workflow commit helper/);
  assert.equal(typeof CORE.commitWorkspaceTransaction, "function");
  assert.equal(typeof CORE.createDeliveryStore, "function");

  const root = await temporaryCurrentWorkspace(t, "hw-current-delivery-transaction-");
  const { store, setNow } = createDeliveryTestStore(CORE, FIXED_NOW);
  const proposal = {
    design: CORE.compileGoalDesign(goalDesignInput()),
    topology: CORE.selectExecutionTopology(soloTopologyInput()),
  };

  const beforeMissingId = await snapshotTree(root);
  await assert.rejects(
    store.proposeGoal(root, proposal, {}),
    /transaction|options\.id|identifier|required/i,
  );
  assert.deepEqual(await snapshotTree(root), beforeMissingId, "a current proposal without a transaction id must be zero-write");

  const proposalPhases = [];
  let delivery = await store.proposeGoal(root, proposal, {
    id: "current-goal-proposal",
    faultInjector(event) {
      proposalPhases.push(event.phase);
    },
  });
  assert.equal(delivery.status, "proposed");
  assert.ok(proposalPhases.includes("after_prepare"));
  assert.ok(proposalPhases.includes("before_manifest_activation"));
  assert.ok(proposalPhases.includes("after_manifest_activation"));

  let receipt = await issueDeliveryReceipt(CORE, root, delivery, "delivery.approve", {
    transaction_id: "current-goal-approve-receipt",
    tool_use_id: "current-goal-approve",
  });
  delivery = await store.approve(root, receipt, { id: "current-goal-approve" });
  assert.equal(delivery.status, "waiting_to_start");

  setNow(LATER_NOW);
  receipt = await issueDeliveryReceipt(CORE, root, delivery, "delivery.start", {
    now: LATER_NOW,
    transaction_id: "current-goal-start-receipt",
    tool_use_id: "current-goal-start",
  });
  const beforeMissingStartId = await snapshotTree(root);
  await assert.rejects(
    store.start(root, receipt, {}),
    /transaction|options\.id|identifier|required/i,
  );
  assert.deepEqual(await snapshotTree(root), beforeMissingStartId, "explicit start must reject before reserving its Receipt when id is missing");

  const startPhases = [];
  delivery = await store.start(root, receipt, {
    id: "current-goal-start",
    faultInjector(event) {
      startPhases.push(event.phase);
    },
  });
  assert.equal(delivery.status, "executing");
  assert.ok(startPhases.includes("after_prepare"));
  assert.ok(startPhases.includes("after_manifest_activation"));

  const beforeResume = await snapshotTree(root);
  const resumed = await store.resume(root, {});
  assert.equal(resumed.delivery.status, "executing");
  assert.equal(resumed.recovery.pack_status, "missing");
  assert.deepEqual(await snapshotTree(root), beforeResume, "Resume is a read-only authority reconstruction");

  assert.match(goalSkill, /PLAN\.md/);
  assert.match(goalSkill, /Proposal/);
  assert.match(cycleSkill, /旧格式 Cycle 只读保留/);
  assert.match(acceptSkill, /接受/);
  assert.match(rejectSkill, /拒绝/);
  assert.match(resumeSkill, /不得写回旧/);
});

async function fixtureRoot(prefix) {
  const root = await mkdtemp(join(tmpdir(), prefix));
  await mkdir(join(root, ".pipeline"), { recursive: true });
  await writeFile(join(root, ".pipeline", "PROGRESS.md"), [
    "# Demo",
    "",
    "## 时间线",
    "",
    "| 时间 | 类型 | 事件 | 结果 |",
    "|---|---|---|---|",
    "",
  ].join("\n"), "utf8");
  return root;
}
