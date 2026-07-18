import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import * as CORE from "../src/index.js";
import {
  assertLegacySentinelsUnchanged,
  snapshotTree,
  temporaryCurrentWorkspace,
} from "./fixtures/c21-m2/helpers.js";

const FIXTURE_ROOT = fileURLToPath(new URL("./fixtures/c23-m1/", import.meta.url));
const FIXED_NOW = "2026-07-18T12:00:00+08:00";
const FAR_EXPIRY = "2099-01-01T00:00:00Z";
const USER_ACTOR = Object.freeze({ type: "user", id: "operator" });

test("C23 M1 generic Runtime writes cannot create an Experiment without the domain Store", async (t) => {
  const root = await temporaryCurrentWorkspace(t, "hw-c23-m1-boundary-generic-", { withLegacySentinels: true });
  const objectRef = { kind: "experiment", id: "generic-write-must-fail" };
  const before = await snapshotTree(root);

  await assert.rejects(
    CORE.writeRuntimeObject(root, genericExperimentObject(objectRef), { id: "c23-m1-generic-experiment-write" }),
    /domain|experiment|store|authority|writer|unsupported/i,
  );
  assert.deepEqual(await snapshotTree(root), before, "rejected generic Experiment write must be zero-write");
  await assert.rejects(CORE.readRuntimeObject(root, objectRef), /missing|not found|runtime|object/i);
  await assertLegacySentinelsUnchanged(root);
});

test("C23 M1 supersede Receipts reject replacement target substitution", async (t) => {
  const fixture = await readFixture("nerf-like.json");
  const root = await temporaryCurrentWorkspace(t, "hw-c23-m1-boundary-supersede-", { withLegacySentinels: true });
  const store = createStore();
  const original = await store.create(root, fixture.experiment, { id: "c23-m1-boundary-supersede-create" });
  const targetA = replacementDefinition(fixture, "nerf-positional-encoding-screen-v2", "Approved replacement");
  const targetB = replacementDefinition(fixture, "nerf-positional-encoding-screen-v3", "Substituted replacement");
  const contextA = CORE.buildExperimentReceiptContext(original, {
    actor: USER_ACTOR,
    intent: "experiment.supersede",
    target: targetA,
  });
  const contextB = CORE.buildExperimentReceiptContext(original, {
    actor: USER_ACTOR,
    intent: "experiment.supersede",
    target: targetB,
  });
  assert.notDeepEqual(contextA.scope, contextB.scope, "supersede target must change the Receipt scope");
  assert.notEqual(contextA.plan_hash, contextB.plan_hash, "supersede target must change the Receipt plan binding");

  const receipt = await issueReceipt(root, original, "experiment.supersede", targetA, "c23-m1-boundary-supersede-receipt");
  const beforeAuthority = await store.read(root, original.object_ref);

  await assert.rejects(
    store.supersede(root, { ...receipt, replacement: targetB }, { id: "c23-m1-boundary-supersede-commit" }),
    /target|drift|context|receipt|authorization/i,
  );
  assert.deepEqual(await store.read(root, original.object_ref), beforeAuthority);
  assert.deepEqual((await store.list(root)).map(({ object_ref }) => object_ref), [original.object_ref]);
  assert.notEqual((await CORE.readReceipt(root, receipt.receipt_id)).state, "consumed");
  await assertLegacySentinelsUnchanged(root);
});

test("C23 M1 baseline Receipts reject baseline target substitution", async (t) => {
  const fixture = await readFixture("nerf-like.json");
  const root = await temporaryCurrentWorkspace(t, "hw-c23-m1-boundary-baseline-", { withLegacySentinels: true });
  const store = createStore();
  const original = await store.create(root, fixture.experiment, { id: "c23-m1-boundary-baseline-create" });
  const targetA = { ...fixture.experiment.baseline_v2, id: "nerf-baseline-approved" };
  const targetB = { ...fixture.experiment.baseline_v2, id: "nerf-baseline-substituted", code_ref: "git:substituted" };
  const contextA = CORE.buildExperimentReceiptContext(original, {
    actor: USER_ACTOR,
    intent: "experiment.baseline.change",
    target: targetA,
  });
  const contextB = CORE.buildExperimentReceiptContext(original, {
    actor: USER_ACTOR,
    intent: "experiment.baseline.change",
    target: targetB,
  });
  assert.notDeepEqual(contextA.scope, contextB.scope, "baseline target must change the Receipt scope");
  assert.notEqual(contextA.plan_hash, contextB.plan_hash, "baseline target must change the Receipt plan binding");

  const receipt = await issueReceipt(
    root,
    original,
    "experiment.baseline.change",
    targetA,
    "c23-m1-boundary-baseline-receipt",
  );
  const beforeAuthority = await store.read(root, original.object_ref);

  await assert.rejects(
    store.changeBaseline(root, { ...receipt, baseline: targetB }, { id: "c23-m1-boundary-baseline-commit" }),
    /target|drift|context|receipt|authorization/i,
  );
  assert.deepEqual(await store.read(root, original.object_ref), beforeAuthority);
  assert.equal((await store.read(root, original.object_ref)).baseline.id, fixture.experiment.baseline.id);
  assert.notEqual((await CORE.readReceipt(root, receipt.receipt_id)).state, "consumed");
  await assertLegacySentinelsUnchanged(root);
});

test("C23 M1 replay of a consumed Receipt rejects without changing Experiment authority", async (t) => {
  const fixture = await readFixture("acesim-like.json");
  const root = await temporaryCurrentWorkspace(t, "hw-c23-m1-boundary-replay-", { withLegacySentinels: true });
  const store = createStore();
  const created = await store.create(root, fixture.experiment, { id: "c23-m1-boundary-replay-create" });
  const receipt = await issueReceipt(root, created, "experiment.trash", undefined, "c23-m1-boundary-replay-receipt");
  const trashed = await store.trash(root, receipt, { id: "c23-m1-boundary-replay-first" });
  const beforeReplayAuthority = await store.read(root, created.object_ref);
  const beforeReplayTree = await snapshotTree(root);

  await assert.rejects(
    store.trash(root, receipt, { id: "c23-m1-boundary-replay-second" }),
    /consumed|replay|single.use|state|receipt/i,
  );
  assert.equal((await CORE.readReceipt(root, receipt.receipt_id)).state, "consumed");
  assert.deepEqual(await store.read(root, created.object_ref), beforeReplayAuthority);
  assert.deepEqual(await snapshotTree(root), beforeReplayTree, "Receipt replay must not write authority or receipt state");
  assert.equal(trashed.lifecycle, "trashed");
  await assertLegacySentinelsUnchanged(root);
});

test("C23 M1 attempts reject baseline IDs that are absent from baseline history", async (t) => {
  const fixture = await readFixture("nerf-like.json");
  const root = await temporaryCurrentWorkspace(t, "hw-c23-m1-boundary-baseline-ref-", { withLegacySentinels: true });
  const store = createStore();
  const created = await store.create(root, fixture.experiment, { id: "c23-m1-boundary-baseline-ref-create" });
  const attempt = { ...fixture.attempts[0], id: "nerf-attempt-unknown-baseline", baseline_id: "baseline-does-not-exist" };
  const before = await snapshotTree(root);

  await assert.rejects(
    store.recordAttempt(root, { experiment_id: created.object_ref.id, attempt }, { id: "c23-m1-boundary-baseline-ref-attempt" }),
    /baseline|reference|history|unknown|experiment/i,
  );
  assert.deepEqual(await snapshotTree(root), before, "unknown baseline rejection must be zero-write");
  assert.deepEqual((await store.read(root, created.object_ref)).attempts, []);
  await assertLegacySentinelsUnchanged(root);
});

test("C23 M1 attempts require execution timestamps", async (t) => {
  const fixture = await readFixture("acesim-like.json");
  const root = await temporaryCurrentWorkspace(t, "hw-c23-m1-boundary-timestamp-", { withLegacySentinels: true });
  const store = createStore();
  const created = await store.create(root, fixture.experiment, { id: "c23-m1-boundary-timestamp-create" });
  const { started_at: _startedAt, finished_at: _finishedAt, ...attempt } = fixture.attempts[0];
  attempt.id = "acesim-attempt-missing-execution-time";
  const before = await snapshotTree(root);

  await assert.rejects(
    store.recordAttempt(root, { experiment_id: created.object_ref.id, attempt }, { id: "c23-m1-boundary-timestamp-attempt" }),
    /timestamp|execution|started|finished|time/i,
  );
  assert.deepEqual(await snapshotTree(root), before, "missing timestamp rejection must be zero-write");
  assert.deepEqual((await store.read(root, created.object_ref)).attempts, []);
  await assertLegacySentinelsUnchanged(root);
});

test("C23 M1 read rejects duplicate persisted attempt IDs", async (t) => {
  const fixture = await readFixture("nerf-like.json");
  const root = await temporaryCurrentWorkspace(t, "hw-c23-m1-boundary-duplicate-", { withLegacySentinels: true });
  const store = createStore();
  const created = await store.create(root, fixture.experiment, { id: "c23-m1-boundary-duplicate-create" });
  await store.recordAttempt(root, {
    experiment_id: created.object_ref.id,
    attempt: fixture.attempts[0],
  }, { id: "c23-m1-boundary-duplicate-attempt" });

  const persisted = await CORE.readRuntimeObject(root, created.object_ref);
  const duplicateRuntime = {
    ...persisted.runtime,
    attempts: [persisted.runtime.attempts[0], persisted.runtime.attempts[0]],
  };
  const objectDirectory = `.pipeline/runtime/objects/experiment/${created.object_ref.id}`;
  await CORE.commitWorkspaceTransaction(root, {
    id: "c23-m1-boundary-duplicate-persisted",
    manifest: CORE.createWorkspaceManifest({
      workspace_id: "m2-fixture-workspace",
      project_id: "m2-fixture-project",
      created_at: FIXED_NOW,
    }),
    writes: [
      { path: `${objectDirectory}/runtime.yaml`, content: renderYaml(duplicateRuntime) },
      { path: `${objectDirectory}/continuation.yaml`, content: renderYaml(persisted.continuation) },
    ],
  });

  await assert.rejects(
    store.read(root, created.object_ref),
    /duplicate|unique|attempt|identity|schema/i,
  );
  await assertLegacySentinelsUnchanged(root);
});

test("C23 M1 recovery reconciles an authority-activated interruption", async (t) => {
  const fixture = await readFixture("acesim-like.json");
  const root = await temporaryCurrentWorkspace(t, "hw-c23-m1-recovery-authority-", { withLegacySentinels: true });
  const store = createStore();
  const created = await store.create(root, fixture.experiment, { id: "c23-m1-recovery-authority-create" });
  const transition = await issueReceipt(root, created, "experiment.trash", undefined, "c23-m1-recovery-authority-receipt");
  const operationId = "c23-m1-recovery-authority";
  const faultInjector = throwOnNthPhase("after_manifest_activation", 2, "authority");

  await assert.rejects(
    store.trash(root, transition, { id: operationId, faultInjector }),
    /injected authority after_manifest_activation failure/,
  );
  assert.equal((await CORE.readReceipt(root, transition.receipt_id)).state, "reserved");

  const authorityRecovery = await CORE.recoverWorkspaceTransaction(root, {
    id: `${operationId}-authority`,
  });
  assert.equal(authorityRecovery.action, "finalized");

  await assert.doesNotReject(() => store.recoverTransition(root, transition, { id: operationId }));
  assert.equal((await store.read(root, created.object_ref)).lifecycle, "trashed");
  assertTerminalTransitionReceipt(await CORE.readReceipt(root, transition.receipt_id), ["consumed", "invalidated"]);
  await assertNoTransactionResidue(root);
  await assertRecoveryAndRetryAreIdempotent(root, store, transition, operationId, created.object_ref);
  await assertLegacySentinelsUnchanged(root);
});

test("C23 M1 recovery compensates an authority-not-activated interruption", async (t) => {
  const fixture = await readFixture("acesim-like.json");
  const root = await temporaryCurrentWorkspace(t, "hw-c23-m1-recovery-pre-activation-", { withLegacySentinels: true });
  const store = createStore();
  const created = await store.create(root, fixture.experiment, { id: "c23-m1-recovery-pre-activation-create" });
  const transition = await issueReceipt(root, created, "experiment.trash", undefined, "c23-m1-recovery-pre-activation-receipt");
  const operationId = "c23-m1-recovery-pre-activation";
  const faultInjector = throwOnNthPhase("after_prepare", 2, "authority");

  await assert.rejects(
    store.trash(root, transition, { id: operationId, faultInjector }),
    /injected authority after_prepare failure/,
  );
  assert.equal((await CORE.readReceipt(root, transition.receipt_id)).state, "reserved");

  const authorityRecovery = await CORE.recoverWorkspaceTransaction(root, {
    id: `${operationId}-authority`,
  });
  assert.equal(authorityRecovery.action, "rolled_back");
  assert.equal((await store.read(root, created.object_ref)).lifecycle, "active");

  await assert.doesNotReject(() => store.recoverTransition(root, transition, { id: operationId }));
  assert.equal((await store.read(root, created.object_ref)).lifecycle, "active");
  assertTerminalTransitionReceipt(await CORE.readReceipt(root, transition.receipt_id), ["invalidated", "revoked"]);
  await assertNoTransactionResidue(root);
  await assertRecoveryAndRetryAreIdempotent(root, store, transition, operationId, created.object_ref);
  await assertLegacySentinelsUnchanged(root);
});

test("C23 M1 recovery recognizes a consume interruption after authority is terminal", async (t) => {
  const fixture = await readFixture("acesim-like.json");
  const root = await temporaryCurrentWorkspace(t, "hw-c23-m1-recovery-consume-", { withLegacySentinels: true });
  const store = createStore();
  const created = await store.create(root, fixture.experiment, { id: "c23-m1-recovery-consume-create" });
  const transition = await issueReceipt(root, created, "experiment.trash", undefined, "c23-m1-recovery-consume-receipt");
  const operationId = "c23-m1-recovery-consume";
  const faultInjector = throwOnNthPhase("after_manifest_activation", 3, "consume");

  await assert.rejects(
    store.trash(root, transition, { id: operationId, faultInjector }),
    /injected consume after_manifest_activation failure/,
  );
  assert.equal((await store.read(root, created.object_ref)).lifecycle, "trashed");
  assert.equal((await CORE.readReceipt(root, transition.receipt_id)).state, "consumed");

  await assert.doesNotReject(() => store.recoverTransition(root, transition, { id: operationId }));
  assert.equal((await store.read(root, created.object_ref)).lifecycle, "trashed");
  assert.equal((await CORE.readReceipt(root, transition.receipt_id)).state, "consumed");
  await assertNoTransactionResidue(root);
  await assertRecoveryAndRetryAreIdempotent(root, store, transition, operationId, created.object_ref);
  await assertLegacySentinelsUnchanged(root);
});

function createStore() {
  return CORE.createExperimentStore({ clock: () => FIXED_NOW });
}

function throwOnNthPhase(phase, occurrence, label) {
  let seen = 0;
  return async (event) => {
    if (event.phase !== phase) return;
    seen += 1;
    if (seen === occurrence) throw new Error(`injected ${label} ${phase} failure`);
  };
}

function assertTerminalTransitionReceipt(receipt, allowedStates) {
  assert.ok(allowedStates.includes(receipt.state), `Receipt must be terminal: ${receipt.state}`);
  if (receipt.state === "invalidated" || receipt.state === "revoked") {
    assert.match(
      receipt.invalidated_reason || receipt.revoked_reason || "",
      /recovery|compensat|authority|transition/i,
      "a compensating terminal Receipt must document why the authority outcome was reconciled",
    );
  }
}

async function assertNoTransactionResidue(root) {
  const residue = (await snapshotTree(root)).filter((entry) => (
    entry.path.startsWith(".pipeline/runtime/transactions/")
  ));
  assert.deepEqual(residue, [], "recovery must remove every transaction marker and private transaction artifact");
}

async function assertRecoveryAndRetryAreIdempotent(root, store, transition, operationId, objectRef) {
  const beforeRecoveryRetry = await snapshotTree(root);
  await assert.doesNotReject(() => store.recoverTransition(root, transition, { id: operationId }));
  assert.deepEqual(await snapshotTree(root), beforeRecoveryRetry, "repeating recovery must not mutate the workspace");

  const beforeDomainRetry = await snapshotTree(root);
  await assert.doesNotReject(async () => {
    try {
      await store.trash(root, transition, { id: `${operationId}-retry` });
    } catch (error) {
      assert.match(
        String(error?.message || error),
        /consumed|invalidated|revoked|replay|terminal|state|receipt/i,
        "a terminally reconciled retry may reject, but must be a terminal Receipt decision",
      );
    }
  });
  assert.deepEqual(await snapshotTree(root), beforeDomainRetry, "a retry after reconciliation must not mutate the workspace");
  assert.ok(["active", "trashed"].includes((await store.read(root, objectRef)).lifecycle));
}

function genericExperimentObject(objectRef) {
  return {
    object_ref: objectRef,
    runtime: {
      schema_version: "1",
      object_ref: objectRef,
      status: "pending",
      updated_at: FIXED_NOW,
    },
    continuation: {
      schema_version: "1",
      object_ref: objectRef,
      next_action: "record_experiment_attempt",
      updated_at: FIXED_NOW,
    },
  };
}

function replacementDefinition(fixture, id, title) {
  return {
    ...fixture.experiment,
    id,
    title,
    supersedes_experiment_id: fixture.experiment.id,
  };
}

async function issueReceipt(root, experiment, intent, target, operationId) {
  const input = target === undefined
    ? { actor: USER_ACTOR, intent }
    : { actor: USER_ACTOR, intent, target };
  const context = CORE.buildExperimentReceiptContext(experiment, input);
  const receipts = CORE.createReceiptStore({ clock: () => FIXED_NOW });
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

function renderYaml(value) {
  return `${CORE.stringifyYaml(value).trimEnd()}\n`;
}
