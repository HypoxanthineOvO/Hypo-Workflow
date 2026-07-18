import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import * as CORE from "../src/index.js";
import {
  assertLegacySentinelsUnchanged,
  fixtureManifest,
  snapshotTree,
  temporaryCurrentWorkspace,
} from "./fixtures/c21-m2/helpers.js";

const FIXTURE_ROOT = fileURLToPath(new URL("./fixtures/c23-m1/", import.meta.url));
const FIXED_NOW = "2026-07-18T12:00:00+08:00";
const FAR_EXPIRY = "2099-01-01T00:00:00Z";
const USER_ACTOR = Object.freeze({ type: "user", id: "operator" });

for (const phase of ["after_prepare", "after_manifest_activation"]) {
  test(`C23 M1 recovery retries a ${phase} fault in its Receipt transaction`, async (t) => {
    const fixture = await readFixture("acesim-like.json");
    const root = await temporaryCurrentWorkspace(t, `hw-c23-m1-recovery-remediation-${phase}-`, {
      withLegacySentinels: true,
    });
    const store = createStore();
    const created = await store.create(root, fixture.experiment, {
      id: `c23-m1-recovery-remediation-${phase}-create`,
    });
    const transition = await issueReceipt(
      root,
      created,
      "experiment.trash",
      `c23-m1-recovery-remediation-${phase}-receipt`,
    );
    const operationId = `c23-m1-recovery-remediation-${phase}`;

    // Leave the authority transaction after activation so recovery must reconcile
    // the reserved Receipt through a new transaction of its own.
    await assert.rejects(
      store.trash(root, transition, {
        id: operationId,
        faultInjector: throwOnNthPhase("after_manifest_activation", 2, "authority"),
      }),
      /injected authority after_manifest_activation failure/,
    );
    assert.equal((await CORE.readReceipt(root, transition.receipt_id)).state, "reserved");
    assert.equal(
      (await CORE.recoverWorkspaceTransaction(root, { id: `${operationId}-authority` })).action,
      "finalized",
    );

    const recoveryFault = throwOnNthPhase(phase, 1, "recovery receipt");
    await assert.rejects(
      store.recoverTransition(root, transition, { id: operationId, faultInjector: recoveryFault }),
      new RegExp(`injected recovery receipt ${phase} failure`),
    );
    assert.deepEqual(
      transactionIds(await snapshotTree(root)),
      [`${operationId}-recovery-consume`],
      "a recovery fault may leave only its own Receipt transaction descendant",
    );

    const beforeRetry = await snapshotTree(root);
    await assert.doesNotReject(() => store.recoverTransition(root, transition, { id: operationId }));
    assert.equal((await store.read(root, created.object_ref)).lifecycle, "trashed");
    assert.equal((await CORE.readReceipt(root, transition.receipt_id)).state, "consumed");
    assert.deepEqual(
      transactionIds(await snapshotTree(root)),
      [],
      "retry must clear every recovery transaction descendant",
    );

    const afterRetry = await snapshotTree(root);
    await assert.doesNotReject(() => store.recoverTransition(root, transition, { id: operationId }));
    assert.deepEqual(await snapshotTree(root), afterRetry, "repeated recovery must be byte-idempotent");

    const unrelated = await store.create(
      root,
      { ...fixture.experiment, id: `acesim-unrelated-${phase}` },
      { id: `c23-m1-recovery-remediation-${phase}-unrelated` },
    );
    assert.equal(unrelated.object_ref.id, `acesim-unrelated-${phase}`);
    assert.deepEqual(
      transactionIds(await snapshotTree(root)),
      [],
      "an unrelated transaction must succeed after recovery cleanup",
    );
    assert.notDeepEqual(beforeRetry, await snapshotTree(root), "retry must make the terminal Receipt observable");
    await assertLegacySentinelsUnchanged(root);
  });
}

for (const malformed of [
  {
    name: "unknown",
    mutate(attempts) {
      attempts[1].rerun_of_attempt_id = "rerun-parent-does-not-exist";
    },
  },
  {
    name: "self",
    mutate(attempts) {
      attempts[1].rerun_of_attempt_id = attempts[1].id;
    },
  },
  {
    name: "forward",
    mutate(attempts) {
      attempts[0].rerun_of_attempt_id = attempts[1].id;
    },
  },
]) {
  test(`C23 M1 persisted read rejects a ${malformed.name} rerun parent`, async (t) => {
    const fixture = await readFixture("acesim-like.json");
    const root = await temporaryCurrentWorkspace(t, `hw-c23-m1-persisted-rerun-${malformed.name}-`, {
      withLegacySentinels: true,
    });
    const store = createStore();
    const created = await store.create(root, fixture.experiment, {
      id: `c23-m1-persisted-rerun-${malformed.name}-create`,
    });
    const first = await store.recordAttempt(root, {
      experiment_id: created.object_ref.id,
      attempt: fixture.attempts[0],
    }, { id: `c23-m1-persisted-rerun-${malformed.name}-first` });
    const second = await store.rerun(root, {
      experiment_id: created.object_ref.id,
      rerun_of_attempt_id: first.attempts[0].id,
      attempt: {
        ...fixture.rerun,
        id: `acesim-rerun-${malformed.name}`,
      },
    }, { id: `c23-m1-persisted-rerun-${malformed.name}-second` });

    const persisted = await CORE.readRuntimeObject(root, created.object_ref);
    const attempts = persisted.runtime.attempts.map((attempt) => ({ ...attempt }));
    malformed.mutate(attempts);
    const malformedRuntime = { ...persisted.runtime, attempts };
    await CORE.commitWorkspaceTransaction(root, {
      id: `c23-m1-persisted-rerun-${malformed.name}-corrupt`,
      manifest: fixtureManifest(),
      writes: [
        {
          path: `.pipeline/runtime/objects/experiment/${created.object_ref.id}/runtime.yaml`,
          content: renderYaml(malformedRuntime),
        },
        {
          path: `.pipeline/runtime/objects/experiment/${created.object_ref.id}/continuation.yaml`,
          content: renderYaml(persisted.continuation),
        },
      ],
    });

    await assert.rejects(
      store.read(root, created.object_ref),
      /rerun|parent|lineage|ancestor|cycle|forward|history|attempt|schema/i,
    );
    assert.equal(second.object_ref.id, created.object_ref.id);
    await assertLegacySentinelsUnchanged(root);
  });
}

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

function transactionIds(entries) {
  return entries
    .filter((entry) => entry.path.startsWith(".pipeline/runtime/transactions/") && entry.path !== ".pipeline/runtime/transactions")
    .map((entry) => entry.path.split("/")[3])
    .filter(Boolean)
    .filter((id, index, values) => values.indexOf(id) === index)
    .sort();
}

async function issueReceipt(root, experiment, intent, operationId) {
  const context = CORE.buildExperimentReceiptContext(experiment, { actor: USER_ACTOR, intent });
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
