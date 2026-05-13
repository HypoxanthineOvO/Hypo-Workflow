import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import * as api from "../src/index.js";

test("Deep Plan convert emits an ordered Feature Queue draft with risks, unknowns, tests, and acceptance depth", async () => {
  const root = await fixtureRoot();
  const converted = await convertFixture(root, {
    ordered_feature_queue: [
      {
        id: "FQ-auth",
        title: "Auth handoff",
        priority: 20,
        readiness_depth: "implementation-ready",
        acceptance_depth: ["A-auth"],
        test_matrix: ["TM-auth"],
        risks: ["R-auth"],
      },
      {
        id: "FQ-audit",
        title: "Audit handoff",
        priority: 10,
        readiness_depth: "implementation-ready",
        acceptance_depth: ["A-audit"],
        test_matrix: ["TM-audit"],
        risks: ["R-audit"],
      },
    ],
    risks: [
      { id: "R-auth", statement: "Auth handoff can lose required validation context." },
      { id: "R-audit", statement: "Audit handoff can lose evidence ownership." },
    ],
    test_matrix: [
      { id: "TM-auth", target: "auth queue draft", command: "node --test core/test/deep-plan-handoff.test.js" },
      { id: "TM-audit", target: "audit queue draft", command: "node --test core/test/deep-plan-handoff.test.js" },
    ],
    acceptance_depth: [
      { id: "A-auth", criterion: "Auth feature carries implementation-ready acceptance detail.", depth: "implementation-ready" },
      { id: "A-audit", criterion: "Audit feature carries implementation-ready acceptance detail.", depth: "implementation-ready" },
    ],
    unresolved_items: [
      { id: "U-auth", item: "Confirm production adapter writes this draft after explicit Plan confirmation." },
    ],
  });

  assert.equal(converted.allowed, true);
  assert.ok(converted.feature_queue_draft, "conversion must return a structured Feature Queue draft");
  assert.deepEqual(
    converted.feature_queue_draft.features.map((feature) => feature.id),
    ["FQ-auth", "FQ-audit"],
    "Feature Queue draft must preserve ordered_feature_queue execution order",
  );

  const auth = converted.feature_queue_draft.features.find((feature) => feature.id === "FQ-auth");
  assert.equal(auth.status, "queued");
  assert.equal(auth.source, "deep-plan-convert");
  assert.equal(auth.readiness_depth, "implementation-ready");
  assert.equal(converted.feature_queue_draft.current_feature, null);
  assert.deepEqual(auth.acceptance_depth.map((item) => item.id), ["A-auth"]);
  assert.deepEqual(auth.test_matrix.map((item) => item.id), ["TM-auth"]);
  assert.deepEqual(auth.risks.map((item) => item.id), ["R-auth"]);
  assert.deepEqual(converted.feature_queue_draft.unknowns.map((item) => item.id), ["U-auth"]);
});

test("Deep Plan handoff inherits global artifacts when a ready Feature omits explicit artifact refs", async () => {
  const root = await fixtureRoot();
  const converted = await convertFixture(root, {
    ordered_feature_queue: [
      {
        id: "FQ-inherit",
        title: "Inherit artifacts",
        readiness_depth: "implementation-ready",
      },
    ],
    risks: [
      { id: "R-global", statement: "Global risk must remain visible to the Feature Queue draft." },
    ],
    test_matrix: [
      { id: "TM-global", target: "global validation", command: "node --test core/test/deep-plan-handoff.test.js" },
    ],
    acceptance_depth: [
      { id: "A-global", criterion: "Global acceptance criterion remains attached.", depth: "implementation-ready" },
    ],
  });

  assert.equal(converted.allowed, true);
  const feature = converted.feature_queue_draft.features.find((item) => item.id === "FQ-inherit");
  assert.ok(feature.risks.map((item) => item.id).includes("R-global"));
  assert.deepEqual(feature.test_matrix.map((item) => item.id), ["TM-global"]);
  assert.deepEqual(feature.acceptance_depth.map((item) => item.id), ["A-global"]);
});

test("Deep Plan handoff parks directional items instead of turning them into executable Features", async () => {
  const root = await fixtureRoot();
  const converted = await convertFixture(root, {
    ordered_feature_queue: [
      {
        id: "FQ-directional",
        title: "Directional follow-up",
        readiness_depth: "directional",
        item: "Needs more architecture before execution.",
      },
      {
        id: "FQ-ready",
        title: "Ready implementation slice",
        readiness_depth: "implementation-ready",
        test_matrix: ["TM-ready"],
        acceptance_depth: ["A-ready"],
      },
    ],
    test_matrix: [
      { id: "TM-ready", target: "ready slice", command: "node --test core/test/deep-plan-handoff.test.js" },
    ],
    acceptance_depth: [
      { id: "A-ready", criterion: "Ready slice has executable acceptance evidence.", depth: "implementation-ready" },
    ],
  });

  assert.equal(converted.allowed, true);
  assert.ok(converted.feature_queue_draft, "conversion must return a structured Feature Queue draft");
  assert.deepEqual(converted.feature_queue_draft.features.map((feature) => feature.id), ["FQ-ready"]);
  assert.deepEqual(converted.feature_queue_draft.parked_items.map((item) => item.id), ["FQ-directional"]);
  assert.match(converted.feature_queue_draft.parked_items[0].reason, /directional|readiness/i);
});

test("implementation-ready Deep Plan handoff rejects missing target-depth artifacts with explicit gaps", async () => {
  const root = await fixtureRoot();
  const missingTestMatrix = await convertFixture(root, {
    deep_plan: { title: "Missing test matrix handoff" },
    test_matrix: [],
    ordered_feature_queue: [
      { id: "FQ-ready", title: "Ready slice", readiness_depth: "implementation-ready", acceptance_depth: ["A-ready"] },
    ],
  });

  assert.equal(missingTestMatrix.allowed, false);
  assert.equal(missingTestMatrix.blocked, true);
  assert.match(missingTestMatrix.readiness.gaps.join("\n"), /test matrix/i);

  const otherRoot = await fixtureRoot();
  const missingAcceptanceDepth = await convertFixture(otherRoot, {
    deep_plan: { title: "Missing acceptance depth handoff" },
    acceptance_depth: [],
    ordered_feature_queue: [
      { id: "FQ-ready", title: "Ready slice", readiness_depth: "implementation-ready", test_matrix: ["TM-ready"] },
    ],
  });

  assert.equal(missingAcceptanceDepth.allowed, false);
  assert.equal(missingAcceptanceDepth.blocked, true);
  assert.match(missingAcceptanceDepth.readiness.gaps.join("\n"), /acceptance depth/i);
});

test("ordinary Plan context preserves pseudo-test rejection policy from Deep Plan handoff", async () => {
  const root = await fixtureRoot();
  const converted = await convertFixture(root, {
    deep_plan: {
      conversation_summary: "The converted package has a closed-loop validation contract.",
    },
  });

  assert.equal(converted.allowed, true);
  assert.match(
    converted.plan_context,
    /pseudo[- ]test rejection|reject pseudo tests|伪测试|真实测试/i,
    "ordinary Plan context must carry the no-pseudo-test policy into P1/P2",
  );
  assert.match(
    `${converted.plan_handoff?.pseudo_test_rejection_policy || ""}`,
    /reject pseudo tests|no pseudo tests|伪测试/i,
    "handoff metadata should expose the pseudo-test rejection policy for ordinary Plan",
  );
});

async function fixtureRoot() {
  const root = await mkdtemp(join(tmpdir(), "hw-deep-plan-handoff-"));
  await api.writeConfig(join(root, ".pipeline", "config.yaml"), {
    pipeline: { name: "Deep Plan Handoff Fixture" },
    output: { language: "zh-CN", timezone: "Asia/Shanghai" },
  });
  await writeFile(join(root, ".pipeline", "state.yaml"), "sentinel: state\n", "utf8");
  await writeFile(join(root, ".pipeline", "cycle.yaml"), "sentinel: cycle\n", "utf8");
  await writeFile(join(root, ".pipeline", "rules.yaml"), "sentinel: rules\n", "utf8");
  return root;
}

async function convertFixture(root, overrides = {}) {
  assert.equal(typeof api.convertDeepPlanToPlanContext, "function");
  const packageData = implementationReadyPackage(overrides);
  const created = await api.createDeepPlanPackage(root, {
    ...packageData.deep_plan,
    summary: packageData.deep_plan.conversation_summary,
    decisions: packageData.decisions,
    tracks: packageData.tracks,
    architecture: packageData.architecture,
    risks: packageData.risks,
    test_matrix: packageData.test_matrix,
    acceptance_depth: packageData.acceptance_depth,
    ordered_feature_queue: packageData.ordered_feature_queue,
    unresolved_items: packageData.unresolved_items,
    now: "2026-05-13T14:00:00+08:00",
  });

  return api.convertDeepPlanToPlanContext(root, created.id, {
    target_readiness_depth: "implementation-ready",
    now: "2026-05-13T14:01:00+08:00",
  });
}

function implementationReadyPackage(overrides = {}) {
  return deepMerge({
    deep_plan: {
      title: "Deep Plan handoff fixture",
      status: "ready_for_plan",
      readiness_depth: "implementation-ready",
      conversation_summary: "Converted context must feed ordinary Plan without losing queue, risk, or validation policy.",
    },
    decisions: [
      {
        id: "D-handoff",
        status: "accepted",
        statement: "Deep Plan conversion hands off through ordinary Plan before execution.",
      },
    ],
    tracks: [
      {
        id: "MOD-handoff",
        title: "Handoff",
        type: "module",
        status: "ready",
        questions: [],
        decisions: [{ id: "D-track-handoff", status: "accepted", statement: "Feature Queue draft is generated from ordered items." }],
        risks: [{ id: "R-track-handoff", statement: "Directional work can be executed too early." }],
        open_items: [],
      },
    ],
    architecture: {
      components: [
        { id: "deep-plan-convert", title: "Deep Plan Convert" },
        { id: "ordinary-plan", title: "Ordinary Plan" },
      ],
      edges: [
        { from: "deep-plan-convert", to: "ordinary-plan", relationship: "hands off" },
      ],
      module_cards: [],
    },
    risks: [
      { id: "R-handoff", statement: "Converted context can drop risk ownership." },
    ],
    test_matrix: [
      { id: "TM-handoff", target: "Deep Plan handoff", command: "node --test core/test/deep-plan-handoff.test.js" },
    ],
    acceptance_depth: [
      { id: "A-handoff", criterion: "Handoff preserves implementation-ready acceptance detail.", depth: "implementation-ready" },
    ],
    ordered_feature_queue: [
      {
        id: "FQ-handoff",
        title: "Handoff slice",
        readiness_depth: "implementation-ready",
        test_matrix: ["TM-handoff"],
        acceptance_depth: ["A-handoff"],
        risks: ["R-handoff"],
      },
    ],
    unresolved_items: [],
  }, overrides);
}

function deepMerge(base, overrides) {
  const result = structuredClone(base);
  for (const [key, value] of Object.entries(overrides)) {
    if (
      value
      && !Array.isArray(value)
      && typeof value === "object"
      && result[key]
      && !Array.isArray(result[key])
      && typeof result[key] === "object"
    ) {
      result[key] = deepMerge(result[key], value);
    } else {
      result[key] = value;
    }
  }
  return result;
}
