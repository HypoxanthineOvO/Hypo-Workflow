import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  acceptCycle,
  buildOpenCodeStatusModel,
  commandByCanonical,
  markCyclePendingAcceptance,
  rejectCycle,
  writeConfig,
} from "../src/index.js";

test("cycle acceptance lifecycle keeps manual cycles pending before archive", async () => {
  const root = await fixtureRoot();
  await writeConfig(join(root, ".pipeline", "cycle.yaml"), {
    cycle: {
      number: 4,
      name: "Acceptance Demo",
      type: "feature",
      status: "active",
      started: "2026-05-02T18:24:36+08:00",
      preset: "tdd",
    },
  });
  await writeConfig(join(root, ".pipeline", "state.yaml"), {
    pipeline: {
      name: "Acceptance Demo",
      status: "running",
      prompts_total: 3,
      prompts_completed: 3,
    },
    current: { phase: "executing", prompt_name: "M03 / Demo", step: "review_code" },
    milestones: [{ id: "M03", feature_id: "F003", status: "done" }],
  });

  const pending = await markCyclePendingAcceptance(root, {
    mode: "manual",
    now: "2026-05-03T00:10:00+08:00",
  });
  assert.equal(pending.cycle.cycle.status, "pending_acceptance");
  assert.equal(pending.state.pipeline.status, "pending_acceptance");
  assert.equal(pending.state.acceptance.state, "pending");
  assert.equal(pending.state.acceptance.scope, "cycle");
  assert.equal(pending.archived, false);
  assert.match(await readFile(join(root, ".pipeline", "log.yaml"), "utf8"), /cycle_pending_acceptance/);

  const model = await buildOpenCodeStatusModel(root);
  assert.equal(model.cycle.status, "pending_acceptance");
  assert.equal(model.acceptance.state, "pending");
  assert.match(model.footer.text, /acceptance:pending/);
});

test("accept and reject commands update cycle state without storing full feedback in state", async () => {
  const root = await fixtureRoot();
  await writeConfig(join(root, ".pipeline", "cycle.yaml"), {
    cycle: {
      number: 4,
      name: "Acceptance Demo",
      type: "feature",
      status: "pending_acceptance",
      started: "2026-05-02T18:24:36+08:00",
      preset: "tdd",
      acceptance: { mode: "manual", state: "pending" },
    },
  });
  await writeConfig(join(root, ".pipeline", "state.yaml"), {
    pipeline: { name: "Acceptance Demo", status: "pending_acceptance", prompts_total: 1, prompts_completed: 1 },
    current: { phase: "completed", prompt_name: "M01 / Demo", step: null },
    acceptance: { scope: "cycle", state: "pending", cycle_id: "C4" },
  });

  const rejected = await rejectCycle(root, {
    feedback: "Need clearer docs and one more status test.",
    now: "2026-05-03T00:12:00+08:00",
  });
  assert.equal(rejected.cycle.cycle.status, "active");
  assert.equal(rejected.cycle.cycle.acceptance.state, "rejected");
  assert.equal(rejected.state.pipeline.status, "running");
  assert.equal(rejected.state.acceptance.state, "rejected");
  assert.equal(rejected.state.acceptance.feedback_ref, ".pipeline/acceptance/cycle-C4-rejection-20260503T001200+0800.yaml");
  assert.equal("feedback" in rejected.state.acceptance, false);
  assert.match(await readFile(join(root, rejected.state.acceptance.feedback_ref), "utf8"), /Need clearer docs/);

  await markCyclePendingAcceptance(root, { mode: "manual", now: "2026-05-03T00:13:00+08:00" });
  const accepted = await acceptCycle(root, {
    now: "2026-05-03T00:14:00+08:00",
    archive: false,
  });
  assert.equal(accepted.cycle.cycle.status, "completed");
  assert.equal(accepted.cycle.cycle.acceptance.state, "accepted");
  assert.equal(accepted.state.pipeline.status, "completed");
});

test("accept blocks when worker separation policy requires missing audit coverage", async () => {
  const root = await fixtureRoot();
  await writeConfig(join(root, ".pipeline", "config.yaml"), {
    acceptance: { mode: "manual", require_user_confirm: true },
    execution: {
      worker_separation: {
        mode: "strict",
      },
    },
  });
  await writeConfig(join(root, ".pipeline", "cycle.yaml"), {
    cycle: {
      number: 5,
      name: "Acceptance Demo",
      type: "feature",
      status: "pending_acceptance",
      started: "2026-05-02T18:24:36+08:00",
      preset: "tdd",
      acceptance: { mode: "manual", state: "pending" },
    },
  });
  await writeConfig(join(root, ".pipeline", "state.yaml"), {
    pipeline: { name: "Acceptance Demo", status: "pending_acceptance", prompts_total: 1, prompts_completed: 1 },
    current: { phase: "completed", prompt_name: "M01 / Demo", step: null },
    acceptance: { scope: "cycle", state: "pending", cycle_id: "C5" },
  });

  await assert.rejects(
    acceptCycle(root, {
      now: "2026-05-03T00:14:00+08:00",
      workers: [
        { role: "implement", worker_id: "impl-1" },
        { role: "test", worker_id: "test-1" },
      ],
    }),
    /acceptance blocked by worker separation policy/i,
  );
});

test("cycle acceptance command map and docs are exposed", async () => {
  assert.equal(commandByCanonical("/hw:accept").opencode, "/hw-accept");
  assert.equal(commandByCanonical("/hw:reject").opencode, "/hw-reject");
  assert.equal(commandByCanonical("/hw:accept").agent, "hw-build");
  assert.equal(commandByCanonical("/hw:reject").agent, "hw-build");

  const cycleSkill = await readFile("skills/cycle/SKILL.md", "utf8");
  const stateContract = await readFile("references/state-contract.md", "utf8");
  const progressSpec = await readFile("references/progress-spec.md", "utf8");

  assert.match(cycleSkill, /pending_acceptance/);
  assert.match(cycleSkill, /\/hw:accept/);
  assert.match(cycleSkill, /\/hw:reject/);
  assert.match(stateContract, /acceptance:/);
  assert.match(stateContract, /feedback_ref/);
  assert.match(progressSpec, /pending_acceptance/);
  assert.match(progressSpec, /rejected/);
});

async function fixtureRoot() {
  const root = await mkdtemp(join(tmpdir(), "hw-cycle-acceptance-"));
  await writeConfig(join(root, ".pipeline", "config.yaml"), {
    acceptance: { mode: "manual", require_user_confirm: true },
  });
  await writeFile(join(root, ".pipeline", "PROGRESS.md"), "# Demo\n\n## 时间线\n", "utf8");
  return root;
}
