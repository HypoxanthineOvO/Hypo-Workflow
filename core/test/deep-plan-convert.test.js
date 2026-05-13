import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import * as api from "../src/index.js";

test("deep plan convert APIs are exported through the public index", () => {
  assert.equal(typeof api.drillDeepPlanTopic, "function");
  assert.equal(typeof api.assessDeepPlanReadiness, "function");
  assert.equal(typeof api.convertDeepPlanToPlanContext, "function");
  assert.equal(typeof api.validateDeepPlanPackageBoundary, "function");
});

test("drillDeepPlanTopic only updates the targeted track or module card", async () => {
  const root = await fixtureRoot();
  const drillDeepPlanTopic = requiredApi("drillDeepPlanTopic");
  const created = await api.createDeepPlanPackage(root, {
    title: "Scoped drilldown fixture",
    summary: "Drilldown must only mutate the requested track.",
    readiness_depth: "architecture-ready",
    tracks: [
      moduleTrack("MOD-convert", "Convert Gate"),
      moduleTrack("MOD-readiness", "Readiness Depth", {
        questions: ["Which depth is currently requested?"],
        decisions: [{ id: "D-readiness-existing", status: "accepted", statement: "Readiness is assessed before convert." }],
        risks: [{ id: "R-readiness-existing", statement: "Depth labels can drift from actual evidence." }],
        open_items: ["Keep readiness gaps visible."],
      }),
    ],
    architecture: {
      components: [{ id: "convert-gate", title: "Convert Gate" }],
      edges: [],
      module_cards: [
        moduleCard("MOD-convert", "Convert Gate"),
        moduleCard("MOD-readiness", "Readiness Depth", {
          questions: ["Which depth is currently requested?"],
          decisions: [{ id: "D-card-readiness", status: "accepted", statement: "Readiness owns depth checks." }],
          risks: [{ id: "R-card-readiness", statement: "A weak gate can convert shallow plans." }],
          open_items: ["Depth rubric needs examples."],
        }),
      ],
    },
    now: "2026-05-13T09:00:00+08:00",
  });

  const before = await api.readDeepPlanPackage(root, created.id);
  const siblingBefore = structuredClone(before.tracks.find((track) => track.id === "MOD-readiness"));
  const siblingCardBefore = structuredClone(before.architecture.module_cards.find((card) => card.id === "MOD-readiness"));

  const drilled = await drillDeepPlanTopic(root, created.id, "MOD-convert", {
    questions: ["What exact condition blocks ordinary Plan conversion?"],
    decisions: [{ id: "D-convert-gate", status: "accepted", statement: "Convert requires the target readiness gate to pass." }],
    risks: [{ id: "R-convert-gate", statement: "Silent conversion can lose unresolved Deep Plan items." }],
    open_items: ["Surface blocked readiness reasons to the operator."],
  }, {
    now: "2026-05-13T09:01:00+08:00",
  });

  const targetTrack = drilled.tracks.find((track) => track.id === "MOD-convert");
  assert.match(targetTrack.questions.join("\n"), /blocks ordinary Plan conversion/);
  assert.ok(targetTrack.decisions.some((decision) => decision.id === "D-convert-gate"));
  assert.ok(targetTrack.risks.some((risk) => risk.id === "R-convert-gate"));
  assert.match(targetTrack.open_items.join("\n"), /blocked readiness reasons/);

  const targetCard = drilled.architecture.module_cards.find((card) => card.id === "MOD-convert");
  assert.match(targetCard.questions.join("\n"), /blocks ordinary Plan conversion/);
  assert.ok(targetCard.decisions.some((decision) => decision.id === "D-convert-gate"));
  assert.ok(targetCard.risks.some((risk) => risk.id === "R-convert-gate"));
  assert.match(targetCard.open_items.join("\n"), /blocked readiness reasons/);

  assert.deepEqual(drilled.tracks.find((track) => track.id === "MOD-readiness"), siblingBefore);
  assert.deepEqual(drilled.architecture.module_cards.find((card) => card.id === "MOD-readiness"), siblingCardBefore);

  const persisted = await api.readDeepPlanPackage(root, created.id);
  assert.deepEqual(persisted.tracks.find((track) => track.id === "MOD-readiness"), siblingBefore);
  assert.deepEqual(persisted.architecture.module_cards.find((card) => card.id === "MOD-readiness"), siblingCardBefore);
});

test("drillDeepPlanTopic rejects ambiguous title or topic targets without mutating siblings", async () => {
  const root = await fixtureRoot();
  const drillDeepPlanTopic = requiredApi("drillDeepPlanTopic");
  const created = await api.createDeepPlanPackage(root, {
    title: "Ambiguous drilldown fixture",
    summary: "Title and topic targets must resolve to one scope before mutation.",
    readiness_depth: "architecture-ready",
    tracks: [
      moduleTrack("MOD-routing-a", "Shared Scope", { topic: "shared-routing" }),
      moduleTrack("MOD-routing-b", "Shared Scope", { topic: "shared-routing" }),
    ],
    architecture: {
      components: [
        { id: "routing-a", title: "Routing A" },
        { id: "routing-b", title: "Routing B" },
      ],
      edges: [{ from: "routing-a", to: "routing-b", relationship: "coordinates" }],
      module_cards: [
        moduleCard("MOD-routing-a", "Shared Scope", { topic: "shared-routing" }),
        moduleCard("MOD-routing-b", "Shared Scope", { topic: "shared-routing" }),
      ],
    },
    now: "2026-05-13T09:10:00+08:00",
  });
  const before = await api.readDeepPlanPackage(root, created.id);

  let result;
  let rejected = false;
  try {
    result = await drillDeepPlanTopic(root, created.id, "Shared Scope", {
      questions: ["Which single sibling scope should receive this drilldown?"],
      decisions: [{ id: "D-ambiguous-drill", status: "accepted", statement: "Ambiguous title targets must not fan out." }],
      risks: [{ id: "R-ambiguous-drill", statement: "A shared title can update multiple sibling scopes." }],
      open_items: ["Require an ID when title or topic is ambiguous."],
    }, {
      now: "2026-05-13T09:11:00+08:00",
    });
  } catch (error) {
    rejected = true;
    assert.match(error.message, /ambiguous|multiple|more than one|non-unique/i);
  }

  if (!rejected) {
    assert.ok(
      result?.ambiguous === true || result?.allowed === false || result?.blocked === true,
      "ambiguous title/topic targets must return an explicit ambiguous or rejected result",
    );
    assert.match(
      `${result?.reason || ""} ${result?.message || ""}`,
      /ambiguous|multiple|more than one|non-unique/i,
    );
  }

  const persisted = await api.readDeepPlanPackage(root, created.id);
  assert.deepEqual(persisted.tracks, before.tracks);
  assert.deepEqual(persisted.architecture.module_cards, before.architecture.module_cards);
});

test("assessDeepPlanReadiness enforces depth-specific gates", async () => {
  const assessDeepPlanReadiness = requiredApi("assessDeepPlanReadiness");

  const directional = await assessDeepPlanReadiness({
    deep_plan: {
      id: "DP201",
      title: "Directional fixture",
      readiness_depth: "directional",
      conversation_summary: "The direction is intentionally scoped before architecture mapping.",
    },
    intentional_blanks: [
      { field: "architecture.components", reason: "Deferred until architecture-ready." },
      { field: "ordered_feature_queue", reason: "Deferred until implementation-ready." },
    ],
    tracks: [],
    decisions: [],
    architecture: { components: [], edges: [] },
  }, { target_readiness_depth: "directional" });

  assert.equal(directional.allowed, true);
  assert.deepEqual(directional.intentional_blanks.map((blank) => blank.field), [
    "architecture.components",
    "ordered_feature_queue",
  ]);

  const architectureBlocked = await assessDeepPlanReadiness({
    deep_plan: { id: "DP202", title: "Missing architecture", readiness_depth: "architecture-ready" },
    decisions: [{ id: "D-proposed", status: "proposed", statement: "Maybe use module cards." }],
    tracks: [],
    architecture: { components: [], edges: [] },
  }, { target_readiness_depth: "architecture-ready" });

  assert.equal(architectureBlocked.allowed, false);
  assert.match(architectureBlocked.gaps.join("\n"), /components|edges|tracks|accepted decision/i);

  const architectureReady = await assessDeepPlanReadiness(implementationReadyPackage({
    deep_plan: { id: "DP203", title: "Architecture ready", readiness_depth: "architecture-ready" },
  }), { target_readiness_depth: "architecture-ready" });

  assert.equal(architectureReady.allowed, true);
  assert.deepEqual(architectureReady.gaps, []);

  const implementationBlocked = await assessDeepPlanReadiness(implementationReadyPackage({
    test_matrix: [],
    acceptance_depth: [],
    risks: [],
    ordered_feature_queue: [],
  }), { target_readiness_depth: "implementation-ready" });

  assert.equal(implementationBlocked.allowed, false);
  assert.match(implementationBlocked.gaps.join("\n"), /test matrix|acceptance depth|risks|ordered feature queue/i);

  const implementationReady = await assessDeepPlanReadiness(implementationReadyPackage(), {
    target_readiness_depth: "implementation-ready",
  });

  assert.equal(implementationReady.allowed, true);
  assert.deepEqual(implementationReady.gaps, []);
});

test("convertDeepPlanToPlanContext passes readiness gate and emits compact ordinary Plan context", async () => {
  const root = await fixtureRoot();
  const convertDeepPlanToPlanContext = requiredApi("convertDeepPlanToPlanContext");
  const packageData = implementationReadyPackage({
    deep_plan: {
      title: "Implementation ready convert fixture",
      readiness_depth: "implementation-ready",
      status: "ready_for_plan",
      raw_conversation: "USER: RAW_TRANSCRIPT_MARKER should never appear in compact Plan context.",
    },
  });
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
    now: "2026-05-13T10:00:00+08:00",
  });

  const converted = await convertDeepPlanToPlanContext(root, created.id, {
    target_readiness_depth: "implementation-ready",
    now: "2026-05-13T10:01:00+08:00",
  });

  assert.equal(converted.allowed, true);
  assert.equal(converted.readiness.allowed, true);
  assert.equal(converted.deep_plan.status, "converted");
  assert.equal(typeof converted.plan_context, "string");
  assert.match(converted.plan_context, /Feature Queue/i);
  assert.match(converted.plan_context, /Test Matrix/i);
  assert.match(converted.plan_context, /Acceptance Depth/i);
  assert.match(converted.plan_context, /Risks/i);
  assert.match(converted.plan_context, /Unresolved Items/i);
  assert.match(converted.plan_context, /ordinary Plan context|\/hw:plan|Plan context/i);
  assert.doesNotMatch(converted.plan_context, /RAW_TRANSCRIPT_MARKER|USER:|ASSISTANT:/);

  const persistedContext = await readFile(join(root, created.path, "plan-context.md"), "utf8");
  assert.equal(persistedContext, converted.plan_context);
});

test("convertDeepPlanToPlanContext does not default-convert directional packages", async () => {
  const root = await fixtureRoot();
  const convertDeepPlanToPlanContext = requiredApi("convertDeepPlanToPlanContext");
  const created = await api.createDeepPlanPackage(root, {
    title: "Directional default convert fixture",
    summary: "This package intentionally stops at directional readiness.",
    readiness_depth: "directional",
    status: "ready_for_plan",
    intentional_blanks: [
      { field: "architecture.components", reason: "Deferred until architecture-ready." },
      { field: "test_matrix", reason: "Deferred until implementation-ready." },
      { field: "ordered_feature_queue", reason: "Deferred until implementation-ready." },
    ],
    tracks: [],
    architecture: { components: [], edges: [], module_cards: [] },
    now: "2026-05-13T10:10:00+08:00",
  });

  const converted = await convertDeepPlanToPlanContext(root, created.id, {
    now: "2026-05-13T10:11:00+08:00",
  });

  assert.equal(converted.allowed, false);
  assert.equal(converted.blocked, true);
  assert.notEqual(converted.deep_plan.status, "converted");
  assert.match(
    `${converted.reason || ""} ${converted.readiness?.gaps?.join("\n") || ""}`,
    /readiness|implementation-ready|target/i,
  );

  const persisted = await api.readDeepPlanPackage(root, created.id);
  assert.notEqual(persisted.deep_plan.status, "converted");
});

test("convertDeepPlanToPlanContext blocks archived packages and archived active pointers", async () => {
  const root = await fixtureRoot();
  const convertDeepPlanToPlanContext = requiredApi("convertDeepPlanToPlanContext");
  const created = await api.createDeepPlanPackage(root, {
    ...implementationReadyPackage().deep_plan,
    title: "Archived convert fixture",
    readiness_depth: "implementation-ready",
    status: "ready_for_plan",
    now: "2026-05-13T11:00:00+08:00",
  });
  await api.archiveDeepPlanPackage(root, created.id, {
    reason: "Superseded before convert.",
    now: "2026-05-13T11:01:00+08:00",
  });
  await api.writeConfig(join(root, ".pipeline", "deep-plans", "active.yaml"), {
    active: {
      id: created.id,
      title: "Archived convert fixture",
      status: "archived",
      package_path: created.path,
    },
  });

  const direct = await convertDeepPlanToPlanContext(root, created.id, {
    target_readiness_depth: "implementation-ready",
  });
  assert.equal(direct.allowed, false);
  assert.equal(direct.blocked, true);
  assert.match(direct.reason, /archived/i);

  const active = await convertDeepPlanToPlanContext(root, "active", {
    target_readiness_depth: "implementation-ready",
  });
  assert.equal(active.allowed, false);
  assert.equal(active.blocked, true);
  assert.match(active.reason, /active.*archived|archived.*active/i);
});

test("validateDeepPlanPackageBoundary rejects package_path escape without external writes", async () => {
  const root = await fixtureRoot();
  const validateDeepPlanPackageBoundary = requiredApi("validateDeepPlanPackageBoundary");
  const created = await api.createDeepPlanPackage(root, {
    title: "Boundary fixture",
    summary: "Tampered package_path must not escape the package directory.",
    readiness_depth: "architecture-ready",
    now: "2026-05-13T12:00:00+08:00",
  });
  const tampered = await api.readDeepPlanPackage(root, created.id);
  tampered.deep_plan.package_path = ".pipeline/deep-plans/DP001-boundary-fixture/../../outside-package";
  tampered.deep_plan.plan_context_path = ".pipeline/deep-plans/DP001-boundary-fixture/../../outside-package/plan-context.md";

  const result = await validateDeepPlanPackageBoundary(root, tampered, {
    operation: "convert",
  });

  assert.equal(result.allowed, false);
  assert.equal(result.valid, false);
  assert.match(result.reason, /package_path|boundary|escape|outside/i);
  assert.ok(result.issues.some((issue) => /package_path|boundary|escape|outside/i.test(`${issue.kind} ${issue.message || ""}`)));
  await assert.rejects(stat(join(root, ".pipeline", "deep-plans", "outside-package", "plan-context.md")), /ENOENT/);
});

async function fixtureRoot() {
  const root = await mkdtemp(join(tmpdir(), "hw-deep-plan-convert-"));
  await api.writeConfig(join(root, ".pipeline", "config.yaml"), {
    pipeline: { name: "Deep Plan Convert Fixture" },
    output: { language: "zh-CN", timezone: "Asia/Shanghai" },
  });
  await writeFile(join(root, ".pipeline", "state.yaml"), "sentinel: state\n", "utf8");
  await writeFile(join(root, ".pipeline", "cycle.yaml"), "sentinel: cycle\n", "utf8");
  await writeFile(join(root, ".pipeline", "rules.yaml"), "sentinel: rules\n", "utf8");
  return root;
}

function requiredApi(name) {
  assert.equal(typeof api[name], "function", `missing public export ${name}`);
  return api[name];
}

function moduleTrack(id, title, overrides = {}) {
  return {
    id,
    title,
    type: "module",
    status: "active",
    questions: [],
    decisions: [],
    risks: [],
    open_items: [],
    relationships: { depends_on: [], blocks: [], conflicts_with: [], feeds_into_plan: [] },
    ...overrides,
  };
}

function moduleCard(id, title, overrides = {}) {
  return {
    id,
    title,
    responsibilities: [],
    inputs: [],
    outputs: [],
    questions: [],
    decisions: [],
    risks: [],
    open_items: [],
    ...overrides,
  };
}

function implementationReadyPackage(overrides = {}) {
  const base = {
    deep_plan: {
      id: "DP204",
      title: "Implementation ready fixture",
      status: "ready_for_plan",
      readiness_depth: "implementation-ready",
      conversation_summary: "The package has architecture, accepted decisions, test matrix, risks, and an ordered queue.",
    },
    decisions: [
      {
        id: "D-accepted-readiness",
        status: "accepted",
        statement: "Conversion is allowed only after implementation readiness evidence exists.",
      },
    ],
    tracks: [
      moduleTrack("MOD-convert", "Convert Gate", {
        status: "ready",
        decisions: [{ id: "D-track-convert", status: "accepted", statement: "Convert emits compact Plan context." }],
        risks: [{ id: "R-track-convert", statement: "Raw transcript must stay out of Plan context." }],
      }),
    ],
    architecture: {
      components: [
        { id: "package-store", title: "Package Store" },
        { id: "convert-gate", title: "Convert Gate" },
      ],
      edges: [
        { from: "package-store", to: "convert-gate", relationship: "feeds" },
      ],
      module_cards: [
        moduleCard("MOD-convert", "Convert Gate", {
          decisions: [{ id: "D-card-convert", status: "accepted", statement: "Plan context is compact." }],
          risks: [{ id: "R-card-convert", statement: "Unresolved items can be lost." }],
        }),
      ],
    },
    risks: [
      { id: "R-convert", statement: "Silent conversion hides unresolved questions." },
    ],
    test_matrix: [
      { id: "TM-readiness", target: "readiness gate", command: "uv run -- node --test core/test/deep-plan-convert.test.js" },
    ],
    acceptance_depth: [
      { id: "A-convert", criterion: "Blocked conversions include explicit reasons.", depth: "implementation" },
    ],
    ordered_feature_queue: [
      { id: "FQ-1", title: "Readiness gate", priority: 1 },
      { id: "FQ-2", title: "Compact Plan context", priority: 2 },
    ],
    unresolved_items: [
      { id: "U-risk", item: "Confirm exact wording for blocked active pointer output." },
    ],
  };

  return deepMerge(base, overrides);
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
