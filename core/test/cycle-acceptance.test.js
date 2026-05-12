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

const DONE = Object.freeze({
  requested: "requested",
  started: "started",
  status: "completed",
  closed: "closed",
});

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
  await writeConfig(join(root, ".pipeline", "config.yaml"), {
    acceptance: { mode: "manual", require_user_confirm: true },
    execution: { worker_separation: { mode: "off" } },
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
  await writeConfig(join(root, ".pipeline", "config.yaml"), {
    acceptance: { mode: "manual", require_user_confirm: true },
    execution: { worker_separation: { mode: "off" } },
  });
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

test("accept clears stale completed continuation when no follow-up remains runnable", async () => {
  const root = await fixtureRoot();
  await writeConfig(join(root, ".pipeline", "config.yaml"), {
    acceptance: { mode: "manual", require_user_confirm: true },
    execution: { worker_separation: { mode: "off" } },
  });
  await writeConfig(join(root, ".pipeline", "cycle.yaml"), {
    cycle: {
      number: 8,
      name: "Completed Continuation Demo",
      type: "feature",
      status: "pending_acceptance",
      started: "2026-05-02T18:24:36+08:00",
      preset: "tdd",
      lifecycle_policy: {
        accept: { next: "follow_up_plan" },
      },
      continuations: [
        {
          id: "C8-follow-up",
          kind: "follow_up_plan",
          status: "completed",
          title: "Already completed follow-up",
        },
      ],
      acceptance: { mode: "manual", state: "pending" },
    },
  });
  await writeConfig(join(root, ".pipeline", "state.yaml"), {
    pipeline: { name: "Completed Continuation Demo", status: "pending_acceptance", prompts_total: 1, prompts_completed: 1 },
    current: { phase: "pending_acceptance", prompt_name: "M01 / Demo", step: null },
    acceptance: { scope: "cycle", state: "pending", cycle_id: "C8" },
    continuation: {
      id: "C8-follow-up",
      kind: "follow_up_plan",
      status: "completed",
      title: "Already completed follow-up",
    },
  });

  const accepted = await acceptCycle(root, {
    now: "2026-05-03T00:14:00+08:00",
  });
  assert.equal(accepted.cycle.cycle.status, "completed");
  assert.equal(accepted.state.current.phase, "completed");
  assert.equal("continuation" in accepted.state, false);

  const model = await buildOpenCodeStatusModel(root);
  assert.equal(model.lifecycle.phase, "completed");
  assert.equal(model.lifecycle.next_action, "none");
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
        {
          role: "implement",
          worker_id: "impl-1",
          lifecycle: DONE,
          prompt_scope: ["core/src/**"],
          changed_files: ["core/src/acceptance/index.js"],
        },
        {
          role: "test",
          worker_id: "test-1",
          lifecycle: DONE,
          prompt_scope: ["core/test/**"],
          changed_files: ["core/test/cycle-acceptance.test.js"],
        },
      ],
    }),
    /acceptance blocked by worker separation policy/i,
  );
});

test("recommended mode still blocks acceptance when implement and test collapse without unavailability evidence", async () => {
  const root = await fixtureRoot();
  await writeConfig(join(root, ".pipeline", "config.yaml"), {
    acceptance: { mode: "manual", require_user_confirm: true },
    execution: {
      worker_separation: {
        mode: "recommended",
        authorization: {
          status: "authorized",
          scope: ["/hw:start", "/hw:resume"],
        },
      },
    },
  });
  await writeConfig(join(root, ".pipeline", "cycle.yaml"), {
    cycle: {
      number: 6,
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
    prompt_state: {
      steps: [
        { name: "implement", executor: "self", notes: "implemented locally" },
        { name: "review_tests", executor: "self", notes: "validated locally" },
      ],
    },
    acceptance: { scope: "cycle", state: "pending", cycle_id: "C6" },
  });

  await assert.rejects(
    acceptCycle(root, {
      now: "2026-05-03T00:14:00+08:00",
    }),
    /acceptance blocked by worker separation policy/i,
  );
});

test("recommended mode may degrade audit while still requiring implement-test separation", async () => {
  const root = await fixtureRoot();
  await writeConfig(join(root, ".pipeline", "config.yaml"), {
    acceptance: { mode: "manual", require_user_confirm: true },
    execution: {
      worker_separation: {
        mode: "recommended",
        authorization: {
          status: "authorized",
          scope: ["/hw:start", "/hw:resume"],
        },
      },
    },
  });
  await writeConfig(join(root, ".pipeline", "cycle.yaml"), {
    cycle: {
      number: 7,
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
    runtime_workers: {
      workers: [
        {
          role: "implement",
          worker_id: "impl-1",
          lifecycle: DONE,
          prompt_scope: ["core/src/**"],
          changed_files: ["core/src/acceptance/index.js"],
        },
        {
          role: "test",
          worker_id: "test-1",
          lifecycle: DONE,
          prompt_scope: ["core/test/**"],
          changed_files: ["core/test/cycle-acceptance.test.js"],
        },
      ],
      role_availability: {
        audit: { status: "unavailable", reason: "tool_unavailable" },
      },
    },
    acceptance: { scope: "cycle", state: "pending", cycle_id: "C7" },
  });

  const accepted = await acceptCycle(root, {
    now: "2026-05-03T00:14:00+08:00",
  });
  assert.equal(accepted.state.pipeline.status, "completed");
});

test("recommended mode blocks audit degradation without explicit unavailability evidence", async () => {
  const root = await fixtureRoot();
  await writeConfig(join(root, ".pipeline", "config.yaml"), {
    acceptance: { mode: "manual", require_user_confirm: true },
    execution: {
      worker_separation: {
        mode: "recommended",
      },
    },
  });
  await writeConfig(join(root, ".pipeline", "cycle.yaml"), {
    cycle: {
      number: 9,
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
    prompt_state: {
      steps: [
        { name: "implement", executor: "self", notes: "implemented locally" },
        { name: "review_tests", executor: "subagent", subagent_tool: "codex", subagent_result: { verdict: "pass" } },
      ],
    },
    acceptance: { scope: "cycle", state: "pending", cycle_id: "C9" },
  });

  await assert.rejects(
    acceptCycle(root, {
      now: "2026-05-03T00:14:00+08:00",
    }),
    /acceptance blocked by worker separation policy/i,
  );
});

test("acceptance prefers persisted runtime worker mirror when present", async () => {
  const root = await fixtureRoot();
  await writeConfig(join(root, ".pipeline", "config.yaml"), {
    acceptance: { mode: "manual", require_user_confirm: true },
    execution: {
      worker_separation: {
        mode: "recommended",
      },
    },
  });
  await writeConfig(join(root, ".pipeline", "cycle.yaml"), {
    cycle: {
      number: 8,
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
    runtime_workers: {
      workers: [
        { role: "implement", worker_id: "impl-1", lifecycle: DONE },
        { role: "test", worker_id: "impl-1", lifecycle: DONE },
      ],
      role_availability: {},
      updated_at: "2026-05-07T10:00:00+08:00",
    },
    acceptance: { scope: "cycle", state: "pending", cycle_id: "C8" },
  });

  await assert.rejects(
    acceptCycle(root, {
      now: "2026-05-03T00:14:00+08:00",
    }),
    /acceptance blocked by worker separation policy/i,
  );
});

test("acceptance does not satisfy worker separation with Codex internal subtask observations", async () => {
  const root = await fixtureRoot();
  await writeConfig(join(root, ".pipeline", "config.yaml"), {
    acceptance: { mode: "manual", require_user_confirm: true },
    execution: {
      worker_separation: {
        mode: "recommended",
      },
    },
  });
  await writeConfig(join(root, ".pipeline", "cycle.yaml"), {
    cycle: {
      number: 10,
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
    runtime_workers: {
      workers: [
        { role: "implement", worker_id: "self", lifecycle: DONE },
        {
          role: "test",
          worker_id: "codex-subtask-1",
          lifecycle: DONE,
          source: "opencode_active_subtask",
          evidence_scope: "runtime_observation",
        },
        {
          role: "audit",
          worker_id: "codex-subtask-2",
          lifecycle: DONE,
          source: "codex_internal_subtask",
          evidence_scope: "runtime_observation",
        },
      ],
      role_availability: {},
      updated_at: "2026-05-07T10:00:00+08:00",
    },
    acceptance: { scope: "cycle", state: "pending", cycle_id: "C10" },
  });

  await assert.rejects(
    acceptCycle(root, {
      now: "2026-05-03T00:14:00+08:00",
    }),
    /acceptance blocked by worker separation policy/i,
  );
});

test("recommended mode blocks acceptance when no worker evidence exists", async () => {
  const root = await fixtureRoot();
  await writeConfig(join(root, ".pipeline", "config.yaml"), {
    acceptance: { mode: "manual", require_user_confirm: true },
    execution: { worker_separation: { mode: "recommended" } },
  });
  await writeConfig(join(root, ".pipeline", "cycle.yaml"), {
    cycle: {
      number: 11,
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
    acceptance: { scope: "cycle", state: "pending", cycle_id: "C11" },
  });

  await assert.rejects(
    acceptCycle(root, { now: "2026-05-03T00:14:00+08:00" }),
    /missing roles/i,
  );
});

test("acceptance blocks failed or close_failed worker lifecycle evidence", async () => {
  const root = await fixtureRoot();
  await writeConfig(join(root, ".pipeline", "config.yaml"), {
    acceptance: { mode: "manual", require_user_confirm: true },
    execution: { worker_separation: { mode: "strict" } },
  });
  await writeConfig(join(root, ".pipeline", "cycle.yaml"), {
    cycle: {
      number: 12,
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
    runtime_workers: {
      workers: [
        { role: "implement", worker_id: "impl-1", lifecycle: DONE },
        {
          role: "test",
          worker_id: "test-1",
          lifecycle: { requested: "requested", started: "started", status: "failed", closed: "close_failed" },
        },
        { role: "audit", worker_id: "audit-1", lifecycle: DONE },
      ],
    },
    acceptance: { scope: "cycle", state: "pending", cycle_id: "C12" },
  });

  await assert.rejects(
    acceptCycle(root, { now: "2026-05-03T00:14:00+08:00" }),
    /worker lifecycle blocked/i,
  );
});

test("acceptance blocks worker authorization waiting for start resume scope", async () => {
  const root = await fixtureRoot();
  await writeConfig(join(root, ".pipeline", "config.yaml"), {
    acceptance: { mode: "manual", require_user_confirm: true },
    execution: {
      worker_separation: {
        mode: "recommended",
        authorization: { status: "blocked_until_authorized" },
      },
    },
  });
  await writeConfig(join(root, ".pipeline", "cycle.yaml"), {
    cycle: {
      number: 13,
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
    runtime_workers: {
      workers: [
        { role: "implement", worker_id: "impl-1", lifecycle: DONE },
        { role: "test", worker_id: "test-1", lifecycle: DONE },
        { role: "audit", worker_id: "audit-1", lifecycle: DONE },
      ],
    },
    acceptance: { scope: "cycle", state: "pending", cycle_id: "C13" },
  });

  await assert.rejects(
    acceptCycle(root, { now: "2026-05-03T00:14:00+08:00" }),
    /authorization blocked/i,
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
