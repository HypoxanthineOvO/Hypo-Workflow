import test from "node:test";
import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import * as CORE from "../src/index.js";
import {
  freshDeliveryCall,
  strictTopologyInput,
  writeWorkerEvidence,
} from "./fixtures/c21-m6/helpers.js";
import {
  snapshotTree,
  temporaryCurrentWorkspace,
} from "./fixtures/c21-m2/helpers.js";

const FIXED_NOW = "2026-07-18T20:30:00+08:00";
const OBJECT_REF = Object.freeze({ kind: "delivery", id: "routing-goal" });
const ROUTING_API_URL = new URL("../src/worker-routing/index.js", import.meta.url);
const CONFIG_SCHEMA_PATH = fileURLToPath(new URL("../../config.schema.yaml", import.meta.url));
const FIXTURE_PATH = fileURLToPath(new URL("./fixtures/c23-m7/worker-routing-cases.json", import.meta.url));
const ROUTING_PROBE = await import(ROUTING_API_URL)
  .then((api) => ({ api, error: null }))
  .catch((error) => ({ api: null, error }));
const REQUIRED_ROUTING_API = Object.freeze([
  "validateTaskAssessment",
  "selectWorkerRouting",
  "resolveWorkerRoutingHandoff",
]);
const HAS_ROUTING_API = !ROUTING_PROBE.error
  && REQUIRED_ROUTING_API.every((name) => typeof ROUTING_PROBE.api?.[name] === "function");
const routingTest = HAS_ROUTING_API ? test : test.skip;
const FIXTURE = JSON.parse(await readFile(FIXTURE_PATH, "utf8"));
const IDENTIFIER_BYTE_LIMIT = 128;
const FAILURE_ATTEMPT_LIMIT = 256;
const PERSISTED_ROUTE_ID_LIMIT = 64;

const TASK_ASSESSMENT = Object.freeze({
  schema_version: "1",
  complexity: "high",
  uncertainty: "high",
  oracle_strength: "mixed",
  blast_radius: "high",
  reversibility: "guarded",
  risk_flags: ["authority_change"],
  summary: "The host sees an authority-level change with material uncertainty and a mixed oracle.",
});

const ROUTING_DECISION = Object.freeze({
  schema_version: "1",
  policy_version: FIXTURE.policy_version,
  routing_class: "critical",
  reason_codes: ["high_blast_radius", "risk_flags_present"],
  source: "host_task_assessment",
  failure_state: {
    distinct_failed_route_ids: ["route-standard-1"],
    distinct_failed_route_count: 1,
    escalation_threshold: 2,
  },
  assessment: TASK_ASSESSMENT,
});

const STANDARD_TASK_ASSESSMENT = Object.freeze({
  schema_version: "1",
  complexity: "medium",
  uncertainty: "low",
  oracle_strength: "strong",
  blast_radius: "low",
  reversibility: "reversible",
  risk_flags: [],
  summary: "Extend the independent oracle for canonical mechanical operations without editing production.",
});

const STANDARD_ROUTING_DECISION = Object.freeze({
  schema_version: "1",
  policy_version: FIXTURE.policy_version,
  routing_class: "standard",
  reason_codes: ["nontrivial_change"],
  source: "host_task_assessment",
  failure_state: {
    distinct_failed_route_ids: [],
    distinct_failed_route_count: 0,
    escalation_threshold: 2,
  },
  assessment: STANDARD_TASK_ASSESSMENT,
});

test("C23 M7 publishes an independent Worker Routing API from Core and its focused module", () => {
  if (ROUTING_PROBE.error) {
    assert.fail(`core/src/worker-routing/index.js must import cleanly: ${ROUTING_PROBE.error.code || ROUTING_PROBE.error.message}`);
  }
  for (const name of REQUIRED_ROUTING_API) {
    assert.equal(typeof ROUTING_PROBE.api[name], "function", `${name} must be exported by worker-routing`);
    assert.equal(typeof CORE[name], "function", `${name} must be exported by the Core root`);
  }
});

test("config.schema declares one strict Worker Routing policy and rejects the renamed threshold key", async () => {
  const schema = CORE.parseYaml(await readFile(CONFIG_SCHEMA_PATH, "utf8"));
  assert.ok(schema.$defs && typeof schema.$defs === "object", "config.schema must publish $defs");
  const candidates = Object.entries(schema.$defs).filter(([, definition]) => {
    const resolved = resolveLocalSchemaRef(schema, definition);
    const properties = resolved?.properties;
    return Boolean(
      properties?.mode
      && (
        properties.policy_version
        || properties.failure_escalation_threshold
        || properties.distinct_failed_routes_threshold
      )
    );
  });
  assert.equal(candidates.length, 1, "config.schema must declare exactly one Worker Routing policy in $defs");
  const [definitionName, rawPolicy] = candidates[0];
  const policy = resolveLocalSchemaRef(schema, rawPolicy);
  const expectedKeys = ["failure_escalation_threshold", "mode", "policy_version"];
  const expectedDefaults = {
    mode: "advisory",
    policy_version: "worker-routing-v1",
    failure_escalation_threshold: 2,
  };
  assert.equal(policy.type, "object");
  assert.equal(policy.additionalProperties, false);
  assert.deepEqual(Object.keys(policy.properties || {}).sort(), expectedKeys);
  assert.equal(
    rawWorkerRoutingOverrideMatchesSchema(policy, { mode: "required" }),
    true,
    "raw project config must allow a partial Worker Routing override",
  );
  assert.deepEqual(policy.required || [], [], "raw Worker Routing overrides must not require defaulted fields");
  assert.deepEqual(policy.properties.mode.enum, ["off", "advisory", "required"]);
  assert.equal(policy.properties.mode.default, "advisory");
  assert.equal(policy.properties.policy_version.const, "worker-routing-v1");
  assert.equal(policy.properties.policy_version.default, "worker-routing-v1");
  assert.equal(policy.properties.failure_escalation_threshold.const, 2);
  assert.equal(policy.properties.failure_escalation_threshold.default, 2);
  assert.deepEqual(policy.default, expectedDefaults);
  assert.equal(Object.hasOwn(policy.properties, "distinct_failed_routes_threshold"), false);
  assert.equal(rawWorkerRoutingOverrideMatchesSchema(policy, {
    mode: "required",
    distinct_failed_routes_threshold: 2,
  }), false, "the renamed threshold key must be schema-incompatible");
  assert.equal(rawWorkerRoutingOverrideMatchesSchema(policy, {
    mode: "required",
    unexpected: true,
  }), false, "unknown Worker Routing keys must be schema-incompatible");

  const execution = resolveLocalSchemaRef(schema, schema.properties?.execution);
  assert.ok(execution?.properties?.worker_routing, "execution.worker_routing must be declared");
  const routingProperty = execution.properties.worker_routing;
  assert.equal(routingProperty.$ref, `#/$defs/${definitionName}`);
  assert.deepEqual(routingProperty.default, expectedDefaults);
});

routingTest("legacy seven-field calls classify all five routes with deterministic reason codes", () => {
  for (const scenario of FIXTURE.classification_cases) {
    const decision = ROUTING_PROBE.api.selectWorkerRouting(scenario.input);
    assert.equal(decision.schema_version, "1", scenario.name);
    assert.equal(decision.policy_version, FIXTURE.policy_version, scenario.name);
    assert.equal(decision.routing_class, scenario.expected.routing_class, scenario.name);
    assert.deepEqual(decision.reason_codes, scenario.expected.reason_codes, scenario.name);
    assert.equal(decision.source, scenario.expected.source, scenario.name);
    assert.equal(
      decision.failure_state.distinct_failed_route_count,
      scenario.expected.distinct_failed_route_count,
      scenario.name,
    );
    assert.equal(decision.failure_state.escalation_threshold, 2, scenario.name);
    assertNoHostResolutionFields(decision);
  }
});

routingTest("canonical mechanical operations override nontrivial size with exact reasons", () => {
  const base = FIXTURE.classification_cases[1].input;
  for (const scenario of FIXTURE.mechanical_operation_cases) {
    const decision = ROUTING_PROBE.api.selectWorkerRouting({
      ...base,
      operation_kind: scenario.operation_kind,
    });
    assert.equal(decision.routing_class, "mechanical", scenario.operation_kind);
    assert.deepEqual(decision.reason_codes, [scenario.reason_code], scenario.operation_kind);
    assert.equal(decision.source, "legacy_fields", scenario.operation_kind);
    assertNoHostResolutionFields(decision);
  }
});

routingTest("higher-priority signals win over every canonical mechanical operation", () => {
  const base = FIXTURE.classification_cases[1].input;
  const higherPriority = [
    {
      name: "security",
      overrides: { task_kind: "security" },
      routing_class: "escalation",
      reason_codes: ["security"],
    },
    {
      name: "recovery conflict",
      overrides: { risk_flags: ["recovery_conflict"] },
      routing_class: "critical",
      reason_codes: ["recovery_conflict"],
    },
    {
      name: "high uncertainty",
      overrides: { assessment: FIXTURE.explore_task_assessment },
      routing_class: "explore",
      reason_codes: ["high_uncertainty"],
    },
  ];
  for (const mechanical of FIXTURE.mechanical_operation_cases) {
    for (const priority of higherPriority) {
      const decision = ROUTING_PROBE.api.selectWorkerRouting({
        ...base,
        operation_kind: mechanical.operation_kind,
        ...priority.overrides,
      });
      const label = `${mechanical.operation_kind} + ${priority.name}`;
      assert.equal(decision.routing_class, priority.routing_class, label);
      assert.deepEqual(decision.reason_codes, priority.reason_codes, label);
      assertNoHostResolutionFields(decision);
    }
  }
});

routingTest("precedence is escalation over critical over explore over standard over mechanical", () => {
  const base = FIXTURE.classification_cases[0].input;
  const precedence = [
    {
      expected: "escalation",
      input: {
        ...base,
        operation_kind: "compare",
        task_kind: "candidate-comparison",
        change_size: "material",
        risk_flags: ["authority_change"],
        distinct_failed_routes: 2,
      },
    },
    {
      expected: "critical",
      input: {
        ...base,
        operation_kind: "compare",
        task_kind: "candidate-comparison",
        change_size: "material",
        reversible: true,
        risk_flags: ["authority_change"],
      },
    },
    {
      expected: "explore",
      input: {
        ...base,
        operation_kind: "compare",
        task_kind: "candidate-comparison",
        change_size: "material",
      },
    },
    {
      expected: "standard",
      input: { ...base, change_size: "material" },
    },
    { expected: "mechanical", input: base },
  ];
  assert.deepEqual(
    precedence.map(({ input }) => ROUTING_PROBE.api.selectWorkerRouting(input).routing_class),
    precedence.map(({ expected }) => expected),
  );
});

routingTest("approved semantic signals map directly to escalation, critical, or explore with explicit reasons", () => {
  const base = FIXTURE.classification_cases[1].input;
  const cases = [
    {
      name: "security",
      input: { ...base, task_kind: "security" },
      routing_class: "escalation",
      reason_codes: ["security"],
    },
    {
      name: "migration",
      input: { ...base, task_kind: "migration" },
      routing_class: "escalation",
      reason_codes: ["migration"],
    },
    {
      name: "irreversible",
      input: { ...base, reversible: false },
      routing_class: "escalation",
      reason_codes: ["irreversible"],
    },
    {
      name: "weak oracle",
      input: { ...base, assessment: FIXTURE.task_assessment },
      routing_class: "critical",
      reason_codes: ["weak_oracle"],
    },
    {
      name: "independent audit",
      input: { ...base, role: "audit", operation_kind: "independent-audit", task_kind: "audit" },
      routing_class: "critical",
      reason_codes: ["independent_audit"],
    },
    {
      name: "architecture",
      input: { ...base, operation_kind: "design", task_kind: "architecture" },
      routing_class: "critical",
      reason_codes: ["architecture"],
    },
    {
      name: "recovery conflict",
      input: { ...base, operation_kind: "recover", risk_flags: ["recovery_conflict"] },
      routing_class: "critical",
      reason_codes: ["recovery_conflict"],
    },
    {
      name: "high uncertainty",
      input: { ...base, assessment: FIXTURE.explore_task_assessment },
      routing_class: "explore",
      reason_codes: ["high_uncertainty"],
    },
    {
      name: "unknown root",
      input: { ...base, operation_kind: "investigate", task_kind: "unknown-root" },
      routing_class: "explore",
      reason_codes: ["unknown_root"],
    },
    {
      name: "candidate comparison",
      input: { ...base, operation_kind: "compare", task_kind: "candidate-comparison" },
      routing_class: "explore",
      reason_codes: ["candidate_comparison"],
    },
  ];
  for (const scenario of cases) {
    const decision = ROUTING_PROBE.api.selectWorkerRouting(scenario.input);
    assert.equal(decision.routing_class, scenario.routing_class, scenario.name);
    assert.deepEqual(decision.reason_codes, scenario.reason_codes, scenario.name);
  }
});

routingTest("only two distinct execution-route failures escalate", () => {
  const base = FIXTURE.classification_cases[1].input;
  const oneCounted = ROUTING_PROBE.api.selectWorkerRouting({
    ...base,
    distinct_failed_routes: FIXTURE.excluded_failure_attempts,
  });
  assert.equal(oneCounted.routing_class, "standard");
  assert.deepEqual(oneCounted.failure_state.distinct_failed_route_ids, ["route-a"]);
  assert.equal(oneCounted.failure_state.distinct_failed_route_count, 1);

  const escalated = ROUTING_PROBE.api.selectWorkerRouting({
    ...base,
    distinct_failed_routes: [
      ...FIXTURE.excluded_failure_attempts,
      { route_id: "route-e", status: "failed", failure_kind: "route" },
    ],
  });
  assert.equal(escalated.routing_class, "escalation");
  assert.deepEqual(escalated.failure_state.distinct_failed_route_ids, ["route-a", "route-e"]);
  assert.equal(escalated.failure_state.distinct_failed_route_count, 2);
});

routingTest("Task Assessment is exact, bounded, secret-safe, visible, and never a hidden-reasoning or prompt carrier", () => {
  const assessment = ROUTING_PROBE.api.validateTaskAssessment(FIXTURE.task_assessment);
  assert.deepEqual(assessment, FIXTURE.task_assessment);
  const weakOracleDecision = ROUTING_PROBE.api.selectWorkerRouting({
    ...FIXTURE.classification_cases[1].input,
    assessment,
  });
  assert.equal(weakOracleDecision.source, "host_task_assessment");
  assert.equal(weakOracleDecision.routing_class, "critical");
  assert.deepEqual(weakOracleDecision.reason_codes, ["weak_oracle"]);
  assert.deepEqual(weakOracleDecision.assessment, assessment);

  const exploreAssessment = ROUTING_PROBE.api.validateTaskAssessment(FIXTURE.explore_task_assessment);
  const exploreDecision = ROUTING_PROBE.api.selectWorkerRouting({
    ...FIXTURE.classification_cases[1].input,
    assessment: exploreAssessment,
  });
  assert.equal(exploreDecision.routing_class, "explore");
  assert.deepEqual(exploreDecision.reason_codes, ["high_uncertainty"]);
  assert.deepEqual(exploreDecision.assessment, exploreAssessment);

  const secretMarker = ["C23", "password", "9zQ4vN2xL7kP"].join("-");
  const invalid = [
    { ...assessment, prompt: "persist this instruction" },
    { ...assessment, hidden_reasoning: "private rationale" },
    { ...assessment, summary: secretMarker },
    { ...assessment, summary: "x".repeat(1025) },
    { ...assessment, complexity: "unbounded" },
    { ...assessment, risk_flags: Array.from({ length: 17 }, (_, index) => `risk-${index}`) },
  ];
  for (const candidate of invalid) {
    assert.throws(
      () => ROUTING_PROBE.api.validateTaskAssessment(candidate),
      (error) => {
        assert.match(String(error?.message || error), /assessment|schema|unsupported|secret|reason|summary|bound|risk|complexity/i);
        assert.doesNotMatch(String(error?.message || error), new RegExp(secretMarker));
        return true;
      },
    );
  }
});

routingTest("all Worker Routing semantic identifiers use a 128-byte UTF-8 boundary without echo", () => {
  const boundary = "a".repeat(IDENTIFIER_BYTE_LIMIT);
  const asciiOverrun = "b".repeat(IDENTIFIER_BYTE_LIMIT + 1);
  const multibyteOverrun = `${"c".repeat(IDENTIFIER_BYTE_LIMIT - 2)}界`;
  assert.equal(Buffer.byteLength(boundary, "utf8"), IDENTIFIER_BYTE_LIMIT);
  assert.equal(Buffer.byteLength(asciiOverrun, "utf8"), IDENTIFIER_BYTE_LIMIT + 1);
  assert.equal(Buffer.byteLength(multibyteOverrun, "utf8"), IDENTIFIER_BYTE_LIMIT + 1);

  assert.deepEqual(
    ROUTING_PROBE.api.validateTaskAssessment({
      ...FIXTURE.explore_task_assessment,
      risk_flags: [boundary],
    }).risk_flags,
    [boundary],
  );
  const attemptBoundary = ROUTING_PROBE.api.selectWorkerRouting({
    ...FIXTURE.classification_cases[1].input,
    distinct_failed_routes: [{ route_id: boundary, status: "failed", failure_kind: "route" }],
  });
  assert.deepEqual(attemptBoundary.failure_state.distinct_failed_route_ids, [boundary]);
  const persistedBoundary = ROUTING_PROBE.api.validateWorkerRoutingDecision({
    ...STANDARD_ROUTING_DECISION,
    failure_state: {
      ...STANDARD_ROUTING_DECISION.failure_state,
      distinct_failed_route_ids: [boundary],
      distinct_failed_route_count: 1,
    },
  });
  assert.deepEqual(persistedBoundary.failure_state.distinct_failed_route_ids, [boundary]);
  for (const field of ["role", "operation_kind", "task_kind", "change_size"]) {
    assert.equal(
      ROUTING_PROBE.api.selectWorkerRouting({
        ...FIXTURE.classification_cases[1].input,
        [field]: boundary,
      }).schema_version,
      "1",
      `${field} accepts the 128-byte boundary`,
    );
  }

  for (const candidate of [asciiOverrun, multibyteOverrun]) {
    const rejectionCases = [
      {
        label: "Task Assessment risk_flags",
        run: () => ROUTING_PROBE.api.validateTaskAssessment({
          ...FIXTURE.explore_task_assessment,
          risk_flags: [candidate],
        }),
      },
      {
        label: "failure attempt route_id",
        run: () => ROUTING_PROBE.api.selectWorkerRouting({
          ...FIXTURE.classification_cases[1].input,
          distinct_failed_routes: [{ route_id: candidate, status: "failed", failure_kind: "route" }],
        }),
      },
      {
        label: "persisted failure-state route_id",
        run: () => ROUTING_PROBE.api.validateWorkerRoutingDecision({
          ...STANDARD_ROUTING_DECISION,
          failure_state: {
            ...STANDARD_ROUTING_DECISION.failure_state,
            distinct_failed_route_ids: [candidate],
            distinct_failed_route_count: 1,
          },
        }),
      },
      ...["role", "operation_kind", "task_kind", "change_size"].map((field) => ({
        label: `direct ${field}`,
        run: () => ROUTING_PROBE.api.selectWorkerRouting({
          ...FIXTURE.classification_cases[1].input,
          [field]: candidate,
        }),
      })),
    ];
    for (const rejection of rejectionCases) {
      assertIdentifierBoundRejection(rejection.run, candidate, rejection.label);
    }
  }
});

routingTest("failure attempts cap at 256 and persisted distinct route IDs cap at 64 without residue", async (t) => {
  const root = await temporaryCurrentWorkspace(t, "hw-c23-m7-routing-bounds-");
  const repeatedAttempt = { route_id: "same-route", status: "failed", failure_kind: "route" };
  const attemptsAtBoundary = Array.from({ length: FAILURE_ATTEMPT_LIMIT }, () => ({ ...repeatedAttempt }));
  const selected = ROUTING_PROBE.api.selectWorkerRouting({
    ...FIXTURE.classification_cases[1].input,
    distinct_failed_routes: attemptsAtBoundary,
  });
  assert.equal(selected.failure_state.distinct_failed_route_count, 1);
  const beforeAttemptOverrun = await snapshotTree(root);
  assert.throws(
    () => ROUTING_PROBE.api.selectWorkerRouting({
      ...FIXTURE.classification_cases[1].input,
      distinct_failed_routes: [...attemptsAtBoundary, { ...repeatedAttempt }],
    }),
    /attempt|array|256|limit|bound|routing/i,
  );
  assert.deepEqual(await snapshotTree(root), beforeAttemptOverrun);

  const routeIdsAtBoundary = Array.from(
    { length: PERSISTED_ROUTE_ID_LIMIT },
    (_, index) => `route-${String(index).padStart(2, "0")}`,
  );
  const boundaryDecision = {
    ...STANDARD_ROUTING_DECISION,
    routing_class: "escalation",
    reason_codes: ["distinct_failed_routes_threshold_reached"],
    failure_state: {
      distinct_failed_route_ids: routeIdsAtBoundary,
      distinct_failed_route_count: routeIdsAtBoundary.length,
      escalation_threshold: 2,
    },
  };
  assert.equal(
    ROUTING_PROBE.api.validateWorkerRoutingDecision(boundaryDecision)
      .failure_state.distinct_failed_route_ids.length,
    PERSISTED_ROUTE_ID_LIMIT,
  );
  await writeRoutingRuntime(root, boundaryDecision, "m7-routing-bounds-valid");
  assert.deepEqual(
    (await CORE.readRuntimeObject(root, OBJECT_REF)).runtime.worker_routing.failure_state.distinct_failed_route_ids,
    routeIdsAtBoundary,
  );

  const invalidDecision = {
    ...boundaryDecision,
    failure_state: {
      ...boundaryDecision.failure_state,
      distinct_failed_route_ids: [...routeIdsAtBoundary, "route-64"],
      distinct_failed_route_count: PERSISTED_ROUTE_ID_LIMIT + 1,
    },
  };
  assert.throws(
    () => ROUTING_PROBE.api.validateWorkerRoutingDecision(invalidDecision),
    /failure|route|64|limit|bound|routing/i,
  );
  const beforeInvalidPersistence = await snapshotTree(root);
  await assert.rejects(
    writeRoutingRuntime(root, invalidDecision, "m7-routing-bounds-invalid"),
    /failure|route|64|limit|bound|routing/i,
  );
  assert.deepEqual(await snapshotTree(root), beforeInvalidPersistence);
});

routingTest("off, advisory, and required modes make host capability fallback explicit", () => {
  const cases = [
    { mode: "off", supported: false, status: "disabled", start_allowed: true, reason_code: "routing_off" },
    { mode: "advisory", supported: false, status: "fallback", start_allowed: true, reason_code: "host_capability_unavailable" },
    { mode: "required", supported: false, status: "blocked", start_allowed: false, reason_code: "host_capability_required" },
    { mode: "advisory", supported: true, status: "routed", start_allowed: true, reason_code: "host_capability_supported" },
  ];
  for (const scenario of cases) {
    const result = ROUTING_PROBE.api.resolveWorkerRoutingHandoff({
      mode: scenario.mode,
      host_capability: { semantic_worker_routing: scenario.supported },
      decision: ROUTING_DECISION,
    });
    assert.equal(result.mode, scenario.mode);
    assert.equal(result.capability_supported, scenario.supported);
    assert.equal(result.status, scenario.status);
    assert.equal(result.start_allowed, scenario.start_allowed);
    assert.equal(result.reason_code, scenario.reason_code);
    assertNoHostResolutionFields(result);
  }
});

test("config defaults to advisory Worker Routing, accepts all modes, and rejects unknown modes", async (t) => {
  const defaults = CORE.DEFAULT_GLOBAL_CONFIG.execution.worker_routing;
  assert.equal(defaults?.mode, "advisory");
  assert.equal(defaults?.policy_version, FIXTURE.policy_version);
  assert.equal(defaults?.failure_escalation_threshold, 2);
  assert.equal(Object.hasOwn(defaults, "distinct_failed_routes_threshold"), false);

  const root = await temporaryCurrentWorkspace(t, "hw-c23-m7-routing-config-");
  for (const mode of ["off", "advisory", "required"]) {
    const path = join(root, `${mode}.yaml`);
    await writeFile(path, `execution:\n  worker_routing:\n    mode: ${mode}\n`, "utf8");
    assert.equal((await CORE.loadConfig(path)).execution.worker_routing.mode, mode);
  }
  const invalidPath = join(root, "invalid.yaml");
  await writeFile(invalidPath, "execution:\n  worker_routing:\n    mode: automatic\n", "utf8");
  await assert.rejects(CORE.loadConfig(invalidPath), /worker routing|worker_routing|mode|unsupported/i);
  const renamedKeyPath = join(root, "renamed-key.yaml");
  await writeFile(
    renamedKeyPath,
    "execution:\n  worker_routing:\n    mode: advisory\n    distinct_failed_routes_threshold: 2\n",
    "utf8",
  );
  await assert.rejects(CORE.loadConfig(renamedKeyPath), /worker routing|worker_routing|threshold|unsupported/i);
});

test("Runtime and Continuation preserve routing across a fresh-process Delivery Resume", async (t) => {
  const root = await temporaryCurrentWorkspace(t, "hw-c23-m7-routing-resume-");
  await seedRoutingRuntime(root);
  const resumed = await freshDeliveryCall(root, "resume", [{}], FIXED_NOW);
  assert.deepEqual(resumed.delivery.worker_routing, ROUTING_DECISION);
  assert.deepEqual(resumed.continuation.worker_routing, ROUTING_DECISION);
  assert.equal(resumed.recovery.pack_status, "missing");
  assert.equal(resumed.recovery.degraded, true);
});

test("a real Delivery lifecycle write preserves routing in Runtime and Continuation", async (t) => {
  const root = await temporaryCurrentWorkspace(t, "hw-c23-m7-routing-transition-");
  await seedRoutingRuntime(root, STANDARD_ROUTING_DECISION);
  const evidence = await writeWorkerEvidence(root, ["test", "implement", "audit"], {
    object_id: OBJECT_REF.id,
    prefix: "routing-transition",
  });
  const store = CORE.createDeliveryStore({ clock: () => FIXED_NOW });
  const verified = await store.verify(root, {
    object_ref: OBJECT_REF,
    evidence,
  }, { id: "m7-routing-lifecycle-verify" });
  assert.equal(verified.status, "verified");
  assert.deepEqual(verified.worker_routing, STANDARD_ROUTING_DECISION);

  const resumed = await freshDeliveryCall(root, "resume", [{}], FIXED_NOW);
  assert.equal(resumed.delivery.status, "verified");
  assert.deepEqual(resumed.delivery.worker_routing, STANDARD_ROUTING_DECISION);
  assert.deepEqual(resumed.continuation.worker_routing, STANDARD_ROUTING_DECISION);
});

test("worker Journal and Recovery Capsule preserve restart-safe routing and visible assessment", async (t) => {
  const root = await temporaryCurrentWorkspace(t, "hw-c23-m7-routing-capsule-");
  await seedRoutingRuntime(root);
  const recovery = CORE.createRecoveryStore({ clock: () => FIXED_NOW });
  await recovery.appendRecoveryEvent(root, {
    object_ref: OBJECT_REF,
    session_id: "session-routing",
    writer: { kind: "subagent", id: "worker-test-1" },
    turn_id: "turn-routing",
    type: "worker.started",
    summary: "The test worker started with semantic routing metadata.",
    payload: {
      writer: { kind: "subagent", id: "worker-test-1" },
      role: "test",
      evidence_refs: [],
      worker_routing: ROUTING_DECISION,
    },
  });
  const replay = await recovery.replayRecoveryJournal(root, { object_ref: OBJECT_REF });
  assert.deepEqual(replay.events[0].payload.worker_routing, ROUTING_DECISION);

  const runtime = await CORE.readRuntimeObject(root, OBJECT_REF);
  const written = await recovery.updateContextCapsule(root, {
    object_ref: OBJECT_REF,
    sources: { records: [], continuation: runtime.continuation, receipts: [] },
  }, { id: "m7-routing-capsule" });
  assert.deepEqual(written.capsule.context.worker_routing, ROUTING_DECISION);
  assert.deepEqual(written.capsule.context.workers[0].worker_routing, ROUTING_DECISION);
  assert.doesNotMatch(JSON.stringify(written.capsule), /"(?:prompt|hidden_reasoning|chain_of_thought)"\s*:/i);
});

test("Codex SubagentStart records and displays semantic routing without resolving a host implementation", async (t) => {
  const root = await temporaryCurrentWorkspace(t, "hw-c23-m7-routing-codex-");
  await seedRoutingRuntime(root);
  const output = await CORE.evaluateCodexHookEvent(root, {
    session_id: "session-codex-routing",
    transcript_path: null,
    cwd: root,
    hook_event_name: "SubagentStart",
    model: "host-default",
    permission_mode: "default",
    turn_id: "turn-codex-routing",
    agent_id: "worker-audit-1",
    agent_type: "audit",
  }, { id: "m7-codex-routing-start", clock: () => FIXED_NOW });
  const context = output.hookSpecificOutput.additionalContext;
  assert.match(context, /Worker 提醒/);
  assert.match(context, /Handoff/);
  assert.doesNotMatch(context, /Task Assessment|critical|worker-routing-v1|uncertainty/i);

  const replay = await CORE.createRecoveryStore({ clock: () => FIXED_NOW })
    .replayRecoveryJournal(root, { object_ref: OBJECT_REF });
  const started = replay.events.find((event) => event.type === "worker.started");
  assert.deepEqual(started.payload.worker_routing, ROUTING_DECISION);
  assertNoHostResolutionFields(started.payload.worker_routing);
});

test("Codex SubagentStop preserves the same worker's frozen started routing after Runtime advances", async (t) => {
  const root = await temporaryCurrentWorkspace(t, "hw-c23-m7-routing-codex-stop-");
  await seedRoutingRuntime(root, STANDARD_ROUTING_DECISION);
  const common = {
    session_id: "session-codex-frozen-routing",
    transcript_path: null,
    cwd: root,
    model: "host-default",
    permission_mode: "default",
    agent_id: "worker-test-frozen-1",
    agent_type: "test",
  };
  await CORE.evaluateCodexHookEvent(root, {
    ...common,
    hook_event_name: "SubagentStart",
    turn_id: "turn-codex-frozen-start",
  }, { id: "m7-codex-frozen-start", clock: () => FIXED_NOW });

  await writeRoutingRuntime(root, ROUTING_DECISION, "m7-routing-runtime-advanced");
  assert.deepEqual((await CORE.readRuntimeObject(root, OBJECT_REF)).runtime.worker_routing, ROUTING_DECISION);

  await CORE.evaluateCodexHookEvent(root, {
    ...common,
    hook_event_name: "SubagentStop",
    turn_id: "turn-codex-frozen-stop",
    agent_transcript_path: null,
    stop_hook_active: false,
    last_assistant_message: "Evidence: .pipeline/runtime/objects/delivery/routing-goal/evidence/frozen-worker.txt",
  }, { id: "m7-codex-frozen-stop", clock: () => FIXED_NOW });

  const replay = await CORE.createRecoveryStore({ clock: () => FIXED_NOW })
    .replayRecoveryJournal(root, { object_ref: OBJECT_REF });
  const workerEvents = replay.events.filter((event) => (
    event.writer.id === common.agent_id
    && ["worker.started", "worker.stopped"].includes(event.type)
  ));
  assert.deepEqual(workerEvents.map((event) => event.type), ["worker.started", "worker.stopped"]);
  assert.deepEqual(workerEvents[0].payload.worker_routing, STANDARD_ROUTING_DECISION);
  assert.deepEqual(workerEvents[1].payload.worker_routing, STANDARD_ROUTING_DECISION);
  assert.notDeepEqual(workerEvents[1].payload.worker_routing, ROUTING_DECISION);
  assertNoHostResolutionFields(workerEvents[1].payload.worker_routing);
});

test("Codex SubagentStop preserves an unrouted open worker after Runtime gains routing", async (t) => {
  const root = await temporaryCurrentWorkspace(t, "hw-c23-m7-routing-codex-unrouted-stop-");
  await seedUnroutedRuntime(root);
  const common = {
    session_id: "session-codex-frozen-unrouted",
    transcript_path: null,
    cwd: root,
    model: "host-default",
    permission_mode: "default",
    agent_id: "worker-test-frozen-unrouted-1",
    agent_type: "test",
  };
  await CORE.evaluateCodexHookEvent(root, {
    ...common,
    hook_event_name: "SubagentStart",
    turn_id: "turn-codex-frozen-unrouted-start",
  }, { id: "m7-codex-frozen-unrouted-start", clock: () => FIXED_NOW });

  let replay = await CORE.createRecoveryStore({ clock: () => FIXED_NOW })
    .replayRecoveryJournal(root, { object_ref: OBJECT_REF });
  const started = replay.events.find((event) => (
    event.type === "worker.started" && event.writer.id === common.agent_id
  ));
  assert.ok(started);
  assert.equal(Object.hasOwn(started.payload, "worker_routing"), false);

  await writeRoutingRuntime(root, ROUTING_DECISION, "m7-routing-runtime-unrouted-advanced");
  assert.deepEqual((await CORE.readRuntimeObject(root, OBJECT_REF)).runtime.worker_routing, ROUTING_DECISION);

  const fallbackAgentId = "worker-test-missing-start-fallback-1";
  await CORE.evaluateCodexHookEvent(root, {
    ...common,
    hook_event_name: "SubagentStop",
    turn_id: "turn-codex-missing-start-fallback-stop",
    agent_id: fallbackAgentId,
    agent_transcript_path: null,
    stop_hook_active: false,
    last_assistant_message: "Evidence: .pipeline/runtime/objects/delivery/routing-goal/evidence/missing-start-fallback.txt",
  }, { id: "m7-codex-missing-start-fallback-stop", clock: () => FIXED_NOW });

  replay = await CORE.createRecoveryStore({ clock: () => FIXED_NOW })
    .replayRecoveryJournal(root, { object_ref: OBJECT_REF });
  const fallbackStopped = replay.events.find((event) => (
    event.type === "worker.stopped" && event.writer.id === fallbackAgentId
  ));
  assert.deepEqual(fallbackStopped.payload.worker_routing, ROUTING_DECISION);

  await CORE.evaluateCodexHookEvent(root, {
    ...common,
    hook_event_name: "SubagentStop",
    turn_id: "turn-codex-frozen-unrouted-stop",
    agent_transcript_path: null,
    stop_hook_active: false,
    last_assistant_message: "Evidence: .pipeline/runtime/objects/delivery/routing-goal/evidence/frozen-unrouted-worker.txt",
  }, { id: "m7-codex-frozen-unrouted-stop", clock: () => FIXED_NOW });

  replay = await CORE.createRecoveryStore({ clock: () => FIXED_NOW })
    .replayRecoveryJournal(root, { object_ref: OBJECT_REF });
  const workerEvents = replay.events.filter((event) => (
    event.writer.id === common.agent_id
    && ["worker.started", "worker.stopped"].includes(event.type)
  ));
  assert.deepEqual(workerEvents.map((event) => event.type), ["worker.started", "worker.stopped"]);
  assert.equal(Object.hasOwn(workerEvents[0].payload, "worker_routing"), false);
  assert.equal(Object.hasOwn(workerEvents[1].payload, "worker_routing"), false);
});

test("routing metadata is orthogonal to topology, role evidence, and acceptance readiness", () => {
  const topology = CORE.selectExecutionTopology(strictTopologyInput());
  const evidence = [
    workerEvidence("test", "worker-test"),
    workerEvidence("implement", "worker-implement"),
    workerEvidence("audit", "worker-audit"),
  ];
  const baseline = CORE.assessExecutionEvidence({ topology, evidence });
  const routed = CORE.assessExecutionEvidence({
    topology,
    evidence,
    worker_routing: ROUTING_DECISION,
    task_assessment: TASK_ASSESSMENT,
  });
  assert.deepEqual(routed, baseline);
  assert.equal(routed.ready, true);
  assert.deepEqual(routed.roles, ["test", "implement", "audit"]);
  assert.equal("worker_routing" in routed, false);
  assert.equal("assessment" in routed, false);
});

routingTest("Worker Routing stays a deterministic pure policy and emits no host resolution fields", async () => {
  const input = {
    ...FIXTURE.classification_cases[1].input,
    assessment: FIXTURE.task_assessment,
  };
  assert.deepEqual(
    ROUTING_PROBE.api.selectWorkerRouting(input),
    ROUTING_PROBE.api.selectWorkerRouting(structuredClone(input)),
  );
  for (const forbidden of ["model", "provider", "credential", "prompt", "reasoning_effort"]) {
    assert.throws(
      () => ROUTING_PROBE.api.validateTaskAssessment({ ...FIXTURE.task_assessment, [forbidden]: "host-owned" }),
      /assessment|schema|unsupported|field/i,
    );
  }
  const source = await readFile(fileURLToPath(ROUTING_API_URL), "utf8");
  assert.doesNotMatch(source, /\b(?:fetch|spawn|spawnSync|exec|execFile|execSync)\s*\(/);
  assert.doesNotMatch(source, /(?:responses\.create|chat\.completions|completions\.create)/i);
});

async function seedRoutingRuntime(root, workerRouting = ROUTING_DECISION) {
  await writeRoutingRuntime(root, workerRouting, "m7-routing-runtime");
  await CORE.writeActivePointer(root, {
    schema_version: "1",
    active: { delivery: OBJECT_REF },
  }, { id: "m7-routing-active" });
}

async function seedUnroutedRuntime(root) {
  await writeRoutingRuntime(root, undefined, "m7-routing-runtime-unrouted");
  await CORE.writeActivePointer(root, {
    schema_version: "1",
    active: { delivery: OBJECT_REF },
  }, { id: "m7-routing-active-unrouted" });
}

async function writeRoutingRuntime(root, workerRouting, transactionId) {
  const topology = CORE.selectExecutionTopology(strictTopologyInput());
  const routing = workerRouting === undefined ? {} : { worker_routing: workerRouting };
  await CORE.writeRuntimeObject(root, {
    object_ref: OBJECT_REF,
    runtime: {
      schema_version: "1",
      object_ref: OBJECT_REF,
      delivery_kind: "goal",
      status: "executing",
      revision: 0,
      plan_hash: "a".repeat(64),
      topology,
      ...routing,
      updated_at: FIXED_NOW,
    },
    continuation: {
      schema_version: "1",
      object_ref: OBJECT_REF,
      next_action: "start_routed_worker",
      plan_hash: "a".repeat(64),
      revision: 0,
      ...routing,
      updated_at: FIXED_NOW,
    },
  }, { id: transactionId });
}

function workerEvidence(role, workerId) {
  return {
    role,
    worker_id: workerId,
    status: "completed",
    evidence_refs: [{
      type: "file",
      path: `.pipeline/runtime/objects/delivery/routing-goal/evidence/${role}.txt`,
      digest: `sha256:${"a".repeat(64)}`,
    }],
  };
}

function assertNoHostResolutionFields(value) {
  const forbidden = new Set([
    "model",
    "model_id",
    "provider",
    "provider_id",
    "credential",
    "credentials",
    "prompt",
    "prompt_text",
    "reasoning_effort",
  ]);
  const visit = (nested) => {
    if (!nested || typeof nested !== "object") return;
    if (Array.isArray(nested)) {
      nested.forEach(visit);
      return;
    }
    for (const [key, child] of Object.entries(nested)) {
      assert.equal(forbidden.has(key.toLowerCase()), false, `host-owned resolution field ${key} must not be emitted`);
      visit(child);
    }
  };
  visit(value);
}

function assertIdentifierBoundRejection(run, value, label) {
  assert.throws(
    run,
    (error) => {
      const rendered = String(error?.message || error);
      assert.match(rendered, /identifier|byte|128|length|bound|routing|assessment|failure/i, label);
      assert.equal(rendered.includes(value), false, `${label} must not echo the rejected identifier`);
      return true;
    },
    label,
  );
}

function resolveLocalSchemaRef(schema, node) {
  if (!node?.$ref) return node;
  assert.match(node.$ref, /^#\//, "config.schema Worker Routing refs must be local");
  return node.$ref
    .slice(2)
    .split("/")
    .map((part) => part.replaceAll("~1", "/").replaceAll("~0", "~"))
    .reduce((current, part) => current?.[part], schema);
}

function rawWorkerRoutingOverrideMatchesSchema(policy, candidate) {
  if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) return false;
  const properties = policy?.properties || {};
  const keys = Object.keys(candidate);
  if (policy?.additionalProperties === false && keys.some((key) => !Object.hasOwn(properties, key))) {
    return false;
  }
  if ((policy?.required || []).some((key) => !Object.hasOwn(candidate, key))) return false;
  return Object.entries(candidate).every(([key, value]) => {
    const field = properties[key];
    if (!field) return policy?.additionalProperties !== false;
    if (field.type === "string" && typeof value !== "string") return false;
    if (field.type === "integer" && !Number.isInteger(value)) return false;
    if (Array.isArray(field.enum) && !field.enum.includes(value)) return false;
    if (Object.hasOwn(field, "const") && field.const !== value) return false;
    return true;
  });
}
