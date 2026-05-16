import test from "node:test";
import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  acceptCycle,
  commitWorkflowUpdate,
  parseYaml,
  rejectCycle,
  writeConfig,
} from "../src/index.js";

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

test("workflow commit helper contract is documented for lifecycle commands", async () => {
  const stateContract = await readFile("references/state-contract.md", "utf8");
  const commandsSpec = await readFile("references/commands-spec.md", "utf8");
  const acceptSkill = await readFile("skills/accept/SKILL.md", "utf8");
  const rejectSkill = await readFile("skills/reject/SKILL.md", "utf8");
  const startSkill = await readFile("skills/start/SKILL.md", "utf8");
  const resumeSkill = await readFile("skills/resume/SKILL.md", "utf8");
  const planGenerateSkill = await readFile("skills/plan-generate/SKILL.md", "utf8");

  assert.match(stateContract, /workflow commit helper/);
  assert.match(stateContract, /derived-refresh.yaml/);
  assert.match(commandsSpec, /Lifecycle-mutating commands must use the workflow commit helper/);
  assert.match(acceptSkill, /workflow commit helper|工作流提交助手/);
  assert.match(rejectSkill, /workflow commit helper|工作流提交助手/);
  assert.match(startSkill, /workflow commit helper|工作流提交助手/);
  assert.match(resumeSkill, /workflow commit helper|工作流提交助手/);
  assert.match(planGenerateSkill, /workflow commit helper|工作流提交助手/);
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
