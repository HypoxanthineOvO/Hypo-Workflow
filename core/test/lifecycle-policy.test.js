import test from "node:test";
import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  acceptCycle,
  buildOpenCodeStatusModel,
  deriveWorkflowPreset,
  parseYaml,
  rejectCycle,
  resolveCycleLifecyclePolicy,
  resolveCycleStatusPhase,
  resolveCycleWorkflow,
  writeConfig,
} from "../src/index.js";

test("workflow kind is cycle-scoped and derives preset/lifecycle defaults", () => {
  const analysis = resolveCycleWorkflow({
    cycle: { workflow_kind: "analysis", analysis_kind: "repo-system", type: "feature" },
    config: { execution: { steps: { preset: "tdd" } } },
  });
  assert.equal(analysis.workflow_kind, "analysis");
  assert.equal(analysis.analysis_kind, "repo_system");
  assert.equal(analysis.preset, "analysis");
  assert.equal(analysis.legacy_type, "analysis");
  assert.equal(analysis.source, "cycle.workflow_kind");

  const build = resolveCycleWorkflow({
    config: { default_workflow_kind: "build" },
  });
  assert.equal(build.workflow_kind, "build");
  assert.equal(build.analysis_kind, null);
  assert.equal(build.preset, "tdd");
  assert.equal(build.legacy_type, "feature");
  assert.deepEqual(deriveWorkflowPreset("showcase"), {
    workflow_kind: "showcase",
    preset: "implement-only",
  });

  const policy = resolveCycleLifecyclePolicy({
    workflow_kind: "analysis",
    lifecycle_policy: {
      accept: { next: "follow_up_plan" },
      gates: { acceptance: "manual" },
      continuations: [{ id: "C9-follow-up", kind: "follow_up_plan" }],
    },
  });
  assert.equal(policy.workflow_kind, "analysis");
  assert.equal(policy.reject.default_action, "needs_revision");
  assert.equal(policy.accept.next, "follow_up_plan");
  assert.equal(policy.resume.default_action, "continue_revision");
  assert.equal(policy.gates.acceptance, "manual");
  assert.equal(policy.continuations[0].id, "C9-follow-up");
});

test("rejecting a cycle routes status to needs_revision and preserves feedback_ref", async () => {
  const root = await fixtureRoot();
  await writeConfig(join(root, ".pipeline", "cycle.yaml"), {
    cycle: {
      number: 9,
      name: "Audit Cycle",
      workflow_kind: "analysis",
      analysis_kind: "repo_system",
      type: "analysis",
      status: "pending_acceptance",
      lifecycle_policy: {
        reject: { default_action: "needs_revision" },
      },
      acceptance: { mode: "manual", state: "pending" },
    },
  });
  await writeConfig(join(root, ".pipeline", "state.yaml"), {
    pipeline: { name: "Audit Cycle", status: "pending_acceptance", prompts_total: 1, prompts_completed: 1 },
    current: { phase: "pending_acceptance", prompt_name: "M01 / Audit", step: null, step_index: 5 },
    prompt_state: { result: "pass", steps: [{ name: "conclude", status: "done" }] },
    acceptance: { scope: "cycle", state: "pending", cycle_id: "C9" },
  });

  const rejected = await rejectCycle(root, {
    feedback: "Clarify follow-up plan before closing.",
    now: "2026-05-03T09:00:00+08:00",
  });
  assert.equal(rejected.state.current.phase, "needs_revision");
  assert.equal(rejected.state.current.step, "revise");
  assert.equal(rejected.state.acceptance.feedback_ref, ".pipeline/acceptance/cycle-C9-rejection-20260503T090000+0800.yaml");

  const phase = resolveCycleStatusPhase({
    cycle: rejected.cycle.cycle,
    state: rejected.state,
  });
  assert.equal(phase.phase, "needs_revision");
  assert.equal(phase.next_action, "resume_revision");
  assert.equal(phase.feedback_ref, rejected.state.acceptance.feedback_ref);

  const model = await buildOpenCodeStatusModel(root);
  assert.equal(model.lifecycle.phase, "needs_revision");
  assert.equal(model.lifecycle.next_action, "resume_revision");
  assert.equal(model.current.phase, "needs_revision");
  assert.match(model.footer.text, /phase:needs_revision/);
});

test("accepting a cycle with a planned continuation routes to follow_up_planning", async () => {
  const root = await fixtureRoot();
  await writeConfig(join(root, ".pipeline", "cycle.yaml"), {
    cycle: {
      number: 10,
      name: "Audit With Follow-up",
      workflow_kind: "analysis",
      analysis_kind: "repo_system",
      type: "analysis",
      status: "pending_acceptance",
      lifecycle_policy: {
        accept: { next: "follow_up_plan" },
      },
      continuations: [
        {
          id: "C10-follow-up",
          kind: "follow_up_plan",
          title: "Plan build follow-up",
          status: "planned",
          prompt_ref: ".pipeline/plan-continuations/C10-follow-up.yaml",
        },
      ],
      acceptance: { mode: "manual", state: "pending" },
    },
  });
  await writeConfig(join(root, ".pipeline", "state.yaml"), {
    pipeline: { name: "Audit With Follow-up", status: "pending_acceptance", prompts_total: 1, prompts_completed: 1 },
    current: { phase: "pending_acceptance", prompt_name: "M01 / Audit", step: null },
    acceptance: { scope: "cycle", state: "pending", cycle_id: "C10" },
  });

  const accepted = await acceptCycle(root, {
    now: "2026-05-03T10:00:00+08:00",
  });
  assert.equal(accepted.cycle.cycle.status, "follow_up_planning");
  assert.equal(accepted.cycle.cycle.continuations[0].status, "active");
  assert.equal(accepted.state.pipeline.status, "stopped");
  assert.equal(accepted.state.current.phase, "follow_up_planning");
  assert.equal(accepted.state.continuation.id, "C10-follow-up");

  const model = await buildOpenCodeStatusModel(root);
  assert.equal(model.lifecycle.phase, "follow_up_planning");
  assert.equal(model.lifecycle.next_action, "start_follow_up_plan");
  assert.equal(model.lifecycle.continuation.id, "C10-follow-up");
  assert.match(model.sidebar.sections.find((section) => section.title === "Current").items.join("\n"), /Next: start_follow_up_plan/);
});

test("completed follow-up continuation does not override pending acceptance phase", async () => {
  const root = await fixtureRoot();
  await writeConfig(join(root, ".pipeline", "cycle.yaml"), {
    cycle: {
      number: 11,
      name: "Completed Follow-up",
      workflow_kind: "build",
      type: "feature",
      status: "pending_acceptance",
      lifecycle_policy: {
        accept: { next: "follow_up_plan" },
      },
      continuations: [
        {
          id: "C11-follow-up",
          kind: "follow_up_plan",
          title: "Completed follow-up",
          status: "completed",
        },
      ],
      acceptance: { mode: "manual", state: "pending" },
    },
  });
  await writeConfig(join(root, ".pipeline", "state.yaml"), {
    pipeline: { name: "Completed Follow-up", status: "pending_acceptance", prompts_total: 1, prompts_completed: 1 },
    current: { phase: "pending_acceptance", prompt_name: "M01 / Follow-up", step: null },
    acceptance: { scope: "cycle", state: "pending", cycle_id: "C11" },
    continuation: {
      id: "C11-follow-up",
      kind: "follow_up_plan",
      status: "completed",
      title: "Completed follow-up",
    },
  });

  const phase = resolveCycleStatusPhase({
    cycle: parseYaml(await readFile(join(root, ".pipeline", "cycle.yaml"), "utf8")).cycle,
    state: parseYaml(await readFile(join(root, ".pipeline", "state.yaml"), "utf8")),
  });
  assert.equal(phase.phase, "pending_acceptance");
  assert.equal(phase.next_action, "accept_or_reject");

  const model = await buildOpenCodeStatusModel(root);
  assert.equal(model.lifecycle.phase, "pending_acceptance");
  assert.equal(model.lifecycle.next_action, "accept_or_reject");
  assert.match(model.footer.text, /phase:pending_acceptance/);
});

test("active execution phase wins over stale accepted acceptance mirrors", async () => {
  const phase = resolveCycleStatusPhase({
    cycle: {
      number: 11,
      status: "active",
      acceptance: { state: "accepted" },
    },
    state: {
      pipeline: { status: "running" },
      current: { phase: "executing", step: "write_tests" },
      acceptance: { state: "accepted" },
    },
  });

  assert.equal(phase.phase, "executing");
  assert.equal(phase.next_action, "continue_execution");
});

test("workflow lifecycle contracts are documented for skills and references", async () => {
  const stateContract = await readFile("references/state-contract.md", "utf8");
  const configSpec = await readFile("references/config-spec.md", "utf8");
  const progressSpec = await readFile("references/progress-spec.md", "utf8");
  const statusSkill = await readFile("skills/status/SKILL.md", "utf8");
  const acceptSkill = await readFile("skills/accept/SKILL.md", "utf8");
  const rejectSkill = await readFile("skills/reject/SKILL.md", "utf8");

  assert.match(stateContract, /workflow_kind/);
  assert.match(stateContract, /lifecycle_policy/);
  assert.match(stateContract, /continuations\[\]/);
  assert.match(configSpec, /Cycle-scoped workflow kind/);
  assert.match(progressSpec, /needs_revision/);
  assert.match(progressSpec, /follow_up_planning/);
  assert.match(statusSkill, /canonical phase|规范阶段/);
  assert.match(statusSkill, /next action|下一步操作/);
  assert.match(acceptSkill, /pending_acceptance/);
  assert.match(acceptSkill, /Cycle Milestones remain verified.*no individual acceptance state/is);
  assert.match(rejectSkill, /needs_revision/);
});

async function fixtureRoot() {
  const root = await mkdtemp(join(tmpdir(), "hw-lifecycle-policy-"));
  await mkdir(join(root, ".pipeline"), { recursive: true });
  await writeConfig(join(root, ".pipeline", "config.yaml"), {
    execution: { worker_separation: { mode: "off" } },
  });
  await writeFile(join(root, ".pipeline", "PROGRESS.md"), "# Demo\n\n## 时间线\n\n| 时间 | 类型 | 事件 | 结果 |\n|---|---|---|---|\n", "utf8");
  return root;
}
