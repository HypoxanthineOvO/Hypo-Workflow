import test from "node:test";
import assert from "node:assert/strict";
import { cp, lstat, mkdir, rm, symlink } from "node:fs/promises";
import { join } from "node:path";
import * as ROOT_API from "../src/index.js";
import {
  PLANNING_API_URL,
  REPOSITORY_ROOT,
  goalDesignInput,
  cyclePlanInput,
  importProbe,
  readJson,
} from "./fixtures/c21-m6/helpers.js";
import { temporaryDirectory } from "./fixtures/c21-m4/helpers.js";

const PLANNING_PROBE = await importProbe(PLANNING_API_URL);
const COMMANDS = await import("../src/commands/index.js");
const PLANNING_API = [
  "compileGoalDesign",
  "compilePlan",
  "compileCyclePlan",
  "selectDeliveryMode",
  "selectAdaptivePlan",
  "assessPlanReadiness",
];
const HAS_PLANNING = !PLANNING_PROBE.error
  && PLANNING_API.every((name) => typeof PLANNING_PROBE.api?.[name] === "function");
const HAS_INTENT_ROUTER = typeof COMMANDS.resolveWorkflowIntent === "function";
const planTest = HAS_PLANNING ? test : test.skip;
const routerTest = HAS_INTENT_ROUTER ? test : test.skip;

test("M6 publishes focused adaptive-planning APIs from their module and Core root", () => {
  if (PLANNING_PROBE.error) {
    assert.fail(`core/src/planning/index.js must import cleanly: ${PLANNING_PROBE.error.code || PLANNING_PROBE.error.message}`);
  }
  for (const name of PLANNING_API) {
    assert.equal(typeof PLANNING_PROBE.api[name], "function", `${name} must be exported by planning`);
    assert.equal(typeof ROOT_API[name], "function", `${name} must be exported by Core root`);
  }
});

test("M6 publishes one behavior router for command and natural Workflow intents", () => {
  assert.equal(typeof COMMANDS.resolveWorkflowIntent, "function");
  assert.equal(typeof ROOT_API.resolveWorkflowIntent, "function");
});

planTest("Goal follows full Discussion before generating one Design without fake Milestones", () => {
  for (const input of [
    { delivery_kind: "goal", model_capability: "strong", complexity: "bounded", durable_research: false },
    { delivery_kind: "goal", model_capability: "limited", complexity: "material", durable_research: false },
    { delivery_kind: "goal", model_capability: "limited", complexity: "material", durable_research: true },
  ]) {
    const selected = PLANNING_PROBE.api.selectAdaptivePlan(input);
    assert.equal(selected.mode, "discussion_to_goal");
    assert.deepEqual(selected.internal_phases.slice(-5), [
      "discover",
      "technical_stack",
      "architecture",
      "select_delivery",
      "generate_goal",
    ]);
    assert.equal("milestones" in selected, false);
    assert.equal("min_rounds" in selected, false);
  }
});

planTest("Plan follows Discussion and adds decomposition only after delivery selection", () => {
  const standard = PLANNING_PROBE.api.selectAdaptivePlan({
    delivery_kind: "cycle",
    model_capability: "limited",
    complexity: "material",
    durable_research: false,
  });
  assert.equal(standard.mode, "discussion_to_plan");
  assert.deepEqual(standard.internal_phases, [
    "discover",
    "technical_stack",
    "architecture",
    "select_delivery",
    "decompose",
    "generate_plan",
  ]);
  assert.equal(standard.discoverable_command, null);

  const deep = PLANNING_PROBE.api.selectAdaptivePlan({
    delivery_kind: "cycle",
    model_capability: "strong",
    complexity: "material",
    durable_research: true,
  });
  assert.equal(deep.mode, "discussion_to_plan");
  assert.equal(deep.durable, true);
  assert.ok(deep.internal_phases.includes("deep_plan"));
  assert.equal(deep.discoverable_command, null, "Deep Plan stays internal instead of becoming another public command");
});

planTest("Stone count, not complexity or acceptance count, selects Goal versus Plan", () => {
  assert.deepEqual(PLANNING_PROBE.api.selectDeliveryMode({ stones: [] }), {
    delivery_kind: "goal",
    stone_count: 0,
    reason: "no_manual_intermediate_check",
  });
  assert.deepEqual(PLANNING_PROBE.api.selectDeliveryMode({ stones: [{ id: "S1" }] }), {
    delivery_kind: "plan",
    stone_count: 1,
    reason: "manual_intermediate_check_required",
  });
});

planTest("material ambiguity asks immediately and resolved ambiguity stops without round quotas", () => {
  const unresolved = {
    delivery_kind: "cycle",
    evidence: [{ type: "repository", ref: "README.md", summary: "No deployment target is documented." }],
    ambiguities: [{
      id: "deployment-target",
      prompt: "Which deployment target is required?",
      material: true,
      resolved: false,
      challenge: "Would the target change the storage or release architecture?",
    }],
  };
  const ask = PLANNING_PROBE.api.assessPlanReadiness(unresolved);
  assert.equal(ask.status, "ask");
  assert.deepEqual(ask.unresolved_material, ["deployment-target"]);
  assert.equal(ask.questions.length, 1);
  assert.equal(ask.challenge_questions.length, 1, "Grill Me is absorbed as challenge questions");
  assert.equal("min_rounds" in ask, false);

  const ready = PLANNING_PROBE.api.assessPlanReadiness({
    ...unresolved,
    ambiguities: unresolved.ambiguities.map((item) => ({ ...item, resolved: true })),
  });
  assert.equal(ready.status, "ready");
  assert.deepEqual(ready.questions, []);
  assert.deepEqual(ready.unresolved_material, []);
  assert.equal("min_rounds" in ready, false);
});

planTest("no material ambiguity finishes even at the first assessment and min_rounds is rejected", () => {
  const input = {
    delivery_kind: "goal",
    evidence: [{ type: "user", ref: "turn-1", summary: "Outcome and acceptance command are explicit." }],
    ambiguities: [{
      id: "optional-name",
      prompt: "Should the example use another display name?",
      material: false,
      resolved: false,
      challenge: "This does not change acceptance or architecture.",
    }],
  };
  const result = PLANNING_PROBE.api.assessPlanReadiness(input);
  assert.equal(result.status, "ready");
  assert.deepEqual(result.questions, []);
  assert.throws(
    () => PLANNING_PROBE.api.assessPlanReadiness({ ...input, min_rounds: 3 }),
    /min_rounds|round|field|schema|unsupported/i,
  );
});

planTest("Goal and Cycle compilers are deterministic peer contracts with different shapes", () => {
  const goal = PLANNING_PROBE.api.compileGoalDesign(goalDesignInput());
  const goalAgain = PLANNING_PROBE.api.compileGoalDesign(goalDesignInput());
  assert.deepEqual(goalAgain, goal);
  assert.equal(goal.delivery_kind, "goal");
  assert.equal(goal.status, "draft");
  assert.match(goal.plan_hash, /^[a-f0-9]{64}$/);
  assert.equal("milestones" in goal, false);

  const cycle = PLANNING_PROBE.api.compileCyclePlan(cyclePlanInput());
  assert.equal(cycle.delivery_kind, "cycle");
  assert.equal(cycle.status, "draft");
  assert.deepEqual(cycle.milestones.map((milestone) => milestone.id), ["M1", "M2"]);
  assert.equal(cycle.milestones.some((milestone) => "acceptance" in milestone), false);
  assert.notEqual(cycle.plan_hash, goal.plan_hash);

  assert.throws(
    () => PLANNING_PROBE.api.compilePlan(cyclePlanInput()),
    /at least one Stone|manual inspection/i,
  );
  const plan = PLANNING_PROBE.api.compilePlan(cyclePlanInput({
    milestones: cyclePlanInput().milestones.map((milestone, index) => index === 0 ? {
      ...milestone,
      stone: {
        id: "S1",
        review: "Inspect the storage contract before the API stage begins.",
        acceptance_criteria: ["The persisted item is visible in the review fixture."],
      },
    } : milestone),
  }));
  assert.equal(plan.delivery_mode, "plan");
  assert.equal(plan.milestones.filter((milestone) => milestone.stone).length, 1);

  const revised = PLANNING_PROBE.api.compileGoalDesign(goalDesignInput({
    revision: 1,
    outcome: "A FIFO queue API passes its acceptance command after explicit restart-safe execution.",
  }));
  assert.notEqual(revised.plan_hash, goal.plan_hash);
});

routerTest("objective fixtures route natural and slash inputs to the same authority contracts", async () => {
  const fixtures = await readJson(join(
    REPOSITORY_ROOT,
    "core",
    "test",
    "fixtures",
    "c21-m6",
    "workflow-intents.json",
  ));
  const resolved = [];
  for (const fixture of fixtures) {
    const route = await COMMANDS.resolveWorkflowIntent(fixture.input, {
      ...fixture.context,
      repoRoot: REPOSITORY_ROOT,
    });
    assert.equal(route.status, "available", fixture.name);
    assert.equal(route.canonical, fixture.canonical, fixture.name);
    assert.equal(route.authority_intent, fixture.authority_intent, fixture.name);
    if (fixture.delivery_kind) assert.equal(route.delivery_kind, fixture.delivery_kind, fixture.name);
    if (fixture.discoverable !== undefined) assert.equal(route.discoverable, fixture.discoverable, fixture.name);
    resolved.push({ fixture, route });
  }

  for (const prefix of ["goal", "plan", "explicit-start"]) {
    const pair = resolved.filter(({ fixture }) => fixture.name.startsWith(prefix));
    assert.equal(pair.length, 2);
    assert.deepEqual(
      pair.map(({ route }) => ({ canonical: route.canonical, authority_intent: route.authority_intent })),
      [
        { canonical: pair[0].route.canonical, authority_intent: pair[0].route.authority_intent },
        { canonical: pair[0].route.canonical, authority_intent: pair[0].route.authority_intent },
      ],
    );
  }
});

routerTest("proposal affirmations distinguish start, hold, and continued Discussion", async () => {
  const context = {
    workspace: "current",
    active_delivery: { status: "proposed" },
    skillRoot: REPOSITORY_ROOT,
  };
  for (const reply of ["确认", "合理的", "方案确认了，开始做吧"]) {
    const start = await COMMANDS.resolveWorkflowIntent(reply, context);
    assert.equal(start.authority_intent, "delivery.approve_and_start", reply);
  }

  const hold = await COMMANDS.resolveWorkflowIntent("确认但不开始", context);
  assert.equal(hold.authority_intent, "delivery.approve");

  const discuss = await COMMANDS.resolveWorkflowIntent("不确认，继续讨论", context);
  assert.equal(discuss.authority_intent, "workflow.continue_discussion");
  assert.deepEqual(discuss.writes, []);
});

routerTest("target workspace repoRoot never substitutes for the trusted Skill backend root", async (t) => {
  const targetRoot = await temporaryDirectory(t, "hw-m6-intent-target-");
  const context = {
    repoRoot: targetRoot,
    workspace: "current",
    active_delivery: null,
  };

  const withDefaultSkillRoot = await COMMANDS.resolveWorkflowIntent("/hw:goal 构建可验收的队列 API", context);
  assert.equal(withDefaultSkillRoot.status, "available");
  assert.equal(withDefaultSkillRoot.authority_intent, "delivery.propose_goal");

  const withExplicitSkillRoot = await COMMANDS.resolveWorkflowIntent("/hw:goal 构建可验收的队列 API", {
    ...context,
    skillRoot: REPOSITORY_ROOT,
  });
  assert.equal(withExplicitSkillRoot.status, "available");
  assert.equal(withExplicitSkillRoot.canonical, "/hw:goal");

  const missingBackend = await COMMANDS.resolveWorkflowIntent("/hw:goal 构建可验收的队列 API", {
    ...context,
    skillRoot: targetRoot,
  });
  assert.equal(missingBackend.status, "unavailable");
  assert.deepEqual(missingBackend.writes, []);
});

test("runtime discovery is exactly the ten public/contextual commands with real Skill backends", async () => {
  const expected = [
    "/hw:accept",
    "/hw:cycle",
    "/hw:experiment",
    "/hw:goal",
    "/hw:guide",
    "/hw:init",
    "/hw:maintain",
    "/hw:plan",
    "/hw:reject",
    "/hw:resume",
  ];
  const discovered = await COMMANDS.discoverableCommandMap("codex", { repoRoot: REPOSITORY_ROOT });
  assert.deepEqual(discovered.map((command) => command.canonical).sort(), expected);
  for (const command of discovered) {
    assert.ok(["public", "contextual"].includes(command.exposure));
    assert.equal(command.availability, "available");
    const stats = await lstat(join(REPOSITORY_ROOT, command.skill));
    assert.equal(stats.isFile(), true, command.skill);
    assert.equal(stats.isSymbolicLink(), false, command.skill);
  }
  assert.equal(discovered.some((command) => [
    "/hw:start", "/hw:status", "/hw:report", "/hw:analysis", "/hw:audit",
    "/hw:setup", "/hw:rules", "/hw:stop", "/hw:showcase",
  ].includes(command.canonical)), false);
});

test("backend discovery fails closed when one of the ten Skill entries is missing or symlinked", async (t) => {
  const required = ["guide", "init", "goal", "plan", "cycle", "experiment", "maintain", "resume", "accept", "reject"];
  const missing = [];
  for (const name of required) {
    try {
      const stats = await lstat(join(REPOSITORY_ROOT, "skills", name, "SKILL.md"));
      if (!stats.isFile() || stats.isSymbolicLink()) missing.push(name);
    } catch {
      missing.push(name);
    }
  }
  if (missing.length) {
    assert.fail(`the ten-command backend inventory is incomplete: ${missing.join(", ")}`);
  }

  const bundle = await temporaryDirectory(t, "hw-m6-skill-router-");
  await cp(join(REPOSITORY_ROOT, "SKILL.md"), join(bundle, "SKILL.md"));
  for (const name of required) {
    await mkdir(join(bundle, "skills", name), { recursive: true });
    await cp(
      join(REPOSITORY_ROOT, "skills", name, "SKILL.md"),
      join(bundle, "skills", name, "SKILL.md"),
    );
  }
  await rm(join(bundle, "skills", "goal", "SKILL.md"));
  let discovered = await COMMANDS.discoverableCommandMap("codex", { repoRoot: bundle });
  assert.equal(discovered.some((command) => command.canonical === "/hw:goal"), false);
  assert.deepEqual(
    discovered.map((command) => command.canonical).sort(),
    ["/hw:accept", "/hw:cycle", "/hw:experiment", "/hw:guide", "/hw:init", "/hw:maintain", "/hw:plan", "/hw:reject", "/hw:resume"],
  );

  await symlink(join(REPOSITORY_ROOT, "skills", "goal", "SKILL.md"), join(bundle, "skills", "goal", "SKILL.md"));
  discovered = await COMMANDS.discoverableCommandMap("codex", { repoRoot: bundle });
  assert.equal(discovered.some((command) => command.canonical === "/hw:goal"), false);
});
