import test from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import { recoverWorkspaceTransaction } from "../src/workspace-store/index.js";
import { parseYaml } from "../src/serialization/index.js";
import {
  FIXED_NOW,
  LATER_NOW,
  assertRecoveredWorkspaceMatches,
  exists,
  expectZeroWriteRejection,
  listFiles,
  readText,
  snapshotTree,
  temporaryCurrentWorkspace,
} from "./fixtures/c21-m2/helpers.js";

const REQUIRED_API = [
  "normalizeRuntimeObjectRef",
  "writeRuntimeObject",
  "readRuntimeObject",
  "writeActivePointer",
  "readActivePointer",
];

const RUNTIME_PROBE = await import("../src/runtime/index.js")
  .then((api) => ({ api, error: null }))
  .catch((error) => ({ api: null, error }));
const runtimeTest = RUNTIME_PROBE.error ? test.skip : test;

const REFS = Object.freeze({
  delivery: Object.freeze({ kind: "delivery", id: "goal-alpha" }),
  activity: Object.freeze({ kind: "activity", id: "analysis-storage" }),
  bootstrap_job: Object.freeze({ kind: "bootstrap_job", id: "init-reference" }),
});

test("runtime module publishes the M2 object and active-pointer API", async () => {
  const api = await loadRuntimeApi();
  for (const name of REQUIRED_API) assert.equal(typeof api[name], "function", `${name} must be exported`);
});

runtimeTest("Delivery, Activity, and Bootstrap Job own deterministic runtime and continuation files", async (t) => {
  const api = await loadRuntimeApi();
  const root = await temporaryCurrentWorkspace(t, "hw-m2-runtime-kinds-");

  for (const [kind, objectRef] of Object.entries(REFS)) {
    await t.test(kind, async () => {
      const input = objectInput(objectRef);
      const write = await api.writeRuntimeObject(root, input, { id: `runtime-${kind}-first` });
      assert.match(write.runtime_path, /^\.pipeline\/runtime\/objects\/.+\/runtime\.yaml$/);
      assert.match(write.continuation_path, /^\.pipeline\/runtime\/objects\/.+\/continuation\.yaml$/);
      assert.notEqual(write.runtime_path, write.continuation_path);
      assert.equal(await exists(join(root, write.runtime_path)), true);
      assert.equal(await exists(join(root, write.continuation_path)), true);

      const loaded = await api.readRuntimeObject(root, objectRef);
      assert.deepEqual(loaded.object_ref, objectRef);
      assert.deepEqual(loaded.runtime, input.runtime);
      assert.deepEqual(loaded.continuation, input.continuation);

      const before = {
        runtime: await readText(join(root, write.runtime_path)),
        continuation: await readText(join(root, write.continuation_path)),
      };
      await api.writeRuntimeObject(root, input, { id: `runtime-${kind}-repeat` });
      assert.equal(await readText(join(root, write.runtime_path)), before.runtime);
      assert.equal(await readText(join(root, write.continuation_path)), before.continuation);
    });
  }

  const files = await listFiles(root);
  assert.equal(files.filter((path) => path.endsWith("/runtime.yaml")).length, 3);
  assert.equal(files.filter((path) => path.endsWith("/continuation.yaml")).length, 3);
});

runtimeTest("active.yaml contains references only and round-trips without lifecycle copies", async (t) => {
  const api = await loadRuntimeApi();
  const root = await temporaryCurrentWorkspace(t, "hw-m2-active-pointer-");
  const pointer = {
    schema_version: "1",
    active: {
      delivery: REFS.delivery,
      activity: REFS.activity,
      bootstrap_job: REFS.bootstrap_job,
    },
  };

  const write = await api.writeActivePointer(root, pointer, { id: "active-pointer-roundtrip" });
  assert.equal(write.path, ".pipeline/runtime/active.yaml");
  assert.deepEqual(await api.readActivePointer(root), pointer);

  const onDisk = parseYaml(await readText(join(root, write.path)));
  assert.deepEqual(onDisk, pointer);
  assert.deepEqual(Object.keys(onDisk).sort(), ["active", "schema_version"]);
  assert.deepEqual(Object.keys(onDisk.active).sort(), ["activity", "bootstrap_job", "delivery"]);
  for (const ref of Object.values(onDisk.active)) {
    assert.deepEqual(Object.keys(ref).sort(), ["id", "kind"]);
  }
  assert.doesNotMatch(
    JSON.stringify(onDisk),
    /"(?:status|phase|progress|acceptance|continuation|next_action|payload)"/i,
  );
});

runtimeTest("active-pointer lifecycle payloads and invalid schemas fail before write", async (t) => {
  const api = await loadRuntimeApi();
  const root = await temporaryCurrentWorkspace(t, "hw-m2-active-invalid-");
  const invalidPointers = [
    {
      schema_version: "1",
      active: { delivery: { ...REFS.delivery, status: "executing" } },
    },
    {
      schema_version: "1",
      active: { delivery: REFS.delivery },
      continuation: { next_action: "implement" },
    },
    {
      schema_version: "999",
      active: { delivery: REFS.delivery },
    },
    {
      schema_version: "1",
      active: { delivery: REFS.delivery, activity: REFS.delivery },
    },
  ];

  for (const [index, pointer] of invalidPointers.entries()) {
    await expectZeroWriteRejection(
      root,
      () => api.writeActivePointer(root, pointer, { id: `invalid-pointer-${index}` }),
      /pointer|reference|schema|lifecycle|duplicate|collision|slot|kind/i,
    );
  }
});

runtimeTest("object reference normalization rejects traversal, absolute paths, aliases, and inconsistent keys", async () => {
  const api = await loadRuntimeApi();
  const normalized = api.normalizeRuntimeObjectRef(REFS.delivery);
  assert.equal(normalized.kind, REFS.delivery.kind);
  assert.equal(normalized.id, REFS.delivery.id);
  assert.match(normalized.key, /delivery.*goal-alpha/);
  assert.match(normalized.directory, /^\.pipeline\/runtime\/objects\//);

  const unsafe = [
    { kind: "../delivery", id: "goal-alpha" },
    { kind: "delivery", id: "../escape" },
    { kind: "delivery", id: "/tmp/escape" },
    { kind: "delivery", id: "goal/child" },
    { kind: "delivery", id: "goal-alpha", alias: "other-goal" },
    { kind: "delivery", id: "goal-alpha", key: "activity/goal-alpha" },
    { kind: "unknown", id: "goal-alpha" },
  ];
  for (const ref of unsafe) {
    assert.throws(() => api.normalizeRuntimeObjectRef(ref), /reference|kind|id|path|alias|key|unsafe/i);
  }
});

runtimeTest("outer ref, runtime ref, and continuation ref cannot target different objects", async (t) => {
  const api = await loadRuntimeApi();
  const root = await temporaryCurrentWorkspace(t, "hw-m2-runtime-cross-object-");
  const delivery = objectInput(REFS.delivery);
  await api.writeRuntimeObject(root, delivery, { id: "runtime-cross-seed" });
  const before = await snapshotTree(root);

  const mismatched = {
    object_ref: REFS.activity,
    runtime: delivery.runtime,
    continuation: continuationFor(REFS.activity),
  };
  await assert.rejects(
    api.writeRuntimeObject(root, mismatched, { id: "runtime-cross-reject" }),
    /object|reference|mismatch|overwrite|collision/i,
  );
  assert.deepEqual(await snapshotTree(root), before);
  await assert.rejects(api.readRuntimeObject(root, REFS.activity), /missing|not found|runtime|object/i);
  assert.deepEqual((await api.readRuntimeObject(root, REFS.delivery)).runtime, delivery.runtime);
});

runtimeTest("updating one runtime object cannot mutate another object", async (t) => {
  const api = await loadRuntimeApi();
  const root = await temporaryCurrentWorkspace(t, "hw-m2-runtime-isolation-");
  const delivery = objectInput(REFS.delivery);
  const activity = objectInput(REFS.activity);
  const first = await api.writeRuntimeObject(root, delivery, { id: "runtime-isolation-delivery" });
  const second = await api.writeRuntimeObject(root, activity, { id: "runtime-isolation-activity" });
  const deliveryBefore = {
    runtime: await readText(join(root, first.runtime_path)),
    continuation: await readText(join(root, first.continuation_path)),
  };
  const activityBefore = {
    runtime: await readText(join(root, second.runtime_path)),
    continuation: await readText(join(root, second.continuation_path)),
  };

  const updated = objectInput(REFS.delivery, {
    runtime: { status: "pending_acceptance", phase: "verify", updated_at: LATER_NOW },
    continuation: { next_action: "request_manual_acceptance", updated_at: LATER_NOW },
  });
  await api.writeRuntimeObject(root, updated, { id: "runtime-isolation-update" });

  assert.equal(await readText(join(root, second.runtime_path)), activityBefore.runtime);
  assert.equal(await readText(join(root, second.continuation_path)), activityBefore.continuation);
  assert.notEqual(await readText(join(root, first.runtime_path)), deliveryBefore.runtime);
  assert.notEqual(await readText(join(root, first.continuation_path)), deliveryBefore.continuation);
  assert.deepEqual((await api.readRuntimeObject(root, REFS.delivery)).runtime, updated.runtime);
});

runtimeTest("runtime writes use the M1 recoverable transaction seam", async (t) => {
  const api = await loadRuntimeApi();
  const root = await temporaryCurrentWorkspace(t, "hw-m2-runtime-transaction-");
  const before = await snapshotTree(root);
  const transactionId = "runtime-after-prepare";

  await assert.rejects(
    api.writeRuntimeObject(root, objectInput(REFS.delivery), {
      id: transactionId,
      faultInjector: async ({ phase }) => {
        if (phase === "after_prepare") throw new Error("injected M2 runtime interruption");
      },
    }),
    /injected M2 runtime interruption/,
  );

  assert.equal(
    await exists(join(root, ".pipeline", "runtime", "transactions", transactionId, "transaction.yaml")),
    true,
  );
  const during = await listFiles(root);
  assert.equal(during.some((path) => /objects\/.+\/runtime\.yaml$/.test(path)), false);
  assert.equal(during.some((path) => /objects\/.+\/continuation\.yaml$/.test(path)), false);

  assert.equal((await recoverWorkspaceTransaction(root, { id: transactionId })).action, "rolled_back");
  await assertRecoveredWorkspaceMatches(root, before);
  assert.equal((await recoverWorkspaceTransaction(root, { id: transactionId })).action, "none");
});

runtimeTest("invalid runtime or continuation schemas are zero-write failures", async (t) => {
  const api = await loadRuntimeApi();
  const root = await temporaryCurrentWorkspace(t, "hw-m2-runtime-schema-");
  const valid = objectInput(REFS.delivery);
  const invalid = [
    { ...valid, runtime: { ...valid.runtime, schema_version: "999" } },
    { ...valid, runtime: { ...valid.runtime, status: null } },
    { ...valid, continuation: { ...valid.continuation, schema_version: "999" } },
    { ...valid, continuation: { ...valid.continuation, next_action: null } },
    {
      ...valid,
      continuation: { ...valid.continuation, object_ref: REFS.activity },
    },
  ];
  for (const [index, input] of invalid.entries()) {
    await expectZeroWriteRejection(
      root,
      () => api.writeRuntimeObject(root, input, { id: `runtime-schema-${index}` }),
      /runtime|continuation|schema|status|action|reference/i,
    );
  }
});

runtimeTest("nested Runtime and Continuation payloads cannot duplicate each other's authority", async (t) => {
  const api = await loadRuntimeApi();
  const root = await temporaryCurrentWorkspace(t, "hw-m2-runtime-nested-authority-");
  const valid = objectInput(REFS.delivery);
  const invalid = [
    {
      ...valid,
      runtime: {
        ...valid.runtime,
        details: { continuation: valid.continuation },
      },
    },
    {
      ...valid,
      runtime: {
        ...valid.runtime,
        ownership: { next_action: valid.continuation.next_action },
      },
    },
    {
      ...valid,
      continuation: {
        ...valid.continuation,
        details: { runtime: valid.runtime },
      },
    },
    {
      ...valid,
      continuation: {
        ...valid.continuation,
        ownership: { status: valid.runtime.status, phase: valid.runtime.phase },
      },
    },
  ];

  for (const [index, input] of invalid.entries()) {
    await expectZeroWriteRejection(
      root,
      () => api.writeRuntimeObject(root, input, { id: `runtime-nested-authority-${index}` }),
      /runtime|continuation|authority|ownership|nested|field|schema/i,
    );
  }
});

function objectInput(objectRef, overrides = {}) {
  const typeByKind = {
    delivery: "goal",
    activity: "analysis",
    bootstrap_job: "init",
  };
  return {
    object_ref: objectRef,
    runtime: {
      schema_version: "1",
      object_ref: objectRef,
      object_type: typeByKind[objectRef.kind],
      status: objectRef.kind === "bootstrap_job" ? "running" : "executing",
      phase: objectRef.kind === "bootstrap_job" ? "adoption" : "implementation",
      updated_at: FIXED_NOW,
      ...(overrides.runtime || {}),
    },
    continuation: {
      ...continuationFor(objectRef),
      ...(overrides.continuation || {}),
    },
  };
}

function continuationFor(objectRef) {
  return {
    schema_version: "1",
    object_ref: objectRef,
    next_action: "run_next_verified_step",
    safe_resume_command: "/hw:resume",
    updated_at: FIXED_NOW,
  };
}

async function loadRuntimeApi() {
  if (RUNTIME_PROBE.error) throw RUNTIME_PROBE.error;
  return RUNTIME_PROBE.api;
}
