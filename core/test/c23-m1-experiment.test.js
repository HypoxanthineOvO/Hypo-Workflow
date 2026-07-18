import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import * as CORE from "../src/index.js";
import {
  snapshotTree,
  temporaryCurrentWorkspace,
} from "./fixtures/c21-m2/helpers.js";

const FIXTURE_ROOT = fileURLToPath(new URL("./fixtures/c23-m1/", import.meta.url));
const FIXED_NOW = "2026-07-18T12:00:00+08:00";
const FAR_EXPIRY = "2099-01-01T00:00:00Z";
const USER_ACTOR = Object.freeze({ type: "user", id: "operator" });
const LEGACY_SENTINELS = Object.freeze({
  ".pipeline/state.yaml": "legacy-state-sentinel\n",
  ".pipeline/cycle.yaml": "legacy-cycle-sentinel\n",
  ".pipeline/log.yaml": "legacy-log-sentinel\n",
});
const REQUIRED_STORE_METHODS = Object.freeze([
  "create",
  "read",
  "list",
  "recordAttempt",
  "rerun",
  "supersede",
  "trash",
  "restore",
  "changeBaseline",
]);

test("C23 M1 publishes an Experiment store with Record and Receipt authority hooks", () => {
  assert.equal(typeof CORE.createExperimentStore, "function", "Core must export createExperimentStore");
  assert.equal(
    typeof CORE.buildExperimentReceiptContext,
    "function",
    "Core must export buildExperimentReceiptContext",
  );
  const store = CORE.createExperimentStore({ clock: () => FIXED_NOW });
  for (const method of REQUIRED_STORE_METHODS) {
    assert.equal(typeof store[method], "function", `Experiment store must expose ${method}`);
  }
});

test("C23 M1 NeRF-like sandbox preserves attempts while current status ignores an old failure", async (t) => {
  const fixture = await readFixture("nerf-like.json");
  const root = await temporaryCurrentWorkspace(t, "hw-c23-m1-nerf-", { withLegacySentinels: true });
  const store = createStore();
  const created = await store.create(root, fixture.experiment, { id: "c23-m1-nerf-create" });

  assert.deepEqual(created.object_ref, { kind: "experiment", id: fixture.experiment.id });
  assert.equal(created.lifecycle, "active");
  assert.equal(created.status, "pending");
  assert.deepEqual(created.baseline, fixture.experiment.baseline);

  const failed = await store.recordAttempt(root, {
    experiment_id: fixture.experiment.id,
    attempt: fixture.attempts[0],
  }, { id: "c23-m1-nerf-attempt-oom" });
  assert.equal(failed.status, "failed");
  assert.equal(failed.current_attempt_id, fixture.attempts[0].id);

  const completed = await store.recordAttempt(root, {
    experiment_id: fixture.experiment.id,
    attempt: fixture.attempts[1],
  }, { id: "c23-m1-nerf-attempt-success" });
  assert.equal(completed.status, "completed");
  assert.equal(completed.current_attempt_id, fixture.attempts[1].id);
  assert.deepEqual(
    completed.attempts.map(({ id, status }) => [id, status]),
    [[fixture.attempts[0].id, "failed"], [fixture.attempts[1].id, "completed"]],
  );
  assert.equal((await store.read(root, created.object_ref)).current_attempt_id, fixture.attempts[1].id);
  assert.deepEqual((await store.list(root)).map(({ object_ref }) => object_ref), [created.object_ref]);
  await assertLegacyLifecycleFilesUnchanged(root);
});

test("C23 M1 AceSim-like sandbox gives each rerun an explicit identity and keeps logical identity stable", async (t) => {
  const fixture = await readFixture("acesim-like.json");
  const root = await temporaryCurrentWorkspace(t, "hw-c23-m1-acesim-", { withLegacySentinels: true });
  const store = createStore();
  const created = await store.create(root, fixture.experiment, { id: "c23-m1-acesim-create" });
  const first = await store.recordAttempt(root, {
    experiment_id: created.object_ref.id,
    attempt: fixture.attempts[0],
  }, { id: "c23-m1-acesim-attempt-first" });

  await assert.rejects(
    store.rerun(root, {
      experiment_id: created.object_ref.id,
      attempt: fixture.rerun,
    }, { id: "c23-m1-acesim-rerun-without-parent" }),
    /rerun|parent|identity|attempt/i,
  );

  const rerun = await store.rerun(root, {
    experiment_id: created.object_ref.id,
    rerun_of_attempt_id: first.current_attempt_id,
    attempt: fixture.rerun,
  }, { id: "c23-m1-acesim-rerun-explicit" });
  assert.deepEqual(rerun.object_ref, created.object_ref);
  assert.equal(rerun.current_attempt_id, fixture.rerun.id);
  const loaded = await store.read(root, created.object_ref);
  assert.equal(loaded.attempts.length, 2);
  assert.equal(loaded.attempts[1].id, fixture.rerun.id);
  assert.equal(loaded.attempts[1].rerun_of_attempt_id, first.current_attempt_id);
  assert.notEqual(loaded.attempts[0].id, loaded.attempts[1].id);
  await assertLegacyLifecycleFilesUnchanged(root);
});

test("C23 M1 superseding a logical experiment does not delete its attempt history", async (t) => {
  const fixture = await readFixture("nerf-like.json");
  const root = await temporaryCurrentWorkspace(t, "hw-c23-m1-supersede-", { withLegacySentinels: true });
  const store = createStore();
  const original = await store.create(root, fixture.experiment, { id: "c23-m1-supersede-original" });
  await store.recordAttempt(root, {
    experiment_id: original.object_ref.id,
    attempt: fixture.attempts[1],
  }, { id: "c23-m1-supersede-attempt" });
  const receipt = await issueReceipt(CORE, root, original, "experiment.supersede", "c23-m1-supersede-receipt", {
    ...fixture.experiment,
    id: "nerf-positional-encoding-screen-v2",
    title: "Revised positional encoding screen",
    supersedes_experiment_id: original.object_ref.id,
  });
  const replacement = await store.supersede(root, {
    ...receipt,
    replacement: {
      ...fixture.experiment,
      id: "nerf-positional-encoding-screen-v2",
      title: "Revised positional encoding screen",
      supersedes_experiment_id: original.object_ref.id,
    },
  }, { id: "c23-m1-supersede-commit" });

  assert.equal(replacement.supersedes_experiment_id, original.object_ref.id);
  assert.equal((await store.read(root, original.object_ref)).lifecycle, "superseded");
  assert.equal((await store.read(root, original.object_ref)).attempts.length, 1);
  assert.deepEqual(
    (await store.list(root)).map(({ object_ref }) => object_ref.id),
    [replacement.object_ref.id],
  );
  await assertLegacyLifecycleFilesUnchanged(root);
});

test("C23 M1 trash and restore require Receipts and retain historical attempts", async (t) => {
  const fixture = await readFixture("acesim-like.json");
  const root = await temporaryCurrentWorkspace(t, "hw-c23-m1-trash-restore-", { withLegacySentinels: true });
  const store = createStore();
  const created = await store.create(root, fixture.experiment, { id: "c23-m1-trash-create" });
  await store.recordAttempt(root, {
    experiment_id: created.object_ref.id,
    attempt: fixture.attempts[0],
  }, { id: "c23-m1-trash-attempt" });

  const beforeRejectedTrash = await snapshotTree(root);
  await assert.rejects(
    store.trash(root, { object_ref: created.object_ref }, { id: "c23-m1-trash-without-receipt" }),
    /receipt|confirm|authorization/i,
  );
  assert.deepEqual(await snapshotTree(root), beforeRejectedTrash);

  const trashReceipt = await issueReceipt(CORE, root, await store.read(root, created.object_ref), "experiment.trash", "c23-m1-trash-receipt");
  const trashed = await store.trash(root, trashReceipt, { id: "c23-m1-trash-commit" });
  assert.equal(trashed.lifecycle, "trashed");
  assert.equal((await CORE.readReceipt(root, trashReceipt.receipt_id)).state, "consumed");
  assert.deepEqual(await store.list(root), []);
  assert.equal((await store.read(root, created.object_ref)).attempts.length, 1);

  const restoreReceipt = await issueReceipt(CORE, root, trashed, "experiment.restore", "c23-m1-restore-receipt");
  const restored = await store.restore(root, restoreReceipt, { id: "c23-m1-restore-commit" });
  assert.equal(restored.lifecycle, "active");
  assert.equal(restored.object_ref.id, created.object_ref.id);
  assert.equal(restored.attempts.length, 1);
  assert.deepEqual((await store.list(root)).map(({ object_ref }) => object_ref), [created.object_ref]);
  await assertLegacyLifecycleFilesUnchanged(root);
});

test("C23 M1 baseline changes are Receipt-gated, append history, and preserve attempt baselines", async (t) => {
  const fixture = await readFixture("nerf-like.json");
  const root = await temporaryCurrentWorkspace(t, "hw-c23-m1-baseline-", { withLegacySentinels: true });
  const store = createStore();
  const created = await store.create(root, fixture.experiment, { id: "c23-m1-baseline-create" });
  await store.recordAttempt(root, {
    experiment_id: created.object_ref.id,
    attempt: fixture.attempts[1],
  }, { id: "c23-m1-baseline-old-attempt" });

  const beforeRejectedChange = await snapshotTree(root);
  await assert.rejects(
    store.changeBaseline(root, {
      object_ref: created.object_ref,
      baseline: fixture.experiment.baseline_v2,
    }, { id: "c23-m1-baseline-without-receipt" }),
    /receipt|confirm|authorization/i,
  );
  assert.deepEqual(await snapshotTree(root), beforeRejectedChange);

  const baselineReceipt = await issueReceipt(
    CORE,
    root,
    await store.read(root, created.object_ref),
    "experiment.baseline.change",
    "c23-m1-baseline-receipt",
    fixture.experiment.baseline_v2,
  );
  const changed = await store.changeBaseline(root, {
    ...baselineReceipt,
    baseline: fixture.experiment.baseline_v2,
  }, { id: "c23-m1-baseline-change" });
  assert.equal((await CORE.readReceipt(root, baselineReceipt.receipt_id)).state, "consumed");
  assert.equal(changed.baseline.id, fixture.experiment.baseline_v2.id);
  assert.deepEqual(changed.baseline_history.map(({ id }) => id), [
    fixture.experiment.baseline.id,
    fixture.experiment.baseline_v2.id,
  ]);
  assert.equal(changed.attempts[0].baseline_id, fixture.experiment.baseline.id);
  assert.equal(changed.status, "completed");
  await assertLegacyLifecycleFilesUnchanged(root);
});

function createStore() {
  const store = CORE.createExperimentStore({ clock: () => FIXED_NOW });
  for (const method of REQUIRED_STORE_METHODS) {
    assert.equal(typeof store[method], "function", `Experiment store must expose ${method}`);
  }
  return store;
}

async function issueReceipt(api, root, experiment, intent, operationId, target) {
  const context = api.buildExperimentReceiptContext(experiment, {
    actor: USER_ACTOR,
    intent,
    ...(target === undefined ? {} : { target }),
  });
  const receipts = api.createReceiptStore({ clock: () => FIXED_NOW });
  const issued = await receipts.issueReceipt(root, {
    ...context,
    issued_at: FIXED_NOW,
    expires_at: FAR_EXPIRY,
  }, { id: operationId });
  return {
    receipt_id: issued.id,
    ...context,
    tool_use_id: `tool-${operationId}`,
  };
}

async function readFixture(name) {
  return JSON.parse(await readFile(join(FIXTURE_ROOT, name), "utf8"));
}

async function assertLegacyLifecycleFilesUnchanged(root) {
  const entries = await snapshotTree(root);
  for (const [path, expected] of Object.entries(LEGACY_SENTINELS)) {
    const entry = entries.find((candidate) => candidate.path === path);
    assert.ok(entry, `${path} sentinel must remain present`);
    assert.equal(entry.type, "file");
    assert.equal(Buffer.from(entry.content, "base64").toString("utf8"), expected);
  }
}
