import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import * as CORE from "../src/index.js";
import {
  expectZeroWriteRejection,
  snapshotTree,
  temporaryCurrentWorkspace,
  writeText,
} from "./fixtures/c21-m2/helpers.js";
import {
  cyclePlanInput,
  goalDesignInput,
  issueDeliveryReceipt,
  soloTopologyInput,
  writeWorkerEvidence,
} from "./fixtures/c21-m6/helpers.js";

const NOW = "2026-07-29T05:00:00+08:00";
const LATER = "2026-07-29T05:05:00+08:00";
const AFTER = "2026-07-29T05:10:00+08:00";
const REQUIRED_ROOT_API = Object.freeze([
  "normalizeWorkItemRef",
  "createRepositoryTargetStore",
  "createWorkPlacementStore",
]);
const REPOSITORY_METHODS = Object.freeze(["register", "read", "list", "updateLocator"]);
const PLACEMENT_METHODS = Object.freeze([
  "assess",
  "assessAndAcquire",
  "read",
  "list",
  "renew",
  "release",
  "bindSession",
  "resolveSession",
  "recordIntegration",
  "assertCompletionAllowed",
]);
const FIXTURE_PATH = fileURLToPath(new URL("./fixtures/concurrent-work-placement/cryo-computing.json", import.meta.url));
const ACQUIRE_CHILD = fileURLToPath(new URL("./fixtures/concurrent-work-placement/acquire-child.mjs", import.meta.url));
const hasPlacementApi = REQUIRED_ROOT_API.every((name) => typeof CORE[name] === "function");
const placementTest = hasPlacementApi ? test : test.skip;

test("Core publishes one generalized Work Item, Repository Target, and Placement contract", () => {
  for (const name of REQUIRED_ROOT_API) {
    assert.equal(typeof CORE[name], "function", `${name} must be exported from the Core root`);
  }
  if (!hasPlacementApi) return;
  const repositories = createRepositoryStore();
  for (const method of REPOSITORY_METHODS) {
    assert.equal(typeof repositories[method], "function", `Repository Target store must expose ${method}`);
  }
  const placements = createPlacementStore();
  for (const method of PLACEMENT_METHODS) {
    assert.equal(typeof placements[method], "function", `Work Placement store must expose ${method}`);
  }
});

placementTest("Work Item refs cover every Delivery mode and Experiment without accepting worker Activities", () => {
  assert.deepEqual(CORE.normalizeWorkItemRef({ kind: "delivery", id: "cycle-a" }), {
    kind: "delivery",
    id: "cycle-a",
  });
  assert.deepEqual(CORE.normalizeWorkItemRef({ kind: "experiment", id: "trace-a" }), {
    kind: "experiment",
    id: "trace-a",
  });
  assert.throws(
    () => CORE.normalizeWorkItemRef({ kind: "activity", id: "worker-a" }),
    /work item|delivery|experiment|kind/i,
  );
});

placementTest("Repository Target registry keeps stable identity while locator changes and rejects invalid targets without writes", async (t) => {
  const root = await temporaryCurrentWorkspace(t, "hw-placement-repositories-");
  const fixture = await readFixture();
  const store = createRepositoryStore();
  const registered = [];
  for (const repository of fixture.repositories) {
    registered.push(await store.register(root, repository, { id: `register-${repository.id}` }));
  }

  assert.deepEqual((await store.list(root)).map(({ id }) => id), ["accel-sim", "llm-trace"]);
  assert.equal(registered[0].generation, 1);
  assert.equal(registered[0].repository_identity.canonical_id, "cryo-computing/accel-sim");
  assert.equal(registered[0].integration_targets.filter(({ role }) => role === "primary").length, 1);

  const moved = await store.updateLocator(root, {
    repository_id: "accel-sim",
    expected_generation: registered[0].generation,
    locator: { path: "repositories/Accel-Sim", availability: "available" },
  }, { id: "move-accel-sim" });
  assert.equal(moved.generation, 2);
  assert.equal(moved.locator.path, "repositories/Accel-Sim");
  assert.deepEqual(moved.repository_identity, registered[0].repository_identity);
  assert.equal((await store.read(root, "accel-sim")).locator.path, "repositories/Accel-Sim");

  await expectZeroWriteRejection(
    root,
    () => store.updateLocator(root, {
      repository_id: "accel-sim",
      expected_generation: registered[0].generation,
      locator: { path: "stale/Accel-Sim", availability: "available" },
    }, { id: "move-accel-sim-stale" }),
    /generation|stale|conflict/i,
  );
  await expectZeroWriteRejection(
    root,
    () => store.register(root, {
      ...fixture.repositories[0],
      id: "unsafe-target",
      locator: { path: "../escape", availability: "available" },
    }, { id: "register-unsafe-target" }),
    /path|traversal|unsafe|locator/i,
  );
});

placementTest("table-driven assessment separates shared, worktree, resource-isolated, and blocked placements", async (t) => {
  const root = await preparedPlacementWorkspace(t, "hw-placement-matrix-");
  const store = createPlacementStore();
  for (const id of [
    "reader-a",
    "reader-b",
    "reader-other-snapshot",
    "builder",
    "cache-writer",
    "output-conflict",
    "dirty-reader",
    "gpu-conflict",
    "gpu-owner",
  ]) await seedExperiment(root, id);
  await store.assessAndAcquire(root, placementInput("reader-a", {
    work_item_ref: { kind: "experiment", id: "reader-a" },
    repository_claims: [repositoryClaim("accel-sim", "read", "a")],
    resource_claims: [filesystemClaim("attempt-a", "/data/Cryo/attempt-a")],
  }), { id: "acquire-reader-a" });

  const cases = [
    {
      name: "same pinned read with unique output",
      input: placementInput("reader-b", {
        work_item_ref: { kind: "experiment", id: "reader-b" },
        repository_claims: [repositoryClaim("accel-sim", "execute", "a")],
        resource_claims: [filesystemClaim("attempt-b", "/data/Cryo/attempt-b")],
      }),
      expected: "shared",
    },
    {
      name: "different immutable snapshot",
      input: placementInput("reader-other-snapshot", {
        repository_claims: [repositoryClaim("accel-sim", "read", "c")],
      }),
      expected: "isolated_worktree",
    },
    {
      name: "source build mutation",
      input: placementInput("builder", {
        repository_claims: [{
          ...repositoryClaim("accel-sim", "build", "a"),
          integration_target_id: "accel-sim-primary",
        }],
      }),
      expected: "isolated_worktree",
    },
    {
      name: "mutable cache can be relocated",
      input: placementInput("cache-writer", {
        resource_claims: [{
          kind: "cache",
          id: "compiler-cache",
          mode: "mutable",
          locator: ".cache/compiler",
          isolation: "relocatable",
        }],
      }),
      expected: "isolated_resources",
    },
    {
      name: "fixed output overlap",
      input: placementInput("output-conflict", {
        resource_claims: [filesystemClaim("attempt-a-copy", "/data/Cryo/attempt-a")],
      }),
      expected: "blocked",
    },
    {
      name: "unowned dirty checkout",
      input: placementInput("dirty-reader", {
        repository_claims: [{
          ...repositoryClaim("accel-sim", "read", "a"),
          workspace_state: { dirty: true, ownership: "unowned" },
        }],
      }),
      expected: "blocked",
    },
    {
      name: "exclusive GPU overlap",
      input: placementInput("gpu-conflict", {
        resource_claims: [{ kind: "gpu", id: "gpu-0", mode: "exclusive" }],
      }),
      seed: placementInput("gpu-owner", {
        resource_claims: [{ kind: "gpu", id: "gpu-0", mode: "exclusive" }],
      }),
      expected: "blocked",
    },
  ];

  for (const entry of cases) {
    await t.test(entry.name, async () => {
      if (entry.seed) await store.assessAndAcquire(root, entry.seed, { id: `seed-${entry.seed.id}` });
      const before = await snapshotTree(root);
      const result = await store.assess(root, entry.input);
      assert.equal(result.decision, entry.expected);
      if (entry.name === "different immutable snapshot") {
        assert.equal(result.host_actions[0].kind, "git_worktree_add");
        assert.equal(result.host_actions[0].repository_id, "accel-sim");
      }
      if (entry.name === "mutable cache can be relocated") {
        assert.equal(result.resource_allocations.length, 1);
        assert.match(result.resource_allocations[0].allocated_locator, /cache-writer\/cache-compiler-cache$/);
      }
      assert.deepEqual(await snapshotTree(root), before, "assessment must be read-only");
    });
  }
});

placementTest("Cryo-Computing Accel-Sim development and Trace production acquire compatible isolated placements", async (t) => {
  const root = await temporaryCurrentWorkspace(t, "hw-placement-cryo-");
  const fixture = await readFixture();
  const repositoryStore = createRepositoryStore();
  for (const repository of fixture.repositories) {
    await repositoryStore.register(root, repository, { id: `cryo-register-${repository.id}` });
  }
  await seedCycle(root, fixture.lanes.accel_subproject.work_item_ref.id);
  await seedExperiment(root, fixture.lanes.trace_production.work_item_ref.id);
  const store = createPlacementStore();
  const [accel, trace] = await Promise.all([
    store.assessAndAcquire(root, fixture.lanes.accel_subproject, { id: "cryo-acquire-accel" }),
    store.assessAndAcquire(root, fixture.lanes.trace_production, { id: "cryo-acquire-trace" }),
  ]);

  assert.equal(accel.decision, "isolated_worktree");
  assert.equal(trace.decision, "isolated_worktree");
  assert.equal(accel.lease.status, "active");
  assert.equal(trace.lease.status, "active");
  assert.notEqual(accel.lease.fencing_token, trace.lease.fencing_token);
  assert.deepEqual((await store.list(root)).map(({ id }) => id), [
    "accel-subproject-placement",
    "trace-production-placement",
  ]);

  for (const placement of [accel, trace]) {
    assert.ok(placement.host_actions.length > 0, "source-changing lanes need explicit Host actions");
    for (const action of placement.host_actions) {
      assert.equal(Array.isArray(action.argv), true, "Host actions use bounded argv arrays");
      assert.equal(Object.hasOwn(action, "command"), false, "Host actions do not carry shell strings");
      assert.doesNotMatch(JSON.stringify(action), /&&|;|\$\(|`/);
    }
  }
  assert.equal(
    trace.repository_claims.find(({ repository_id }) => repository_id === "accel-sim").access,
    "execute",
  );
});

placementTest("Sessions select exactly one Work Item and an unbound Session never inherits a legacy foreground", async (t) => {
  const root = await preparedPlacementWorkspace(t, "hw-placement-sessions-");
  await seedCycle(root, "cycle-a");
  await seedExperiment(root, "experiment-b");
  const store = createPlacementStore();
  const first = await store.assessAndAcquire(root, placementInput("session-a", {
    work_item_ref: { kind: "delivery", id: "cycle-a" },
    session_binding: { host: "codex", session_id: "codex-session-a" },
    repository_claims: [repositoryClaim("accel-sim", "read", "a")],
  }), { id: "acquire-session-a" });
  const second = await store.assessAndAcquire(root, placementInput("session-b", {
    work_item_ref: { kind: "experiment", id: "experiment-b" },
    session_binding: { host: "codex", session_id: "codex-session-b" },
    repository_claims: [repositoryClaim("llm-trace", "read", "b")],
  }), { id: "acquire-session-b" });

  const selected = await store.resolveSession(root, { host: "codex", session_id: "codex-session-a" });
  assert.equal(selected.status, "selected");
  assert.deepEqual(selected.work_item_ref, first.work_item_ref);
  assert.notDeepEqual(selected.work_item_ref, second.work_item_ref);

  const unbound = await store.resolveSession(root, { host: "codex", session_id: "codex-session-new" });
  assert.equal(unbound.status, "selection_required");
  assert.deepEqual(unbound.candidates.map(({ work_item_ref }) => work_item_ref), [
    first.work_item_ref,
    second.work_item_ref,
  ]);

  await expectZeroWriteRejection(
    root,
    () => store.bindSession(root, {
      host: "codex",
      session_id: "codex-session-a",
      work_item_ref: second.work_item_ref,
    }, { id: "conflicting-session-rebind" }),
    /session|already|selected|bound|conflict/i,
  );

  const collaborator = await store.bindSession(root, {
    host: "codex",
    session_id: "codex-session-collaborator",
    work_item_ref: first.work_item_ref,
  }, { id: "bind-collaborator" });
  assert.equal(collaborator.status, "selected");
  assert.deepEqual(collaborator.work_item_ref, first.work_item_ref);
});

placementTest("fresh processes cannot both acquire the same exclusive claim and stale fencing cannot release the winner", async (t) => {
  const root = await preparedPlacementWorkspace(t, "hw-placement-atomic-");
  await seedExperiment(root, "atomic-a");
  await seedExperiment(root, "atomic-b");
  const contenders = ["atomic-a", "atomic-b"].map((id) => placementInput(id, {
    work_item_ref: { kind: "experiment", id },
    resource_claims: [
      { kind: "gpu", id: "gpu-atomic", mode: "exclusive" },
      filesystemClaim(`${id}-output`, `/data/Cryo/${id}`),
    ],
  }));
  const results = await Promise.all(contenders.map((input, index) => runAcquireChild(
    root,
    input,
    `fresh-process-contender-${index + 1}`,
  )));
  assert.equal(results.every(({ ok }) => ok), true, JSON.stringify(results));
  assert.deepEqual(results.map(({ result }) => result.decision).sort(), ["blocked", "shared"]);

  const store = createPlacementStore();
  const active = (await store.list(root)).filter(({ lease }) => lease?.status === "active");
  assert.equal(active.length, 1, "exactly one active lease survives the race");
  await expectZeroWriteRejection(
    root,
    () => store.release(root, {
      placement_id: active[0].id,
      fencing_token: "stale-fencing-token",
    }, { id: "stale-fencing-release" }),
    /fencing|stale|lease|owner/i,
  );
  const released = await store.release(root, {
    placement_id: active[0].id,
    fencing_token: active[0].lease.fencing_token,
  }, { id: "winner-release" });
  assert.equal(released.lease.status, "released");
});

placementTest("expired leases leave Session selection and can be renewed only by the fenced owner", async (t) => {
  const root = await preparedPlacementWorkspace(t, "hw-placement-expiry-");
  await seedExperiment(root, "expiring-experiment");
  await seedExperiment(root, "replacement-experiment");
  let currentTime = NOW;
  const store = CORE.createWorkPlacementStore({ clock: () => currentTime, lease_ttl_ms: 1_000 });
  const placement = await store.assessAndAcquire(root, placementInput("expiring-placement", {
    work_item_ref: { kind: "experiment", id: "expiring-experiment" },
    resource_claims: [{ kind: "gpu", id: "gpu-expiring", mode: "exclusive" }],
  }), { id: "expiring-placement-acquire" });
  assert.equal((await store.resolveSession(root, placement.session_binding)).status, "selected");

  currentTime = LATER;
  assert.equal((await store.list(root))[0].status, "expired");
  const expired = await store.resolveSession(root, placement.session_binding);
  assert.equal(expired.status, "none");
  assert.deepEqual(expired.candidates, []);
  const hostStatus = await CORE.refreshHostStatusProjection(root, {
    clock: () => currentTime,
    id: "expired-host-status",
    host: placement.session_binding.host,
    session_id: placement.session_binding.session_id,
  });
  assert.equal(hostStatus.work_items[0].status, "expired");
  assert.equal(hostStatus.session.status, "none");
  await expectZeroWriteRejection(
    root,
    () => store.renew(root, {
      placement_id: placement.id,
      fencing_token: "stale-fencing-token",
    }, { id: "expired-stale-renew" }),
    /fencing|stale/i,
  );
  await store.renew(root, {
    placement_id: placement.id,
    fencing_token: placement.lease.fencing_token,
  }, { id: "expired-owner-renew" });
  assert.equal((await store.resolveSession(root, placement.session_binding)).status, "selected");

  currentTime = AFTER;
  await store.assessAndAcquire(root, placementInput("replacement-placement", {
    work_item_ref: { kind: "experiment", id: "replacement-experiment" },
    resource_claims: [{ kind: "gpu", id: "gpu-expiring", mode: "exclusive" }],
  }), { id: "replacement-placement-acquire" });
  await expectZeroWriteRejection(
    root,
    () => store.renew(root, {
      placement_id: placement.id,
      fencing_token: placement.lease.fencing_token,
    }, { id: "expired-owner-after-replacement" }),
    /conflict|owner|resource/i,
  );
});

placementTest("source-changing Delivery cannot request acceptance before verified integration evidence", async (t) => {
  const root = await temporaryCurrentWorkspace(t, "hw-placement-integration-");
  const fixture = await readFixture();
  const repositories = createRepositoryStore();
  await repositories.register(root, fixture.repositories[0], { id: "integration-register-accel" });
  const deliveryStore = CORE.createDeliveryStore({ clock: () => NOW });
  let delivery = await deliveryStore.proposeGoal(root, {
    design: CORE.compileGoalDesign(goalDesignInput({
      id: "integration-goal",
      title: "Integrate Accel-Sim source changes",
    })),
    topology: CORE.selectExecutionTopology(soloTopologyInput()),
  }, { id: "integration-propose" });
  const approval = await issueDeliveryReceipt(CORE, root, delivery, "delivery.approve_and_start", {
    transaction_id: "integration-approval-receipt",
    tool_use_id: "integration-approval-tool",
  });
  delivery = await deliveryStore.approveAndStart(root, approval, { id: "integration-start" });

  const placements = createPlacementStore();
  const placement = await placements.assessAndAcquire(root, placementInput("integration-placement", {
    work_item_ref: delivery.object_ref,
    repository_claims: [{
      ...repositoryClaim("accel-sim", "write", "a"),
      integration_target_id: "accel-sim-primary",
    }],
  }), { id: "integration-placement-acquire" });
  const evidence = await writeWorkerEvidence(root, ["implement"], {
    object_id: delivery.object_ref.id,
    prefix: "integration-delivery",
  });
  delivery = await deliveryStore.verify(root, { object_ref: delivery.object_ref, evidence }, {
    id: "integration-delivery-verify",
  });
  assert.equal(delivery.status, "verified");
  const mergeEvidence = await integrationEvidence(root);

  const prematureAcceptanceError = await expectZeroWriteRejection(
    root,
    () => deliveryStore.requestAcceptance(root, { object_ref: delivery.object_ref }, {
      id: "integration-premature-acceptance",
    }),
    /integration|required|merge|source/i,
  );
  assert.doesNotMatch(String(prematureAcceptanceError.message), /abandon/i);
  assert.equal((await placements.assertCompletionAllowed(root, delivery.object_ref)).allowed, false);

  await expectZeroWriteRejection(
    root,
    () => placements.recordIntegration(root, {
      placement_id: placement.id,
      fencing_token: placement.lease.fencing_token,
      repository_id: "accel-sim",
      integration_target_id: "accel-sim-primary",
      evidence: {
        ...mergeEvidence,
        proof: { ...mergeEvidence.proof, digest: `sha256:${"0".repeat(64)}` },
      },
    }, { id: "integration-forged-proof" }),
    /proof|digest|evidence/i,
  );

  const registeredProofPath = join(root, mergeEvidence.proof.path);
  const registeredProofBytes = await readFile(registeredProofPath);
  const unboundTargetProof = JSON.parse(registeredProofBytes.toString("utf8"));
  unboundTargetProof.verification.target_head.argv = ["git", "rev-parse", mergeEvidence.result_commit];
  const unboundTargetContent = `${JSON.stringify(unboundTargetProof, null, 2)}\n`;
  await writeText(registeredProofPath, unboundTargetContent);
  await expectZeroWriteRejection(
    root,
    () => placements.recordIntegration(root, {
      placement_id: placement.id,
      fencing_token: placement.lease.fencing_token,
      repository_id: "accel-sim",
      integration_target_id: "accel-sim-primary",
      evidence: {
        ...mergeEvidence,
        proof: {
          ...mergeEvidence.proof,
          digest: `sha256:${createHash("sha256").update(unboundTargetContent).digest("hex")}`,
        },
      },
    }, { id: "integration-unbound-target-proof" }),
    /target|proof|ancestry/i,
  );
  await writeText(registeredProofPath, registeredProofBytes);

  await expectZeroWriteRejection(
    root,
    () => placements.recordIntegration(root, {
      placement_id: placement.id,
      fencing_token: placement.lease.fencing_token,
      repository_id: "accel-sim",
      integration_target_id: "other-target",
      evidence: mergeEvidence,
    }, { id: "integration-wrong-target" }),
    /integration target|target|mismatch|evidence/i,
  );
  await placements.recordIntegration(root, {
    placement_id: placement.id,
    fencing_token: placement.lease.fencing_token,
    repository_id: "accel-sim",
    integration_target_id: "accel-sim-primary",
    evidence: mergeEvidence,
  }, { id: "integration-record" });
  assert.equal((await placements.assertCompletionAllowed(root, delivery.object_ref)).allowed, true);
  const proofPath = join(root, mergeEvidence.proof.path);
  const proofBytes = await readFile(proofPath);
  await writeText(proofPath, `${proofBytes.toString("utf8").trimEnd()}\n `);
  assert.equal((await placements.assertCompletionAllowed(root, delivery.object_ref)).allowed, false);
  await writeText(proofPath, proofBytes);
  assert.equal((await placements.assertCompletionAllowed(root, delivery.object_ref)).allowed, true);
  delivery = await deliveryStore.requestAcceptance(root, { object_ref: delivery.object_ref }, {
    id: "integration-request-acceptance",
  });
  assert.equal(delivery.status, "pending_acceptance");
});

placementTest("legacy Delivery and Experiment authorities coexist without a Repository Target registry", async (t) => {
  const root = await temporaryCurrentWorkspace(t, "hw-placement-legacy-");
  const deliveryStore = CORE.createDeliveryStore({ clock: () => NOW });
  const experimentStore = CORE.createExperimentStore({ clock: () => NOW });
  const delivery = await deliveryStore.proposeGoal(root, {
    design: CORE.compileGoalDesign(goalDesignInput({ id: "legacy-delivery" })),
    topology: CORE.selectExecutionTopology(soloTopologyInput()),
  }, { id: "legacy-delivery-propose" });
  const experimentInput = experimentFixture("legacy-experiment");
  const experiment = await experimentStore.create(root, experimentInput, { id: "legacy-experiment-create" });

  assert.deepEqual(CORE.normalizeWorkItemRef(delivery.object_ref), delivery.object_ref);
  assert.deepEqual(CORE.normalizeWorkItemRef(experiment.object_ref), experiment.object_ref);
  assert.deepEqual(await createRepositoryStore().list(root), []);
  assert.equal((await deliveryStore.read(root, delivery.object_ref)).status, "proposed");
  assert.equal((await experimentStore.read(root, experiment.object_ref)).lifecycle, "active");
});

function createRepositoryStore() {
  return CORE.createRepositoryTargetStore({ clock: () => NOW });
}

function createPlacementStore() {
  return CORE.createWorkPlacementStore({ clock: () => NOW, lease_ttl_ms: 300_000 });
}

async function preparedPlacementWorkspace(t, prefix) {
  const root = await temporaryCurrentWorkspace(t, prefix);
  const fixture = await readFixture();
  const repositories = createRepositoryStore();
  for (const repository of fixture.repositories) {
    await repositories.register(root, repository, { id: `${prefix}${repository.id}`.replace(/[^a-z0-9-]/g, "-") });
  }
  return root;
}

async function seedCycle(root, id) {
  const store = CORE.createDeliveryStore({ clock: () => NOW });
  let delivery = await store.proposeCycle(root, {
    plan: CORE.compileCyclePlan(cyclePlanInput({ id, title: `Cycle ${id}` })),
    topology: CORE.selectExecutionTopology(soloTopologyInput()),
  }, { id: `${id}-propose` });
  const approval = await issueDeliveryReceipt(CORE, root, delivery, "delivery.approve_and_start", {
    transaction_id: `${id}-approval-receipt`,
    tool_use_id: `${id}-approval-tool`,
  });
  delivery = await store.approveAndStart(root, approval, { id: `${id}-start` });
  return delivery;
}

async function seedExperiment(root, id) {
  return CORE.createExperimentStore({ clock: () => NOW }).create(
    root,
    experimentFixture(id),
    { id: `${id}-create` },
  );
}

function placementInput(id, overrides = {}) {
  return {
    id,
    work_item_ref: overrides.work_item_ref ?? { kind: "experiment", id },
    session_binding: overrides.session_binding ?? { host: "codex", session_id: `session-${id}` },
    repository_claims: overrides.repository_claims ?? [],
    resource_claims: overrides.resource_claims ?? [],
    worktree_root: overrides.worktree_root ?? ".hypo-worktrees/Cryo-Computing",
  };
}

function repositoryClaim(repositoryId, access, commitSeed) {
  return {
    repository_id: repositoryId,
    access,
    snapshot: { commit: commitSeed.repeat(40) },
  };
}

function filesystemClaim(id, locator) {
  return { kind: "filesystem", id, mode: "exclusive", locator };
}

async function integrationEvidence(root) {
  const evidence = {
    method: "merge",
    base_commit: "a".repeat(40),
    source_commit: "c".repeat(40),
    result_commit: "d".repeat(40),
    target_contains_source: true,
    verified_at: LATER,
  };
  const proof = {
    schema_version: "1",
    repository_id: "accel-sim",
    repository_identity: { vcs: "git", canonical_id: "cryo-computing/accel-sim" },
    repository_generation: 1,
    integration_target_id: "accel-sim-primary",
    base_commit: evidence.base_commit,
    source_commit: evidence.source_commit,
    result_commit: evidence.result_commit,
    target_head: evidence.result_commit,
    verification: {
      target_head: {
        argv: ["git", "-C", "Accel-Sim", "rev-parse", "refs/heads/main"],
        exit_code: 0,
        stdout_commit: evidence.result_commit,
        stdout_sha256: createHash("sha256").update(`${evidence.result_commit}\n`).digest("hex"),
      },
      ancestry: {
        argv: ["git", "-C", "Accel-Sim", "merge-base", "--is-ancestor", evidence.source_commit, "refs/heads/main"],
        exit_code: 0,
        stdout_sha256: createHash("sha256").update("").digest("hex"),
      },
    },
    verified_at: evidence.verified_at,
  };
  const path = ".pipeline/runtime/integration-evidence/accel-sim-proof.json";
  const content = `${JSON.stringify(proof, null, 2)}\n`;
  await writeText(join(root, path), content);
  return {
    ...evidence,
    proof: {
      type: "file",
      path,
      digest: `sha256:${createHash("sha256").update(content).digest("hex")}`,
    },
  };
}

function experimentFixture(id) {
  return {
    id,
    title: `Experiment ${id}`,
    project_ref: { kind: "project", id: "m2-fixture-project" },
    lane: "experiment",
    hypothesis: "A compatibility fixture remains readable without placement metadata.",
    design: {
      kind: "screening",
      parameters: { variant: ["baseline"] },
      dataset_ref: "compatibility-fixture",
    },
    baseline: {
      id: `${id}-baseline`,
      code_ref: "git:compatibility-baseline",
      dataset_ref: "compatibility-fixture",
      metric: { name: "value", value: 1, unit: "count" },
    },
  };
}

async function readFixture() {
  return JSON.parse(await readFile(FIXTURE_PATH, "utf8"));
}

async function runAcquireChild(root, input, transactionId) {
  const encoded = Buffer.from(JSON.stringify(input)).toString("base64url");
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [ACQUIRE_CHILD, root, encoded, transactionId], {
      cwd: root,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.once("error", reject);
    child.once("close", (code) => {
      if (code !== 0) {
        reject(new Error(stderr || stdout || `acquire child exited with ${code}`));
        return;
      }
      try {
        resolve(JSON.parse(stdout.trim()));
      } catch (error) {
        reject(new Error(`invalid acquire child output: ${stdout}\n${stderr}`, { cause: error }));
      }
    });
  });
}
